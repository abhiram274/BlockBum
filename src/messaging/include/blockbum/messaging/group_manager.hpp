#pragma once

#include "blockbum/core/types.hpp"
#include "blockbum/crypto/icrypto.hpp"
#include "blockbum/crypto/crypto_utils.hpp"
#include <string>
#include <vector>
#include <unordered_set>
#include <unordered_map>
#include <mutex>

namespace blockbum::messaging {

struct GroupChannel {
    std::string group_id;
    std::string group_name;
    std::string creator_address;
    uint32_t key_epoch{1};
    core::Hash256 current_shared_key{};
    std::unordered_set<std::string> member_addresses;
};

// Manages group channels, membership access, and cryptographic key rotation
class GroupManager {
public:
    GroupManager() = default;

    GroupChannel create_group(const std::string& group_id,
                              const std::string& group_name,
                              const std::string& creator_address,
                              const core::Hash256& initial_key) {
        std::lock_guard<std::mutex> lock(mutex_);
        GroupChannel group;
        group.group_id = group_id;
        group.group_name = group_name;
        group.creator_address = creator_address;
        group.key_epoch = 1;
        group.current_shared_key = initial_key;
        group.member_addresses.insert(creator_address);

        groups_[group_id] = group;
        return group;
    }

    bool add_member(const std::string& group_id,
                    const std::string& requester,
                    const std::string& new_member) {
        std::lock_guard<std::mutex> lock(mutex_);
        auto it = groups_.find(group_id);
        if (it == groups_.end()) return false;

        // Only existing members or creator can add members
        if (it->second.member_addresses.find(requester) == it->second.member_addresses.end()) {
            return false;
        }

        it->second.member_addresses.insert(new_member);
        return true;
    }

    bool remove_member(const std::string& group_id,
                       const std::string& requester,
                       const std::string& target_member) {
        std::lock_guard<std::mutex> lock(mutex_);
        auto it = groups_.find(group_id);
        if (it == groups_.end()) return false;

        if (it->second.creator_address != requester) {
            return false; // Only creator can remove members
        }

        it->second.member_addresses.erase(target_member);
        // Automatic forward-secrecy key rotation: derive new key
        rotate_key_internal(it->second);
        return true;
    }

    // Trigger key rotation (e.g. forward secrecy on member change or epoch refresh)
    bool rotate_key(const std::string& group_id, const std::string& requester) {
        std::lock_guard<std::mutex> lock(mutex_);
        auto it = groups_.find(group_id);
        if (it == groups_.end()) return false;

        if (it->second.member_addresses.find(requester) == it->second.member_addresses.end()) {
            return false;
        }

        rotate_key_internal(it->second);
        return true;
    }

    [[nodiscard]] bool is_member(const std::string& group_id, const std::string& address) const {
        std::lock_guard<std::mutex> lock(mutex_);
        auto it = groups_.find(group_id);
        if (it == groups_.end()) return false;
        return it->second.member_addresses.find(address) != it->second.member_addresses.end();
    }

    [[nodiscard]] std::optional<core::Hash256> get_group_key(const std::string& group_id, const std::string& requester) const {
        std::lock_guard<std::mutex> lock(mutex_);
        auto it = groups_.find(group_id);
        if (it == groups_.end()) return std::nullopt;

        if (it->second.member_addresses.find(requester) == it->second.member_addresses.end()) {
            return std::nullopt; // Unauthorized
        }

        return it->second.current_shared_key;
    }

    [[nodiscard]] std::optional<uint32_t> get_key_epoch(const std::string& group_id) const {
        std::lock_guard<std::mutex> lock(mutex_);
        auto it = groups_.find(group_id);
        if (it == groups_.end()) return std::nullopt;
        return it->second.key_epoch;
    }

private:
    void rotate_key_internal(GroupChannel& group) {
        group.key_epoch++;
        // Rotate: NextKey = SHA-256(CurrentKey || Epoch || GroupID)
        std::vector<uint8_t> input;
        input.reserve(32 + 4 + group.group_id.size());
        input.insert(input.end(), group.current_shared_key.begin(), group.current_shared_key.end());
        for (int i = 0; i < 4; ++i) {
            input.push_back(static_cast<uint8_t>((group.key_epoch >> (i * 8)) & 0xFF));
        }
        input.insert(input.end(), group.group_id.begin(), group.group_id.end());

        group.current_shared_key = crypto::CryptoUtils::sha256(input);
    }

    mutable std::mutex mutex_;
    std::unordered_map<std::string, GroupChannel> groups_;
};

} // namespace blockbum::messaging
