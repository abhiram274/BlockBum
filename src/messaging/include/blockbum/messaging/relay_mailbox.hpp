#pragma once

#include "blockbum/messaging/types.hpp"
#include "blockbum/core/types.hpp"
#include "blockbum/core/serializer.hpp"
#include <mutex>
#include <unordered_map>
#include <vector>
#include <string>
#include <deque>
#include <algorithm>

namespace blockbum::messaging {

struct StoredRelayEnvelope {
    SecureMessage message;
    uint64_t deposited_at{0};
    uint64_t expires_at{0};
};

struct BlindedEnvelope {
    std::string routing_token; // Blinded hash of recipient key
    std::vector<uint8_t> opaque_payload;
    uint64_t deposited_at{0};
    uint64_t expires_at{0};
};

/// High-capacity offline relay mailbox with TTL retention, quota enforcement, and blinded routing
class OfflineRelayMailbox {
public:
    static constexpr uint64_t DEFAULT_TTL_SECONDS = 7 * 86400; // 7 days
    static constexpr size_t DEFAULT_MAX_PER_MAILBOX = 2000;

    explicit OfflineRelayMailbox(uint64_t default_ttl = DEFAULT_TTL_SECONDS,
                                 size_t max_per_mailbox = DEFAULT_MAX_PER_MAILBOX)
        : default_ttl_(default_ttl), max_per_mailbox_(max_per_mailbox) {}

    /// Deposit an encrypted message with configurable TTL
    bool deposit(const SecureMessage& msg, uint64_t current_time = 0, uint64_t ttl_seconds = 0) {
        std::lock_guard<std::mutex> lock(mutex_);
        uint64_t now = (current_time != 0) ? current_time : 1700000000;
        uint64_t ttl = (ttl_seconds != 0) ? ttl_seconds : default_ttl_;

        auto& box = mailboxes_[msg.recipient_address];
        purge_expired_internal(box, now);

        if (box.size() >= max_per_mailbox_) {
            box.pop_front(); // Evict oldest message on quota exhaustion
        }

        box.push_back({msg, now, now + ttl});
        return true;
    }

    /// Retrieve and drain all pending non-expired messages for an address
    [[nodiscard]] std::vector<SecureMessage> fetch_and_drain(const std::string& recipient_address, uint64_t current_time = 0) {
        std::lock_guard<std::mutex> lock(mutex_);
        uint64_t now = (current_time != 0) ? current_time : 1700000000;

        auto it = mailboxes_.find(recipient_address);
        if (it == mailboxes_.end()) {
            return {};
        }

        purge_expired_internal(it->second, now);

        std::vector<SecureMessage> pending;
        pending.reserve(it->second.size());
        for (auto& env : it->second) {
            pending.push_back(std::move(env.message));
        }

        mailboxes_.erase(it);
        return pending;
    }

    /// Blinded Routing: deposit opaque ciphertext using blinded routing token (metadata minimization)
    bool deposit_blinded(const std::string& routing_token,
                         std::vector<uint8_t> opaque_payload,
                         uint64_t current_time = 0,
                         uint64_t ttl_seconds = 0) {
        std::lock_guard<std::mutex> lock(mutex_);
        uint64_t now = (current_time != 0) ? current_time : 1700000000;
        uint64_t ttl = (ttl_seconds != 0) ? ttl_seconds : default_ttl_;

        auto& box = blinded_mailboxes_[routing_token];
        purge_blinded_expired_internal(box, now);

        if (box.size() >= max_per_mailbox_) {
            box.pop_front();
        }

        box.push_back({routing_token, std::move(opaque_payload), now, now + ttl});
        return true;
    }

    /// Retrieve and drain blinded messages
    [[nodiscard]] std::vector<std::vector<uint8_t>> fetch_and_drain_blinded(const std::string& routing_token, uint64_t current_time = 0) {
        std::lock_guard<std::mutex> lock(mutex_);
        uint64_t now = (current_time != 0) ? current_time : 1700000000;

        auto it = blinded_mailboxes_.find(routing_token);
        if (it == blinded_mailboxes_.end()) {
            return {};
        }

        purge_blinded_expired_internal(it->second, now);

        std::vector<std::vector<uint8_t>> pending;
        pending.reserve(it->second.size());
        for (auto& env : it->second) {
            pending.push_back(std::move(env.opaque_payload));
        }

        blinded_mailboxes_.erase(it);
        return pending;
    }

    [[nodiscard]] size_t pending_count(const std::string& recipient_address, uint64_t current_time = 0) const {
        std::lock_guard<std::mutex> lock(mutex_);
        auto it = mailboxes_.find(recipient_address);
        if (it == mailboxes_.end()) return 0;
        uint64_t now = (current_time != 0) ? current_time : 1700000000;

        size_t count = 0;
        for (const auto& env : it->second) {
            if (env.expires_at > now) count++;
        }
        return count;
    }

    /// Clean up expired envelopes across all mailboxes
    size_t purge_all_expired(uint64_t current_time) {
        std::lock_guard<std::mutex> lock(mutex_);
        size_t purged = 0;
        for (auto it = mailboxes_.begin(); it != mailboxes_.end(); ) {
            size_t before = it->second.size();
            purge_expired_internal(it->second, current_time);
            purged += (before - it->second.size());
            if (it->second.empty()) {
                it = mailboxes_.erase(it);
            } else {
                ++it;
            }
        }
        for (auto it = blinded_mailboxes_.begin(); it != blinded_mailboxes_.end(); ) {
            size_t before = it->second.size();
            purge_blinded_expired_internal(it->second, current_time);
            purged += (before - it->second.size());
            if (it->second.empty()) {
                it = blinded_mailboxes_.erase(it);
            } else {
                ++it;
            }
        }
        return purged;
    }

private:
    static void purge_expired_internal(std::deque<StoredRelayEnvelope>& box, uint64_t now) {
        while (!box.empty() && box.front().expires_at <= now) {
            box.pop_front();
        }
    }

    static void purge_blinded_expired_internal(std::deque<BlindedEnvelope>& box, uint64_t now) {
        while (!box.empty() && box.front().expires_at <= now) {
            box.pop_front();
        }
    }

    mutable std::mutex mutex_;
    uint64_t default_ttl_{DEFAULT_TTL_SECONDS};
    size_t max_per_mailbox_{DEFAULT_MAX_PER_MAILBOX};
    std::unordered_map<std::string, std::deque<StoredRelayEnvelope>> mailboxes_;
    std::unordered_map<std::string, std::deque<BlindedEnvelope>> blinded_mailboxes_;
};

} // namespace blockbum::messaging
