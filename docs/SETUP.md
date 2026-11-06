# Development Setup Instructions

This guide provides step-by-step instructions for configuring and building BlockBum across supported platforms.

---

## 1. Ubuntu / Debian Linux

### Install Dependencies

```bash
sudo apt-get update
sudo apt-get install -y \
    build-essential \
    cmake \
    git \
    ninja-build \
    gcc-14 \
    g++-14 \
    libsodium-dev \
    librocksdb-dev
```

### Build & Test

```bash
# Set compiler
export CC=gcc-14
export CXX=g++-14

# Generate build configuration
cmake -B build -G Ninja \
    -DCMAKE_BUILD_TYPE=Debug \
    -DBLOCKBUM_BUILD_TESTS=ON \
    -DBLOCKBUM_BUILD_NODE=ON

# Compile
cmake --build build -j$(nproc)

# Run test suite
ctest --test-dir build --output-on-failure

# Run the node
./build/src/node/blockbum_node
```

---

## 2. Windows 10/11

### Recommended: Visual Studio 2022 (MSVC)

1. Install **Visual Studio 2022 Community** with the **"Desktop development with C++"** workload.
2. Open a **Developer Command Prompt for VS 2022** or PowerShell with MSVC tools loaded.
3. Run:

```powershell
# Configure Visual Studio solution
cmake -B build -G "Visual Studio 17 2022" -A x64 -DBLOCKBUM_BUILD_TESTS=ON

# Compile
cmake --build build --config Release --parallel

# Execute unit tests
ctest --test-dir build -C Release --output-on-failure

# Launch the node
.\build\src\node\Release\blockbum_node.exe
```

---

## 3. Docker

If you prefer building in a clean, isolated container:

```bash
# Build the container image and execute tests
docker build -f docker/Dockerfile -t blockbum:latest .

# Run the node daemon
docker run -it --rm -p 8545:8545 -p 9000:9000 blockbum:latest
```
