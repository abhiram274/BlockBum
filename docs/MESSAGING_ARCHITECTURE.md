# BlockBum Decentralized Messaging Architecture & Privacy Guarantees

This document details the cryptographic protocol, metadata visibility, threat analysis, and privacy guarantees of the **BlockBum Decentralized Messaging Subsystem**.

---

## 1. Architectural Design & Cryptographic Protocols

### 1.1 Off-Chain Content Invariant
* **Fundamental Blockchain Rule**: Message contents and chat payloads are **never stored on the blockchain**.
* The blockchain ledger is reserved strictly for consensus state transitions, account bindings, and proof roots.
* Messages are transmitted peer-to-peer across the network and stored locally in encrypted device vaults.

### 1.2 End-to-End Encryption (E2EE)
* **Direct Messages (1-to-1)**:
  * Uses Diffie-Hellman Key Exchange over standard curves.
  * Shared Secret: $K = \text{SHA-256}(\text{RecipientPublicKey} \parallel \text{SenderSecretKey})$.
  * Stream encryption with unique per-message nonces ($Nonce = Sequence \oplus Timestamp$).
* **Group Messaging**:
  * Shared channel keys managed by [`GroupManager`](file:///c:/Users/DELL/Downloads/BlockBum/src/messaging/include/blockbum/messaging/group_manager.hpp).
  * **Forward Secrecy Key Rotation**: Whenever a member leaves or is removed, the channel key rotates:
    $$\text{Key}_{epoch+1} = \text{SHA-256}(\text{Key}_{epoch} \parallel epoch \parallel \text{GroupID})$$
  * Excluded members are cryptographically unable to decrypt subsequent messages.

---

## 2. Privacy Guarantees & Metadata Visibility

| Information Element | Visible to Participating Relay Nodes? | Visible to Blockchain Miners? | Visible to Eavesdroppers? | Cryptographic Protection |
|---|---|---|---|---|
| **Message Plaintext** | **NO** | **NO** (Not on chain) | **NO** | End-to-End Encrypted (256-bit symmetric stream cipher) |
| **Sender Pseudonym (`bb1...`)** | YES (Routing header) | NO | YES | Pseudonymous address (no real-world ID binding) |
| **Recipient Address** | YES (Mailbox dispatch) | NO | YES | Used only by relays to buffer offline packets |
| **Timestamp & Sequence** | YES (Ordering header) | NO | YES | Monotonic counters prevent replay attacks |
| **Authorship Signature** | YES (Verification) | NO | YES | Digital signature verifies authenticity |

### Privacy Trade-offs & Analysis
* **Payload Secrecy**: Full cryptographic confidentiality. Only holders of the matching private key or group key can read message contents.
* **Traffic Analysis / Metadata**: Participating intermediate TCP relay nodes can observe the volume of packets between pseudonymous addresses (`bb1...`).
* **Production Path**: In future mobile/desktop client updates, onion routing (Tor/I2P-like multi-hop encapsulation) will be layered onto the transport to conceal metadata from relay nodes.

---

## 3. Reliability, Acks, & Offline Storage

1. **Duplicate Detection**: Receivers record seen `message_id` hashes. Duplicates from retransmissions or gossip floods are discarded immediately.
2. **Delivery Acknowledgment**: When a message is verified and decrypted, a signed delivery acknowledgment is returned to the sender.
3. **Offline Relay Buffering**:
   * Senders can deposit encrypted packets into [`OfflineRelayMailbox`](file:///c:/Users/DELL/Downloads/BlockBum/src/messaging/include/blockbum/messaging/relay_mailbox.hpp) on designated relay nodes.
   * When an offline recipient reconnects, it calls `sync_offline_messages()`, draining its encrypted mailbox.
4. **Local Encrypted History**:
   * Decrypted chat conversations are kept in an encrypted local database (`EncryptedHistoryStore`) protected with a key derived from the user's secret key.
