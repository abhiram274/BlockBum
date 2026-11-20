#include <gtest/gtest.h>
#include "blockbum/core/economic_model.hpp"
#include "blockbum/core/account_ledger.hpp"
#include "blockbum/crypto/standard_crypto.hpp"
#include <numeric>

using namespace blockbum;
using namespace blockbum::economics;

class EconomicInfrastructureTest : public ::testing::Test {
protected:
    void SetUp() override {
        crypto_ = std::make_shared<crypto::StandardCryptoEngine>();
    }

    std::shared_ptr<crypto::ICryptoEngine> crypto_;
};

// 1. Audit and Mathematical Consistency of 21M Supply Cap
TEST_F(EconomicInfrastructureTest, MathematicalConsistencyOfSupplyCap) {
    // Genesis subsidy
    EXPECT_EQ(calculate_block_subsidy(0), 50 * BUM_DECIMALS);
    EXPECT_EQ(calculate_block_subsidy(HALVING_INTERVAL - 1), 50 * BUM_DECIMALS);

    // Era 1 (block 210,000)
    EXPECT_EQ(calculate_block_subsidy(HALVING_INTERVAL), 25 * BUM_DECIMALS);

    // Era 2 (block 420,000)
    EXPECT_EQ(calculate_block_subsidy(2 * HALVING_INTERVAL), 12.5 * BUM_DECIMALS);

    // Era 25: 50,000,000 >> 25 = 1 atomic unit (0.000001 BUM)
    EXPECT_EQ(calculate_block_subsidy(25 * HALVING_INTERVAL), 1);

    // Era 26 (block 5,460,000): 50,000,000 >> 26 = 0 atomic units (terminal emission)
    EXPECT_EQ(calculate_block_subsidy(26 * HALVING_INTERVAL), 0);

    // Era 64+: Clamped to 0
    EXPECT_EQ(calculate_block_subsidy(64 * HALVING_INTERVAL), 0);
    EXPECT_EQ(calculate_block_subsidy(100 * HALVING_INTERVAL), 0);

    // Discrete sum across all 64 eras
    uint64_t total_subsidy_minted = 0;
    for (core::BlockHeight h = 0; h < 64 * HALVING_INTERVAL; h += HALVING_INTERVAL) {
        uint64_t era_reward = calculate_block_subsidy(h);
        total_subsidy_minted += era_reward * HALVING_INTERVAL;
    }

    // Mathematical invariant: total emitted subsidy is strictly bounded by MAX_BUM_SUPPLY
    EXPECT_LE(total_subsidy_minted, MAX_BUM_SUPPLY);
    EXPECT_EQ(MAX_BUM_SUPPLY, 21'000'000ULL * BUM_DECIMALS);

    // Exact discrete sum with integer right-shift truncation at 6 decimal places: 20,999,997.48 BUM
    EXPECT_EQ(total_subsidy_minted, 20'999'997'480'000ULL);

    // Legacy 100M placeholder is strictly rejected
    EXPECT_NE(MAX_BUM_SUPPLY, 100'000'000ULL * BUM_DECIMALS);
}

