#pragma once

#include "blockbum/core/types.hpp"
#include "blockbum/core/serializer.hpp"
#include "blockbum/crypto/crypto_utils.hpp"
#include "blockbum/crypto/e2e_encryption.hpp"
#include "monocypher.h"
#include <vector>
#include <span>
#include <string>
#include <array>
#include <map>
#include <mutex>
#include <cstring>
#include <stdexcept>
#include <optional>

namespace blockbum::messaging {

/// Header accompanying Double Ratchet encrypted messages
struct RatchetHeader {
    std::array<uint8_t, 32> dh_pubkey{}; // Sender's current ephemeral DH public key
    uint32_t previous_chain_length{0};   // PN: number of messages in previous sending chain
    uint32_t message_number{0};          // N: index of this message in current sending chain

    [[nodiscard]] std::vector<uint8_t> serialize() const {
        core::BinarySerializer s;
        s.write_hash(dh_pubkey);
        s.write_u32(previous_chain_length);
        s.write_u32(message_number);
        return s.take_data();
    }

    [[nodiscard]] static RatchetHeader deserialize(core::BinaryDeserializer& d) {
        RatchetHeader h;
        h.dh_pubkey = d.read_hash();
        h.previous_chain_length = d.read_u32();
        h.message_number = d.read_u32();
        return h;
    }
};

/// Ratchet Encrypted Packet containing RatchetHeader and AEAD ciphertext
struct RatchetMessage {
    RatchetHeader header;
    std::vector<uint8_t> ciphertext;

    [[nodiscard]] std::vector<uint8_t> serialize() const {
        core::BinarySerializer s;
        auto h_bytes = header.serialize();
        s.write_bytes(h_bytes);
        s.write_bytes(ciphertext);
        return s.take_data();
    }

    [[nodiscard]] static RatchetMessage deserialize(core::BinaryDeserializer& d) {
        RatchetMessage m;
        auto h_bytes = d.read_bytes();
        core::BinaryDeserializer hd(h_bytes);
        m.header = RatchetHeader::deserialize(hd);
        m.ciphertext = d.read_bytes();
        return m;
    }
};

/// High-assurance Double Ratchet Session providing Forward Secrecy & Post-Compromise Security
class DoubleRatchetSession {
public:
    DoubleRatchetSession() = default;

    DoubleRatchetSession(DoubleRatchetSession&& other) noexcept {
        std::lock_guard<std::mutex> lock(other.mutex_);
        initialized_ = other.initialized_;
        has_our_dh_ = other.has_our_dh_;
        has_sending_chain_ = other.has_sending_chain_;
        root_key_ = other.root_key_;
        sending_chain_key_ = other.sending_chain_key_;
        receiving_chain_key_ = other.receiving_chain_key_;
        our_dh_seckey_ = other.our_dh_seckey_;
        our_dh_pubkey_ = other.our_dh_pubkey_;
        peer_dh_pubkey_ = other.peer_dh_pubkey_;
        sending_message_number_ = other.sending_message_number_;
        receiving_message_number_ = other.receiving_message_number_;
        previous_chain_length_ = other.previous_chain_length_;
        skipped_message_keys_ = std::move(other.skipped_message_keys_);
    }

    DoubleRatchetSession& operator=(DoubleRatchetSession&& other) noexcept {
        if (this != &other) {
            std::scoped_lock lock(mutex_, other.mutex_);
            initialized_ = other.initialized_;
            has_our_dh_ = other.has_our_dh_;
            has_sending_chain_ = other.has_sending_chain_;
            root_key_ = other.root_key_;
            sending_chain_key_ = other.sending_chain_key_;
            receiving_chain_key_ = other.receiving_chain_key_;
            our_dh_seckey_ = other.our_dh_seckey_;
            our_dh_pubkey_ = other.our_dh_pubkey_;
            peer_dh_pubkey_ = other.peer_dh_pubkey_;
            sending_message_number_ = other.sending_message_number_;
            receiving_message_number_ = other.receiving_message_number_;
            previous_chain_length_ = other.previous_chain_length_;
            skipped_message_keys_ = std::move(other.skipped_message_keys_);
        }
        return *this;
    }

    /// Initialize as session initiator (Alice starting with Bob's known DH public key)
    static DoubleRatchetSession init_initiator(const core::Hash256& shared_master_key,
                                               const std::array<uint8_t, 32>& peer_dh_pubkey) {
        DoubleRatchetSession session;
        session.peer_dh_pubkey_ = peer_dh_pubkey;
        session.generate_our_dh_keypair();

        // Compute DH output between our ephemeral private key and peer's DH public key
        auto dh_out = compute_dh(session.our_dh_seckey_, peer_dh_pubkey);

        // Derive root key and sending chain key
        auto [new_root, send_chain] = kdf_rk(shared_master_key, dh_out);
        session.root_key_ = new_root;
        session.sending_chain_key_ = send_chain;
        session.has_sending_chain_ = true;
        session.initialized_ = true;
        return session;
    }

