#pragma once

#include "blockbum/core/types.hpp"
#include "blockbum/core/serializer.hpp"
#include "blockbum/core/block.hpp"
#include "blockbum/core/transaction.hpp"
#include <cstdint>
#include <vector>
#include <span>
#include <string>

namespace blockbum::network {

// Magic bytes identifying BlockBum P2P wire protocol: 'B' 'B' 'U' 'M'
inline constexpr uint32_t PROTOCOL_MAGIC = 0x4D554242; // "BBUM" in little endian
inline constexpr uint32_t PROTOCOL_VERSION = 1;
inline constexpr size_t MAX_MESSAGE_SIZE = 10 * 1024 * 1024; // 10 MB maximum payload

enum class MessageType : uint8_t {
    Ping = 1,
    Pong = 2,
    Handshake = 3,
    HandshakeAck = 4,
    GetStatus = 5,
    Status = 6,
    GetBlocks = 7,     // Request blocks from height H to H+N
    BlockBatch = 8,    // Batch of blocks returned for sync
    NewBlock = 9,      // Broadcast newly mined/validated block
    NewTransaction = 10,// Broadcast newly submitted transaction
    GetPeers = 11,     // Query known peers from remote peer
    Peers = 12,        // List of peers returned
    GetHeaders = 13,   // Request headers from height H to H+N (Headers-First Sync)
    Headers = 14       // Batch of block headers returned
};

struct MessageHeader {
    uint32_t magic{PROTOCOL_MAGIC};
    uint32_t version{PROTOCOL_VERSION};
    MessageType type{MessageType::Ping};
    uint32_t payload_size{0};

    [[nodiscard]] std::vector<uint8_t> serialize() const {
        core::BinarySerializer s;
        s.write_u32(magic);
        s.write_u32(version);
        s.write_u8(static_cast<uint8_t>(type));
        s.write_u32(payload_size);
        return s.take_data();
    }

    static MessageHeader deserialize(core::BinaryDeserializer& d) {
        MessageHeader h;
        h.magic = d.read_u32();
        h.version = d.read_u32();
        h.type = static_cast<MessageType>(d.read_u8());
        h.payload_size = d.read_u32();
        return h;
    }
};

struct StatusPayload {
    core::BlockHeight height{0};
    core::Hash256 tip_hash{};
    std::string node_id{};

    [[nodiscard]] std::vector<uint8_t> serialize() const {
        core::BinarySerializer s;
        s.write_u64(height);
        s.write_hash(tip_hash);
        s.write_string(node_id);
        return s.take_data();
    }

    static StatusPayload deserialize(core::BinaryDeserializer& d) {
        StatusPayload p;
        p.height = d.read_u64();
        p.tip_hash = d.read_hash();
        p.node_id = d.read_string();
        return p;
    }
};

struct GetBlocksPayload {
    core::BlockHeight from_height{0};
    uint32_t max_count{50};

    [[nodiscard]] std::vector<uint8_t> serialize() const {
        core::BinarySerializer s;
        s.write_u64(from_height);
        s.write_u32(max_count);
        return s.take_data();
    }

    static GetBlocksPayload deserialize(core::BinaryDeserializer& d) {
        GetBlocksPayload p;
        p.from_height = d.read_u64();
        p.max_count = d.read_u32();
        return p;
    }
};

struct BlockBatchPayload {
    std::vector<core::Block> blocks;

    [[nodiscard]] std::vector<uint8_t> serialize() const {
        core::BinarySerializer s;
        s.write_u32(static_cast<uint32_t>(blocks.size()));
        for (const auto& b : blocks) {
            auto b_bytes = b.serialize();
            s.write_bytes(b_bytes);
        }
        return s.take_data();
    }

    static BlockBatchPayload deserialize(core::BinaryDeserializer& d) {
        BlockBatchPayload p;
        uint32_t count = d.read_u32();
        p.blocks.reserve(count);
        for (uint32_t i = 0; i < count; ++i) {
            auto b_bytes = d.read_bytes();
            core::BinaryDeserializer bd(b_bytes);
            p.blocks.push_back(core::Block::deserialize(bd));
        }
        return p;
    }
};

struct PeerEntry {
    std::string address;
    uint64_t last_seen{0};
    uint32_t services{1};

    [[nodiscard]] std::vector<uint8_t> serialize() const {
        core::BinarySerializer s;
        s.write_string(address);
        s.write_u64(last_seen);
        s.write_u32(services);
        return s.take_data();
    }

    static PeerEntry deserialize(core::BinaryDeserializer& d) {
        PeerEntry e;
        e.address = d.read_string();
        e.last_seen = d.read_u64();
        e.services = d.read_u32();
        return e;
    }
};

struct GetPeersPayload {
    uint32_t max_count{50};

    [[nodiscard]] std::vector<uint8_t> serialize() const {
        core::BinarySerializer s;
        s.write_u32(max_count);
        return s.take_data();
    }

    static GetPeersPayload deserialize(core::BinaryDeserializer& d) {
        GetPeersPayload p;
        p.max_count = d.read_u32();
        return p;
    }
};

struct PeersPayload {
    std::vector<PeerEntry> peers;

    [[nodiscard]] std::vector<uint8_t> serialize() const {
        core::BinarySerializer s;
        s.write_u32(static_cast<uint32_t>(peers.size()));
        for (const auto& peer : peers) {
            auto b = peer.serialize();
            s.write_bytes(b);
        }
        return s.take_data();
    }

    static PeersPayload deserialize(core::BinaryDeserializer& d) {
        PeersPayload p;
        uint32_t count = d.read_u32();
        p.peers.reserve(count);
        for (uint32_t i = 0; i < count; ++i) {
            auto b = d.read_bytes();
            core::BinaryDeserializer pd(b);
            p.peers.push_back(PeerEntry::deserialize(pd));
        }
        return p;
    }
};

struct GetHeadersPayload {
    core::BlockHeight from_height{0};
    uint32_t max_count{500};

    [[nodiscard]] std::vector<uint8_t> serialize() const {
        core::BinarySerializer s;
        s.write_u64(from_height);
        s.write_u32(max_count);
        return s.take_data();
    }

    static GetHeadersPayload deserialize(core::BinaryDeserializer& d) {
        GetHeadersPayload p;
        p.from_height = d.read_u64();
        p.max_count = d.read_u32();
        return p;
    }
};

struct HeadersPayload {
    std::vector<core::BlockHeader> headers;

    [[nodiscard]] std::vector<uint8_t> serialize() const {
        core::BinarySerializer s;
        s.write_u32(static_cast<uint32_t>(headers.size()));
        for (const auto& h : headers) {
            auto b = h.serialize();
            s.write_bytes(b);
        }
        return s.take_data();
    }

    static HeadersPayload deserialize(core::BinaryDeserializer& d) {
        HeadersPayload p;
        uint32_t count = d.read_u32();
        p.headers.reserve(count);
        for (uint32_t i = 0; i < count; ++i) {
            auto b = d.read_bytes();
            core::BinaryDeserializer hd(b);
            p.headers.push_back(core::BlockHeader::deserialize(hd));
        }
        return p;
    }
};

} // namespace blockbum::network
