# BlockBum: Architecture & Phase-by-Phase Roadmap

## 1. System Overview & Vision

**BlockBum** is a decentralized, peer-to-peer community platform integrating messaging, content publishing/sharing, and a native cryptocurrency. It is designed ground-up with a high-performance **C++20** blockchain node core, modular P2P networking, content addressing (IPFS-compatible), and modern multi-platform clients (React + TypeScript + Tauri desktop, React Native mobile, Web).

```mermaid
flowchart TB
    subgraph UI ["User-Facing Clients"]
        Tauri["Desktop App (Tauri + React/TS)"]
        Web["Web Portal (React/TS)"]
        Mobile["Mobile App (React Native - Future)"]
    end

    subgraph NodeAPI ["Node Interface Layer"]
        REST["C++ REST API / RPC Engine"]
        WS["WebSocket Event Stream"]
    end

    subgraph Core ["BlockBum Core (C++20)"]
        Consensus["Consensus Engine (PoW / PoA / PoS Hybrid DevNet)"]
        Mempool["Transaction Mempool & Validator"]
        State["State Engine & Account/Balance Model"]
        Crypto["Crypto Subsystem (libsodium / Ed25519 / BLAKE3)"]
        Storage["Storage Layer (RocksDB / Key-Value Abstraction)"]
        P2P["Modular P2P Protocol (TCP/libp2p framing)"]
        CAS["Content Addressed Storage (IPFS-compatible chunks)"]
    end

    Tauri --> REST
    Tauri --> WS
    Web --> REST
    Web --> WS
    Mobile --> REST
    REST --> State
    REST --> Mempool
    P2P <--> Consensus
    P2P <--> CAS
    Mempool --> Consensus
    Consensus --> State
    State --> Storage
    Crypto --> Consensus
    Crypto --> Mempool
```

---

## 2. Phased Roadmap

### Phase 0: BlockBum Engineering Foundation [COMPLETED]
* **Status**: Completed (CI passing on Ubuntu GCC-14, Ubuntu Clang-18, Windows MSVC).
* **Deliverables**: C++20 modular monorepo, CMake configuration, GoogleTest integration, GitHub Actions CI workflow, base interface abstractions (`ICryptoEngine`, `IStorageEngine`, `INetworkTransport`).

### Phase 1: Blockchain Core & Local Chain Execution [COMPLETED]
* **Status**: Completed (12 automated unit tests passing in CI, multi-platform verified).
* **Deliverables**:
  * Deterministic binary serialization engine (`BinarySerializer`, `BinaryDeserializer`).
  * Core domain types: `Transaction`, `BlockHeader`, `Block`.
  * Pairwise SHA-256 `MerkleTree` algorithm.
  * Deterministic genesis block generator and persistent local storage.

### Phase 2: P2P Network, Node Synchronization & Consensus [COMPLETED]
* **Status**: Completed (Multi-node integration test passing across Windows and Linux CI).
* **Deliverables**:
  * Modular P2P networking interface (`INetworkTransport`).
  * Cross-platform TCP transport (`TcpNetworkTransport`) with connection management and framing.
  * Wire protocol (`wire_protocol.hpp`) with magic bytes `BBUM` and command set.
  * Node synchronization manager (`NodeSyncManager`) for initial block download and transaction/block propagation.
  * Multi-node integration test (`test_p2p_network.cpp`) testing 3 nodes with node disconnect resilience.

### Phase 3: Cryptographic Identity & Wallet Subsystem [COMPLETED]
* **Status**: Completed (Keypair generation, signature verification, keystore persistence, and recovery tests passing).
* **Deliverables**:
  * Cryptographic identity engine (`StandardCryptoEngine`) using constant-time verified primitives and CSPRNG entropy.
  * Multi-identity wallet manager (`Wallet`, `Identity`) with persistent disk storage (`data/wallet/*.wallet`).
  * Strict transaction signing and verification binding (`sender_pubkey`, `signature`, `tx_id`).
  * Deterministic identity export and recovery mechanisms via recovery phrases.
  * Security analysis and key compromise strategy documented in [docs/IDENTITY_AND_WALLET.md](IDENTITY_AND_WALLET.md).

### Phase 4: Decentralized Messaging Subsystem [COMPLETED]
* **Status**: Completed (Unit tests passing across Windows and Linux CI).
* **Deliverables**:
  * End-to-end encrypted direct 1-to-1 messaging (`E2EEncryptionEngine`).
  * Group messaging with forward-secrecy key rotation on member changes (`GroupManager`).
  * Strict off-chain message isolation ensuring message contents never clutter the blockchain.
  * Offline relay mailboxes (`OfflineRelayMailbox`) buffering messages for offline recipients.
  * Local encrypted chat history storage (`EncryptedHistoryStore`).
  * Metadata visibility and privacy guarantees documented in [docs/MESSAGING_ARCHITECTURE.md](MESSAGING_ARCHITECTURE.md).

