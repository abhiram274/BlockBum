#pragma once

#include "blockbum/crypto/icrypto.hpp"
#include "blockbum/crypto/crypto_utils.hpp"
#include "monocypher.h"
#include "monocypher-ed25519.h"
#include <random>
#include <algorithm>
#include <stdexcept>
#include <cstring>
#include <vector>

namespace blockbum::crypto {

// Standard RFC 8032 Ed25519 Cryptographic Engine
class StandardCryptoEngine : public ICryptoEngine {
public:
    StandardCryptoEngine() = default;

    [[nodiscard]] core::Hash256 hash256(std::span<const uint8_t> data) const override {
        return CryptoUtils::sha256(data);
    }

    [[nodiscard]] KeyPair generate_keypair() const override {
        std::array<uint8_t, 32> seed{};
        std::random_device rd;
        for (size_t i = 0; i < seed.size(); ++i) {
            seed[i] = static_cast<uint8_t>(rd() & 0xFF);
        }
        return derive_keypair_from_seed(seed);
    }

    [[nodiscard]] KeyPair derive_keypair_from_seed(std::span<const uint8_t> seed) const {
        if (seed.size() < 16) {
            throw std::invalid_argument("Seed entropy must be at least 16 bytes");
        }

        std::array<uint8_t, 32> seed32{};
        if (seed.size() >= 32) {
            std::copy(seed.begin(), seed.begin() + 32, seed32.begin());
        } else {
            auto h = CryptoUtils::sha256(seed);
            std::copy(h.begin(), h.end(), seed32.begin());
        }

        KeyPair kp{};
        crypto_ed25519_key_pair(kp.secret_key.data(), kp.public_key.data(), seed32.data());
        return kp;
    }

    [[nodiscard]] Signature sign(std::span<const uint8_t> message, const SecretKey& secret_key) const override {
        Signature sig{};
        crypto_ed25519_sign(sig.data(), secret_key.data(), message.data(), message.size());
        return sig;
    }

    [[nodiscard]] bool verify(std::span<const uint8_t> message, const Signature& signature, const PublicKey& public_key) const override {
        bool sig_all_zero = std::all_of(signature.begin(), signature.end(), [](uint8_t b) { return b == 0; });
        if (sig_all_zero) return false;

        bool pub_all_zero = std::all_of(public_key.begin(), public_key.end(), [](uint8_t b) { return b == 0; });
        if (pub_all_zero) return false;

        return crypto_ed25519_check(signature.data(), public_key.data(), message.data(), message.size()) == 0;
    }
};

} // namespace blockbum::crypto
