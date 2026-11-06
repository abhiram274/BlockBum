# BlockBum Desktop Application

This directory hosts the cross-platform desktop application for BlockBum Network, built with **Tauri**, **React**, and **TypeScript**.

## Architecture & Communication
The desktop application acts as a rich client interacting with the C++ BlockBum node daemon via:
1. **Local REST API**: For transactional queries, balance lookups, block inspection, and transaction submission.
2. **WebSocket Feed**: For real-time notifications on mined blocks, incoming payments, and peer messaging events.

## Planned Implementation (Phase 7)
- Secure Keystore & Seed Phrase Management
- P2P Community Feed & Content Publishing
- End-to-end Encrypted Direct & Group Messaging
- Node Status, Peer Monitor, and Block Explorer
