#include <gtest/gtest.h>
#include "blockbum/core/governance.hpp"
#include "blockbum/crypto/standard_crypto.hpp"

using namespace blockbum;
using namespace blockbum::governance;

class GovernanceTest : public ::testing::Test {
protected:
    void SetUp() override {
        crypto_ = std::make_shared<crypto::StandardCryptoEngine>();
    }

    std::shared_ptr<crypto::ICryptoEngine> crypto_;
};

// 1. BBIP Proposal Submission and Validation
TEST_F(GovernanceTest, ProposalSubmissionAndValidation) {
    GovernanceManager gov;
    core::Hash256 cid{};
    cid.fill(0x11);

    // Valid proposal
    EXPECT_TRUE(gov.submit_proposal("bbip_0002", "bb1_author", "Increase Block Size to 2MB",
                                    "Detailed specification for block size increase",
                                    cid, ProposalCategory::CoreConsensus, 100, 500, 100, "set_block_size:2000000"));

    // Duplicate proposal ID rejected
    EXPECT_FALSE(gov.submit_proposal("bbip_0002", "bb1_author", "Duplicate", "Desc",
                                     cid, ProposalCategory::CoreConsensus, 100, 500, 100));

    // Empty title or description rejected
    EXPECT_FALSE(gov.submit_proposal("bbip_0003", "bb1_author", "", "Desc",
                                     cid, ProposalCategory::CoreConsensus, 100, 500, 100));
    EXPECT_FALSE(gov.submit_proposal("bbip_0004", "bb1_author", "Title", "",
                                     cid, ProposalCategory::CoreConsensus, 100, 500, 100));

    // Empty content hash rejected
    core::Hash256 empty_hash{};
    EXPECT_FALSE(gov.submit_proposal("bbip_0005", "bb1_author", "Title", "Desc",
                                     empty_hash, ProposalCategory::CoreConsensus, 100, 500, 100));

    auto prop = gov.get_proposal("bbip_0002");
    ASSERT_TRUE(prop.has_value());
    EXPECT_EQ(prop->category, ProposalCategory::CoreConsensus);
    EXPECT_EQ(prop->status, ProposalStatus::Active);
    EXPECT_EQ(prop->start_height, 100);
    EXPECT_EQ(prop->end_height, 600); // 100 + 500
}

// 2. Double Voting and Sybil Prevention
TEST_F(GovernanceTest, DoubleVotingAndSybilPrevention) {
    GovernanceManager gov;
    core::Hash256 cid{};
    cid.fill(0x22);

    EXPECT_TRUE(gov.submit_proposal("bbip_0003", "bb1_author", "Storage Rent Adjustment",
                                    "Adjust lease rent rates", cid,
                                    ProposalCategory::ParameterChange, 50, 100, 50));

    // Voter 1 casts 'Yes' vote
    EXPECT_TRUE(gov.cast_vote("bbip_0003", "bb1_voter_alice", VoteChoice::Yes, 10, 60));

    // Voter 1 attempts duplicate vote on same proposal -> rejected
    EXPECT_FALSE(gov.cast_vote("bbip_0003", "bb1_voter_alice", VoteChoice::No, 10, 65));
    EXPECT_FALSE(gov.cast_vote("bbip_0003", "bb1_voter_alice", VoteChoice::Yes, 10, 70));

    // Voter 2 casts 'No' vote
    EXPECT_TRUE(gov.cast_vote("bbip_0003", "bb1_voter_bob", VoteChoice::No, 5, 75));

    // Voter 3 casts 'Abstain' vote
    EXPECT_TRUE(gov.cast_vote("bbip_0003", "bb1_voter_carol", VoteChoice::Abstain, 3, 80));

    auto prop = gov.get_proposal("bbip_0003");
    ASSERT_TRUE(prop.has_value());
    EXPECT_EQ(prop->tally.yes_votes, 10);
    EXPECT_EQ(prop->tally.no_votes, 5);
    EXPECT_EQ(prop->tally.abstain_votes, 3);
    EXPECT_EQ(prop->tally.total_voters, 3);
    EXPECT_EQ(prop->tally.total_votes(), 18);
}

