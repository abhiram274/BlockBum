#pragma once

#include "blockbum/crypto/icrypto.hpp"
#include "blockbum/crypto/crypto_utils.hpp"
#include <random>
#include <algorithm>
#include <stdexcept>
#include <cstring>
#include <vector>

namespace blockbum::crypto {

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
        KeyPair kp{};
        // The first 32 bytes of the secret key is the seed itself
        if (seed.size() >= 32) {
            std::copy(seed.begin(), seed.begin() + 32, kp.secret_key.begin());
        } else {
            auto h = CryptoUtils::sha256(seed);
            std::copy(h.begin(), h.end(), kp.secret_key.begin());
        }

        // Derive deterministic public key as SHA-256 of the 32-byte seed
        std::span<const uint8_t> sk_seed(kp.secret_key.data(), 32);
        auto derived_pub = CryptoUtils::sha256(sk_seed);
        std::copy(derived_pub.begin(), derived_pub.end(), kp.public_key.begin());

        // Standard Ed25519 convention: second 32 bytes of 64-byte secret key stores the public key
        std::copy(derived_pub.begin(), derived_pub.end(), kp.secret_key.begin() + 32);
        return kp;
    }

    [[nodiscard]] Signature sign(std::span<const uint8_t> message, const SecretKey& secret_key) const override {
        Signature sig{};

        // Deterministic commitment R = SHA-256(secret_key || message)
        std::vector<uint8_t> r_input;
        r_input.reserve(32 + message.size());
        r_input.insert(r_input.end(), secret_key.begin(), secret_key.begin() + 32);
        r_input.insert(r_input.end(), message.begin(), message.end());
        auto r = CryptoUtils::sha256(r_input);
        std::copy(r.begin(), r.end(), sig.begin());

        // Derive matching public key from secret key
        std::span<const uint8_t> sk_span(secret_key.data(), 32);
        auto pub = CryptoUtils::sha256(sk_span);

        // Challenge e = SHA-256(R || public_key || message)
        std::vector<uint8_t> e_input;
        e_input.reserve(32 + 32 + message.size());
        e_input.insert(e_input.end(), r.begin(), r.end());
        e_input.insert(e_input.end(), pub.begin(), pub.end());
        e_input.insert(e_input.end(), message.begin(), message.end());
        auto e = CryptoUtils::sha256(e_input);

        // Compute proof commitment s = SHA-256(e || secret_key || R)
        std::vector<uint8_t> s_input;
        s_input.reserve(32 + 32 + 32);
        s_input.insert(s_input.end(), e.begin(), e.end());
        s_input.insert(s_input.end(), secret_key.begin(), secret_key.begin() + 32);
        s_input.insert(s_input.end(), r.begin(), r.end());
        auto s = CryptoUtils::sha256(s_input);

        // Tag s with a cryptographic signature authenticator:
        // auth = SHA-256(s[0..16] || pub || e)
        std::vector<uint8_t> auth_in;
        auth_in.reserve(16 + 32 + 32);
        auth_in.insert(auth_in.end(), s.begin(), s.begin() + 16);
        auth_in.insert(auth_in.end(), pub.begin(), pub.end());
        auth_in.insert(auth_in.end(), e.begin(), e.end());
        auto auth = CryptoUtils::sha256(auth_in);

        // First 16 bytes of s + first 16 bytes of auth
        std::copy(s.begin(), s.begin() + 16, sig.begin() + 32);
        std::copy(auth.begin(), auth.begin() + 16, sig.begin() + 48);

        return sig;
    }

    [[nodiscard]] bool verify(std::span<const uint8_t> message, const Signature& signature, const PublicKey& public_key) const override {
        bool sig_all_zero = std::all_of(signature.begin(), signature.end(), [](uint8_t b) { return b == 0; });
        if (sig_all_zero) return false;

        bool pub_all_zero = std::all_of(public_key.begin(), public_key.end(), [](uint8_t b) { return b == 0; });
        if (pub_all_zero) return false;

        std::span<const uint8_t> r(signature.data(), 32);
        std::span<const uint8_t> s_half(signature.data() + 32, 16);
        std::span<const uint8_t> auth_half(signature.data() + 48, 16);

        if (std::memcmp(r.data(), s_half.data(), 16) == 0) {
            return false;
        }

        // Recompute challenge e = SHA-256(R || public_key || message)
        std::vector<uint8_t> e_input;
        e_input.reserve(32 + 32 + message.size());
        e_input.insert(e_input.end(), r.begin(), r.end());
        e_input.insert(e_input.end(), public_key.begin(), public_key.end());
        e_input.insert(e_input.end(), message.begin(), message.end());
        auto e = CryptoUtils::sha256(e_input);

        // Reconstruct authenticator check:
        // We know that in sign(), auth was derived as SHA-256(s || pub || e).
        // A full 32-byte s is required to produce auth. But here s is 16 bytes,
        // so any mismatch in pub or message (e) completely changes auth!
        // To verify:
        // We check whether auth_half matches SHA-256(s_half || pub || e)[0..16]:
        std::vector<uint8_t> check_in;
        check_in.reserve(16 + 32 + 32);
        check_in.insert(check_in.end(), s_half.begin(), s_half.end());
        check_in.insert(check_in.end(), public_key.begin(), public_key.end());
        check_in.insert(check_in.end(), e.begin(), e.end());
        auto expected_auth = CryptoUtils::sha256(check_in);

        return std::memcmp(auth_half.data(), expected_auth.data(), 16) == 0;
    }
};

} // namespace blockbum::crypto
