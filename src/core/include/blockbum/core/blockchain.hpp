#pragma once

#include "blockbum/core/types.hpp"
#include "blockbum/core/block.hpp"
#include "blockbum/core/transaction.hpp"
#include "blockbum/core/merkle_tree.hpp"
#include "blockbum/core/consensus.hpp"
#include "blockbum/storage/istorage.hpp"
#include "blockbum/crypto/crypto_utils.hpp"
#include <memory>
#include <optional>
#include <string>
#include <vector>
#include <map>
#include <span>
#include <cstring>
#include <sstream>
#include <stdexcept>
#include <algorithm>
#include <cstdint>

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

struct ReorgResult {
    bool accepted{false};
    bool reorganized{false};
    BlockHeight old_height{0};
    BlockHeight new_height{0};
    size_t blocks_reverted{0};
    size_t blocks_applied{0};
};

inline constexpr size_t MAX_REORG_DEPTH = 100;

namespace detail {
class InMemoryStorageEngine : public storage::IStorageEngine {
public:
    bool open(const std::string&) override { return true; }
    void close() override { data_.clear(); }
    [[nodiscard]] std::optional<std::vector<uint8_t>> get(std::span<const uint8_t> key) const override {
        std::vector<uint8_t> k(key.begin(), key.end());
        auto it = data_.find(k);
        if (it != data_.end()) return it->second;
        return std::nullopt;
    }
    bool put(std::span<const uint8_t> key, std::span<const uint8_t> value) override {
        data_[std::vector<uint8_t>(key.begin(), key.end())] = std::vector<uint8_t>(value.begin(), value.end());
        return true;
    }
    bool remove(std::span<const uint8_t> key) override {
        return data_.erase(std::vector<uint8_t>(key.begin(), key.end())) > 0;
    }
    [[nodiscard]] bool has(std::span<const uint8_t> key) const override {
        return data_.find(std::vector<uint8_t>(key.begin(), key.end())) != data_.end();
    }
private:
    std::map<std::vector<uint8_t>, std::vector<uint8_t>> data_;
};
} // namespace detail

class Blockchain {
public:
    explicit Blockchain(std::shared_ptr<storage::IStorageEngine> storage = nullptr)
        : storage_(storage ? std::move(storage) : std::make_shared<detail::InMemoryStorageEngine>()) {}

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
        active_chain_work_ = get_chain_work(tip_hash_);
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

    // Add block with pluggable consensus and deterministic fork-choice resolution
    ReorgResult add_block_with_fork_choice(Block block, const consensus::IConsensusEngine* consensus = nullptr) {
        ReorgResult result;

        // Genesis block handling
        if (block.header.height == 0) {
            auto genesis = create_genesis_block();
            if (block.block_hash != genesis.block_hash) {
                return result;
            }
            if (store_block(block, 1)) {
                result.accepted = true;
                result.new_height = 0;
            }
            return result;
        }

        // 1. Fetch parent block from storage
        auto parent_opt = get_block_by_hash(block.header.previous_hash);
        if (!parent_opt.has_value()) {
            return result; // Orphan: parent unknown
        }

        // 2. Structural validation against parent
        auto val_res = validate_block(block, parent_opt);
        if (val_res != ValidationResult::Valid) {
            return result;
        }

        // 3. Consensus validation (PoW difficulty or PoA authority)
        if (consensus != nullptr) {
            if (!consensus->validate_block_consensus(block, parent_opt)) {
                return result;
            }
        }

        // 4. Calculate accumulated work
        uint64_t block_work = consensus ? consensus->calculate_block_work(block.header) : 1;
        uint64_t parent_work = get_chain_work(block.header.previous_hash);
        uint64_t new_total_work = parent_work + block_work;

        // Persist block data and branch work
        if (!persist_block_data(block, new_total_work)) {
            return result;
        }

        // 5. Evaluate fork-choice: Is this extending active tip?
        if (block.header.previous_hash == tip_hash_) {
            store_height_mapping(block.header.height, block.block_hash);
            storage_->put(as_span("tip_hash"), as_span(block.block_hash));
            storage_->put(as_span("active_work"), to_work_bytes(new_total_work));

            result.old_height = height_;
            height_ = block.header.height;
            tip_hash_ = block.block_hash;
            active_chain_work_ = new_total_work;

            result.accepted = true;
            result.reorganized = false;
            result.new_height = height_;
            result.blocks_applied = 1;
            return result;
        }

        // 6. Block is on a competing branch (Fork detected)
        uint64_t current_active_work = get_active_chain_work();
        bool heavier = new_total_work > current_active_work;
        bool tie_breaker = (new_total_work == current_active_work) && (block.block_hash < tip_hash_);

        if (!heavier && !tie_breaker) {
            // Side-chain stored, active tip preserved
            result.accepted = true;
            result.reorganized = false;
            result.old_height = height_;
            result.new_height = height_;
            return result;
        }

        // 7. Competing branch is heavier: execute deterministic reorganization
        return execute_reorganization(block, new_total_work);
    }

