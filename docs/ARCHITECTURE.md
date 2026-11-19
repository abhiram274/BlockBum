# BlockBum System Architecture

This document describes the architectural layout, subsystem responsibilities, and data flows of the **BlockBum Network**.

---

## 1. High-Level Architecture

BlockBum is engineered as a modular C++20 monorepo separating data modeling, cryptographic security, consensus validation, storage, and networking interfaces.

```
+-----------------------------------------------------------------------+
|                         BlockBum Node Daemon                          |
|                             (src/node)                                |
+-----------------------------------------------------------------------+
        |                                       |
        v                                       v
+-----------------------+               +-----------------------+
|  Blockchain Core Engine|               |      Storage Engine   |
|      (src/core)       |<------------->|     (src/storage)     |
| - Transaction         |               | - IStorageEngine      |
| - Block & BlockHeader |               | - FileStorageEngine   |
| - MerkleTree          |               | - RocksDB (Phase 2)   |
| - Blockchain State    |               +-----------------------+
| - Validation Rules    |                       |
+-----------------------+                       v
        |                               +-----------------------+
        v                               |      Disk Files       |
+-----------------------+               |  (data/devnet/store)  |
| Cryptographic Engine  |               +-----------------------+
|     (src/crypto)      |
| - SHA-256 (PicoSHA2)  |
| - CryptoUtils         |
| - Ed25519 (Libsodium) |
+-----------------------+
```

---

## 2. Subsystem Breakdown

### 2.1 Core (`src/core`)
* **`BinarySerializer` & `BinaryDeserializer`** (`include/blockbum/core/serializer.hpp`):
  * Explicit, deterministic little-endian binary serialization.
  * Guarantees identical binary representations across compilers (GCC, Clang, MSVC) and CPU architectures.
  * Serializes primitive integers (`uint8_t`, `uint16_t`, `uint32_t`, `uint64_t`), byte spans, strings, and 32-byte hashes.
* **`Transaction`** (`include/blockbum/core/transaction.hpp`):
  * Represents an on-chain transfer or message payload transaction.
  * Fields: `version`, `sender`, `recipient`, `amount`, `fee`, `nonce`, `payload` (arbitrary bytes for community messaging/content metadata), `timestamp`, and `tx_id`.
  * `serialize_for_id()` deterministically serializes content to compute `tx_id`.
* **`BlockHeader` & `Block`** (`include/blockbum/core/block.hpp`):
  * `BlockHeader`: Contains `version`, `height`, `previous_hash`, `merkle_root`, `timestamp`, and `nonce`.
  * `Block`: Wraps `BlockHeader` and `std::vector<Transaction>`. The `block_hash` is computed as the SHA-256 digest of the serialized header.
* **`MerkleTree`** (`include/blockbum/core/merkle_tree.hpp`):
  * Pairwise SHA-256 tree calculation committing all transactions in a block.
  * Handles odd-leaf node counts by duplicating the final hash at that level.
* **`Blockchain`** (`include/blockbum/core/blockchain.hpp`):
  * Core state manager and validation coordinator.
  * Maintains tip pointer, block height, and atomic block commits.
  * Generates deterministic genesis block (height 0).

### 2.2 Cryptography (`src/crypto`)
* **`CryptoUtils`** (`include/blockbum/crypto/crypto_utils.hpp`):
  * SHA-256 and Double-SHA-256 implementations via header-only `pico_sha2`.
  * Returns fixed-size `Hash256` (`std::array<uint8_t, 32>`).
* **`ICryptoEngine`** (`include/blockbum/crypto/icrypto.hpp`):
  * Abstract interface for public-key cryptography (Ed25519 signing and verification).

### 2.3 Storage Layer (`src/storage`)
* **`IStorageEngine`** (`include/blockbum/storage/istorage.hpp`):
  * Abstract key-value persistence interface (`open`, `close`, `get`, `put`, `remove`, `has`).
* **`FileStorageEngine`** (`include/blockbum/storage/file_storage.hpp`):
  * Concrete local storage engine with thread-safe file-backed persistence.
  * Indexes:
    * `tip_hash`: Tracks current chain head hash.
    * `height:<H>`: Maps block height to block hash.
    * `block:<hash>`: Maps block hash to serialized block binary payload.

### 2.4 Node CLI Application (`src/node`)
* Daemon entry point (`src/node/main.cpp`) providing interactive commands:
  * `init`: Initializes storage with the deterministic genesis block.
  * `status`: Displays current height, tip hash, and timestamp.
  * `create-block <msg>`: Mines and commits a new block with a community payload.
  * `list`: Prints block history and previous hash links.
  * `validate`: Executes full cryptographic audit across all blocks in the chain.
