#pragma once

#include "blockbum/content/types.hpp"
#include "blockbum/core/types.hpp"
#include "blockbum/crypto/crypto_utils.hpp"
#include <filesystem>
#include <fstream>
#include <mutex>
#include <unordered_map>
#include <unordered_set>
#include <vector>
#include <optional>
#include <algorithm>

namespace blockbum::content {

// Local Content-Addressed Storage (CAS) for chunks and manifests
class ContentStore {
public:
    explicit ContentStore(std::filesystem::path storage_dir, size_t max_cached_chunks = 1000)
        : storage_dir_(std::move(storage_dir)), max_cached_chunks_(max_cached_chunks) {
        if (!std::filesystem::exists(storage_dir_)) {
            std::filesystem::create_directories(storage_dir_);
        }
    }

    // Store a verified chunk to disk
    bool put_chunk(const ContentChunk& chunk) {
        std::lock_guard<std::mutex> lock(mutex_);

        // Verify chunk hash before storing
        auto calculated_hash = crypto::CryptoUtils::sha256(chunk.encrypted_data);
        if (calculated_hash != chunk.chunk_hash) {
            return false; // Integrity violation
        }

        auto chunk_path = storage_dir_ / (chunk.cid + ".chunk");
        std::ofstream out(chunk_path, std::ios::binary | std::ios::trunc);
        if (!out.is_open()) return false;

        auto serialized = chunk.serialize();
        out.write(reinterpret_cast<const char*>(serialized.data()), static_cast<std::streamsize>(serialized.size()));
        chunk_cids_.insert(chunk.cid);
        return true;
    }

    // Retrieve chunk by its CID
    [[nodiscard]] std::optional<ContentChunk> get_chunk(const std::string& cid) const {
        std::lock_guard<std::mutex> lock(mutex_);
        auto chunk_path = storage_dir_ / (cid + ".chunk");
        if (!std::filesystem::exists(chunk_path)) {
            return std::nullopt;
        }

        std::ifstream in(chunk_path, std::ios::binary);
        if (!in.is_open()) return std::nullopt;

        std::vector<uint8_t> buffer((std::istreambuf_iterator<char>(in)),
                                     std::istreambuf_iterator<char>());
        if (buffer.empty()) return std::nullopt;

        core::BinaryDeserializer d(buffer);
        auto chunk = ContentChunk::deserialize(d);

        // Verify integrity before returning
        if (crypto::CryptoUtils::sha256(chunk.encrypted_data) != chunk.chunk_hash) {
            return std::nullopt; // Corrupted chunk on disk
        }

        return chunk;
    }

    // Check if chunk exists locally
    [[nodiscard]] bool has_chunk(const std::string& cid) const {
        std::lock_guard<std::mutex> lock(mutex_);
        if (chunk_cids_.find(cid) != chunk_cids_.end()) return true;
        auto chunk_path = storage_dir_ / (cid + ".chunk");
        return std::filesystem::exists(chunk_path);
    }

    // Store Manifest
    bool put_manifest(const ContentManifest& manifest) {
        std::lock_guard<std::mutex> lock(mutex_);
        auto path = storage_dir_ / (manifest.root_cid + ".manifest");
        std::ofstream out(path, std::ios::binary | std::ios::trunc);
        if (!out.is_open()) return false;

        auto serialized = manifest.serialize();
        out.write(reinterpret_cast<const char*>(serialized.data()), static_cast<std::streamsize>(serialized.size()));
        manifests_[manifest.root_cid] = manifest;
        return true;
    }

    [[nodiscard]] std::optional<ContentManifest> get_manifest(const std::string& root_cid) const {
        std::lock_guard<std::mutex> lock(mutex_);
        auto it = manifests_.find(root_cid);
        if (it != manifests_.end()) return it->second;

        auto path = storage_dir_ / (root_cid + ".manifest");
        if (!std::filesystem::exists(path)) return std::nullopt;

        std::ifstream in(path, std::ios::binary);
        if (!in.is_open()) return std::nullopt;

        std::vector<uint8_t> buffer((std::istreambuf_iterator<char>(in)),
                                     std::istreambuf_iterator<char>());
        core::BinaryDeserializer d(buffer);
        return ContentManifest::deserialize(d);
    }

    // Evict expired or oldest chunks if storage limit exceeded
    void enforce_retention_limit(size_t max_chunks) {
        std::lock_guard<std::mutex> lock(mutex_);
        std::vector<std::filesystem::path> files;
        for (const auto& entry : std::filesystem::directory_iterator(storage_dir_)) {
            if (entry.path().extension() == ".chunk") {
                files.push_back(entry.path());
            }
        }

        if (files.size() > max_chunks) {
            size_t to_delete = files.size() - max_chunks;
            for (size_t i = 0; i < to_delete; ++i) {
                std::filesystem::remove(files[i]);
            }
        }
    }

private:
    std::filesystem::path storage_dir_;
    size_t max_cached_chunks_{1000};
    mutable std::mutex mutex_;
    std::unordered_set<std::string> chunk_cids_;
    mutable std::unordered_map<std::string, ContentManifest> manifests_;
};

} // namespace blockbum::content
