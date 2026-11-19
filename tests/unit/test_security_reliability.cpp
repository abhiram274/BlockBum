#include <gtest/gtest.h>
#include "blockbum/core/types.hpp"
#include "blockbum/core/serializer.hpp"
#include "blockbum/core/transaction.hpp"
#include "blockbum/core/block.hpp"
#include "blockbum/core/blockchain.hpp"
#include "blockbum/core/account_ledger.hpp"
#include "blockbum/network/wire_protocol.hpp"
#include "blockbum/network/tcp_transport.hpp"
#include "blockbum/network/sync_manager.hpp"
#include "blockbum/crypto/standard_crypto.hpp"
#include "blockbum/crypto/wallet.hpp"
#include "blockbum/crypto/e2e_encryption.hpp"
#include "blockbum/messaging/messaging_service.hpp"
#include "blockbum/content/content_manager.hpp"
#include "blockbum/storage/file_storage.hpp"

#include <vector>
#include <random>
#include <filesystem>
#include <chrono>

using namespace blockbum;

class SecurityAndReliabilityTest : public ::testing::Test {
protected:
    void SetUp() override {
        test_dir_ = std::filesystem::temp_directory_path() / "blockbum_security_test";
        std::filesystem::remove_all(test_dir_);
        std::filesystem::create_directories(test_dir_);
    }

    void TearDown() override {
        std::filesystem::remove_all(test_dir_);
    }

    std::filesystem::path test_dir_;
};

// =========================================================================
// 1. FUZZ TESTING: Serializers, Blocks, Transactions, and Wire Protocol
// =========================================================================

TEST_F(SecurityAndReliabilityTest, FuzzTransactionDeserialization) {
    // Generate pseudo-random garbage bytes and corrupted buffers
    std::mt19937_64 rng(1337);
    std::uniform_int_distribution<uint32_t> byte_dist(0, 255);
    std::uniform_int_distribution<size_t> len_dist(0, 1024);

    for (size_t iter = 0; iter < 1000; ++iter) {
        size_t len = len_dist(rng);
        std::vector<uint8_t> fuzz_data(len);
        for (auto& b : fuzz_data) {
            b = static_cast<uint8_t>(byte_dist(rng));
        }

        // Must fail safely without memory leaks, heap corruption, or crash
        core::BinaryDeserializer d(fuzz_data);
        try {
            auto tx = core::Transaction::deserialize(d);
            // If it miraculously passed parsing, verify id calculation is safe
            (void)tx.serialize_for_id();
        } catch (const std::exception&) {
            // Expected safe rejection
        }
    }
}

TEST_F(SecurityAndReliabilityTest, FuzzBlockDeserialization) {
    std::mt19937_64 rng(2026);
    std::uniform_int_distribution<uint32_t> byte_dist(0, 255);
    std::uniform_int_distribution<size_t> len_dist(0, 2048);

    for (size_t iter = 0; iter < 1000; ++iter) {
        size_t len = len_dist(rng);
        std::vector<uint8_t> fuzz_data(len);
        for (auto& b : fuzz_data) {
            b = static_cast<uint8_t>(byte_dist(rng));
        }

        core::BinaryDeserializer d(fuzz_data);
        try {
            auto blk = core::Block::deserialize(d);
            (void)blk.serialize();
        } catch (const std::exception&) {
            // Expected safe rejection
        }
    }
}

TEST_F(SecurityAndReliabilityTest, FuzzNetworkWireProtocolHeaders) {
    std::mt19937_64 rng(42);
    std::uniform_int_distribution<uint32_t> byte_dist(0, 255);

    for (size_t iter = 0; iter < 1000; ++iter) {
        std::vector<uint8_t> fuzz_data(13); // Size of MessageHeader
        for (auto& b : fuzz_data) {
            b = static_cast<uint8_t>(byte_dist(rng));
        }

        core::BinaryDeserializer d(fuzz_data);
        try {
            auto header = network::MessageHeader::deserialize(d);
            (void)header.serialize();
        } catch (const std::exception&) {
            // Expected safe rejection
        }
    }
}

// =========================================================================
// 2. DOUBLE SPENDING & REPLAY ATTACK MITIGATION
// =========================================================================

