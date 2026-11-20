#pragma once

#include "blockbum/crypto/icrypto.hpp"
#include "blockbum/crypto/crypto_utils.hpp"
#include "monocypher.h"
#include "monocypher-ed25519.h"
#include <vector>
#include <span>
#include <string>
#include <stdexcept>
#include <cstring>
#include <algorithm>
#include <array>

namespace blockbum::crypto {

// Standard X25519 Diffie-Hellman Key Exchange & Authenticated AEAD Encryption (ChaCha20-Poly1305)
class E2EEncryptionEngine {
public:
    // RFC 7748 X25519 Diffie-Hellman Key Agreement:
    // Derives symmetric shared secret between two Ed25519 identities
    [[nodiscard]] static core::Hash256 compute_shared_secret(
        const PublicKey& peer_public_key,
        const PublicKey& my_public_key,
        const SecretKey& my_secret_key) {

        (void)my_public_key;

        // 1. Convert peer's Ed25519 public key to Curve25519 (X25519)
        uint8_t peer_x_pk[32]{};
        crypto_eddsa_to_x25519(peer_x_pk, peer_public_key.data());

        // 2. Derive X25519 private scalar from Ed25519 32-byte secret seed via SHA-512 + clamping
        uint8_t hash[64]{};
        crypto_sha512(hash, my_secret_key.data(), 32);

        uint8_t my_x_sk[32]{};
        std::memcpy(my_x_sk, hash, 32);
        my_x_sk[0]  &= 248;
        my_x_sk[31] &= 127;
        my_x_sk[31] |= 64;

        // 3. Perform standard X25519 scalar multiplication
        uint8_t raw_shared[32]{};
        crypto_x25519(raw_shared, my_x_sk, peer_x_pk);

        // 4. Hash raw shared secret with SHA-256 for uniform key distribution
        return CryptoUtils::sha256(std::span<const uint8_t>(raw_shared, 32));
    }

    // Authenticated encryption (AEAD) with 256-bit key and 128-bit Poly1305 authentication tag
    [[nodiscard]] static std::vector<uint8_t> encrypt(
        std::span<const uint8_t> plaintext,
        const core::Hash256& key,
        uint64_t nonce) {

        uint8_t nonce24[24]{};
        for (int i = 0; i < 8; ++i) {
            nonce24[i] = static_cast<uint8_t>((nonce >> (i * 8)) & 0xFF);
        }
        const char tag[16] = "BLOCKBUM_AEAD_1";
        std::memcpy(nonce24 + 8, tag, 16);

        std::vector<uint8_t> output(plaintext.size() + 16);
        crypto_aead_lock(output.data(), output.data() + plaintext.size(),
                         key.data(), nonce24,
                         nullptr, 0,
                         plaintext.data(), plaintext.size());
        return output;
    }

    // Authenticated decryption (symmetric inverse): verifies Poly1305 MAC tag before returning plaintext
    [[nodiscard]] static std::vector<uint8_t> decrypt(
        std::span<const uint8_t> ciphertext,
        const core::Hash256& key,
        uint64_t nonce) {

        if (ciphertext.size() < 16) {
            return {};
        }

        uint8_t nonce24[24]{};
        for (int i = 0; i < 8; ++i) {
            nonce24[i] = static_cast<uint8_t>((nonce >> (i * 8)) & 0xFF);
        }
        const char tag[16] = "BLOCKBUM_AEAD_1";
        std::memcpy(nonce24 + 8, tag, 16);

        size_t pt_size = ciphertext.size() - 16;
        std::vector<uint8_t> plaintext(pt_size);
        const uint8_t* mac = ciphertext.data() + pt_size;

        if (crypto_aead_unlock(plaintext.data(), mac,
                               key.data(), nonce24,
                               nullptr, 0,
                               ciphertext.data(), pt_size) != 0) {
            return {}; // MAC authentication failed: message corrupted or forged
        }
        return plaintext;
    }
};

} // namespace blockbum::crypto
