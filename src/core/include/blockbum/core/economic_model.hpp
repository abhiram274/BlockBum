#pragma once

#include "blockbum/core/types.hpp"
#include "blockbum/core/transaction.hpp"
#include "blockbum/crypto/icrypto.hpp"
#include "blockbum/crypto/crypto_utils.hpp"
#include <string>
#include <vector>
#include <unordered_map>
#include <unordered_set>
#include <optional>
#include <cstdint>
#include <algorithm>
#include <mutex>
#include <stdexcept>

namespace blockbum::economics {

// ============================================================================
// 1. Economic Constants & Monetary Policy
// ============================================================================

/// 1 BUM = 1,000,000 atomic units (MicroBUM / 6 decimal precision)
inline constexpr uint64_t BUM_DECIMALS = 1'000'000;

/// Absolute Maximum Supply Cap: 21,000,000 BUM (21 Trillion atomic units)
/// Mathematically verified across 64 halving eras (26 active eras before binary shift reaches 0)
inline constexpr uint64_t MAX_BUM_SUPPLY = 21'000'000ULL * BUM_DECIMALS;

/// Initial block subsidy at Genesis: 50.0 BUM (50,000,000 atomic units)
inline constexpr uint64_t INITIAL_BLOCK_REWARD = 50ULL * BUM_DECIMALS;

/// Halving interval in blocks (~4 years at typical 10-minute block target)
inline constexpr uint64_t HALVING_INTERVAL = 210'000;

/// Absolute minimum network priority fee (1,000 atomic units = 0.001 BUM) to deter spam
inline constexpr uint64_t MIN_TRANSACTION_FEE = 1'000;

/// Default size-based fee rate: 10 atomic units per serialized byte
inline constexpr uint64_t DEFAULT_BYTE_FEE_RATE = 10;

/// Fee Distribution Split (Basis Points, 10,000 bps = 100%)
/// 80% to block proposer / validator
inline constexpr uint32_t PROPOSER_FEE_SHARE_BPS = 8'000;
/// 20% to Community Ecosystem Treasury
inline constexpr uint32_t TREASURY_FEE_SHARE_BPS = 2'000;

/// Protocol Community Treasury designated address
inline const std::string COMMUNITY_TREASURY_ADDRESS = "bb1_community_treasury";

/// Minimum timelock in blocks before a treasury proposal can be executed
inline constexpr uint64_t MIN_TREASURY_TIMELOCK_BLOCKS = 100;

/// Maximum disbursement percentage per proposal: 10% (1,000 bps)
inline constexpr uint32_t MAX_TREASURY_DISBURSEMENT_BPS = 1'000;

// ============================================================================
// 2. Monetary Calculations
// ============================================================================

/// Calculate block subsidy reward deterministically using integer right-shift
[[nodiscard]] inline uint64_t calculate_block_subsidy(core::BlockHeight height) {
    uint64_t halvings = height / HALVING_INTERVAL;
    if (halvings >= 64) return 0;
    return INITIAL_BLOCK_REWARD >> halvings;
}

/// Calculate minimum required fee based on serialized transaction size
[[nodiscard]] inline core::Balance calculate_minimum_fee(size_t serialized_size_bytes,
                                                         uint64_t byte_fee_rate = DEFAULT_BYTE_FEE_RATE) {
    uint64_t size_fee = static_cast<uint64_t>(serialized_size_bytes) * byte_fee_rate;
    return std::max(MIN_TRANSACTION_FEE, size_fee);
}

/// Fee split structure holding proposer and treasury allocations
struct FeeSplit {
    core::Balance proposer_share{0};
    core::Balance treasury_share{0};
};

/// Split block transaction fees deterministically into 80% proposer and 20% treasury
[[nodiscard]] inline FeeSplit split_fees(core::Balance total_fees) {
    core::Balance treasury_share = (total_fees * TREASURY_FEE_SHARE_BPS) / 10'000;
    core::Balance proposer_share = total_fees - treasury_share;
    return {proposer_share, treasury_share};
}

// ============================================================================
// 3. Optional Storage-Provider Compensation Escrow
// ============================================================================

struct StorageLeaseEscrow {
    std::string escrow_id;
    std::string uploader_address;
    std::string content_hash;
    core::Balance total_deposit{0};
    core::Balance remaining_balance{0};
    core::BlockHeight start_height{0};
    core::BlockHeight end_height{0};
    core::Balance payout_per_proof{0};
    uint32_t total_claims_paid{0};
    bool is_closed{false};
};

class StorageEscrowManager {
public:
    StorageEscrowManager() = default;

