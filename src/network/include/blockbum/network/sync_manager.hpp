#pragma once

#include "blockbum/network/inetwork.hpp"
#include "blockbum/network/wire_protocol.hpp"
#include "blockbum/core/blockchain.hpp"
#include <memory>
#include <unordered_set>
#include <mutex>
#include <vector>
#include <iostream>

namespace blockbum::network {

class NodeSyncManager {
public:
    NodeSyncManager(std::string node_id,
                    std::shared_ptr<core::Blockchain> chain,
                    std::shared_ptr<INetworkTransport> transport)
        : node_id_(std::move(node_id)),
          chain_(std::move(chain)),
          transport_(std::move(transport)) {

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

    bool broadcast_transaction(const core::Transaction& tx) {
        std::string hex_id = core::to_hex(tx.tx_id);
        {
            std::lock_guard<std::mutex> lock(seen_mutex_);
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
            if (transport_->connect(addr)) {
                // Connected, exchange status
                request_sync_from_peer(addr);
                broadcast_status();
            }
        }
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
                if (remote_status.height > chain_->height()) {
                    // Remote node has longer chain: request block sync
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
                for (const auto& b : batch.blocks) {
                    std::string hex_id = core::to_hex(b.block_hash);
                    {
                        std::lock_guard<std::mutex> lock(seen_mutex_);
                        seen_blocks_.insert(hex_id);
                    }
                    chain_->add_block(b);
                }
                break;
            }
            case MessageType::NewBlock: {
                core::Block block = core::Block::deserialize(pd);
                std::string hex_id = core::to_hex(block.block_hash);

                {
                    std::lock_guard<std::mutex> lock(seen_mutex_);
                    if (seen_blocks_.find(hex_id) != seen_blocks_.end()) {
                        return; // Prevent duplicate processing and gossip storms
                    }
                    seen_blocks_.insert(hex_id);
                }

                if (chain_->add_block(block)) {
                    // Valid block added: relay to other peers
                    send_message("", MessageType::NewBlock, payload_to_vector(payload));
                } else if (block.header.height > chain_->height() + 1) {
                    // We are missing intermediate blocks: trigger full sync
                    request_sync_from_peer(from);
                }
                break;
            }
            case MessageType::NewTransaction: {
                core::Transaction tx = core::Transaction::deserialize(pd);
                std::string hex_id = core::to_hex(tx.tx_id);

                {
                    std::lock_guard<std::mutex> lock(seen_mutex_);
                    if (seen_txs_.find(hex_id) != seen_txs_.end()) {
                        return;
                    }
                    seen_txs_.insert(hex_id);
                }

                // Relay valid transaction
                send_message("", MessageType::NewTransaction, payload_to_vector(payload));
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

    std::mutex seen_mutex_;
    std::unordered_set<std::string> seen_blocks_;
    std::unordered_set<std::string> seen_txs_;
};

} // namespace blockbum::network
