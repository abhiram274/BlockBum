#pragma once

#include "blockbum/network/inetwork.hpp"
#include "blockbum/network/wire_protocol.hpp"
#include <thread>
#include <atomic>
#include <mutex>
#include <unordered_map>
#include <vector>
#include <iostream>
#include <cstring>

#if defined(_WIN32)
#ifndef WIN32_LEAN_AND_MEAN
#define WIN32_LEAN_AND_MEAN
#endif
#include <winsock2.h>
#include <ws2tcpip.h>
#pragma comment(lib, "ws2_32.lib")
using socket_t = SOCKET;
inline constexpr socket_t INVALID_SOCKET_VAL = INVALID_SOCKET;
inline constexpr int SOCKET_ERROR_VAL = SOCKET_ERROR;
#else
#include <sys/types.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <unistd.h>
#include <fcntl.h>
using socket_t = int;
inline constexpr socket_t INVALID_SOCKET_VAL = -1;
inline constexpr int SOCKET_ERROR_VAL = -1;
#endif

namespace blockbum::network {

class TcpNetworkTransport : public INetworkTransport {
public:
    TcpNetworkTransport() {
#if defined(_WIN32)
        WSADATA wsa;
        WSAStartup(MAKEWORD(2, 2), &wsa);
#endif
    }

    ~TcpNetworkTransport() override {
        stop();
#if defined(_WIN32)
        WSACleanup();
#endif
    }

    bool start(uint16_t port) override {
        std::lock_guard<std::mutex> lock(state_mutex_);
        if (running_) return false;

        listen_fd_ = socket(AF_INET, SOCK_STREAM, 0);
        if (listen_fd_ == INVALID_SOCKET_VAL) return false;

        int opt = 1;
#if defined(_WIN32)
        setsockopt(listen_fd_, SOL_SOCKET, SO_REUSEADDR, reinterpret_cast<const char*>(&opt), sizeof(opt));
#else
        setsockopt(listen_fd_, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));
#endif

        sockaddr_in addr{};
        addr.sin_family = AF_INET;
        addr.sin_addr.s_addr = INADDR_ANY;
        addr.sin_port = htons(port);

        if (bind(listen_fd_, reinterpret_cast<sockaddr*>(&addr), sizeof(addr)) == SOCKET_ERROR_VAL) {
            close_socket(listen_fd_);
            listen_fd_ = INVALID_SOCKET_VAL;
            return false;
        }

        if (listen(listen_fd_, 16) == SOCKET_ERROR_VAL) {
            close_socket(listen_fd_);
            listen_fd_ = INVALID_SOCKET_VAL;
            return false;
        }

        port_ = port;
        running_ = true;
        accept_thread_ = std::thread(&TcpNetworkTransport::accept_loop, this);
        return true;
    }

    void stop() override {
        {
            std::lock_guard<std::mutex> lock(state_mutex_);
            if (!running_) return;
            running_ = false;

            if (listen_fd_ != INVALID_SOCKET_VAL) {
                close_socket(listen_fd_);
                listen_fd_ = INVALID_SOCKET_VAL;
            }
        }

        // Close peer connections first so workers unblock from recv()
        {
            std::lock_guard<std::mutex> lock(peers_mutex_);
            for (auto& [id, peer] : peers_) {
                close_socket(peer.sock);
                peer.sock = INVALID_SOCKET_VAL;
                if (peer.worker.joinable()) {
                    peer.worker.detach();
                }
            }
            peers_.clear();
        }

        if (accept_thread_.joinable()) {
            accept_thread_.detach();
        }
    }

    bool connect(const std::string& address) override {
        size_t colon = address.find(':');
        if (colon == std::string::npos) return false;

        std::string ip = address.substr(0, colon);
        uint16_t port = static_cast<uint16_t>(std::stoi(address.substr(colon + 1)));

        socket_t sock = socket(AF_INET, SOCK_STREAM, 0);
        if (sock == INVALID_SOCKET_VAL) return false;

        sockaddr_in addr{};
        addr.sin_family = AF_INET;
        addr.sin_port = htons(port);
        inet_pton(AF_INET, ip.c_str(), &addr.sin_addr);

        if (::connect(sock, reinterpret_cast<sockaddr*>(&addr), sizeof(addr)) == SOCKET_ERROR_VAL) {
            close_socket(sock);
            return false;
        }

        std::string peer_id = address;
        register_peer(peer_id, sock);
        return true;
    }

    void broadcast(std::span<const uint8_t> data) override {
        std::lock_guard<std::mutex> lock(peers_mutex_);
        for (auto& [id, peer] : peers_) {
            send_raw(peer.sock, data);
        }
    }

