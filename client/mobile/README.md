# BlockBum Mobile Client (Android & iOS)

The BlockBum Mobile application brings decentralized messaging, community collaboration, and BUM cryptocurrency transfers to handheld devices across **Android** and **iOS**.

---

## 1. Core Capabilities & Architecture

- **Protocol Parity**: Shares identical Bech32 address derivation (`bb1...`), Ed25519 cryptographic signing, and transaction binary formatting as desktop and core node clients.
- **Lightweight Client (SPV) Mode**: Verifies block headers and Merkle inclusion proofs directly via node JSON-RPC 2.0 endpoints without downloading block histories.
- **Biometric Security**: Private keys and Double Ratchet state are sealed in hardware-backed storage (iOS Keychain via SecItem and Android KeyStore via EncryptedSharedPreferences).
- **Multi-Device Synchronization**: Quickly link your desktop and mobile identities via cryptographic QR code pairing.
- **Camera QR Scanner**: Scan recipient addresses and payment invoices instantly.

---

## 2. Directory Layout

```
client/mobile/
├── package.json         # React Native & Expo dependencies
├── app.json             # Mobile manifest & camera/biometric permissions
├── tsconfig.json        # TypeScript configuration
├── src/
│   ├── App.tsx          # Main touch navigation container & screens
│   ├── services/
│   │   ├── secureStore.ts # Hardware keystore abstraction
│   │   └── lightClient.ts # SPV header verification & fee estimation
└── README.md
```

---

## 3. Development & Build

### Run locally in simulator / Expo Go
```bash
cd client/mobile
npm install
npm run android   # Launch on Android emulator or connected device
npm run ios       # Launch on iOS simulator (macOS required)
```

### Reproducible Release Builds
```bash
# Android APK / AAB
npm run build:android

# iOS IPA
npm run build:ios
```
