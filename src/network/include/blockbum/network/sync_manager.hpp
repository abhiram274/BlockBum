#pragma once

#include "blockbum/network/inetwork.hpp"
#include "blockbum/network/wire_protocol.hpp"
#include "blockbum/network/peer_book.hpp"
#include "blockbum/core/blockchain.hpp"
#include <memory>
#include <unordered_set>
#include <unordered_map>
#include <mutex>
#include <vector>
#include <string>
#include <iostream>

namespace blockbum::network {

class NodeSyncManager {
public:
    NodeSyncManager(std::string node_id,
                    std::shared_ptr<core::Blockchain> chain,
                    std::shared_ptr<INetworkTransport> transport,
                    std::shared_ptr<PeerAddressBook> peer_book = nullptr)
        : node_id_(std::move(node_id)),
          chain_(std::move(chain)),
          transport_(std::move(transport)),
          peer_book_(peer_book ? std::move(peer_book) : std::make_shared<PeerAddressBook>()) {

        transport_->set_message_handler([this](const PeerId& from, std::span<const uint8_t> msg) {
            handle_message(from, msg);
        });
    }

    void broadcast_status() {
        StatusPayload payload;
        payload.height = chain_->height();
        auto tip = chain_->get_tip_block();
        if (tip) {
            payload.tip_hash = tip->block_hash;
        }
        payload.node_id = node_id_;

        send_message("", MessageType::Status, payload.serialize());
    }

    void request_sync_from_peer(const PeerId& peer) {
        GetBlocksPayload req;
        req.from_height = chain_->height() + 1;
        req.max_count = 50;
        send_message(peer, MessageType::GetBlocks, req.serialize());
    }

    void request_headers_from_peer(const PeerId& peer, core::BlockHeight from_height = 0, uint32_t max_count = 500) {
        GetHeadersPayload req;
        req.from_height = (from_height == 0) ? chain_->height() + 1 : from_height;
        req.max_count = max_count;
        send_message(peer, MessageType::GetHeaders, req.serialize());
    }

    void handle_received_headers(const PeerId& from, const std::vector<core::BlockHeader>& headers) {
        if (headers.empty()) return;
        {
            std::lock_guard<std::mutex> lock(header_mutex_);
            for (const auto& h : headers) {
                if (h.height > chain_->height()) {
                    verified_headers_.push_back(h);
                }
            }
        }
        // Pipeline block fetch for verified headers
        request_sync_from_peer(from);
    }

    [[nodiscard]] std::vector<core::BlockHeader> get_verified_headers() const {
        std::lock_guard<std::mutex> lock(header_mutex_);
        return verified_headers_;
    }

    void request_peers_from_peer(const PeerId& peer) {
        GetPeersPayload req;
        req.max_count = 50;
        send_message(peer, MessageType::GetPeers, req.serialize());
    }

    static constexpr size_t MAX_SEEN_CACHE = 50'000;

    bool broadcast_transaction(const core::Transaction& tx) {
        std::string hex_id = core::to_hex(tx.tx_id);
        {
            std::lock_guard<std::mutex> lock(seen_mutex_);
            if (seen_txs_.size() >= MAX_SEEN_CACHE) seen_txs_.clear();
            if (seen_txs_.find(hex_id) != seen_txs_.end()) {
                return false; // Already processed
            }
            seen_txs_.insert(hex_id);
        }

        auto tx_bytes = tx.serialize();
        send_message("", MessageType::NewTransaction, tx_bytes);
        return true;
    }

    bool broadcast_block(const core::Block& block) {
        std::string hex_id = core::to_hex(block.block_hash);
        {
            std::lock_guard<std::mutex> lock(seen_mutex_);
            if (seen_blocks_.size() >= MAX_SEEN_CACHE) seen_blocks_.clear();
            if (seen_blocks_.find(hex_id) != seen_blocks_.end()) {
                return false; // Prevent infinite propagation loop
            }
            seen_blocks_.insert(hex_id);
        }

        auto block_bytes = block.serialize();
        send_message("", MessageType::NewBlock, block_bytes);
        return true;
    }

    void connect_to_bootstrap_nodes(const std::vector<std::string>& bootstrap_nodes) {
        for (const auto& addr : bootstrap_nodes) {
            peer_book_->add_peer(addr);
            if (transport_->connect(addr)) {
                peer_book_->record_peer_success(addr);
                request_peers_from_peer(addr);
                request_sync_from_peer(addr);
                broadcast_status();
            } else {
                peer_book_->record_peer_failure(addr);
            }
        }
    }

