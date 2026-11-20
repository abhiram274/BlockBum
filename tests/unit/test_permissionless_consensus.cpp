#include <gtest/gtest.h>
#include "blockbum/core/blockchain.hpp"
#include "blockbum/core/consensus.hpp"
#include "blockbum/crypto/crypto_utils.hpp"
#include <vector>
#include <memory>
#include <cstdint>
#include <string>
#include <optional>
#include <cstring>

using namespace blockbum::core;
using namespace blockbum::consensus;
using namespace blockbum::crypto;

namespace {
Block create_test_block(BlockHeight height, const Hash256& prev_hash, TimestampMs timestamp) {
    Block b;
    b.header.version = 1;
    b.header.height = height;
    b.header.previous_hash = prev_hash;
    b.header.merkle_root = Hash256{}; // Matches MerkleTree::compute_root({})
    b.header.timestamp = timestamp;
    b.header.nonce = 0;
    return b;
}
} // namespace

class PermissionlessConsensusTest : public ::testing::Test {
protected:
    void SetUp() override {}
};

// =========================================================================
// 1. Proof of Work Mining & Leading-Zero Verification
// =========================================================================
TEST_F(PermissionlessConsensusTest, PoWMiningAndVerification) {
    PoWConsensusEngine pow_engine(6); // 6 leading zero bits for fast unit test
    EXPECT_STREQ(pow_engine.name(), "PoW-Nakamoto");

    auto block = create_test_block(1, CryptoUtils::sha256("genesis"), 1700000000);

    // Mine the block
    bool mined = pow_engine.mine_block(block, 6, 1'000'000);
    EXPECT_TRUE(mined);

    // Verify leading zeros
    uint32_t zeros = PoWConsensusEngine::count_leading_zero_bits(block.block_hash);
    EXPECT_GE(zeros, 6U);

    // Consensus engine validation against parent
    Block parent;
    parent.header.height = 0;
    parent.header.timestamp = 1699999990;
    EXPECT_TRUE(pow_engine.validate_block_consensus(block, parent));

    // Verify work calculation: 2^6 = 64
    uint64_t work = pow_engine.calculate_block_work(block.header);
    EXPECT_EQ(work, 64ULL);
}

TEST_F(PermissionlessConsensusTest, PoWRejectionOnInsufficientDifficulty) {
    PoWConsensusEngine pow_engine(16); // Requires 16 leading zero bits

    auto block = create_test_block(1, CryptoUtils::sha256("parent"), 1700000000);
    block.header.nonce = 42;
    block.block_hash = CryptoUtils::sha256(block.header.serialize());

    if (PoWConsensusEngine::count_leading_zero_bits(block.block_hash) < 16) {
        EXPECT_FALSE(pow_engine.validate_block_consensus(block, std::nullopt));
    }
}

// =========================================================================
// 2. Dynamic Difficulty Adjustment (Retargeting)
// =========================================================================
TEST_F(PermissionlessConsensusTest, DynamicDifficultyRetargeting) {
    // 10s target block time, 10 blocks window
    // Expected window duration = 10 * 10 = 100 seconds
    PoWConsensusEngine engine(8, 10, 10);

    Block window_start;
    window_start.header.height = 1;
    window_start.header.timestamp = 1000;

    // Scenario A: Fast mining (blocks produced in 30s instead of 100s, < half expected)
    Block parent_fast;
    parent_fast.header.height = 10;
    parent_fast.header.timestamp = 1030; // 30s elapsed (< 50s)

    uint32_t increased_diff = engine.calculate_difficulty(parent_fast, window_start);
    EXPECT_EQ(increased_diff, 9U); // Difficulty stepped up from 8 to 9

    // Scenario B: Slow mining (blocks produced in 250s instead of 100s, > double expected)
    Block parent_slow;
    parent_slow.header.height = 10;
    parent_slow.header.timestamp = 1250; // 250s elapsed (> 200s)

    uint32_t decreased_diff = engine.calculate_difficulty(parent_slow, window_start);
    EXPECT_EQ(decreased_diff, 7U); // Difficulty stepped down from 8 to 7

    // Scenario C: On-target mining (blocks produced in 105s, within normal bounds)
    Block parent_normal;
    parent_normal.header.height = 10;
    parent_normal.header.timestamp = 1105; // 105s elapsed (within 50s - 200s)

    uint32_t normal_diff = engine.calculate_difficulty(parent_normal, window_start);
    EXPECT_EQ(normal_diff, 8U); // Retains 8
}