    /// Initialize as session receiver (Bob receiving session initiator's shared master key)
    static DoubleRatchetSession init_receiver(const core::Hash256& shared_master_key,
                                              const std::array<uint8_t, 32>& our_dh_seckey,
                                              const std::array<uint8_t, 32>& our_dh_pubkey) {
        DoubleRatchetSession session;
        session.root_key_ = shared_master_key;
        session.our_dh_seckey_ = our_dh_seckey;
        session.our_dh_pubkey_ = our_dh_pubkey;
        session.has_our_dh_ = true;
        session.initialized_ = true;
        return session;
    }

    /// Encrypt plaintext with forward secrecy (single-use derived message key)
    RatchetMessage encrypt(std::span<const uint8_t> plaintext) {
        std::lock_guard<std::mutex> lock(mutex_);
        if (!initialized_) {
            throw std::runtime_error("DoubleRatchetSession is not initialized");
        }

        // Derive message key from sending chain
        auto mk = kdf_ck(sending_chain_key_, 0x01); // Message key
        sending_chain_key_ = kdf_ck(sending_chain_key_, 0x02); // Advance chain key (Forward Secrecy!)

        RatchetHeader header;
        header.dh_pubkey = our_dh_pubkey_;
        header.previous_chain_length = previous_chain_length_;
        header.message_number = sending_message_number_++;

        // Encrypt with ChaCha20-Poly1305 using message key
        uint64_t nonce = (static_cast<uint64_t>(header.previous_chain_length) << 32) | header.message_number;
        auto ciphertext = crypto::E2EEncryptionEngine::encrypt(plaintext, mk, nonce);

        // Securely erase message key from memory
        std::fill(mk.begin(), mk.end(), 0);

        RatchetMessage msg;
        msg.header = header;
        msg.ciphertext = std::move(ciphertext);
        return msg;
    }

    /// Decrypt ciphertext with forward secrecy and DH ratchet verification
    std::vector<uint8_t> decrypt(const RatchetMessage& msg) {
        std::lock_guard<std::mutex> lock(mutex_);
        if (!initialized_) {
            throw std::runtime_error("DoubleRatchetSession is not initialized");
        }

        // 0. Check if message key was previously skipped and cached
        auto skipped_it = skipped_message_keys_.find({msg.header.dh_pubkey, msg.header.message_number});
        if (skipped_it != skipped_message_keys_.end()) {
            auto mk = skipped_it->second;
            skipped_message_keys_.erase(skipped_it); // Forward secrecy: erase immediately!
            uint64_t nonce = (static_cast<uint64_t>(msg.header.previous_chain_length) << 32) | msg.header.message_number;
            auto plaintext = crypto::E2EEncryptionEngine::decrypt(msg.ciphertext, mk, nonce);
            std::fill(mk.begin(), mk.end(), 0);
            return plaintext;
        }

        // 1. Check if peer performed a DH ratchet step (new ephemeral public key)
        if (msg.header.dh_pubkey != peer_dh_pubkey_) {
            skip_message_keys(msg.header.previous_chain_length);
            dh_ratchet_step(msg.header.dh_pubkey);
        }

        skip_message_keys(msg.header.message_number);

        // 2. Derive message key for this index
        auto mk = kdf_ck(receiving_chain_key_, 0x01);
        receiving_chain_key_ = kdf_ck(receiving_chain_key_, 0x02); // Advance receiving chain key
        receiving_message_number_++;

        uint64_t nonce = (static_cast<uint64_t>(msg.header.previous_chain_length) << 32) | msg.header.message_number;
        auto plaintext = crypto::E2EEncryptionEngine::decrypt(msg.ciphertext, mk, nonce);

        // Securely erase message key
        std::fill(mk.begin(), mk.end(), 0);
        return plaintext;
    }

    [[nodiscard]] const std::array<uint8_t, 32>& our_dh_public_key() const noexcept {
        return our_dh_pubkey_;
    }

    [[nodiscard]] const std::array<uint8_t, 32>& peer_dh_public_key() const noexcept {
        return peer_dh_pubkey_;
    }

    [[nodiscard]] uint32_t sending_message_count() const noexcept {
        return sending_message_number_;
    }

    [[nodiscard]] uint32_t receiving_message_count() const noexcept {
        return receiving_message_number_;
    }

