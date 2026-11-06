#pragma once

#include "blockbum/core/types.hpp"
#include <array>
#include <span>
#include <string>
#include <vector>

namespace blockbum::crypto {

/// Ed25519 public key (32 bytes)
using PublicKey = std::array<uint8_t, 32>;

/// Ed25519 private / secret key (64 bytes)
using SecretKey = std::array<uint8_t, 64>;

/// Ed25519 signature (64 bytes)
using Signature = std::array<uint8_t, 64>;

/// Keypair container
struct KeyPair {
    PublicKey public_key;
    SecretKey secret_key;
};

/// Abstract interface for cryptographic operations
/// Allows mocking in unit tests and interchangeable backend providers
class ICryptoEngine {
public:
    virtual ~ICryptoEngine() = default;

    /// Compute cryptographic 256-bit hash (BLAKE3 / BLAKE2b)
    [[nodiscard]] virtual core::Hash256 hash256(std::span<const uint8_t> data) const = 0;

    /// Generate a fresh cryptographically secure Ed25519 keypair
    [[nodiscard]] virtual KeyPair generate_keypair() const = 0;

    /// Sign data using the given secret key
    [[nodiscard]] virtual Signature sign(std::span<const uint8_t> message, const SecretKey& secret_key) const = 0;

    /// Verify signature with public key
    [[nodiscard]] virtual bool verify(std::span<const uint8_t> message, const Signature& signature, const PublicKey& public_key) const = 0;
};

} // namespace blockbum::crypto
