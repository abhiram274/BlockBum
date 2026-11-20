#pragma once

#include "blockbum/core/types.hpp"
#include "blockbum/core/account_ledger.hpp"
#include "blockbum/crypto/crypto_utils.hpp"
#include <string>
#include <unordered_map>
#include <mutex>
#include <optional>
#include <cstdint>

namespace blockbum::rpc {

/// Result status of a faucet token request
enum class FaucetStatus : uint8_t {
    Success = 0,
    RateLimited = 1,
    InvalidAddress = 2,
    PoolExhausted = 3
};

struct FaucetResponse {
    FaucetStatus status{FaucetStatus::InvalidAddress};
    core::Balance amount_dispensed{0};
    uint64_t cooldown_remaining_seconds{0};
    std::string tx_id;
    std::string message;
};

/// Rate-limited Testnet Faucet service distributing tBUM tokens to developers
class TestnetFaucet {
public:
    /// Default drip: 10 tBUM (10,000,000 atomic units)
    static constexpr core::Balance DEFAULT_DRIP_AMOUNT = 10ULL * ledger::BUM_DECIMALS;
    /// Default cooldown: 3,600 seconds (1 hour)
    static constexpr uint64_t DEFAULT_COOLDOWN_SECONDS = 3600;
    /// Initial faucet pool reserve: 100,000 tBUM
    static constexpr core::Balance INITIAL_FAUCET_POOL = 100'000ULL * ledger::BUM_DECIMALS;

    explicit TestnetFaucet(std::shared_ptr<ledger::AccountLedger> ledger,
                           core::Balance drip_amount = DEFAULT_DRIP_AMOUNT,
                           uint64_t cooldown_seconds = DEFAULT_COOLDOWN_SECONDS)
        : ledger_(std::move(ledger)),
          drip_amount_(drip_amount),
          cooldown_seconds_(cooldown_seconds),
          faucet_pool_balance_(INITIAL_FAUCET_POOL) {}

    /// Request testnet tokens with address and client IP rate limiting
    FaucetResponse request_tokens(const std::string& recipient_address,
                                  const std::string& client_ip,
                                  uint64_t current_time_seconds) {
        std::lock_guard<std::mutex> lock(mutex_);

        // 1. Validate recipient address format
        if (recipient_address.rfind("bb1", 0) != 0 || recipient_address.length() < 10) {
            return {FaucetStatus::InvalidAddress, 0, 0, "", "Invalid BlockBum recipient address (must begin with bb1)"};
        }

        // 2. Check address cooldown
        auto addr_it = last_request_by_address_.find(recipient_address);
        if (addr_it != last_request_by_address_.end()) {
            uint64_t elapsed = current_time_seconds - addr_it->second;
            if (elapsed < cooldown_seconds_) {
                uint64_t remaining = cooldown_seconds_ - elapsed;
                return {FaucetStatus::RateLimited, 0, remaining, "", "Address rate limited. Cooldown active."};
            }
        }

        // 3. Check client IP cooldown
        if (!client_ip.empty()) {
            auto ip_it = last_request_by_ip_.find(client_ip);
            if (ip_it != last_request_by_ip_.end()) {
                uint64_t elapsed = current_time_seconds - ip_it->second;
                if (elapsed < cooldown_seconds_) {
                    uint64_t remaining = cooldown_seconds_ - elapsed;
                    return {FaucetStatus::RateLimited, 0, remaining, "", "IP rate limited. Cooldown active."};
                }
            }
        }

        // 4. Check faucet reserve solvency
        if (faucet_pool_balance_ < drip_amount_) {
            return {FaucetStatus::PoolExhausted, 0, 0, "", "Testnet faucet pool temporarily exhausted"};
        }

        // 5. Credit recipient in ledger
        if (ledger_) {
            ledger_->seed_balance(recipient_address, drip_amount_);
        }

        // 6. Update tracking state
        faucet_pool_balance_ -= drip_amount_;
        last_request_by_address_[recipient_address] = current_time_seconds;
        if (!client_ip.empty()) {
            last_request_by_ip_[client_ip] = current_time_seconds;
        }

        // Generate deterministic pseudo tx_id for faucet dispense record
        std::string tx_payload = "faucet:" + recipient_address + ":" + std::to_string(current_time_seconds);
        core::Hash256 tx_hash = crypto::CryptoUtils::sha256(
            std::span<const uint8_t>(reinterpret_cast<const uint8_t*>(tx_payload.data()), tx_payload.size()));

        return {FaucetStatus::Success, drip_amount_, cooldown_seconds_,
                "0x" + core::to_hex(tx_hash), "Tokens successfully dispensed"};
    }

    [[nodiscard]] core::Balance pool_balance() const {
        std::lock_guard<std::mutex> lock(mutex_);
        return faucet_pool_balance_;
    }

    [[nodiscard]] core::Balance drip_amount() const noexcept {
        return drip_amount_;
    }

private:
    mutable std::mutex mutex_;
    std::shared_ptr<ledger::AccountLedger> ledger_;
    core::Balance drip_amount_;
    uint64_t cooldown_seconds_;
    core::Balance faucet_pool_balance_;
    std::unordered_map<std::string, uint64_t> last_request_by_address_;
    std::unordered_map<std::string, uint64_t> last_request_by_ip_;
};

} // namespace blockbum::rpc
