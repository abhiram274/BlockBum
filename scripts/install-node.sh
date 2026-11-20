#!/usr/bin/env bash
set -euo pipefail

echo "=========================================================="
echo "  BlockBum Full Node Automated Installer & Setup Script   "
echo "=========================================================="

INSTALL_DIR="${HOME}/.blockbum"
DATA_DIR="${INSTALL_DIR}/data"
CONFIG_DIR="${INSTALL_DIR}/config"

echo "[1/5] Creating application directories in ${INSTALL_DIR}..."
mkdir -p "${DATA_DIR}" "${CONFIG_DIR}"

echo "[2/5] Checking build dependencies..."
if command -v apt-get &> /dev/null; then
    sudo apt-get update
    sudo apt-get install -y cmake g++ ninja-build libsodium-dev librocksdb-dev
elif command -v dnf &> /dev/null; then
    sudo dnf install -y cmake gcc-c++ ninja-build libsodium-devel
elif command -v brew &> /dev/null; then
    brew install cmake ninja libsodium
fi

echo "[3/5] Compiling BlockBum Core Daemon..."
cmake -B build -DCMAKE_BUILD_TYPE=Release -DBLOCKBUM_BUILD_NODE=ON -DBLOCKBUM_BUILD_TESTS=OFF
cmake --build build --config Release --parallel

echo "[4/5] Initializing Genesis block..."
./build/src/node/blockbum_node init

echo "[5/5] Setup complete!"
echo "To start your node manually in Archival Mode:"
echo "  ./build/src/node/blockbum_node run-node --port 9000"
echo ""
echo "To start your node in Pruned Mode (saving disk space):"
echo "  ./build/src/node/blockbum_node run-node --port 9000 --prune 1000"
echo "=========================================================="
