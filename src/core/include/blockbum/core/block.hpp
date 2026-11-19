#pragma once

#include "blockbum/core/types.hpp"
#include "blockbum/core/serializer.hpp"
#include "blockbum/core/transaction.hpp"
#include <vector>
#include <cstdint>

namespace blockbum::core {

struct BlockHeader {
    uint32_t version{1};
    BlockHeight height{0};
    Hash256 previous_hash{};
    Hash256 merkle_root{};
    TimestampMs timestamp{0};
    uint64_t nonce{0};

    [[nodiscard]] std::vector<uint8_t> serialize() const {
        BinarySerializer s;
        s.write_u32(version);
        s.write_u64(height);
        s.write_hash(previous_hash);
        s.write_hash(merkle_root);
        s.write_u64(timestamp);
        s.write_u64(nonce);
        return s.take_data();
    }

    static BlockHeader deserialize(BinaryDeserializer& d) {
        BlockHeader h;
        h.version = d.read_u32();
        h.height = d.read_u64();
        h.previous_hash = d.read_hash();
        h.merkle_root = d.read_hash();
        h.timestamp = d.read_u64();
        h.nonce = d.read_u64();
        return h;
    }
};

struct Block {
    BlockHeader header;
    std::vector<Transaction> transactions;
    Hash256 block_hash{};

    [[nodiscard]] std::vector<uint8_t> serialize() const {
        BinarySerializer s;
        auto header_bytes = header.serialize();
        s.write_bytes(header_bytes);
        s.write_u32(static_cast<uint32_t>(transactions.size()));
        for (const auto& tx : transactions) {
            auto tx_bytes = tx.serialize();
            s.write_bytes(tx_bytes);
        }
        s.write_hash(block_hash);
        return s.take_data();
    }

    static Block deserialize(BinaryDeserializer& d) {
        Block b;
        auto header_bytes = d.read_bytes();
        BinaryDeserializer header_d(header_bytes);
        b.header = BlockHeader::deserialize(header_d);

        uint32_t tx_count = d.read_u32();
        b.transactions.reserve(tx_count);
        for (uint32_t i = 0; i < tx_count; ++i) {
            auto tx_bytes = d.read_bytes();
            BinaryDeserializer tx_d(tx_bytes);
            b.transactions.push_back(Transaction::deserialize(tx_d));
        }

        b.block_hash = d.read_hash();
        return b;
    }
};

} // namespace blockbum::core
