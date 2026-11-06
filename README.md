# BlockBum Network

[![BlockBum CI](https://github.com/blockbum/blockbum/actions/workflows/ci.yml/badge.svg)](https://github.com/blockbum/blockbum/actions/workflows/ci.yml)
[![Standard](https://img.shields.io/badge/C%2B%2B-20-blue.svg)](https://en.wikipedia.org/wiki/C%2B%2B20)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

BlockBum is a decentralized blockchain node and community platform integrating peer-to-peer messaging, content publishing, and native cryptocurrency.

---

## Architecture Overview

BlockBum is engineered as a modular C++20 monorepo:

* **Core (`src/core`)**: Blockchain primitives, data models (`Transaction`, `Block`, `MerkleTree`), serialization, and hashing.
* **Cryptography (`src/crypto`)**: Ed25519 signing/verification, BLAKE2b/BLAKE3 hashing (libsodium wrapper).
* **Storage Engine (`src/storage`)**: Persistent key-value storage interface and RocksDB driver.
* **P2P Networking (`src/network`)**: Asynchronous framed TCP transport, peer discovery, and block/transaction gossip protocol.
* **Node Application (`src/node`)**: Daemon executable with configuration management and life-cycle supervision.
* **Desktop Client (`client/desktop`)**: Cross-platform desktop interface built with Tauri, React, and TypeScript.
* **Automated Tests (`tests/`)**: Unit and integration test suites using GoogleTest.

---

## Quick Start & Build Instructions

### Prerequisites

* **CMake** $\ge$ 3.20
* **C++20 Compliant Compiler**:
  * GCC $\ge$ 13
  * Clang $\ge$ 16
  * MSVC (Visual Studio 2022 $\ge$ 17.6)
* **Git**

For full platform-specific instructions, see [docs/SETUP.md](docs/SETUP.md).

### Linux / macOS

```bash
# Clone the repository
git clone https://github.com/blockbum/blockbum.git
cd blockbum

# Configure with CMake
cmake -B build -DCMAKE_BUILD_TYPE=Release

# Build the node and test suite
cmake --build build --parallel

# Run tests
ctest --test-dir build --output-on-failure

# Launch the node
./build/src/node/blockbum_node
```

### Windows (Visual Studio 2022 / MSVC)

```cmd
cmake -B build -G "Visual Studio 17 2022" -A x64
cmake --build build --config Release --parallel
ctest --test-dir build -C Release --output-on-failure
.\build\src\node\Release\blockbum_node.exe
```

### Docker

```bash
docker compose -f docker/docker-compose.yml up --build
```

---

## Documentation

* [Development Setup](docs/SETUP.md)
* [System Architecture](docs/ARCHITECTURE.md)
* [Contributing Guidelines](docs/CONTRIBUTING.md)
* [Phase Roadmap](docs/ROADMAP.md)