    /// Uploader creates a storage lease escrow deposit
    bool create_lease_escrow(const std::string& escrow_id,
                             const std::string& uploader_address,
                             const std::string& content_hash,
                             core::Balance deposit_amount,
                             core::BlockHeight start_height,
                             core::BlockHeight end_height,
                             core::Balance payout_per_proof) {
        std::lock_guard<std::mutex> lock(mutex_);
        if (escrows_.find(escrow_id) != escrows_.end()) return false;
        if (deposit_amount == 0 || payout_per_proof == 0 || payout_per_proof > deposit_amount) return false;
        if (end_height <= start_height) return false;

        StorageLeaseEscrow escrow;
        escrow.escrow_id = escrow_id;
        escrow.uploader_address = uploader_address;
        escrow.content_hash = content_hash;
        escrow.total_deposit = deposit_amount;
        escrow.remaining_balance = deposit_amount;
        escrow.start_height = start_height;
        escrow.end_height = end_height;
        escrow.payout_per_proof = payout_per_proof;
        escrow.total_claims_paid = 0;
        escrow.is_closed = false;

        escrows_[escrow_id] = escrow;
        return true;
    }

    /// Storage provider claims compensation for a valid Proof-of-Retrievability
    bool claim_storage_payout(const std::string& escrow_id,
                              const std::string& provider_address,
                              const std::string& challenge_id,
                              const core::Hash256& proof_hash,
                              core::BlockHeight current_height,
                              core::Balance& out_payout_amount) {
        std::lock_guard<std::mutex> lock(mutex_);
        auto it = escrows_.find(escrow_id);
        if (it == escrows_.end() || it->second.is_closed) return false;

        auto& esc = it->second;
        if (current_height < esc.start_height || current_height > esc.end_height) return false;
        if (esc.remaining_balance < esc.payout_per_proof) return false;

        // Prevent challenge replay
        std::string proof_key = escrow_id + "_" + challenge_id;
        if (claimed_challenges_.find(proof_key) != claimed_challenges_.end()) {
            return false;
        }

        // Validate proof non-empty
        core::Hash256 empty_hash{};
        if (proof_hash == empty_hash) return false;

        claimed_challenges_.insert(proof_key);
        out_payout_amount = esc.payout_per_proof;
        esc.remaining_balance -= esc.payout_per_proof;
        esc.total_claims_paid++;

        if (esc.remaining_balance < esc.payout_per_proof) {
            esc.is_closed = true;
        }

        return true;
    }

    /// Uploader reclaims unspent funds after lease period expires
    bool refund_expired_escrow(const std::string& escrow_id,
                               const std::string& requester,
                               core::BlockHeight current_height,
                               core::Balance& out_refund_amount) {
        std::lock_guard<std::mutex> lock(mutex_);
        auto it = escrows_.find(escrow_id);
        if (it == escrows_.end()) return false;

        auto& esc = it->second;
        if (esc.uploader_address != requester) return false;
        if (current_height <= esc.end_height && !esc.is_closed) return false;
        if (esc.remaining_balance == 0) return false;

        out_refund_amount = esc.remaining_balance;
        esc.remaining_balance = 0;
        esc.is_closed = true;
        return true;
    }

    [[nodiscard]] std::optional<StorageLeaseEscrow> get_escrow(const std::string& escrow_id) const {
        std::lock_guard<std::mutex> lock(mutex_);
        auto it = escrows_.find(escrow_id);
        if (it != escrows_.end()) return it->second;
        return std::nullopt;
    }

private:
    mutable std::mutex mutex_;
    std::unordered_map<std::string, StorageLeaseEscrow> escrows_;
    std::unordered_set<std::string> claimed_challenges_;
};

// ============================================================================
// 4. Optional Community Contribution Bounties
// ============================================================================

struct ChallengeBountyEscrow {
    std::string bounty_id;
    std::string creator_address;
    std::string challenge_id;
    core::Balance bounty_amount{0};
    core::BlockHeight created_height{0};
    bool is_claimed{false};
    std::string winner_address{};
};

class ChallengeBountyManager {
public:
    ChallengeBountyManager() = default;

