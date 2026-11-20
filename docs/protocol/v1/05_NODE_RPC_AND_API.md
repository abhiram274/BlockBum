# BlockBum Protocol Specification — Chapter 05: Node RPC Interfaces & API

**Protocol Version:** 1.0  
**Specification Document:** BB-SPEC-05  
**Status:** Normative  

---

## 1. JSON-RPC 2.0 Interface Architecture

BlockBum nodes expose a standard [JSON-RPC 2.0](https://www.jsonrpc.org/specification) interface over HTTP and WebSocket transports on port `9545`. This interface allows desktop clients, web frontends, block explorers, miners, and external tooling to interact with the local or remote BlockBum node.

### 1.1 HTTP Endpoint Configuration
- **Transport:** HTTP/1.1 or HTTP/2 POST
- **Default Port:** `9545` (Mainnet / DevNet)
- **Content-Type:** `application/json`
- **Path:** `/` or `/rpc`

### 1.2 Request & Response Framing
Every RPC request MUST be a JSON object with:
```json
{
  "jsonrpc": "2.0",
  "method": "<method_name>",
  "params": [ ... ],
  "id": 1
}
```

A successful response MUST contain:
```json
{
  "jsonrpc": "2.0",
  "result": { ... },
  "id": 1
}
```

An error response MUST contain:
```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32602,
    "message": "Invalid params"
  },
  "id": 1
}
```

---

## 2. Core RPC Methods Specification

### 2.1 `bb_blockNumber`
Returns the integer height of the most recent block on the canonical chain.

- **Parameters:** None.
- **Result:** `uint64` (Hex-encoded integer, e.g. `"0x10f"` for block 271).
- **Example:**
```json
// Request
{"jsonrpc":"2.0","method":"bb_blockNumber","params":[],"id":1}

// Response
{"jsonrpc":"2.0","result":"0x10f","id":1}
```

---

### 2.2 `bb_getBlockByNumber`
Returns block information by its block height.

- **Parameters:**
  1. `height`: `string` (Hex-encoded block number, or `"latest"`, `"earliest"`).
  2. `full_transactions`: `boolean` (If `true`, returns full transaction objects; if `false`, returns tx ID hashes).
- **Example Response:**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "height": 42,
    "hash": "0x5a18d9f...",
    "previous_hash": "0x3e12c8a...",
    "merkle_root": "0x89ab12f...",
    "timestamp": 1700000420,
    "nonce": 182749,
    "difficulty_bits": 8,
    "transactions": [
      {
        "tx_id": "0x7b8c...",
        "sender": "bb1047291a...",
        "recipient": "bb19f8e21c...",
        "amount": 5000000,
        "fee": 1000,
        "nonce": 3,
        "timestamp": 1700000418
      }
    ]
  },
  "id": 2
}
```

---

### 2.3 `bb_getBlockByHash`
Returns block information given its 32-byte hex hash.

- **Parameters:**
  1. `block_hash`: `string` (32-byte hex string prefixed with `"0x"`).
  2. `full_transactions`: `boolean`.
- **Result:** Block object (identical to `bb_getBlockByNumber`) or `null` if not found.

---

### 2.4 `bb_getBalance`
Returns the balance of an account denominated in atomic micro-units.

- **Parameters:**
  1. `address`: `string` (`bb1...` address).
- **Result:** `string` (Decimal or Hex representation of atomic units).
- **Example:**
```json
// Request
{"jsonrpc":"2.0","method":"bb_getBalance","params":["bb1047291a92..."],"id":3}

// Response (10.500000 BUM = 10,500,000 atomic units)
{"jsonrpc":"2.0","result":"10500000","id":3}
```

---

### 2.5 `bb_getTransactionCount`
Returns the current sequential nonce of an account, required when constructing the next valid transaction.

- **Parameters:**
  1. `address`: `string` (`bb1...` address).
- **Result:** `uint64` (Current nonce integer).
- **Example:**
```json
// Request
{"jsonrpc":"2.0","method":"bb_getTransactionCount","params":["bb1047291a92..."],"id":4}

// Response
{"jsonrpc":"2.0","result":5,"id":4}
```

---

### 2.6 `bb_sendRawTransaction`
Submits a raw serialized transaction in hexadecimal format to the node's mempool for validation and P2P gossip propagation.

- **Parameters:**
  1. `signed_tx_hex`: `string` (Hex-encoded byte stream of full `Transaction::serialize()`).
- **Result:** `string` (32-byte hex transaction hash `tx_id`).
- **Example:**
```json
// Request
{"jsonrpc":"2.0","method":"bb_sendRawTransaction","params":["0x01000000..."],"id":5}

// Response
{"jsonrpc":"2.0","result":"0x7b8c45f214...","id":5}
```

---

### 2.7 `bb_peerCount`
Returns the current number of active P2P peers connected to the node.

- **Parameters:** None.
- **Result:** `uint32` (Integer peer count).
- **Example:**
```json
{"jsonrpc":"2.0","result":12,"id":6}
```

---

### 2.8 `bb_syncing`
Returns an object with synchronization progress data, or `false` if the node is fully synchronized with the heaviest tip.

- **Parameters:** None.
- **Result:**
```json
// If syncing:
{
  "jsonrpc": "2.0",
  "result": {
    "starting_block": 0,
    "current_block": 1420,
    "highest_block": 3890
  },
  "id": 7
}

// If fully synchronized:
{"jsonrpc":"2.0","result":false,"id":7}
```

---

### 2.9 `bb_getNetworkInfo`
Returns comprehensive node telemetry and runtime parameters:

- **Parameters:** None.
- **Result:**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "node_version": "1.0.0",
    "protocol_version": 1,
    "consensus_engine": "PoW-Nakamoto",
    "active_work": 145920,
    "current_height": 271,
    "peer_count": 8,
    "supply": "1355000000000"
  },
  "id": 8
}
```

---

### 2.10 `bb_getMiningWork` & `bb_submitWork` (PoW Mining API)
Enables standalone mining software (CPU/GPU miners) to poll for work and submit valid blocks.

- **`bb_getMiningWork` Result:**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "height": 272,
    "header_preimage": "0x0100000010010000...",
    "target_difficulty_bits": 8,
    "previous_hash": "0x5a18d9f..."
  },
  "id": 9
}
```

- **`bb_submitWork` Parameters:**
  1. `nonce`: `uint64`
  2. `block_hash`: `string`
- **Result:** `boolean` (`true` if block accepted and added to canonical chain).
