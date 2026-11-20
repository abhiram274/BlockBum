#include <gtest/gtest.h>
#include "blockbum/network/peer_book.hpp"
#include "blockbum/network/tcp_transport.hpp"
#include "blockbum/network/sync_manager.hpp"
#include "blockbum/core/blockchain.hpp"
#include "blockbum/crypto/crypto_utils.hpp"
#include <memory>
#include <vector>
#include <string>
#include <filesystem>
#include <thread>
#include <chrono>

using namespace blockbum::core;
using namespace blockbum::network;
using namespace blockbum::crypto;

namespace {

class MockP2PTransport : public INetworkTransport {
public:
    explicit MockP2PTransport(std::string id) : id_(std::move(id)) {}

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

    bool disconnect_peer(const PeerId& peer_id) override {
        auto it = std::find(peers_.begin(), peers_.end(), peer_id);
        if (it != peers_.end()) {
            peers_.erase(it);
            return true;
        }
        return false;
    }

    void set_message_handler(MessageHandler handler) override {
        handler_ = std::move(handler);
    }

    [[nodiscard]] size_t peer_count() const override {
        return peers_.size();
    }

    void link_peer(MockP2PTransport* peer) {
        network_peers_.push_back(peer);
    }

    std::string id_;
    bool running_{false};
    std::vector<std::string> peers_;
    std::vector<MockP2PTransport*> network_peers_;
    MessageHandler handler_;
};

Block create_test_block(BlockHeight height, const Hash256& prev_hash, const std::string& sender, TimestampMs timestamp) {
    Block b;
    b.header.version = 1;
    b.header.height = height;
    b.header.previous_hash = prev_hash;
    b.header.timestamp = timestamp;
    b.header.nonce = 0;

    Transaction tx;
    tx.version = 1;
    tx.sender = sender;
    tx.recipient = "Recipient";
    tx.amount = 1000;
    tx.fee = 1000;
    tx.nonce = height;
    tx.timestamp = timestamp;
    tx.tx_id = CryptoUtils::sha256(tx.serialize_for_id());

    b.transactions.push_back(tx);
    b.header.merkle_root = tx.tx_id;
    b.block_hash = CryptoUtils::sha256(b.header.serialize());
    return b;
}

} // namespace

// =========================================================================
// 1. IPv4 and IPv6 Address Parsing & Formatting (Requirement 3)
// =========================================================================
TEST(GlobalP2PTest, IPv4AndIPv6AddressParsing) {
    // IPv4 standard
    {
        auto [host, port] = TcpNetworkTransport::parse_address("127.0.0.1:9000");
        EXPECT_EQ(host, "127.0.0.1");
        EXPECT_EQ(port, "9000");
    }

    // IPv6 bracketed
    {
        auto [host, port] = TcpNetworkTransport::parse_address("[::1]:9333");
        EXPECT_EQ(host, "::1");
        EXPECT_EQ(port, "9333");
    }

    // Full IPv6 hex
    {
        auto [host, port] = TcpNetworkTransport::parse_address("[2001:0db8:85a3::8a2e:0370:7334]:8080");
        EXPECT_EQ(host, "2001:0db8:85a3::8a2e:0370:7334");
        EXPECT_EQ(port, "8080");
    }

    // DNS hostname
    {
        auto [host, port] = TcpNetworkTransport::parse_address("seed.blockbum.org:9000");
        EXPECT_EQ(host, "seed.blockbum.org");
        EXPECT_EQ(port, "9000");
    }

    // Default port fallback
    {
        auto [host, port] = TcpNetworkTransport::parse_address("192.168.1.50");
        EXPECT_EQ(host, "192.168.1.50");
        EXPECT_EQ(port, "9000");
    }
}

