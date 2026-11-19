#pragma once

#include "blockbum/messaging/types.hpp"
#include "blockbum/core/types.hpp"
#include "blockbum/core/serializer.hpp"
#include <mutex>
#include <unordered_map>
#include <vector>
#include <string>

namespace blockbum::messaging {

// Relay store holding encrypted offline mailboxes for recipient addresses
class OfflineRelayMailbox {
public:
    OfflineRelayMailbox() = default;

    // Deposit an encrypted message into recipient's offline mailbox
    void deposit(const SecureMessage& msg) {
        std::lock_guard<std::mutex> lock(mutex_);
        mailboxes_[msg.recipient_address].push_back(msg);
    }

    // Retrieve and drain all pending messages for an address
    [[nodiscard]] std::vector<SecureMessage> fetch_and_drain(const std::string& recipient_address) {
        std::lock_guard<std::mutex> lock(mutex_);
        auto it = mailboxes_.find(recipient_address);
        if (it == mailboxes_.end()) {
            return {};
        }

        std::vector<SecureMessage> pending = std::move(it->second);
        mailboxes_.erase(it);
        return pending;
    }

    [[nodiscard]] size_t pending_count(const std::string& recipient_address) const {
        std::lock_guard<std::mutex> lock(mutex_);
        auto it = mailboxes_.find(recipient_address);
        if (it == mailboxes_.end()) return 0;
        return it->second.size();
    }

private:
    mutable std::mutex mutex_;
    std::unordered_map<std::string, std::vector<SecureMessage>> mailboxes_;
};

} // namespace blockbum::messaging
