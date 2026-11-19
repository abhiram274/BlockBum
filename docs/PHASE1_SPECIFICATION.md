# BlockBum Specification: Phase 1 Blockchain Core

This document outlines the exact technical specification for the Phase 1 implementation of BlockBum Network.

---

## 1. Wire & Storage Binary Format

All integer fields are serialized in **little-endian** byte order.

### 1.1 Primitives
* `u8`: 1 byte
* `u16`: 2 bytes (little-endian)
* `u32`: 4 bytes (little-endian)
* `u64`: 8 bytes (little-endian)
* `Hash256`: 32 bytes raw binary
* `bytes`: `u32` (length prefix $L$) followed by $L$ bytes
* `string`: `u32` (length prefix $L$) followed by $L$ UTF-8 encoded bytes

### 1.2 Transaction Structure

```
+-----------------------------------------------------------+
| Field         | Type     | Description                    |
+---------------+----------+--------------------------------+
| version       | u32      | Transaction version (default 1)|
| sender        | string   | Sender identifier or address   |
| recipient     | string   | Recipient identifier/address   |
| amount        | u64      | Transfer value in atomic units |
| fee           | u64      | Transaction priority fee       |
| nonce         | u64      | Account sequence number        |
| payload       | bytes    | Arbitrary data (msg/content)   |
| timestamp     | u64      | Epoch timestamp in seconds/ms  |
| tx_id         | Hash256  | SHA-256 of above fields        |
+-----------------------------------------------------------+
```

### 1.3 BlockHeader Structure

```
+-----------------------------------------------------------+
| Field         | Type     | Description                    |
+---------------+----------+--------------------------------+
| version       | u32      | Block format version (default 1|
| height        | u64      | Block height (0 for genesis)   |
| previous_hash | Hash256  | Hash of previous block header  |
| merkle_root   | Hash256  | Merkle root of transaction set |
| timestamp     | u64      | Unix epoch timestamp           |
| nonce         | u64      | Proof / consensus nonce        |
+-----------------------------------------------------------+
```
* **Block Hash**: `SHA-256(serialize(BlockHeader))`

### 1.4 Block Structure

```
+-----------------------------------------------------------+
| Field         | Type                 | Description        |
+---------------+----------------------+--------------------+
| header_bytes  | bytes                | Serialized header  |
| tx_count      | u32                  | Number of txs      |
| transactions  | array of bytes       | Serialized txs     |
| block_hash    | Hash256              | Precomputed hash   |
+-----------------------------------------------------------+
```

---

## 2. Cryptographic Merkle Tree Algorithm

1. If the transaction set is empty, return 32 zero bytes (`0x00...00`).
2. Collect the list of 32-byte transaction IDs $[H_0, H_1, \dots, H_{N-1}]$.
3. Loop until a single root hash remains:
   * Pair adjacent nodes $(H_i, H_{i+1})$.
   * If the number of nodes is odd, duplicate the final node $(H_{N-1}, H_{N-1})$.
   * Compute parent: $P = \text{SHA-256}(H_{left} \parallel H_{right})$.
   * Replace current level with the parent level.

---

## 3. Validation Rules

A block is declared **Valid** if and only if all following conditions hold:

1. **Transaction Integrity**:
   * For every transaction, $tx\_id == \text{SHA-256}(serialize\_for\_id(tx))$.
2. **Merkle Root Integrity**:
   * $\text{MerkleTree::compute\_root}(tx\_ids) == header.merkle\_root$.
3. **Block Hash Authenticity**:
   * $\text{SHA-256}(serialize(header)) == block.block\_hash$.
4. **Chain Continuity**:
   * For genesis ($height = 0$): $block.block\_hash == \text{GenesisBlockHash}$.
   * For $height > 0$:
     * $header.previous\_hash == previous\_block.block\_hash$.
     * $header.height == previous\_block.header.height + 1$.

---

## 4. Node CLI Reference

| Command | Usage | Description |
|---|---|---|
| `init` | `blockbum_node init` | Creates storage database and seeds deterministic genesis block. |
| `status` | `blockbum_node status` | Reports current blockchain height, tip hash, and timestamp. |
| `create-block` | `blockbum_node create-block "<msg>"` | Packages a new transaction with `<msg>` payload and mines block. |
| `list` | `blockbum_node list` | Lists all blocks in the local ledger with heights and linkages. |
| `validate` | `blockbum_node validate` | Performs exhaustive cryptographic audit across all blocks. |
