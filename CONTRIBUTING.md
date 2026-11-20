# Contributing to BlockBum

Thank you for your interest in contributing to **BlockBum**, a global decentralized P2P communication and content blockchain protocol.

This document provides guidelines for contributing code, reporting bugs, submitting BlockBum Improvement Proposals (BBIPs), and maintaining cross-platform software quality.

---

## 1. Development & Contribution Workflow

### 1.1 Branch Strategy
- `main`: Production-ready branch. All commits must pass 100% of the GitHub Actions CI matrix.
- `feat/<topic>`: Feature branches.
- `fix/<issue>`: Bugfix branches.
- `docs/<topic>`: Documentation and specification updates.

### 1.2 Commit Conventions
We follow the [Conventional Commits](https://www.conventionalcommits.org/) standard:
```
<type>(<scope>): <short description>

[optional body]
[optional footer]
```
Common types:
- `feat`: A new feature or subsystem implementation.
- `fix`: A bug fix or invariant correction.
- `docs`: Documentation, BBIP, or specification changes.
- `test`: Adding or updating test cases.
- `refactor`: Code reorganization with no functional change.

---

## 2. Coding Standards & Tooling

1. **C++ Standard**: Strictly C++20 (`set(CMAKE_CXX_STANDARD 20)`).
2. **Deterministic Cryptography**:
   - Use established, audited primitives only (Monocypher, Ed25519, X25519, ChaCha20-Poly1305, SHA-256).
   - Never implement custom unreviewed ciphers.
3. **Compiler Warnings & Quality**:
   - Code must compile with `-Wall -Wextra -Wpedantic -Wconversion -Wsign-conversion` without warnings.
   - All tests must pass cleanly under **AddressSanitizer (ASan)** and **UndefinedBehaviorSanitizer (UBSan)** with zero memory leaks.
4. **Platform Compatibility**:
   - Every pull request must build and pass unit tests across all 4 environments:
     - `Ubuntu 24.04 (GCC-14)`
     - `Ubuntu 24.04 (Clang-18)`
     - `Ubuntu 24.04 (Clang-18 with ASan & UBSan)`
     - `Windows Latest (MSVC)`

---

## 3. BlockBum Improvement Proposals (BBIP)

Any consensus rule change, wire protocol modification, or cryptographic upgrade must follow the **BBIP Process**:
1. Read the guidelines in [docs/bips/BBIP-0001.md](docs/bips/BBIP-0001.md).
2. Copy the template from [docs/bips/bbip-template.md](docs/bips/bbip-template.md).
3. Submit a pull request to the `docs/bips/` directory with title `BBIP: <Title>`.
4. Engage with community feedback during the mandatory 14-day Last Call period.

---

## 4. Responsible Vulnerability Disclosure

If you discover a security vulnerability or exploit vector affecting BlockBum core consensus, cryptography, or networking:
- **Do NOT** open a public issue.
- Email `security@blockbum.net` with encrypted details and proof-of-concept steps.
- The Core Security Council will acknowledge receipt within 24 hours and coordinate triage under the Emergency Security Policy defined in [docs/GOVERNANCE.md](docs/GOVERNANCE.md).