### Phase 5: Decentralized Content Sharing & Storage [COMPLETED]
* **Status**: Completed (Chunking, local encryption, offline peer replication, and access control tests passing).
* **Deliverables**:
  * Multi-format content engine supporting PDFs, images, videos, audio, and source code.
  * Local client-side file encryption prior to network distribution.
  * IPFS-compatible chunking (`256 KB`) and cryptographic content addressing.

### Phase 6: Decentralized Community Platform [COMPLETED]
* **Status**: Completed (33 automated unit and integration tests passing in CI).
* **Deliverables**:
  * Community management service (`CommunityService`) with public/private discovery and invitation access control.
  * Verifiable on-chain governance anchoring (`GovernanceRecord`) for community creation, membership, and roles.
  * Discussion channels, collaborative coding challenges, and community calendar events.
  * Responsive client UI engineered in React + TypeScript (`client/desktop/src/App.tsx`).

### Phase 7: Native Cryptocurrency BUM & Token Economics [COMPLETED]
* **Status**: Completed (34 unit and integration tests passing across Windows and Linux CI).
* **Deliverables**:
  * Account-based ledger state machine (`AccountLedger`) with atomic balance transfers and sequential nonce execution.
  * Strict double-spending and replay protection via monotonic nonce validation.
  * Tokenomics rules: 100 Million BUM maximum supply cap, 6 decimal precision, and 210,000-block halving schedule.
  * Network incentive engine: Block rewards (`INITIAL_BLOCK_REWARD = 50 BUM`) and transaction fee distribution.
  * Solvency and signature verification enforcing balance $\ge$ amount + fee.
  * Comprehensive test suite (`test_token_ledger.cpp`).
  * Economic assumptions, threat models, and legal guardrails documented in [docs/TOKEN_ECONOMICS.md](TOKEN_ECONOMICS.md).

### Phase 8: Desktop Application (Tauri + React + TypeScript) [COMPLETED]
* **Status**: Completed (Modern cross-platform desktop UI, Tauri bridge, and zero blockchain duplication).
* **Deliverables**:
  * Modern, responsive desktop application built with React, TypeScript, and Vite.
  * Native desktop runtime shell using Tauri (`client/desktop/src-tauri`).
  * Full integration with the C++ BlockBum core node (wallet balances, transaction history, E2EE chat, communities, and CAS file downloads).
  * Node switching interface allowing users to connect to local nodes or remote network bootstrap gateways.
  * Multi-identity wallet manager and signed BUM transfers.
  * Local data isolation guarantees protecting private keys from network exposure.
  * Installation and packaging documentation in [docs/DESKTOP_APPLICATION.md](DESKTOP_APPLICATION.md).

### Phase 9: Security, Threat Model & Reliability Assessment [COMPLETED]
* **Status**: Completed (End-to-end security audit, automated fuzz testing, ASan/UBSan CI integration, and threat documentation).
* **Deliverables**:
  * Blockchain consensus, transaction validation, and double-spending regression testing.
  * Comprehensive fuzz testing for transaction parsing, block deserialization, and P2P wire framing.
  * Cryptographic key isolation and ciphertext tamper-resistance verification.
  * Content-Addressed Storage (CAS) file chunk integrity, ACL authorization, and offline availability testing.
  * Clang 18 AddressSanitizer and UndefinedBehaviorSanitizer added to the CI matrix.
  * Throughput and latency benchmarks for transaction processing, Merkle tree construction, and file transfer.
  * Detailed security and risk report in [docs/SECURITY_REPORT.md](SECURITY_REPORT.md).

### Phase 10: BlockBum Public Testnet Launch [COMPLETED]
* **Status**: Completed (Multi-bootstrap node topology, reproducible binaries, zero-value test cryptocurrency, health monitoring, and operator onboarding).
* **Deliverables**:
  * Reproducible Docker multi-node cluster deployment (`docker-compose.testnet.yml`).
  * Dedicated multi-bootstrap nodes configured for Frankfurt, Virginia, and Singapore seeds.
  * Testnet cryptocurrency (`tBUM`) with zero monetary value and built-in community faucet support.
  * Network health telemetry and status monitoring CLI (`blockbum_node status`).
  * End-to-end test suite for node synchronization and recovery after network disconnection.
  * Complete documentation covering identity creation, community participation, and vulnerability disclosure in [docs/TESTNET_GUIDE.md](TESTNET_GUIDE.md).
  * Strict mainnet guardrail: mainnet deployment and real monetary issuance prohibited until independent security review and legal compliance audits are complete.

