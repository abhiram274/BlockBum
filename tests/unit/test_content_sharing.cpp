#include <gtest/gtest.h>
#include "blockbum/content/types.hpp"
#include "blockbum/content/content_store.hpp"
#include "blockbum/content/content_manager.hpp"
#include "blockbum/crypto/standard_crypto.hpp"
#include "blockbum/crypto/wallet.hpp"
#include <filesystem>
#include <numeric>

using namespace blockbum;

class ContentSharingTest : public ::testing::Test {
protected:
    void SetUp() override {
        test_dir_ = std::filesystem::temp_directory_path() / "blockbum_cas_test";
        std::filesystem::remove_all(test_dir_);
        crypto_ = std::make_shared<crypto::StandardCryptoEngine>();
    }

    void TearDown() override {
        std::filesystem::remove_all(test_dir_);
    }

    std::filesystem::path test_dir_;
    std::shared_ptr<crypto::StandardCryptoEngine> crypto_;
};

TEST_F(ContentSharingTest, FileChunkingEncryptionAndReassembly) {
    auto uploader_store = std::make_shared<content::ContentStore>(test_dir_ / "uploader_cas");
    content::ContentManager mgr(uploader_store);

    crypto::Wallet wallet(test_dir_ / "wallet_uploader", crypto_);
    auto uploader = wallet.create_identity("uploader");

    // Generate test file data (500 KB - spans multiple chunks with 64KB chunks)
    std::vector<uint8_t> original_file(500 * 1024);
    for (size_t i = 0; i < original_file.size(); ++i) {
        original_file[i] = static_cast<uint8_t>(i % 256);
    }

    // Prepare and store
    auto result = mgr.prepare_and_store_file(
        "test_document.pdf",
        content::FileContentType::DocumentPDF,
        original_file,
        uploader,
        true, // public
        {},
        64 * 1024 // 64 KB chunk size
    );

    EXPECT_GT(result.chunks.size(), 1);
    EXPECT_FALSE(result.manifest.root_cid.empty());

    // Reconstruct and verify byte-for-byte fidelity
    auto retrieved = mgr.retrieve_and_reassemble(result.manifest.root_cid, uploader.address(), result.file_encryption_key);
    ASSERT_TRUE(retrieved.has_value());
    EXPECT_EQ(retrieved->size(), original_file.size());
    EXPECT_EQ(*retrieved, original_file);
}

TEST_F(ContentSharingTest, RejectsCorruptedChunkIntegrity) {
    auto store = std::make_shared<content::ContentStore>(test_dir_ / "tamper_cas");
    content::ContentManager mgr(store);

    crypto::Wallet wallet(test_dir_ / "wallet_uploader", crypto_);
    auto uploader = wallet.create_identity("uploader");

    std::vector<uint8_t> data = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10};
    auto result = mgr.prepare_and_store_file("file.bin", content::FileContentType::GenericBinary, data, uploader, true);

    // Tamper with first chunk file directly on disk
    auto chunk_file = test_dir_ / "tamper_cas" / (result.chunks[0].cid + ".chunk");
    ASSERT_TRUE(std::filesystem::exists(chunk_file));

    std::ofstream tamper(chunk_file, std::ios::binary | std::ios::in | std::ios::out);
    tamper.seekp(30);
    tamper.put(static_cast<char>(0xFF));
    tamper.close();

    // Reassembly must detect chunk corruption and fail
    auto retrieved = mgr.retrieve_and_reassemble(result.manifest.root_cid, uploader.address(), result.file_encryption_key);
    EXPECT_FALSE(retrieved.has_value());
}

TEST_F(ContentSharingTest, OfflineUploaderRetrievalFromReplicationNode) {
    // Node A (Uploader) and Node B (Storage Relay Peer)
    auto store_a = std::make_shared<content::ContentStore>(test_dir_ / "node_a_cas");
    auto store_b = std::make_shared<content::ContentStore>(test_dir_ / "node_b_cas");

    content::ContentManager mgr_a(store_a);
    content::ContentManager mgr_b(store_b);

    crypto::Wallet wallet(test_dir_ / "wallet", crypto_);
    auto uploader = wallet.create_identity("uploader");
    auto downloader = wallet.create_identity("downloader");

    std::vector<uint8_t> source_code = {'#', 'i', 'n', 'c', 'l', 'u', 'd', 'e', ' ', '<', 'i', 'o', 's', 't', 'r', 'e', 'a', 'm', '>'};

    auto result = mgr_a.prepare_and_store_file(
        "main.cpp", content::FileContentType::SourceCode, source_code, uploader, true);

    // Replicate all chunks and manifest from Node A to Node B
    for (const auto& cid : result.manifest.chunk_cids) {
        ASSERT_TRUE(mgr_a.replicate_chunk_to_peer(cid, *store_b));
    }
    ASSERT_TRUE(mgr_a.replicate_manifest_to_peer(result.manifest.root_cid, *store_b));

    // Simulate Node A going completely offline by destroying store_a directory
    std::filesystem::remove_all(test_dir_ / "node_a_cas");

    // Node B can serve the file independently while uploader is offline!
    auto retrieved = mgr_b.retrieve_and_reassemble(result.manifest.root_cid, downloader.address(), result.file_encryption_key);
    ASSERT_TRUE(retrieved.has_value());
    EXPECT_EQ(*retrieved, source_code);
}

TEST_F(ContentSharingTest, AccessControlRejectsUnauthorizedReaders) {
    auto store = std::make_shared<content::ContentStore>(test_dir_ / "acl_cas");
    content::ContentManager mgr(store);

    crypto::Wallet wallet(test_dir_ / "wallet_acl", crypto_);
    auto alice = wallet.create_identity("alice");
    auto bob = wallet.create_identity("bob");
    auto eve = wallet.create_identity("eve");

    std::vector<uint8_t> secret_doc = {'S', 'E', 'C', 'R', 'E', 'T'};

    // Alice shares private file with Bob ONLY
    auto result = mgr.prepare_and_store_file(
        "confidential.pdf",
        content::FileContentType::DocumentPDF,
        secret_doc,
        alice,
        false, // private
        {bob.address()}
    );

    // Bob is authorized: Success
    auto bob_retrieved = mgr.retrieve_and_reassemble(result.manifest.root_cid, bob.address(), result.file_encryption_key);
    ASSERT_TRUE(bob_retrieved.has_value());
    EXPECT_EQ(*bob_retrieved, secret_doc);

    // Eve is unauthorized: Rejection
    auto eve_retrieved = mgr.retrieve_and_reassemble(result.manifest.root_cid, eve.address(), result.file_encryption_key);
    EXPECT_FALSE(eve_retrieved.has_value());
}

TEST_F(ContentSharingTest, FileSizeLimitEnforced) {
    auto store = std::make_shared<content::ContentStore>(test_dir_ / "limits_cas");
    content::ContentManager mgr(store);

    crypto::Wallet wallet(test_dir_ / "wallet_limits", crypto_);
    auto user = wallet.create_identity("user");

    // Construct a view that exceeds 100MB without allocating 100MB of RAM
    // Simulate oversized span using pointer arithmetic bounds
    std::vector<uint8_t> dummy(10);
    std::span<const uint8_t> oversized_span(dummy.data(), content::MAX_FILE_SIZE + 1);

    EXPECT_THROW(
        mgr.prepare_and_store_file("oversized.iso", content::FileContentType::GenericBinary, oversized_span, user),
        std::runtime_error
    );
}
