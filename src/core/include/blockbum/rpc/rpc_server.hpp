#pragma once

#include "blockbum/core/types.hpp"
#include "blockbum/core/blockchain.hpp"
#include "blockbum/core/account_ledger.hpp"
#include "blockbum/core/economic_model.hpp"
#include "blockbum/crypto/crypto_utils.hpp"
#include "blockbum/rpc/faucet.hpp"
#include <string>
#include <sstream>
#include <vector>
#include <memory>
#include <optional>
#include <algorithm>
#include <iomanip>

namespace blockbum::rpc {

/// Standard JSON-RPC 2.0 Error Codes
enum class JsonRpcErrorCode : int {
    ParseError = -32700,
    InvalidRequest = -32600,
    MethodNotFound = -32601,
    InvalidParams = -32602,
    InternalError = -32603,
    TransactionRejected = -32001,
    ResourceNotFound = -32002,
    RateLimited = -32003
};

struct HttpResponse {
    int status_code{200};
    std::string content_type{"application/json"};
    std::string body;
};

/// Public Node RPC Server providing JSON-RPC 2.0 and REST interfaces
class RpcServer {
public:
    RpcServer(std::shared_ptr<core::Blockchain> blockchain,
              std::shared_ptr<ledger::AccountLedger> ledger,
              std::shared_ptr<TestnetFaucet> faucet = nullptr)
        : blockchain_(std::move(blockchain)),
          ledger_(std::move(ledger)),
          faucet_(std::move(faucet)) {}

    // ========================================================================
    // 1. JSON-RPC 2.0 Request Dispatcher
    // ========================================================================

    std::string handle_json_rpc(const std::string& method,
                                const std::string& params_json,
                                const std::string& id = "1",
                                const std::string& client_ip = "127.0.0.1") {
        if (method == "blockbum_getNodeInfo") {
            return format_success_response(id, get_node_info_json());
        }
        if (method == "blockbum_getBlockByHeight") {
            core::BlockHeight height = parse_u64_field(params_json, "height");
            auto block = blockchain_ ? blockchain_->get_block_by_height(height) : std::nullopt;
            if (!block) {
                return format_error_response(id, JsonRpcErrorCode::ResourceNotFound, "Block not found at height");
            }
            return format_success_response(id, format_block_json(*block));
        }
        if (method == "blockbum_getBlockByHash") {
            std::string hash_hex = parse_string_field(params_json, "hash");
            auto block_hash = core::from_hex(strip_0x(hash_hex));
            core::Hash256 h{};
            if (block_hash.size() == 32) {
                std::copy(block_hash.begin(), block_hash.end(), h.begin());
            }
            auto block = blockchain_ ? blockchain_->get_block_by_hash(h) : std::nullopt;
            if (!block) {
                return format_error_response(id, JsonRpcErrorCode::ResourceNotFound, "Block not found with specified hash");
            }
            return format_success_response(id, format_block_json(*block));
        }
        if (method == "blockbum_getTransactionByHash") {
            std::string tx_hex = parse_string_field(params_json, "tx_id");
            auto tx = find_transaction(tx_hex);
            if (!tx) {
                return format_error_response(id, JsonRpcErrorCode::ResourceNotFound, "Transaction not found");
            }
            return format_success_response(id, format_transaction_json(*tx));
        }
        if (method == "blockbum_getAccount") {
            std::string address = parse_string_field(params_json, "address");
            if (address.empty()) {
                return format_error_response(id, JsonRpcErrorCode::InvalidParams, "Address parameter required");
            }
            return format_success_response(id, get_account_json(address));
        }
        if (method == "blockbum_estimateFee") {
            size_t payload_bytes = static_cast<size_t>(parse_u64_field(params_json, "payload_size"));
            core::Balance fee = economics::calculate_minimum_fee(payload_bytes > 0 ? payload_bytes : 180);
            std::ostringstream ss;
            ss << "{\"estimated_fee_atomic\":" << fee << ",\"fee_bum\":" << std::fixed << std::setprecision(6)
               << (static_cast<double>(fee) / ledger::BUM_DECIMALS) << "}";
            return format_success_response(id, ss.str());
        }
        if (method == "blockbum_getPeers") {
            return format_success_response(id, "[{\"peer_id\":\"peer_seed_01\",\"latency_ms\":15,\"connected\":true},{\"peer_id\":\"peer_seed_02\",\"latency_ms\":42,\"connected\":true}]");
        }
        if (method == "blockbum_requestFaucet") {
            if (!faucet_) {
                return format_error_response(id, JsonRpcErrorCode::InternalError, "Faucet service unavailable on this node");
            }
            std::string address = parse_string_field(params_json, "address");
            uint64_t now_ts = parse_u64_field(params_json, "timestamp");
            if (now_ts == 0) now_ts = 1700000000;

            auto resp = faucet_->request_tokens(address, client_ip, now_ts);
            if (resp.status == FaucetStatus::Success) {
                std::ostringstream ss;
                ss << "{\"success\":true,\"amount_atomic\":" << resp.amount_dispensed
                   << ",\"amount_bum\":" << (resp.amount_dispensed / ledger::BUM_DECIMALS)
                   << ",\"tx_id\":\"" << resp.tx_id << "\",\"message\":\"" << resp.message << "\"}";
                return format_success_response(id, ss.str());
            } else if (resp.status == FaucetStatus::RateLimited) {
                return format_error_response(id, JsonRpcErrorCode::RateLimited,
                                             resp.message + " Cooldown remaining: " + std::to_string(resp.cooldown_remaining_seconds) + "s");
            } else {
                return format_error_response(id, JsonRpcErrorCode::InvalidParams, resp.message);
            }
        }

        return format_error_response(id, JsonRpcErrorCode::MethodNotFound, "Method '" + method + "' not supported");
    }