    bool fund_bounty(const std::string& bounty_id,
                     const std::string& creator_address,
                     const std::string& challenge_id,
                     core::Balance bounty_amount,
                     core::BlockHeight current_height) {
        std::lock_guard<std::mutex> lock(mutex_);
        if (bounties_.find(bounty_id) != bounties_.end()) return false;
        if (bounty_amount == 0) return false;

        ChallengeBountyEscrow b;
        b.bounty_id = bounty_id;
        b.creator_address = creator_address;
        b.challenge_id = challenge_id;
        b.bounty_amount = bounty_amount;
        b.created_height = current_height;
        b.is_claimed = false;

        bounties_[bounty_id] = b;
        return true;
    }

    bool claim_bounty(const std::string& bounty_id,
                      const std::string& winner_address,
                      const std::string& solution_hash,
                      core::Balance& out_bounty_amount) {
        std::lock_guard<std::mutex> lock(mutex_);
        auto it = bounties_.find(bounty_id);
        if (it == bounties_.end() || it->second.is_claimed) return false;
        if (solution_hash.empty()) return false;

        it->second.is_claimed = true;
        it->second.winner_address = winner_address;
        out_bounty_amount = it->second.bounty_amount;
        return true;
    }

    [[nodiscard]] std::optional<ChallengeBountyEscrow> get_bounty(const std::string& bounty_id) const {
        std::lock_guard<std::mutex> lock(mutex_);
        auto it = bounties_.find(bounty_id);
        if (it != bounties_.end()) return it->second;
        return std::nullopt;
    }

private:
    mutable std::mutex mutex_;
    std::unordered_map<std::string, ChallengeBountyEscrow> bounties_;
};

// ============================================================================
// 5. Protocol Community Ecosystem Treasury
// ============================================================================

struct TreasuryProposal {
    std::string proposal_id;
    std::string proposer_address;
    std::string recipient_address;
    core::Balance requested_amount{0};
    std::string description;
    core::BlockHeight submitted_height{0};
    core::BlockHeight execution_height{0};
    std::unordered_set<std::string> signers;
    uint32_t required_signatures{2};
    bool is_executed{false};
};

class CommunityTreasuryManager {
public:
    CommunityTreasuryManager() = default;

    void credit_inflow(core::Balance amount) {
        std::lock_guard<std::mutex> lock(mutex_);
        treasury_balance_ += amount;
    }

    [[nodiscard]] core::Balance balance() const noexcept {
        std::lock_guard<std::mutex> lock(mutex_);
        return treasury_balance_;
    }

    bool submit_proposal(const std::string& proposal_id,
                         const std::string& proposer_address,
                         const std::string& recipient_address,
                         core::Balance requested_amount,
                         const std::string& description,
                         core::BlockHeight current_height,
                         uint32_t required_signatures = 2) {
        std::lock_guard<std::mutex> lock(mutex_);
        if (proposals_.find(proposal_id) != proposals_.end()) return false;
        if (requested_amount == 0 || requested_amount > treasury_balance_) return false;

        // Enforce disbursement cap (max 10% of current treasury per proposal)
        uint64_t max_allowed = (treasury_balance_ * MAX_TREASURY_DISBURSEMENT_BPS) / 10'000;
        if (requested_amount > max_allowed) return false;

        TreasuryProposal p;
        p.proposal_id = proposal_id;
        p.proposer_address = proposer_address;
        p.recipient_address = recipient_address;
        p.requested_amount = requested_amount;
        p.description = description;
        p.submitted_height = current_height;
        p.execution_height = current_height + MIN_TREASURY_TIMELOCK_BLOCKS;
        p.required_signatures = required_signatures;
        p.is_executed = false;
        p.signers.insert(proposer_address); // Proposer automatically signs

        proposals_[proposal_id] = p;
        return true;
    }

    bool sign_proposal(const std::string& proposal_id, const std::string& signer_address) {
        std::lock_guard<std::mutex> lock(mutex_);
        auto it = proposals_.find(proposal_id);
        if (it == proposals_.end() || it->second.is_executed) return false;

        it->second.signers.insert(signer_address);
        return true;
    }

    bool execute_proposal(const std::string& proposal_id,
                          core::BlockHeight current_height,
                          core::Balance& out_disbursed_amount,
                          std::string& out_recipient) {
        std::lock_guard<std::mutex> lock(mutex_);
        auto it = proposals_.find(proposal_id);
        if (it == proposals_.end() || it->second.is_executed) return false;

        auto& p = it->second;
        // Verify timelock expiration
        if (current_height < p.execution_height) return false;

        // Verify signature quorum
        if (p.signers.size() < p.required_signatures) return false;

        // Verify balance solvency
        if (treasury_balance_ < p.requested_amount) return false;

        p.is_executed = true;
        treasury_balance_ -= p.requested_amount;
        out_disbursed_amount = p.requested_amount;
        out_recipient = p.recipient_address;
        return true;
    }

