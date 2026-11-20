#pragma once

#include "blockbum/core/types.hpp"
#include "blockbum/crypto/icrypto.hpp"
#include "blockbum/crypto/crypto_utils.hpp"
#include <string>
#include <vector>
#include <unordered_map>
#include <unordered_set>
#include <optional>
#include <mutex>
#include <algorithm>
#include <cstdint>

namespace blockbum::governance {

// ============================================================================
// 1. Governance Enums & Constants
// ============================================================================

enum class ProposalCategory : uint8_t {
    CoreConsensus = 0,    /// Consensus rules, block verification, halving schedule (66.7% supermajority)
    NetworkProtocol = 1,  /// Wire framing, peer discovery, transport protocol (60.0% supermajority)
    TreasuryGrant = 2,    /// Allocations from community ecosystem treasury (> 50.0% simple majority)
    ParameterChange = 3,  /// Network fees, memory caps, timeout configurations (> 50.0% simple majority)
    CommunityMeta = 4     /// Process guidelines, informational roadmap (> 50.0% simple majority)
};

enum class ProposalStatus : uint8_t {
    Draft = 0,            /// Created but voting window not yet open
    Active = 1,           /// Voting currently open
    Passed = 2,           /// Successfully approved, no timelock required
    Defeated = 3,         /// Failed quorum or approval threshold
    Queued = 4,           /// Approved, residing in execution timelock delay
    Executed = 5,         /// Fully executed
    Cancelled = 6         /// Withdrawn before completion
};

enum class VoteChoice : uint8_t {
    Yes = 0,
    No = 1,
    Abstain = 2
};

/// Minimum deposit required to submit an on-chain proposal (1,000 atomic units / 0.001 BUM)
inline constexpr uint64_t MIN_PROPOSAL_DEPOSIT = 1'000;

/// Default voting duration in blocks (~14 days at 10-minute blocks, or configurable)
inline constexpr uint64_t DEFAULT_VOTING_DURATION_BLOCKS = 1'000;

/// Default execution timelock delay in blocks
inline constexpr uint64_t DEFAULT_GOVERNANCE_TIMELOCK_BLOCKS = 100;

// ============================================================================
// 2. Data Structures
// ============================================================================

struct VoteRecord {
    std::string proposal_id;
    std::string voter_address;
    VoteChoice choice{VoteChoice::Abstain};
    uint64_t weight{1};
    core::BlockHeight cast_height{0};
};

struct GovernanceTally {
    uint64_t yes_votes{0};
    uint64_t no_votes{0};
    uint64_t abstain_votes{0};
    uint64_t total_voters{0};

    [[nodiscard]] uint64_t total_votes() const noexcept {
        return yes_votes + no_votes + abstain_votes;
    }
};

struct GovernanceProposal {
    std::string proposal_id;
    std::string proposer_address;
    std::string title;
    std::string description;
    core::Hash256 content_hash{};
    ProposalCategory category{ProposalCategory::CommunityMeta};
    ProposalStatus status{ProposalStatus::Draft};
    core::BlockHeight snapshot_height{0};
    core::BlockHeight start_height{0};
    core::BlockHeight end_height{0};
    core::BlockHeight execution_height{0};
    uint64_t timelock_blocks{0};
    core::Balance proposal_deposit{0};
    GovernanceTally tally;
    std::string execution_payload;
};

struct SubsystemPauseRecord {
    std::string subsystem_name;
    core::BlockHeight start_height{0};
    core::BlockHeight expires_height{0};
    std::string requester;
};

// ============================================================================
// 3. Decentralized Governance Manager
// ============================================================================

class GovernanceManager {
public:
    GovernanceManager() = default;

    /// Submit a new technical improvement or grant proposal
    bool submit_proposal(const std::string& proposal_id,
                         const std::string& proposer_address,
                         const std::string& title,
                         const std::string& description,
                         const core::Hash256& content_hash,
                         ProposalCategory category,
                         core::BlockHeight current_height,
                         uint64_t voting_duration = DEFAULT_VOTING_DURATION_BLOCKS,
                         uint64_t timelock_blocks = DEFAULT_GOVERNANCE_TIMELOCK_BLOCKS,
                         const std::string& execution_payload = "") {
        std::lock_guard<std::mutex> lock(mutex_);
        if (proposals_.find(proposal_id) != proposals_.end()) return false;
        if (title.empty() || description.empty()) return false;
        if (voting_duration == 0) return false;

        core::Hash256 empty_hash{};
        if (content_hash == empty_hash) return false;

        GovernanceProposal p;
        p.proposal_id = proposal_id;
        p.proposer_address = proposer_address;
        p.title = title;
        p.description = description;
        p.content_hash = content_hash;
        p.category = category;
        p.snapshot_height = (current_height > 0) ? (current_height - 1) : 0;
        p.start_height = current_height;
        p.end_height = current_height + voting_duration;
        p.timelock_blocks = timelock_blocks;
        p.proposal_deposit = MIN_PROPOSAL_DEPOSIT;
        p.status = ProposalStatus::Active;
        p.execution_payload = execution_payload;

        proposals_[proposal_id] = p;
        return true;
    }

