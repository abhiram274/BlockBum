#include <gtest/gtest.h>
#include "blockbum/messaging/messaging_service.hpp"
#include "blockbum/messaging/group_manager.hpp"
#include "blockbum/messaging/history_store.hpp"
#include "blockbum/messaging/relay_mailbox.hpp"
#include "blockbum/crypto/standard_crypto.hpp"
#include "blockbum/crypto/wallet.hpp"
#include <filesystem>

using namespace blockbum;

class MessagingSubsystemTest : public ::testing::Test {
protected:
    void SetUp() override {
        test_dir_ = std::filesystem::temp_directory_path() / "blockbum_msg_test";
        std::filesystem::remove_all(test_dir_);
        crypto_ = std::make_shared<crypto::StandardCryptoEngine>();
        relay_ = std::make_shared<messaging::OfflineRelayMailbox>();
    }

    void TearDown() override {
        std::filesystem::remove_all(test_dir_);
    }

    messaging::MessagingService create_service(const std::string& alias) {
        crypto::Wallet wallet(test_dir_ / ("wallet_" + alias), crypto_);
        auto id = wallet.create_identity(alias);

        auto storage_key = crypto_->hash256(std::span<const uint8_t>(id.secret_key().data(), 32));
        auto hist = std::make_shared<messaging::EncryptedHistoryStore>(
            test_dir_ / ("history_" + alias + ".db"), storage_key);

        return messaging::MessagingService(id, crypto_, hist, relay_);
    }

    std::filesystem::path test_dir_;
    std::shared_ptr<crypto::StandardCryptoEngine> crypto_;
    std::shared_ptr<messaging::OfflineRelayMailbox> relay_;
};

TEST_F(MessagingSubsystemTest, DirectMessageEncryptionAndDelivery) {
    auto alice = create_service("alice");
    auto bob = create_service("bob");

    std::string secret_text = "Hello Bob! This is an end-to-end encrypted message.";

    // Alice sends direct encrypted message to Bob
    auto msg = alice.send_direct_message(bob.identity().address(), bob.identity().public_key(), secret_text);

    // Verify message ciphertext does NOT contain plaintext
    std::string cipher_str(msg.ciphertext.begin(), msg.ciphertext.end());
    EXPECT_NE(cipher_str, secret_text);

    // Bob receives and decrypts message
    auto decrypted = bob.receive_direct_message(msg);
    ASSERT_TRUE(decrypted.has_value());
    EXPECT_EQ(*decrypted, secret_text);

    // Delivery acknowledgment is verified
    EXPECT_TRUE(bob.is_acknowledged(msg.message_id));
}

TEST_F(MessagingSubsystemTest, DuplicateMessageDetection) {
    auto alice = create_service("alice");
    auto bob = create_service("bob");

    auto msg = alice.send_direct_message(bob.identity().address(), bob.identity().public_key(), "Ping");

    // First receive: Success
    auto first = bob.receive_direct_message(msg);
    ASSERT_TRUE(first.has_value());

    // Duplicate receive: Rejected by duplicate detection
    auto second = bob.receive_direct_message(msg);
    EXPECT_FALSE(second.has_value());
}

TEST_F(MessagingSubsystemTest, OfflineRelayDeliveryAndRecovery) {
    auto alice = create_service("alice");
    auto bob = create_service("bob");

    std::string offline_text = "Message while Bob was offline.";

    // Alice sends while Bob is not actively listening (deposited in relay)
    auto msg = alice.send_direct_message(bob.identity().address(), bob.identity().public_key(), offline_text);
    EXPECT_EQ(relay_->pending_count(bob.identity().address()), 1);

    // Bob reconnects and drains offline mailbox
    size_t synced = bob.sync_offline_messages();
    EXPECT_EQ(synced, 1);
    EXPECT_EQ(relay_->pending_count(bob.identity().address()), 0);

    // Mailbox is empty on subsequent sync
    EXPECT_EQ(bob.sync_offline_messages(), 0);
}

TEST_F(MessagingSubsystemTest, RejectsForgedOrMalformedMessage) {
    auto alice = create_service("alice");
    auto bob = create_service("bob");
    auto eve = create_service("eve");

    auto msg = alice.send_direct_message(bob.identity().address(), bob.identity().public_key(), "Authentic Message");

    // Eve tampers with ciphertext
    msg.ciphertext[0] ^= 0x55;

    // Bob rejects or signature check rejects tampered payload
    msg.signature[0] ^= 0xFF;
    auto decrypted = bob.receive_direct_message(msg);
    EXPECT_FALSE(decrypted.has_value());
}

TEST_F(MessagingSubsystemTest, GroupMessagingAndForwardSecrecyKeyRotation) {
    auto alice = create_service("alice");
    auto bob = create_service("bob");
    auto charlie = create_service("charlie");

    messaging::GroupManager gm;
    auto initial_key = crypto_->hash256(std::span<const uint8_t>(reinterpret_cast<const uint8_t*>("initial_group_seed"), 18));
    gm.create_group("grp_crypto_club", "Crypto Club", alice.identity().address(), initial_key);

    // Add Bob and Charlie
    ASSERT_TRUE(gm.add_member("grp_crypto_club", alice.identity().address(), bob.identity().address()));
    ASSERT_TRUE(gm.add_member("grp_crypto_club", alice.identity().address(), charlie.identity().address()));

    EXPECT_EQ(gm.get_key_epoch("grp_crypto_club"), 1);

    // Alice sends group message
    auto grp_msg = alice.send_group_message("grp_crypto_club", gm, "Welcome to the group!");

    // Bob receives
    auto bob_rx = bob.receive_group_message(grp_msg, gm);
    ASSERT_TRUE(bob_rx.has_value());
    EXPECT_EQ(*bob_rx, "Welcome to the group!");

    // Charlie receives
    auto charlie_rx = charlie.receive_group_message(grp_msg, gm);
    ASSERT_TRUE(charlie_rx.has_value());
    EXPECT_EQ(*charlie_rx, "Welcome to the group!");

    // Alice removes Charlie (triggers forward secrecy key rotation)
    ASSERT_TRUE(gm.remove_member("grp_crypto_club", alice.identity().address(), charlie.identity().address()));
    EXPECT_EQ(gm.get_key_epoch("grp_crypto_club"), 2);
    EXPECT_FALSE(gm.is_member("grp_crypto_club", charlie.identity().address()));

    // Alice sends post-rotation message
    auto grp_msg2 = alice.send_group_message("grp_crypto_club", gm, "Secret after Charlie left.");

    // Bob can decrypt with updated epoch key
    auto bob_rx2 = bob.receive_group_message(grp_msg2, gm);
    ASSERT_TRUE(bob_rx2.has_value());
    EXPECT_EQ(*bob_rx2, "Secret after Charlie left.");

    // Removed Charlie CANNOT decrypt message (Unauthorized)
    auto charlie_rx2 = charlie.receive_group_message(grp_msg2, gm);
    EXPECT_FALSE(charlie_rx2.has_value());
}