// 2. Dynamic Transaction Fee Calculation
TEST_F(EconomicInfrastructureTest, DynamicTransactionFeeCalculation) {
    // Transactions below minimum size fee default to MIN_TRANSACTION_FEE (1,000 atomic units)
    EXPECT_EQ(calculate_minimum_fee(50), MIN_TRANSACTION_FEE);
    EXPECT_EQ(calculate_minimum_fee(100), MIN_TRANSACTION_FEE);

    // Above 100 bytes at 10 units/byte, fee scales with serialized size
    EXPECT_EQ(calculate_minimum_fee(180), 1'800); // Typical transfer
    EXPECT_EQ(calculate_minimum_fee(500), 5'000); // Complex multi-sig or contract

    // Custom byte fee rate
    EXPECT_EQ(calculate_minimum_fee(200, 20), 4'000);
}

// 3. Deterministic 80/20 Fee Distribution Split
TEST_F(EconomicInfrastructureTest, DeterministicFeeDistributionSplit) {
    // Standard fee split: 80% proposer, 20% treasury
    auto split1 = split_fees(10'000);
    EXPECT_EQ(split1.proposer_share, 8'000);
    EXPECT_EQ(split1.treasury_share, 2'000);
    EXPECT_EQ(split1.proposer_share + split1.treasury_share, 10'000);

    // Size-based fee split (1,800 units)
    auto split2 = split_fees(1'800);
    EXPECT_EQ(split2.proposer_share, 1'440);
    EXPECT_EQ(split2.treasury_share, 360);
    EXPECT_EQ(split2.proposer_share + split2.treasury_share, 1'800);

    // Odd number fee split (guarantees zero dust loss)
    auto split3 = split_fees(1'001);
    EXPECT_EQ(split3.proposer_share + split3.treasury_share, 1'001);
}

// 4. Block Reward Uniqueness and Duplicate Reward Prevention
TEST_F(EconomicInfrastructureTest, BlockRewardUniquenessAndReorganization) {
    ledger::AccountLedger ledger;
    std::string miner = "bb1_validator_alice";

    // Award block 1 reward + 10,000 fee
    EXPECT_TRUE(ledger.credit_block_reward_with_split(miner, 1, 10'000));
    EXPECT_TRUE(ledger.is_height_rewarded(1));

    // Miner receives subsidy (50 BUM) + 80% of fees (8,000)
    EXPECT_EQ(ledger.get_balance(miner), 50 * BUM_DECIMALS + 8'000);
    // Treasury receives 20% of fees (2,000)
    EXPECT_EQ(ledger.get_balance(COMMUNITY_TREASURY_ADDRESS), 2'000);

    // Duplicate reward attempt for height 1 MUST be rejected
    EXPECT_FALSE(ledger.credit_block_reward_with_split(miner, 1, 10'000));
    EXPECT_FALSE(ledger.credit_block_reward_with_split("bb1_malicious_attacker", 1, 10'000));

    // Balances and total supply remain unchanged after duplicate attempt
    EXPECT_EQ(ledger.get_balance(miner), 50 * BUM_DECIMALS + 8'000);
    EXPECT_EQ(ledger.total_supply(), 50 * BUM_DECIMALS);

    // Invariant check passes
    EXPECT_TRUE(ledger.verify_state_invariants());

    // Reorganize / Revert block 1
    EXPECT_TRUE(ledger.revert_block_reward(miner, 1, 10'000));
    EXPECT_FALSE(ledger.is_height_rewarded(1));
    EXPECT_EQ(ledger.get_balance(miner), 0);
    EXPECT_EQ(ledger.get_balance(COMMUNITY_TREASURY_ADDRESS), 0);
    EXPECT_EQ(ledger.total_supply(), 0);

    // After reorg revert, height 1 can be rewarded cleanly
    EXPECT_TRUE(ledger.credit_block_reward_with_split(miner, 1, 10'000));
    EXPECT_TRUE(ledger.verify_state_invariants());
}

// 5. Storage Provider Compensation Escrow
TEST_F(EconomicInfrastructureTest, StorageProviderCompensationEscrow) {
    StorageEscrowManager storage_escrow;
    std::string uploader = "bb1_uploader_carol";
    std::string provider = "bb1_provider_dave";
    std::string content_hash = "sha256_dataset_manifest_001";
    std::string escrow_id = "escrow_001";

    core::Balance total_deposit = 100'000;
    core::Balance payout_per_proof = 20'000;
    core::BlockHeight start_h = 100;
    core::BlockHeight end_h = 200;

    // Create lease escrow
    EXPECT_TRUE(storage_escrow.create_lease_escrow(escrow_id, uploader, content_hash,
                                                   total_deposit, start_h, end_h, payout_per_proof));

    // Duplicate escrow ID rejected
    EXPECT_FALSE(storage_escrow.create_lease_escrow(escrow_id, uploader, content_hash,
                                                    total_deposit, start_h, end_h, payout_per_proof));

    // Claim before start_height rejected
    core::Balance payout = 0;
    core::Hash256 proof_hash{};
    proof_hash.fill(0xAA);
    EXPECT_FALSE(storage_escrow.claim_storage_payout(escrow_id, provider, "chal_01", proof_hash, 50, payout));

    // Valid claim within height window
    EXPECT_TRUE(storage_escrow.claim_storage_payout(escrow_id, provider, "chal_01", proof_hash, 120, payout));
    EXPECT_EQ(payout, 20'000);

    // Replaying the same challenge ID rejected
    EXPECT_FALSE(storage_escrow.claim_storage_payout(escrow_id, provider, "chal_01", proof_hash, 125, payout));

    // Second valid challenge payout
    EXPECT_TRUE(storage_escrow.claim_storage_payout(escrow_id, provider, "chal_02", proof_hash, 130, payout));
    EXPECT_EQ(payout, 20'000);

    auto esc_state = storage_escrow.get_escrow(escrow_id);
    ASSERT_TRUE(esc_state.has_value());
    EXPECT_EQ(esc_state->remaining_balance, 60'000);
    EXPECT_EQ(esc_state->total_claims_paid, 2);

    // Refund before end_height rejected
    core::Balance refund = 0;
    EXPECT_FALSE(storage_escrow.refund_expired_escrow(escrow_id, uploader, 150, refund));

    // Refund by non-uploader rejected
    EXPECT_FALSE(storage_escrow.refund_expired_escrow(escrow_id, "bb1_attacker", 250, refund));

    // Refund after expiration succeeded
    EXPECT_TRUE(storage_escrow.refund_expired_escrow(escrow_id, uploader, 201, refund));
    EXPECT_EQ(refund, 60'000);

    // Subsequent claims rejected because escrow is closed
    EXPECT_FALSE(storage_escrow.claim_storage_payout(escrow_id, provider, "chal_03", proof_hash, 205, payout));
}

// 6. Community Contribution Challenge Bounty Escrow
TEST_F(EconomicInfrastructureTest, CommunityChallengeBountyEscrow) {
    ChallengeBountyManager bounty_mgr;
    std::string creator = "bb1_challenge_sponsor";
    std::string winner = "bb1_developer_eve";
    std::string bounty_id = "bounty_cxx_audit";

    EXPECT_TRUE(bounty_mgr.fund_bounty(bounty_id, creator, "chal_sec_audit", 50'000, 10));

    // Duplicate funding rejected
    EXPECT_FALSE(bounty_mgr.fund_bounty(bounty_id, creator, "chal_sec_audit", 50'000, 10));

    // Winner claims bounty with solution
    core::Balance awarded_amount = 0;
    EXPECT_TRUE(bounty_mgr.claim_bounty(bounty_id, winner, "solution_hash_sha256", awarded_amount));
    EXPECT_EQ(awarded_amount, 50'000);

    // Duplicate claim rejected
    EXPECT_FALSE(bounty_mgr.claim_bounty(bounty_id, "bb1_second_claimant", "solution_hash_sha256", awarded_amount));

    auto bounty = bounty_mgr.get_bounty(bounty_id);
    ASSERT_TRUE(bounty.has_value());
    EXPECT_TRUE(bounty->is_claimed);
    EXPECT_EQ(bounty->winner_address, winner);
}

// 7. Community Treasury Rules & Governance Timelock
TEST_F(EconomicInfrastructureTest, CommunityTreasuryRulesAndGovernance) {
    CommunityTreasuryManager treasury;

    // Credit treasury with 100,000 atomic units
    treasury.credit_inflow(100'000);
    EXPECT_EQ(treasury.balance(), 100'000);

    std::string proposal_id = "prop_tooling_grant";
    std::string proposer = "bb1_core_maintainer";
    std::string recipient = "bb1_grant_recipient";

    // Proposal exceeding 10% disbursement cap (10,000) rejected
    EXPECT_FALSE(treasury.submit_proposal(proposal_id, proposer, recipient, 15'000, "Too expensive", 100));

    // Valid proposal: 8,000 units (<= 10% of 100,000)
    EXPECT_TRUE(treasury.submit_proposal(proposal_id, proposer, recipient, 8'000, "Node SDK Development", 100, 2));

    auto prop = treasury.get_proposal(proposal_id);
    ASSERT_TRUE(prop.has_value());
    EXPECT_EQ(prop->execution_height, 200); // 100 + MIN_TREASURY_TIMELOCK_BLOCKS (100)

    // Attempt early execution before timelock rejected
    core::Balance disbursed = 0;
    std::string payout_addr;
    EXPECT_FALSE(treasury.execute_proposal(proposal_id, 150, disbursed, payout_addr));

    // Attempt execution at height 200 without quorum (only proposer signed so far) rejected
    EXPECT_FALSE(treasury.execute_proposal(proposal_id, 200, disbursed, payout_addr));

    // Second signer approves proposal
    EXPECT_TRUE(treasury.sign_proposal(proposal_id, "bb1_signer_bob"));

    // Now quorum (2/2) and timelock are satisfied -> execution succeeds
    EXPECT_TRUE(treasury.execute_proposal(proposal_id, 205, disbursed, payout_addr));
    EXPECT_EQ(disbursed, 8'000);
    EXPECT_EQ(payout_addr, recipient);
    EXPECT_EQ(treasury.balance(), 92'000);

    // Re-execution rejected (non-reentrancy)
    EXPECT_FALSE(treasury.execute_proposal(proposal_id, 210, disbursed, payout_addr));
}

// 8. Deterministic Economic Simulation Across Participation Regimes
TEST_F(EconomicInfrastructureTest, DeterministicEconomicSimulation) {
    SimulationParameters params;
    params.blocks_per_year = 52'560; // 10-minute blocks
    params.tx_per_block = 50;
    params.avg_fee_per_tx = 2'500; // 0.0025 BUM
    params.active_validators = 25;

    // Simulate 10 years of network operations
    auto results = EconomicSimulator::simulate_trajectory(10, params);
    ASSERT_EQ(results.size(), 10);

    // Year 1: High subsidy emission (50 BUM / block)
    EXPECT_EQ(results[0].year, 1);
    EXPECT_EQ(results[0].subsidy_per_block, 50 * BUM_DECIMALS);
    EXPECT_EQ(results[0].total_subsidy_minted, 52'560ULL * 50 * BUM_DECIMALS);

    // Monotonically increasing circulating supply
    for (size_t i = 1; i < results.size(); ++i) {
        EXPECT_GT(results[i].circulating_supply, results[i - 1].circulating_supply);
        EXPECT_LE(results[i].circulating_supply, MAX_BUM_SUPPLY);
        // Annualized inflation decays over time
        EXPECT_LT(results[i].annualized_inflation_percent, results[i - 1].annualized_inflation_percent);
    }

    // Verify annual fee accumulation and 80/20 split
    uint64_t expected_annual_fees = 52'560ULL * 50 * 2'500;
    EXPECT_EQ(results[0].total_fees_collected, expected_annual_fees);
    EXPECT_EQ(results[0].proposer_fees_distributed, (expected_annual_fees * 8'000) / 10'000);
    EXPECT_EQ(results[0].treasury_fees_accumulated, expected_annual_fees - results[0].proposer_fees_distributed);
}

// 9. Strict State Balance Conservation Invariant Over Complex Economics
TEST_F(EconomicInfrastructureTest, SupplyConservationInvariantUnderMixedEconomics) {
    ledger::AccountLedger ledger;
    std::string val1 = "bb1_val1";
    std::string val2 = "bb1_val2";
    std::string user = "bb1_user";

    // Block 1: Val1 produces block with 5,000 in fees
    EXPECT_TRUE(ledger.credit_block_reward_with_split(val1, 1, 5'000));
    EXPECT_TRUE(ledger.verify_state_invariants());

    // Block 2: Val2 produces block with 12,000 in fees
    EXPECT_TRUE(ledger.credit_block_reward_with_split(val2, 2, 12'000));
    EXPECT_TRUE(ledger.verify_state_invariants());

    // Total supply matches sum of all balances exactly
    EXPECT_EQ(ledger.total_supply(), 100 * BUM_DECIMALS); // 50 + 50 BUM
    EXPECT_LE(ledger.total_supply(), MAX_BUM_SUPPLY);
    EXPECT_TRUE(ledger.verify_state_invariants());
}
