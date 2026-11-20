import * as crypto from 'node:crypto';

export function sha256(data: Uint8Array | string): Uint8Array {
  const hash = crypto.createHash('sha256');
  hash.update(data);
  return new Uint8Array(hash.digest());
}

export function toHex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('hex');
}

export function fromHex(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') || hex.startsWith('0X') ? hex.slice(2) : hex;
  return new Uint8Array(Buffer.from(clean, 'hex'));
}

export function deriveAddress(publicKey: Uint8Array): string {
  const hex = toHex(publicKey);
  return 'bb1' + hex.slice(0, 40);
}

export function validateAddress(address: string): boolean {
  if (!address.startsWith('bb1')) return false;
  if (address.length < 10 || address.length > 64) return false;
  const body = address.slice(3);
  return /^[0-9a-z]+$/.test(body);
}

export function calculateMinimumFee(payloadSizeBytes: number, byteFeeRate = 10): number {
  const MIN_FEE = 1000;
  const sizeFee = (180 + payloadSizeBytes) * byteFeeRate;
  return Math.max(MIN_FEE, sizeFee);
}
