#pragma once

#include "blockbum/core/types.hpp"
#include "blockbum/core/serializer.hpp"
#include "blockbum/crypto/icrypto.hpp"
#include <string>
#include <vector>
#include <cstdint>

namespace blockbum::content {

// Standard chunk size: 256 KB (aligned with IPFS UnixFS chunking)
inline constexpr size_t DEFAULT_CHUNK_SIZE = 256 * 1024;
// Maximum supported file size for DevNet: 100 MB
inline constexpr uint64_t MAX_FILE_SIZE = 100 * 1024 * 1024;

enum class FileContentType : uint8_t {
    GenericBinary = 0,
    DocumentPDF = 1,
    Image = 2,
    Video = 3,
    Audio = 4,
    SourceCode = 5
};

inline const char* content_type_to_mime(FileContentType type) {
    switch (type) {
        case FileContentType::DocumentPDF: return "application/pdf";
        case FileContentType::Image: return "image/jpeg";
        case FileContentType::Video: return "video/mp4";
        case FileContentType::Audio: return "audio/mpeg";
        case FileContentType::SourceCode: return "text/plain";
        default: return "application/octet-stream";
    }
}

struct ContentChunk {
    std::string cid;            // Content ID: "cid:sha256:" + hex(hash)
    uint32_t chunk_index{0};
    uint32_t total_chunks{0};
    core::Hash256 chunk_hash{};
    std::vector<uint8_t> encrypted_data;

    [[nodiscard]] std::vector<uint8_t> serialize() const {
        core::BinarySerializer s;
        s.write_string(cid);
        s.write_u32(chunk_index);
        s.write_u32(total_chunks);
        s.write_hash(chunk_hash);
        s.write_bytes(encrypted_data);
        return s.take_data();
    }

    static ContentChunk deserialize(core::BinaryDeserializer& d) {
        ContentChunk c;
        c.cid = d.read_string();
        c.chunk_index = d.read_u32();
        c.total_chunks = d.read_u32();
        c.chunk_hash = d.read_hash();
        c.encrypted_data = d.read_bytes();
        return c;
    }
};

// Content Manifest published or referenced off-chain/on-chain
struct ContentManifest {
    std::string root_cid;           // Root Content ID (hash of assembled encrypted content)
    std::string file_name;
    FileContentType content_type{FileContentType::GenericBinary};
    uint64_t original_file_size{0};
    uint32_t chunk_size{static_cast<uint32_t>(DEFAULT_CHUNK_SIZE)};
    std::vector<std::string> chunk_cids;
    std::vector<core::Hash256> chunk_hashes;
    std::string uploader_address;
    uint64_t timestamp{0};
    bool is_public{false};
    std::vector<std::string> authorized_readers; // Addresses permitted to access encryption key

    [[nodiscard]] std::vector<uint8_t> serialize() const {
        core::BinarySerializer s;
        s.write_string(root_cid);
        s.write_string(file_name);
        s.write_u8(static_cast<uint8_t>(content_type));
        s.write_u64(original_file_size);
        s.write_u32(chunk_size);

        s.write_u32(static_cast<uint32_t>(chunk_cids.size()));
        for (const auto& cid : chunk_cids) {
            s.write_string(cid);
        }

        s.write_u32(static_cast<uint32_t>(chunk_hashes.size()));
        for (const auto& h : chunk_hashes) {
            s.write_hash(h);
        }

        s.write_string(uploader_address);
        s.write_u64(timestamp);
        s.write_u8(is_public ? 1 : 0);

        s.write_u32(static_cast<uint32_t>(authorized_readers.size()));
        for (const auto& reader : authorized_readers) {
            s.write_string(reader);
        }

        return s.take_data();
    }

    static ContentManifest deserialize(core::BinaryDeserializer& d) {
        ContentManifest m;
        m.root_cid = d.read_string();
        m.file_name = d.read_string();
        m.content_type = static_cast<FileContentType>(d.read_u8());
        m.original_file_size = d.read_u64();
        m.chunk_size = d.read_u32();

        uint32_t cid_count = d.read_u32();
        m.chunk_cids.reserve(cid_count);
        for (uint32_t i = 0; i < cid_count; ++i) {
            m.chunk_cids.push_back(d.read_string());
        }

        uint32_t hash_count = d.read_u32();
        m.chunk_hashes.reserve(hash_count);
        for (uint32_t i = 0; i < hash_count; ++i) {
            m.chunk_hashes.push_back(d.read_hash());
        }

        m.uploader_address = d.read_string();
        m.timestamp = d.read_u64();
        m.is_public = (d.read_u8() == 1);

        uint32_t reader_count = d.read_u32();
        m.authorized_readers.reserve(reader_count);
        for (uint32_t i = 0; i < reader_count; ++i) {
            m.authorized_readers.push_back(d.read_string());
        }

        return m;
    }
};

} // namespace blockbum::content
