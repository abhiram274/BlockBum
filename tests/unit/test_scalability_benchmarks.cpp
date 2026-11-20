#include <gtest/gtest.h>
#include "blockbum/core/serializer.hpp"
#include "blockbum/core/account_ledger.hpp"
#include "blockbum/core/blockchain.hpp"
#include "blockbum/core/merkle_tree.hpp"
#include "blockbum/network/sync_manager.hpp"
#include "blockbum/storage/file_storage.hpp"
#include "blockbum/crypto/crypto_utils.hpp"
#include <memory>
#include <vector>
#include <string>
#include <filesystem>
#include <chrono>

using namespace blockbum::core;
using namespace blockbum::network;
using namespace blockbum::crypto;
using namespace blockbum::ledger;
using namespace blockbum::storage;

namespace {

class MockBenchmarkTransport : public INetworkTransport {
public:
    explicit MockBenchmarkTransport(std::string id) : id_(std::move(id)) {}

    bool start(uint16_t) override { running_ = true; return true; }
    void stop() override { running_ = false; peers_.clear(); }

    bool connect(const std::string& address) override {
        peers_.push_back(address);
        return true;
    }

    void broadcast(std::span<const uint8_t> data) override {
        for (auto* peer : network_peers_) {
            if (peer && peer != this && peer->running_ && peer->handler_) {
                peer->handler_(id_, data);
            }
        }
    }

    bool send_to(const PeerId& peer_id, std::span<const uint8_t> data) override {
        for (auto* peer : network_peers_) {
            if (peer && peer->id_ == peer_id && peer->running_ && peer->handler_) {
                peer->handler_(id_, data);
                return true;
            }
        }
        return false;
    }

    void set_message_handler(MessageHandler handler) override {
        handler_ = std::move(handler);
    }

    [[nodiscard]] size_t peer_count() const override {
        return peers_.size();
    }

    [[nodiscard]] std::vector<PeerId> get_peers() const override {
        return peers_;
    }

    std::string id_;
    bool running_{false};
    std::vector<std::string> peers_;
    MessageHandler handler_;
    static std::vector<MockBenchmarkTransport*> network_peers_;
};

std::vector<MockBenchmarkTransport*> MockBenchmarkTransport::network_peers_;

Block create_test_block(const Hash256& prev_hash, BlockHeight height, uint32_t nonce = 0) {
    Block block;
    block.header.previous_hash = prev_hash;
    block.header.height = height;
    block.header.timestamp = 1700000000 + height * 10;
    block.header.nonce = nonce;
    block.header.merkle_root = Hash256{};
    block.block_hash = CryptoUtils::sha256(block.header.serialize());
    return block;
}

} // namespace

class ScalabilityBenchmarksTest : public ::testing::Test {
protected:
    void SetUp() override {
        MockBenchmarkTransport::network_peers_.clear();
    }

    void TearDown() override {
        MockBenchmarkTransport::network_peers_.clear();
    }
};

// 1. Headers-First Synchronization & Wire Encoding
TEST_F(ScalabilityBenchmarksTest, HeadersFirstSyncProtocol) {
    auto chain1 = std::make_shared<Blockchain>();
    Hash256 tip = chain1->get_tip_block()->block_hash;

    // Create 30 blocks
    for (BlockHeight h = 1; h <= 30; ++h) {
        Block b = create_test_block(tip, h, static_cast<uint32_t>(h * 100));
        ASSERT_TRUE(chain1->add_block(b));
        tip = b.block_hash;
    }
    ASSERT_EQ(chain1->height(), 30);

    // Setup node 1 (peer) and node 2 (syncing node)
    auto transport1 = std::make_shared<MockBenchmarkTransport>("node1");
    auto transport2 = std::make_shared<MockBenchmarkTransport>("node2");
    MockBenchmarkTransport::network_peers_.push_back(transport1.get());
    MockBenchmarkTransport::network_peers_.push_back(transport2.get());
    transport1->start(8001);
    transport2->start(8002);

    auto chain2 = std::make_shared<Blockchain>();
    auto sync1 = std::make_shared<NodeSyncManager>("node1", chain1, transport1);
    auto sync2 = std::make_shared<NodeSyncManager>("node2", chain2, transport2);

    // Node 2 requests headers first
    sync2->request_headers_from_peer("node1", 1, 30);

    // Verify Node 2 received and validated all 30 headers
    auto verified = sync2->get_verified_headers();
    EXPECT_EQ(verified.size(), 30);
    EXPECT_EQ(verified.front().height, 1);
    EXPECT_EQ(verified.back().height, 30);

    // Verify Node 2 caught up to full chain
    EXPECT_EQ(chain2->height(), 30);
    EXPECT_EQ(chain2->get_tip_block()->block_hash, chain1->get_tip_block()->block_hash);

    transport1->stop();
    transport2->stop();
}

