#pragma once

#include <span>
#include <string>
#include <vector>
#include <optional>

namespace blockbum::storage {

/// Abstract key-value storage engine interface
/// Supports RocksDB in production, in-memory/mock storage for tests
class IStorageEngine {
public:
    virtual ~IStorageEngine() = default;

    /// Open or create the database at specified path
    virtual bool open(const std::string& path) = 0;

    /// Close the storage engine
    virtual void close() = 0;

    /// Read value associated with key
    [[nodiscard]] virtual std::optional<std::vector<uint8_t>> get(std::span<const uint8_t> key) const = 0;

    /// Store key-value pair
    virtual bool put(std::span<const uint8_t> key, std::span<const uint8_t> value) = 0;

    /// Delete key
    virtual bool remove(std::span<const uint8_t> key) = 0;

    /// Check if key exists
    [[nodiscard]] virtual bool has(std::span<const uint8_t> key) const = 0;
};

} // namespace blockbum::storage
