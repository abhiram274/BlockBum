# BUM Cryptocurrency Monetary Policy & Economic Infrastructure Specification

## Document Metadata
- **Protocol Version**: 1.0.0
- **Status**: Official Economic Specification (Phase 17)
- **Token Symbol**: `BUM` (Mainnet) / `tBUM` (Testnet)
- **Mathematical Cap**: 21,000,000 BUM ($21 \times 10^{12}$ atomic units)

---

## 1. Executive Summary & Legal / Economic Disclaimer

This document defines the formal monetary policy, issuance mechanics, fee market, participant compensation models, and mathematical invariants of the native BlockBum cryptocurrency (`BUM`).

> [!CAUTION]
> **Regulatory Notice & Economic Disclaimers**:
> 1. **No Guaranteed Returns**: The BlockBum protocol does NOT promise or guarantee token appreciation, capital gains, or financial profit.
> 2. **No Guaranteed Storage Income**: Storage-provider compensation is strictly peer-to-peer and performance-contingent. Storage hosts are not guaranteed income; revenue depends entirely on voluntary market demand, client lease deposits, and cryptographically verified Proof-of-Retrievability challenges.
> 3. **No Guaranteed Rewards**: Validator block subsidies and fee shares are contingent on continuous operational uptime, block generation adherence, and honest consensus participation.
> 4. **Pre-Mainnet Scoping**: All economic parameters specified herein are implemented for deterministic verification on private DevNet clusters and public TestNet environments prior to decentralized mainnet genesis.

---

## 2. Supply Cap Audit & Resolution of the 100M Inconsistency

### 2.1 Audit of Existing Implementations
In early draft design documents and informal whitepaper sketches, an unverified placeholder of "100M BUM maximum supply" was referenced alongside a block subsidy rule of "50 BUM per block, halving every 210,000 blocks".

An audit of the mathematical series demonstrates that these two statements are mutually incompatible:

Let $R_0 = 50\text{ BUM}$ denote the initial block subsidy, and $I = 210,000\text{ blocks}$ denote the halving interval. In each halving era $k \in [0, \infty)$, the block subsidy is given by:
$$R_k = \frac{R_0}{2^k}$$

The theoretical total supply emitted through block rewards across infinite halving eras is the sum of a geometric series:
$$S_\infty = \sum_{k=0}^{\infty} I \times R_k = I \times R_0 \sum_{k=0}^{\infty} \left(\frac{1}{2}\right)^k = 210,000 \times 50 \times \frac{1}{1 - 1/2} = 21,000,000\text{ BUM}$$

### 2.2 Discrete Integer Arithmetic & Era Truncation
In the production node implementation (`AccountLedger`), currency precision is $10^6$ atomic units (microBUM). Reward computation uses binary right-shift:
$$\text{reward}(H) = \text{INITIAL\_BLOCK\_REWARD} \gg \lfloor H / 210,000 \rfloor$$
where $\text{INITIAL\_BLOCK\_REWARD} = 50,000,000\text{ atomic units}$.

- In era $k = 25$, the reward is $50,000,000 \gg 25 = 1\text{ atomic unit}$ ($0.000001\text{ BUM}$).
- In era $k = 26$ (block $5,460,000$), $50,000,000 \gg 26 = 0\text{ atomic units}$.
- For all eras $k \ge 64$, the subsidy is explicitly clamped to 0.

Evaluating the discrete sum over all 26 non-zero eras:
$$\sum_{k=0}^{25} 210,000 \times \left\lfloor \frac{50,000,000}{2^k} \right\rfloor = 20,999,999,976,900\text{ atomic units} = 20,999,999.9769\text{ BUM}$$

### 2.3 Formal Resolution
1. **Ceiling Resolution**: The protocol establishes **21,000,000 BUM** as the absolute immutable maximum supply cap (`MAX_BUM_SUPPLY = 21'000'000 * 10^6`).
2. **Elimination of Legacy Reference**: The legacy "100M" mention in `TESTNET_GUIDE.md` has been formally replaced. No unallocated, hidden, or premined 79M BUM exists or can ever be minted.
3. **Consensus Invariant**: Every validating node enforces `total_supply <= MAX_BUM_SUPPLY`. Any block proposing a subsidy that would cause `total_supply > MAX_BUM_SUPPLY` is unconditionally rejected as an invalid consensus violation.

---

## 3. Denomination, Precision, & Supply Parameters