    // ========================================================================
    // 2. REST HTTP Request Router
    // ========================================================================

    HttpResponse handle_http_request(const std::string& http_method,
                                     const std::string& path,
                                     const std::string& body = "",
                                     const std::string& client_ip = "127.0.0.1") {
        if (http_method == "GET") {
            if (path == "/api/v1/node/info" || path == "/api/v1/node/status") {
                return {200, "application/json", get_node_info_json()};
            }
            if (path == "/api/v1/blocks/latest") {
                if (!blockchain_) return {500, "application/json", "{\"error\":\"Blockchain not initialized\"}"};
                auto tip = blockchain_->get_tip_block();
                if (!tip) return {404, "application/json", "{\"error\":\"Genesis block not found\"}"};
                return {200, "application/json", format_block_json(*tip)};
            }
            if (path.rfind("/api/v1/blocks/", 0) == 0) {
                std::string param = path.substr(15);
                try {
                    core::BlockHeight h = std::stoull(param);
                    auto b = blockchain_ ? blockchain_->get_block_by_height(h) : std::nullopt;
                    if (b) return {200, "application/json", format_block_json(*b)};
                } catch (...) {
                    // Try hash
                    auto h = core::from_hex(strip_0x(param));
                    if (h.size() == 32) {
                        core::Hash256 b_hash{};
                        std::copy(h.begin(), h.end(), b_hash.begin());
                        auto b = blockchain_ ? blockchain_->get_block_by_hash(b_hash) : std::nullopt;
                        if (b) return {200, "application/json", format_block_json(*b)};
                    }
                }
                return {404, "application/json", "{\"error\":\"Block not found\"}"};
            }
            if (path.rfind("/api/v1/account/", 0) == 0) {
                std::string addr = path.substr(16);
                return {200, "application/json", get_account_json(addr)};
            }
            if (path.rfind("/api/v1/tx/", 0) == 0) {
                std::string tx_id = path.substr(11);
                auto tx = find_transaction(tx_id);
                if (tx) return {200, "application/json", format_transaction_json(*tx)};
                return {404, "application/json", "{\"error\":\"Transaction not found\"}"};
            }
        } else if (http_method == "POST") {
            if (path == "/rpc") {
                // Parse method and id from body
                std::string method = parse_string_field(body, "method");
                std::string id = parse_string_field(body, "id");
                if (id.empty()) id = "1";
                std::string resp = handle_json_rpc(method, body, id, client_ip);
                return {200, "application/json", resp};
            }
            if (path == "/api/v1/faucet") {
                std::string address = parse_string_field(body, "address");
                uint64_t now_ts = parse_u64_field(body, "timestamp");
                if (now_ts == 0) now_ts = 1700000000;
                if (!faucet_) return {503, "application/json", "{\"error\":\"Faucet unavailable\"}"};

                auto resp = faucet_->request_tokens(address, client_ip, now_ts);
                if (resp.status == FaucetStatus::Success) {
                    std::ostringstream ss;
                    ss << "{\"success\":true,\"amount\":" << resp.amount_dispensed
                       << ",\"tx_id\":\"" << resp.tx_id << "\"}";
                    return {200, "application/json", ss.str()};
                } else if (resp.status == FaucetStatus::RateLimited) {
                    return {429, "application/json", "{\"error\":\"Rate limited\",\"cooldown_seconds\":" + std::to_string(resp.cooldown_remaining_seconds) + "}"};
                } else {
                    return {400, "application/json", "{\"error\":\"" + resp.message + "\"}"};
                }
            }
        }

        return {404, "application/json", "{\"error\":\"Endpoint not found\"}"};
    }

private:
    std::shared_ptr<core::Blockchain> blockchain_;
    std::shared_ptr<ledger::AccountLedger> ledger_;
    std::shared_ptr<TestnetFaucet> faucet_;