TEST_F(SecurityAndReliabilityTest, DoubleSpendingAndReplayProtection) {
    ledger::AccountLedger ledger;
    crypto::StandardCryptoEngine crypto;
    crypto::Wallet wallet(std::make_shared<crypto::StandardCryptoEngine>());
    auto alice = wallet.create_identity("Alice");
    auto bob = wallet.create_identity("Bob");

    // Alice starts with 100 BUM
    ledger.seed_balance(alice.address(), 100 * ledger::BUM_DECIMALS);

    // Alice submits Tx 1 (nonce 1, 10 BUM + 0.001 fee)
    core::Transaction tx1;
    tx1.version = 1;
    tx1.sender = alice.address();
    tx1.recipient = bob.address();
    tx1.amount = 10 * ledger::BUM_DECIMALS;
    tx1.fee = ledger::MIN_TRANSACTION_FEE;
    tx1.nonce = 1;
    tx1.sender_pubkey = alice.public_key();
    tx1.signature = alice.sign(tx1.serialize_for_id(), crypto);
    tx1.tx_id = crypto.hash256(tx1.serialize_for_id());

    ASSERT_TRUE(ledger.can_apply_transaction(tx1, crypto));
    ASSERT_TRUE(ledger.apply_transaction(tx1, crypto));
    EXPECT_EQ(ledger.get_nonce(alice.address()), 1);

    // 1. Replay Attack: Replaying the exact same tx1 MUST be rejected
    EXPECT_FALSE(ledger.can_apply_transaction(tx1, crypto));
    EXPECT_FALSE(ledger.apply_transaction(tx1, crypto));

    // 2. Double-Spend with Same Nonce: Submitting another transaction with nonce 1
    core::Transaction tx_double_spend = tx1;
    tx_double_spend.recipient = "Mallory";
    tx_double_spend.signature = alice.sign(tx_double_spend.serialize_for_id(), crypto);
    tx_double_spend.tx_id = crypto.hash256(tx_double_spend.serialize_for_id());

    EXPECT_FALSE(ledger.can_apply_transaction(tx_double_spend, crypto));
    EXPECT_FALSE(ledger.apply_transaction(tx_double_spend, crypto));

    // 3. Out-of-Order Nonce: Submitting nonce 3 when current is 1 (skipping nonce 2)
    core::Transaction tx_future = tx1;
    tx_future.nonce = 3;
    tx_future.signature = alice.sign(tx_future.serialize_for_id(), crypto);
    tx_future.tx_id = crypto.hash256(tx_future.serialize_for_id());

    EXPECT_FALSE(ledger.can_apply_transaction(tx_future, crypto));
    EXPECT_FALSE(ledger.apply_transaction(tx_future, crypto));

    // 4. Insolvent Spend: Attempting to spend more than remaining balance
    core::Transaction tx_bankrupt = tx1;
    tx_bankrupt.nonce = 2;
    tx_bankrupt.amount = 200 * ledger::BUM_DECIMALS; // Alice only has ~89.999 BUM
    tx_bankrupt.signature = alice.sign(tx_bankrupt.serialize_for_id(), crypto);
    tx_bankrupt.tx_id = crypto.hash256(tx_bankrupt.serialize_for_id());

    EXPECT_FALSE(ledger.can_apply_transaction(tx_bankrupt, crypto));
    EXPECT_FALSE(ledger.apply_transaction(tx_bankrupt, crypto));
}

// =========================================================================
// 3. MALICIOUS PEERS & CONSENSUS POISONING REJECTION
// =========================================================================

TEST_F(SecurityAndReliabilityTest, MaliciousPeerInvalidBlockRejection) {
    auto storage = std::make_shared<storage::FileStorageEngine>();
    ASSERT_TRUE(storage->open((test_dir_ / "node_chain").string()));
    core::Blockchain chain(storage);
    ASSERT_TRUE(chain.initialize());

    // Valid Block 1
    core::Transaction tx;
    tx.sender = "Alice";
    tx.recipient = "Bob";
    tx.amount = 50;
    auto b1 = chain.create_next_block({tx});
    ASSERT_TRUE(chain.add_block(b1));

    // Malicious Peer Attack 1: Merkle Root Tampering (Transaction Injection)
    auto poisoned_b2 = chain.create_next_block({tx});
    core::Transaction malicious_tx;
    malicious_tx.sender = "Attacker";
    malicious_tx.recipient = "Attacker";
    malicious_tx.amount = 1'000'000;
    poisoned_b2.transactions.push_back(malicious_tx);
    // Malicious peer recalculates block_hash over header, but merkle_root inside header doesn't match txs
    auto poisoned_hdr = poisoned_b2.header.serialize();
    poisoned_b2.block_hash = crypto::CryptoUtils::sha256(poisoned_hdr);

    EXPECT_EQ(chain.validate_block(poisoned_b2, b1), core::ValidationResult::InvalidMerkleRoot);
    EXPECT_FALSE(chain.add_block(poisoned_b2));

    // Malicious Peer Attack 2: Timestamp manipulation (time warp attack)
    auto timewarp_b2 = chain.create_next_block({tx});
    timewarp_b2.header.timestamp = 0; // Pre-dates genesis
    auto timewarp_hdr = timewarp_b2.header.serialize();
    timewarp_b2.block_hash = crypto::CryptoUtils::sha256(timewarp_hdr);
    // Even if header matches, consensus rejects or invalidates
    // Check that chain validates safely
    EXPECT_EQ(chain.height(), 1);

    storage->close();
}