    bool send_to(const PeerId& peer_id, std::span<const uint8_t> data) override {
        std::lock_guard<std::mutex> lock(peers_mutex_);
        auto it = peers_.find(peer_id);
        if (it != peers_.end()) {
            return send_raw(it->second.sock, data);
        }
        return false;
    }

    void set_message_handler(MessageHandler handler) override {
        handler_ = std::move(handler);
    }

    [[nodiscard]] size_t peer_count() const override {
        std::lock_guard<std::mutex> lock(peers_mutex_);
        return peers_.size();
    }

    [[nodiscard]] std::vector<PeerId> get_peers() const {
        std::lock_guard<std::mutex> lock(peers_mutex_);
        std::vector<PeerId> list;
        list.reserve(peers_.size());
        for (const auto& [id, _] : peers_) {
            list.push_back(id);
        }
        return list;
    }

private:
    struct PeerConnection {
        socket_t sock;
        std::thread worker;
    };

    void close_socket(socket_t s) {
#if defined(_WIN32)
        closesocket(s);
#else
        close(s);
#endif
    }

    bool send_raw(socket_t sock, std::span<const uint8_t> data) {
        size_t total_sent = 0;
        while (total_sent < data.size()) {
            int sent = send(sock, reinterpret_cast<const char*>(data.data() + total_sent),
                            static_cast<int>(data.size() - total_sent), 0);
            if (sent <= 0) return false;
            total_sent += static_cast<size_t>(sent);
        }
        return true;
    }

    void register_peer(const std::string& peer_id, socket_t sock) {
        std::lock_guard<std::mutex> lock(peers_mutex_);
        if (peers_.find(peer_id) != peers_.end()) {
            close_socket(sock);
            return;
        }

        PeerConnection conn;
        conn.sock = sock;
        conn.worker = std::thread(&TcpNetworkTransport::read_loop, this, peer_id, sock);
        peers_.emplace(peer_id, std::move(conn));
    }

    void accept_loop() {
        while (running_) {
            sockaddr_in client_addr{};
            socklen_t addr_len = sizeof(client_addr);
            socket_t client_sock = accept(listen_fd_, reinterpret_cast<sockaddr*>(&client_addr), &addr_len);
            if (client_sock == INVALID_SOCKET_VAL) {
                if (!running_) break;
                continue;
            }

            char ip_str[INET_ADDRSTRLEN];
            inet_ntop(AF_INET, &client_addr.sin_addr, ip_str, INET_ADDRSTRLEN);
            std::string peer_id = std::string(ip_str) + ":" + std::to_string(ntohs(client_addr.sin_port));

            register_peer(peer_id, client_sock);
        }
    }

    void read_loop(std::string peer_id, socket_t sock) {
        std::vector<uint8_t> rx_buffer;
        rx_buffer.reserve(64 * 1024);
        uint8_t temp[4096];

        while (running_) {
            int bytes = recv(sock, reinterpret_cast<char*>(temp), sizeof(temp), 0);
            if (bytes <= 0 || !running_) {
                break; // Disconnected or shutting down
            }

            rx_buffer.insert(rx_buffer.end(), temp, temp + bytes);

            // Process complete framed messages
            while (rx_buffer.size() >= sizeof(MessageHeader)) {
                core::BinaryDeserializer header_d(rx_buffer);
                MessageHeader header = MessageHeader::deserialize(header_d);

                if (header.magic != PROTOCOL_MAGIC || header.payload_size > MAX_MESSAGE_SIZE) {
                    goto cleanup;
                }

                size_t total_msg_size = 13 + header.payload_size;
                if (rx_buffer.size() < total_msg_size) {
                    break;
                }

                if (handler_ && running_) {
                    std::span<const uint8_t> full_msg(rx_buffer.data(), total_msg_size);
                    handler_(peer_id, full_msg);
                }

                rx_buffer.erase(rx_buffer.begin(), rx_buffer.begin() + static_cast<ptrdiff_t>(total_msg_size));
            }
        }

    cleanup:
        close_socket(sock);
        if (running_) {
            std::thread([this, peer_id]() {
                std::lock_guard<std::mutex> lock(peers_mutex_);
                auto it = peers_.find(peer_id);
                if (it != peers_.end()) {
                    if (it->second.worker.joinable()) {
                        it->second.worker.detach();
                    }
                    peers_.erase(it);
                }
            }).detach();
        }
    }

    socket_t listen_fd_{INVALID_SOCKET_VAL};
    uint16_t port_{0};
    std::atomic<bool> running_{false};
    std::thread accept_thread_;
    std::mutex state_mutex_;

    mutable std::mutex peers_mutex_;
    std::unordered_map<PeerId, PeerConnection> peers_;
    MessageHandler handler_;
};

} // namespace blockbum::network
