#include <gtest/gtest.h>
#include "blockbum/messaging/types.hpp"
#include "blockbum/messaging/double_ratchet.hpp"
#include "blockbum/messaging/group_manager.hpp"
#include "blockbum/messaging/relay_mailbox.hpp"
#include "blockbum/messaging/device_manager.hpp"
#include "blockbum/messaging/messaging_service.hpp"
#include "blockbum/content/types.hpp"
#include "blockbum/content/content_store.hpp"
#include "blockbum/content/content_manager.hpp"
#include "blockbum/content/resumable_transfer.hpp"
#include "blockbum/content/storage_network.hpp"
#include "blockbum/crypto/wallet.hpp"
#include "blockbum/crypto/standard_crypto.hpp"
#include "blockbum/crypto/crypto_utils.hpp"
#include <memory>
#include <vector>
#include <string>
#include <filesystem>

using namespace blockbum::core;
using namespace blockbum::messaging;
using namespace blockbum::content;
using namespace blockbum::crypto;

namespace {

crypto::Identity create_test_identity(uint8_t seed_byte) {
    std::array<uint8_t, 32> seed{};
    seed.fill(seed_byte);
    return crypto::Identity::from_seed(seed);
}

} // namespace

class MessagingStorageInfrastructureTest : public ::testing::Test {
protected:
    void SetUp() override {
        crypto_engine_ = std::make_shared<crypto::StandardCryptoEngine>();
    }

    std::shared_ptr<crypto::StandardCryptoEngine> crypto_engine_;
};

// 1. Double Ratchet Protocol: Forward Secrecy & Post-Compromise Security
TEST_F(MessagingStorageInfrastructureTest, DoubleRatchetForwardSecrecyAndPostCompromise) {
    Hash256 shared_master{};
    shared_master.fill(0x5A);

    std::array<uint8_t, 32> bob_dh_sec{}, bob_dh_pub{};
    DoubleRatchetSession::generate_x25519_keypair(bob_dh_sec, bob_dh_pub);

    // Initialize Alice (initiator) and Bob (receiver)
    auto alice_session = DoubleRatchetSession::init_initiator(shared_master, bob_dh_pub);
    auto bob_session = DoubleRatchetSession::init_receiver(shared_master, bob_dh_sec, bob_dh_pub);

    // Alice sends message 1 to Bob
    std::string msg1_text = "Message 1 from Alice";
    auto msg1 = alice_session.encrypt(std::span<const uint8_t>(reinterpret_cast<const uint8_t*>(msg1_text.data()), msg1_text.size()));
    auto pt1_bytes = bob_session.decrypt(msg1);
    std::string pt1(pt1_bytes.begin(), pt1_bytes.end());
    EXPECT_EQ(pt1, msg1_text);

    // Alice sends message 2 to Bob (forward ratchet advance)
    std::string msg2_text = "Message 2 from Alice";
    auto msg2 = alice_session.encrypt(std::span<const uint8_t>(reinterpret_cast<const uint8_t*>(msg2_text.data()), msg2_text.size()));
    auto pt2_bytes = bob_session.decrypt(msg2);
    std::string pt2(pt2_bytes.begin(), pt2_bytes.end());
    EXPECT_EQ(pt2, msg2_text);

    // Bob replies to Alice -> triggers DH Ratchet Step (Post-Compromise Security healing!)
    std::string bob_reply_text = "Reply from Bob with fresh DH key";
    auto bob_reply = bob_session.encrypt(std::span<const uint8_t>(reinterpret_cast<const uint8_t*>(bob_reply_text.data()), bob_reply_text.size()));

    // Alice receives Bob's reply and performs DH ratchet step
    auto alice_pt_reply_bytes = alice_session.decrypt(bob_reply);
    std::string alice_pt_reply(alice_pt_reply_bytes.begin(), alice_pt_reply_bytes.end());
    EXPECT_EQ(alice_pt_reply, bob_reply_text);

    // Alice replies back to Bob under the new healed DH ratchet state
    std::string alice_ack = "Alice ack after DH ratchet step";
    auto msg3 = alice_session.encrypt(std::span<const uint8_t>(reinterpret_cast<const uint8_t*>(alice_ack.data()), alice_ack.size()));
    auto pt3_bytes = bob_session.decrypt(msg3);
    std::string pt3(pt3_bytes.begin(), pt3_bytes.end());
    EXPECT_EQ(pt3, alice_ack);
}

