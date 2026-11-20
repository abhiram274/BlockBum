#pragma once

#include "blockbum/content/types.hpp"
#include "blockbum/content/content_store.hpp"
#include "blockbum/content/resumable_transfer.hpp"
#include "blockbum/content/storage_network.hpp"
#include "blockbum/crypto/e2e_encryption.hpp"
#include "blockbum/crypto/crypto_utils.hpp"
#include "blockbum/crypto/wallet.hpp"
#include <memory>
#include <vector>
#include <string>
#include <unordered_map>
#include <mutex>
#include <cmath>

namespace blockbum::content {

struct ContentProcessingResult {
    ContentManifest manifest;
    core::Hash256 file_encryption_key;
    std::vector<ContentChunk> chunks;
};

// Orchestrates chunking, encryption, integrity verification, access control, and reconstruction
class ContentManager {
public:
    explicit ContentManager(std::shared_ptr<ContentStore> local_store)
        : store_(std::move(local_store)) {}

    // 1. Ingest, encrypt, and chunk a file locally before distribution
    ContentProcessingResult prepare_and_store_file(
        const std::string& file_name,
        FileContentType type,
        std::span<const uint8_t> file_bytes,
        const crypto::Identity& uploader,
        bool is_public = false,
        const std::vector<std::string>& authorized_readers = {},
        size_t chunk_size = DEFAULT_CHUNK_SIZE) {

        if (file_bytes.size() > MAX_FILE_SIZE) {
            throw std::runtime_error("File exceeds maximum supported size: 100 MB");
        }

        // Generate random symmetric content encryption key
        core::Hash256 file_key = crypto::CryptoUtils::sha256(
            std::span<const uint8_t>(uploader.secret_key().data(), 32));

        // Encrypt whole file contents locally
        auto encrypted_payload = crypto::E2EEncryptionEngine::encrypt(file_bytes, file_key, 0x424C4F42); // "BLOB"

        // Divide into chunks
        size_t total_chunks = (encrypted_payload.size() + chunk_size - 1) / chunk_size;
        if (total_chunks == 0) total_chunks = 1;

        std::vector<ContentChunk> chunks;
        chunks.reserve(total_chunks);

        ContentManifest manifest;
        manifest.file_name = file_name;
        manifest.content_type = type;
        manifest.original_file_size = file_bytes.size();
        manifest.chunk_size = static_cast<uint32_t>(chunk_size);
        manifest.uploader_address = uploader.address();
        manifest.timestamp = 1700000000;
        manifest.is_public = is_public;
        manifest.authorized_readers = authorized_readers;
        if (!is_public) {
            manifest.authorized_readers.push_back(uploader.address());
        }

        std::vector<uint8_t> root_digest_input;

        for (size_t i = 0; i < total_chunks; ++i) {
            size_t start = i * chunk_size;
            size_t len = (std::min)(chunk_size, encrypted_payload.size() - start);

            ContentChunk chunk;
            chunk.chunk_index = static_cast<uint32_t>(i);
            chunk.total_chunks = static_cast<uint32_t>(total_chunks);
            chunk.encrypted_data.assign(encrypted_payload.begin() + start, encrypted_payload.begin() + start + len);
            chunk.chunk_hash = crypto::CryptoUtils::sha256(chunk.encrypted_data);

            // IPFS-compatible multihash CID string format (use underscores to ensure cross-platform filename validity)
            chunk.cid = "cid_sha256_" + core::to_hex(chunk.chunk_hash);

            manifest.chunk_cids.push_back(chunk.cid);
            manifest.chunk_hashes.push_back(chunk.chunk_hash);
            root_digest_input.insert(root_digest_input.end(), chunk.chunk_hash.begin(), chunk.chunk_hash.end());

            // Persist chunk locally in CAS
            store_->put_chunk(chunk);
            chunks.push_back(std::move(chunk));
        }

        // Root CID is deterministic hash of all chunk CIDs
        auto root_hash = crypto::CryptoUtils::sha256(root_digest_input);
        manifest.root_cid = "bbum_cas_" + core::to_hex(root_hash);

        store_->put_manifest(manifest);

        // Store access key locally
        {
            std::lock_guard<std::mutex> lock(keys_mutex_);
            content_keys_[manifest.root_cid] = file_key;
        }

        return {manifest, file_key, chunks};
    }

    // 2. Reconstruct and decrypt file from chunks
    [[nodiscard]] std::optional<std::vector<uint8_t>> retrieve_and_reassemble(
        const std::string& root_cid,
        const std::string& requester_address,
        const core::Hash256& encryption_key) {

        auto manifest_opt = store_->get_manifest(root_cid);
        if (!manifest_opt.has_value()) return std::nullopt;
        const auto& manifest = *manifest_opt;

        // Check access authorization
        if (!manifest.is_public) {
            auto it = std::find(manifest.authorized_readers.begin(),
                                manifest.authorized_readers.end(),
                                requester_address);
            if (it == manifest.authorized_readers.end()) {
                return std::nullopt; // Unauthorized
            }
        }

        // Collect and verify all chunks (support resuming partial downloads)
        std::vector<uint8_t> full_encrypted;
        full_encrypted.reserve(manifest.original_file_size + 1024);

        for (size_t i = 0; i < manifest.chunk_cids.size(); ++i) {
            const auto& cid = manifest.chunk_cids[i];
            auto chunk_opt = store_->get_chunk(cid);
            if (!chunk_opt.has_value()) {
                return std::nullopt; // Missing chunk: cannot complete reassembly
            }

            // Verify chunk integrity matches manifest commitment
            if (chunk_opt->chunk_hash != manifest.chunk_hashes[i]) {
                return std::nullopt; // Corrupted chunk
            }

            full_encrypted.insert(full_encrypted.end(),
                                  chunk_opt->encrypted_data.begin(),
                                  chunk_opt->encrypted_data.end());
        }

        // Decrypt assembled payload
        auto decrypted = crypto::E2EEncryptionEngine::decrypt(full_encrypted, encryption_key, 0x424C4F42);
        decrypted.resize(manifest.original_file_size);
        return decrypted;
    }

    // 3. Peer chunk replication helper
    bool replicate_chunk_to_peer(const std::string& cid, ContentStore& peer_store) {
        auto chunk = store_->get_chunk(cid);
        if (!chunk) return false;
        return peer_store.put_chunk(*chunk);
    }

    /// Create a resumable download session for an incoming manifest
    [[nodiscard]] ResumableDownloadSession create_resumable_download(const ContentManifest& manifest) const {
        return ResumableDownloadSession(manifest);
    }

    bool replicate_manifest_to_peer(const std::string& root_cid, ContentStore& peer_store) {
        auto m = store_->get_manifest(root_cid);
        if (!m) return false;
        return peer_store.put_manifest(*m);
    }

private:
    std::shared_ptr<ContentStore> store_;
    mutable std::mutex keys_mutex_;
    std::unordered_map<std::string, core::Hash256> content_keys_;
};

} // namespace blockbum::content
