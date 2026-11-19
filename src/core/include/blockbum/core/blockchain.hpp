#pragma once

#include "blockbum/core/types.hpp"
#include "blockbum/core/block.hpp"
#include "blockbum/core/transaction.hpp"
#include "blockbum/core/merkle_tree.hpp"
#include "blockbum/storage/istorage.hpp"
#include "blockbum/crypto/crypto_utils.hpp"
#include <memory>
#include <optional>
#include <string>
#include <vector>
#include <sstream>
#include <stdexcept>

namespace blockbum::core {

enum class ValidationResult {
    Valid,
    GenesisMismatch,
    InvalidPreviousHash,
    InvalidHeight,
    InvalidMerkleRoot,
    InvalidBlockHash,
    InvalidTransaction
};

inline const char* validation_result_to_string(ValidationResult res) {
    switch (res) {
        case ValidationResult::Valid: return "Valid";
        case ValidationResult::GenesisMismatch: return "GenesisMismatch";
        case ValidationResult::InvalidPreviousHash: return "InvalidPreviousHash";
        case ValidationResult::InvalidHeight: return "InvalidHeight";
        case ValidationResult::InvalidMerkleRoot: return "InvalidMerkleRoot";
        case ValidationResult::InvalidBlockHash: return "InvalidBlockHash";
        case ValidationResult::InvalidTransaction: return "InvalidTransaction";
    }
    return "Unknown";
}

class Blockchain {
public:
    explicit Blockchain(std::shared_ptr<storage::IStorageEngine> storage)
        : storage_(std::move(storage)) {}

    static Block create_genesis_block() {
        Block genesis;
        genesis.header.version = 1;
        genesis.header.height = 0;
        genesis.header.previous_hash.fill(0);
        genesis.header.timestamp = 1700000000;
        genesis.header.nonce = 0;

        Transaction genesis_tx;
        genesis_tx.version = 1;
        genesis_tx.sender = "SYSTEM";
        genesis_tx.recipient = "GENESIS_COMMUNITY";
        genesis_tx.amount = 100'000'000;
        genesis_tx.fee = 0;
        genesis_tx.nonce = 0;
        std::string payload = "BlockBum Genesis: Decentralized Community Platform";
        genesis_tx.payload = std::vector<uint8_t>(payload.begin(), payload.end());
        genesis_tx.timestamp = 1700000000;
        genesis_tx.tx_id = crypto::CryptoUtils::sha256(genesis_tx.serialize_for_id());

        genesis.transactions.push_back(genesis_tx);
        genesis.header.merkle_root = genesis_tx.tx_id;

        auto header_bytes = genesis.header.serialize();
        genesis.block_hash = crypto::CryptoUtils::sha256(header_bytes);
        return genesis;
    }

    bool initialize() {
        if (!storage_) return false;

        auto tip_hash_opt = storage_->get(as_span("tip_hash"));
        if (!tip_hash_opt.has_value()) {
            Block genesis = create_genesis_block();
            return store_block(genesis);
        }

        auto tip_hash = tip_hash_opt.value();
        auto tip_block_opt = get_block_by_hash_raw(tip_hash);
        if (!tip_block_opt.has_value()) {
            return false;
        }

        height_ = tip_block_opt->header.height;
        tip_hash_ = tip_block_opt->block_hash;
        return true;
    }

    [[nodiscard]] ValidationResult validate_block(const Block& block, const std::optional<Block>& previous_block) const {
        // 1. Validate transactions and Merkle Root
        std::vector<Hash256> tx_hashes;
        tx_hashes.reserve(block.transactions.size());
        for (const auto& tx : block.transactions) {
            auto expected_id = crypto::CryptoUtils::sha256(tx.serialize_for_id());
            if (expected_id != tx.tx_id) {
                return ValidationResult::InvalidTransaction;
            }
            tx_hashes.push_back(tx.tx_id);
        }

        Hash256 calculated_root = MerkleTree::compute_root(tx_hashes);
        if (calculated_root != block.header.merkle_root) {
            return ValidationResult::InvalidMerkleRoot;
        }

        // 2. Validate header hash
        auto header_bytes = block.header.serialize();
        auto expected_block_hash = crypto::CryptoUtils::sha256(header_bytes);
        if (expected_block_hash != block.block_hash) {
            return ValidationResult::InvalidBlockHash;
        }

        // 3. Chain linkage validation
        if (block.header.height == 0) {
            Block genesis = create_genesis_block();
            if (block.block_hash != genesis.block_hash) {
                return ValidationResult::GenesisMismatch;
            }
        } else {
            if (!previous_block.has_value()) {
                return ValidationResult::InvalidPreviousHash;
            }
            if (block.header.previous_hash != previous_block->block_hash) {
                return ValidationResult::InvalidPreviousHash;
            }
            if (block.header.height != previous_block->header.height + 1) {
                return ValidationResult::InvalidHeight;
            }
        }

        return ValidationResult::Valid;
    }

