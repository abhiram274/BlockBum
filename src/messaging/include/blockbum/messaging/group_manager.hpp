#pragma once

#include "blockbum/core/types.hpp"
#include "blockbum/crypto/icrypto.hpp"
#include "blockbum/crypto/crypto_utils.hpp"
#include <string>
#include <vector>
#include <unordered_set>
#include <unordered_map>
#include <mutex>
#include <optional>

namespace blockbum::messaging {

struct GroupMemberMetadata {
    uint32_t joined_epoch{1};
    uint32_t left_epoch{0}; // 0 = currently active
};

struct GroupChannel {
    std::string group_id;
    std::string group_name;
    std::string creator_address;
    uint32_t key_epoch{1};
    core::Hash256 current_shared_key{};
    std::unordered_map<std::string, GroupMemberMetadata> member_registry;
    std::unordered_map<uint32_t, core::Hash256> epoch_keys;
};

/// Manages group channels, membership access, and forward-secure key rotation
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
        group.member_registry[creator_address] = {1, 0};
        group.epoch_keys[1] = initial_key;

        groups_[group_id] = group;
        return group;
    }

    bool add_member(const std::string& group_id,
                    const std::string& requester,
                    const std::string& new_member) {
        std::lock_guard<std::mutex> lock(mutex_);
        auto it = groups_.find(group_id);
        if (it == groups_.end()) return false;

        // Requester must be an active member
        auto req_it = it->second.member_registry.find(requester);
        if (req_it == it->second.member_registry.end() || req_it->second.left_epoch != 0) {
            return false;
        }

        // Backward Secrecy: Rotate key when adding member so newcomer cannot decrypt history
        rotate_key_internal(it->second);
        it->second.member_registry[new_member] = {it->second.key_epoch, 0};
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

        auto target_it = it->second.member_registry.find(target_member);
        if (target_it == it->second.member_registry.end() || target_it->second.left_epoch != 0) {
            return false;
        }

        // Mark member as departed at current epoch
        target_it->second.left_epoch = it->second.key_epoch;

        // Forward Secrecy: Immediately rotate key so removed member cannot read future messages
        rotate_key_internal(it->second);
        return true;
    }

    bool rotate_key(const std::string& group_id, const std::string& requester) {
        std::lock_guard<std::mutex> lock(mutex_);
        auto it = groups_.find(group_id);
        if (it == groups_.end()) return false;

        auto req_it = it->second.member_registry.find(requester);
        if (req_it == it->second.member_registry.end() || req_it->second.left_epoch != 0) {
            return false;
        }

        rotate_key_internal(it->second);
        return true;
    }

    [[nodiscard]] bool is_member(const std::string& group_id, const std::string& address) const {
        std::lock_guard<std::mutex> lock(mutex_);
        auto it = groups_.find(group_id);
        if (it == groups_.end()) return false;
        auto mem_it = it->second.member_registry.find(address);
        return mem_it != it->second.member_registry.end() && mem_it->second.left_epoch == 0;
    }

    /// Retrieve active current group key (only for currently active members)
    [[nodiscard]] std::optional<core::Hash256> get_group_key(const std::string& group_id, const std::string& requester) const {
        std::lock_guard<std::mutex> lock(mutex_);
        auto it = groups_.find(group_id);
        if (it == groups_.end()) return std::nullopt;

        auto req_it = it->second.member_registry.find(requester);
        if (req_it == it->second.member_registry.end() || req_it->second.left_epoch != 0) {
            return std::nullopt; // Unauthorized
        }

        return it->second.current_shared_key;
    }

    /// Retrieve historical group key for a specific epoch (verifying membership boundaries)
    [[nodiscard]] std::optional<core::Hash256> get_group_key_for_epoch(const std::string& group_id,
                                                                      const std::string& requester,
                                                                      uint32_t epoch) const {
        std::lock_guard<std::mutex> lock(mutex_);
        auto it = groups_.find(group_id);
        if (it == groups_.end()) return std::nullopt;

        auto req_it = it->second.member_registry.find(requester);
        if (req_it == it->second.member_registry.end()) {
            return std::nullopt; // Not in group
        }

        // Enforce Backward Secrecy: member cannot read epochs prior to joining
        if (epoch < req_it->second.joined_epoch) {
            return std::nullopt;
        }

        // Enforce Forward Secrecy: departed member cannot read epochs after leaving
        if (req_it->second.left_epoch != 0 && epoch > req_it->second.left_epoch) {
            return std::nullopt;
        }

        auto key_it = it->second.epoch_keys.find(epoch);
        if (key_it != it->second.epoch_keys.end()) {
            return key_it->second;
        }
        return std::nullopt;
    }

    [[nodiscard]] std::optional<uint32_t> get_key_epoch(const std::string& group_id) const {
        std::lock_guard<std::mutex> lock(mutex_);
        auto it = groups_.find(group_id);
        if (it == groups_.end()) return std::nullopt;
        return it->second.key_epoch;
    }

    [[nodiscard]] std::vector<std::string> get_active_members(const std::string& group_id) const {
        std::lock_guard<std::mutex> lock(mutex_);
        std::vector<std::string> members;
        auto it = groups_.find(group_id);
        if (it != groups_.end()) {
            for (const auto& [addr, meta] : it->second.member_registry) {
                if (meta.left_epoch == 0) {
                    members.push_back(addr);
                }
            }
        }
        return members;
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
        group.epoch_keys[group.key_epoch] = group.current_shared_key;
    }

    mutable std::mutex mutex_;
    std::unordered_map<std::string, GroupChannel> groups_;
};

} // namespace blockbum::messaging
