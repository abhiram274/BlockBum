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
  * Secure local key isolation ensuring secret keys are never transmitted over the P2P wire.
  * Comprehensive test suite (`test_wallet.cpp`) verifying valid/invalid signatures, corrupted keys, unauthorized impersonations, and keystore persistence.
  * CLI tools (`wallet-create`, `wallet-list`, `wallet-export`, `wallet-recover`).
  * Security analysis and key compromise strategy documented in [docs/IDENTITY_AND_WALLET.md](IDENTITY_AND_WALLET.md).

### Phase 4: State Engine, Account Ledgers & Transactions [NEXT UP]
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
