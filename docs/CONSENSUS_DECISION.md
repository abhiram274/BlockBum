# BlockBum Consensus Decision Document: Architecture & Protocol Evaluation (Phase 12)

**Document ID:** BB-RFC-0012  
**Status:** Architecture Decision Document & Specification  
**Audience:** Protocol Engineers, Core Developers, Security Auditors, Node Operators  
**Date:** November 20, 2026  

---

## 1. Executive Summary & Problem Formulation

BlockBum is transitioning from a localized permissioned development network (Phase 2 DevNet PoA) to a globally decentralized, permissionless Mainnet.

### Core Challenge:
The existing round-robin Proof-of-Authority (PoA) mechanism assumes a static, trusted validator set. In an open, adversarial internet environment:
- Anyone must be able to join as a block producer without centralized gatekeeping.
- The protocol must be resilient against Sybil identities, network partitions, selfish mining, stake cartels, and eclipse attacks.
- The state machine must resolve forks deterministically through a verifiable fork-choice rule.
- Local testnet and developer tooling must remain functional with zero overhead.

**Decision Invariant:** The existing DevNet PoA mechanism must remain intact for automated testing, local development, and fast CI builds, while introducing an enterprise-grade, permissionless consensus architecture with deterministic fork-choice and chain reorganization for Mainnet.

---

## 2. Comparative Evaluation: Proof of Work vs. Proof of Stake

### Detailed Metric Comparison

| Dimension | Proof of Work (Nakamoto PoW) | Proof of Stake (BFT / CometBFT PoS) | Evaluation for BlockBum |
| :--- | :--- | :--- | :--- |
| **Sybil Resistance** | Physical thermodynamics: SHA-256 / memory-hard hashrate. | Capital lockup: bonded token stake ($S \ge S_{\min}$). | **PoW** provides physical thermodynamic unforgeability without early stake distribution bias. |
| **Initial Distribution** | Fair launch via continuous mining subsidy emission. | Pre-mined or ICO-concentrated initial capital allocation. | **Critical for BlockBum**: BUM is distributed permissionlessly; PoW avoids initial plutocracy. |
| **Fork-Choice Rule** | Heaviest Accumulated Proof of Work ($\sum 2^{\text{diff}}$). | LMD-GHOST / Highest Justified Epoch Checkpoint. | PoW fork choice is 100% stateless and objective for newly syncing nodes. |
| **Finality Semantics** | Probabilistic ($k=6$ confirmations $\approx 99.9\%$ confidence). | Deterministic ($2/3 + 1$ validator signatures yield instant finality). | PoS offers faster finality, but introduces cartel censorship if stake consolidates. |
| **Attack Vulnerability** | $51\%$ Hashrate Reorganization; Selfish Mining ($>33\%$). | Nothing-at-Stake, Long-Range Attacks, Bribe Attacks. | PoS requires "Weak Subjectivity" checkpoints to prevent long-range history rewrites. |
| **Implementation Complexity** | Low to Medium: Pure mathematical target verification. | High: Complex slashing, unbonding queues, equivocation proofs. | PoW engine is significantly less prone to subtle state-machine consensus bugs. |
| **Client Requirements** | Standard lightweight headers for SPV verification. | Light clients must track dynamic validator validator set changes. | PoW headers are trivial to verify in desktop/mobile clients. |

---

## 3. Hardware & Participation Requirements

### 3.1 Proof of Work Miner Requirements
1. **CPU / ASIC Resistance**: To maximize community decentralization across desktop clients, BlockBum adopts a SHA-256d or Memory-Hard CPU-friendly puzzle (target adjustment).
2. **Bandwidth**: 10 Mbps upstream/downstream for 1 MB block propagation within 500ms.
3. **Storage**: Pruned mode requires 5 GB; full archive requires 50 GB/year at 10-second block intervals.
4. **Participation Barrier**: Zero permission or identity registration required. Any node can start mining immediately by running `blockbum_node mine`.

### 3.2 Proof of Stake Validator Requirements (Comparative Alternative)
1. **Minimum Bond**: $10,000 \text{ BUM}$ bonded in governance contract for 21 days (unbonding epoch).
2. **Equivocation Slashing**: $100\%$ slash of validator bond for double-signing competing blocks at the same height.
3. **Liveness Fault**: $1\%$ slash and temporary jailing for missing $>500$ consecutive block validation slots.
4. **Hardware**: 24/7 dedicated server with static IP, HSM or secure enclave for validator key isolation.

---

## 4. Threat Model & Attack Scenarios

### 4.1 Long-Range Attacks (PoS Vulnerability)
- **Attack**: A validator sells their private keys after unbonding. The adversary uses these old keys to generate an alternative historical chain from Genesis, presenting it to new nodes.
- **PoW Immunity**: Completely immune. Producing an alternative chain from block 0 requires recomputing billions of tera-hashes of real energy, making historical rewrites computationally impossible.

