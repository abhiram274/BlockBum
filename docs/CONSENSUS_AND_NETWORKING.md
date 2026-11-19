# BlockBum Phase 2: Consensus, Networking & Security Analysis

This document details the P2P networking protocols, consensus engine, attack surfaces, security assumptions, and upgrade paths for the **BlockBum Network**.

---

## 1. P2P Architecture & Wire Protocol

BlockBum utilizes a framed binary wire protocol over TCP:

```
+---------------------------------------------------------------+
| Byte Offset | Field         | Type     | Description          |
+-------------+---------------+----------+----------------------+
| 0 - 3       | Magic         | u32      | "BBUM" (0x4D554242)  |
| 4 - 7       | Version       | u32      | Protocol version (1) |
| 8           | MessageType   | u8       | Command opcode (1-10)|
| 9 - 12      | PayloadSize   | u32      | Size in bytes        |
| 13 - N      | Payload       | bytes    | Binary serialized    |
+---------------------------------------------------------------+
```

### 1.1 Core Messages
1. **`Status` (6)**: Periodic heartbeat and initial peer exchange reporting `height`, `tip_hash`, and `node_id`.
2. **`GetBlocks` (7)**: Request a sequence of missing blocks (`from_height` to `from_height + max_count`).
3. **`BlockBatch` (8)**: Response containing a contiguous array of blocks for initial block download (IBD).
4. **`NewBlock` (9)**: Gossip broadcast for newly mined/validated blocks.
5. **`NewTransaction` (10)**: Gossip broadcast for verified unconfirmed transactions.

### 1.2 Loop & Storm Prevention
* Every node tracks an in-memory cache of `seen_blocks_` (`SHA-256(header)`) and `seen_txs_` (`tx_id`).
* Duplicate blocks and transactions are discarded immediately before deserialization or relay, preventing infinite propagation loops and network broadcast storms.

---

## 2. DevNet Consensus Mechanism

### 2.1 Assumptions for Development Network
* **Topology**: Small trusted developer network or local multi-node clusters.
* **Synchrony**: Weak synchrony assumption (messages propagate between honest nodes within an upper-bound delay $\Delta$).
* **Tie-Breaking Rule**: Longest chain rule based on verified cryptographic cumulative height and valid previous block hash linkage.
* **Round-Robin Proposer**: Blocks are scheduled across authorized validator IDs (`validator_index = height % N`).

---

## 3. Threat Model & Attack Surface Analysis

| Attack Vector | Vulnerability Description | Current Mitigation (Phase 2) | Production Mitigation (Migration Path) |
|---|---|---|---|
| **Sybil Attack** | An attacker creates thousands of fake nodes to dominate peer routing. | Bootstrap node peering and strict message rate limits. | Proof-of-Stake (PoS) validator registration with collateral bonding. |
| **Eclipse Attack** | Malicious peers isolate a victim node by filling all its inbound/outbound slots. | Multiple bootstrap anchors, cross-referencing tips from distinct peers. | Peer address manager (Kademlia DHT / AddrMan) enforcing subnet diversity. |
| **Gossip Storms / DoS** | Flooding nodes with identical blocks or spam packets. | Deduplication caches (`seen_blocks_`, `seen_txs_`), max payload enforcement (10 MB). | Per-peer token-bucket rate limiting and disconnect penalties on malformed headers. |
| **Chain Split / Forks** | Partitions or racing blocks causing divergence. | Deterministic validation & longest valid chain synchronization. | Finality gadget (Casper / Tendermint BFT 2-round commit). |

---

## 4. Migration Path Toward Production Consensus

```
[Phase 2 DevNet PoA / Longest Chain]
                 │
                 ▼
[Phase 3 Dynamic Difficulty PoW / Hybrid DevNet]
                 │
                 ▼
[Phase 4 Modular libp2p + Kademlia Discovery]
                 │
                 ▼
[Production Proof-of-Stake (PoS) + BFT Finality Engine]
```

1. **Phase 3**: Introduce dynamic difficulty adjustment and transaction mempool verification.
2. **Phase 4**: Replace direct socket framing with full libp2p modular transport (encrypted Noise handshake, Yamux multiplexing, and GossipSub).
3. **Production**: Transition to a Proof-of-Stake consensus with Byzantine Fault Tolerant (BFT) finality guarantees, slashing conditions, and cryptographic validator signatures.
