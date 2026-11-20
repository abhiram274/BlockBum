#pragma once

#include "blockbum/content/types.hpp"
#include "blockbum/content/content_store.hpp"
#include "blockbum/crypto/crypto_utils.hpp"
#include <vector>
#include <string>
#include <unordered_map>
#include <mutex>
#include <memory>
#include <algorithm>
#include <optional>
#include <stdexcept>

namespace blockbum::content {

enum class ChunkDownloadStatus : uint8_t {
    Pending = 0,
    Completed = 1,
    Corrupted = 2
};

struct ChunkProgress {
    uint32_t chunk_index{0};
    std::string cid;
    core::Hash256 expected_hash{};
    ChunkDownloadStatus status{ChunkDownloadStatus::Pending};
    std::vector<uint8_t> data;
};

/// Tracks and orchestrates resilient, resumable chunk-level downloads for large files
class ResumableDownloadSession {
public:
    explicit ResumableDownloadSession(ContentManifest manifest)
        : manifest_(std::move(manifest)) {
        size_t num_chunks = manifest_.chunk_cids.size();
        chunks_.reserve(num_chunks);
        for (size_t i = 0; i < num_chunks; ++i) {
            ChunkProgress cp;
            cp.chunk_index = static_cast<uint32_t>(i);
            cp.cid = manifest_.chunk_cids[i];
            if (i < manifest_.chunk_hashes.size()) {
                cp.expected_hash = manifest_.chunk_hashes[i];
            }
            cp.status = ChunkDownloadStatus::Pending;
            chunks_.push_back(std::move(cp));
        }
    }

    /// Ingest a downloaded chunk with instant cryptographic checksum verification
    bool ingest_chunk(uint32_t chunk_index, std::span<const uint8_t> chunk_bytes) {
        std::lock_guard<std::mutex> lock(mutex_);
        if (chunk_index >= chunks_.size()) {
            return false;
        }

        auto& chunk = chunks_[chunk_index];

        // 1. Verify cryptographic SHA-256 integrity
        auto calculated_hash = crypto::CryptoUtils::sha256(chunk_bytes);
        if (calculated_hash != chunk.expected_hash) {
            chunk.status = ChunkDownloadStatus::Corrupted;
            chunk.data.clear();
            corrupted_count_++;
            return false; // Checksum mismatch: chunk corrupted in transit
        }

        // 2. Mark chunk completed and store data
        chunk.status = ChunkDownloadStatus::Completed;
        chunk.data.assign(chunk_bytes.begin(), chunk_bytes.end());
        completed_count_++;
        return true;
    }

    /// Check if all chunks have been downloaded and verified
    [[nodiscard]] bool is_complete() const {
        std::lock_guard<std::mutex> lock(mutex_);
        for (const auto& cp : chunks_) {
            if (cp.status != ChunkDownloadStatus::Completed) {
                return false;
            }
        }
        return true;
    }

    /// Get list of pending chunk indices that still need to be downloaded or retried
    [[nodiscard]] std::vector<uint32_t> get_missing_chunks() const {
        std::lock_guard<std::mutex> lock(mutex_);
        std::vector<uint32_t> missing;
        for (const auto& cp : chunks_) {
            if (cp.status != ChunkDownloadStatus::Completed) {
                missing.push_back(cp.chunk_index);
            }
        }
        return missing;
    }

    /// Reassemble all downloaded chunks into full encrypted file payload
    [[nodiscard]] std::optional<std::vector<uint8_t>> assemble_payload() const {
        std::lock_guard<std::mutex> lock(mutex_);
        if (completed_count_ < chunks_.size()) {
            return std::nullopt; // Incomplete
        }

        std::vector<uint8_t> full_payload;
        for (const auto& cp : chunks_) {
            if (cp.status != ChunkDownloadStatus::Completed) return std::nullopt;
            full_payload.insert(full_payload.end(), cp.data.begin(), cp.data.end());
        }
        return full_payload;
    }

    [[nodiscard]] double progress_percentage() const {
        std::lock_guard<std::mutex> lock(mutex_);
        if (chunks_.empty()) return 100.0;
        return (static_cast<double>(completed_count_) / chunks_.size()) * 100.0;
    }

    [[nodiscard]] size_t total_chunks() const noexcept {
        return chunks_.size();
    }

    [[nodiscard]] size_t completed_chunks() const noexcept {
        return completed_count_;
    }

    [[nodiscard]] size_t corrupted_retries() const noexcept {
        return corrupted_count_;
    }

    [[nodiscard]] const ContentManifest& manifest() const noexcept {
        return manifest_;
    }

private:
    mutable std::mutex mutex_;
    ContentManifest manifest_;
    std::vector<ChunkProgress> chunks_;
    size_t completed_count_{0};
    size_t corrupted_count_{0};
};

} // namespace blockbum::content