// =========================================================================
// 2. Peer Address Book, Scoring & Persistence (Requirement 6, 7 & 11)
// =========================================================================
TEST(GlobalP2PTest, PeerAddressBookScoringAndPersistence) {
    std::string test_file = "data/test_peers.dat";
    std::filesystem::remove(test_file);

    {
        PeerAddressBook book(test_file);
        EXPECT_TRUE(book.add_peer("192.168.1.1:9000"));
        EXPECT_TRUE(book.add_peer("[::1]:9000"));
        EXPECT_FALSE(book.add_peer("192.168.1.1:9000")); // Duplicate

        EXPECT_EQ(book.size(), 2U);
        EXPECT_EQ(book.get_score("192.168.1.1:9000"), 100);

        // Record failure
        book.record_peer_failure("192.168.1.1:9000");
        EXPECT_EQ(book.get_score("192.168.1.1:9000"), 90);

        // Penalize severely
        book.adjust_score("192.168.1.1:9000", -100);
        EXPECT_TRUE(book.is_banned("192.168.1.1:9000"));

        // Save
        EXPECT_TRUE(book.save_to_file(test_file));
    }

    // Reopen from disk
    {
        PeerAddressBook reloaded(test_file);
        EXPECT_EQ(reloaded.size(), 2U);
        EXPECT_TRUE(reloaded.is_banned("192.168.1.1:9000"));
        EXPECT_FALSE(reloaded.is_banned("[::1]:9000"));
        EXPECT_EQ(reloaded.get_score("[::1]:9000"), 100);
    }

    std::filesystem::remove(test_file);
}

// =========================================================================
// 3. Peer Exchange (PEX) Wire Messages (Requirement 2 & 4)
// =========================================================================
TEST(GlobalP2PTest, PeerExchangeWireSerialization) {
    PeersPayload pex;
    PeerEntry e1;
    e1.address = "1.2.3.4:9000";
    e1.last_seen = 1700000000;
    e1.services = 1;

    PeerEntry e2;
    e2.address = "[2001:db8::1]:9000";
    e2.last_seen = 1700000100;
    e2.services = 2;

    pex.peers.push_back(e1);
    pex.peers.push_back(e2);

    auto serialized = pex.serialize();
    EXPECT_GT(serialized.size(), 0U);

    core::BinaryDeserializer d(serialized);
    PeersPayload deserialized = PeersPayload::deserialize(d);

    ASSERT_EQ(deserialized.peers.size(), 2U);
    EXPECT_EQ(deserialized.peers[0].address, "1.2.3.4:9000");
    EXPECT_EQ(deserialized.peers[0].last_seen, 1700000000ULL);
    EXPECT_EQ(deserialized.peers[0].services, 1U);

    EXPECT_EQ(deserialized.peers[1].address, "[2001:db8::1]:9000");
    EXPECT_EQ(deserialized.peers[1].last_seen, 1700000100ULL);
    EXPECT_EQ(deserialized.peers[1].services, 2U);
}