// 2. Double Ratchet: Out-of-Order Message Delivery via Skipped Keys
TEST_F(MessagingStorageInfrastructureTest, DoubleRatchetOutOfOrderDelivery) {
    Hash256 shared_master{};
    shared_master.fill(0x7C);

    std::array<uint8_t, 32> bob_dh_sec{}, bob_dh_pub{};
    DoubleRatchetSession::generate_x25519_keypair(bob_dh_sec, bob_dh_pub);

    auto alice_session = DoubleRatchetSession::init_initiator(shared_master, bob_dh_pub);
    auto bob_session = DoubleRatchetSession::init_receiver(shared_master, bob_dh_sec, bob_dh_pub);

    std::string m0_text = "Packet 0";
    std::string m1_text = "Packet 1";
    std::string m2_text = "Packet 2";

    auto pkt0 = alice_session.encrypt(std::span<const uint8_t>(reinterpret_cast<const uint8_t*>(m0_text.data()), m0_text.size()));
    auto pkt1 = alice_session.encrypt(std::span<const uint8_t>(reinterpret_cast<const uint8_t*>(m1_text.data()), m1_text.size()));
    auto pkt2 = alice_session.encrypt(std::span<const uint8_t>(reinterpret_cast<const uint8_t*>(m2_text.data()), m2_text.size()));

    // Deliver pkt0
    auto dec0 = bob_session.decrypt(pkt0);
    EXPECT_EQ(std::string(dec0.begin(), dec0.end()), m0_text);

    // Deliver pkt2 (skip pkt1: pkt1 becomes a skipped message key)
    auto dec2 = bob_session.decrypt(pkt2);
    EXPECT_EQ(std::string(dec2.begin(), dec2.end()), m2_text);

    // Deliver pkt1 later
    auto dec1 = bob_session.decrypt(pkt1);
    EXPECT_EQ(std::string(dec1.begin(), dec1.end()), m1_text);
}

// 3. Group Forward & Backward Secrecy on Membership Changes
TEST_F(MessagingStorageInfrastructureTest, GroupSecrecyOnMembershipChanges) {
    GroupManager group_mgr;
    Hash256 initial_key{};
    initial_key.fill(0x11);

    auto group = group_mgr.create_group("grp_dev", "Developers", "bb1_alice", initial_key);
    EXPECT_EQ(group.key_epoch, 1);

    // Add Bob -> key rotates to Epoch 2
    EXPECT_TRUE(group_mgr.add_member("grp_dev", "bb1_alice", "bb1_bob"));
    EXPECT_EQ(group_mgr.get_key_epoch("grp_dev"), 2);

    // Bob can access Epoch 2 key
    auto bob_ep2 = group_mgr.get_group_key_for_epoch("grp_dev", "bb1_bob", 2);
    ASSERT_TRUE(bob_ep2.has_value());

    // Backward Secrecy: Bob CANNOT access Epoch 1 key (before Bob joined)
    auto bob_ep1 = group_mgr.get_group_key_for_epoch("grp_dev", "bb1_bob", 1);
    EXPECT_FALSE(bob_ep1.has_value());

    // Alice adds Carol -> key rotates to Epoch 3
    EXPECT_TRUE(group_mgr.add_member("grp_dev", "bb1_alice", "bb1_carol"));
    EXPECT_EQ(group_mgr.get_key_epoch("grp_dev"), 3);

    // Carol CANNOT access Epoch 1 or Epoch 2 keys
    EXPECT_FALSE(group_mgr.get_group_key_for_epoch("grp_dev", "bb1_carol", 1).has_value());
    EXPECT_FALSE(group_mgr.get_group_key_for_epoch("grp_dev", "bb1_carol", 2).has_value());
    EXPECT_TRUE(group_mgr.get_group_key_for_epoch("grp_dev", "bb1_carol", 3).has_value());

    // Remove Bob -> key rotates to Epoch 4
    EXPECT_TRUE(group_mgr.remove_member("grp_dev", "bb1_alice", "bb1_bob"));
    EXPECT_EQ(group_mgr.get_key_epoch("grp_dev"), 4);

    // Forward Secrecy: Bob CANNOT access Epoch 4 key or active current key
    EXPECT_FALSE(group_mgr.get_group_key("grp_dev", "bb1_bob").has_value());
    EXPECT_FALSE(group_mgr.get_group_key_for_epoch("grp_dev", "bb1_bob", 4).has_value());

    // Alice and Carol CAN access Epoch 4 key
    EXPECT_TRUE(group_mgr.get_group_key("grp_dev", "bb1_alice").has_value());
    EXPECT_TRUE(group_mgr.get_group_key("grp_dev", "bb1_carol").has_value());
}

