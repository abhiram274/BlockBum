#pragma once

#include <cstdint>
#include <array>
#include <span>
#include <string>
#include <string_view>
#include <vector>

namespace blockbum::core {

/// 256-bit fixed-size hash (used for block hashes, transaction IDs, state roots)
using Hash256 = std::array<uint8_t, 32>;

/// 64-bit block height
using BlockHeight = uint64_t;

/// 64-bit timestamp in milliseconds (UTC)
using TimestampMs = uint64_t;

/// Native token balance represented in smallest divisible atomic units
using Balance = uint64_t;

/// Account nonce for transaction ordering and replay protection
using Nonce = uint64_t;

/// Helper to convert a byte span to a hex string
std::string to_hex(std::span<const uint8_t> bytes);

/// Helper to parse a hex string into a byte vector
std::vector<uint8_t> from_hex(std::string_view hex_str);

} // namespace blockbum::core
