# BlockBum Content-Addressed Storage & Media Architecture

This document specifies the technical design, IPFS-compatible content addressing, access control, chunking, and realistic privacy/availability guarantees of the **BlockBum Decentralized Content Subsystem**.

---

## 1. Cryptographic Content Addressing & Chunking

### 1.1 IPFS-Compatible Multihash Addressing
* Every file is divided into deterministic chunks (default size: `256 KB`, aligned with IPFS UnixFS).
* Each chunk receives a content identifier:
  $$\text{CID} = \text{"cid:sha256:"} \parallel \text{hex}(\text{SHA-256}(\text{ChunkCiphertext}))$$
* The **Root CID** is derived deterministically from the sequence of chunk hashes:
  $$\text{RootCID} = \text{"bbum:cas:"} \parallel \text{hex}(\text{SHA-256}(H_0 \parallel H_1 \dots \parallel H_{N-1}))$$

### 1.2 Local Encryption Invariant
* **Rule**: Raw, unencrypted files and private decryption keys are **never published to the P2P network or stored on the blockchain**.
* The file is encrypted locally on the sender's device before chunking and distributing to storage peers.
* The blockchain ledger only ever records transaction references containing the metadata `root_cid` and access commitments.

---

## 2. Integrity vs. Confidentiality vs. Availability

Decentralized content networks provide specific guarantees that must be clearly distinguished:

```
+---------------------------------------------------------------------------------+
| Guarantee       | What It Actually Guarantees                                   |
+-----------------+---------------------------------------------------------------+
| Integrity       | GUARANTEED. Content addressing ensures that any tampered byte |
|                 | changes the hash CID. A corrupted chunk is immediately rejected.|
+-----------------+---------------------------------------------------------------+
| Confidentiality | GUARANTEED. Senders encrypt chunks locally. Only authorized    |
|                 | addresses with the symmetric key can decrypt and read contents.|
+-----------------+---------------------------------------------------------------+
| Availability    | CONDITIONAL (NOT PERMANENT). Decentralized storage does NOT    |
|                 | guarantee permanent availability. A file is only available as |
|                 | long as at least one reachable online peer seeds its chunks.  |
+---------------------------------------------------------------------------------+
```

> [!IMPORTANT]
> **No Permanent Availability Guarantee**:
> Storing a CID on a decentralized network does not prevent a file from disappearing if all hosting nodes delete their caches or go offline. To ensure durable availability, nodes must participate in active peer replication, pinning services, or incentivized proof-of-storage contracts.

---

## 3. Resuming Downloads & Peer Retrieval

1. **Chunk-Level Resuming**:
   - Because each chunk is addressed by its individual CID, partial downloads can be safely interrupted.
   - When resuming, the client queries its local [`ContentStore`](file:///c:/Users/DELL/Downloads/BlockBum/src/content/include/blockbum/content/content_store.hpp) and only fetches missing CIDs.
2. **Offline Uploader Retrieval**:
   - Once chunks are replicated across peer nodes, the file remains fully retrievable even if the original creator goes completely offline.
3. **Abuse Prevention & Limits**:
   - Enforces a hard file size upper limit (`100 MB` on DevNet).
   - Content verification rejects malformed chunks or mismatched hashes before storing on disk.
   - Configurable retention limits (`enforce_retention_limit()`) automatically evict old or unpinned content chunks.
