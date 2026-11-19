#pragma once

#include "blockbum/core/types.hpp"
#include "blockbum/core/serializer.hpp"
#include "blockbum/crypto/icrypto.hpp"
#include <string>
#include <vector>
#include <cstdint>

namespace blockbum::messaging {

enum class MessageCategory : uint8_t {
    Direct = 1,
    Group = 2,
    DeliveryAck = 3
};

struct SecureMessage {
    std::string message_id;        // Deterministic ID = SHA-256(sender || recipient || sequence || ciphertext)
    MessageCategory category{MessageCategory::Direct};
    std::string sender_address;    // bb1... address
    crypto::PublicKey sender_pubkey{};
    std::string recipient_address; // bb1... address or group_id
    uint64_t sequence_number{0};   // Monotonic ordering
    uint64_t timestamp{0};
    uint64_t nonce{0};             // Encryption nonce
    std::vector<uint8_t> ciphertext;
    crypto::Signature signature{}; // Signature proving sender authorship

    [[nodiscard]] std::vector<uint8_t> serialize_for_signature() const {
        core::BinarySerializer s;
        s.write_u8(static_cast<uint8_t>(category));
        s.write_string(sender_address);
        s.write_bytes(sender_pubkey);
        s.write_string(recipient_address);
        s.write_u64(sequence_number);
        s.write_u64(timestamp);
        s.write_u64(nonce);
        s.write_bytes(ciphertext);
        return s.take_data();
    }

    [[nodiscard]] std::vector<uint8_t> serialize() const {
        core::BinarySerializer s;
        s.write_string(message_id);
        s.write_u8(static_cast<uint8_t>(category));
        s.write_string(sender_address);
        s.write_bytes(sender_pubkey);
        s.write_string(recipient_address);
        s.write_u64(sequence_number);
        s.write_u64(timestamp);
        s.write_u64(nonce);
        s.write_bytes(ciphertext);
        s.write_bytes(signature);
        return s.take_data();
    }

    static SecureMessage deserialize(core::BinaryDeserializer& d) {
        SecureMessage m;
        m.message_id = d.read_string();
        m.category = static_cast<MessageCategory>(d.read_u8());
        m.sender_address = d.read_string();

        auto pub_bytes = d.read_bytes();
        if (pub_bytes.size() == 32) {
            std::copy(pub_bytes.begin(), pub_bytes.end(), m.sender_pubkey.begin());
        }

        m.recipient_address = d.read_string();
        m.sequence_number = d.read_u64();
        m.timestamp = d.read_u64();
        m.nonce = d.read_u64();
        m.ciphertext = d.read_bytes();

        auto sig_bytes = d.read_bytes();
        if (sig_bytes.size() == 64) {
            std::copy(sig_bytes.begin(), sig_bytes.end(), m.signature.begin());
        }

        return m;
    }
};

struct DeliveryAck {
    std::string original_message_id;
    std::string recipient_address;
    uint64_t ack_timestamp{0};
    crypto::Signature ack_signature{};
};

} // namespace blockbum::messaging