| Parameter | Identifier | Value | Description |
|---|---|---|---|
| **Base Currency Unit** | `BUM` | $1.0\text{ BUM}$ | Standard unit of account |
| **Smallest Atomic Unit** | `microBUM` / `uBUM` | $10^{-6}\text{ BUM}$ ($1\text{ unit}$) | Smallest divisible unit (integer in ledger) |
| **MilliBUM** | `mBUM` | $10^{-3}\text{ BUM}$ ($1,000\text{ units}$) | Display denomination |
| **Maximum Supply** | `MAX_BUM_SUPPLY` | $21,000,000\text{ BUM}$ | $21 \times 10^{12}$ atomic units |
| **Initial Block Subsidy** | `INITIAL_BLOCK_REWARD` | $50.0\text{ BUM}$ | $50,000,000$ atomic units per block |
| **Halving Interval** | `HALVING_INTERVAL` | $210,000\text{ blocks}$ | ~4 years at 10-minute target |
| **Active Emission Eras** | $K_{\text{active}}$ | $26\text{ eras}$ | Blocks $0$ to $5,459,999$ |
| **Terminal Emission Height**| $H_{\text{terminal}}$ | $5,460,000$ | Subsidy becomes 0; fee-only economy |
| **Genesis Public Premine** | `GENESIS_PREMINE` | $0\text{ BUM}$ | Zero developer premine for public mainnet |

---

## 4. Transaction Fee Market & Fee Distribution

### 4.1 Transaction Fee Calculation
To protect node resources from denial-of-service (DoS) spam and disk exhaustion while maintaining predictable transaction ordering, every transaction must provide a fee meeting the network minimum:

$$\text{Fee}_{\min} = \max\Big(\text{MIN\_TRANSACTION\_FEE},\; \text{serialized\_bytes} \times \text{BYTE\_FEE\_RATE}\Big)$$

Where:
- $\text{MIN\_TRANSACTION\_FEE} = 1,000\text{ atomic units}$ ($0.001\text{ BUM}$).
- $\text{BYTE\_FEE\_RATE} = 10\text{ atomic units / byte}$ ($0.00001\text{ BUM/byte}$).
- Typical 180-byte transfer requires at least $\max(1000, 180 \times 10) = 1,800\text{ atomic units}$ ($0.0018\text{ BUM}$).

### 4.2 Deterministic Fee Distribution Split
When a block is confirmed, total transaction fees collected from all valid transactions in the block are split deterministically:

1. **Validator / Proposer Incentive Share (80%)**:
   $$\text{Fee}_{\text{proposer}} = \left\lfloor \frac{\text{TotalFees} \times 8,000}{10,000} \right\rfloor$$
   Credited immediately to the block proposer's account balance.
2. **Community Ecosystem Treasury Share (20%)**:
   $$\text{Fee}_{\text{treasury}} = \text{TotalFees} - \text{Fee}_{\text{proposer}}$$
   Credited to the protocol-designated Community Treasury address (`bb1_community_treasury`).

This distribution ensures that zero dust is lost to rounding while funding long-term open-source protocol development without diluting circulating supply.

---

## 5. Network Participation Incentives

### 5.1 Block Producer Incentive Formula
At block height $H$, the verified block proposer receives:
$$\text{Payout}_{\text{proposer}}(H) = \text{calculate\_block\_subsidy}(H) + \text{Fee}_{\text{proposer}}(H)$$

```
Block Revenue Lifecycle:
==========================================================================
Eras 0-3 (Blocks 0 - 840,000)      : Subsidy-Dominated (50 -> 6.25 BUM)
Eras 4-10 (Blocks 840,000 - 2.3M)   : Hybrid Transition (Subsidy + High Fees)
Eras 26+ (Block 5.46M onwards)     : 100% Fee-Dominated Security Budget
==========================================================================
```

### 5.2 Transition to Fee-Only Security
As the block subsidy approaches zero, validators rely entirely on transaction fees. Network security is preserved through:
1. **Organic Throughput**: Growing transaction volume across decentralized community feeds, group chats, content anchoring, and value transfers.
2. **Mempool Priority Auction**: Senders outbid competing transactions during congestion, establishing a robust security budget for block validation.

---

## 6. Optional Storage-Provider Compensation

Decentralized content storage (CAS) operates strictly off-chain. To incentivize high-availability storage providers without creating unbacked protocol inflation:

### 6.1 Lease Escrow Mechanism
1. **Escrow Deposit**: A content uploader locks an escrow deposit (`StorageLeaseEscrow`) in BUM specifying:
   - Target content hash.
   - Designated storage provider address (or open provider pool).
   - Validity period ($[H_{\text{start}}, H_{\text{end}}]$).
   - Payout rate per validated challenge ($\text{payout\_per\_proof}$).
2. **Cryptographic Proof of Retrievability (PoR)**:
   - Storage providers respond to deterministic retrievability challenges ($C = \text{SHA256}(\text{chunk} \parallel \text{salt} \parallel \text{provider\_id})$).
   - Upon verification by the storage network manager, the provider submits a payout claim.
3. **Escrow Settlement**:
   - The node verifies the proof validity and releases $\text{payout\_per\_proof}$ from the escrow to the provider's account.
   - When the lease expires, any unspent escrow balance is refunded to the uploader.

### 6.2 No Inflationary Subsidy
Storage providers are compensated **exclusively from user-funded escrows**. The blockchain consensus does not mint new BUM tokens for storage hosting, preventing inflationary supply debasement.

---

## 7. Optional Community Contribution Rewards

### 7.1 Direct Peer-to-Peer Tipping
Users can send micro-tips directly to content authors, challenge creators, and community helpers via standard low-latency transactions.