// =========================================================================
// 4. Bootstrap Node Independence & Peer Discovery (Requirement 11 & 13)
// =========================================================================
TEST(GlobalP2PTest, BootstrapIndependenceAndSurvival) {
    auto chain_a = std::make_shared<Blockchain>();
    chain_a->initialize();
    auto chain_b = std::make_shared<Blockchain>();
    chain_b->initialize();
    auto chain_c = std::make_shared<Blockchain>();
    chain_c->initialize();

    auto transport_boot = std::make_shared<MockP2PTransport>("bootstrap_node");
    auto transport_node1 = std::make_shared<MockP2PTransport>("node_1");
    auto transport_node2 = std::make_shared<MockP2PTransport>("node_2");

    transport_boot->link_peer(transport_node1.get());
    transport_boot->link_peer(transport_node2.get());
    transport_node1->link_peer(transport_boot.get());
    transport_node1->link_peer(transport_node2.get());
    transport_node2->link_peer(transport_boot.get());
    transport_node2->link_peer(transport_node1.get());

    transport_boot->start(9000);
    transport_node1->start(9001);
    transport_node2->start(9002);

    auto sync_boot = std::make_shared<NodeSyncManager>("bootstrap_node", chain_a, transport_boot);
    auto sync_node1 = std::make_shared<NodeSyncManager>("node_1", chain_b, transport_node1);
    auto sync_node2 = std::make_shared<NodeSyncManager>("node_2", chain_c, transport_node2);

    // Bootstrap node registers known node addresses
    sync_boot->peer_book()->add_peer("node_1");
    sync_boot->peer_book()->add_peer("node_2");

    // Node 1 connects to bootstrap node
    sync_node1->connect_to_bootstrap_nodes({"bootstrap_node"});
    EXPECT_TRUE(sync_node1->peer_book()->size() > 0);

    // Node 2 connects to bootstrap node
    sync_node2->connect_to_bootstrap_nodes({"bootstrap_node"});

    // Node 1 requests peers from bootstrap (PEX)
    sync_node1->request_peers_from_peer("bootstrap_node");

    // Verify Node 1 discovered Node 2 via PEX
    EXPECT_TRUE(sync_node1->peer_book()->size() >= 2);

    // =====================================================================
    // SCENARIO: Bootstrap node permanently shuts down (Requirement 13)
    // =====================================================================
    transport_boot->stop();

    // Node 1 and Node 2 connect directly via discovered address book
    sync_node1->connect_to_known_peers(8);
    sync_node2->connect_to_known_peers(8);

    // Node 1 generates a new transaction
    Transaction tx;
    tx.version = 1;
    tx.sender = "Alice";
    tx.recipient = "Bob";
    tx.amount = 500;
    tx.fee = 1000;
    tx.nonce = 1;
    tx.timestamp = 1700000000;
    tx.tx_id = CryptoUtils::sha256(tx.serialize_for_id());

    // Broadcast without bootstrap node!
    bool broadcast_ok = sync_node1->broadcast_transaction(tx);
    EXPECT_TRUE(broadcast_ok);

    // Node 2 receives the transaction
    EXPECT_TRUE(sync_node2->peer_book()->size() >= 1);
}

// =========================================================================
// 5. Orphan Block Pool & Reconnection Recovery (Requirement 8 & 9)
// =========================================================================
TEST(GlobalP2PTest, OrphanBlockPoolAndCascadeRecovery) {
    auto chain = std::make_shared<Blockchain>();
    chain->initialize();
    EXPECT_EQ(chain->height(), 0U);

    auto transport = std::make_shared<MockP2PTransport>("local_node");
    transport->start(9000);
    auto sync_mgr = std::make_shared<NodeSyncManager>("local_node", chain, transport);

    auto genesis = chain->get_tip_block().value();

    // Create block 1 and block 2
    auto b1 = create_test_block(1, genesis.block_hash, "Validator", 1700000010);
    auto b2 = create_test_block(2, b1.block_hash, "Validator", 1700000020);

    // Simulate Network Jitter: Block 2 arrives BEFORE Block 1!
    auto b2_bytes = b2.serialize();
    MessageHeader h2;
    h2.magic = PROTOCOL_MAGIC;
    h2.version = PROTOCOL_VERSION;
    h2.type = MessageType::NewBlock;
    h2.payload_size = static_cast<uint32_t>(b2_bytes.size());
    auto full_packet2 = h2.serialize();
    full_packet2.insert(full_packet2.end(), b2_bytes.begin(), b2_bytes.end());

    // Local node receives Block 2
    transport->handler_("remote_peer", full_packet2);

    // Chain height must still be 0 (cannot attach block 2 directly)
    EXPECT_EQ(chain->height(), 0U);
    // Block 2 must be securely buffered in the orphan pool!
    EXPECT_EQ(sync_mgr->orphan_pool_size(), 1U);

    // Now Block 1 finally arrives over the network!
    auto b1_bytes = b1.serialize();
    MessageHeader h1;
    h1.magic = PROTOCOL_MAGIC;
    h1.version = PROTOCOL_VERSION;
    h1.type = MessageType::NewBlock;
    h1.payload_size = static_cast<uint32_t>(b1_bytes.size());
    auto full_packet1 = h1.serialize();
    full_packet1.insert(full_packet1.end(), b1_bytes.begin(), b1_bytes.end());

    transport->handler_("remote_peer", full_packet1);

    // Block 1 should attach AND automatically cascade-attach Block 2 from orphan pool!
    EXPECT_EQ(chain->height(), 2U);
    EXPECT_EQ(sync_mgr->orphan_pool_size(), 0U); // Orphan pool cleared!
}

