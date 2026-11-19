#pragma once

#include "blockbum/messaging/types.hpp"
#include "blockbum/core/types.hpp"
#include "blockbum/core/serializer.hpp"
#include "blockbum/crypto/e2e_encryption.hpp"
#include <filesystem>
#include <fstream>
#include <mutex>
#include <vector>
#include <algorithm>

namespace blockbum::messaging {

struct StoredMessageRecord {
    std::string message_id;
    std::string sender;
    std::string recipient;
    uint64_t timestamp{0};
    uint64_t sequence_number{0};
    std::string plaintext_content;
    bool is_outgoing{false};
};

// Encrypted local database storing decrypted messages in protected storage
class EncryptedHistoryStore {
public:
    explicit EncryptedHistoryStore(std::filesystem::path db_path, core::Hash256 storage_key)
        : db_path_(std::move(db_path)), storage_key_(storage_key) {
        if (!db_path_.parent_path().empty() && !std::filesystem::exists(db_path_.parent_path())) {
            std::filesystem::create_directories(db_path_.parent_path());
        }
    }

    void append_message(const StoredMessageRecord& record) {
        std::lock_guard<std::mutex> lock(mutex_);
        records_.push_back(record);
        save_to_disk();
    }

    [[nodiscard]] std::vector<StoredMessageRecord> get_conversation(const std::string& participant_or_group) {
        std::lock_guard<std::mutex> lock(mutex_);
        load_from_disk();
        std::vector<StoredMessageRecord> res;
        for (const auto& r : records_) {
            if (r.sender == participant_or_group || r.recipient == participant_or_group) {
                res.push_back(r);
            }
        }
        std::sort(res.begin(), res.end(), [](const auto& a, const auto& b) {
            return a.sequence_number < b.sequence_number;
        });
        return res;
    }

    [[nodiscard]] size_t total_count() {
        std::lock_guard<std::mutex> lock(mutex_);
        load_from_disk();
        return records_.size();
    }

private:
    void save_to_disk() const {
        core::BinarySerializer s;
        s.write_u32(static_cast<uint32_t>(records_.size()));
        for (const auto& r : records_) {
            s.write_string(r.message_id);
            s.write_string(r.sender);
            s.write_string(r.recipient);
            s.write_u64(r.timestamp);
            s.write_u64(r.sequence_number);
            s.write_string(r.plaintext_content);
            s.write_u8(r.is_outgoing ? 1 : 0);
        }

        auto serialized = s.take_data();
        // Encrypt on disk with storage_key using fixed nonce 0x544F5245 (STORE)
        auto ciphertext = crypto::E2EEncryptionEngine::encrypt(serialized, storage_key_, 0x544F5245);

        std::ofstream out(db_path_, std::ios::binary | std::ios::trunc);
        if (out.is_open()) {
            out.write(reinterpret_cast<const char*>(ciphertext.data()), static_cast<std::streamsize>(ciphertext.size()));
        }
    }

    void load_from_disk() {
        if (!records_.empty()) return;
        if (!std::filesystem::exists(db_path_)) return;

        std::ifstream in(db_path_, std::ios::binary);
        if (!in.is_open()) return;

        std::vector<uint8_t> ciphertext((std::istreambuf_iterator<char>(in)),
                                         std::istreambuf_iterator<char>());
        if (ciphertext.empty()) return;

        try {
            auto decrypted = crypto::E2EEncryptionEngine::decrypt(ciphertext, storage_key_, 0x544F5245);
            core::BinaryDeserializer d(decrypted);

            uint32_t count = d.read_u32();
            records_.reserve(count);
            for (uint32_t i = 0; i < count; ++i) {
                StoredMessageRecord r;
                r.message_id = d.read_string();
                r.sender = d.read_string();
                r.recipient = d.read_string();
                r.timestamp = d.read_u64();
                r.sequence_number = d.read_u64();
                r.plaintext_content = d.read_string();
                r.is_outgoing = (d.read_u8() == 1);
                records_.push_back(std::move(r));
            }
        } catch (...) {
            records_.clear();
        }
    }

    std::filesystem::path db_path_;
    core::Hash256 storage_key_;
    mutable std::mutex mutex_;
    std::vector<StoredMessageRecord> records_;
};

} // namespace blockbum::messaging
