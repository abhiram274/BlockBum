# BlockBum Protocol Specification — Chapter 01: Data Formats & Serialization

**Protocol Version:** 1.0  
**Specification Document:** BB-SPEC-01  
**Status:** Normative  

---

## 1. Overview & Serialization Rules

BlockBum defines a strict, unambiguous, and canonical binary serialization format for all on-chain and wire data structures. Any conforming node implementation MUST adhere to these serialization rules to guarantee identical cryptographic hashes, state roots, and transaction identifiers across heterogeneous platforms and programming languages.

### 1.1 Byte Order (Endianness)
All numeric integer primitives MUST be encoded in **Little-Endian** byte ordering:
- Lower-order bytes precede higher-order bytes in the byte stream.
- An unsigned 32-bit integer `0x12345678` is serialized on the wire as `0x78 0x56 0x34 0x12`.
- Floating-point representations MUST NOT be used in consensus or serialization logic.

### 1.2 Primitive Type Encodings

| Type | Length | Encoding Rules |
| :--- | :--- | :--- |
| `uint8_t` | 1 byte | Single raw unsigned 8-bit byte. |
| `uint16_t` | 2 bytes | Unsigned 16-bit integer in little-endian byte order. |
| `uint32_t` | 4 bytes | Unsigned 32-bit integer in little-endian byte order. |
| `uint64_t` | 8 bytes | Unsigned 64-bit integer in little-endian byte order. |
| `Hash256` | 32 bytes | Fixed-length 32-byte raw binary array (no length prefix). |
| `PublicKey` | 32 bytes | Fixed-length 32-byte Ed25519 public key. |
| `Signature` | 64 bytes | Fixed-length 64-byte Ed25519 signature. |
| `bytes` | 4 + $N$ bytes | Dynamic byte array: 4-byte `uint32_t` little-endian length prefix $N$ followed by $N$ raw bytes. |
| `string` | 4 + $M$ bytes | UTF-8 encoded string: 4-byte `uint32_t` little-endian length prefix $M$ (byte count) followed by $M$ raw UTF-8 bytes (no null-terminator). |

---

## 2. Transaction Data Format

A BlockBum Transaction encapsulates value transfers, state modifications, or arbitrary community data payloads.

### 2.1 Complete Transaction Structure

```
+-------------------------------------------------------------------------+
|                        Transaction Binary Layout                         |
+--------------------+--------------+-------------------------------------+
| Field Name         | Wire Type    | Description                         |
+--------------------+--------------+-------------------------------------+
| version            | uint32_t     | Transaction format version (1)      |
| sender             | string       | Sender address ("bb1" + hex prefix) |
| recipient          | string       | Destination address / channel ID    |
| amount             | uint64_t     | Transferred amount in atomic units  |
| fee                | uint64_t     | Network priority fee (atomic units) |
| nonce              | uint64_t     | Sender account sequence number      |
| payload            | bytes        | Optional data / message payload     |
| timestamp          | uint64_t     | Creation Unix timestamp (seconds)   |
| sender_pubkey      | bytes        | 32-byte Ed25519 public key          |
| signature          | bytes        | 64-byte Ed25519 signature           |
| tx_id              | Hash256      | 32-byte SHA-256 transaction hash    |
+--------------------+--------------+-------------------------------------+
```

### 2.2 Transaction ID Pre-image (`serialize_for_id`)
To prevent circular hashing dependencies, the transaction identifier `tx_id` and the cryptographic signature `signature` are computed over the deterministic pre-image known as `serialize_for_id()`.

The pre-image serializes the following fields in strict sequential order:
1. `version` (`uint32_t`, 4 bytes LE)
2. `sender` (`string`, 4 bytes LE length prefix + UTF-8 bytes)
3. `recipient` (`string`, 4 bytes LE length prefix + UTF-8 bytes)
4. `amount` (`uint64_t`, 8 bytes LE)
5. `fee` (`uint64_t`, 8 bytes LE)
6. `nonce` (`uint64_t`, 8 bytes LE)
7. `payload` (`bytes`, 4 bytes LE length prefix + raw bytes)
8. `timestamp` (`uint64_t`, 8 bytes LE)
9. `sender_pubkey` (`bytes`, 4 bytes LE length prefix `0x00000020` + 32 raw bytes)

The transaction hash MUST be derived as:
$$\text{tx\_id} = \text{SHA-256}(\text{serialize\_for\_id}())$$

### 2.3 Full Transaction Wire Serialization (`serialize`)
The full serialized transaction includes the pre-image fields followed by the signature and the transaction identifier:
1. All 9 fields of `serialize_for_id()`
2. `signature` (`bytes`, 4 bytes LE length prefix `0x00000040` + 64 raw bytes)
3. `tx_id` (`Hash256`, raw 32 bytes without length prefix)

---

## 3. BlockHeader Data Format