// 3. Voting Window Enforcement
TEST_F(GovernanceTest, VotingWindowEnforcement) {
    GovernanceManager gov;
    core::Hash256 cid{};
    cid.fill(0x33);

    EXPECT_TRUE(gov.submit_proposal("bbip_0004", "bb1_author", "P2P Compression",
                                    "Enable Zstd wire compression", cid,
                                    ProposalCategory::NetworkProtocol, 100, 200, 50));

    // Vote before start_height (height 90 < 100) -> rejected
    EXPECT_FALSE(gov.cast_vote("bbip_0004", "bb1_early_voter", VoteChoice::Yes, 1, 90));

    // Vote during voting window (height 150) -> accepted
    EXPECT_TRUE(gov.cast_vote("bbip_0004", "bb1_valid_voter", VoteChoice::Yes, 1, 150));

    // Vote after end_height (height 305 > 300) -> rejected
    EXPECT_FALSE(gov.cast_vote("bbip_0004", "bb1_late_voter", VoteChoice::Yes, 1, 305));
}

// 4. Quorum and Supermajority Thresholds
TEST_F(GovernanceTest, QuorumAndSupermajorityThresholds) {
    GovernanceManager gov;
    core::Hash256 cid{};
    cid.fill(0x44);

    // Scenario A: CoreConsensus fails quorum (< 20% of 100 eligible power)
    EXPECT_TRUE(gov.submit_proposal("prop_core_fail_quorum", "bb1_dev", "Core Change A",
                                    "Desc", cid, ProposalCategory::CoreConsensus, 10, 50, 20));
    EXPECT_TRUE(gov.cast_vote("prop_core_fail_quorum", "bb1_v1", VoteChoice::Yes, 15, 20)); // Only 15% cast
    EXPECT_TRUE(gov.finalize_proposal("prop_core_fail_quorum", 65, 100));

    auto p_quorum_fail = gov.get_proposal("prop_core_fail_quorum");
    ASSERT_TRUE(p_quorum_fail.has_value());
    EXPECT_EQ(p_quorum_fail->status, ProposalStatus::Defeated);

    // Scenario B: CoreConsensus meets quorum (30%) but fails 66.7% supermajority (60% approval)
    EXPECT_TRUE(gov.submit_proposal("prop_core_fail_supermajority", "bb1_dev", "Core Change B",
                                    "Desc", cid, ProposalCategory::CoreConsensus, 10, 50, 20));
    EXPECT_TRUE(gov.cast_vote("prop_core_fail_supermajority", "bb1_v1", VoteChoice::Yes, 18, 20)); // 18 Yes
    EXPECT_TRUE(gov.cast_vote("prop_core_fail_supermajority", "bb1_v2", VoteChoice::No, 12, 25));  // 12 No
    // Total = 30% (>= 20% quorum). Approval = 18/30 = 60.0% (< 66.666% required)
    EXPECT_TRUE(gov.finalize_proposal("prop_core_fail_supermajority", 65, 100));

    auto p_supermaj_fail = gov.get_proposal("prop_core_fail_supermajority");
    ASSERT_TRUE(p_supermaj_fail.has_value());
    EXPECT_EQ(p_supermaj_fail->status, ProposalStatus::Defeated);

    // Scenario C: CoreConsensus meets quorum (30%) and supermajority (24/30 = 80.0% >= 66.7%)
    EXPECT_TRUE(gov.submit_proposal("prop_core_pass", "bb1_dev", "Core Change C",
                                    "Desc", cid, ProposalCategory::CoreConsensus, 10, 50, 50));
    EXPECT_TRUE(gov.cast_vote("prop_core_pass", "bb1_v1", VoteChoice::Yes, 24, 20)); // 24 Yes
    EXPECT_TRUE(gov.cast_vote("prop_core_pass", "bb1_v2", VoteChoice::No, 6, 25));   // 6 No
    EXPECT_TRUE(gov.finalize_proposal("prop_core_pass", 65, 100));

    auto p_pass = gov.get_proposal("prop_core_pass");
    ASSERT_TRUE(p_pass.has_value());
    EXPECT_EQ(p_pass->status, ProposalStatus::Queued); // Enters timelock queue
    EXPECT_EQ(p_pass->execution_height, 115);          // 65 + 50 timelock blocks
}