### 4.2 Sybil Attacks
- **Mechanism**: An attacker creates 100,000 virtual nodes to flood the peer network.
- **Defense**: Peer counts in BlockBum do NOT confer consensus voting power. A million nodes with zero hashrate contribute zero accumulated work.

### 4.3 Selfish Mining
- **Threshold**: Miners with $>33\%$ hashrate can withhold blocks to waste honest miners' energy.
- **Mitigation**: Rapid block propagation protocol, compact block relaying, and tie-breaking by lowest block hash when weights are identical.

---

## 5. Deterministic Fork-Choice Rule Specification

The active tip of the blockchain is defined deterministically by the **Heaviest Valid Accumulated Work Rule**:

$$\text{ChainWork}(C) = \sum_{B \in C} \text{Work}(B)$$

Where the work contributed by a block with difficulty target $T$ is:
$$\text{Work}(B) = \left\lfloor \frac{2^{256}}{T + 1} \right\rfloor$$

### Tie-Breaking Invariant:
If two competing branches $C_1$ and $C_2$ possess **identical accumulated work**:
$$\text{ChainWork}(C_1) == \text{ChainWork}(C_2)$$
The node preserves the branch that was **first received and validated**. If both arrive simultaneously or during batch sync, the branch whose tip block hash is lexicographically smaller ($\text{Hash}(B_1) < \text{Hash}(B_2)$) is chosen deterministically across all nodes.

---

## 6. Chain Reorganization & Rollback Semantics

When a block $B_{\text{new}}$ is received that references an ancestor other than the current tip $B_{\text{tip}}$:

### Reorganization Algorithm:
1. **Find Common Ancestor ($A$)**:
   Traverse backwards from $B_{\text{new}}$ and $B_{\text{tip}}$ until finding the most recent shared block hash $A$.
2. **Compute Branch Work**:
   $$\Delta W_{\text{new}} = \sum_{b \in [A \to B_{\text{new}}]} \text{Work}(b), \quad \Delta W_{\text{active}} = \sum_{b \in [A \to B_{\text{tip}}]} \text{Work}(b)$$
3. **Evaluate Reorganization Condition**:
   If $W(B_{\text{new}}) > W(B_{\text{tip}})$:
   - **Roll Back Active Chain**: Revert transactions in blocks from $B_{\text{tip}}$ down to $A+1$. Return unconfirmed transactions to the local mempool.
   - **Apply New Chain**: Sequentially validate and apply state transitions for blocks from $A+1$ up to $B_{\text{new}}$.
   - **Update Tip**: Set active chain height to $B_{\text{new}}.\text{height}$ and `tip_hash` to $B_{\text{new}}.\text{hash}$.
4. **Safety Depth Limit**: To prevent deep chain destabilization, organizations deeper than `MAX_REORG_DEPTH = 100` blocks are rejected without manual operator override.

---

## 7. Dynamic Difficulty Adjustment Algorithm

To maintain a consistent target block interval ($T_{\text{target}} = 10 \text{ seconds}$) despite fluctuating global hashrate:

- **Adjustment Window**: Every $N = 100 \text{ blocks}$.
- **Expected Duration**: $\Delta T_{\text{expected}} = N \times T_{\text{target}} = 1,000 \text{ seconds}$.
- **Actual Duration**: $\Delta T_{\text{actual}} = \text{Timestamp}(B_{\text{current}}) - \text{Timestamp}(B_{\text{window\_start}})$.

### Target Adjustment Formula:
$$\text{Target}_{\text{next}} = \text{Target}_{\text{current}} \times \frac{\Delta T_{\text{actual}}}{\Delta T_{\text{expected}}}$$

### Damping Factor:
To prevent oscillation and difficulty manipulation, the maximum single adjustment is clamped to a factor of 4:
$$\frac{1}{4} \le \frac{\Delta T_{\text{actual}}}{\Delta T_{\text{expected}}} \le 4$$

---

## 8. Consensus Decision & Implementation Architecture

### Consensus Choice for BlockBum:
BlockBum selects **Pluggable Multi-Engine Consensus** featuring:
1. **Nakamoto Proof-of-Work (PoW)** as the Default **Permissionless Mainnet Consensus**:
   - Optimal for fair launch, censorship resistance, and decentralized desktop node mining.
   - 100% objective state verification with no weak subjectivity checkpoints.
   - Immune to stake concentration, Nothing-at-Stake, and long-range history rewrites.
2. **Proof-of-Authority (PoA)** as the **DevNet / Testnet Consensus**:
   - Zero CPU consumption during integration tests and continuous integration pipelines.
   - Deterministic block scheduling for rapid developer feedback loops.
3. **Deterministic Chain Reorganization**:
   - Shared across all consensus modes.
   - Supports reorg depth tracking, fork rollback, and mempool transaction recovery.
