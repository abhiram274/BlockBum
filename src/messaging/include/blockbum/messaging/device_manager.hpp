#pragma once

#include "blockbum/core/types.hpp"
#include "blockbum/core/serializer.hpp"
#include "blockbum/crypto/icrypto.hpp"
#include "blockbum/crypto/crypto_utils.hpp"
#include "blockbum/crypto/wallet.hpp"
#include <string>
#include <vector>
#include <unordered_map>
#include <mutex>
#include <algorithm>
#include <optional>

namespace blockbum::messaging {

/// Authorized Device Record
struct DeviceRecord {
    std::string device_id;
    std::string primary_address;
    crypto::PublicKey device_pubkey{};
    std::array<uint8_t, 32> device_dh_pubkey{};
    uint64_t registered_at{0};
    uint64_t last_active{0};
    bool is_active{true};
    crypto::Signature authorization_signature{}; // Signed by primary identity

    [[nodiscard]] std::vector<uint8_t> serialize_for_auth() const {
        core::BinarySerializer s;
        std::string tag = "BLOCKBUM_DEVICE_AUTHORIZATION_V1";
        s.write_string(tag);
        s.write_string(primary_address);
        s.write_string(device_id);
        s.write_bytes(device_pubkey);
        s.write_hash(device_dh_pubkey);
        s.write_u64(registered_at);
        return s.take_data();
    }
};

/// Multi-device synchronization envelope targeting a specific recipient device
struct DeviceTargetedMessage {
    std::string target_device_id;
    std::string recipient_address;
    std::vector<uint8_t> encrypted_payload;
};

/// Manages linked device authorization, verification, and multi-device routing
class MultiDeviceManager {
public:
    MultiDeviceManager() = default;

    /// Authorize a new device using primary identity key
    bool register_device(const std::string& primary_address,
                         const std::string& device_id,
                         const crypto::PublicKey& device_pubkey,
                         const std::array<uint8_t, 32>& device_dh_pubkey,
                         const crypto::Signature& primary_signature,
                         const crypto::PublicKey& primary_pubkey,
                         const crypto::ICryptoEngine& crypto_engine,
                         uint64_t timestamp = 0) {
        std::lock_guard<std::mutex> lock(mutex_);

        DeviceRecord record;
        record.device_id = device_id;
        record.primary_address = primary_address;
        record.device_pubkey = device_pubkey;
        record.device_dh_pubkey = device_dh_pubkey;
        record.registered_at = (timestamp != 0) ? timestamp : 1700000000;
        record.last_active = record.registered_at;
        record.is_active = true;
        record.authorization_signature = primary_signature;

        // Verify primary signature authorizing this device
        auto auth_data = record.serialize_for_auth();
        if (!crypto_engine.verify(auth_data, primary_signature, primary_pubkey)) {
            return false; // Forged or invalid authorization
        }

        user_devices_[primary_address][device_id] = record;
        return true;
    }

    /// Revoke a device
    bool revoke_device(const std::string& primary_address,
                       const std::string& device_id,
                       const crypto::Signature& revocation_signature,
                       const crypto::PublicKey& primary_pubkey,
                       const crypto::ICryptoEngine& crypto_engine) {
        std::lock_guard<std::mutex> lock(mutex_);
        auto user_it = user_devices_.find(primary_address);
        if (user_it == user_devices_.end()) return false;

        auto dev_it = user_it->second.find(device_id);
        if (dev_it == user_it->second.end()) return false;

        // Verify revocation signature
        std::string tag = "BLOCKBUM_DEVICE_REVOKE:" + primary_address + ":" + device_id;
        std::span<const uint8_t> tag_span(reinterpret_cast<const uint8_t*>(tag.data()), tag.size());
        if (!crypto_engine.verify(tag_span, revocation_signature, primary_pubkey)) {
            return false;
        }

        dev_it->second.is_active = false;
        return true;
    }

    /// Get list of active devices for a user
    [[nodiscard]] std::vector<DeviceRecord> get_active_devices(const std::string& primary_address) const {
        std::lock_guard<std::mutex> lock(mutex_);
        std::vector<DeviceRecord> active;
        auto it = user_devices_.find(primary_address);
        if (it != user_devices_.end()) {
            for (const auto& [id, dev] : it->second) {
                if (dev.is_active) {
                    active.push_back(dev);
                }
            }
        }
        return active;
    }

    /// Check if a specific device is active
    [[nodiscard]] bool is_device_active(const std::string& primary_address, const std::string& device_id) const {
        std::lock_guard<std::mutex> lock(mutex_);
        auto user_it = user_devices_.find(primary_address);
        if (user_it == user_devices_.end()) return false;
        auto dev_it = user_it->second.find(device_id);
        if (dev_it == user_it->second.end()) return false;
        return dev_it->second.is_active;
    }

private:
    mutable std::mutex mutex_;
    std::unordered_map<std::string, std::unordered_map<std::string, DeviceRecord>> user_devices_;
};

} // namespace blockbum::messaging
