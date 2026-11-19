#include <gtest/gtest.h>
#include "blockbum/core/types.hpp"
#include "blockbum/core/serializer.hpp"
#include "blockbum/core/transaction.hpp"
#include "blockbum/core/merkle_tree.hpp"
#include "blockbum/core/block.hpp"
#include "blockbum/core/blockchain.hpp"
#include "blockbum/storage/file_storage.hpp"
#include <filesystem>

class BlockchainTest : public ::testing::Test {
protected:
    void SetUp() override {
        test_dir_ = std::filesystem::temp_directory_path() / "blockbum_test_db";
        std::filesystem::remove_all(test_dir_);
        storage_ = std::make_shared<blockbum::storage::FileStorageEngine>();
        ASSERT_TRUE(storage_->open(test_dir_.string()));
    }

    void TearDown() override {
        storage_->close();
        std::filesystem::remove_all(test_dir_);
    }

    std::filesystem::path test_dir_;
    std::shared_ptr<blockbum::storage::FileStorageEngine> storage_;
};

TEST_F(BlockchainTest, DeterministicGenesisBlock) {
    blockbum::core::Blockchain chain(storage_);
    ASSERT_TRUE(chain.initialize());

    EXPECT_EQ(chain.height(), 0);
    auto tip = chain.get_tip_block();
    ASSERT_TRUE(tip.has_value());
    EXPECT_EQ(tip->header.height, 0);
    EXPECT_EQ(tip->transactions.size(), 1);
    EXPECT_EQ(tip->transactions[0].sender, "SYSTEM");
    EXPECT_EQ(tip->transactions[0].recipient, "GENESIS_COMMUNITY");

    EXPECT_EQ(chain.validate_entire_chain(), blockbum::core::ValidationResult::Valid);
}

TEST_F(BlockchainTest, AddValidBlocks) {
    blockbum::core::Blockchain chain(storage_);
    ASSERT_TRUE(chain.initialize());

    // Create 3 valid blocks
    for (uint64_t i = 1; i <= 3; ++i) {
        blockbum::core::Transaction tx;
        tx.version = 1;
        tx.sender = "Alice";
        tx.recipient = "Bob";
        tx.amount = 50 * i;
        tx.fee = 1;
        tx.nonce = i;
        tx.timestamp = 1700000000 + i * 10;

        auto next_block = chain.create_next_block({tx});
        EXPECT_TRUE(chain.add_block(next_block));
        EXPECT_EQ(chain.height(), i);
    }

    EXPECT_EQ(chain.validate_entire_chain(), blockbum::core::ValidationResult::Valid);
}

TEST_F(BlockchainTest, ReopenRestoresChainState) {
    {
        blockbum::core::Blockchain chain(storage_);
        ASSERT_TRUE(chain.initialize());

        blockbum::core::Transaction tx;
        tx.sender = "User1";
        tx.recipient = "User2";
        tx.amount = 100;
        auto b1 = chain.create_next_block({tx});
        ASSERT_TRUE(chain.add_block(b1));
        EXPECT_EQ(chain.height(), 1);
    }

    storage_->close();

    // Reopen from existing storage directory
    auto restored_storage = std::make_shared<blockbum::storage::FileStorageEngine>();
    ASSERT_TRUE(restored_storage->open(test_dir_.string()));

    blockbum::core::Blockchain restored_chain(restored_storage);
    ASSERT_TRUE(restored_chain.initialize());

    EXPECT_EQ(restored_chain.height(), 1);
    EXPECT_EQ(restored_chain.validate_entire_chain(), blockbum::core::ValidationResult::Valid);

    auto b1 = restored_chain.get_block_by_height(1);
    ASSERT_TRUE(b1.has_value());
    EXPECT_EQ(b1->transactions[0].sender, "User1");
    restored_storage->close();
}

TEST_F(BlockchainTest, RejectsInvalidMerkleRoot) {
    blockbum::core::Blockchain chain(storage_);
    ASSERT_TRUE(chain.initialize());

    blockbum::core::Transaction tx;
    tx.sender = "Eve";
    tx.recipient = "Mallory";
    tx.amount = 999;

    auto corrupted_block = chain.create_next_block({tx});
    // Corrupt merkle root
    corrupted_block.header.merkle_root[0] ^= 0xFF;

    auto tip = chain.get_tip_block();
    auto res = chain.validate_block(corrupted_block, tip);
    EXPECT_EQ(res, blockbum::core::ValidationResult::InvalidMerkleRoot);
    EXPECT_FALSE(chain.add_block(corrupted_block));
}

TEST_F(BlockchainTest, RejectsCorruptedBlockHash) {
    blockbum::core::Blockchain chain(storage_);
    ASSERT_TRUE(chain.initialize());

    blockbum::core::Transaction tx;
    tx.sender = "Eve";
    tx.recipient = "Mallory";
    tx.amount = 999;

    auto corrupted_block = chain.create_next_block({tx});
    // Corrupt block hash
    corrupted_block.block_hash[0] ^= 0xAA;

    auto tip = chain.get_tip_block();
    auto res = chain.validate_block(corrupted_block, tip);
    EXPECT_EQ(res, blockbum::core::ValidationResult::InvalidBlockHash);
    EXPECT_FALSE(chain.add_block(corrupted_block));
}

TEST_F(BlockchainTest, RejectsInvalidChainLinkage) {
    blockbum::core::Blockchain chain(storage_);
    ASSERT_TRUE(chain.initialize());

    blockbum::core::Transaction tx;
    tx.sender = "Eve";
    tx.recipient = "Mallory";

    auto bad_link_block = chain.create_next_block({tx});
    // Corrupt previous hash
    bad_link_block.header.previous_hash[0] ^= 0xEE;
    // Recalculate block hash so that header hash check passes, but linkage fails
    auto header_bytes = bad_link_block.header.serialize();
    bad_link_block.block_hash = blockbum::crypto::CryptoUtils::sha256(header_bytes);

    auto tip = chain.get_tip_block();
    auto res = chain.validate_block(bad_link_block, tip);
    EXPECT_EQ(res, blockbum::core::ValidationResult::InvalidPreviousHash);
    EXPECT_FALSE(chain.add_block(bad_link_block));
}

TEST_F(BlockchainTest, RejectsInvalidHeight) {
    blockbum::core::Blockchain chain(storage_);
    ASSERT_TRUE(chain.initialize());

    blockbum::core::Transaction tx;
    tx.sender = "Eve";
    tx.recipient = "Mallory";

    auto bad_height_block = chain.create_next_block({tx});
    bad_height_block.header.height = 100; // Jump height from 0 to 100
    auto header_bytes = bad_height_block.header.serialize();
    bad_height_block.block_hash = blockbum::crypto::CryptoUtils::sha256(header_bytes);

    auto tip = chain.get_tip_block();
    auto res = chain.validate_block(bad_height_block, tip);
    EXPECT_EQ(res, blockbum::core::ValidationResult::InvalidHeight);
    EXPECT_FALSE(chain.add_block(bad_height_block));
}