// 4. Offline Relay Mailbox: TTL Expiration, Quota Eviction & Blinded Routing
TEST_F(MessagingStorageInfrastructureTest, OfflineRelayMailboxTTLAndBlindedRouting) {
    OfflineRelayMailbox relay(3600, 3); // 1 hour TTL, max 3 messages per mailbox

    SecureMessage msg1;
    msg1.message_id = "msg1";
    msg1.recipient_address = "bb1_bob";
    msg1.ciphertext = {1, 2, 3};

    SecureMessage msg2;
    msg2.message_id = "msg2";
    msg2.recipient_address = "bb1_bob";
    msg2.ciphertext = {4, 5, 6};

    // Deposit messages with timestamp 1000 and TTL 100 seconds
    relay.deposit(msg1, 1000, 100);
    relay.deposit(msg2, 1000, 100);
    EXPECT_EQ(relay.pending_count("bb1_bob", 1050), 2);

    // After expiration at timestamp 1200
    EXPECT_EQ(relay.pending_count("bb1_bob", 1200), 0);
    auto drained_expired = relay.fetch_and_drain("bb1_bob", 1200);
    EXPECT_TRUE(drained_expired.empty());

    // Test Quota Eviction (max 3 messages)
    for (int i = 0; i < 5; ++i) {
        SecureMessage m;
        m.message_id = "quota_msg_" + std::to_string(i);
        m.recipient_address = "bb1_carol";
        relay.deposit(m, 2000, 5000);
    }
    EXPECT_EQ(relay.pending_count("bb1_carol", 2000), 3); // Capped at max 3

    // Test Blinded Routing (metadata minimization)
    std::string blind_token = "blind_token_xyz_8849";
    std::vector<uint8_t> opaque_payload = {0xAA, 0xBB, 0xCC, 0xDD};
    relay.deposit_blinded(blind_token, opaque_payload, 3000, 300);
    auto blinded_drained = relay.fetch_and_drain_blinded(blind_token, 3050);
    ASSERT_EQ(blinded_drained.size(), 1);
    EXPECT_EQ(blinded_drained[0], opaque_payload);
}