    [[nodiscard]] std::optional<TreasuryProposal> get_proposal(const std::string& proposal_id) const {
        std::lock_guard<std::mutex> lock(mutex_);
        auto it = proposals_.find(proposal_id);
        if (it != proposals_.end()) return it->second;
        return std::nullopt;
    }

private:
    mutable std::mutex mutex_;
    core::Balance treasury_balance_{0};
    std::unordered_map<std::string, TreasuryProposal> proposals_;
};

// ============================================================================
// 6. Network Economic Simulation Engine
// ============================================================================

struct SimulationParameters {
    uint32_t blocks_per_year{52'560}; // ~10-minute blocks (52,560 / yr)
    uint32_t tx_per_block{50};
    core::Balance avg_fee_per_tx{2'500}; // 0.0025 BUM
    uint32_t active_validators{25};
};

struct YearSimulationResult {
    uint32_t year{0};
    core::BlockHeight start_height{0};
    core::BlockHeight end_height{0};
    uint64_t subsidy_per_block{0};
    uint64_t total_subsidy_minted{0};
    uint64_t total_fees_collected{0};
    uint64_t proposer_fees_distributed{0};
    uint64_t treasury_fees_accumulated{0};
    uint64_t circulating_supply{0};
    double annualized_inflation_percent{0.0};
    double annual_validator_earnings_bum{0.0};
};

class EconomicSimulator {
public:
    static std::vector<YearSimulationResult> simulate_trajectory(uint32_t num_years,
                                                                 const SimulationParameters& params,
                                                                 uint64_t initial_supply = 0) {
        std::vector<YearSimulationResult> results;
        results.reserve(num_years);

        uint64_t current_supply = initial_supply;
        core::BlockHeight current_height = 0;

        for (uint32_t y = 1; y <= num_years; ++y) {
            YearSimulationResult res;
            res.year = y;
            res.start_height = current_height;
            res.end_height = current_height + params.blocks_per_year - 1;

            uint64_t year_subsidy = 0;
            uint64_t year_fees = 0;
            uint64_t year_proposer_fees = 0;
            uint64_t year_treasury_fees = 0;

            for (uint32_t b = 0; b < params.blocks_per_year; ++b) {
                core::BlockHeight h = current_height + b;
                uint64_t subsidy = calculate_block_subsidy(h);

                // Enforce maximum supply bound
                if (current_supply + year_subsidy + subsidy > MAX_BUM_SUPPLY) {
                    subsidy = (current_supply + year_subsidy < MAX_BUM_SUPPLY)
                              ? (MAX_BUM_SUPPLY - (current_supply + year_subsidy))
                              : 0;
                }
                year_subsidy += subsidy;

                uint64_t block_fees = static_cast<uint64_t>(params.tx_per_block) * params.avg_fee_per_tx;
                auto split = split_fees(block_fees);
                year_fees += block_fees;
                year_proposer_fees += split.proposer_share;
                year_treasury_fees += split.treasury_share;

                if (b == 0) {
                    res.subsidy_per_block = subsidy;
                }
            }

            double start_supply_flt = static_cast<double>(current_supply) / BUM_DECIMALS;
            current_supply += year_subsidy;
            current_height += params.blocks_per_year;

            res.total_subsidy_minted = year_subsidy;
            res.total_fees_collected = year_fees;
            res.proposer_fees_distributed = year_proposer_fees;
            res.treasury_fees_accumulated = year_treasury_fees;
            res.circulating_supply = current_supply;

            if (start_supply_flt > 0.0) {
                res.annualized_inflation_percent = ((static_cast<double>(year_subsidy) / BUM_DECIMALS) / start_supply_flt) * 100.0;
            } else {
                res.annualized_inflation_percent = 100.0;
            }

            double total_proposer_earnings = static_cast<double>(year_subsidy + year_proposer_fees) / BUM_DECIMALS;
            res.annual_validator_earnings_bum = total_proposer_earnings / params.active_validators;

            results.push_back(res);
        }

        return results;
    }
};

} // namespace blockbum::economics
