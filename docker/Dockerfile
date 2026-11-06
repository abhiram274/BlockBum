# Multi-stage Dockerfile for BlockBum Network C++20 Node

# Stage 1: Build environment
FROM ubuntu:24.04 AS builder

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    git \
    ninja-build \
    gcc-14 \
    g++-14 \
    libsodium-dev \
    librocksdb-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV CC=gcc-14
ENV CXX=g++-14

WORKDIR /workspace

# Copy build manifest and source files
COPY . .

# Configure and compile
RUN cmake -B build -G Ninja \
    -DCMAKE_BUILD_TYPE=Release \
    -DBLOCKBUM_BUILD_TESTS=ON \
    -DBLOCKBUM_BUILD_NODE=ON \
    -DBLOCKBUM_WARNINGS_AS_ERRORS=ON

RUN cmake --build build --parallel $(nproc)

# Run test suite inside container during build
RUN ctest --test-dir build --output-on-failure

# Stage 2: Runtime image
FROM ubuntu:24.04 AS runner

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    libsodium23 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -m -u 1000 -s /bin/bash blockbum
USER blockbum
WORKDIR /home/blockbum

# Copy compiled binaries from builder
COPY --from=builder --chown=blockbum:blockbum /workspace/build/src/node/blockbum_node /usr/local/bin/blockbum_node

EXPOSE 8545 9000

ENTRYPOINT ["/usr/local/bin/blockbum_node"]