// 5. Multi-Device Identity Authorization and Management
TEST_F(MessagingStorageInfrastructureTest, MultiDeviceIdentityManagement) {
    MultiDeviceManager dev_mgr;
    auto alice = create_test_identity(1);

    // Alice creates Laptop device
    auto laptop = create_test_identity(2);
    std::array<uint8_t, 32> laptop_dh_sec{}, laptop_dh_pub{};
    DoubleRatchetSession::generate_x25519_keypair(laptop_dh_sec, laptop_dh_pub);

    DeviceRecord laptop_rec;
    laptop_rec.primary_address = alice.address();
    laptop_rec.device_id = "alice_laptop";
    laptop_rec.device_pubkey = laptop.public_key();
    laptop_rec.device_dh_pubkey = laptop_dh_pub;
    laptop_rec.registered_at = 1700000000;

    auto auth_bytes = laptop_rec.serialize_for_auth();
    auto auth_sig = alice.sign(auth_bytes, *crypto_engine_);

    // Register laptop
    EXPECT_TRUE(dev_mgr.register_device(alice.address(), "alice_laptop", laptop.public_key(),
                                        laptop_dh_pub, auth_sig, alice.public_key(), *crypto_engine_, 1700000000));

    EXPECT_TRUE(dev_mgr.is_device_active(alice.address(), "alice_laptop"));
    auto devices = dev_mgr.get_active_devices(alice.address());
    EXPECT_EQ(devices.size(), 1);

    // Revoke laptop
    std::string revoke_tag = "BLOCKBUM_DEVICE_REVOKE:" + alice.address() + ":alice_laptop";
    std::span<const uint8_t> rev_span(reinterpret_cast<const uint8_t*>(revoke_tag.data()), revoke_tag.size());
    auto rev_sig = alice.sign(rev_span, *crypto_engine_);

    EXPECT_TRUE(dev_mgr.revoke_device(alice.address(), "alice_laptop", rev_sig, alice.public_key(), *crypto_engine_));
    EXPECT_FALSE(dev_mgr.is_device_active(alice.address(), "alice_laptop"));
    EXPECT_EQ(dev_mgr.get_active_devices(alice.address()).size(), 0);
}

// 6. Resumable Large-File Downloads & Corrupted Chunk Detection
TEST_F(MessagingStorageInfrastructureTest, ResumableDownloadsAndCorruptedChunkDetection) {
    ContentManifest manifest;
    manifest.file_name = "test_large.bin";
    manifest.original_file_size = 3000;
    manifest.chunk_size = 1000;

    std::vector<std::vector<uint8_t>> chunk_data(3);
    for (size_t i = 0; i < 3; ++i) {
        chunk_data[i].resize(1000, static_cast<uint8_t>(i + 1));
        manifest.chunk_cids.push_back("cid_" + std::to_string(i));
        manifest.chunk_hashes.push_back(crypto::CryptoUtils::sha256(chunk_data[i]));
    }

    ResumableDownloadSession session(manifest);
    EXPECT_EQ(session.total_chunks(), 3);
    EXPECT_FALSE(session.is_complete());

    // Ingest chunk 0
    EXPECT_TRUE(session.ingest_chunk(0, chunk_data[0]));
    EXPECT_EQ(session.completed_chunks(), 1);

    // Ingest corrupted chunk 1 (tampered byte)
    auto corrupted_chunk = chunk_data[1];
    corrupted_chunk[0] ^= 0xFF;
    EXPECT_FALSE(session.ingest_chunk(1, corrupted_chunk));
    EXPECT_EQ(session.corrupted_retries(), 1);

    auto missing = session.get_missing_chunks();
    EXPECT_EQ(missing.size(), 2); // Chunks 1 and 2 still missing

    // Re-ingest valid chunk 1
    EXPECT_TRUE(session.ingest_chunk(1, chunk_data[1]));
    // Ingest valid chunk 2
    EXPECT_TRUE(session.ingest_chunk(2, chunk_data[2]));

    EXPECT_TRUE(session.is_complete());
    EXPECT_EQ(session.progress_percentage(), 100.0);

    auto assembled = session.assemble_payload();
    ASSERT_TRUE(assembled.has_value());
    EXPECT_EQ(assembled->size(), 3000);
}

