#include <gtest/gtest.h>
#include "blockbum/core/types.hpp"
#include "blockbum/crypto/icrypto.hpp"
#include "blockbum/storage/istorage.hpp"
#include "blockbum/network/inetwork.hpp"
#include <map>

// Mock implementation of IStorageEngine to verify interface design and dependency injection
class MockStorageEngine : public blockbum::storage::IStorageEngine {
public:
    bool open(const std::string& path) override {
        is_open_ = true;
        path_ = path;
        return true;
    }

    void close() override {
        is_open_ = false;
    }

    std::optional<std::vector<uint8_t>> get(std::span<const uint8_t> key) const override {
        std::string k(key.begin(), key.end());
        auto it = store_.find(k);
        if (it != store_.end()) {
            return it->second;
        }
        return std::nullopt;
    }

    bool put(std::span<const uint8_t> key, std::span<const uint8_t> value) override {
        store_[std::string(key.begin(), key.end())] = std::vector<uint8_t>(value.begin(), value.end());
        return true;
    }

    bool remove(std::span<const uint8_t> key) override {
        return store_.erase(std::string(key.begin(), key.end())) > 0;
    }

    bool has(std::span<const uint8_t> key) const override {
        return store_.contains(std::string(key.begin(), key.end()));
    }

private:
    bool is_open_{false};
    std::string path_{};
    std::map<std::string, std::vector<uint8_t>> store_{};
};

TEST(CoreTypesTest, HexConversionRoundTrip) {
    std::vector<uint8_t> original = {0x00, 0x12, 0xAB, 0xCD, 0xEF, 0xFF};
    std::string hex = blockbum::core::to_hex(original);
    EXPECT_EQ(hex, "0012abcdefff");

    std::vector<uint8_t> parsed = blockbum::core::from_hex(hex);
    EXPECT_EQ(parsed, original);
}

TEST(CoreTypesTest, InvalidHexThrows) {
    EXPECT_THROW(blockbum::core::from_hex("abc"), std::invalid_argument);
}

TEST(InterfacesTest, MockStorageDependencyInjection) {
    std::unique_ptr<blockbum::storage::IStorageEngine> storage = std::make_unique<MockStorageEngine>();
    EXPECT_TRUE(storage->open("memory://test"));

    std::string test_key = "genesis_hash";
    std::string test_val = "0123456789abcdef";

    std::span<const uint8_t> key_span(reinterpret_cast<const uint8_t*>(test_key.data()), test_key.size());
    std::span<const uint8_t> val_span(reinterpret_cast<const uint8_t*>(test_val.data()), test_val.size());

    EXPECT_TRUE(storage->put(key_span, val_span));
    EXPECT_TRUE(storage->has(key_span));

    auto retrieved = storage->get(key_span);
    ASSERT_TRUE(retrieved.has_value());
    EXPECT_EQ(retrieved->size(), test_val.size());

    EXPECT_TRUE(storage->remove(key_span));
    EXPECT_FALSE(storage->has(key_span));
}
