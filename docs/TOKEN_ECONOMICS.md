# BlockBum Native Cryptocurrency (BUM) Economics & Token Specification

This document details the economic model, accounting choice, monetary issuance rules, network incentives, threat model, and regulatory safety boundaries for the native cryptocurrency **BUM**.

---

## 1. Accounting Model: Account-Based Ledger

### 1.1 Decision Rationale
BlockBum selected an **Account-Based Accounting Model** (similar to Ethereum/Cosmos) over UTXO (Bitcoin):
* **State Compression**: An account is stored as `(balance, nonce)`. This is dramatically more compact than tracking thousands of unspent output fragments for high-frequency community interactions.
* **Seamless Social & Governance Integration**: Community roles, voting weight, tipping, and subscription payments can directly query account balances rather than performing complex multi-input UTXO coin-selection.
* **Double Spend Protection via Nonce**: Every account maintains a strictly monotonic 64-bit counter (`nonce`). Transactions must satisfy $\text{nonce}_{\text{tx}} = \text{nonce}_{\text{account}} + 1$. Any replay or alternate transaction reusing an old nonce is rejected.

---

## 2. Tokenomics & Issuance Schedule

* **Token Symbol**: `BUM`
* **Divisibility**: $10^6$ atomic units (1 BUM = 1,000,000 MicroBUM)
* **Maximum Supply Cap**: 100,000,000 BUM (Deflationary hard ceiling)
* **Block Subsidy Reward**: 50 BUM per block
* **Halving Schedule**: Subsidy halves every 210,000 blocks (~4 years at typical block intervals)
* **Minimum Network Fee**: 0.001 BUM (`1,000` atomic units) required per transaction to deter spam.

```
Total Supply Projection:
Block 0         -> 50 BUM subsidy
Block 210,000   -> 25 BUM subsidy
Block 420,000   -> 12.5 BUM subsidy
...
Block ~6.7M     -> Supply cap reached (100,000,000 BUM). Miner revenue transitions purely to transaction fees.
```

---

## 3. Network Incentive Model & Block Rewards

1. **Node Proposer Compensation**:
   - For every valid block produced, the proposer is credited:
     $$\text{Payout} = \text{BlockSubsidy}(\text{height}) + \sum \text{TransactionFees}$$
2. **Community Utility**:
   - Paying content publication fees.
   - Micro-tipping community posts and rewarding coding challenge solutions.
   - Staking collateral for network validator nodes.

---

## 4. Separation of Monetary Transactions & Content

* **Strict Invariant**: Value transfers (`Transaction`) contain only financial settlement fields (`sender`, `recipient`, `amount`, `fee`, `nonce`, `signature`).
* Raw message content, personal communications, and file payloads are **never mixed into monetary transaction records**.
* Off-chain messaging and file sharing use content hashes and E2EE vaults, preventing blockchain ledger bloat.

---

## 5. Economic Assumptions, Risks, & Regulatory Guardrails

> [!CAUTION]
> **Regulatory Notice & Security Safeguards**:
> 1. **No Real-Value Deployment**: BUM is currently implemented strictly for development and testing on private DevNet clusters.
> 2. **Pre-Production Security Audit**: BUM will **not** be deployed on any public network without formal external smart contract audits, cryptographic proof reviews, and legal assessments.
> 3. **Economic Risks**: Token price volatility, liquidity risks, miner collusion, and potential 51% reorganization attacks on small networks must be mitigated before public launch.