// 7. Decentralized Storage: Proof-of-Retrievability & Provider Reputation
TEST_F(MessagingStorageInfrastructureTest, StorageProofAndReputationScoring) {
    auto store = std::make_shared<ContentStore>();
    StorageNetworkManager net_mgr(store);

    std::string provider = "provider_node_1";
    net_mgr.register_provider(provider);

    auto initial_stats = net_mgr.get_provider_stats(provider);
    ASSERT_TRUE(initial_stats.has_value());
    EXPECT_EQ(initial_stats->reputation_score, 100);

    std::vector<uint8_t> chunk_payload(2048, 0x42);
    std::string cid = "cid_sha256_chunk42";

    // Pin chunk
    EXPECT_TRUE(net_mgr.pin_chunk(cid, provider, "bb1_alice", chunk_payload.size()));
    EXPECT_TRUE(net_mgr.is_chunk_pinned(cid));

    // Generate availability challenge
    auto challenge = net_mgr.generate_challenge(cid, provider, 1700000000);
    EXPECT_EQ(challenge.provider_id, provider);

    // Provider computes valid proof
    auto valid_proof = StorageNetworkManager::compute_proof(challenge, chunk_payload);

    // Verifier confirms proof -> reputation increases to 105
    EXPECT_TRUE(net_mgr.verify_and_score_proof(valid_proof, chunk_payload));
    auto stats1 = net_mgr.get_provider_stats(provider);
    EXPECT_EQ(stats1->reputation_score, 105);
    EXPECT_EQ(stats1->successful_challenges, 1);

    // Generate second challenge
    auto ch2 = net_mgr.generate_challenge(cid, provider, 1700000100);
    // Malicious/corrupted provider submits invalid proof
    StorageProof fake_proof;
    fake_proof.challenge_id = ch2.challenge_id;
    fake_proof.chunk_cid = cid;
    fake_proof.proof_hash.fill(0xEE);

    EXPECT_FALSE(net_mgr.verify_and_score_proof(fake_proof, chunk_payload));
    auto stats2 = net_mgr.get_provider_stats(provider);
    EXPECT_EQ(stats2->failed_challenges, 1);
    EXPECT_EQ(stats2->reputation_score, 75); // 105 - 30 = 75
    EXPECT_FALSE(stats2->is_quarantined);

    // Additional failures trigger quarantine
    auto ch3 = net_mgr.generate_challenge(cid, provider, 1700000200);
    EXPECT_FALSE(net_mgr.verify_and_score_proof(fake_proof, chunk_payload));
    auto ch4 = net_mgr.generate_challenge(cid, provider, 1700000300);
    EXPECT_FALSE(net_mgr.verify_and_score_proof(fake_proof, chunk_payload));

    auto quarantined_stats = net_mgr.get_provider_stats(provider);
    EXPECT_TRUE(quarantined_stats->is_quarantined);
}

// 8. Storage Lease Expiration & Uploader Quota Protection
TEST_F(MessagingStorageInfrastructureTest, StorageLeaseExpirationAndQuotaProtection) {
    auto store = std::make_shared<ContentStore>();
    StorageNetworkManager net_mgr(store);

    net_mgr.register_provider("provider_A");

    // Pin chunk with 200 second lease
    EXPECT_TRUE(net_mgr.pin_chunk("chunk_1", "provider_A", "bb1_alice", 1000, 1000, 200));
    EXPECT_EQ(net_mgr.get_uploader_usage("bb1_alice"), 1000);

    // Evict before expiration -> 0 evicted
    EXPECT_EQ(net_mgr.evict_expired_leases(1100), 0);

    // Evict after expiration at 1300 -> 1 evicted, quota returned
    EXPECT_EQ(net_mgr.evict_expired_leases(1300), 1);
    EXPECT_FALSE(net_mgr.is_chunk_pinned("chunk_1"));
    EXPECT_EQ(net_mgr.get_uploader_usage("bb1_alice"), 0);

    // DoS Protection: Chunk exceeding max size (2 MB limit) is rejected
    EXPECT_FALSE(net_mgr.pin_chunk("huge_chunk", "provider_A", "bb1_alice", 3 * 1024 * 1024));
}
