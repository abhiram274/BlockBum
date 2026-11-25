# BlockBum Reproducible Builds & Release Verification Specification

This document provides complete instructions for independent third parties, auditors, and developers to reproduce and cryptographically verify BlockBum cross-platform release artifacts bit-for-bit.

---

## 1. Guiding Principles

1. **Deterministic Binaries**: Build environments pin compilers, dependencies, and environment timestamps (`SOURCE_DATE_EPOCH`) to eliminate non-deterministic build variances.
2. **Ed25519 Cryptographic Signatures**: Every release manifest (`release/update.json`) is signed with the BlockBum Core Security Guild release key.
3. **Zero Frontend Consensus Logic**: All desktop, mobile, and browser clients communicate strictly with the C++ node layer using standardized JSON-RPC 2.0 / REST protocols; clients never implement diverging consensus validation.

---

## 2. Release Artifacts & Platforms

| Platform | Target File | Package Format | Security Features |
| :--- | :--- | :--- | :--- |
| **Windows** | `BlockBum-Setup-0.2.0.msi` | MSI / NSIS | Authenticode, ASLR, DEP, SmartScreen |
| **Windows Portable** | `BlockBum-0.2.0-portable.exe` | Portable Executable | Zero-install, encrypted local vault |
| **Linux Universal** | `BlockBum-0.2.0.AppImage` | AppImage | Sandboxed, musl/glibc deterministic |
| **Linux Debian** | `blockbum_0.2.0_amd64.deb` | Debian Archive | systemd integration, dpkg checksums |
| **macOS Universal** | `BlockBum-0.2.0.dmg` | Apple Disk Image | Hardened Runtime, Gatekeeper signed |
| **Android** | `blockbum-0.2.0.apk` | Android APK/AAB | Android KeyStore, Biometric prompt |
| **iOS** | `blockbum-0.2.0.ipa` | iOS Archive | iOS Keychain SecItem, Face ID |

---

## 3. Independent Verification Procedure

### Step 1: Download Release Manifest & Signature
```bash
curl -O https://releases.blockbum.net/v0.2.0/update.json
```

### Step 2: Verify Binary Checksum
Compute the SHA-256 hash of your downloaded binary and compare against `update.json`:
```bash
# On Linux / macOS
sha256sum BlockBum-Setup-0.2.0.msi

# On Windows PowerShell
Get-FileHash BlockBum-Setup-0.2.0.msi -Algorithm SHA256
```

### Step 3: Verify Release Authority Signature
Verify the Ed25519 signature of the manifest using the public key:
- **Public Key**: `d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a`
- Verification Tool:
```bash
python scripts/release/sign_release.py --verify release/update.json
```

---

## 4. Multi-Platform Build Commands

```bash
# Full automated pipeline
python scripts/release/build_release.py

# Desktop (Windows, Linux, macOS)
cd client/desktop && npm run build

# Browser Web Portal
cd client/web && npm run build

# Mobile (Android & iOS)
cd client/mobile && npm run build:android
```