// =========================================================================
// 3. Chain Reorganization & Heaviest Work Fork-Choice
// =========================================================================
TEST_F(PermissionlessConsensusTest, DeterministicForkChoiceAndReorg) {
    Blockchain chain;
    ASSERT_TRUE(chain.initialize());
    EXPECT_EQ(chain.get_height(), 0U);

    auto genesis_opt = chain.get_tip_block();
    ASSERT_TRUE(genesis_opt.has_value());
    const auto& genesis = *genesis_opt;

    PoWConsensusEngine pow_engine(4); // 4 zero bits

    // 1. Chain Branch A (Length 2: 1A -> 2A)
    auto block1A = create_test_block(1, genesis.block_hash, genesis.header.timestamp + 10);
    ASSERT_TRUE(pow_engine.mine_block(block1A, 4));
    EXPECT_TRUE(chain.add_block_with_fork_choice(block1A, pow_engine).accepted);

    auto block2A = create_test_block(2, block1A.block_hash, block1A.header.timestamp + 10);
    ASSERT_TRUE(pow_engine.mine_block(block2A, 4));
    EXPECT_TRUE(chain.add_block_with_fork_choice(block2A, pow_engine).accepted);
    EXPECT_EQ(chain.get_height(), 2U);
    EXPECT_EQ(chain.get_tip_hash(), block2A.block_hash);

    // 2. Competing Branch B (Length 3: 1B -> 2B -> 3B) branching from Genesis
    auto block1B = create_test_block(1, genesis.block_hash, genesis.header.timestamp + 12);
    ASSERT_TRUE(pow_engine.mine_block(block1B, 4));
    // 1B is accepted as side branch (work 1B < work 2A)
    auto res_1b = chain.add_block_with_fork_choice(block1B, pow_engine);
    EXPECT_TRUE(res_1b.accepted);
    EXPECT_FALSE(res_1b.reorganized); // Branch A remains tip
    EXPECT_EQ(chain.get_tip_hash(), block2A.block_hash);

    auto block2B = create_test_block(2, block1B.block_hash, block1B.header.timestamp + 10);
    ASSERT_TRUE(pow_engine.mine_block(block2B, 4));
    // 2B has equal work to 2A, branch A arrived first so remains tip
    auto res_2b = chain.add_block_with_fork_choice(block2B, pow_engine);
    EXPECT_TRUE(res_2b.accepted);

    auto block3B = create_test_block(3, block2B.block_hash, block2B.header.timestamp + 10);
    ASSERT_TRUE(pow_engine.mine_block(block3B, 4));

    // 3B brings Branch B to higher accumulated work!
    // Automatic deterministic reorganization should switch active tip to 3B!
    auto res_3b = chain.add_block_with_fork_choice(block3B, pow_engine);
    EXPECT_TRUE(res_3b.accepted);
    EXPECT_TRUE(res_3b.reorganized);
    EXPECT_EQ(res_3b.old_height, 2U);
    EXPECT_EQ(res_3b.new_height, 3U);
    EXPECT_EQ(chain.get_height(), 3U);
    EXPECT_EQ(chain.get_tip_hash(), block3B.block_hash);

    // Check canonical chain continuity
    auto active_1 = chain.get_block_by_height(1);
    ASSERT_TRUE(active_1.has_value());
    EXPECT_EQ(active_1->block_hash, block1B.block_hash);

    auto active_2 = chain.get_block_by_height(2);
    ASSERT_TRUE(active_2.has_value());
    EXPECT_EQ(active_2->block_hash, block2B.block_hash);
}

// =========================================================================
// 4. Network Partition Simulation (Split-Brain & Healing)
// =========================================================================
TEST_F(PermissionlessConsensusTest, NetworkPartitionSplitBrainAndHealing) {
    // Two isolated node clusters: Node East and Node West
    Blockchain node_east;
    Blockchain node_west;
    ASSERT_TRUE(node_east.initialize());
    ASSERT_TRUE(node_west.initialize());

    auto genesis = *node_east.get_tip_block();
    PoWConsensusEngine pow(4);

    // PARTITION: East cluster (minority hash power) mines 2 blocks
    auto east1 = create_test_block(1, genesis.block_hash, genesis.header.timestamp + 10);
    ASSERT_TRUE(pow.mine_block(east1, 4));
    EXPECT_TRUE(node_east.add_block_with_fork_choice(east1, pow).accepted);

    auto east2 = create_test_block(2, east1.block_hash, east1.header.timestamp + 10);
    ASSERT_TRUE(pow.mine_block(east2, 4));
    EXPECT_TRUE(node_east.add_block_with_fork_choice(east2, pow).accepted);

    // West cluster (majority hash power) mines 4 blocks
    auto west1 = create_test_block(1, genesis.block_hash, genesis.header.timestamp + 8);
    ASSERT_TRUE(pow.mine_block(west1, 4));
    EXPECT_TRUE(node_west.add_block_with_fork_choice(west1, pow).accepted);

    auto west2 = create_test_block(2, west1.block_hash, west1.header.timestamp + 8);
    ASSERT_TRUE(pow.mine_block(west2, 4));
    EXPECT_TRUE(node_west.add_block_with_fork_choice(west2, pow).accepted);

    auto west3 = create_test_block(3, west2.block_hash, west2.header.timestamp + 8);
    ASSERT_TRUE(pow.mine_block(west3, 4));
    EXPECT_TRUE(node_west.add_block_with_fork_choice(west3, pow).accepted);

    auto west4 = create_test_block(4, west3.block_hash, west3.header.timestamp + 8);
    ASSERT_TRUE(pow.mine_block(west4, 4));
    EXPECT_TRUE(node_west.add_block_with_fork_choice(west4, pow).accepted);

    EXPECT_EQ(node_east.get_height(), 2U);
    EXPECT_EQ(node_west.get_height(), 4U);

    // PARTITION HEALS: East receives all blocks from West
    EXPECT_TRUE(node_east.add_block_with_fork_choice(west1, pow).accepted);
    EXPECT_TRUE(node_east.add_block_with_fork_choice(west2, pow).accepted);
    auto res_w3 = node_east.add_block_with_fork_choice(west3, pow);
    EXPECT_TRUE(res_w3.accepted);
    EXPECT_TRUE(res_w3.reorganized); // West becomes heavier (49 > 33) -> Reorg triggers!

    auto res_w4 = node_east.add_block_with_fork_choice(west4, pow);
    EXPECT_TRUE(res_w4.accepted);
    EXPECT_FALSE(res_w4.reorganized); // Extending now-active tip
    EXPECT_EQ(node_east.get_height(), 4U);
    EXPECT_EQ(node_east.get_tip_hash(), node_west.get_tip_hash());
}

