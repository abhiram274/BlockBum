# BlockBum Technical Protocol Specification (Version 1.0)

**Document Version:** 1.0.0  
**Status:** Official Standard (BlockBum Mainnet / DevNet Interoperability)  
**Authors:** BlockBum Protocol Architecture Group  
**Target Audience:** Independent Node Implementers, Core Developers, Protocol Auditors, Wallet Developers  

---

## 1. Abstract

This document suite defines the official technical protocol specification for the **BlockBum Blockchain and P2P Network**. It provides complete, unambiguous, and implementation-agnostic requirements for constructing fully interoperable independent node implementations, client wallets, consensus validators, and miners without requiring access to the original reference implementation.

BlockBum combines a permissionless Proof-of-Work (PoW) ledger with an account-based state model, deterministic binary serialization, high-throughput P2P wire framing, and end-to-end encrypted (E2EE) decentralized social/community messaging.

---

## 2. Specification Conformance & RFC 2119 Key Words

The key words **"MUST"**, **"MUST NOT"**, **"REQUIRED"**, **"SHALL"**, **"SHALL NOT"**, **"SHOULD"**, **"SHOULD NOT"**, **"RECOMMENDED"**, **"MAY"**, and **"OPTIONAL"** in this document are to be interpreted as described in [RFC 2119](https://www.ietf.org/rfc/rfc2119.txt).

An implementation is considered a **Conforming BlockBum Node** if and only if:
1. It strictly adheres to all normative MUST, MUST NOT, and REQUIRED clauses defined in Chapters 01 through 07.
2. It generates byte-for-byte identical output for all standard test vectors specified in Chapter 08.
3. It participates in peer-to-peer gossip and synchronization without triggering protocol error violations or forks.

---

## 3. High-Level System Architecture

```
+-----------------------------------------------------------------------------------+
|                           BlockBum Node Architecture                              |
+-----------------------------------------------------------------------------------+
|  Application & Client Layer                                                       |
|  - JSON-RPC 2.0 API (bb_* methods)       - Decentralized Community & Feed Engine |
|  - Local Keystore & Wallet Derivation    - E2EE Messaging Service (X25519/AEAD)   |
+-----------------------------------------------------------------------------------+
|  Consensus & Ledger Layer                                                         |
|  - Account State Machine (Nonce/Balance) - 21M BUM Supply Schedule & Halving      |
|  - Heaviest Accumulated Work Fork Choice - PoW Nakamoto / PoA DevNet Engines     |
|  - Deep Reorganization Engine (Max 100)  - Merkle Tree Proof Validation           |
+-----------------------------------------------------------------------------------+
|  Network & Wire Protocol Layer                                                    |
|  - TCP P2P Framing (Magic: 0x4D554242)   - P2P Sync Manager (GetBlocks / Batch)   |
|  - Version Negotiation (v1)              - Flood Protection (50k Hash Filter)     |
+-----------------------------------------------------------------------------------+
|  Cryptographic Foundation                                                         |
|  - SHA-256 / Double SHA-256              - Ed25519 Digital Signatures (RFC 8032)  |
|  - X25519 Key Agreement (RFC 7748)       - ChaCha20-Poly1305 AEAD (RFC 8439)     |
+-----------------------------------------------------------------------------------+
```

---

## 4. Specification Chapters

The specification is partitioned into modular, versioned technical chapters:

| Chapter | Specification Document | Description |
| :--- | :--- | :--- |
| **01** | [01_DATA_FORMATS.md](file:///c:/Users/DELL/Downloads/BlockBum/docs/protocol/v1/01_DATA_FORMATS.md) | Deterministic binary serialization, endianness, BlockHeader, Transaction, Block, and Merkle tree layouts. |
| **02** | [02_NETWORK_PROTOCOL.md](file:///c:/Users/DELL/Downloads/BlockBum/docs/protocol/v1/02_NETWORK_PROTOCOL.md) | Wire protocol framing, magic bytes, message types (1–10), handshake, peer discovery, and gossip rules. |
| **03** | [03_CONSENSUS_RULES.md](file:///c:/Users/DELL/Downloads/BlockBum/docs/protocol/v1/03_CONSENSUS_RULES.md) | Nakamoto Proof of Work, dynamic difficulty retargeting, PoA fallback, cumulative work fork choice, and finality. |
| **04** | [04_STATE_AND_LEDGER.md](file:///c:/Users/DELL/Downloads/BlockBum/docs/protocol/v1/04_STATE_AND_LEDGER.md) | Account state model, balance conservation, sequential nonces, transaction execution, and 21M BUM supply schedule. |
| **05** | [05_NODE_RPC_AND_API.md](file:///c:/Users/DELL/Downloads/BlockBum/docs/protocol/v1/05_NODE_RPC_AND_API.md) | JSON-RPC 2.0 interface, standard methods (`bb_*`), data formats, error schemas, and transport bindings. |
| **06** | [06_IDENTITY_AND_CRYPTO.md](file:///c:/Users/DELL/Downloads/BlockBum/docs/protocol/v1/06_IDENTITY_AND_CRYPTO.md) | Ed25519 signatures, X25519-ChaCha20-Poly1305 E2EE, `bb1` address format, seed derivation, and wallet backup. |
| **07** | [07_COMPATIBILITY_AND_UPGRADES.md](file:///c:/Users/DELL/Downloads/BlockBum/docs/protocol/v1/07_COMPATIBILITY_AND_UPGRADES.md) | Error code registry, network rejection codes, soft fork vs hard fork rules, signaling, and migration policy. |
| **08** | [08_TEST_VECTORS.md](file:///c:/Users/DELL/Downloads/BlockBum/docs/protocol/v1/08_TEST_VECTORS.md) | Deterministic test vectors with canonical byte and hexadecimal representations for independent verification. |

---

## 5. Protocol Constants Summary

The following normative constants govern the BlockBum v1 protocol:

| Parameter | Value | Interpretation |
| :--- | :--- | :--- |
| `PROTOCOL_MAGIC` | `0x4D554242` (`"BBUM"`) | Wire protocol packet preamble identifier (Little-Endian) |
| `PROTOCOL_VERSION` | `1` | Wire and serialization protocol version |
| `MAX_MESSAGE_SIZE` | `10,485,760` bytes (10 MiB) | Maximum allowable P2P wire message payload |
| `MAX_BUM_SUPPLY` | `21,000,000,000,000` | 21 Million BUM total max supply in atomic micro-units |
| `BUM_DECIMALS` | `1,000,000` | 6 decimal places per 1 BUM token (1 BUM = $10^6$ atomic units) |
| `INITIAL_BLOCK_REWARD` | `50,000,000` atomic units | 50.0 BUM initial block subsidy |
| `HALVING_INTERVAL` | `210,000` blocks | Block subsidy halves every 210,000 blocks (~4 years at 10 min) |
| `MIN_TRANSACTION_FEE` | `1,000` atomic units | 0.001 BUM minimum transaction relay and inclusion fee |
| `MAX_REORG_DEPTH` | `100` blocks | Maximum chain reorganization depth before finalized |
| `MAX_SEEN_CACHE` | `50,000` entries | Memory cache limit for seen transactions and block propagation |
| `DEFAULT_P2P_PORT` | `9000` (DevNet) / `9333` (Mainnet) | Default TCP peer listening port |
| `DEFAULT_RPC_PORT` | `9545` | Default HTTP/WebSocket JSON-RPC listening port |
