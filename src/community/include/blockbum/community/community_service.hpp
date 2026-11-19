#pragma once

#include "blockbum/community/types.hpp"
#include "blockbum/core/blockchain.hpp"
#include "blockbum/messaging/messaging_service.hpp"
#include "blockbum/content/content_manager.hpp"
#include <unordered_map>
#include <unordered_set>
#include <mutex>
#include <memory>
#include <optional>
#include <algorithm>

namespace blockbum::community {

// High-level Community Platform Service
// Coordinates verifiable governance anchoring with off-chain E2EE messaging and decentralized file sharing
class CommunityService {
public:
    CommunityService(std::shared_ptr<core::Blockchain> chain,
                     std::shared_ptr<content::ContentManager> content_mgr)
        : chain_(std::move(chain)), content_mgr_(std::move(content_mgr)) {}

    // 1. Create a new community
    CommunityModel create_community(const std::string& id,
                                   const std::string& name,
                                   const std::string& description,
                                   CommunityVisibility visibility,
                                   const std::string& creator_address) {
        std::lock_guard<std::mutex> lock(mutex_);
        if (communities_.find(id) != communities_.end()) {
            throw std::runtime_error("Community already exists with ID: " + id);
        }

        CommunityModel comm;
        comm.id = id;
        comm.name = name;
        comm.description = description;
        comm.visibility = visibility;
        comm.owner_address = creator_address;
        comm.created_at = 1700000000;

        // Default general channel
        comm.channels.push_back({"general", "general", "General discussion", false});

        communities_[id] = comm;
        roles_[id][creator_address] = MemberRole::Owner;

        // Anchor on-chain governance record
        anchor_governance_action(id, GovernanceActionType::CreateCommunity, creator_address, "", static_cast<uint32_t>(MemberRole::Owner));

        return comm;
    }

    // 2. Discover communities (Public or joined)
    [[nodiscard]] std::vector<CommunityModel> discover_communities(const std::string& user_address) const {
        std::lock_guard<std::mutex> lock(mutex_);
        std::vector<CommunityModel> res;
        for (const auto& [id, comm] : communities_) {
            if (comm.visibility == CommunityVisibility::Public) {
                res.push_back(comm);
            } else {
                auto it = roles_.find(id);
                if (it != roles_.end() && it->second.find(user_address) != it->second.end()) {
                    res.push_back(comm);
                }
            }
        }
        return res;
    }

    // 3. Join / Request membership
    bool join_community(const std::string& community_id, const std::string& user_address, const std::string& invitation_token = "") {
        std::lock_guard<std::mutex> lock(mutex_);
        auto it = communities_.find(community_id);
        if (it == communities_.end()) return false;

        if (it->second.visibility == CommunityVisibility::Private) {
            // Private community requires invitation token
            if (invitation_token.empty() || invitation_tokens_[community_id].find(invitation_token) == invitation_tokens_[community_id].end()) {
                return false; // Unauthorized
            }
        }

        roles_[community_id][user_address] = MemberRole::Member;
        anchor_governance_action(community_id, GovernanceActionType::JoinCommunity, user_address, "", static_cast<uint32_t>(MemberRole::Member));
        return true;
    }

    // 4. Role management and permission checks
    bool assign_role(const std::string& community_id, const std::string& requester, const std::string& target, MemberRole new_role) {
        std::lock_guard<std::mutex> lock(mutex_);
        if (!has_permission_internal(community_id, requester, MemberRole::Admin)) {
            return false;
        }

        roles_[community_id][target] = new_role;
        anchor_governance_action(community_id, GovernanceActionType::UpdateRole, requester, target, static_cast<uint32_t>(new_role));
        return true;
    }

    [[nodiscard]] bool has_permission(const std::string& community_id, const std::string& address, MemberRole required_role) const {
        std::lock_guard<std::mutex> lock(mutex_);
        return has_permission_internal(community_id, address, required_role);
    }

