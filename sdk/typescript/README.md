# @blockbum/sdk

Official TypeScript & JavaScript Developer SDK for the **BlockBum Decentralized P2P Network and Blockchain**.

## Features
- **Keypair & Wallet Management**: Secure Ed25519 identity generation, Bech32-style `bb1` address derivation.
- **Node Communication**: Type-safe REST and JSON-RPC 2.0 clients for querying blocks, transactions, and account state.
- **Transaction Assembly**: Dynamic size-based fee estimation and transaction signing.
- **Developer Faucet**: One-click rate-limited testnet token dispenser.
- **Zero-Trust Privacy**: Private messaging payloads remain strictly confidential.

## Installation
```bash
npm install @blockbum/sdk
```

## Quick Start

```typescript
import { BlockBumClient, Wallet } from '@blockbum/sdk';

async function main() {
  // 1. Initialize Client
  const client = new BlockBumClient('http://localhost:9000');

  // 2. Query Node Info
  const nodeInfo = await client.getNodeInfo();
  console.log(`Connected to ${nodeInfo.network} at height #${nodeInfo.current_height}`);

  // 3. Create Developer Identity
  const wallet = new Wallet();
  const identity = wallet.createIdentity('alice');
  console.log(`Created wallet address: ${identity.address}`);

  // 4. Request Testnet Tokens from Faucet
  const faucetRes = await client.requestFaucet(identity.address);
  console.log(`Faucet dispensed ${faucetRes.amount_bum} tBUM (Tx: ${faucetRes.tx_id})`);

  // 5. Inspect Account Balance
  const account = await client.getAccount(identity.address);
  console.log(`Balance: ${account.balance_bum} tBUM (${account.balance_atomic} atomic units)`);
}

main().catch(console.error);
```