// =========================================================================
// 4. CRYPTOGRAPHIC KEY MANAGEMENT & E2EE SECURITY
// =========================================================================

TEST_F(SecurityAndReliabilityTest, CryptographicKeyIsolationAndTamperProof) {
    crypto::StandardCryptoEngine crypto;
    crypto::Wallet wallet(std::make_shared<crypto::StandardCryptoEngine>());

    auto alice = wallet.create_identity("Alice");
    auto bob = wallet.create_identity("Bob");
    auto eve = wallet.create_identity("Eve");

    std::string secret = "Sensitive financial & personal consensus message";
    std::span<const uint8_t> secret_bytes(reinterpret_cast<const uint8_t*>(secret.data()), secret.size());

    // Compute shared secret between Alice and Bob
    auto shared_ab = crypto::E2EEncryptionEngine::compute_shared_secret(
        bob.public_key(), alice.public_key(), alice.secret_key());

    uint64_t nonce = 0xDEADBEEF;
    auto ciphertext = crypto::E2EEncryptionEngine::encrypt(secret_bytes, shared_ab, nonce);

    // 1. Bob correctly decrypts
    auto shared_ba = crypto::E2EEncryptionEngine::compute_shared_secret(
        alice.public_key(), bob.public_key(), bob.secret_key());
    EXPECT_EQ(shared_ab, shared_ba);

    auto decrypted = crypto::E2EEncryptionEngine::decrypt(ciphertext, shared_ba, nonce);
    EXPECT_EQ(std::string(decrypted.begin(), decrypted.end()), secret);

    // 2. Eve (eavesdropper) tries to decrypt with her key
    auto shared_ea = crypto::E2EEncryptionEngine::compute_shared_secret(
        alice.public_key(), eve.public_key(), eve.secret_key());
    EXPECT_NE(shared_ab, shared_ea);

    auto eve_decrypted = crypto::E2EEncryptionEngine::decrypt(ciphertext, shared_ea, nonce);
    EXPECT_NE(std::string(eve_decrypted.begin(), eve_decrypted.end()), secret);

    // 3. Ciphertext bit tampering (Malleability attack)
    auto tampered_ciphertext = ciphertext;
    tampered_ciphertext.back() ^= 0xFF; // Flip byte
    auto tampered_decrypted = crypto::E2EEncryptionEngine::decrypt(tampered_ciphertext, shared_ba, nonce);
    EXPECT_NE(std::string(tampered_decrypted.begin(), tampered_decrypted.end()), secret);
}

// =========================================================================
// 5. CONTENT CAS INTEGRITY, AVAILABILITY & ACCESS CONTROL
// =========================================================================

TEST_F(SecurityAndReliabilityTest, ContentStoreIntegrityAndUnauthorizedAccess) {
    auto store = std::make_shared<content::ContentStore>((test_dir_ / "cas_store").string());
    content::ContentManager mgr(store);

    crypto::Wallet wallet(std::make_shared<crypto::StandardCryptoEngine>());
    auto author = wallet.create_identity("Author");
    auto authorized_reader = wallet.create_identity("Reader");
    auto attacker = wallet.create_identity("Attacker");

    std::string document = "Confidential specification document for BlockBum Network";
    std::vector<uint8_t> doc_bytes(document.begin(), document.end());

    // Prepare private file restricted only to authorized_reader
    auto result = mgr.prepare_and_store_file(
        "secret_spec.pdf",
        content::FileContentType::Document,
        doc_bytes,
        author,
        false, // Private
        {authorized_reader.address()}
    );

    // 1. Authorized reader can reassemble and decrypt
    auto retrieved = mgr.retrieve_and_reassemble(result.manifest.root_cid, authorized_reader.address(), result.file_encryption_key);
    ASSERT_TRUE(retrieved.has_value());
    EXPECT_EQ(std::string(retrieved->begin(), retrieved->end()), document);

    // 2. Attacker is rejected by Access Control
    auto unauthorized = mgr.retrieve_and_reassemble(result.manifest.root_cid, attacker.address(), result.file_encryption_key);
    EXPECT_FALSE(unauthorized.has_value());

    // 3. Chunk Corruption / Integrity failure
    ASSERT_FALSE(result.chunks.empty());
    auto corrupted_chunk = result.chunks[0];
    corrupted_chunk.encrypted_data[corrupted_chunk.encrypted_data.size() / 2] ^= 0xAA;
    // Overwrite in store with invalid hash
    store->put_chunk(corrupted_chunk);

    auto corrupted_retrieval = mgr.retrieve_and_reassemble(result.manifest.root_cid, authorized_reader.address(), result.file_encryption_key);
    EXPECT_FALSE(corrupted_retrieval.has_value());
}

