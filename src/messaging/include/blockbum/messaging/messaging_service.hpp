#pragma once

#include "blockbum/messaging/types.hpp"
#include "blockbum/messaging/group_manager.hpp"
#include "blockbum/messaging/history_store.hpp"
#include "blockbum/messaging/relay_mailbox.hpp"
#include "blockbum/crypto/wallet.hpp"
#include "blockbum/crypto/e2e_encryption.hpp"
#include "blockbum/crypto/standard_crypto.hpp"
#include "blockbum/network/inetwork.hpp"
#include <memory>
#include <unordered_set>
#include <unordered_map>
#include <mutex>
#include <chrono>

namespace blockbum::messaging {

// Complete high-level Messaging API designed for desktop, mobile, and node usage
class MessagingService {
public:
    MessagingService(crypto::Identity identity,
                     std::shared_ptr<crypto::ICryptoEngine> crypto_engine,
                     std::shared_ptr<EncryptedHistoryStore> history_store,
                     std::shared_ptr<OfflineRelayMailbox> relay = nullptr)
        : identity_(std::move(identity)),
          crypto_engine_(std::move(crypto_engine)),
          history_store_(std::move(history_store)),
          relay_(std::move(relay)) {}

    // 1. Send End-to-End Encrypted One-to-One Message
    SecureMessage send_direct_message(const std::string& recipient_address,
                                      const crypto::PublicKey& recipient_pubkey,
                                      const std::string& plaintext) {
        if (!check_rate_limit(identity_.address())) {
            throw std::runtime_error("Rate limit exceeded for sender");
        }

        uint64_t seq = ++sequence_counter_;
        uint64_t now = current_time_ms();
        uint64_t nonce = seq ^ now;

        // Compute shared secret: E2EE
        auto shared_key = crypto::E2EEncryptionEngine::compute_shared_secret(recipient_pubkey, identity_.secret_key());

        std::span<const uint8_t> pt_span(reinterpret_cast<const uint8_t*>(plaintext.data()), plaintext.size());
        auto ciphertext = crypto::E2EEncryptionEngine::encrypt(pt_span, shared_key, nonce);

        SecureMessage msg;
        msg.category = MessageCategory::Direct;
        msg.sender_address = identity_.address();
        msg.sender_pubkey = identity_.public_key();
        msg.recipient_address = recipient_address;
        msg.sequence_number = seq;
        msg.timestamp = now;
        msg.nonce = nonce;
        msg.ciphertext = std::move(ciphertext);

        // Sign message
        auto sign_data = msg.serialize_for_signature();
        msg.signature = identity_.sign(sign_data, *crypto_engine_);

        // Deterministic Message ID
        auto id_hash = crypto_engine_->hash256(msg.serialize());
        msg.message_id = "msg_" + core::to_hex(id_hash).substr(0, 32);

        // Record to local encrypted history
        if (history_store_) {
            history_store_->append_message({msg.message_id, msg.sender_address, msg.recipient_address,
                                            msg.timestamp, msg.sequence_number, plaintext, true});
        }

        // If relay is configured, also deposit in offline mailbox
        if (relay_) {
            relay_->deposit(msg);
        }

        return msg;
    }

    // 2. Send Encrypted Group Message
    SecureMessage send_group_message(const std::string& group_id,
                                     const GroupManager& group_manager,
                                     const std::string& plaintext) {
        auto group_key_opt = group_manager.get_group_key(group_id, identity_.address());
        if (!group_key_opt.has_value()) {
            throw std::runtime_error("Unauthorized: identity is not a member of group " + group_id);
        }

        if (!check_rate_limit(identity_.address())) {
            throw std::runtime_error("Rate limit exceeded for sender");
        }

        uint64_t seq = ++sequence_counter_;
        uint64_t now = current_time_ms();
        uint64_t nonce = seq ^ now;

        std::span<const uint8_t> pt_span(reinterpret_cast<const uint8_t*>(plaintext.data()), plaintext.size());
        auto ciphertext = crypto::E2EEncryptionEngine::encrypt(pt_span, *group_key_opt, nonce);

        SecureMessage msg;
        msg.category = MessageCategory::Group;
        msg.sender_address = identity_.address();
        msg.sender_pubkey = identity_.public_key();
        msg.recipient_address = group_id;
        msg.sequence_number = seq;
        msg.timestamp = now;
        msg.nonce = nonce;
        msg.ciphertext = std::move(ciphertext);

        auto sign_data = msg.serialize_for_signature();
        msg.signature = identity_.sign(sign_data, *crypto_engine_);

        auto id_hash = crypto_engine_->hash256(msg.serialize());
        msg.message_id = "grp_" + core::to_hex(id_hash).substr(0, 32);

        if (history_store_) {
            history_store_->append_message({msg.message_id, msg.sender_address, group_id,
                                            msg.timestamp, msg.sequence_number, plaintext, true});
        }

        return msg;
    }

