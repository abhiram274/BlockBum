#pragma once

#include "blockbum/core/types.hpp"
#include <cstdint>
#include <vector>
#include <span>
#include <string>
#include <string_view>
#include <cstring>
#include <stdexcept>

namespace blockbum::core {

class BinarySerializer {
public:
    BinarySerializer() = default;

    void write_u8(uint8_t value) {
        buffer_.push_back(value);
    }

    void write_u16(uint16_t value) {
        buffer_.push_back(static_cast<uint8_t>(value & 0xFF));
        buffer_.push_back(static_cast<uint8_t>((value >> 8) & 0xFF));
    }

    void write_u32(uint32_t value) {
        for (int i = 0; i < 4; ++i) {
            buffer_.push_back(static_cast<uint8_t>((value >> (i * 8)) & 0xFF));
        }
    }

    void write_u64(uint64_t value) {
        for (int i = 0; i < 8; ++i) {
            buffer_.push_back(static_cast<uint8_t>((value >> (i * 8)) & 0xFF));
        }
    }

    void write_hash(const Hash256& hash) {
        buffer_.insert(buffer_.end(), hash.begin(), hash.end());
    }

    void write_bytes(std::span<const uint8_t> data) {
        write_u32(static_cast<uint32_t>(data.size()));
        buffer_.insert(buffer_.end(), data.begin(), data.end());
    }

    void write_string(std::string_view str) {
        write_u32(static_cast<uint32_t>(str.size()));
        buffer_.insert(buffer_.end(), str.begin(), str.end());
    }

    [[nodiscard]] const std::vector<uint8_t>& data() const noexcept {
        return buffer_;
    }

    [[nodiscard]] std::vector<uint8_t> take_data() noexcept {
        return std::move(buffer_);
    }

private:
    std::vector<uint8_t> buffer_;
};

class BinaryDeserializer {
public:
    explicit BinaryDeserializer(std::span<const uint8_t> data)
        : data_(data), offset_(0) {}

    uint8_t read_u8() {
        check_available(1);
        return data_[offset_++];
    }

    uint16_t read_u16() {
        check_available(2);
        uint16_t val = static_cast<uint16_t>(data_[offset_]) |
                       (static_cast<uint16_t>(data_[offset_ + 1]) << 8);
        offset_ += 2;
        return val;
    }

    uint32_t read_u32() {
        check_available(4);
        uint32_t val = 0;
        for (int i = 0; i < 4; ++i) {
            val |= static_cast<uint32_t>(data_[offset_ + static_cast<size_t>(i)]) << (i * 8);
        }
        offset_ += 4;
        return val;
    }

    uint64_t read_u64() {
        check_available(8);
        uint64_t val = 0;
        for (int i = 0; i < 8; ++i) {
            val |= static_cast<uint64_t>(data_[offset_ + static_cast<size_t>(i)]) << (i * 8);
        }
        offset_ += 8;
        return val;
    }

    Hash256 read_hash() {
        check_available(32);
        Hash256 hash{};
        std::memcpy(hash.data(), data_.data() + offset_, 32);
        offset_ += 32;
        return hash;
    }

    std::vector<uint8_t> read_bytes() {
        uint32_t len = read_u32();
        check_available(len);
        std::vector<uint8_t> bytes(data_.begin() + static_cast<ptrdiff_t>(offset_),
                                   data_.begin() + static_cast<ptrdiff_t>(offset_ + len));
        offset_ += len;
        return bytes;
    }

    std::string read_string() {
        uint32_t len = read_u32();
        check_available(len);
        std::string str(reinterpret_cast<const char*>(data_.data() + offset_), len);
        offset_ += len;
        return str;
    }

    [[nodiscard]] size_t remaining() const noexcept {
        return (offset_ <= data_.size()) ? (data_.size() - offset_) : 0;
    }

private:
    void check_available(size_t count) const {
        if (offset_ + count > data_.size()) {
            throw std::runtime_error("Unexpected end of binary payload while deserializing");
        }
    }

    std::span<const uint8_t> data_;
    size_t offset_{0};
};

} // namespace blockbum::core
