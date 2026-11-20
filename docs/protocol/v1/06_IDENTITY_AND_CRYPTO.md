# BlockBum Protocol Specification — Chapter 06: Identity, Cryptography & Wallet Interoperability

**Protocol Version:** 1.0  
**Specification Document:** BB-SPEC-06  
**Status:** Normative  

---

## 1. Cryptographic Foundations

BlockBum relies strictly on modern, constant-time, high-security cryptographic primitives. Custom or unreviewed cryptographic algorithms are expressly prohibited.

| Purpose | Specification Standard | Implementation Parameter |
| :--- | :--- | :--- |
| **Transaction Signatures** | [RFC 8032](https://www.ietf.org/rfc/rfc8032.txt) (Ed25519) | Twisted Edwards curve over GF($2^{255}-19$), SHA-512 |
| **E2EE Key Agreement** | [RFC 7748](https://www.ietf.org/rfc/rfc7748.txt) (X25519) | Montgomery curve Diffie-Hellman scalar multiplication |
| **Authenticated Encryption** | [RFC 8439](https://www.ietf.org/rfc/rfc8439.txt) (ChaCha20-Poly1305) | 256-bit key, 128-bit MAC tag, 192-bit / 24-byte nonce |
| **Hashing & Commitments** | [NIST FIPS 180-4](https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.180-4.pdf) | SHA-256 (32 bytes / 256 bits) |

---

## 2. Address Format & Derivation Specification

BlockBum addresses provide human-readable, verifiable routing identifiers for accounts and messaging channels.

### 2.1 Address Encoding Specification
A BlockBum address is a 43-character alphanumeric string constructed according to the canonical rule:

$$\text{address} = \text{"bb1"} \mathbin{\Vert} \text{to\_hex}(\text{public\_key})[0..40]$$

where:
1. `"bb1"` is the constant 3-character protocol prefix designating BlockBum version 1.
2. `public_key` is the 32-byte Ed25519 public key.
3. `to_hex()` converts the 32 bytes into a 64-character lowercase hexadecimal string.
4. `[0..40]` extracts the leading 40 characters (representing the first 20 bytes of the public key).

### 2.2 Address Verification Invariant
Nodes and smart contracts MUST verify address ownership by validating:
$$\text{tx.sender} == \text{"bb1"} \mathbin{\Vert} \text{to\_hex}(\text{tx.sender\_pubkey})[0..40]$$
This prevents identity impersonation and protects unspent balances from forged sender fields.

---

## 3. Keypair Generation & Deterministic Seed Derivation

All keys in a BlockBum wallet are deterministically derived from a 32-byte cryptographic seed (256 bits of cryptographically secure pseudo-random entropy).

### 3.1 Keypair Derivation (RFC 8032)
Given a 32-byte seed $S$:
1. If $|S| \ge 32$, $S_{\text{eff}} = S[0..32]$. If $|S| < 32$, $S_{\text{eff}} = \text{SHA-256}(S)$.
2. Compute `crypto_ed25519_key_pair(secret_key, public_key, S_eff)`.
3. The resulting `secret_key` is 64 bytes (the 32-byte seed followed by the 32-byte derived public key, according to standard Ed25519 conventions).
4. The resulting `public_key` is 32 bytes.

### 3.2 Mnemonic Seed Backup
Wallets MUST allow users to export and recover their 32-byte seed using:
- **Hexadecimal String:** 64 lowercase hexadecimal characters.
- **BIP-39 Mnemonic:** 24 standard English dictionary words mapping to 256 bits of entropy.

---

## 4. End-to-End Encrypted (E2EE) Messaging Protocol

BlockBum includes native support for private off-chain and on-chain messaging between user identities without relying on centralized intermediaries.

### 4.1 Key Agreement: X25519 from Ed25519 Identities
To allow users to establish end-to-end encryption using their standard transaction identities, nodes convert Ed25519 keys to X25519 (Curve25519) keys:

1. **Peer Public Key Conversion:**  
   The recipient's 32-byte Ed25519 public key $P_{\text{Ed}}$ is converted to its Montgomery counterpart $P_X$ via birational equivalence (`crypto_eddsa_to_x25519`):
   $$u = \frac{1 + y}{1 - y} \pmod{2^{255} - 19}$$

2. **Private Scalar Derivation:**  
   The sender hashes their 32-byte secret seed with SHA-512:
   $$H = \text{SHA-512}(S_{\text{priv}})[0..32]$$
   and clamps the 32-byte scalar according to RFC 7748:
   $$H[0] \leftarrow H[0] \mathbin{\&} 248;\quad H[31] \leftarrow H[31] \mathbin{\&} 127;\quad H[31] \leftarrow H[31] \mathbin{|} 64;$$

3. **Diffie-Hellman Shared Secret:**  
   The raw shared secret is computed using X25519 scalar multiplication:
   $$K_{\text{raw}} = \text{X25519}(H, P_X)$$

4. **Key Derivation Function (KDF):**  
   To ensure uniform entropy distribution across all 256 bits:
   $$K_{\text{session}} = \text{SHA-256}(K_{\text{raw}})$$

### 4.2 Authenticated Encryption (ChaCha20-Poly1305)
Messages are encrypted using `crypto_aead_lock`:
- **Key:** 32-byte $K_{\text{session}}$
- **Nonce (24 bytes):**
  - Bytes 0..7: 64-bit integer message nonce (Little-Endian).
  - Bytes 8..23: 16-byte protocol domain tag `"BLOCKBUM_AEAD_1"`.
- **Output:** Ciphertext concatenated with a 16-byte Poly1305 authentication MAC tag.

---

## 5. Standard Keystore File Format (JSON Schema)

Wallets persisting identity keys to local disk MUST serialize keystore files conforming to this interoperable JSON schema:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "BlockBumKeystoreIdentity",
  "type": "object",
  "required": ["alias", "address", "public_key", "created_at", "crypto"],
  "properties": {
    "alias": { "type": "string" },
    "address": { "type": "string", "pattern": "^bb1[0-9a-f]{40}$" },
    "public_key": { "type": "string", "pattern": "^[0-9a-f]{64}$" },
    "created_at": { "type": "integer" },
    "crypto": {
      "type": "object",
      "required": ["cipher", "ciphertext", "kdf", "salt"],
      "properties": {
        "cipher": { "type": "string", "enum": ["chacha20-poly1305"] },
        "ciphertext": { "type": "string" },
        "kdf": { "type": "string", "enum": ["argon2id", "scrypt"] },
        "salt": { "type": "string" }
      }
    }
  }
}
```