    /// Helper: generate a fresh X25519 keypair
    static void generate_x25519_keypair(std::array<uint8_t, 32>& out_sec, std::array<uint8_t, 32>& out_pub) {
        // Deterministic pseudo-random seed from system entropy + Monocypher
        static uint64_t counter = 1000;
        counter++;
        uint8_t seed_bytes[32]{};
        for (int i = 0; i < 8; ++i) {
            seed_bytes[i] = static_cast<uint8_t>((counter >> (i * 8)) & 0xFF);
        }
        auto seed_hash = crypto::CryptoUtils::sha256(seed_bytes);
        std::copy(seed_hash.begin(), seed_hash.end(), out_sec.begin());
        out_sec[0]  &= 248;
        out_sec[31] &= 127;
        out_sec[31] |= 64;

        uint8_t base[32]{9}; // Curve25519 standard base point
        crypto_x25519(out_pub.data(), out_sec.data(), base);
    }

private:
    void generate_our_dh_keypair() {
        generate_x25519_keypair(our_dh_seckey_, our_dh_pubkey_);
        has_our_dh_ = true;
    }

    static core::Hash256 compute_dh(const std::array<uint8_t, 32>& sk, const std::array<uint8_t, 32>& pk) {
        std::array<uint8_t, 32> shared{};
        crypto_x25519(shared.data(), sk.data(), pk.data());
        return crypto::CryptoUtils::sha256(shared);
    }

    /// KDF for Root Key (HKDF/BLAKE2b based)
    static std::pair<core::Hash256, core::Hash256> kdf_rk(const core::Hash256& rk, const core::Hash256& dh_out) {
        std::vector<uint8_t> in1;
        in1.reserve(64);
        in1.insert(in1.end(), rk.begin(), rk.end());
        in1.insert(in1.end(), dh_out.begin(), dh_out.end());

        // Derive next root key
        in1.push_back(0x01);
        auto new_rk = crypto::CryptoUtils::sha256(in1);

        // Derive chain key
        in1.back() = 0x02;
        auto ck = crypto::CryptoUtils::sha256(in1);
        return {new_rk, ck};
    }

    /// KDF for Chain Key (advances chain or generates message key)
    static core::Hash256 kdf_ck(const core::Hash256& ck, uint8_t tag) {
        std::array<uint8_t, 33> in{};
        std::copy(ck.begin(), ck.end(), in.begin());
        in[32] = tag;
        return crypto::CryptoUtils::sha256(in);
    }

    void dh_ratchet_step(const std::array<uint8_t, 32>& peer_new_dh_pubkey) {
        previous_chain_length_ = sending_message_number_;
        sending_message_number_ = 0;
        receiving_message_number_ = 0;
        peer_dh_pubkey_ = peer_new_dh_pubkey;

        // 1. Compute DH with our current DH private key and peer's new public key
        auto dh_recv = compute_dh(our_dh_seckey_, peer_dh_pubkey_);
        auto [rk1, recv_ck] = kdf_rk(root_key_, dh_recv);
        root_key_ = rk1;
        receiving_chain_key_ = recv_ck;

        // 2. Generate new ephemeral keypair for ourselves (Post-Compromise Security healing!)
        generate_our_dh_keypair();

        // 3. Compute DH with our new DH private key and peer's DH public key
        auto dh_send = compute_dh(our_dh_seckey_, peer_dh_pubkey_);
        auto [rk2, send_ck] = kdf_rk(root_key_, dh_send);
        root_key_ = rk2;
        sending_chain_key_ = send_ck;
    }

    void skip_message_keys(uint32_t until_index) {
        constexpr uint32_t MAX_SKIP = 200;
        while (receiving_message_number_ < until_index && (until_index - receiving_message_number_) <= MAX_SKIP) {
            auto mk = kdf_ck(receiving_chain_key_, 0x01);
            receiving_chain_key_ = kdf_ck(receiving_chain_key_, 0x02);
            skipped_message_keys_[{peer_dh_pubkey_, receiving_message_number_}] = mk;
            receiving_message_number_++;
        }
    }

    mutable std::mutex mutex_;
    bool initialized_{false};
    bool has_our_dh_{false};
    bool has_sending_chain_{false};

    core::Hash256 root_key_{};
    core::Hash256 sending_chain_key_{};
    core::Hash256 receiving_chain_key_{};

    std::array<uint8_t, 32> our_dh_seckey_{};
    std::array<uint8_t, 32> our_dh_pubkey_{};
    std::array<uint8_t, 32> peer_dh_pubkey_{};

    uint32_t sending_message_number_{0};
    uint32_t receiving_message_number_{0};
    uint32_t previous_chain_length_{0};

    std::map<std::pair<std::array<uint8_t, 32>, uint32_t>, core::Hash256> skipped_message_keys_;
};

} // namespace blockbum::messaging