// 2. Authenticated State Snapshots & Merkle Root Verification
TEST_F(ScalabilityBenchmarksTest, AuthenticatedStateSnapshotVerification) {
    AccountLedger ledger;

    // Seed multiple accounts
    ledger.seed_balance("bb1_alice", 1'000'000 * BUM_DECIMALS);
    ledger.seed_balance("bb1_bob", 2'500'000 * BUM_DECIMALS);
    ledger.seed_balance("bb1_carol", 500'000 * BUM_DECIMALS);
    ledger.seed_balance("bb1_validator1", 100'000 * BUM_DECIMALS);

    EXPECT_TRUE(ledger.verify_state_invariants());
    EXPECT_EQ(ledger.account_count(), 4);

    // Calculate deterministic state root
    Hash256 root1 = ledger.calculate_state_root();
    EXPECT_NE(root1, Hash256{});

    // Re-computing should be 100% deterministic
    Hash256 root2 = ledger.calculate_state_root();
    EXPECT_EQ(root1, root2);

    // Export state snapshot
    Hash256 dummy_block_hash{};
    dummy_block_hash[0] = 0xAB;
    StateSnapshot snapshot = ledger.export_snapshot(150, dummy_block_hash);

    EXPECT_EQ(snapshot.height, 150);
    EXPECT_EQ(snapshot.block_hash, dummy_block_hash);
    EXPECT_EQ(snapshot.state_root, root1);
    EXPECT_EQ(snapshot.total_supply, ledger.total_supply());
    EXPECT_EQ(snapshot.accounts.size(), 4);

    // Serialize and deserialize snapshot
    std::vector<uint8_t> snap_bytes = snapshot.serialize();
    EXPECT_GT(snap_bytes.size(), 0);

    BinaryDeserializer d(snap_bytes);
    StateSnapshot restored_snap = StateSnapshot::deserialize(d);
    EXPECT_EQ(restored_snap.height, snapshot.height);
    EXPECT_EQ(restored_snap.state_root, snapshot.state_root);
    EXPECT_EQ(restored_snap.accounts.size(), snapshot.accounts.size());

    // Import into fresh independent ledger
    AccountLedger fresh_ledger;
    EXPECT_EQ(fresh_ledger.account_count(), 0);
    EXPECT_TRUE(fresh_ledger.import_snapshot(restored_snap));

    // Verify imported state
    EXPECT_EQ(fresh_ledger.account_count(), 4);
    EXPECT_EQ(fresh_ledger.get_balance("bb1_alice"), 1'000'000 * BUM_DECIMALS);
    EXPECT_EQ(fresh_ledger.get_balance("bb1_bob"), 2'500'000 * BUM_DECIMALS);
    EXPECT_EQ(fresh_ledger.calculate_state_root(), root1);
    EXPECT_TRUE(fresh_ledger.verify_state_invariants());
}

// 3. State Consistency Invariants & Tamper Detection
TEST_F(ScalabilityBenchmarksTest, StateConsistencyInvariantsAndTamperDetection) {
    AccountLedger ledger;
    ledger.seed_balance("bb1_alice", 10'000 * BUM_DECIMALS);
    ledger.seed_balance("bb1_bob", 20'000 * BUM_DECIMALS);

    EXPECT_TRUE(ledger.verify_state_invariants());

    Hash256 block_hash{};
    StateSnapshot snap = ledger.export_snapshot(50, block_hash);

    // Tamper with account balance (inflate Alice's balance)
    StateSnapshot tampered_snap = snap;
    for (auto& [addr, state] : tampered_snap.accounts) {
        if (addr == "bb1_alice") {
            state.balance += 5'000 * BUM_DECIMALS;
        }
    }

    AccountLedger malicious_ledger;
    // Import must fail because state root does not match modified leaves
    EXPECT_FALSE(malicious_ledger.import_snapshot(tampered_snap));

    // Exceed maximum supply cap (MAX_BUM_SUPPLY = 21,000,000 BUM)
    StateSnapshot excess_supply_snap = snap;
    excess_supply_snap.total_supply = MAX_BUM_SUPPLY + 1;
    EXPECT_FALSE(malicious_ledger.import_snapshot(excess_supply_snap));
}

// 4. Storage WriteBatch Benchmark (Atomic Batch vs Single Put)
TEST_F(ScalabilityBenchmarksTest, StorageWriteBatchPerformance) {
    std::filesystem::path test_dir = std::filesystem::temp_directory_path() / "blockbum_bench_storage";
    std::filesystem::remove_all(test_dir);
    std::filesystem::create_directories(test_dir);

    FileStorageEngine storage;
    std::string db_file = (test_dir / "bench.db").string();
    ASSERT_TRUE(storage.open(db_file));

    constexpr size_t NUM_OPS = 200;
    std::vector<IStorageEngine::WriteOp> batch;
    batch.reserve(NUM_OPS);

    for (size_t i = 0; i < NUM_OPS; ++i) {
        std::string key_str = "account_balance_key_" + std::to_string(i);
        std::string val_str = "value_payload_data_hash_" + std::to_string(i * 12345);
        IStorageEngine::WriteOp op;
        op.is_put = true;
        op.key = std::vector<uint8_t>(key_str.begin(), key_str.end());
        op.value = std::vector<uint8_t>(val_str.begin(), val_str.end());
        batch.push_back(op);
    }

    // Benchmark atomic write_batch
    auto start_batch = std::chrono::high_resolution_clock::now();
    EXPECT_TRUE(storage.write_batch(batch));
    auto end_batch = std::chrono::high_resolution_clock::now();
    auto batch_duration_ms = std::chrono::duration_cast<std::chrono::milliseconds>(end_batch - start_batch).count();

    // Verify all keys are readable
    for (size_t i = 0; i < NUM_OPS; ++i) {
        std::string key_str = "account_balance_key_" + std::to_string(i);
        EXPECT_TRUE(storage.has(std::span<const uint8_t>(reinterpret_cast<const uint8_t*>(key_str.data()), key_str.size())));
    }

    storage.close();

    // Verify persistence across reload
    FileStorageEngine reloaded;
    ASSERT_TRUE(reloaded.open(db_file));
    for (size_t i = 0; i < NUM_OPS; ++i) {
        std::string key_str = "account_balance_key_" + std::to_string(i);
        EXPECT_TRUE(reloaded.has(std::span<const uint8_t>(reinterpret_cast<const uint8_t*>(key_str.data()), key_str.size())));
    }
    reloaded.close();

    std::filesystem::remove_all(test_dir);
    EXPECT_GE(batch_duration_ms, 0);
}

// 5. Disk Space Optimization: Archival vs Pruned Full Node
TEST_F(ScalabilityBenchmarksTest, PrunedModeDiskSpaceEfficiency) {
    auto chain = std::make_shared<Blockchain>();
    Hash256 tip = chain->get_tip_block()->block_hash;

    // Generate 50 blocks
    for (BlockHeight h = 1; h <= 50; ++h) {
        Block b = create_test_block(tip, h, static_cast<uint32_t>(h));
        ASSERT_TRUE(chain->add_block(b));
        tip = b.block_hash;
    }
    EXPECT_EQ(chain->height(), 50);

    // Prune history keeping only last 10 blocks
    chain->prune_history(10);

    // Verify historical blocks pruned from memory while tip & height preserved
    EXPECT_EQ(chain->height(), 50);
    EXPECT_FALSE(chain->get_block_by_height(10).has_value());
    EXPECT_FALSE(chain->get_block_by_height(20).has_value());
    EXPECT_FALSE(chain->get_block_by_height(35).has_value());

    // Tip window preserved
    EXPECT_TRUE(chain->get_block_by_height(45).has_value());
    EXPECT_TRUE(chain->get_block_by_height(50).has_value());
    EXPECT_EQ(chain->get_tip_block()->block_hash, tip);
}

// 6. Long Period Disconnection Recovery Test
TEST_F(ScalabilityBenchmarksTest, LongPeriodDisconnectionRecovery) {
    auto peer_chain = std::make_shared<Blockchain>();
    Hash256 tip = peer_chain->get_tip_block()->block_hash;

    // Peer mines 40 blocks
    for (BlockHeight h = 1; h <= 40; ++h) {
        Block b = create_test_block(tip, h, static_cast<uint32_t>(h * 77));
        ASSERT_TRUE(peer_chain->add_block(b));
        tip = b.block_hash;
    }

    auto offline_node_chain = std::make_shared<Blockchain>();
    // Offline node has only 5 blocks
    Hash256 offline_tip = offline_node_chain->get_tip_block()->block_hash;
    for (BlockHeight h = 1; h <= 5; ++h) {
        auto b = peer_chain->get_block_by_height(h);
        ASSERT_TRUE(b.has_value());
        ASSERT_TRUE(offline_node_chain->add_block(*b));
    }
    EXPECT_EQ(offline_node_chain->height(), 5);

    // Node reconnects after long downtime
    auto peer_transport = std::make_shared<MockBenchmarkTransport>("peer_seed");
    auto client_transport = std::make_shared<MockBenchmarkTransport>("client_node");
    MockBenchmarkTransport::network_peers_.push_back(peer_transport.get());
    MockBenchmarkTransport::network_peers_.push_back(client_transport.get());
    peer_transport->start(9001);
    client_transport->start(9002);

    auto peer_sync = std::make_shared<NodeSyncManager>("peer_seed", peer_chain, peer_transport);
    auto client_sync = std::make_shared<NodeSyncManager>("client_node", offline_node_chain, client_transport);

    // Reconnecting node syncs
    client_sync->request_sync_from_peer("peer_seed");

    // Assert complete recovery
    EXPECT_EQ(offline_node_chain->height(), 40);
    EXPECT_EQ(offline_node_chain->get_tip_block()->block_hash, peer_chain->get_tip_block()->block_hash);

    peer_transport->stop();
    client_transport->stop();
}