### Project Status: All 10 Engineering, Security & Testnet Phases Complete!
* **Goal**: Transition from in-memory objects to a persistent, atomic blockchain database.
* **Key Components**:
  * Abstract Storage Interface (`IStorageEngine`).
  * RocksDB persistent implementation with an in-memory/file fallback for lightweight test environments.
  * World State (Account balances, nonces, UTXO or account state transitions).
  * Atomic block commit and rollback (reorganization support).
* **Deliverable & Testing**: Persistence tests, crash recovery test, state consistency validation.

### Phase 3: Mempool, Consensus & Block Production
* **Goal**: Enable standalone node execution that validates incoming transactions, queues them in a mempool, and mines/validates blocks.
* **Key Components**:
  * Mempool: Validation (nonce, balance, fee, replay protection), priority queue.
  * Configurable Consensus engine: Dynamic difficulty adjustment, configurable DevNet parameters.
  * Miner / Block Builder worker.
* **Deliverable & Testing**: Automated simulation producing transactions, mining valid blocks, updating ledger state.

### Phase 4: Modular P2P Networking Layer
* **Goal**: Inter-node communication over TCP with a framed, asynchronous protocol.
* **Key Components**:
  * Modular Transport Interface (`IPeerTransport`, `INetworkProtocol`).
  * Peer discovery & handshake (node identity exchange, protocol versioning).
  * Wire protocol: Ping/Pong, Block broadcast (`inv`, `getdata`, `block`), Transaction broadcast (`tx`).
  * Initial Block Download (IBD) sync protocol.
* **Deliverable & Testing**: Multi-node local network test where Node A mines blocks and Node B synchronizes seamlessly.

### Phase 5: REST API & RPC Server
* **Goal**: Expose an interface for clients and wallets to interact with the blockchain node.
* **Key Components**:
  * HTTP REST server in C++ (embedded lightweight server, e.g., Crow / cpp-httplib / Boost.Beast).
  * Endpoints:
    * `/api/v1/node/status`
    * `/api/v1/blocks/latest`, `/api/v1/blocks/:height_or_hash`
    * `/api/v1/tx/broadcast`
    * `/api/v1/account/:address`
  * Real-time WebSocket feed for new blocks and incoming transactions.
* **Deliverable & Testing**: CLI tool and integration tests interacting with the node via HTTP.

### Phase 6: Content Sharing & Decentralized Messaging Subsystem
* **Goal**: Bring the "BlockBum Community Platform" features into the protocol.
* **Key Components**:
  * Content addressing (chunking data, CID generation, IPFS compatibility bridge).
  * On-chain metadata & off-chain payload storage.
  * End-to-end encrypted messaging transactions (ECDH key exchange via libsodium).
  * Social/community feed primitives (posts, channels, tip transactions).
* **Deliverable & Testing**: End-to-end messaging test between two identities.

### Phase 7: Desktop Application (Tauri + React + TypeScript)
* **Goal**: Polished, cross-platform UI for users to manage wallets, send transactions, chat, and share content.
* **Key Components**:
  * Embedded or remote node connector.
  * Wallet management (mnemonic generation, encrypted keystore, send/receive).
  * Community feed & decentralized messaging UI.
* **Deliverable & Testing**: Runnable desktop application packaged with Tauri.

---

## 3. Recommended Repository Layout

```
BlockBum/
├── CMakeLists.txt                 # Root CMake configuration (C++20)
├── cmake/                         # CMake modules, CPM or FetchContent helpers
├── docs/                          # Architecture & protocol specifications
│   ├── ARCHITECTURE.md
│   ├── PROTOCOL.md
│   └── API.md
├── src/
│   ├── core/                      # Types, hashing, crypto, data structures
│   ├── consensus/                 # Consensus rules & block production
│   ├── storage/                   # Storage engine abstraction & RocksDB impl
│   ├── network/                   # P2P connection management & wire protocol
│   ├── rpc/                       # HTTP REST & WebSocket API server
│   └── node/                      # Node daemon executable entry point
├── tests/
│   ├── unit/                      # GoogleTest unit tests
│   └── integration/               # Multi-node integration tests
├── client/
│   ├── desktop/                   # Tauri + React + TypeScript desktop client
│   └── web/                       # React web dashboard
└── scripts/
    ├── devnet-up.sh               # Spin up local multi-node network
    └── build.sh                   # Standardized build script
```
