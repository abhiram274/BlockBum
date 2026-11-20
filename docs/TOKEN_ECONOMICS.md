# BlockBum Native Cryptocurrency (BUM) Economics & Token Specification

This document details the economic model, accounting choice, monetary issuance rules, network incentives, threat model, and regulatory safety boundaries for the native cryptocurrency **BUM**.

For the exhaustive mathematical proof and node validation rules, see the official [BUM Monetary Policy Specification](file:///c:/Users/DELL/Downloads/BlockBum/docs/BUM_MONETARY_POLICY.md).

---

## 1. Accounting Model: Account-Based Ledger

### 1.1 Decision Rationale
BlockBum selected an **Account-Based Accounting Model** (similar to Ethereum/Cosmos) over UTXO (Bitcoin):
* **State Compression**: An account is stored as `(balance, nonce)`. This is dramatically more compact than tracking thousands of unspent output fragments for high-frequency community interactions.
* **Seamless Social & Governance Integration**: Community roles, voting weight, tipping, and subscription payments can directly query account balances rather than performing complex multi-input UTXO coin-selection.
* **Double Spend Protection via Nonce**: Every account maintains a strictly monotonic 64-bit counter (`nonce`). Transactions must satisfy $\text{nonce}_{\text{tx}} = \text{nonce}_{\text{account}} + 1$. Any replay or alternate transaction reusing an old nonce is rejected.

---

## 2. Tokenomics & Issuance Schedule

* **Token Symbol**: `BUM` (Mainnet) / `tBUM` (Testnet)
* **Divisibility**: $10^6$ atomic units (1 BUM = 1,000,000 MicroBUM)
* **Maximum Supply Cap**: 21,000,000 BUM (Deflationary hard ceiling, mathematically verified across 64 halving eras)
* **Block Subsidy Reward**: 50 BUM per block at Genesis
* **Halving Schedule**: Subsidy halves every 210,000 blocks (~4 years at typical 10-minute block intervals)
* **Minimum Network Fee**: 0.001 BUM (`1,000` atomic units) required per transaction to deter spam.
* **Dynamic Fee Rate**: 10 atomic units per serialized byte ($\text{fee} = \max(\text{MIN\_FEE}, \text{bytes} \times \text{BYTE\_FEE})$).

```
Total Supply Projection (Sum over 26 active halving eras):
Block 0         -> 50 BUM subsidy
Block 210,000   -> 25 BUM subsidy
Block 420,000   -> 12.5 BUM subsidy
...
Block 5,460,000 -> Supply cap reached (~20,999,999.98 BUM). Proposer revenue transitions purely to transaction fees.
```

---

## 3. Network Incentive Model & Fee Distribution

1. **Deterministic 80/20 Fee Distribution**:
   - For every confirmed block, collected transaction fees are split:
     - **80% to Block Proposer**: Direct incentive for network liveness, block creation, and transaction ordering.
     - **20% to Community Ecosystem Treasury** (`bb1_community_treasury`): Protocol-level reserve funding decentralized development and community bounties.
2. **Validator / Proposer Compensation**:
   $$\text{Payout}_{\text{proposer}}(H) = \text{BlockSubsidy}(H) + \text{Fee}_{\text{proposer}}(H)$$
3. **Optional Storage-Provider Compensation**:
   - Content uploaders lock lease escrows (`StorageLeaseEscrow`).
   - Storage providers claim compensation proportional to verified cryptographic Proofs of Retrievability (PoR).
   - No protocol inflation for storage: payouts are strictly funded by clients who deposit lease escrow.
4. **Community Utility & Tipping**:
   - Micro-tipping community feed posts and coding challenge solutions.
   - Timelocked Community Treasury grants.

---

## 4. Separation of Monetary Transactions & Content

* **Strict Invariant**: Value transfers (`Transaction`) contain only financial settlement fields (`sender`, `recipient`, `amount`, `fee`, `nonce`, `signature`).
* Raw message content, personal communications, and file payloads are **never mixed into monetary transaction records**.
* Off-chain messaging and file sharing use content hashes and E2EE vaults, preventing blockchain ledger bloat.

---

## 5. Prevention of Reward Duplication & Unauthorized Issuance

* **Single Reward per Height**: Every node tracks `rewarded_heights_`. A block height cannot be credited more than once.
* **Total Supply Bound**: `total_supply <= MAX_BUM_SUPPLY` enforced unconditionally by every full node.
* **State Balance Invariant**: $\sum \text{balances} \equiv \text{total\_supply}$.

---

## 6. Economic Assumptions, Risks, & Regulatory Guardrails

> [!CAUTION]
> **Regulatory Notice & Security Safeguards**:
> 1. **No Token Appreciation Promises**: The BlockBum protocol makes no representations or promises regarding future token price, liquidity, or capital appreciation.
> 2. **No Guaranteed Storage Income**: Storage hosting income is market-dependent and requires satisfying continuous cryptographic retrievability proofs.
> 3. **Economic Transition**: Validators must prepare for long-term fee-only security budgets as block subsidies halve over time.
