#pragma once

#include "blockbum/core/types.hpp"
#include "blockbum/core/block.hpp"
#include "blockbum/crypto/crypto_utils.hpp"
#include <string>
#include <vector>
#include <optional>
#include <algorithm>
#include <cstdint>
#include <cstring>
#include <iostream>

namespace blockbum::consensus {

// Abstract interface for consensus engines (PoW, PoA, BFT)
class IConsensusEngine {
public:
    virtual ~IConsensusEngine() = default;

    // Validate block validity according to specific consensus rules
    [[nodiscard]] virtual bool validate_block_consensus(
        const core::Block& block,
        const std::optional<core::Block>& parent) const = 0;

    // Calculate work/weight contributed by a block
    [[nodiscard]] virtual uint64_t calculate_block_work(const core::BlockHeader& header) const = 0;

    // Return human-readable consensus engine name
    [[nodiscard]] virtual const char* name() const noexcept = 0;
};

// =========================================================================
// 1. Proof-of-Authority (PoA) Consensus Engine (DevNet & Local Testing)
// =========================================================================

class PoAConsensusEngine : public IConsensusEngine {
public:
    explicit PoAConsensusEngine(std::vector<std::string> authorized_validators = {})
        : validators_(std::move(authorized_validators)) {
        std::sort(validators_.begin(), validators_.end());
    }

    [[nodiscard]] std::string get_scheduled_proposer(core::BlockHeight height) const {
        if (validators_.empty()) {
            return "DevNode";
        }
        size_t idx = static_cast<size_t>(height % validators_.size());
        return validators_[idx];
    }

    [[nodiscard]] bool is_authorized(const std::string& validator_id) const {
        if (validators_.empty()) return true;
        return std::binary_search(validators_.begin(), validators_.end(), validator_id);
    }

    [[nodiscard]] bool validate_block_consensus(
        const core::Block& block,
        const std::optional<core::Block>& parent) const override {
        (void)parent;
        if (validators_.empty()) return true;

        std::string expected_proposer = get_scheduled_proposer(block.header.height);
        if (block.transactions.empty()) {
            return false;
        }

        const auto& coinbase_or_proposer_tx = block.transactions[0];
        if (coinbase_or_proposer_tx.sender != expected_proposer) {
            return false;
        }

        return true;
    }

    [[nodiscard]] uint64_t calculate_block_work(const core::BlockHeader& header) const override {
        (void)header;
        return 1; // PoA uniform weight per block
    }

    [[nodiscard]] const char* name() const noexcept override {
        return "PoA-DevNet";
    }

private:
    std::vector<std::string> validators_;
};

// Backward-compatibility alias
using DevNetConsensus = PoAConsensusEngine;

// =========================================================================
// 2. Permissionless Proof-of-Work (PoW) Nakamoto Consensus Engine
// =========================================================================

class PoWConsensusEngine : public IConsensusEngine {
public:
    // Parameters:
    // - initial_difficulty_bits: target leading zero bits (e.g. 8 bits for dev, 16-24 for testnet)
    // - target_block_time_s: target seconds per block (e.g. 10s)
    // - retarget_interval: blocks between dynamic difficulty retargeting
    explicit PoWConsensusEngine(uint32_t initial_difficulty_bits = 8,
                                uint64_t target_block_time_s = 10,
                                uint64_t retarget_interval = 10)
        : default_difficulty_bits_(initial_difficulty_bits),
          target_block_time_s_(target_block_time_s),
          retarget_interval_(retarget_interval) {}

    // Count leading zero bits in a 256-bit hash
    [[nodiscard]] static uint32_t count_leading_zero_bits(const core::Hash256& hash) noexcept {
        uint32_t zeros = 0;
        for (uint8_t byte : hash) {
            if (byte == 0) {
                zeros += 8;
            } else {
                for (int bit = 7; bit >= 0; --bit) {
                    if ((byte & (static_cast<uint8_t>(1U << bit))) == 0) {
                        zeros++;
                    } else {
                        return zeros;
                    }
                }
            }
        }
        return zeros;
    }

    // Mine a block header by incrementing nonce until difficulty target is satisfied
    bool mine_block(core::Block& block, uint32_t target_bits, uint64_t max_iterations = 2'000'000) const {
        for (uint64_t nonce = 0; nonce < max_iterations; ++nonce) {
            block.header.nonce = nonce;
            auto header_bytes = block.header.serialize();
            auto hash = crypto::CryptoUtils::sha256(header_bytes);

            if (count_leading_zero_bits(hash) >= target_bits) {
                block.block_hash = hash;
                return true; // Successfully solved PoW puzzle!
            }
        }
        return false; // Iteration ceiling reached
    }

    // Calculate dynamic difficulty target based on block history
    [[nodiscard]] uint32_t calculate_difficulty(
        const std::optional<core::Block>& parent,
        const std::optional<core::Block>& window_start) const {

        if (!parent.has_value() || !window_start.has_value()) {
            return default_difficulty_bits_;
        }

        // Only retarget on interval boundaries
        if (parent->header.height % retarget_interval_ != 0 || parent->header.height == 0) {
            return default_difficulty_bits_;
        }

        uint64_t actual_duration = parent->header.timestamp - window_start->header.timestamp;
        uint64_t expected_duration = retarget_interval_ * target_block_time_s_;

        uint32_t current_diff = default_difficulty_bits_;

        // Dampened difficulty retargeting:
        // If actual duration is less than half expected -> miners too fast -> increase difficulty
        if (actual_duration < expected_duration / 2 && current_diff < 32) {
            return current_diff + 1;
        }
        // If actual duration is more than double expected -> miners too slow -> decrease difficulty
        if (actual_duration > expected_duration * 2 && current_diff > 1) {
            return current_diff - 1;
        }

        return current_diff;
    }

    [[nodiscard]] bool validate_block_consensus(
        const core::Block& block,
        const std::optional<core::Block>& parent) const override {

        // 1. Verify block hash satisfies PoW target leading zero bits
        uint32_t required_bits = default_difficulty_bits_;
        uint32_t actual_zeros = count_leading_zero_bits(block.block_hash);

        if (actual_zeros < required_bits) {
            return false; // Insufficient proof-of-work
        }

        // 2. Monotonic timestamp check against parent
        if (parent.has_value()) {
            if (block.header.timestamp < parent->header.timestamp) {
                return false; // Time warp anomaly
            }
        }

        return true;
    }

    // Work contributed by a block is 2^(difficulty_bits)
    [[nodiscard]] uint64_t calculate_block_work(const core::BlockHeader& header) const override {
        (void)header;
        return 1ULL << (std::min)(default_difficulty_bits_, 31U);
    }

    [[nodiscard]] const char* name() const noexcept override {
        return "PoW-Nakamoto";
    }

    [[nodiscard]] uint32_t difficulty_bits() const noexcept {
        return default_difficulty_bits_;
    }

    void set_difficulty_bits(uint32_t bits) noexcept {
        default_difficulty_bits_ = bits;
    }

private:
    uint32_t default_difficulty_bits_{8};
    uint64_t target_block_time_s_{10};
    uint64_t retarget_interval_{10};
};

} // namespace blockbum::consensus