    [[nodiscard]] std::string get_node_info_json() const {
        core::BlockHeight h = blockchain_ ? blockchain_->height() : 0;
        std::string tip_hex = "0000000000000000000000000000000000000000000000000000000000000000";
        if (blockchain_) {
            auto tip = blockchain_->get_tip_block();
            if (tip) tip_hex = core::to_hex(tip->block_hash);
        }
        uint64_t supply = ledger_ ? ledger_->total_supply() : 0;

        std::ostringstream ss;
        ss << "{"
           << "\"network\":\"blockbum-testnet\","
           << "\"version\":\"0.1.0\","
           << "\"current_height\":" << h << ","
           << "\"tip_hash\":\"0x" << tip_hex << "\","
           << "\"circulating_supply_atomic\":" << supply << ","
           << "\"max_supply_atomic\":" << economics::MAX_BUM_SUPPLY << ","
           << "\"sync_status\":\"synced\","
           << "\"peer_count\":4"
           << "}";
        return ss.str();
    }

    [[nodiscard]] std::string get_account_json(const std::string& address) const {
        core::Balance bal = ledger_ ? ledger_->get_balance(address) : 0;
        core::Nonce nonce = ledger_ ? ledger_->get_nonce(address) : 0;

        std::ostringstream ss;
        ss << "{"
           << "\"address\":\"" << address << "\","
           << "\"balance_atomic\":" << bal << ","
           << "\"balance_bum\":" << std::fixed << std::setprecision(6) << (static_cast<double>(bal) / ledger::BUM_DECIMALS) << ","
           << "\"nonce\":" << nonce
           << "}";
        return ss.str();
    }

    /// Privacy Invariant: Encrypted payloads and raw message bytes are NEVER emitted to public explorers
    [[nodiscard]] std::string format_transaction_json(const core::Transaction& tx) const {
        std::string tx_hex = "0x" + core::to_hex(tx.tx_id);
        core::Hash256 payload_hash = crypto::CryptoUtils::sha256(tx.payload);

        std::ostringstream ss;
        ss << "{"
           << "\"tx_id\":\"" << tx_hex << "\","
           << "\"sender\":\"" << tx.sender << "\","
           << "\"recipient\":\"" << tx.recipient << "\","
           << "\"amount_atomic\":" << tx.amount << ","
           << "\"amount_bum\":" << std::fixed << std::setprecision(6) << (static_cast<double>(tx.amount) / ledger::BUM_DECIMALS) << ","
           << "\"fee_atomic\":" << tx.fee << ","
           << "\"nonce\":" << tx.nonce << ","
           << "\"timestamp\":" << tx.timestamp << ","
           << "\"payload_bytes\":" << tx.payload.size() << ","
           << "\"payload_hash\":\"0x" << core::to_hex(payload_hash) << "\","
           << "\"is_confidential\":true"
           << "}";
        return ss.str();
    }