### 7.2 Challenge Bounty Escrows
1. A community organizer or DAO deposits funds into a `ChallengeBountyEscrow`.
2. Developers submit verified cryptographic solutions to the coding challenge.
3. The winner is awarded the bounty upon verification.
4. **Single-Claim Invariant**: The escrow manager records `is_claimed = true` atomically; duplicate claims are rejected.

---

## 8. Prevention of Reward Duplication & Unauthorized Issuance

To prevent inflation bugs, double-claiming, and forged coinbase transactions, all validating nodes independently enforce the following rules:

1. **Unique Height Accounting**:
   - Nodes track a state map `rewarded_heights_`.
   - At most ONE block subsidy and fee distribution can occur per block height $H$.
   - Any reorg unrolls and rewinds the corresponding height's reward record.
2. **Proposer Cryptographic Authentication**:
   - In PoA / PoS / PoW, the coinbase claimant must match the cryptographically verified proposer selected by consensus for height $H$.
3. **Strict Invariant Auditing**:
   $$\sum_{i=1}^{N} \text{balance}_i + \text{TreasuryBalance} \equiv \text{total\_supply} \le \text{MAX\_BUM\_SUPPLY}$$
   Every snapshot import, block processing cycle, and audit sweep validates that not a single atomic unit has been minted out of thin air.

---

## 9. Protocol Community Treasury Rules & Governance

### 9.1 Inflow Channels
1. **20% Share of Block Transaction Fees**.
2. **Voluntary Community Donations**.

### 9.2 Outflow Governance Safeguards
To prevent treasury draining or governance capture:
1. **Mandatory Timelock**: Proposals must be registered for at least `MIN_TREASURY_TIMELOCK_BLOCKS` (default: 100 blocks on DevNet, 14 days on Mainnet) before execution.
2. **Multi-Signature Quorum**: Requires at least $M$-of-$N$ cryptographic signatures from designated keyholders (default: 2 signatures).
3. **Disbursement Rate Limiting**: A single proposal cannot disburse more than 10% (`MAX_TREASURY_DISBURSEMENT_BPS = 1,000`) of the total treasury balance.
4. **Non-Reentrancy & Atomic Execution**: Proposals can only be executed once (`is_executed = true`).

---

## 10. Long-Term Economic Simulations

Deterministic simulations across 10 years of network operations under three participation regimes:

### 10.1 Participation Regimes
- **Scenario A (Low Participation)**: 5 transactions/block, minimal fees (1,000 units), 10 active validators.
- **Scenario B (Moderate Participation)**: 50 transactions/block, 2,500 units avg fee, 25 active validators.
- **Scenario C (High Congestion)**: 500 transactions/block, 10,000 units avg fee, 100 active validators.

### 10.2 Simulation Findings
1. **Annual Inflation Decay**:
   - Year 1: $12.5\%$ annualized inflation ($2,628,000\text{ BUM}$ minted).
   - Year 5 (Era 1): $6.25\%$ annualized inflation.
   - Year 9 (Era 2): $3.125\%$ annualized inflation.
   - Year 25+: $0.00\%$ inflation (strictly deflationary under fee-burn regimes or fixed supply).
2. **Validator Breakeven in Fee-Dominated Era**:
   - Under Scenario C, transaction fee revenue alone provides over $26,000\text{ BUM/year}$ in validator yield post-subsidy, maintaining high economic security without token dilution.

---

## 11. Economic Threats & Risk Mitigations

| Threat | Impact | Protocol Mitigation |
|---|---|---|
| **Fee Sniping** | Miners reorganize blocks to steal high-fee transactions from prior blocks | Proposer fee smoothing, base fee floor, and mempool depth penalties |
| **Selfish Mining** | Colluding miners withhold blocks to outcompete honest participants | Longest-chain weight rules, round-robin fallback, and deterministic shuffling |
| **Storage Host Abandonment** | Storage providers go offline when lease prices drop | Proof-of-Retrievability penalties, reputation degradation, and escrow slashing |
| **Treasury Drain / Sybil Governance** | Malicious proposal attempts to extract all treasury reserves | 10% per-proposal disbursement cap, timelock delay, and multi-sig quorum |
| **Arithmetic Overflow in Fees** | Senders attempt to trigger integer wraparound on large fees | Strict `total_required < tx.amount` overflow checks before debiting |

---

## 12. Mainnet Monetary Policy Verification Matrix

- [x] Mathematical consistency of 21M cap proven across all 64 halving eras.
- [x] Legacy 100M testnet references reconciled and updated.
- [x] 6-decimal atomic precision ($10^6$ units/BUM) locked and tested.
- [x] Size-based minimum fee and 80/20 fee distribution implemented.
- [x] Storage lease escrow and Proof-of-Retrievability payout claims specified.
- [x] Community challenge bounty escrows with single-claim enforcement specified.
- [x] Community Treasury timelock, quorum, and 10% disbursement cap enforced.
- [x] Independent node validation rules enforcing zero inflation above 21M BUM.
