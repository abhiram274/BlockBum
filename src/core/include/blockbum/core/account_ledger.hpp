#pragma once

#include "blockbum/core/types.hpp"
#include "blockbum/core/transaction.hpp"
#include "blockbum/crypto/icrypto.hpp"
#include <string>
#include <unordered_map>
#include <vector>
#include <mutex>
#include <optional>
#include <stdexcept>

namespace blockbum::ledger {

// Token Economics & Issuance Parameters for BUM:
// 1 BUM = 1,000,000 Atomic Units (MicroBUM / 6 decimal precision)
inline constexpr uint64_t BUM_DECIMALS = 1'000'000;
// Maximum Supply Cap: 21,000,000 BUM (21 Million BUM, mathematically consistent with 50 BUM initial reward and 210,000-block halving schedule)
inline constexpr uint64_t MAX_BUM_SUPPLY = 21'000'000ULL * BUM_DECIMALS;
// Block subsidy reward paid to the node proposer
inline constexpr uint64_t INITIAL_BLOCK_REWARD = 50ULL * BUM_DECIMALS;
// Halving interval in blocks
inline constexpr uint64_t HALVING_INTERVAL = 210'000;
// Minimum network priority fee (0.001 BUM) to protect against DoS/spam
inline constexpr uint64_t MIN_TRANSACTION_FEE = 1'000;

struct AccountState {
    core::Balance balance{0};
    core::Nonce nonce{0};
};

struct TransferRecord {
    std::string tx_id;
    std::string sender;
    std::string recipient;
    core::Balance amount{0};
    core::Balance fee{0};
    core::Nonce nonce{0};
    uint64_t timestamp{0};
};

// Account-based ledger state machine managing balances, nonces, and execution
class AccountLedger {
public:
    AccountLedger() = default;

    // Calculate dynamic block reward with halving schedule
    [[nodiscard]] static uint64_t calculate_block_reward(core::BlockHeight height) {
        uint64_t halvings = height / HALVING_INTERVAL;
        if (halvings >= 64) return 0;
        return INITIAL_BLOCK_REWARD >> halvings;
    }

    // Set initial balance (e.g. Genesis block community fund)
    void seed_balance(const std::string& address, core::Balance amount) {
        std::lock_guard<std::mutex> lock(mutex_);
        accounts_[address].balance += amount;
        total_supply_ += amount;
    }

    [[nodiscard]] core::Balance get_balance(const std::string& address) const {
        std::lock_guard<std::mutex> lock(mutex_);
        auto it = accounts_.find(address);
        if (it != accounts_.end()) return it->second.balance;
        return 0;
    }

    [[nodiscard]] core::Nonce get_nonce(const std::string& address) const {
        std::lock_guard<std::mutex> lock(mutex_);
        auto it = accounts_.find(address);
        if (it != accounts_.end()) return it->second.nonce;
        return 0;
    }

    [[nodiscard]] uint64_t total_supply() const noexcept {
        return total_supply_;
    }

    // Validate if transaction can be safely applied without modifying state
    [[nodiscard]] bool can_apply_transaction(const core::Transaction& tx, const crypto::ICryptoEngine& crypto) const {
        std::lock_guard<std::mutex> lock(mutex_);

        // 0. Address authenticity: ensure sender address matches derived public key
        std::string expected_sender = "bb1" + core::to_hex(tx.sender_pubkey).substr(0, 40);
        if (tx.sender != expected_sender) {
            return false; // Mismatched or forged sender address
        }

        // 1. Transaction fee check
        if (tx.fee < MIN_TRANSACTION_FEE) {
            return false;
        }

        // 2. Sender account check
        auto it = accounts_.find(tx.sender);
        if (it == accounts_.end()) {
            return false; // Sender does not exist or has zero balance
        }

        const auto& sender_acc = it->second;

        // 3. Prevent Double Spending: Strictly enforce sequential nonce ordering
        if (tx.nonce != sender_acc.nonce + 1) {
            return false; // Stale nonce, out-of-order, or replayed transaction
        }

        // 4. Balance solvency check: amount + fee <= current balance
        uint64_t total_required = tx.amount + tx.fee;
        if (total_required < tx.amount) {
            return false; // Arithmetic overflow guard
        }
        if (sender_acc.balance < total_required) {
            return false; // Insufficient funds
        }

        // 5. Cryptographic signature check
        auto data_to_verify = tx.serialize_for_id();
        if (!crypto.verify(data_to_verify, tx.signature, tx.sender_pubkey)) {
            return false; // Invalid or forged signature
        }

        return true;
    }

    // Atomically apply transaction and update sender/recipient state
    bool apply_transaction(const core::Transaction& tx, const crypto::ICryptoEngine& crypto) {
        std::lock_guard<std::mutex> lock(mutex_);

        std::string expected_sender = "bb1" + core::to_hex(tx.sender_pubkey).substr(0, 40);
        if (tx.sender != expected_sender) return false;

        if (tx.fee < MIN_TRANSACTION_FEE) return false;

        auto it = accounts_.find(tx.sender);
        if (it == accounts_.end()) return false;

        auto& sender_acc = it->second;
        if (tx.nonce != sender_acc.nonce + 1) return false;

        uint64_t total_required = tx.amount + tx.fee;
        if (total_required < tx.amount || sender_acc.balance < total_required) {
            return false;
        }

        auto data_to_verify = tx.serialize_for_id();
        if (!crypto.verify(data_to_verify, tx.signature, tx.sender_pubkey)) {
            return false;
        }

        // Debit sender
        sender_acc.balance -= total_required;
        sender_acc.nonce++;

        // Credit recipient
        accounts_[tx.recipient].balance += tx.amount;

        // Record transfer history
        history_[tx.sender].push_back({core::to_hex(tx.tx_id), tx.sender, tx.recipient, tx.amount, tx.fee, tx.nonce, tx.timestamp});
        history_[tx.recipient].push_back({core::to_hex(tx.tx_id), tx.sender, tx.recipient, tx.amount, tx.fee, tx.nonce, tx.timestamp});

        return true;
    }

    // Award block subsidy reward and transaction fees to the block producer
    void credit_block_reward(const std::string& miner_address, core::BlockHeight height, core::Balance fees_collected) {
        std::lock_guard<std::mutex> lock(mutex_);
        uint64_t reward = calculate_block_reward(height);
        if (total_supply_ + reward <= MAX_BUM_SUPPLY) {
            accounts_[miner_address].balance += (reward + fees_collected);
            total_supply_ += reward;
        } else {
            // Cap reached: only credit fees
            accounts_[miner_address].balance += fees_collected;
        }
    }

    [[nodiscard]] std::vector<TransferRecord> get_account_history(const std::string& address) const {
        std::lock_guard<std::mutex> lock(mutex_);
        auto it = history_.find(address);
        if (it != history_.end()) return it->second;
        return {};
    }

private:
    mutable std::mutex mutex_;
    std::unordered_map<std::string, AccountState> accounts_;
    std::unordered_map<std::string, std::vector<TransferRecord>> history_;
    uint64_t total_supply_{0};
};

} // namespace blockbum::ledger
