# BlockBum Node Operator Guide

**Version:** 1.0.0  
**Target:** Independent Full Node Operators, Staking/Mining Pools, Infrastructure Providers  
**Network Compatibility:** BlockBum DevNet & Mainnet  

---

## 1. System Requirements

BlockBum is architected in high-performance C++20 to run efficiently across commodity hardware, cloud instances, and home servers.

| Component | Minimum Requirements | Recommended (Production / Archival) |
| :--- | :--- | :--- |
| **CPU** | 2 Cores (x86_64 or ARM64) | 4+ Cores (2.5 GHz+) |
| **Memory (RAM)** | 2 GB RAM | 4–8 GB RAM |
| **Storage (Pruned)** | 10 GB NVMe / SSD | 50 GB SSD |
| **Storage (Archival)** | 50 GB NVMe / SSD | 200+ GB SSD |
| **Network Bandwidth** | 10 Mbps Up / Down | 50+ Mbps Unmetered |
| **Operating System** | Ubuntu 22.04+, Debian 12+, RHEL 9+, Windows 10/11, macOS 13+ | Ubuntu 24.04 LTS (x86_64 / ARM64) |

---

## 2. Network Ports & Firewall Configuration

BlockBum nodes support **IPv4 and IPv6 dual-stack** networking. Ensure the following ports are open on your host firewall and router (if running behind NAT):

| Port | Protocol | Interface | Description | Default |
| :---: | :---: | :---: | :--- | :---: |
| **9000** | TCP | Public (WAN) | P2P Wire Protocol (DevNet / Testnet) | Open to 0.0.0.0/0 & ::/0 |
| **9333** | TCP | Public (WAN) | P2P Wire Protocol (Mainnet) | Open to 0.0.0.0/0 & ::/0 |
| **9545** | TCP | Localhost (127.0.0.1) | JSON-RPC 2.0 API Server | **DO NOT EXPOSE TO PUBLIC WAN** |

### 2.1 Firewall Configuration (UFW on Linux)
```bash
# Allow P2P gossip traffic (IPv4 and IPv6)
sudo ufw allow 9000/tcp comment 'BlockBum P2P DevNet'
sudo ufw allow 9333/tcp comment 'BlockBum P2P Mainnet'

# Verify rule application
sudo ufw status verbose
```

### 2.2 NAT Traversal & Port Forwarding
If your node is deployed behind a home router or NAT gateway:
1. Access your router administration panel.
2. Forward external TCP port `9000` (or `9333`) to your server's local IP address (e.g., `192.168.1.50:9000`).
3. Ensure UPnP (Universal Plug and Play) is enabled if automatic port forwarding is desired.

---

## 3. Fast Installation & Startup

### Option A: One-Click Script Installation (Linux / macOS)
```bash
git clone https://github.com/abhiram274/BlockBum.git
cd BlockBum
chmod +x scripts/install-node.sh
./scripts/install-node.sh
```

### Option B: Windows Deployment
Double-click `scripts\install-node.bat` or run:
```cmd
.\scripts\install-node.bat
```

---

## 4. Node Operational Modes

BlockBum supports two primary operational storage configurations:

### 4.1 Archival Full Node (Default)
Retains the entire historical ledger, all transaction payloads, raw block data, and Merkle proofs from Genesis:
```bash
./build/src/node/blockbum_node run-node --port 9000
```
- **Use Case:** Block explorers, mining pool coordinators, RPC providers, full chain validators.
- **Storage Profile:** Grows monotonically over time.

### 4.2 Pruned Node Mode (`--prune <blocks>`)
Retains the full account state ledger (balances, nonces) and all block headers, while automatically pruning old block transaction bodies older than $N$ blocks:
```bash
./build/src/node/blockbum_node run-node --port 9000 --prune 1000
```
- **Use Case:** Home operators, low-resource VPS, desktop client backends.
- **Storage Profile:** Fixed bounded storage footprint (~2 GB).
- **Consensus Guarantee:** Full cryptographic verification of all incoming blocks and state updates.

---

## 5. Peer Discovery & Bootstrap Independence

BlockBum is architected so that **no single organization or company controls network connectivity or consensus**.

### 5.1 Multiple Discovery Mechanisms
1. **Bootstrap Seeds:** Nodes can initially connect via known geographic bootstrap nodes:
   ```bash
   ./blockbum_node run-node --port 9000 \
     --peer frankfurt.seed.blockbum.org:9000 \
     --peer virginia.seed.blockbum.org:9000 \
     --peer singapore.seed.blockbum.org:9000
   ```
2. **Peer Exchange (PEX):** Connected nodes continuously exchange their known peer address books via `GetPeers` (`0x0B`) and `Peers` (`0x0C`) wire frames.
3. **Local Address Book (`data/peers.dat`):**  
   Every discovered peer is evaluated, scored, and persisted locally to disk.
4. **Bootstrap Independence Mode (`--no-bootstrap`):**  
   When restarted, the node immediately re-establishes connections directly from its persistent address book. If all original bootstrap nodes fail, go offline, or are compromised, **the peer-to-peer network continues operating seamlessly without disruption**:
   ```bash
   ./blockbum_node run-node --port 9000 --no-bootstrap
   ```

---

## 6. Peer Reputation & Misbehavior Scoring

BlockBum incorporates automated connection defense against Sybil attacks, gossip flooding, and malformed blocks:

| Event | Score Delta | Consequence |
| :--- | :---: | :--- |
| **Valid block or batch delivered** | `+5` | Reputation increased (capped at 100) |
| **Connection timeout or failure** | `-10` | Candidate priority lowered |
| **Oversized frame (> 10 MiB)** | Direct Disconnect | Socket terminated immediately |
| **Invalid block hash / Merkle root** | `-50` | Peer demoted |
| **Reputation score reaches $\le 0$** | **BANNED** | Disconnected and banned for 24 hours |

---

## 7. Running as a Systemd Background Service (Linux)

For production servers, run BlockBum as a managed system daemon:

1. Copy the unit file:
   ```bash
   sudo cp systemd/blockbum-node.service /etc/systemd/system/
   ```
2. Reload systemd daemon:
   ```bash
   sudo systemctl daemon-reload
   ```
3. Enable and start the service:
   ```bash
   sudo systemctl enable --now blockbum-node
   ```
4. Inspect real-time node logs:
   ```bash
   journalctl -u blockbum-node -f
   ```

---

## 8. Monitoring & CLI Management

Inspect local node height and tip status:
```bash
./build/src/node/blockbum_node status
```

Verify complete local chain integrity:
```bash
./build/src/node/blockbum_node validate
```

List local wallet accounts:
```bash
./build/src/node/blockbum_node wallet-list
```
