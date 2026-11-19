#pragma once

#include "blockbum/crypto/icrypto.hpp"
#include "blockbum/crypto/standard_crypto.hpp"
#include "blockbum/core/types.hpp"
#include "blockbum/core/serializer.hpp"
#include "blockbum/core/transaction.hpp"
#include <string>
#include <vector>
#include <memory>
#include <filesystem>
#include <fstream>
#include <stdexcept>
#include <iomanip>
#include <sstream>

namespace blockbum::crypto {

struct IdentityMetadata {
    std::string alias;
    std::string address;
    PublicKey public_key;
    uint64_t created_at{0};
};

// Wallet Identity holding keys in local memory
class Identity {
public:
    Identity(std::string alias, KeyPair keypair, uint64_t created_at = 0)
        : alias_(std::move(alias)), keypair_(keypair), created_at_(created_at) {
        address_ = "bb1" + core::to_hex(keypair_.public_key).substr(0, 40);
    }

    [[nodiscard]] const std::string& alias() const noexcept { return alias_; }
    [[nodiscard]] const std::string& address() const noexcept { return address_; }
    [[nodiscard]] const PublicKey& public_key() const noexcept { return keypair_.public_key; }
    [[nodiscard]] const SecretKey& secret_key() const noexcept { return keypair_.secret_key; }
    [[nodiscard]] uint64_t created_at() const noexcept { return created_at_; }

    [[nodiscard]] Signature sign(std::span<const uint8_t> message, const ICryptoEngine& engine) const {
        return engine.sign(message, keypair_.secret_key);
    }

    // Export identity seed/secret for backup
    [[nodiscard]] std::string export_recovery_phrase() const {
        return core::to_hex(std::span<const uint8_t>(keypair_.secret_key.data(), 32));
    }

private:
    std::string alias_;
    KeyPair keypair_;
    std::string address_;
    uint64_t created_at_{0};
};

// Local Keystore and Wallet abstraction
class Wallet {
public:
    explicit Wallet(std::filesystem::path keystore_dir,
                    std::shared_ptr<ICryptoEngine> engine = std::make_shared<StandardCryptoEngine>())
        : keystore_dir_(std::move(keystore_dir)), engine_(std::move(engine)) {
        if (!std::filesystem::exists(keystore_dir_)) {
            std::filesystem::create_directories(keystore_dir_);
        }
    }

    Identity create_identity(const std::string& alias) {
        if (has_identity(alias)) {
            throw std::runtime_error("Identity alias already exists: " + alias);
        }

        auto kp = engine_->generate_keypair();
        Identity id(alias, kp);
        save_identity(id);
        identities_.push_back(id);
        return id;
    }

    Identity recover_identity(const std::string& alias, const std::string& recovery_hex) {
        if (has_identity(alias)) {
            throw std::runtime_error("Identity alias already exists: " + alias);
        }

        auto seed_bytes = core::from_hex(recovery_hex);
        auto* std_engine = dynamic_cast<StandardCryptoEngine*>(engine_.get());
        KeyPair kp;
        if (std_engine) {
            kp = std_engine->derive_keypair_from_seed(seed_bytes);
        } else {
            kp = engine_->generate_keypair();
        }

        Identity id(alias, kp);
        save_identity(id);
        identities_.push_back(id);
        return id;
    }

    [[nodiscard]] bool has_identity(const std::string& alias) const {
        for (const auto& id : identities_) {
            if (id.alias() == alias) return true;
        }
        return std::filesystem::exists(keystore_dir_ / (alias + ".wallet"));
    }

    [[nodiscard]] std::vector<IdentityMetadata> list_identities() {
        load_all();
        std::vector<IdentityMetadata> meta;
        meta.reserve(identities_.size());
        for (const auto& id : identities_) {
            meta.push_back({id.alias(), id.address(), id.public_key(), id.created_at()});
        }
        return meta;
    }

    [[nodiscard]] std::optional<Identity> get_identity(const std::string& alias) {
        load_all();
        for (const auto& id : identities_) {
            if (id.alias() == alias) return id;
        }
        return std::nullopt;
    }

    // Sign transaction with specific identity
    bool sign_transaction(core::Transaction& tx, const std::string& sender_alias) {
        auto id = get_identity(sender_alias);
        if (!id.has_value()) return false;

        tx.sender = id->address();
        tx.sender_pubkey = id->public_key();
        auto data_to_sign = tx.serialize_for_id();
        tx.signature = id->sign(data_to_sign, *engine_);
        tx.tx_id = engine_->hash256(data_to_sign);
        return true;
    }

    // Verify transaction signature
    [[nodiscard]] bool verify_transaction(const core::Transaction& tx) const {
        auto data_to_sign = tx.serialize_for_id();
        return engine_->verify(data_to_sign, tx.signature, tx.sender_pubkey);
    }

private:
    void save_identity(const Identity& id) {
        auto wallet_file = keystore_dir_ / (id.alias() + ".wallet");

        core::BinarySerializer s;
        s.write_string(id.alias());
        s.write_bytes(id.public_key());
        s.write_bytes(id.secret_key());
        s.write_u64(id.created_at());

        std::ofstream out(wallet_file, std::ios::binary | std::ios::trunc);
        if (!out.is_open()) {
            throw std::runtime_error("Failed to write keystore file: " + wallet_file.string());
        }
        auto data = s.take_data();
        out.write(reinterpret_cast<const char*>(data.data()), static_cast<std::streamsize>(data.size()));
    }

    void load_all() {
        if (!identities_.empty()) return;

        for (const auto& entry : std::filesystem::directory_iterator(keystore_dir_)) {
            if (entry.path().extension() == ".wallet") {
                std::ifstream in(entry.path(), std::ios::binary);
                if (!in.is_open()) continue;

                std::vector<uint8_t> buffer((std::istreambuf_iterator<char>(in)),
                                             std::istreambuf_iterator<char>());
                if (buffer.empty()) continue;

                try {
                    core::BinaryDeserializer d(buffer);
                    std::string alias = d.read_string();
                    auto pub_bytes = d.read_bytes();
                    auto sec_bytes = d.read_bytes();
                    uint64_t created = d.read_u64();

                    KeyPair kp;
                    if (pub_bytes.size() == 32 && sec_bytes.size() == 64) {
                        std::copy(pub_bytes.begin(), pub_bytes.end(), kp.public_key.begin());
                        std::copy(sec_bytes.begin(), sec_bytes.end(), kp.secret_key.begin());
                        identities_.emplace_back(alias, kp, created);
                    }
                } catch (...) {
                    // Ignore corrupted wallet files
                }
            }
        }
    }

    std::filesystem::path keystore_dir_;
    std::shared_ptr<ICryptoEngine> engine_;
    std::vector<Identity> identities_;
};

} // namespace blockbum::crypto
