# Contributing to BlockBum

Thank you for your interest in contributing to **BlockBum Network**!

## Code Style & Standards

* **C++ Standard**: C++20 (`cxx_std_20`). Use modern features (`concepts`, `std::span`, `std::string_view`, ranges, structured binding).
* **Naming Conventions**:
  * Classes / Structs / Concepts: `PascalCase` (e.g. `IStorageEngine`, `BlockHeader`).
  * Functions / Methods / Variables: `snake_case` (e.g. `compute_merkle_root()`, `block_height`).
  * Constants / Enums: `SCREAMING_SNAKE_CASE` or scoped enum `PascalCase`.
  * Interfaces: Prefixed with `I` (e.g. `ICryptoEngine`).
* **Formatting**: Format code with `clang-format` using standard Google/LLVM style.
* **Header Guards**: Use `#pragma once`.

## Pull Request Guidelines

1. **Test-Driven Changes**: Every bug fix or new feature must include corresponding GoogleTest unit tests under `tests/unit/`.
2. **Clean Builds**: Code must compile without warnings across GCC, Clang, and MSVC (`BLOCKBUM_WARNINGS_AS_ERRORS=ON`).
3. **Commit Messages**: Follow Conventional Commits format:
   * `feat(core): implement merkle root calculation`
   * `fix(crypto): prevent potential signature replay`
   * `docs: update setup instructions for Fedora`
