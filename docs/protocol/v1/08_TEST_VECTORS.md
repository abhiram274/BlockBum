# BlockBum Protocol Specification — Chapter 08: Test Vectors & Reference Conformance

**Protocol Version:** 1.0  
**Specification Document:** BB-SPEC-08  
**Status:** Normative  

---

## 1. Conformance Verification Overview

This document provides canonical, byte-for-byte deterministic test vectors for all core data structures, serialization formats, cryptographic commitments, wire message frames, and address derivations.

An independent node implementation MUST verify that its output matches these exact hexadecimal strings. Conformance ensures full consensus compatibility without divergence.

---

## 2. Binary Serialization Primitives

### 2.1 Primitive Integer Encodings (Little-Endian)

| Type | Input Value | Canonical Hex Serialization |
| :--- | :--- | :--- |
| `uint8_t` | `0x42` | `42` |
| `uint16_t` | `0x1234` | `3412` |
| `uint32_t` | `0xdeadbeef` | `efbeadde` |
| `uint64_t` | `0x0102030405060708` | `0807060504030201` |

### 2.2 Dynamic Fields (Length-Prefixed)

| Type | Input Value | Canonical Hex Serialization |
| :--- | :--- | :--- |
| `string` | `"BlockBum"` | `08000000426c6f636b42756d` |
| `bytes` | `0xaabbcc` (3 bytes) | `03000000aabbcc` |

*Explanation:* `08000000` is `uint32_t` length prefix 8 in little-endian, followed by ASCII bytes for `"BlockBum"`.

---

## 3. Cryptographic Address Derivation Vector

Given the 32-byte Ed25519 public key:
```
d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a
```

- **Prefix:** `"bb1"`
- **Leading 40 Hex Characters:** `d75a980182b10ab7d54bfed3c964073a0ee172f3`
- **Derived Address:**
```
bb1d75a980182b10ab7d54bfed3c964073a0ee172f3
```

---

## 4. Merkle Tree Root Computation Vectors

### 4.1 Empty Leaf Set
- **Input:** `[]` (0 leaves)
- **Merkle Root:**
```
0000000000000000000000000000000000000000000000000000000000000000
```

### 4.2 Single Leaf Set
- **Input:** `[H1]` where $H_1 = \text{SHA-256}(\text{"tx1"})$
```
709b55bd3da0f5a838125bd0ee20c5bfdd7caba173912d4281cae816b79a201b
```
- **Merkle Root:** Matches $H_1$ exactly:
```
709b55bd3da0f5a838125bd0ee20c5bfdd7caba173912d4281cae816b79a201b
```

### 4.3 Two Leaf Set
- **Input:**
  - $H_1 = \text{SHA-256}(\text{"tx1"}) =$ `709b55bd3da0f5a838125bd0ee20c5bfdd7caba173912d4281cae816b79a201b`
  - $H_2 = \text{SHA-256}(\text{"tx2"}) =$ `27ca64c092a959c7edc525ed45e845b1de6a7590d173fd2fad9133c8a779a1e3`
- **Computation:** $\text{SHA-256}(H_1 \mathbin{\Vert} H_2)$
- **Merkle Root:**
```
bbea820f07f7f89aeea1ab4a354ecea39f2f72accd05c64371522ee371cd0c48
```

---

## 5. BlockHeader Serialization & Hash Vector

### 5.1 Input Fields
- `version`: `1` (`uint32`)
- `height`: `10` (`uint64`)
- `previous_hash`: 32 bytes of `0x11`
- `merkle_root`: 32 bytes of `0x22`
- `timestamp`: `1700000000` (`uint64`)
- `nonce`: `42` (`uint64`)

### 5.2 Serialized Header (92 Bytes)
```
010000000a000000000000001111111111111111111111111111111111111111111111111111111111111111222222222222222222222222222222222222222222222222222222222222222200f15365000000002a00000000000000
```

### 5.3 Computed Block Hash
$$\text{block\_hash} = \text{SHA-256}(\text{Serialized Header})$$
```
7318e57793f3fa1bf9d7153c86d8cb9b1ac8aa0246f3852480fecb701e159e0b
```

---

## 6. Transaction Pre-Image (`serialize_for_id`) & `tx_id` Vector

### 6.1 Input Fields
- `version`: `1` (`uint32`)
- `sender`: `"bb1sender"`
- `recipient`: `"bb1recipient"`
- `amount`: `5000000` (5.0 BUM)
- `fee`: `1000` (0.001 BUM)
- `nonce`: `1`
- `payload`: ASCII `"hello"` (`0x68656c6c6f`)
- `timestamp`: `1700000000`
- `sender_pubkey`: 32 bytes of `0x00`

### 6.2 Serialized Pre-Image (110 Bytes)
```
010000000900000062623173656e6465720c000000626231726563697069656e74404b4c0000000000e80300000000000001000000000000000500000068656c6c6f00f1536500000000200000000000000000000000000000000000000000000000000000000000000000000000
```

### 6.3 Computed Transaction ID (`tx_id`)
$$\text{tx\_id} = \text{SHA-256}(\text{Serialized Pre-Image})$$
```
2b2b0a67e2841acac6a67df13bc360878891401065798827a1def21663ec5515
```

---

## 7. Network Wire Header Framing Vector

### 7.1 Input Parameters
- `magic`: `0x4D554242` (`"BBUM"`)
- `version`: `1`
- `type`: `MessageType::Ping` (`1`)
- `payload_size`: `0`

### 7.2 Serialized Header (13 Bytes)
```
4242554d010000000100000000
```