// =========================================================================
// 5. Malicious Participant & Sybil Attack Simulation
// =========================================================================
TEST_F(PermissionlessConsensusTest, MaliciousSybilBranchRejection) {
    Blockchain chain;
    ASSERT_TRUE(chain.initialize());
    auto genesis = *chain.get_tip_block();
    PoWConsensusEngine pow(4);

    // Honest chain produces 3 valid blocks
    auto h1 = create_test_block(1, genesis.block_hash, genesis.header.timestamp + 10);
    ASSERT_TRUE(pow.mine_block(h1, 4));
    EXPECT_TRUE(chain.add_block_with_fork_choice(h1, pow).accepted);

    auto h2 = create_test_block(2, h1.block_hash, h1.header.timestamp + 10);
    ASSERT_TRUE(pow.mine_block(h2, 4));
    EXPECT_TRUE(chain.add_block_with_fork_choice(h2, pow).accepted);

    auto h3 = create_test_block(3, h2.block_hash, h2.header.timestamp + 10);
    ASSERT_TRUE(pow.mine_block(h3, 4));
    EXPECT_TRUE(chain.add_block_with_fork_choice(h3, pow).accepted);

    EXPECT_EQ(chain.get_height(), 3U);
    EXPECT_EQ(chain.get_tip_hash(), h3.block_hash);

    // Malicious attacker attempts Sybil attack: generates fake block with low/zero work
    auto sybil_block = create_test_block(1, genesis.block_hash, genesis.header.timestamp + 10);
    sybil_block.header.nonce = 1; // Not mined
    sybil_block.block_hash = CryptoUtils::sha256(sybil_block.header.serialize());

    // Fails PoW verification
    EXPECT_FALSE(pow.validate_block_consensus(sybil_block, genesis));

    // Sybil branch cannot displace honest canonical chain
    EXPECT_EQ(chain.get_height(), 3U);
    EXPECT_EQ(chain.get_tip_hash(), h3.block_hash);
}

// =========================================================================
// 6. DevNet PoA Backward Compatibility
// =========================================================================
TEST_F(PermissionlessConsensusTest, DevNetPoABackwardCompatibility) {
    std::vector<std::string> validators = {"ValAlice", "ValBob", "ValCharlie"};
    PoAConsensusEngine poa(validators);
    EXPECT_STREQ(poa.name(), "PoA-DevNet");

    EXPECT_EQ(poa.get_scheduled_proposer(0), "ValAlice");
    EXPECT_EQ(poa.get_scheduled_proposer(1), "ValBob");
    EXPECT_EQ(poa.get_scheduled_proposer(2), "ValCharlie");
    EXPECT_EQ(poa.get_scheduled_proposer(3), "ValAlice");

    // Valid proposer block
    Block block1;
    block1.header.height = 1;
    Transaction coinbase;
    coinbase.sender = "ValBob"; // Scheduled proposer for height 1
    block1.transactions.push_back(coinbase);
    EXPECT_TRUE(poa.validate_block_consensus(block1, std::nullopt));

    // Malicious out-of-turn proposer
    Block rogue_block;
    rogue_block.header.height = 1;
    Transaction rogue_tx;
    rogue_tx.sender = "ValCharlie"; // Charlie tried to propose out of order!
    rogue_block.transactions.push_back(rogue_tx);
    EXPECT_FALSE(poa.validate_block_consensus(rogue_block, std::nullopt));
}