    /// Cast an on-chain vote on an active proposal
    bool cast_vote(const std::string& proposal_id,
                   const std::string& voter_address,
                   VoteChoice choice,
                   uint64_t voting_weight,
                   core::BlockHeight current_height) {
        std::lock_guard<std::mutex> lock(mutex_);
        auto it = proposals_.find(proposal_id);
        if (it == proposals_.end()) return false;

        auto& p = it->second;
        if (p.status != ProposalStatus::Active) return false;

        // Verify voting window
        if (current_height < p.start_height || current_height > p.end_height) return false;

        // Prevent double voting
        auto& voters = voted_records_[proposal_id];
        if (voters.find(voter_address) != voters.end()) {
            return false; // Sybil / duplicate vote rejected
        }

        uint64_t weight = (voting_weight > 0) ? voting_weight : 1;
        voters.insert(voter_address);

        VoteRecord record;
        record.proposal_id = proposal_id;
        record.voter_address = voter_address;
        record.choice = choice;
        record.weight = weight;
        record.cast_height = current_height;
        vote_history_[proposal_id].push_back(record);

        // Update tally
        if (choice == VoteChoice::Yes) {
            p.tally.yes_votes += weight;
        } else if (choice == VoteChoice::No) {
            p.tally.no_votes += weight;
        } else {
            p.tally.abstain_votes += weight;
        }
        p.tally.total_voters++;

        return true;
    }

    /// Finalize proposal after voting window closes and evaluate quorum/thresholds
    bool finalize_proposal(const std::string& proposal_id,
                           core::BlockHeight current_height,
                           uint64_t total_eligible_power = 100) {
        std::lock_guard<std::mutex> lock(mutex_);
        auto it = proposals_.find(proposal_id);
        if (it == proposals_.end()) return false;

        auto& p = it->second;
        if (p.status != ProposalStatus::Active) return false;

        // Cannot finalize before end height
        if (current_height <= p.end_height) return false;

        // Evaluate quorum based on category
        uint64_t total_cast = p.tally.total_votes();
        double quorum_percent = (total_eligible_power > 0)
                                    ? (static_cast<double>(total_cast) / static_cast<double>(total_eligible_power)) * 100.0
                                    : 0.0;

        double required_quorum = 10.0; // Default 10%
        double required_approval = 50.0; // Default simple majority > 50%

        if (p.category == ProposalCategory::CoreConsensus) {
            required_quorum = 20.0;
            required_approval = 66.666; // Supermajority 2/3
        } else if (p.category == ProposalCategory::NetworkProtocol) {
            required_quorum = 15.0;
            required_approval = 60.0;
        } else if (p.category == ProposalCategory::ParameterChange) {
            required_quorum = 15.0;
            required_approval = 50.0;
        } else if (p.category == ProposalCategory::TreasuryGrant) {
            required_quorum = 10.0;
            required_approval = 50.0;
        } else if (p.category == ProposalCategory::CommunityMeta) {
            required_quorum = 5.0;
            required_approval = 50.0;
        }

        if (quorum_percent < required_quorum) {
            p.status = ProposalStatus::Defeated;
            return true;
        }

        // Approval is evaluated against non-abstaining votes (Yes / (Yes + No))
        uint64_t non_abstain = p.tally.yes_votes + p.tally.no_votes;
        if (non_abstain == 0) {
            p.status = ProposalStatus::Defeated;
            return true;
        }

        double approval_percent = (static_cast<double>(p.tally.yes_votes) / static_cast<double>(non_abstain)) * 100.0;

        if (approval_percent >= required_approval) {
            if (p.timelock_blocks > 0) {
                p.status = ProposalStatus::Queued;
                p.execution_height = current_height + p.timelock_blocks;
            } else {
                p.status = ProposalStatus::Passed;
            }
        } else {
            p.status = ProposalStatus::Defeated;
        }

        return true;
    }

