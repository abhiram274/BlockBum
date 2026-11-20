#pragma once

#include "blockbum/core/types.hpp"
#include <string>
#include <vector>
#include <unordered_map>
#include <mutex>
#include <fstream>
#include <sstream>
#include <chrono>
#include <algorithm>
#include <filesystem>
#include <cstdint>

namespace blockbum::network {

struct PeerInfo {
    std::string address;            // e.g. "192.168.1.1:9000" or "[2001:db8::1]:9000"
    uint64_t last_seen{0};          // Unix epoch seconds
    int32_t score{100};             // Reputation score (starts at 100)
    uint32_t failed_attempts{0};    // Sequential connection failures
    uint64_t banned_until{0};       // Unix epoch seconds; 0 if not banned
    uint32_t services{1};           // 1 = Full Node, 2 = Pruned Node
};

// Thread-safe peer address book with persistent storage and reputation scoring
class PeerAddressBook {
public:
    explicit PeerAddressBook(std::string file_path = "")
        : file_path_(std::move(file_path)) {
        if (!file_path_.empty()) {
            load_from_file(file_path_);
        }
    }

    ~PeerAddressBook() {
        if (!file_path_.empty()) {
            save_to_file(file_path_);
        }
    }

    // Add or update a peer address
    bool add_peer(const std::string& address, uint32_t services = 1) {
        if (address.empty()) return false;
        std::lock_guard<std::mutex> lock(mutex_);

        auto it = peers_.find(address);
        auto now = current_time_sec();
        if (it != peers_.end()) {
            it->second.last_seen = now;
            it->second.services = services;
            return false; // Already existed
        }

        PeerInfo info;
        info.address = address;
        info.last_seen = now;
        info.score = 100;
        info.failed_attempts = 0;
        info.banned_until = 0;
        info.services = services;

        peers_[address] = info;
        return true;
    }

    // Record that a peer responded or sent valid data
    void record_peer_success(const std::string& address) {
        std::lock_guard<std::mutex> lock(mutex_);
        auto it = peers_.find(address);
        if (it != peers_.end()) {
            it->second.last_seen = current_time_sec();
            it->second.failed_attempts = 0;
            if (it->second.score < 100) {
                it->second.score = std::min(100, it->second.score + 5);
            }
        }
    }

    // Record that a connection attempt failed
    void record_peer_failure(const std::string& address) {
        std::lock_guard<std::mutex> lock(mutex_);
        auto it = peers_.find(address);
        if (it != peers_.end()) {
            it->second.failed_attempts++;
            it->second.score -= 10;
            if (it->second.score <= 0) {
                // Ban for 1 hour upon exhaustion of reputation
                it->second.banned_until = current_time_sec() + 3600;
            }
        }
    }

    // Adjust peer reputation score directly
    void adjust_score(const std::string& address, int32_t delta) {
        std::lock_guard<std::mutex> lock(mutex_);
        auto it = peers_.find(address);
        if (it != peers_.end()) {
            it->second.score += delta;
            if (it->second.score <= 0) {
                it->second.banned_until = current_time_sec() + 3600; // Ban for 1 hour
            }
        }
    }

    // Explicitly ban a peer for duration_seconds
    void ban_peer(const std::string& address, uint64_t duration_seconds = 86400) {
        std::lock_guard<std::mutex> lock(mutex_);
        auto now = current_time_sec();
        peers_[address].address = address;
        peers_[address].score = 0;
        peers_[address].banned_until = now + duration_seconds;
    }

    // Check if peer is currently banned
    [[nodiscard]] bool is_banned(const std::string& address) const {
        std::lock_guard<std::mutex> lock(mutex_);
        auto it = peers_.find(address);
        if (it == peers_.end()) return false;
        auto now = current_time_sec();
        return (it->second.banned_until > now);
    }

    // Retrieve reputation score
    [[nodiscard]] int32_t get_score(const std::string& address) const {
        std::lock_guard<std::mutex> lock(mutex_);
        auto it = peers_.find(address);
        if (it != peers_.end()) return it->second.score;
        return 0;
    }

    // Select candidate peers to connect to (excluding currently connected or banned)
    [[nodiscard]] std::vector<std::string> select_candidates(
        size_t max_count,
        const std::vector<std::string>& active_peers) const {

        std::lock_guard<std::mutex> lock(mutex_);
        auto now = current_time_sec();

        std::vector<PeerInfo> eligible;
        for (const auto& [addr, info] : peers_) {
            if (info.banned_until > now) continue; // Skip banned
            if (std::find(active_peers.begin(), active_peers.end(), addr) != active_peers.end()) {
                continue; // Already connected
            }
            eligible.push_back(info);
        }

        // Sort by reputation score descending, then last_seen descending
        std::sort(eligible.begin(), eligible.end(), [](const PeerInfo& a, const PeerInfo& b) {
            if (a.score != b.score) return a.score > b.score;
            return a.last_seen > b.last_seen;
        });

        std::vector<std::string> result;
        for (size_t i = 0; i < eligible.size() && i < max_count; ++i) {
            result.push_back(eligible[i].address);
        }
        return result;
    }

    // Return list of known good peers for PEX sharing
    [[nodiscard]] std::vector<PeerInfo> get_known_peers(size_t max_count = 50) const {
        std::lock_guard<std::mutex> lock(mutex_);
        auto now = current_time_sec();

        std::vector<PeerInfo> good_peers;
        for (const auto& [addr, info] : peers_) {
            if (info.banned_until <= now && info.score > 20) {
                good_peers.push_back(info);
            }
        }

        std::sort(good_peers.begin(), good_peers.end(), [](const PeerInfo& a, const PeerInfo& b) {
            return a.last_seen > b.last_seen;
        });

        if (good_peers.size() > max_count) {
            good_peers.resize(max_count);
        }
        return good_peers;
    }

    [[nodiscard]] size_t size() const {
        std::lock_guard<std::mutex> lock(mutex_);
        return peers_.size();
    }

    // Save peers to a simple, portable text format (address score last_seen services banned_until)
    bool save_to_file(const std::string& path) const {
        std::lock_guard<std::mutex> lock(mutex_);
        try {
            std::filesystem::path p(path);
            if (p.has_parent_path()) {
                std::filesystem::create_directories(p.parent_path());
            }

            std::ofstream out(path, std::ios::trunc);
            if (!out.is_open()) return false;

            out << "# BlockBum Peer Address Book v1\n";
            for (const auto& [addr, info] : peers_) {
                out << info.address << " "
                    << info.score << " "
                    << info.last_seen << " "
                    << info.services << " "
                    << info.banned_until << "\n";
            }
            return true;
        } catch (...) {
            return false;
        }
    }

    // Load peers from file
    bool load_from_file(const std::string& path) {
        std::lock_guard<std::mutex> lock(mutex_);
        if (!std::filesystem::exists(path)) return false;

        std::ifstream in(path);
        if (!in.is_open()) return false;

        std::string line;
        while (std::getline(in, line)) {
            if (line.empty() || line[0] == '#') continue;
            std::istringstream iss(line);
            PeerInfo info;
            if (iss >> info.address >> info.score >> info.last_seen >> info.services >> info.banned_until) {
                peers_[info.address] = info;
            }
        }
        return true;
    }

private:
    static uint64_t current_time_sec() {
        return static_cast<uint64_t>(
            std::chrono::duration_cast<std::chrono::seconds>(
                std::chrono::system_clock::now().time_since_epoch()).count());
    }

    mutable std::mutex mutex_;
    std::unordered_map<std::string, PeerInfo> peers_;
    std::string file_path_;
};

} // namespace blockbum::network
