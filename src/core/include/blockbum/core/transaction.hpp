#pragma once

#include "blockbum/core/types.hpp"
#include "blockbum/core/serializer.hpp"
#include <string>
#include <vector>
#include <cstdint>
#include <array>

namespace blockbum::core {

using Signature = std::array<uint8_t, 64>;
using PublicKey = std::array<uint8_t, 32>;

struct Transaction {
    uint32_t version{1};
    std::string sender;      // Hex representation of PublicKey or pseudonymous address
    std::string recipient;   // Recipient address or channel identifier
    Balance amount{0};
    Balance fee{0};
    Nonce nonce{0};
    std::vector<uint8_t> payload;
    TimestampMs timestamp{0};
    PublicKey sender_pubkey{};
    Signature signature{};
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
        s.write_bytes(sender_pubkey);
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
        s.write_bytes(sender_pubkey);
        s.write_bytes(signature);
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

        auto pub_bytes = d.read_bytes();
        if (pub_bytes.size() == 32) {
            std::copy(pub_bytes.begin(), pub_bytes.end(), tx.sender_pubkey.begin());
        }

        auto sig_bytes = d.read_bytes();
        if (sig_bytes.size() == 64) {
            std::copy(sig_bytes.begin(), sig_bytes.end(), tx.signature.begin());
        }

        tx.tx_id = d.read_hash();
        return tx;
    }
};

} // namespace blockbum::core
