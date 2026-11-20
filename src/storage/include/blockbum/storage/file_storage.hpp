#pragma once

#include "blockbum/storage/istorage.hpp"
#include <filesystem>
#include <fstream>
#include <mutex>
#include <unordered_map>
#include <algorithm>

namespace blockbum::storage {

class FileStorageEngine : public IStorageEngine {
public:
    FileStorageEngine() = default;
    ~FileStorageEngine() override {
        close();
    }

    bool open(const std::string& path) override {
        std::lock_guard<std::mutex> lock(mutex_);
        base_dir_ = path;
        try {
            if (!std::filesystem::exists(base_dir_)) {
                std::filesystem::create_directories(base_dir_);
            }
            db_file_ = base_dir_ / "store.bin";
            is_open_ = true;
            load_index();
            return true;
        } catch (...) {
            return false;
        }
    }

    void close() override {
        std::lock_guard<std::mutex> lock(mutex_);
        if (is_open_) {
            flush_to_disk();
            is_open_ = false;
        }
    }

    [[nodiscard]] std::optional<std::vector<uint8_t>> get(std::span<const uint8_t> key) const override {
        std::lock_guard<std::mutex> lock(mutex_);
        if (!is_open_) return std::nullopt;

        std::string key_str(key.begin(), key.end());
        auto it = memory_map_.find(key_str);
        if (it != memory_map_.end()) {
            return it->second;
        }
        return std::nullopt;
    }

    bool put(std::span<const uint8_t> key, std::span<const uint8_t> value) override {
        std::lock_guard<std::mutex> lock(mutex_);
        if (!is_open_) return false;

        std::string key_str(key.begin(), key.end());
        memory_map_[key_str] = std::vector<uint8_t>(value.begin(), value.end());
        flush_to_disk();
        return true;
    }

    bool remove(std::span<const uint8_t> key) override {
        std::lock_guard<std::mutex> lock(mutex_);
        if (!is_open_) return false;

        std::string key_str(key.begin(), key.end());
        if (memory_map_.erase(key_str) > 0) {
            flush_to_disk();
            return true;
        }
        return false;
    }

    [[nodiscard]] bool has(std::span<const uint8_t> key) const override {
        std::lock_guard<std::mutex> lock(mutex_);
        if (!is_open_) return false;

        std::string key_str(key.begin(), key.end());
        return memory_map_.find(key_str) != memory_map_.end();
    }

    bool write_batch(const std::vector<WriteOp>& ops) override {
        std::lock_guard<std::mutex> lock(mutex_);
        if (!is_open_) return false;

        for (const auto& op : ops) {
            std::string key_str(op.key.begin(), op.key.end());
            if (op.is_put) {
                memory_map_[key_str] = op.value;
            } else {
                memory_map_.erase(key_str);
            }
        }
        flush_to_disk();
        return true;
    }

private:
    void load_index() {
        if (!std::filesystem::exists(db_file_)) {
            std::filesystem::path tmp_file = db_file_.string() + ".tmp";
            if (std::filesystem::exists(tmp_file)) {
                std::error_code ec;
                std::filesystem::copy_file(tmp_file, db_file_, std::filesystem::copy_options::overwrite_existing, ec);
            } else {
                return;
            }
        }
        std::ifstream file(db_file_, std::ios::binary);
        if (!file.is_open()) return;

        memory_map_.clear();
        while (file.peek() != EOF) {
            uint32_t klen = 0;
            if (!file.read(reinterpret_cast<char*>(&klen), sizeof(klen))) break;
            std::string key(klen, '\0');
            if (!file.read(key.data(), static_cast<std::streamsize>(klen))) break;

            uint32_t vlen = 0;
            if (!file.read(reinterpret_cast<char*>(&vlen), sizeof(vlen))) break;
            std::vector<uint8_t> val(vlen);
            if (!file.read(reinterpret_cast<char*>(val.data()), static_cast<std::streamsize>(vlen))) break;

            memory_map_[key] = std::move(val);
        }
    }

    void flush_to_disk() const {
        if (!is_open_ || db_file_.empty()) return;
        std::filesystem::path tmp_file = db_file_.string() + ".tmp";
        std::ofstream file(tmp_file, std::ios::binary | std::ios::trunc);
        if (!file.is_open()) return;

        for (const auto& [k, v] : memory_map_) {
            uint32_t klen = static_cast<uint32_t>(k.size());
            file.write(reinterpret_cast<const char*>(&klen), sizeof(klen));
            file.write(k.data(), static_cast<std::streamsize>(klen));

            uint32_t vlen = static_cast<uint32_t>(v.size());
            file.write(reinterpret_cast<const char*>(&vlen), sizeof(vlen));
            file.write(reinterpret_cast<const char*>(v.data()), static_cast<std::streamsize>(vlen));
        }
        file.flush();
        file.close();

        std::error_code ec;
        std::filesystem::copy_file(tmp_file, db_file_, std::filesystem::copy_options::overwrite_existing, ec);
        std::filesystem::remove(tmp_file, ec);
    }

    std::filesystem::path base_dir_;
    std::filesystem::path db_file_;
    bool is_open_{false};
    mutable std::mutex mutex_;
    std::unordered_map<std::string, std::vector<uint8_t>> memory_map_;
};

} // namespace blockbum::storage
