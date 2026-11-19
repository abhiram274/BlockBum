# BlockBum Desktop Application Architecture & Installation Guide

This document covers the installation, setup, local data security, and client architecture for the **BlockBum Desktop Application** built with **Tauri**, **React**, and **TypeScript**.

---

## 1. System Architecture & Zero-Duplication Invariant

```
+---------------------------------------------------------------------------------+
|                         BlockBum Desktop UI Layer                               |
|                       (React 18 + TypeScript + Vite)                            |
+---------------------------------------------------------------------------------+
                                       │
                     Tauri IPC Commands / REST API
                                       │
                                       ▼
+---------------------------------------------------------------------------------+
|                       Tauri Native Rust Shell (src-tauri)                       |
+---------------------------------------------------------------------------------+
                                       │
                     TCP / HTTP RPC Connection (e.g. :8545)
                                       │
                                       ▼
+---------------------------------------------------------------------------------+
|                        BlockBum C++ Core Node Daemon                            |
|       (Consensus Engine, P2P Wire Protocol, Account Ledger, RocksDB/CAS)        |
+---------------------------------------------------------------------------------+
```

### Zero Logic Duplication Rule
* **No Blockchain Duplication**: Consensus validation, cryptography, block verification, P2P networking, and double-spend detection are **exclusively executed inside the C++ BlockBum core node**.
* The desktop application acts as a rich client: querying state, initiating signed transfers, and dispatching E2EE messages through the node's APIs.

---

## 2. Secure Local Application Data Management

1. **Private Keystore Isolation**:
   - Private keys and recovery seeds are kept strictly in the user's protected OS application storage directory (`%LOCALAPPDATA%/BlockBum` on Windows, `~/.local/share/blockbum` on Linux).
   - Private keys are **never transmitted over the network** or displayed in web contexts.
2. **Encrypted Offline History**:
   - Decrypted message logs and cached CAS files are stored locally in encrypted binary vaults (`EncryptedHistoryStore`).

---

## 3. Installation & Build Guide

### Prerequisites
* **Node.js** $\ge 18$ & **npm**
* **Rust & Cargo** (for Tauri native bundler)
* **C++20 Compiler** & **CMake** (for running the background node daemon)

### 3.1 Developer Setup
```bash
# 1. Start the C++ Core Node in the background
./build/src/node/blockbum_node run-node --port 9000

# 2. Navigate to the desktop client directory
cd client/desktop

# 3. Install JavaScript dependencies
npm install

# 4. Launch in development mode with hot-reloading
npm run tauri dev
```

### 3.2 Building Standalone Executables
```bash
npm run tauri build
```
The packaged installers will be generated under `client/desktop/src-tauri/target/release/bundle/`:
* **Windows**: `.msi` and standalone `.exe` installers.
* **Linux**: `.deb`, `.AppImage`, and `.tar.gz` packages.
* **macOS**: `.dmg` and `.app` bundles.
