#include <gtest/gtest.h>
#include "blockbum/network/tcp_transport.hpp"
#include "blockbum/network/sync_manager.hpp"
#include "blockbum/storage/file_storage.hpp"
#include "blockbum/core/blockchain.hpp"
#include <filesystem>
#include <thread>
#include <chrono>

using namespace blockbum;

class MultiNodeNetworkTest : public ::testing::Test {
protected:
    void SetUp() override {
        base_test_path_ = std::filesystem::temp_directory_path() / "blockbum_p2p_tests";
        std::filesystem::remove_all(base_test_path_);
    }

    void TearDown() override {
        std::filesystem::remove_all(base_test_path_);
    }

    struct TestNode {
        std::string id;
        uint16_t port;
        std::shared_ptr<storage::FileStorageEngine> storage;
        std::shared_ptr<core::Blockchain> chain;
        std::shared_ptr<network::TcpNetworkTransport> transport;
        std::shared_ptr<network::NodeSyncManager> sync_mgr;

        void stop() {
            if (transport) transport->stop();
            if (storage) storage->close();
        }
    };

    TestNode create_node(const std::string& id, uint16_t port) {
        TestNode node;
        node.id = id;
        node.port = port;

        auto node_dir = base_test_path_ / id;
        node.storage = std::make_shared<storage::FileStorageEngine>();
        node.storage->open(node_dir.string());

        node.chain = std::make_shared<core::Blockchain>(node.storage);
        node.chain->initialize();

        node.transport = std::make_shared<network::TcpNetworkTransport>();
        node.transport->start(port);

        node.sync_mgr = std::make_shared<network::NodeSyncManager>(id, node.chain, node.transport);
        return node;
    }

    std::filesystem::path base_test_path_;
};

TEST_F(MultiNodeNetworkTest, ThreeNodesSynchronizeAndConverge) {
    // 1. Spin up 3 independent local nodes on distinct ports
    TestNode node1 = create_node("node1", 19501);
    TestNode node2 = create_node("node2", 19502);
    TestNode node3 = create_node("node3", 19503);

    // Initial state: all at genesis height 0
    EXPECT_EQ(node1.chain->height(), 0);
    EXPECT_EQ(node2.chain->height(), 0);
    EXPECT_EQ(node3.chain->height(), 0);

    // 2. Connect Node 2 and Node 3 to Node 1 (bootstrap node)
    node2.sync_mgr->connect_to_bootstrap_nodes({"127.0.0.1:19501"});
    node3.sync_mgr->connect_to_bootstrap_nodes({"127.0.0.1:19501"});

    std::this_thread::sleep_for(std::chrono::milliseconds(200));

    // Verify peers are registered
    EXPECT_GE(node1.transport->peer_count(), 2);
    EXPECT_GE(node2.transport->peer_count(), 1);
    EXPECT_GE(node3.transport->peer_count(), 1);

    // 3. Node 1 mines blocks 1 and 2
    core::Transaction tx1;
    tx1.version = 1;
    tx1.sender = "node1";
    tx1.recipient = "node2";
    tx1.amount = 100;
    auto b1 = node1.chain->create_next_block({tx1});
    ASSERT_TRUE(node1.chain->add_block(b1));
    node1.sync_mgr->broadcast_block(b1);

    core::Transaction tx2;
    tx2.version = 1;
    tx2.sender = "node1";
    tx2.recipient = "node3";
    tx2.amount = 200;
    auto b2 = node1.chain->create_next_block({tx2});
    ASSERT_TRUE(node1.chain->add_block(b2));
    node1.sync_mgr->broadcast_block(b2);

    EXPECT_EQ(node1.chain->height(), 2);

    // 4. Wait for propagation & sync across the network
    std::this_thread::sleep_for(std::chrono::milliseconds(500));

    // 5. Verify all 3 nodes have converged to the identical chain height and tip block hash
    EXPECT_EQ(node2.chain->height(), 2);
    EXPECT_EQ(node3.chain->height(), 2);

    auto tip1 = node1.chain->get_tip_block();
    auto tip2 = node2.chain->get_tip_block();
    auto tip3 = node3.chain->get_tip_block();

    ASSERT_TRUE(tip1.has_value());
    ASSERT_TRUE(tip2.has_value());
    ASSERT_TRUE(tip3.has_value());

    EXPECT_EQ(tip1->block_hash, tip2->block_hash);
    EXPECT_EQ(tip1->block_hash, tip3->block_hash);

    // 6. Resilience test: Node 2 disconnects and stops
    node2.stop();
    std::this_thread::sleep_for(std::chrono::milliseconds(200));

    // Network continues between Node 1 and Node 3: Node 3 produces block 3
    core::Transaction tx3;
    tx3.sender = "node3";
    tx3.recipient = "node1";
    tx3.amount = 50;
    auto b3 = node3.chain->create_next_block({tx3});
    ASSERT_TRUE(node3.chain->add_block(b3));
    node3.sync_mgr->broadcast_block(b3);

    std::this_thread::sleep_for(std::chrono::milliseconds(400));

    EXPECT_EQ(node3.chain->height(), 3);
    EXPECT_EQ(node1.chain->height(), 3);
    EXPECT_EQ(node1.chain->get_tip_block()->block_hash, node3.chain->get_tip_block()->block_hash);

    // 7. Node Recovery Test: Node 2 rejoins the network after disconnection
    // Spin Node 2 back up from its persistent storage on disk
    TestNode recovered_node2 = create_node("node2", 19504);
    // Connect to Node 1 (bootstrap) and request sync
    recovered_node2.sync_mgr->connect_to_bootstrap_nodes({"127.0.0.1:19501"});
    std::this_thread::sleep_for(std::chrono::milliseconds(500));

    // Verify Node 2 recovered and caught up to tip height 3
    EXPECT_EQ(recovered_node2.chain->height(), 3);
    auto tip_recovered = recovered_node2.chain->get_tip_block();
    ASSERT_TRUE(tip_recovered.has_value());
    EXPECT_EQ(tip_recovered->block_hash, node1.chain->get_tip_block()->block_hash);

    // Clean up
    recovered_node2.stop();
    node1.stop();
    node3.stop();
}
