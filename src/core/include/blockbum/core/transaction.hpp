#pragma once

#include "blockbum/core/types.hpp"
#include "blockbum/core/serializer.hpp"
#include <string>
#include <vector>
#include <cstdint>

namespace blockbum::core {

struct Transaction {
    uint32_t version{1};
    std::string sender;
    std::string recipient;
    Balance amount{0};
    Balance fee{0};
    Nonce nonce{0};
    std::vector<uint8_t> payload;
    TimestampMs timestamp{0};
    Hash256 tx_id{};

    [[nodiscard]] std::vector<uint8_t> serialize_for_id() const {
        BinarySerializer s;
        s.write_u32(version);
        s.write_string(sender);
        s.write_string(recipient);
        s.write_u64(amount);
        s.write_u64(fee);
        s.write_u64(nonce);
        s.write_bytes(payload);
        s.write_u64(timestamp);
        return s.take_data();
    }

    [[nodiscard]] std::vector<uint8_t> serialize() const {
        BinarySerializer s;
        s.write_u32(version);
        s.write_string(sender);
        s.write_string(recipient);
        s.write_u64(amount);
        s.write_u64(fee);
        s.write_u64(nonce);
        s.write_bytes(payload);
        s.write_u64(timestamp);
        s.write_hash(tx_id);
        return s.take_data();
    }

    static Transaction deserialize(BinaryDeserializer& d) {
        Transaction tx;
        tx.version = d.read_u32();
        tx.sender = d.read_string();
        tx.recipient = d.read_string();
        tx.amount = d.read_u64();
        tx.fee = d.read_u64();
        tx.nonce = d.read_u64();
        tx.payload = d.read_bytes();
        tx.timestamp = d.read_u64();
        tx.tx_id = d.read_hash();
        return tx;
    }
};

} // namespace blockbum::core