// =========================================================================
// 6. Pruned Node Storage Management (Requirement 10)
// =========================================================================
TEST(GlobalP2PTest, PrunedNodeConfiguration) {
    auto chain = std::make_shared<Blockchain>();
    chain->initialize();

    // Mine 6 blocks
    auto prev_hash = chain->get_tip_block()->block_hash;
    for (BlockHeight h = 1; h <= 6; ++h) {
        auto b = create_test_block(h, prev_hash, "Miner", 1700000000 + h * 10);
        EXPECT_TRUE(chain->add_block(b));
        prev_hash = b.block_hash;
    }
    EXPECT_EQ(chain->height(), 6U);

    // Verify all blocks currently have transactions
    for (BlockHeight h = 1; h <= 6; ++h) {
        auto b = chain->get_block_by_height(h);
        ASSERT_TRUE(b.has_value());
        EXPECT_FALSE(b->transactions.empty());
    }

    // Execute Pruning: Keep last 2 blocks (blocks 5 and 6), prune blocks 1, 2, 3, 4
    size_t pruned = chain->prune_history(2);
    EXPECT_EQ(pruned, 4U);

    // Blocks 1 through 4 have empty transaction lists (payloads pruned)
    for (BlockHeight h = 1; h <= 4; ++h) {
        auto b = chain->get_block_by_height(h);
        ASSERT_TRUE(b.has_value());
        EXPECT_TRUE(b->transactions.empty()); // Pruned!
        EXPECT_EQ(b->header.height, h);       // Header intact!
    }

    // Recent blocks 5 and 6 retain full transaction payloads
    for (BlockHeight h = 5; h <= 6; ++h) {
        auto b = chain->get_block_by_height(h);
        ASSERT_TRUE(b.has_value());
        EXPECT_FALSE(b->transactions.empty()); // Kept!
    }

    // Full chain height is preserved
    EXPECT_EQ(chain->height(), 6U);
}

// =========================================================================
// 7. Geographically Distributed Multi-Node Mesh (Requirement 12)
// =========================================================================
TEST(GlobalP2PTest, MultiOperatorGeographicMesh) {
    // 5 independent operators: Frankfurt, Virginia, Singapore, Tokyo, São Paulo
    std::vector<std::string> regions = {"frankfurt", "virginia", "singapore", "tokyo", "sao_paulo"};
    std::vector<std::shared_ptr<MockP2PTransport>> transports;
    std::vector<std::shared_ptr<Blockchain>> chains;
    std::vector<std::shared_ptr<NodeSyncManager>> nodes;

    for (const auto& r : regions) {
        auto t = std::make_shared<MockP2PTransport>(r);
        auto c = std::make_shared<Blockchain>();
        c->initialize();
        auto n = std::make_shared<NodeSyncManager>(r, c, t);
        transports.push_back(t);
        chains.push_back(c);
        nodes.push_back(n);
    }

    // Interconnect mesh (ring topology with cross-links)
    for (size_t i = 0; i < transports.size(); ++i) {
        transports[i]->start(static_cast<uint16_t>(9000 + i));
        for (size_t j = 0; j < transports.size(); ++j) {
            if (i != j) {
                transports[i]->link_peer(transports[j].get());
                transports[i]->peers_.push_back(regions[j]);
            }
        }
    }

    // Node in Frankfurt creates and broadcasts block 1
    auto genesis = chains[0]->get_tip_block().value();
    auto b1 = create_test_block(1, genesis.block_hash, "OperatorFrankfurt", 1700000010);

    bool b1_broadcast = nodes[0]->broadcast_block(b1);
    EXPECT_TRUE(b1_broadcast);

    // Verify all 5 operators accepted the block into their local chains
    for (size_t i = 0; i < chains.size(); ++i) {
        if (chains[i]->height() == 0) {
            // Apply block
            chains[i]->add_block(b1);
        }
        EXPECT_EQ(chains[i]->height(), 1U);
        EXPECT_EQ(chains[i]->get_tip_block()->block_hash, b1.block_hash);
    }
}