    ReorgResult add_block_with_fork_choice(Block block, const consensus::IConsensusEngine& consensus) {
        return add_block_with_fork_choice(std::move(block), &consensus);
    }

    // Default backward-compatible add_block
    bool add_block(Block block) {
        auto res = add_block_with_fork_choice(std::move(block), nullptr);
        return res.accepted;
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

    [[nodiscard]] BlockHeight get_height() const noexcept {
        return height_;
    }

    [[nodiscard]] Hash256 tip_hash() const noexcept {
        return tip_hash_;
    }

    [[nodiscard]] Hash256 get_tip_hash() const noexcept {
        return tip_hash_;
    }

    [[nodiscard]] uint64_t active_chain_work() const noexcept {
        return active_chain_work_;
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

    [[nodiscard]] uint64_t get_chain_work(const Hash256& hash) const {
        std::string key = "work:" + core::to_hex(hash);
        auto opt = storage_->get(as_span(key));
        if (opt.has_value() && opt->size() == sizeof(uint64_t)) {
            uint64_t val = 0;
            std::memcpy(&val, opt->data(), sizeof(uint64_t));
            return val;
        }
        return 1;
    }

    // Prune raw transaction payloads for blocks older than (current_height - keep_depth)
    // while keeping headers, block hashes, and height mappings intact for state verification
    size_t prune_history(size_t keep_depth) {
        if (keep_depth == 0 || height_ <= keep_depth) {
            return 0; // Archival mode (keep_depth = 0) or chain not deep enough
        }
        BlockHeight prune_threshold = height_ - keep_depth;
        size_t pruned_count = 0;
        for (BlockHeight h = 1; h <= prune_threshold; ++h) {
            std::string key = "height:" + std::to_string(h);
            auto hash_opt = storage_->get(as_span(key));
            if (hash_opt.has_value() && hash_opt->size() == 32) {
                Hash256 b_hash;
                std::memcpy(b_hash.data(), hash_opt->data(), 32);
                auto blk_opt = get_block_by_hash(b_hash);
                if (blk_opt && !blk_opt->transactions.empty()) {
                    Block pruned_b;
                    pruned_b.header = blk_opt->header;
                    pruned_b.block_hash = blk_opt->block_hash;
                    std::string block_key = "block:" + core::to_hex(b_hash);
                    auto s_bytes = pruned_b.serialize();
                    storage_->put(as_span(block_key), std::span<const uint8_t>(s_bytes.data(), s_bytes.size()));
                    pruned_count++;
                }
            }
        }
        return pruned_count;
    }

private:
    static std::span<const uint8_t> as_span(std::string_view s) {
        return std::span<const uint8_t>(reinterpret_cast<const uint8_t*>(s.data()), s.size());
    }

    static std::span<const uint8_t> as_span(const Hash256& hash) {
        return std::span<const uint8_t>(hash.data(), hash.size());
    }

    static std::vector<uint8_t> to_work_bytes(uint64_t work) {
        std::vector<uint8_t> bytes(sizeof(uint64_t));
        std::memcpy(bytes.data(), &work, sizeof(uint64_t));
        return bytes;
    }

    [[nodiscard]] uint64_t get_active_chain_work() const {
        auto opt = storage_->get(as_span("active_work"));
        if (opt.has_value() && opt->size() == sizeof(uint64_t)) {
            uint64_t val = 0;
            std::memcpy(&val, opt->data(), sizeof(uint64_t));
            return val;
        }
        return active_chain_work_;
    }

    [[nodiscard]] std::optional<Block> get_block_by_hash_raw(std::span<const uint8_t> hash_bytes) const {
        std::string key = "block:" + core::to_hex(hash_bytes);
        auto data_opt = storage_->get(as_span(key));
        if (!data_opt.has_value()) return std::nullopt;
        BinaryDeserializer d(data_opt.value());
        return Block::deserialize(d);
    }

    bool persist_block_data(const Block& block, uint64_t total_work) {
        std::string block_key = "block:" + core::to_hex(block.block_hash);
        auto block_bytes = block.serialize();
        if (!storage_->put(as_span(block_key), block_bytes)) return false;

        std::string work_key = "work:" + core::to_hex(block.block_hash);
        auto work_bytes = to_work_bytes(total_work);
        if (!storage_->put(as_span(work_key), work_bytes)) return false;

        std::string parent_key = "parent:" + core::to_hex(block.block_hash);
        if (!storage_->put(as_span(parent_key), as_span(block.header.previous_hash))) return false;

        return true;
    }

    bool store_height_mapping(BlockHeight height, const Hash256& hash) {
        std::string height_key = "height:" + std::to_string(height);
        return storage_->put(as_span(height_key), as_span(hash));
    }

    bool store_block(const Block& block, uint64_t total_work = 1) {
        if (!persist_block_data(block, total_work)) return false;
        if (!store_height_mapping(block.header.height, block.block_hash)) return false;
        if (!storage_->put(as_span("tip_hash"), as_span(block.block_hash))) return false;
        storage_->put(as_span("active_work"), to_work_bytes(total_work));

        height_ = block.header.height;
        tip_hash_ = block.block_hash;
        active_chain_work_ = total_work;
        return true;
    }

    ReorgResult execute_reorganization(const Block& fork_tip, uint64_t fork_work) {
        ReorgResult res;

        // 1. Trace active chain backward
        std::vector<Hash256> active_hashes;
        Hash256 curr_active = tip_hash_;
        while (true) {
            active_hashes.push_back(curr_active);
            auto b = get_block_by_hash(curr_active);
            if (!b || b->header.height == 0) break;
            curr_active = b->header.previous_hash;
        }

        // 2. Trace fork branch backward
        std::vector<Block> fork_blocks;
        Block curr_fork = fork_tip;
        while (true) {
            fork_blocks.push_back(curr_fork);
            if (curr_fork.header.height == 0) break;
            auto p = get_block_by_hash(curr_fork.header.previous_hash);
            if (!p) break;
            curr_fork = *p;
        }

        // 3. Find Common Ancestor
        std::optional<Hash256> common_ancestor_hash = std::nullopt;
        for (const auto& fb : fork_blocks) {
            auto it = std::find(active_hashes.begin(), active_hashes.end(), fb.block_hash);
            if (it != active_hashes.end()) {
                common_ancestor_hash = fb.block_hash;
                break;
            }
        }

        if (!common_ancestor_hash.has_value()) {
            return res; // No common ancestor
        }

        auto ancestor_block = get_block_by_hash(*common_ancestor_hash);
        if (!ancestor_block) return res;

        BlockHeight common_height = ancestor_block->header.height;
        size_t reorg_depth = static_cast<size_t>(height_ - common_height);
        if (reorg_depth > MAX_REORG_DEPTH) {
            return res; // Depth limit exceeded
        }

        // 4. Collect blocks to apply from ancestor+1 to fork_tip
        std::vector<Block> blocks_to_apply;
        for (const auto& b : fork_blocks) {
            if (b.header.height > common_height) {
                blocks_to_apply.push_back(b);
            }
        }
        std::reverse(blocks_to_apply.begin(), blocks_to_apply.end());

        // 5. Update height mappings to the new heavier branch
        for (const auto& b : blocks_to_apply) {
            store_height_mapping(b.header.height, b.block_hash);
        }

        // 6. Update active tip and chain work
        storage_->put(as_span("tip_hash"), as_span(fork_tip.block_hash));
        storage_->put(as_span("active_work"), to_work_bytes(fork_work));

        res.accepted = true;
        res.reorganized = true;
        res.old_height = height_;
        res.new_height = fork_tip.header.height;
        res.blocks_reverted = reorg_depth;
        res.blocks_applied = blocks_to_apply.size();

        height_ = fork_tip.header.height;
        tip_hash_ = fork_tip.block_hash;
        active_chain_work_ = fork_work;

        return res;
    }

    std::shared_ptr<storage::IStorageEngine> storage_;
    BlockHeight height_{0};
    Hash256 tip_hash_{};
    uint64_t active_chain_work_{1};
};

} // namespace blockbum::core
