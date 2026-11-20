import * as crypto from 'node:crypto';
import { deriveAddress, toHex, fromHex, validateAddress } from './crypto.js';

export interface WalletIdentity {
  alias: string;
  address: string;
  publicKey: Uint8Array;
  privateKey: Uint8Array;
  mnemonic?: string;
}

export class Wallet {
  private identities: Map<string, WalletIdentity> = new Map();

  /**
   * Generate a fresh pseudonymous Ed25519 identity keypair
   */
  public createIdentity(alias = 'default'): WalletIdentity {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
    const pubRaw = new Uint8Array(publicKey.export({ type: 'spki', format: 'der' }).subarray(-32));
    const privRaw = new Uint8Array(privateKey.export({ type: 'pkcs8', format: 'der' }).subarray(-32));

    const address = deriveAddress(pubRaw);
    const id: WalletIdentity = {
      alias,
      address,
      publicKey: pubRaw,
      privateKey: privRaw
    };

    this.identities.set(alias, id);
    return id;
  }

  /**
   * Import an existing identity from private key bytes or hex
   */
  public importIdentity(alias: string, privateKeyInput: Uint8Array | string): WalletIdentity {
    const privRaw = typeof privateKeyInput === 'string' ? fromHex(privateKeyInput) : privateKeyInput;
    // Derive Ed25519 public key from private key
    const privKeyObj = crypto.createPrivateKey({
      key: Buffer.concat([
        Buffer.from('302e020100300506032b657004220420', 'hex'),
        Buffer.from(privRaw)
      ]),
      format: 'der',
      type: 'pkcs8'
    });

    const pubKeyObj = crypto.createPublicKey(privKeyObj);
    const pubRaw = new Uint8Array(pubKeyObj.export({ type: 'spki', format: 'der' }).subarray(-32));
    const address = deriveAddress(pubRaw);

    const id: WalletIdentity = {
      alias,
      address,
      publicKey: pubRaw,
      privateKey: privRaw
    };

    this.identities.set(alias, id);
    return id;
  }

  public getIdentity(alias: string): WalletIdentity | undefined {
    return this.identities.get(alias);
  }

  public listIdentities(): WalletIdentity[] {
    return Array.from(this.identities.values());
  }

  public static isValidAddress(address: string): boolean {
    return validateAddress(address);
  }
}