    [[nodiscard]] std::string format_block_json(const core::Block& b) const {
        std::ostringstream ss;
        ss << "{"
           << "\"height\":" << b.header.height << ","
           << "\"block_hash\":\"0x" << core::to_hex(b.block_hash) << "\","
           << "\"previous_hash\":\"0x" << core::to_hex(b.header.previous_hash) << "\","
           << "\"merkle_root\":\"0x" << core::to_hex(b.header.merkle_root) << "\","
           << "\"timestamp\":" << b.header.timestamp << ","
           << "\"tx_count\":" << b.transactions.size() << ","
           << "\"transactions\":[";

        for (size_t i = 0; i < b.transactions.size(); ++i) {
            if (i > 0) ss << ",";
            ss << format_transaction_json(b.transactions[i]);
        }
        ss << "]}";
        return ss.str();
    }

    [[nodiscard]] std::optional<core::Transaction> find_transaction(const std::string& tx_id_hex) const {
        if (!blockchain_) return std::nullopt;
        std::string target = strip_0x(tx_id_hex);

        for (uint64_t h = 0; h <= blockchain_->height(); ++h) {
            auto b = blockchain_->get_block_by_height(h);
            if (!b) continue;
            for (const auto& tx : b->transactions) {
                if (core::to_hex(tx.tx_id) == target) {
                    return tx;
                }
            }
        }
        return std::nullopt;
    }

    static std::string format_success_response(const std::string& id, const std::string& result_json) {
        return "{\"jsonrpc\":\"2.0\",\"result\":" + result_json + ",\"id\":" + (id.empty() ? "1" : id) + "}";
    }

    static std::string format_error_response(const std::string& id, JsonRpcErrorCode code, const std::string& msg) {
        std::ostringstream ss;
        ss << "{\"jsonrpc\":\"2.0\",\"error\":{\"code\":" << static_cast<int>(code)
           << ",\"message\":\"" << msg << "\"},\"id\":" << (id.empty() ? "1" : id) << "}";
        return ss.str();
    }

    static std::string strip_0x(std::string s) {
        if (s.rfind("0x", 0) == 0 || s.rfind("0X", 0) == 0) {
            return s.substr(2);
        }
        return s;
    }

    static std::string parse_string_field(const std::string& json, const std::string& field) {
        std::string pattern = "\"" + field + "\":\"";
        size_t pos = json.find(pattern);
        if (pos == std::string::npos) {
            pattern = "\"" + field + "\": \"";
            pos = json.find(pattern);
            if (pos == std::string::npos) return "";
        }
        pos += pattern.size();
        size_t end_pos = json.find("\"", pos);
        if (end_pos == std::string::npos) return "";
        return json.substr(pos, end_pos - pos);
    }

    static uint64_t parse_u64_field(const std::string& json, const std::string& field) {
        std::string pattern = "\"" + field + "\":";
        size_t pos = json.find(pattern);
        if (pos == std::string::npos) return 0;
        pos += pattern.size();
        while (pos < json.size() && (json[pos] == ' ' || json[pos] == '\"')) pos++;
        size_t end_pos = pos;
        while (end_pos < json.size() && (std::isdigit(static_cast<unsigned char>(json[end_pos])))) end_pos++;
        if (pos == end_pos) return 0;
        try {
            return std::stoull(json.substr(pos, end_pos - pos));
        } catch (...) {
            return 0;
        }
    }
};

} // namespace blockbum::rpc
