#pragma once

#include <cstdint>
#include <span>
#include <string>
#include <functional>
#include <vector>

namespace blockbum::network {

/// Identifier for a network peer
using PeerId = std::string;

/// Message callback function signature
using MessageHandler = std::function<void(const PeerId& from, std::span<const uint8_t> message)>;

/// Abstract interface for peer-to-peer transport
class INetworkTransport {
public:
    virtual ~INetworkTransport() = default;

    /// Start listening on designated port
    virtual bool start(uint16_t port) = 0;

    /// Stop network listening and terminate connections
    virtual void stop() = 0;

    /// Connect to a remote peer address (e.g. "127.0.0.1:9000")
    virtual bool connect(const std::string& address) = 0;

    /// Broadcast message to all connected peers
    virtual void broadcast(std::span<const uint8_t> data) = 0;

    /// Send direct message to a specific peer
    virtual bool send_to(const PeerId& peer_id, std::span<const uint8_t> data) = 0;

    /// Register inbound message handler
    virtual void set_message_handler(MessageHandler handler) = 0;

    /// Get current active peer count
    [[nodiscard]] virtual size_t peer_count() const = 0;
};

} // namespace blockbum::network