    // 5. Channels and Discussions
    bool add_channel(const std::string& community_id, const std::string& requester, const DiscussionChannel& channel) {
        std::lock_guard<std::mutex> lock(mutex_);
        if (!has_permission_internal(community_id, requester, MemberRole::Admin)) {
            return false;
        }

        communities_[community_id].channels.push_back(channel);
        return true;
    }

    // 6. Collaborative Coding Challenges
    bool post_coding_challenge(const std::string& community_id, const std::string& requester, const CodingChallenge& challenge) {
        std::lock_guard<std::mutex> lock(mutex_);
        if (!has_permission_internal(community_id, requester, MemberRole::Moderator)) {
            return false;
        }

        communities_[community_id].challenges.push_back(challenge);
        return true;
    }

    // 7. Community Events
    bool schedule_event(const std::string& community_id, const std::string& requester, const CommunityEvent& event) {
        std::lock_guard<std::mutex> lock(mutex_);
        if (!has_permission_internal(community_id, requester, MemberRole::Moderator)) {
            return false;
        }

        communities_[community_id].events.push_back(event);
        return true;
    }

    // 8. Educational File Resources (integrates with ContentManager CID)
    bool share_educational_resource(const std::string& community_id, const std::string& requester, const std::string& content_cid) {
        std::lock_guard<std::mutex> lock(mutex_);
        if (!has_permission_internal(community_id, requester, MemberRole::Member)) {
            return false;
        }

        communities_[community_id].educational_resource_cids.push_back(content_cid);
        return true;
    }

    // Invitation token generation
    std::string generate_invitation(const std::string& community_id, const std::string& requester) {
        std::lock_guard<std::mutex> lock(mutex_);
        if (!has_permission_internal(community_id, requester, MemberRole::Admin)) {
            throw std::runtime_error("Only admins can create invitations");
        }

        std::string token = "inv_" + community_id + "_" + std::to_string(++invite_counter_);
        invitation_tokens_[community_id].insert(token);
        return token;
    }

    [[nodiscard]] std::optional<CommunityModel> get_community(const std::string& id) const {
        std::lock_guard<std::mutex> lock(mutex_);
        auto it = communities_.find(id);
        if (it != communities_.end()) return it->second;
        return std::nullopt;
    }

private:
    bool has_permission_internal(const std::string& community_id, const std::string& address, MemberRole required_role) const {
        auto comm_it = roles_.find(community_id);
        if (comm_it == roles_.end()) return false;
        auto user_it = comm_it->second.find(address);
        if (user_it == comm_it->second.end()) return false;

        return static_cast<uint8_t>(user_it->second) >= static_cast<uint8_t>(required_role);
    }

    void anchor_governance_action(const std::string& comm_id,
                                  GovernanceActionType act,
                                  const std::string& actor,
                                  const std::string& target,
                                  uint32_t param) {
        if (!chain_) return;

        GovernanceRecord rec;
        rec.community_id = comm_id;
        rec.action = act;
        rec.actor_address = actor;
        rec.target_address = target;
        rec.role_or_parameter = param;
        rec.timestamp = 1700000000;

        auto payload = rec.serialize();

        core::Transaction tx;
        tx.version = 1;
        tx.sender = actor;
        tx.recipient = "gov:" + comm_id;
        tx.amount = 0;
        tx.fee = 0;
        tx.nonce = chain_->height() + 1;
        tx.payload = std::move(payload);
        tx.timestamp = 1700000000;

        // Record governance transaction to next block
        auto block = chain_->create_next_block({tx});
        chain_->add_block(block);
    }

    std::shared_ptr<core::Blockchain> chain_;
    std::shared_ptr<content::ContentManager> content_mgr_;

    mutable std::mutex mutex_;
    std::unordered_map<std::string, CommunityModel> communities_;
    std::unordered_map<std::string, std::unordered_map<std::string, MemberRole>> roles_;
    std::unordered_map<std::string, std::unordered_set<std::string>> invitation_tokens_;
    uint64_t invite_counter_{0};
};

} // namespace blockbum::community