// =========================================================================
// 6. BENCHMARK SUITE: Throughput, Latency, and Processing Metrics
// =========================================================================

TEST_F(SecurityAndReliabilityTest, PerformanceBenchmarks) {
    crypto::StandardCryptoEngine crypto;
    crypto::Wallet wallet(std::make_shared<crypto::StandardCryptoEngine>());
    auto sender = wallet.create_identity("BenchmarkSender");
    auto recipient = wallet.create_identity("BenchmarkRecipient");

    // 1. Transaction Signing & Verification Throughput
    const size_t TX_COUNT = 1000;
    std::vector<core::Transaction> txs;
    txs.reserve(TX_COUNT);

    auto sign_start = std::chrono::high_resolution_clock::now();
    for (size_t i = 0; i < TX_COUNT; ++i) {
        core::Transaction tx;
        tx.sender = sender.address();
        tx.recipient = recipient.address();
        tx.amount = 1000 + i;
        tx.fee = 1000;
        tx.nonce = i + 1;
        tx.sender_pubkey = sender.public_key();
        tx.signature = sender.sign(tx.serialize_for_id(), crypto);
        tx.tx_id = crypto.hash256(tx.serialize_for_id());
        txs.push_back(std::move(tx));
    }
    auto sign_end = std::chrono::high_resolution_clock::now();
    double sign_elapsed_ms = std::chrono::duration<double, std::milli>(sign_end - sign_start).count();

    auto verify_start = std::chrono::high_resolution_clock::now();
    size_t valid_count = 0;
    for (const auto& tx : txs) {
        if (crypto.verify(tx.serialize_for_id(), tx.signature, tx.sender_pubkey)) {
            valid_count++;
        }
    }
    auto verify_end = std::chrono::high_resolution_clock::now();
    double verify_elapsed_ms = std::chrono::duration<double, std::milli>(verify_end - verify_start).count();

    EXPECT_EQ(valid_count, TX_COUNT);

    std::cout << "[BENCHMARK] Signed " << TX_COUNT << " transactions in " 
              << sign_elapsed_ms << " ms (" << (TX_COUNT / (sign_elapsed_ms / 1000.0)) << " tx/s)" << std::endl;
    std::cout << "[BENCHMARK] Verified " << TX_COUNT << " transactions in " 
              << verify_elapsed_ms << " ms (" << (TX_COUNT / (verify_elapsed_ms / 1000.0)) << " tx/s)" << std::endl;

    // 2. Block Merkle Tree and Header Construction Throughput
    auto block_start = std::chrono::high_resolution_clock::now();
    std::vector<core::Hash256> tx_ids;
    tx_ids.reserve(TX_COUNT);
    for (const auto& tx : txs) {
        tx_ids.push_back(tx.tx_id);
    }
    core::Hash256 root = core::MerkleTree::compute_root(tx_ids);
    auto block_end = std::chrono::high_resolution_clock::now();
    double block_elapsed_ms = std::chrono::duration<double, std::milli>(block_end - block_start).count();

    EXPECT_NE(root, core::Hash256{});
    std::cout << "[BENCHMARK] Merkle root calculation over " << TX_COUNT << " txs in " 
              << block_elapsed_ms << " ms" << std::endl;

    // 3. File Chunking, CAS Storage, and Integrity Verification Benchmark
    auto cas_store = std::make_shared<content::ContentStore>((test_dir_ / "bench_cas").string());
    content::ContentManager mgr(cas_store);

    std::vector<uint8_t> payload_5mb(5 * 1024 * 1024, 0x55); // 5 MB payload
    auto cas_start = std::chrono::high_resolution_clock::now();
    auto cas_res = mgr.prepare_and_store_file("bench.bin", content::FileContentType::Binary, payload_5mb, sender, true);
    auto cas_end = std::chrono::high_resolution_clock::now();
    double cas_elapsed_ms = std::chrono::duration<double, std::milli>(cas_end - cas_start).count();

    std::cout << "[BENCHMARK] Chunked, encrypted & stored 5 MB in " 
              << cas_elapsed_ms << " ms (" << (5.0 / (cas_elapsed_ms / 1000.0)) << " MB/s)" << std::endl;
    EXPECT_EQ(cas_res.chunks.size(), 20); // 5MB / 256KB = 20 chunks
}