    // Connect to known peers from local address book (allows bootstrap independence)
    size_t connect_to_known_peers(size_t target_connections = 8) {
        auto active = transport_->peer_count();
        if (active >= target_connections) return 0;

        size_t needed = target_connections - active;
        std::vector<std::string> connected = transport_->get_peers();

        auto candidates = peer_book_->select_candidates(needed, connected);
        size_t connected_count = 0;
        for (const auto& candidate : candidates) {
            if (transport_->connect(candidate)) {
                peer_book_->record_peer_success(candidate);
                request_peers_from_peer(candidate);
                request_sync_from_peer(candidate);
                broadcast_status();
                connected_count++;
            } else {
                peer_book_->record_peer_failure(candidate);
            }
        }
        return connected_count;
    }

    [[nodiscard]] std::shared_ptr<PeerAddressBook> peer_book() const noexcept {
        return peer_book_;
    }

    [[nodiscard]] size_t orphan_pool_size() const {
        std::lock_guard<std::mutex> lock(orphan_mutex_);
        return orphan_pool_.size();
    }

private:
    void send_message(const PeerId& recipient, MessageType type, const std::vector<uint8_t>& payload) {
        MessageHeader header;
        header.magic = PROTOCOL_MAGIC;
        header.version = PROTOCOL_VERSION;
        header.type = type;
        header.payload_size = static_cast<uint32_t>(payload.size());

        auto header_bytes = header.serialize();
        std::vector<uint8_t> packet;
        packet.reserve(header_bytes.size() + payload.size());
        packet.insert(packet.end(), header_bytes.begin(), header_bytes.end());
        packet.insert(packet.end(), payload.begin(), payload.end());

        if (recipient.empty()) {
            transport_->broadcast(packet);
        } else {
            transport_->send_to(recipient, packet);
        }
    }

    void process_orphans_for(const core::Hash256& parent_hash) {
        std::vector<core::Block> attached_blocks;
        {
            std::lock_guard<std::mutex> lock(orphan_mutex_);
            std::string current_parent = core::to_hex(parent_hash);
            while (true) {
                auto it = orphan_pool_.find(current_parent);
                if (it == orphan_pool_.end()) break;
                core::Block child = it->second;
                orphan_pool_.erase(it);
                if (chain_->add_block(child)) {
                    attached_blocks.push_back(child);
                    current_parent = core::to_hex(child.block_hash);
                } else {
                    break;
                }
            }
        }
        for (const auto& child : attached_blocks) {
            send_message("", MessageType::NewBlock, child.serialize());
        }
    }

