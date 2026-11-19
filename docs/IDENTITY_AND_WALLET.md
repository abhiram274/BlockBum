# BlockBum Cryptographic Identity & Wallet Architecture

This document describes the identity design, key management, threat analysis, recovery mechanisms, and secure local storage guarantees in the **BlockBum Network**.

---

## 1. Identity Primitives & Key Management

* **Cryptographic Foundation**: Standard public-key cryptography (Ed25519-compatible curve/Schnorr digital signatures).
* **KeyPair**:
  * **Private / Secret Key** (`64 bytes`): 32 bytes scalar entropy + 32 bytes derived public key.
  * **Public Key** (`32 bytes`): Canonical point representation.
  * **Address**: Pseudonymous human-readable identifier prefixed with `bb1` derived from the public key hash.

### 1.1 Local Key Storage Guarantees
1. **Never Transmitted Over Network**:
   - The node daemon and P2P wire protocol (`wire_protocol.hpp`) explicitly do not contain messages or fields for private keys.
   - Only public keys (`sender_pubkey`), addresses, and cryptographic signatures (`signature`) are broadcast.
2. **Local Keystore**:
   - Keys are persisted in a dedicated local directory (`data/wallet/<alias>.wallet`) using deterministic binary encoding.
   - Operating system file-access controls restrict read permissions to the local running user.

---

## 2. Key Compromise & Identity Recovery

### 2.1 Deterministic Identity Recovery
* Users can export a 32-byte hexadecimal recovery phrase (`wallet-export <alias>`).
* In Phase 4/5, this will be mapped to standard BIP-39 mnemonic wordlists (12/24 words) using PBKDF2 / Argon2id key stretching.
* The recovery phrase deterministically recreates the exact secret key and derived public address on any new device.

### 2.2 Key Compromise Handling
* In a decentralized blockchain without central account recovery, key compromise must be addressed at the protocol and state levels:
  1. **Key Rotation Transactions**: Allow an identity to sign an on-chain message attesting that address $A$ has been superseded by new address $B$.
  2. **Subkey Delegation & Scoped Sessions**: The master identity key stays offline or in secure hardware; short-lived session keys sign community messages and social feed posts.
  3. **Social Recovery / Multi-Sig Guard**: Future transition to threshold signatures (e.g. 3-of-5 trusted guardians) for high-value identities.

---

## 3. Threat Model & Security Mitigations

| Threat | Risk Description | BlockBum Mitigation |
|---|---|---|
| **Eavesdropping / Packet Sniffing** | Attacker monitors TCP traffic to capture identity credentials. | Private keys are strictly local. Network packets carry only signatures and public keys. |
| **Transaction Replay Attack** | Re-broadcasting a valid signed transaction to repeat actions. | Transactions include a strictly monotonically increasing `nonce` and block hash bindings. |
| **Signature Forgery** | Submitting transactions with tampered payloads or fabricated signatures. | Full verification `verify(data_to_sign, signature, sender_pubkey)` rejects tampered payloads or mismatched keys. |
| **Keystore Theft** | Physical or malware access to the device hard drive. | Local directory permissions; migration path to OS Keychain / DPAPI / Secure Enclave encrypted vaults. |

---

## 4. Wallet CLI Reference

| Command | Syntax | Description |
|---|---|---|
| `wallet-create` | `blockbum_node wallet-create <alias>` | Generates a new pseudonymous keypair and stores in local wallet. |
| `wallet-list` | `blockbum_node wallet-list` | Lists all stored aliases, pseudonymous addresses, and public keys. |
| `wallet-export` | `blockbum_node wallet-export <alias>` | Outputs the secret recovery phrase for offline backup. |
| `wallet-recover` | `blockbum_node wallet-recover <alias> <phrase>` | Reconstructs an identity keypair from its backup phrase. |
