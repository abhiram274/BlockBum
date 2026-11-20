#pragma once

#include "blockbum/network/inetwork.hpp"
#include "blockbum/network/wire_protocol.hpp"
#include <thread>
#include <atomic>
#include <mutex>
#include <unordered_map>
#include <vector>
#include <string>
#include <iostream>
#include <cstring>
#include <utility>

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
using socklen_t = int;
#else
#include <sys/types.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <netdb.h>
#include <unistd.h>
#include <fcntl.h>
using socket_t = int;
inline constexpr socket_t INVALID_SOCKET_VAL = -1;
inline constexpr int SOCKET_ERROR_VAL = -1;
#endif

#ifndef NI_MAXHOST
#define NI_MAXHOST 1025
#endif
#ifndef NI_MAXSERV
#define NI_MAXSERV 32
#endif

namespace blockbum::network {

class TcpNetworkTransport : public INetworkTransport {
public:
    explicit TcpNetworkTransport(size_t max_inbound_peers = 32)
        : max_inbound_peers_(max_inbound_peers) {
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

    // Parse both IPv4 and IPv6 bracketed addresses (e.g. "[::1]:9000" or "127.0.0.1:9000")
    static std::pair<std::string, std::string> parse_address(const std::string& address) {
        if (address.empty()) return {"", "9000"};
        if (address.front() == '[') {
            auto close_b = address.find(']');
            if (close_b != std::string::npos) {
                std::string host = address.substr(1, close_b - 1);
                std::string port = "9000";
                if (close_b + 1 < address.size() && address[close_b + 1] == ':') {
                    port = address.substr(close_b + 2);
                }
                return {host, port};
            }
        }
        auto colon = address.rfind(':');
        if (colon != std::string::npos) {
            return {address.substr(0, colon), address.substr(colon + 1)};
        }
        return {address, "9000"};
    }

    bool start(uint16_t port) override {
        std::lock_guard<std::mutex> lock(state_mutex_);
        if (running_) return false;

        // 1. Try to open dual-stack IPv6 socket first
        listen_fd_ = socket(AF_INET6, SOCK_STREAM, 0);
        if (listen_fd_ != INVALID_SOCKET_VAL) {
            int opt = 1;
#if defined(_WIN32)
            setsockopt(listen_fd_, SOL_SOCKET, SO_REUSEADDR, reinterpret_cast<const char*>(&opt), sizeof(opt));
            int v6only = 0; // Dual stack: accept both IPv4 and IPv6
            setsockopt(listen_fd_, IPPROTO_IPV6, IPV6_V6ONLY, reinterpret_cast<const char*>(&v6only), sizeof(v6only));
#else
            setsockopt(listen_fd_, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));
            int v6only = 0;
            setsockopt(listen_fd_, IPPROTO_IPV6, IPV6_V6ONLY, &v6only, sizeof(v6only));
#endif
            sockaddr_in6 addr6{};
            addr6.sin6_family = AF_INET6;
            addr6.sin6_addr = in6addr_any;
            addr6.sin6_port = htons(port);

            if (bind(listen_fd_, reinterpret_cast<sockaddr*>(&addr6), sizeof(addr6)) == SOCKET_ERROR_VAL ||
                listen(listen_fd_, 64) == SOCKET_ERROR_VAL) {
                close_socket(listen_fd_);
                listen_fd_ = INVALID_SOCKET_VAL;
            }
        }

        // 2. Fallback to standard IPv4 socket if IPv6 socket was unavailable or failed to bind
        if (listen_fd_ == INVALID_SOCKET_VAL) {
            listen_fd_ = socket(AF_INET, SOCK_STREAM, 0);
            if (listen_fd_ == INVALID_SOCKET_VAL) return false;

            int opt = 1;
#if defined(_WIN32)
            setsockopt(listen_fd_, SOL_SOCKET, SO_REUSEADDR, reinterpret_cast<const char*>(&opt), sizeof(opt));
#else
            setsockopt(listen_fd_, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));
#endif
            sockaddr_in addr4{};
            addr4.sin_family = AF_INET;
            addr4.sin_addr.s_addr = INADDR_ANY;
            addr4.sin_port = htons(port);

            if (bind(listen_fd_, reinterpret_cast<sockaddr*>(&addr4), sizeof(addr4)) == SOCKET_ERROR_VAL ||
                listen(listen_fd_, 64) == SOCKET_ERROR_VAL) {
                close_socket(listen_fd_);
                listen_fd_ = INVALID_SOCKET_VAL;
                return false;
            }
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
        auto [host, port_str] = parse_address(address);
        if (host.empty()) return false;

        addrinfo hints{};
        hints.ai_family = AF_UNSPEC; // Allows both IPv4 and IPv6 transparently!
        hints.ai_socktype = SOCK_STREAM;
        hints.ai_protocol = IPPROTO_TCP;

        addrinfo* result = nullptr;
        if (getaddrinfo(host.c_str(), port_str.c_str(), &hints, &result) != 0 || !result) {
            return false;
        }

        socket_t sock = INVALID_SOCKET_VAL;
        for (addrinfo* ptr = result; ptr != nullptr; ptr = ptr->ai_next) {
            sock = socket(ptr->ai_family, ptr->ai_socktype, ptr->ai_protocol);
            if (sock == INVALID_SOCKET_VAL) continue;

            if (::connect(sock, ptr->ai_addr, static_cast<int>(ptr->ai_addrlen)) != SOCKET_ERROR_VAL) {
                break; // Successfully connected!
            }
            close_socket(sock);
            sock = INVALID_SOCKET_VAL;
        }

        freeaddrinfo(result);
        if (sock == INVALID_SOCKET_VAL) {
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

    bool disconnect_peer(const PeerId& peer_id) override {
        std::lock_guard<std::mutex> lock(peers_mutex_);
        auto it = peers_.find(peer_id);
        if (it != peers_.end()) {
            close_socket(it->second.sock);
            it->second.sock = INVALID_SOCKET_VAL;
            if (it->second.worker.joinable()) {
                it->second.worker.detach();
            }
            peers_.erase(it);
            return true;
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

    void set_max_inbound_peers(size_t max_peers) noexcept {
        max_inbound_peers_ = max_peers;
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
            sockaddr_storage client_addr{};
            socklen_t addr_len = sizeof(client_addr);
            socket_t client_sock = accept(listen_fd_, reinterpret_cast<sockaddr*>(&client_addr), &addr_len);
            if (client_sock == INVALID_SOCKET_VAL) {
                if (!running_) break;
                continue;
            }

            // Connection slot limits (Requirement 7: Prevent connection exhaustion)
            {
                std::lock_guard<std::mutex> lock(peers_mutex_);
                if (peers_.size() >= max_inbound_peers_) {
                    close_socket(client_sock);
                    continue;
                }
            }

            char host[NI_MAXHOST];
            char serv[NI_MAXSERV];
            if (getnameinfo(reinterpret_cast<sockaddr*>(&client_addr), addr_len,
                            host, sizeof(host), serv, sizeof(serv),
                            NI_NUMERICHOST | NI_NUMERICSERV) != 0) {
                close_socket(client_sock);
                continue;
            }

            std::string peer_id;
            if (client_addr.ss_family == AF_INET6) {
                peer_id = std::string("[") + host + "]:" + serv;
            } else {
                peer_id = std::string(host) + ":" + serv;
            }

            register_peer(peer_id, client_sock);
        }
    }

    void read_loop(std::string peer_id, socket_t sock) {
        std::vector<uint8_t> rx_buffer;
        rx_buffer.reserve(64 * 1024);
        uint8_t temp[4096];

        while (running_) {
            auto bytes = recv(sock, reinterpret_cast<char*>(temp), sizeof(temp), 0);
            if (bytes <= 0 || !running_) {
                break; // Disconnected or shutting down
            }

            rx_buffer.insert(rx_buffer.end(), temp, temp + static_cast<size_t>(bytes));

            // Process complete framed messages
            while (rx_buffer.size() >= 13) {
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
    size_t max_inbound_peers_{32};
    std::atomic<bool> running_{false};
    std::thread accept_thread_;
    std::mutex state_mutex_;

    mutable std::mutex peers_mutex_;
    std::unordered_map<PeerId, PeerConnection> peers_;
    MessageHandler handler_;
};

} // namespace blockbum::network