The `BlockHeader` contains all cryptographic commitments, consensus parameters, and chain linkage fields required to validate a block's position within the blockchain.

### 3.1 BlockHeader Binary Layout

| Field | Type | Offset | Length | Description |
| :--- | :--- | :--- | :--- | :--- |
| `version` | `uint32_t` | 0 | 4 bytes | Block format version (currently 1). |
| `height` | `uint64_t` | 4 | 8 bytes | Monotonically increasing chain height (Genesis = 0). |
| `previous_hash` | `Hash256` | 12 | 32 bytes | SHA-256 hash of the immediate parent block header. |
| `merkle_root` | `Hash256` | 44 | 32 bytes | SHA-256 root hash of the transactions Merkle tree. |
| `timestamp` | `uint64_t` | 76 | 8 bytes | Block creation timestamp (Unix epoch seconds/ms). |
| `nonce` | `uint64_t` | 84 | 8 bytes | Consensus proof-of-work mining nonce or PoA salt. |

**Total Serialized Header Size:** Exactly **92 bytes** (fixed).

### 3.2 Block Hash Derivation
The block hash represents the primary block identifier and the proof-of-work target challenge. It MUST be computed as:
$$\text{block\_hash} = \text{SHA-256}(\text{BlockHeader::serialize}())$$
Conforming implementations MUST NOT include the transaction list or transaction count in the block hash pre-image; transactions are committed via the `merkle_root` field within the header.

---

## 4. Block Data Format

A full `Block` encapsulates the serialized `BlockHeader`, an array of transactions, and the resulting `block_hash`.

```
+-------------------------------------------------------------------------+
|                           Block Binary Layout                           |
+--------------------+--------------+-------------------------------------+
| Field Name         | Wire Type    | Description                         |
+--------------------+--------------+-------------------------------------+
| header_bytes       | bytes        | 4-byte LE length (92) + 92B header  |
| tx_count           | uint32_t     | Number of transactions in block     |
| transactions[0]    | bytes        | 4-byte LE length + serialized tx 0  |
| ...                | ...          | ...                                 |
| transactions[N-1]  | bytes        | 4-byte LE length + serialized tx N  |
| block_hash         | Hash256      | 32-byte SHA-256 block hash          |
+--------------------+--------------+-------------------------------------+
```

### 4.1 Deserialization Verification
Upon deserializing a block, the receiving node MUST perform the following structural verifications:
1. Read `header_bytes` and deserialize the nested `BlockHeader`.
2. Compute $\text{SHA-256}(\text{header\_bytes})$ and verify that it equals the trailing `block_hash`.
3. Read `tx_count` and iterate to deserialize exactly `tx_count` transactions.
4. Verify that the Merkle tree calculated over all transactions matches the `merkle_root` in the header.

---

## 5. Merkle Tree Construction Specification

BlockBum utilizes a binary Merkle tree constructed with the SHA-256 cryptographic hash function to commit transactions to the block header.

### 5.1 Merkle Root Rules
Let $L = [H_0, H_1, \dots, H_{n-1}]$ be the ordered list of 32-byte transaction identifiers (`tx_id`) contained in the block:

1. **Empty Transaction Set ($n = 0$):**  
   If a block contains zero transactions, the Merkle root MUST be the 32-byte null hash (all zeros):
   $$\text{MerkleRoot}(\emptyset) = \mathtt{0x0000000000000000000000000000000000000000000000000000000000000000}$$

2. **Single Transaction ($n = 1$):**  
   If a block contains exactly one transaction, the Merkle root is the transaction ID itself:
   $$\text{MerkleRoot}([H_0]) = H_0$$

3. **Multiple Transactions ($n > 1$):**  
   At each level of the tree, adjacent pairs of 32-byte hashes are concatenated and hashed with SHA-256:
   $$\text{Parent}(H_{2i}, H_{2i+1}) = \text{SHA-256}(H_{2i} \mathbin{\Vert} H_{2i+1})$$
   where $\Vert$ denotes 64-byte binary concatenation.

4. **Odd Leaf Duplication:**  
   If the number of nodes at any level is odd, the final node MUST be concatenated with itself:
   $$\text{Parent}(H_{\text{last}}, H_{\text{last}}) = \text{SHA-256}(H_{\text{last}} \mathbin{\Vert} H_{\text{last}})$$

5. **Recursion:**  
   The process is repeated recursively until a single 32-byte root hash remains.

---

## 6. Canonical Serialization Guarantees

To prevent transaction malleability and consensus divergence:
1. **No Extraneous Bytes:** Deserializers MUST reject any payload that contains trailing, unconsumed bytes after deserializing the designated structure.
2. **Bounds Checking:** Deserializers MUST check available buffer length before allocating or copying memory to prevent buffer overflow vulnerabilities.
3. **Canonical Field Ordering:** Fields MUST be serialized in the exact order documented. Implementations MUST NOT reorder fields or omit fields even if default-initialized.
