#pragma once

#include "blockbum/core/types.hpp"
#include "blockbum/core/transaction.hpp"
#include "blockbum/core/economic_model.hpp"
#include "blockbum/crypto/icrypto.hpp"
#include "blockbum/crypto/crypto_utils.hpp"
#include "blockbum/crypto/standard_crypto.hpp"
#include <string>
#include <vector>
#include <memory>
#include <optional>
#include <chrono>

namespace blockbum::sdk {

struct KeypairIdentity {
    std::string alias;
    std::string address;
    crypto::PublicKey public_key{};
    crypto::SecretKey secret_key{};
};

/// Public C++ Developer SDK for building, signing, and verifying BlockBum transactions
class BlockBumClient {
public:
    explicit BlockBumClient(std::shared_ptr<crypto::ICryptoEngine> crypto = nullptr)
        : crypto_(crypto ? std::move(crypto) : std::make_shared<crypto::StandardCryptoEngine>()) {}

    /// Validate if an address conforms to BlockBum Bech32-style 'bb1' format
    [[nodiscard]] static bool validate_address(const std::string& address) {
        if (address.rfind("bb1", 0) != 0) return false;
        if (address.length() < 10 || address.length() > 64) return false;
        for (size_t i = 3; i < address.length(); ++i) {
            char c = address[i];
            bool is_hex_or_alnum = (c >= '0' && c <= '9') || (c >= 'a' && c <= 'z');
            if (!is_hex_or_alnum) return false;
        }
        return true;
    }

    /// Derive public address from an Ed25519 public key
    [[nodiscard]] static std::string derive_address(const crypto::PublicKey& pubkey) {
        return "bb1" + core::to_hex(pubkey).substr(0, 40);
    }

    /// Generate a fresh developer identity keypair
    [[nodiscard]] KeypairIdentity generate_keypair(const std::string& alias = "dev_identity") {
        auto kp = crypto_->generate_keypair();
        std::string addr = derive_address(kp.public_key);
        return {alias, std::move(addr), kp.public_key, kp.secret_key};
    }

    /// Build an unsigned value transfer transaction
    [[nodiscard]] core::Transaction build_transfer(const std::string& sender_address,
                                                   const crypto::PublicKey& sender_pubkey,
                                                   const std::string& recipient_address,
                                                   core::Balance amount,
                                                   core::Nonce nonce,
                                                   std::optional<core::Balance> fee = std::nullopt,
                                                   const std::vector<uint8_t>& payload = {}) {
        core::Transaction tx;
        tx.version = 1;
        tx.sender = sender_address;
        tx.sender_pubkey = sender_pubkey;
        tx.recipient = recipient_address;
        tx.amount = amount;
        tx.nonce = nonce;
        tx.payload = payload;

        auto now = std::chrono::duration_cast<std::chrono::seconds>(
            std::chrono::system_clock::now().time_since_epoch()).count();
        tx.timestamp = static_cast<uint64_t>(now);

        // Estimate size-based fee if not explicitly provided
        size_t est_size = 180 + payload.size();
        tx.fee = fee.value_or(economics::calculate_minimum_fee(est_size));

        return tx;
    }

    /// Cryptographically sign transaction with Ed25519 secret key
    bool sign_transaction(core::Transaction& tx, const crypto::SecretKey& secret_key) {
        auto data_to_sign = tx.serialize_for_id();
        auto sig_bytes = crypto_->sign(data_to_sign, secret_key);
        tx.signature = sig_bytes;
        tx.tx_id = crypto::CryptoUtils::sha256(tx.serialize_for_id());
        return true;
    }

    /// Cryptographically verify transaction signature and address validity
    [[nodiscard]] bool verify_transaction(const core::Transaction& tx) const {
        if (!validate_address(tx.sender) || !validate_address(tx.recipient)) {
            return false;
        }

        std::string expected_sender = derive_address(tx.sender_pubkey);
        if (tx.sender != expected_sender) {
            return false; // Mismatched public key and sender address
        }

        if (tx.fee < economics::MIN_TRANSACTION_FEE) {
            return false; // Insufficient fee
        }

        auto data = tx.serialize_for_id();
        return crypto_->verify(data, tx.signature, tx.sender_pubkey);
    }

    /// Estimate recommended minimum fee in atomic units
    [[nodiscard]] static core::Balance estimate_fee(size_t payload_bytes) {
        return economics::calculate_minimum_fee(180 + payload_bytes);
    }

private:
    std::shared_ptr<crypto::ICryptoEngine> crypto_;
};

} // namespace blockbum::sdk
