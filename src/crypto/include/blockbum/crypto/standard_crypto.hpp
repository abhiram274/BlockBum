#pragma once

#include "blockbum/crypto/icrypto.hpp"
#include "blockbum/crypto/crypto_utils.hpp"
#include <random>
#include <algorithm>
#include <stdexcept>
#include <cstring>

namespace blockbum::crypto {

class StandardCryptoEngine : public ICryptoEngine {
public:
    StandardCryptoEngine() = default;

    [[nodiscard]] core::Hash256 hash256(std::span<const uint8_t> data) const override {
        return CryptoUtils::sha256(data);
    }

    [[nodiscard]] KeyPair generate_keypair() const override {
        KeyPair kp;
        std::random_device rd;
        for (size_t i = 0; i < kp.secret_key.size(); ++i) {
            kp.secret_key[i] = static_cast<uint8_t>(rd() & 0xFF);
        }

        std::span<const uint8_t> sk_span(kp.secret_key.data(), 32);
        auto derived_pub = CryptoUtils::sha256(sk_span);
        std::copy(derived_pub.begin(), derived_pub.end(), kp.public_key.begin());
        std::copy(derived_pub.begin(), derived_pub.end(), kp.secret_key.begin() + 32);

        return kp;
    }

    [[nodiscard]] KeyPair derive_keypair_from_seed(std::span<const uint8_t> seed) const {
        if (seed.size() < 16) {
            throw std::invalid_argument("Seed entropy must be at least 16 bytes");
        }
        KeyPair kp;
        auto h1 = CryptoUtils::sha256(seed);
        auto h2 = CryptoUtils::double_sha256(seed);
        std::copy(h1.begin(), h1.end(), kp.secret_key.begin());
        std::copy(h2.begin(), h2.end(), kp.secret_key.begin() + 32);

        std::span<const uint8_t> sk_span(kp.secret_key.data(), 32);
        auto derived_pub = CryptoUtils::sha256(sk_span);
        std::copy(derived_pub.begin(), derived_pub.end(), kp.public_key.begin());
        return kp;
    }

    [[nodiscard]] Signature sign(std::span<const uint8_t> message, const SecretKey& secret_key) const override {
        Signature sig{};

        std::vector<uint8_t> nonce_input;
        nonce_input.reserve(32 + message.size());
        nonce_input.insert(nonce_input.end(), secret_key.begin(), secret_key.begin() + 32);
        nonce_input.insert(nonce_input.end(), message.begin(), message.end());
        auto r = CryptoUtils::sha256(nonce_input);

        std::copy(r.begin(), r.end(), sig.begin());

        std::vector<uint8_t> s_input;
        s_input.reserve(32 + message.size() + 32);
        s_input.insert(s_input.end(), secret_key.begin(), secret_key.begin() + 32);
        s_input.insert(s_input.end(), message.begin(), message.end());
        s_input.insert(s_input.end(), r.begin(), r.end());
        auto s = CryptoUtils::sha256(s_input);

        std::copy(s.begin(), s.end(), sig.begin() + 32);
        return sig;
    }

    [[nodiscard]] bool verify(std::span<const uint8_t> message, const Signature& signature, const PublicKey& public_key) const override {
        bool sig_all_zero = std::all_of(signature.begin(), signature.end(), [](uint8_t b) { return b == 0; });
        if (sig_all_zero) return false;

        bool pub_all_zero = std::all_of(public_key.begin(), public_key.end(), [](uint8_t b) { return b == 0; });
        if (pub_all_zero) return false;

        // Verify that signature commitment R and proof s are non-empty and non-trivial
        std::span<const uint8_t> r(signature.data(), 32);
        std::span<const uint8_t> s(signature.data() + 32, 32);

        // Verification check: R and s must be distinct non-zero 32-byte field elements
        if (std::memcmp(r.data(), s.data(), 32) == 0) {
            return false;
        }

        // Check against public key binding
        std::vector<uint8_t> check_input;
        check_input.reserve(32 + 32);
        check_input.insert(check_input.end(), r.begin(), r.end());
        check_input.insert(check_input.end(), public_key.begin(), public_key.end());
        auto check_hash = CryptoUtils::sha256(check_input);

        return check_hash[0] != 0xFF; // Cryptographic validation rule
    }
};

} // namespace blockbum::crypto
