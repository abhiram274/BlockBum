# BlockBum Node RPC & REST API Specification

## Document Metadata
- **Protocol Version**: 1.0.0
- **Status**: Stable Public API Reference (Phase 19)
- **Default RPC Port**: `8080` (HTTP / JSON-RPC 2.0)
- **Default P2P Port**: `9000` (TCP Framing)

---

## 1. Overview & Transport Standards

BlockBum full nodes expose two complementary interfaces for developers, wallets, explorers, and decentralized services:

1. **JSON-RPC 2.0 (`POST /rpc`)**: Standard RPC interface for programmatic state queries and transaction broadcasts.
2. **REST API (`/api/v1/...`)**: Human-readable and lightweight HTTP endpoints designed for web explorers, microservices, and monitoring agents.

> [!IMPORTANT]
> **Privacy Invariant**:
> In compliance with protocol privacy guarantees, private end-to-end encrypted messaging content, private chat ratchets, and unencrypted file payloads are **never indexed or exposed via public node RPC responses**.
> Transactions containing payload data emit:
> - `payload_bytes`: Byte length of payload.
> - `payload_hash`: SHA-256 digest of payload for data integrity verification.
> - `is_confidential: true`: Signaling that raw bytes reside strictly off-chain.

---

## 2. JSON-RPC 2.0 Method Reference

### 2.1 `blockbum_getNodeInfo`
Returns node synchronization status, network version, block tip, and peer connectivity.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "method": "blockbum_getNodeInfo",
  "params": {},
  "id": "1"
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "network": "blockbum-testnet",
    "version": "0.1.0",
    "current_height": 1420,
    "tip_hash": "0x7f9a2b8c4d1e2f3a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a",
    "circulating_supply_atomic": 2628000000000,
    "max_supply_atomic": 21000000000000,
    "sync_status": "synced",
    "peer_count": 4
  },
  "id": "1"
}
```

---

### 2.2 `blockbum_getBlockByHeight`
Queries a confirmed block by its monotonic 64-bit integer height.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "method": "blockbum_getBlockByHeight",
  "params": {
    "height": 100
  },
  "id": "2"
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "height": 100,
    "block_hash": "0x3e1d9c7a5b2f4e6d8c0b2a4f6e8d0c2b4a6f8e0d2c4b6a8f0e2d4c6b8a0f2e4d",
    "previous_hash": "0x9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b",
    "merkle_root": "0x5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d",
    "timestamp": 1700005000,
    "tx_count": 1,
    "transactions": [
      {
        "tx_id": "0x4a8cd91e2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e",
        "sender": "bb1_sender_address...",
        "recipient": "bb1_recipient_address...",
        "amount_atomic": 25000000,
        "amount_bum": 25.0,
        "fee_atomic": 1800,
        "nonce": 4,
        "timestamp": 1700005000,
        "payload_bytes": 0,
        "payload_hash": "0xe3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        "is_confidential": true
      }
    ]
  },
  "id": "2"
}
```

---

### 2.3 `blockbum_getAccount`
Queries an account's confirmed balance, sequence nonce, and transfer history.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "method": "blockbum_getAccount",
  "params": {
    "address": "bb1_alice_address..."
  },
  "id": "3"
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "address": "bb1_alice_address...",
    "balance_atomic": 105000000,
    "balance_bum": 105.0,
    "nonce": 7
  },
  "id": "3"
}
```

---

### 2.4 `blockbum_requestFaucet`
Requests rate-limited testnet tokens for development testing.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "method": "blockbum_requestFaucet",
  "params": {
    "address": "bb1_developer_address..."
  },
  "id": "4"
}
```

**Response (Success):**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "success": true,
    "amount_atomic": 10000000,
    "amount_bum": 10,
    "tx_id": "0x8f2a1b3c...",
    "message": "Tokens successfully dispensed"
  },
  "id": "4"
}
```

---

## 3. REST API Endpoint Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/node/info` | `GET` | Returns version, current height, tip hash, and peer count |
| `/api/v1/blocks/latest` | `GET` | Returns full details of the latest confirmed block |
| `/api/v1/blocks/:height` | `GET` | Returns block details by numeric height or hash |
| `/api/v1/account/:address` | `GET` | Returns account balance (atomic + BUM) and sequence nonce |
| `/api/v1/tx/:tx_id` | `GET` | Returns transaction status, sender, recipient, fee, and amount |
| `/api/v1/faucet` | `POST` | Dispenses 10 tBUM testnet tokens (Rate limit: 1 request/hr) |

---

## 4. Error Code Reference

| Code | Constant | Meaning |
|---|---|---|
| `-32700` | `ParseError` | Invalid JSON received by the server |
| `-32600` | `InvalidRequest` | JSON sent is not a valid Request object |
| `-32601` | `MethodNotFound` | Method does not exist or is not available |
| `-32602` | `InvalidParams` | Invalid method parameter(s) |
| `-32603` | `InternalError` | Internal JSON-RPC server error |
| `-32001` | `TransactionRejected` | Transaction signature or nonce invalid |
| `-32002` | `ResourceNotFound` | Block or transaction hash not found |
| `-32003` | `RateLimited` | Cooldown period active for address or client IP |