    /// Execute an approved proposal after the mandatory timelock delay
    bool execute_proposal(const std::string& proposal_id,
                          core::BlockHeight current_height,
                          std::string& out_execution_payload) {
        std::lock_guard<std::mutex> lock(mutex_);
        auto it = proposals_.find(proposal_id);
        if (it == proposals_.end()) return false;

        auto& p = it->second;
        if (p.status != ProposalStatus::Queued && p.status != ProposalStatus::Passed) {
            return false;
        }

        // Enforce timelock expiration
        if (p.status == ProposalStatus::Queued && current_height < p.execution_height) {
            return false;
        }

        // Invariant guard: Governance actions cannot arbitrarily manipulate user balances
        if (p.execution_payload.find("seize_balance") != std::string::npos ||
            p.execution_payload.find("modify_balance") != std::string::npos ||
            p.execution_payload.find("bypass_signatures") != std::string::npos) {
            p.status = ProposalStatus::Cancelled;
            return false; // Illegal governance payload blocked
        }

        p.status = ProposalStatus::Executed;
        out_execution_payload = p.execution_payload;
        return true;
    }

    /// Cancel proposal before voting concludes
    bool cancel_proposal(const std::string& proposal_id, const std::string& requester) {
        std::lock_guard<std::mutex> lock(mutex_);
        auto it = proposals_.find(proposal_id);
        if (it == proposals_.end()) return false;

        auto& p = it->second;
        if (p.proposer_address != requester && requester != "security_council") {
            return false;
        }
        if (p.status == ProposalStatus::Executed || p.status == ProposalStatus::Cancelled) {
            return false;
        }

        p.status = ProposalStatus::Cancelled;
        return true;
    }

    // ========================================================================
    // 4. Emergency Circuit Breaker Policies
    // ========================================================================

    /// Activate temporary module pause during critical vulnerability triage
    bool pause_subsystem(const std::string& subsystem_name,
                         uint64_t duration_blocks,
                         core::BlockHeight current_height,
                         const std::string& requester) {
        std::lock_guard<std::mutex> lock(mutex_);
        // Inviolate: basic monetary ledger transfers can NEVER be paused
        if (subsystem_name == "transfers" || subsystem_name == "ledger" || subsystem_name == "balances") {
            return false;
        }

        SubsystemPauseRecord record;
        record.subsystem_name = subsystem_name;
        record.start_height = current_height;
        record.expires_height = current_height + duration_blocks;
        record.requester = requester;

        paused_subsystems_[subsystem_name] = record;
        return true;
    }

    /// Check if a subsystem is currently under active emergency pause
    [[nodiscard]] bool is_subsystem_paused(const std::string& subsystem_name,
                                           core::BlockHeight current_height) const {
        std::lock_guard<std::mutex> lock(mutex_);
        auto it = paused_subsystems_.find(subsystem_name);
        if (it == paused_subsystems_.end()) return false;
        return current_height < it->second.expires_height;
    }

    // ========================================================================
    // 5. Query & Audit History Interface
    // ========================================================================

    [[nodiscard]] std::optional<GovernanceProposal> get_proposal(const std::string& proposal_id) const {
        std::lock_guard<std::mutex> lock(mutex_);
        auto it = proposals_.find(proposal_id);
        if (it != proposals_.end()) return it->second;
        return std::nullopt;
    }

    [[nodiscard]] std::vector<GovernanceProposal> list_proposals() const {
        std::lock_guard<std::mutex> lock(mutex_);
        std::vector<GovernanceProposal> list;
        list.reserve(proposals_.size());
        for (const auto& [_, p] : proposals_) {
            list.push_back(p);
        }
        return list;
    }

    [[nodiscard]] std::vector<VoteRecord> get_votes(const std::string& proposal_id) const {
        std::lock_guard<std::mutex> lock(mutex_);
        auto it = vote_history_.find(proposal_id);
        if (it != vote_history_.end()) return it->second;
        return {};
    }

private:
    mutable std::mutex mutex_;
    std::unordered_map<std::string, GovernanceProposal> proposals_;
    std::unordered_map<std::string, std::unordered_set<std::string>> voted_records_;
    std::unordered_map<std::string, std::vector<VoteRecord>> vote_history_;
    std::unordered_map<std::string, SubsystemPauseRecord> paused_subsystems_;
};

} // namespace blockbum::governance
