# BlockBum Community Platform Architecture

This document describes the high-level architecture of the **BlockBum Community Platform**, detailing verifiable on-chain governance anchoring, access control, collaborative features, and the responsive client layer.

---

## 1. On-Chain vs. Off-Chain Architectural Invariants

BlockBum achieves scalability and strict privacy by partitioning community operations into two distinct layers:

```
+---------------------------------------------------------------------------------+
|                               BlockBum Community                                |
+---------------------------------------+-----------------------------------------+
|           ON-CHAIN LEDGER             |               OFF-CHAIN                 |
|       (Public Verifiability)          |        (Privacy & High Volume)          |
+---------------------------------------+-----------------------------------------+
| - Community Creation Records          | - Real-time Discussions & Chat Payloads |
| - Membership State Transitions        | - Direct 1-to-1 Encrypted Messages      |
| - Role Allocations (Admin/Moderator)  | - Personal Profiles & Pseudonyms        |
| - Educational Resource CIDs (Hashes)  | - Educational Raw Files (PDF, Video)    |
| - Governance Attestations             | - Local Encrypted History Vaults        |
+---------------------------------------+-----------------------------------------+
```

### 1.1 Verifiable On-Chain Governance
* When a community is formed or a member's role is updated (e.g. promoted to Moderator or Admin), an atomic [`GovernanceRecord`](file:///c:/Users/DELL/Downloads/BlockBum/src/community/include/blockbum/community/types.hpp) is committed to the blockchain.
* This allows any participating node or client to independently audit and verify community authority without relying on a centralized server.

### 1.2 Off-Chain Privacy & File Storage
* All conversation content, personal discussions, and profile data remain completely off-chain.
* Educational files, PDFs, videos, and coding resources are distributed via the Content-Addressed Storage (CAS) engine ([`ContentManager`](file:///c:/Users/DELL/Downloads/BlockBum/src/content/include/blockbum/content/content_manager.hpp)) using verified chunking and client-side encryption.

---

## 2. Platform Features

1. **Community Discovery**:
   - Public communities are globally indexable and discoverable by any node.
   - Private communities are hidden and require cryptographically verified invitation tokens (`generate_invitation`).
2. **Hierarchical Roles & Permissions**:
   - `Owner`: Absolute administrative control, role assignment, and community parameters.
   - `Admin`: Channel creation, invitation generation, and membership management.
   - `Moderator`: Scheduling community events and authoring coding challenges.
   - `Member`: Participation in discussions, reading channels, and sharing learning resources.
3. **Collaborative Learning & Coding Challenges**:
   - Built-in primitives for interactive algorithm challenges, point scoring, and shared learning materials.
4. **Multi-Node Responsive Web/Desktop UI**:
   - Engineered in **React + TypeScript**.
   - Configurable RPC node URL: clients can switch between local devnet nodes, remote peers, or bootstrap gateways.
   - Intuitive layout accessible to students and non-technical users.
