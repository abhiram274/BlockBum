/**
 * BlockBum TypeScript SDK Example:
 * Demonstrates identity creation, faucet token acquisition, and balance inspection.
 */

import { BlockBumClient, Wallet } from '../../sdk/typescript/src/index.js';

async function main() {
  console.log('=== BlockBum TypeScript Integration Example ===');

  const client = new BlockBumClient('http://localhost:8080');
  const wallet = new Wallet();

  // 1. Generate identity for Alice
  const alice = wallet.createIdentity('alice');
  console.log(`[1] Created Alice identity: ${alice.address}`);

  // 2. Query initial balance
  try {
    const accBefore = await client.getAccount(alice.address);
    console.log(`[2] Initial Balance: ${accBefore.balance_bum} tBUM`);
  } catch (err) {
    console.log('[2] Account has no balance yet (uninitialized in ledger)');
  }

  // 3. Request testnet tokens from faucet
  console.log('[3] Requesting 10 tBUM from Testnet Faucet...');
  try {
    const faucet = await client.requestFaucet(alice.address);
    console.log(`    Success! Dispensed: ${faucet.amount_bum} tBUM | Tx ID: ${faucet.tx_id}`);
  } catch (err) {
    console.log(`    Faucet notice: ${(err as Error).message}`);
  }

  // 4. Estimate transaction fee
  const feeEstimate = client.estimateFee(100);
  console.log(`[4] Estimated fee for 100-byte transfer: ${feeEstimate} atomic units`);
}

main().catch(console.error);