    bool add_block(Block block) {
        auto latest = get_tip_block();
        auto res = validate_block(block, latest);
        if (res != ValidationResult::Valid) {
            return false;
        }
        return store_block(block);
    }

    Block create_next_block(std::vector<Transaction> transactions, uint64_t nonce = 0, TimestampMs timestamp = 0) {
        auto tip = get_tip_block();
        if (!tip.has_value()) {
            throw std::runtime_error("Blockchain not initialized");
        }

        Block next_block;
        next_block.header.version = 1;
        next_block.header.height = tip->header.height + 1;
        next_block.header.previous_hash = tip->block_hash;
        next_block.header.timestamp = (timestamp != 0) ? timestamp : (tip->header.timestamp + 10);
        next_block.header.nonce = nonce;

        std::vector<Hash256> tx_hashes;
        tx_hashes.reserve(transactions.size());
        for (auto& tx : transactions) {
            tx.tx_id = crypto::CryptoUtils::sha256(tx.serialize_for_id());
            tx_hashes.push_back(tx.tx_id);
        }

        next_block.transactions = std::move(transactions);
        next_block.header.merkle_root = MerkleTree::compute_root(tx_hashes);

        auto header_bytes = next_block.header.serialize();
        next_block.block_hash = crypto::CryptoUtils::sha256(header_bytes);
        return next_block;
    }

    [[nodiscard]] std::optional<Block> get_block_by_height(BlockHeight height) const {
        std::string key = "height:" + std::to_string(height);
        auto hash_opt = storage_->get(as_span(key));
        if (!hash_opt.has_value()) return std::nullopt;
        return get_block_by_hash_raw(hash_opt.value());
    }

    [[nodiscard]] std::optional<Block> get_block_by_hash(const Hash256& hash) const {
        std::string key = "block:" + core::to_hex(hash);
        auto data_opt = storage_->get(as_span(key));
        if (!data_opt.has_value()) return std::nullopt;
        BinaryDeserializer d(data_opt.value());
        return Block::deserialize(d);
    }

    [[nodiscard]] std::optional<Block> get_tip_block() const {
        auto tip_hash_opt = storage_->get(as_span("tip_hash"));
        if (!tip_hash_opt.has_value()) return std::nullopt;
        return get_block_by_hash_raw(tip_hash_opt.value());
    }

    [[nodiscard]] BlockHeight height() const noexcept {
        return height_;
    }

    [[nodiscard]] ValidationResult validate_entire_chain() const {
        auto tip = get_tip_block();
        if (!tip.has_value()) {
            return ValidationResult::GenesisMismatch;
        }

        std::optional<Block> prev_block = std::nullopt;
        for (BlockHeight h = 0; h <= tip->header.height; ++h) {
            auto current = get_block_by_height(h);
            if (!current.has_value()) {
                return ValidationResult::InvalidHeight;
            }
            auto res = validate_block(*current, prev_block);
            if (res != ValidationResult::Valid) {
                return res;
            }
            prev_block = current;
        }

        return ValidationResult::Valid;
    }

private:
    static std::span<const uint8_t> as_span(std::string_view s) {
        return std::span<const uint8_t>(reinterpret_cast<const uint8_t*>(s.data()), s.size());
    }

    [[nodiscard]] std::optional<Block> get_block_by_hash_raw(std::span<const uint8_t> hash_bytes) const {
        std::string key = "block:" + core::to_hex(hash_bytes);
        auto data_opt = storage_->get(as_span(key));
        if (!data_opt.has_value()) return std::nullopt;
        BinaryDeserializer d(data_opt.value());
        return Block::deserialize(d);
    }

    bool store_block(const Block& block) {
        std::string height_key = "height:" + std::to_string(block.header.height);
        auto hash_span = std::span<const uint8_t>(block.block_hash.data(), block.block_hash.size());
        if (!storage_->put(as_span(height_key), hash_span)) {
            return false;
        }

        std::string block_key = "block:" + core::to_hex(block.block_hash);
        auto block_bytes = block.serialize();
        if (!storage_->put(as_span(block_key), block_bytes)) {
            return false;
        }

        if (!storage_->put(as_span("tip_hash"), hash_span)) {
            return false;
        }

        height_ = block.header.height;
        tip_hash_ = block.block_hash;
        return true;
    }

    std::shared_ptr<storage::IStorageEngine> storage_;
    BlockHeight height_{0};
    Hash256 tip_hash_{};
};

} // namespace blockbum::core
