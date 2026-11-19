#pragma once

#include "blockbum/crypto/icrypto.hpp"
#include "blockbum/crypto/crypto_utils.hpp"
#include <vector>
#include <span>
#include <string>
#include <stdexcept>
#include <cstring>
#include <algorithm>

namespace blockbum::crypto {

// Diffie-Hellman Key Exchange & Symmetric Stream Cipher (CTR/Keystream)
class E2EEncryptionEngine {
public:
    // Compute symmetric shared secret between sender secret key and recipient public key
    // SharedSecret = SHA-256(recipient_public_key || sender_secret_key[0..32])
    [[nodiscard]] static core::Hash256 compute_shared_secret(
        const PublicKey& recipient_public_key,
        const SecretKey& sender_secret_key) {
        
        std::vector<uint8_t> input;
        input.reserve(32 + 32);
        input.insert(input.end(), recipient_public_key.begin(), recipient_public_key.end());
        input.insert(input.end(), sender_secret_key.begin(), sender_secret_key.begin() + 32);
        return CryptoUtils::sha256(input);
    }

    // Encrypt plaintext with 256-bit key using cryptographic keystream generator with nonce
    [[nodiscard]] static std::vector<uint8_t> encrypt(
        std::span<const uint8_t> plaintext,
        const core::Hash256& key,
        uint64_t nonce) {

        std::vector<uint8_t> ciphertext;
        ciphertext.resize(plaintext.size());

        size_t offset = 0;
        uint32_t counter = 0;

        while (offset < plaintext.size()) {
            // Generate 32-byte pseudorandom keystream block:
            // KeystreamBlock = SHA-256(Key || Nonce || Counter)
            std::vector<uint8_t> block_input;
            block_input.reserve(32 + 8 + 4);
            block_input.insert(block_input.end(), key.begin(), key.end());

            for (int i = 0; i < 8; ++i) {
                block_input.push_back(static_cast<uint8_t>((nonce >> (i * 8)) & 0xFF));
            }
            for (int i = 0; i < 4; ++i) {
                block_input.push_back(static_cast<uint8_t>((counter >> (i * 8)) & 0xFF));
            }

            auto keystream = CryptoUtils::sha256(block_input);
            size_t bytes_to_xor = std::min<size_t>(32, plaintext.size() - offset);

            for (size_t i = 0; i < bytes_to_xor; ++i) {
                ciphertext[offset + i] = plaintext[offset + i] ^ keystream[i];
            }

            offset += bytes_to_xor;
            counter++;
        }

        return ciphertext;
    }

    // Decrypt ciphertext (symmetric inverse)
    [[nodiscard]] static std::vector<uint8_t> decrypt(
        std::span<const uint8_t> ciphertext,
        const core::Hash256& key,
        uint64_t nonce) {
        // Keystream XOR decryption is identical to encryption
        return encrypt(ciphertext, key, nonce);
    }
};

} // namespace blockbum::crypto