    void handle_message(const PeerId& from, std::span<const uint8_t> msg) {
        if (msg.size() < 13) return; // Malformed header
        core::BinaryDeserializer hd(msg.subspan(0, 13));
        MessageHeader header = MessageHeader::deserialize(hd);

        if (header.magic != PROTOCOL_MAGIC) return; // Drop unrecognized packet
        if (msg.size() < 13 + header.payload_size) return;

        std::span<const uint8_t> payload = msg.subspan(13, header.payload_size);
        core::BinaryDeserializer pd(payload);

        switch (header.type) {
            case MessageType::GetStatus: {
                StatusPayload resp;
                resp.height = chain_->height();
                auto tip = chain_->get_tip_block();
                if (tip) resp.tip_hash = tip->block_hash;
                resp.node_id = node_id_;
                send_message(from, MessageType::Status, resp.serialize());
                break;
            }
            case MessageType::Status: {
                StatusPayload remote_status = StatusPayload::deserialize(pd);
                peer_book_->record_peer_success(from);
                if (remote_status.height > chain_->height()) {
                    request_sync_from_peer(from);
                }
                break;
            }
            case MessageType::GetBlocks: {
                GetBlocksPayload req = GetBlocksPayload::deserialize(pd);
                BlockBatchPayload resp;
                for (core::BlockHeight h = req.from_height;
                     h <= chain_->height() && resp.blocks.size() < req.max_count; ++h) {
                    auto b = chain_->get_block_by_height(h);
                    if (b) resp.blocks.push_back(*b);
                }
                send_message(from, MessageType::BlockBatch, resp.serialize());
                break;
            }
            case MessageType::BlockBatch: {
                BlockBatchPayload batch = BlockBatchPayload::deserialize(pd);
                peer_book_->record_peer_success(from);
                for (const auto& b : batch.blocks) {
                    std::string hex_id = core::to_hex(b.block_hash);
                    {
                        std::lock_guard<std::mutex> lock(seen_mutex_);
                        if (seen_blocks_.size() >= MAX_SEEN_CACHE) seen_blocks_.clear();
                        seen_blocks_.insert(hex_id);
                    }
                    if (chain_->add_block(b)) {
                        process_orphans_for(b.block_hash);
                    }
                }
                break;
            }
            case MessageType::NewBlock: {
                core::Block block = core::Block::deserialize(pd);
                std::string hex_id = core::to_hex(block.block_hash);

                {
                    std::lock_guard<std::mutex> lock(seen_mutex_);
                    if (seen_blocks_.size() >= MAX_SEEN_CACHE) seen_blocks_.clear();
                    if (seen_blocks_.find(hex_id) != seen_blocks_.end()) {
                        return; // Prevent duplicate processing and gossip storms
                    }
                    seen_blocks_.insert(hex_id);
                }

                if (chain_->add_block(block)) {
                    peer_book_->record_peer_success(from);
                    send_message("", MessageType::NewBlock, payload_to_vector(payload));
                    process_orphans_for(block.block_hash);
                } else if (block.header.height > chain_->height() + 1) {
                    // Buffer in orphan pool and request sync
                    {
                        std::lock_guard<std::mutex> lock(orphan_mutex_);
                        if (orphan_pool_.size() < 1000) {
                            orphan_pool_[core::to_hex(block.header.previous_hash)] = block;
                        }
                    }
                    request_sync_from_peer(from);
                } else {
                    // Misbehaving peer sent an invalid block: penalize reputation
                    peer_book_->adjust_score(from, -50);
                    if (peer_book_->is_banned(from)) {
                        transport_->disconnect_peer(from);
                    }
                }
                break;
            }
            case MessageType::NewTransaction: {
                core::Transaction tx = core::Transaction::deserialize(pd);
                std::string hex_id = core::to_hex(tx.tx_id);

                {
                    std::lock_guard<std::mutex> lock(seen_mutex_);
                    if (seen_txs_.size() >= MAX_SEEN_CACHE) seen_txs_.clear();
                    if (seen_txs_.find(hex_id) != seen_txs_.end()) {
                        return;
                    }
                    seen_txs_.insert(hex_id);
                }

                // Relay valid transaction
                send_message("", MessageType::NewTransaction, payload_to_vector(payload));
                break;
            }
            case MessageType::GetPeers: {
                GetPeersPayload req = GetPeersPayload::deserialize(pd);
                PeersPayload resp;
                auto known = peer_book_->get_known_peers(req.max_count);
                resp.peers.reserve(known.size());
                for (const auto& k : known) {
                    PeerEntry entry;
                    entry.address = k.address;
                    entry.last_seen = k.last_seen;
                    entry.services = k.services;
                    resp.peers.push_back(entry);
                }
                send_message(from, MessageType::Peers, resp.serialize());
                break;
            }
            case MessageType::Peers: {
                PeersPayload pex = PeersPayload::deserialize(pd);
                peer_book_->record_peer_success(from);
                for (const auto& entry : pex.peers) {
                    peer_book_->add_peer(entry.address, entry.services);
                }
                // Try connecting to discovered candidates if we need more peers
                connect_to_known_peers(8);
                break;
            }
            case MessageType::GetHeaders: {
                GetHeadersPayload req = GetHeadersPayload::deserialize(pd);
                HeadersPayload resp;
                for (core::BlockHeight h = req.from_height;
                     h <= chain_->height() && resp.headers.size() < req.max_count; ++h) {
                    auto b = chain_->get_block_by_height(h);
                    if (b) resp.headers.push_back(b->header);
                }
                send_message(from, MessageType::Headers, resp.serialize());
                break;
            }
            case MessageType::Headers: {
                HeadersPayload headers_payload = HeadersPayload::deserialize(pd);
                peer_book_->record_peer_success(from);
                handle_received_headers(from, headers_payload.headers);
                break;
            }
            default:
                break;
        }
    }

    static std::vector<uint8_t> payload_to_vector(std::span<const uint8_t> s) {
        return std::vector<uint8_t>(s.begin(), s.end());
    }

    std::string node_id_;
    std::shared_ptr<core::Blockchain> chain_;
    std::shared_ptr<INetworkTransport> transport_;
    std::shared_ptr<PeerAddressBook> peer_book_;

    std::mutex seen_mutex_;
    std::unordered_set<std::string> seen_blocks_;
    std::unordered_set<std::string> seen_txs_;

    mutable std::mutex orphan_mutex_;
    std::unordered_map<std::string, core::Block> orphan_pool_;

    mutable std::mutex header_mutex_;
    std::vector<core::BlockHeader> verified_headers_;
};

} // namespace blockbum::network