// 5. Timelock Enforcement and Proposal Execution
TEST_F(GovernanceTest, TimelockEnforcementAndExecution) {
    GovernanceManager gov;
    core::Hash256 cid{};
    cid.fill(0x55);

    EXPECT_TRUE(gov.submit_proposal("prop_grant_01", "bb1_grantee", "Explorer Tooling Grant",
                                    "Fund open source explorer", cid,
                                    ProposalCategory::TreasuryGrant, 10, 50, 100, "transfer:bb1_grantee:5000"));
    EXPECT_TRUE(gov.cast_vote("prop_grant_01", "bb1_v1", VoteChoice::Yes, 20, 20));
    EXPECT_TRUE(gov.finalize_proposal("prop_grant_01", 65, 100));

    auto prop = gov.get_proposal("prop_grant_01");
    ASSERT_TRUE(prop.has_value());
    EXPECT_EQ(prop->status, ProposalStatus::Queued);
    EXPECT_EQ(prop->execution_height, 165); // 65 + 100

    // Attempt execution before timelock (height 120 < 165) -> rejected
    std::string payload;
    EXPECT_FALSE(gov.execute_proposal("prop_grant_01", 120, payload));

    // Attempt execution at height 165 (timelock elapsed) -> succeeds
    EXPECT_TRUE(gov.execute_proposal("prop_grant_01", 165, payload));
    EXPECT_EQ(payload, "transfer:bb1_grantee:5000");

    auto prop_executed = gov.get_proposal("prop_grant_01");
    ASSERT_TRUE(prop_executed.has_value());
    EXPECT_EQ(prop_executed->status, ProposalStatus::Executed);

    // Double execution attempt -> rejected
    EXPECT_FALSE(gov.execute_proposal("prop_grant_01", 170, payload));
}

// 6. Inviolate Private Property and Balance Modification Protection
TEST_F(GovernanceTest, InviolateUserBalanceProtection) {
    GovernanceManager gov;
    core::Hash256 cid{};
    cid.fill(0x66);

    // Malicious proposal attempting to seize user funds
    EXPECT_TRUE(gov.submit_proposal("prop_malicious_seize", "bb1_bad_actor", "Seize Inactive Coins",
                                    "Illegal seizure proposal", cid,
                                    ProposalCategory::ParameterChange, 10, 50, 10, "seize_balance:bb1_victim:50000"));
    EXPECT_TRUE(gov.cast_vote("prop_malicious_seize", "bb1_voter", VoteChoice::Yes, 30, 20));
    EXPECT_TRUE(gov.finalize_proposal("prop_malicious_seize", 65, 100));

    // Execution must be rejected and proposal cancelled due to invariant protection
    std::string payload;
    EXPECT_FALSE(gov.execute_proposal("prop_malicious_seize", 76, payload));

    auto prop = gov.get_proposal("prop_malicious_seize");
    ASSERT_TRUE(prop.has_value());
    EXPECT_EQ(prop->status, ProposalStatus::Cancelled);
}

// 7. Emergency Circuit Breaker Policies
TEST_F(GovernanceTest, EmergencyCircuitBreakersAndExpiry) {
    GovernanceManager gov;

    // Security council activates temporary pause on storage payouts
    EXPECT_TRUE(gov.pause_subsystem("storage_payouts", 50, 100, "security_council"));
    EXPECT_TRUE(gov.is_subsystem_paused("storage_payouts", 120)); // Within pause window

    // Attempt to pause fundamental ledger transfers or balances -> REJECTED
    EXPECT_FALSE(gov.pause_subsystem("transfers", 50, 100, "security_council"));
    EXPECT_FALSE(gov.pause_subsystem("ledger", 50, 100, "security_council"));
    EXPECT_FALSE(gov.pause_subsystem("balances", 50, 100, "security_council"));

    // After duration expires (height 151 > 150), pause automatically lifts
    EXPECT_FALSE(gov.is_subsystem_paused("storage_payouts", 151));
}

// 8. Public Governance History and Transparency
TEST_F(GovernanceTest, PublicGovernanceHistoryAndTransparency) {
    GovernanceManager gov;
    core::Hash256 cid{};
    cid.fill(0x77);

    EXPECT_TRUE(gov.submit_proposal("prop_p1", "bb1_user_a", "Proposal 1", "Desc 1", cid,
                                    ProposalCategory::CommunityMeta, 10, 50, 0));
    EXPECT_TRUE(gov.submit_proposal("prop_p2", "bb1_user_b", "Proposal 2", "Desc 2", cid,
                                    ProposalCategory::CommunityMeta, 10, 50, 0));

    EXPECT_TRUE(gov.cast_vote("prop_p1", "bb1_voter_1", VoteChoice::Yes, 5, 20));
    EXPECT_TRUE(gov.cast_vote("prop_p1", "bb1_voter_2", VoteChoice::No, 3, 22));

    auto votes = gov.get_votes("prop_p1");
    ASSERT_EQ(votes.size(), 2);
    EXPECT_EQ(votes[0].voter_address, "bb1_voter_1");
    EXPECT_EQ(votes[0].choice, VoteChoice::Yes);
    EXPECT_EQ(votes[0].weight, 5);

    auto all_proposals = gov.list_proposals();
    EXPECT_EQ(all_proposals.size(), 2);
}