    // 3. Receive and Decrypt Direct Inbound Message
    std::optional<std::string> receive_direct_message(const SecureMessage& msg) {
        // Enforce duplicate detection
        {
            std::lock_guard<std::mutex> lock(seen_mutex_);
            if (seen_messages_.find(msg.message_id) != seen_messages_.end()) {
                return std::nullopt; // Already processed
            }
            seen_messages_.insert(msg.message_id);
        }

        // Verify authorship signature
        auto sign_data = msg.serialize_for_signature();
        if (!crypto_engine_->verify(sign_data, msg.signature, msg.sender_pubkey)) {
            return std::nullopt; // Invalid / forged signature
        }

        // Compute shared secret using recipient secret key and sender public key
        auto shared_key = crypto::E2EEncryptionEngine::compute_shared_secret(msg.sender_pubkey, identity_.secret_key());

        auto decrypted_bytes = crypto::E2EEncryptionEngine::decrypt(msg.ciphertext, shared_key, msg.nonce);
        std::string plaintext(decrypted_bytes.begin(), decrypted_bytes.end());

        if (history_store_) {
            history_store_->append_message({msg.message_id, msg.sender_address, msg.recipient_address,
                                            msg.timestamp, msg.sequence_number, plaintext, false});
        }

        // Automatically issue delivery acknowledgment
        record_delivery_ack(msg.message_id);

        return plaintext;
    }

    // 4. Receive and Decrypt Group Message
    std::optional<std::string> receive_group_message(const SecureMessage& msg, const GroupManager& group_manager) {
        {
            std::lock_guard<std::mutex> lock(seen_mutex_);
            if (seen_messages_.find(msg.message_id) != seen_messages_.end()) {
                return std::nullopt;
            }
            seen_messages_.insert(msg.message_id);
        }

        // Check if our identity is authorized in this group
        auto group_key_opt = group_manager.get_group_key(msg.recipient_address, identity_.address());
        if (!group_key_opt.has_value()) {
            return std::nullopt; // Not authorized or removed from group
        }

        auto sign_data = msg.serialize_for_signature();
        if (!crypto_engine_->verify(sign_data, msg.signature, msg.sender_pubkey)) {
            return std::nullopt;
        }

        auto decrypted_bytes = crypto::E2EEncryptionEngine::decrypt(msg.ciphertext, *group_key_opt, msg.nonce);
        std::string plaintext(decrypted_bytes.begin(), decrypted_bytes.end());

        if (history_store_) {
            history_store_->append_message({msg.message_id, msg.sender_address, msg.recipient_address,
                                            msg.timestamp, msg.sequence_number, plaintext, false});
        }

        return plaintext;
    }

    // 5. Offline Recovery: Drain pending messages from relay node
    size_t sync_offline_messages() {
        if (!relay_) return 0;

        auto pending = relay_->fetch_and_drain(identity_.address());
        size_t processed = 0;
        for (const auto& msg : pending) {
            if (receive_direct_message(msg).has_value()) {
                processed++;
            }
        }
        return processed;
    }

    [[nodiscard]] bool is_acknowledged(const std::string& message_id) const {
        std::lock_guard<std::mutex> lock(ack_mutex_);
        return acknowledged_ids_.find(message_id) != acknowledged_ids_.end();
    }

    [[nodiscard]] const crypto::Identity& identity() const noexcept {
        return identity_;
    }

private:
    static uint64_t current_time_ms() {
        return static_cast<uint64_t>(std::chrono::duration_cast<std::chrono::milliseconds>(
            std::chrono::system_clock::now().time_since_epoch()).count());
    }

    bool check_rate_limit(const std::string& sender) {
        std::lock_guard<std::mutex> lock(rate_mutex_);
        uint64_t now = current_time_ms();
        auto& tracker = rate_limits_[sender];

        // Reset if more than 1 second has elapsed
        if (now - tracker.last_window_start > 1000) {
            tracker.last_window_start = now;
            tracker.count = 0;
        }

        tracker.count++;
        return tracker.count <= 100; // 100 messages/sec limit
    }

    void record_delivery_ack(const std::string& message_id) {
        std::lock_guard<std::mutex> lock(ack_mutex_);
        acknowledged_ids_.insert(message_id);
    }

    struct RateTracker {
        uint64_t last_window_start{0};
        uint32_t count{0};
    };

    crypto::Identity identity_;
    std::shared_ptr<crypto::ICryptoEngine> crypto_engine_;
    std::shared_ptr<EncryptedHistoryStore> history_store_;
    std::shared_ptr<OfflineRelayMailbox> relay_;

    uint64_t sequence_counter_{0};
    mutable std::mutex seen_mutex_;
    std::unordered_set<std::string> seen_messages_;

    mutable std::mutex ack_mutex_;
    std::unordered_set<std::string> acknowledged_ids_;

    std::mutex rate_mutex_;
    std::unordered_map<std::string, RateTracker> rate_limits_;
};

} // namespace blockbum::messaging
