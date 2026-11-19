#pragma once

#include "blockbum/core/types.hpp"
#include "blockbum/core/serializer.hpp"
#include <string>
#include <vector>
#include <cstdint>

namespace blockbum::community {

enum class CommunityVisibility : uint8_t {
    Public = 0,
    Private = 1
};

enum class MemberRole : uint8_t {
    Member = 0,
    Moderator = 1,
    Admin = 2,
    Owner = 3
};

inline const char* role_to_string(MemberRole role) {
    switch (role) {
        case MemberRole::Owner: return "Owner";
        case MemberRole::Admin: return "Admin";
        case MemberRole::Moderator: return "Moderator";
        default: return "Member";
    }
}

// On-Chain Anchor: Verifiable community creation, membership, and governance action
enum class GovernanceActionType : uint8_t {
    CreateCommunity = 1,
    JoinCommunity = 2,
    UpdateRole = 3,
    CreateChannel = 4,
    PostChallenge = 5
};

struct GovernanceRecord {
    std::string community_id;
    GovernanceActionType action{GovernanceActionType::CreateCommunity};
    std::string actor_address;
    std::string target_address;
    uint32_t role_or_parameter{0};
    std::string metadata_uri; // CID pointing to off-chain encrypted details
    uint64_t timestamp{0};

    [[nodiscard]] std::vector<uint8_t> serialize() const {
        core::BinarySerializer s;
        s.write_string(community_id);
        s.write_u8(static_cast<uint8_t>(action));
        s.write_string(actor_address);
        s.write_string(target_address);
        s.write_u32(role_or_parameter);
        s.write_string(metadata_uri);
        s.write_u64(timestamp);
        return s.take_data();
    }

    static GovernanceRecord deserialize(core::BinaryDeserializer& d) {
        GovernanceRecord r;
        r.community_id = d.read_string();
        r.action = static_cast<GovernanceActionType>(d.read_u8());
        r.actor_address = d.read_string();
        r.target_address = d.read_string();
        r.role_or_parameter = d.read_u32();
        r.metadata_uri = d.read_string();
        r.timestamp = d.read_u64();
        return r;
    }
};

struct CodingChallenge {
    std::string challenge_id;
    std::string title;
    std::string description;
    std::string difficulty; // "Easy", "Medium", "Hard"
    uint32_t reward_points{100};
    std::vector<std::string> tags;
};

struct CommunityEvent {
    std::string event_id;
    std::string title;
    std::string description;
    uint64_t event_timestamp{0};
    std::string organizer_address;
};

struct DiscussionChannel {
    std::string channel_id;
    std::string name;
    std::string topic;
    bool is_announcement_only{false};
};

struct CommunityModel {
    std::string id;
    std::string name;
    std::string description;
    CommunityVisibility visibility{CommunityVisibility::Public};
    std::string owner_address;
    uint64_t created_at{0};
    std::vector<DiscussionChannel> channels;
    std::vector<CodingChallenge> challenges;
    std::vector<CommunityEvent> events;
    std::vector<std::string> educational_resource_cids;
};

} // namespace blockbum::community
