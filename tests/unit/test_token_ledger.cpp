#include <gtest/gtest.h>
#include "blockbum/core/account_ledger.hpp"
#include "blockbum/crypto/standard_crypto.hpp"
#include "blockbum/crypto/wallet.hpp"
#include <filesystem>

using namespace blockbum;

class NativeCryptocurrencyTest : public ::testing::Test {
protected:
    void SetUp() override {
        test_dir_ = std::filesystem::temp_directory_path() / "blockbum_ledger_test";
        std::filesystem::remove_all(test_dir_);
        crypto_ = std::make_shared<crypto::StandardCryptoEngine>();
        wallet_ = std::make_unique<crypto::Wallet>(test_dir_ / "wallet", crypto_);
    }

    void TearDown() override {
        std::filesystem::remove_all(test_dir_);
    }

    std::filesystem::path test_dir_;
    std::shared_ptr<crypto::StandardCryptoEngine> crypto_;
    std::unique_ptr<crypto::Wallet> wallet_;
};

TEST_F(NativeCryptocurrencyTest, InitialIssuanceAndSupplyRules) {
    ledger::AccountLedger ledger;

    // Check block reward at genesis and halving schedule
    EXPECT_EQ(ledger::AccountLedger::calculate_block_reward(0), 50 * ledger::BUM_DECIMALS);
    EXPECT_EQ(ledger::AccountLedger::calculate_block_reward(210'000), 25 * ledger::BUM_DECIMALS);
    EXPECT_EQ(ledger::AccountLedger::calculate_block_reward(420'000), 12.5 * ledger::BUM_DECIMALS);

    // Seed initial devnet allocation
    ledger.seed_balance("community_treasury", 1'000'000 * ledger::BUM_DECIMALS);
    EXPECT_EQ(ledger.get_balance("community_treasury"), 1'000'000 * ledger::BUM_DECIMALS);
    EXPECT_EQ(ledger.total_supply(), 1'000'000 * ledger::BUM_DECIMALS);

    // Verify halving emission sum strictly respects MAX_BUM_SUPPLY
    uint64_t total_emitted = 0;
    for (core::BlockHeight h = 0; h < 64 * ledger::HALVING_INTERVAL; h += ledger::HALVING_INTERVAL) {
        total_emitted += ledger::AccountLedger::calculate_block_reward(h) * ledger::HALVING_INTERVAL;
    }
    EXPECT_LE(total_emitted, ledger::MAX_BUM_SUPPLY);
    EXPECT_EQ(ledger::MAX_BUM_SUPPLY, 21'000'000ULL * ledger::BUM_DECIMALS);
}

TEST_F(NativeCryptocurrencyTest, ValidSignedTransferUpdatesBalances) {
    ledger::AccountLedger ledger;
    auto alice = wallet_->create_identity("alice");
    auto bob = wallet_->create_identity("bob");

    // Alice starts with 1,000 BUM
    ledger.seed_balance(alice.address(), 1'000 * ledger::BUM_DECIMALS);

    core::Transaction tx;
    tx.version = 1;
    tx.sender = alice.address();
    tx.recipient = bob.address();
    tx.amount = 250 * ledger::BUM_DECIMALS;
    tx.fee = ledger::MIN_TRANSACTION_FEE;
    tx.nonce = 1; // alice's initial nonce is 0 -> next is 1
    tx.timestamp = 1700000000;

    // Sign transaction with Alice's identity
    ASSERT_TRUE(wallet_->sign_transaction(tx, "alice"));

    // Validation passes
    EXPECT_TRUE(ledger.can_apply_transaction(tx, *crypto_));

    // Apply transaction
    EXPECT_TRUE(ledger.apply_transaction(tx, *crypto_));

    // Verify balances
    uint64_t expected_alice_bal = (1'000 * ledger::BUM_DECIMALS) - (250 * ledger::BUM_DECIMALS) - ledger::MIN_TRANSACTION_FEE;
    EXPECT_EQ(ledger.get_balance(alice.address()), expected_alice_bal);
    EXPECT_EQ(ledger.get_balance(bob.address()), 250 * ledger::BUM_DECIMALS);
    EXPECT_EQ(ledger.get_nonce(alice.address()), 1);

    // Verify transaction history records
    auto alice_hist = ledger.get_account_history(alice.address());
    auto bob_hist = ledger.get_account_history(bob.address());
    EXPECT_EQ(alice_hist.size(), 1);
    EXPECT_EQ(bob_hist.size(), 1);
    EXPECT_EQ(alice_hist[0].amount, 250 * ledger::BUM_DECIMALS);
}

TEST_F(NativeCryptocurrencyTest, RejectsDoubleSpendingAndReplay) {
    ledger::AccountLedger ledger;
    auto alice = wallet_->create_identity("alice");
    auto bob = wallet_->create_identity("bob");

    ledger.seed_balance(alice.address(), 500 * ledger::BUM_DECIMALS);

    core::Transaction tx;
    tx.sender = alice.address();
    tx.recipient = bob.address();
    tx.amount = 100 * ledger::BUM_DECIMALS;
    tx.fee = ledger::MIN_TRANSACTION_FEE;
    tx.nonce = 1;
    wallet_->sign_transaction(tx, "alice");

    // First application succeeds
    EXPECT_TRUE(ledger.apply_transaction(tx, *crypto_));
    EXPECT_EQ(ledger.get_nonce(alice.address()), 1);

    // Attempting to re-apply the EXACT SAME transaction (Replay / Double spend) MUST FAIL!
    EXPECT_FALSE(ledger.can_apply_transaction(tx, *crypto_));
    EXPECT_FALSE(ledger.apply_transaction(tx, *crypto_));

    // Alice attempts second transaction with same nonce 1 -> REJECTED
    core::Transaction tx2;
    tx2.sender = alice.address();
    tx2.recipient = "charlie";
    tx2.amount = 50 * ledger::BUM_DECIMALS;
    tx2.fee = ledger::MIN_TRANSACTION_FEE;
    tx2.nonce = 1; // Stale nonce!
    wallet_->sign_transaction(tx2, "alice");

    EXPECT_FALSE(ledger.can_apply_transaction(tx2, *crypto_));
    EXPECT_FALSE(ledger.apply_transaction(tx2, *crypto_));
}

TEST_F(NativeCryptocurrencyTest, RejectsInsufficientBalance) {
    ledger::AccountLedger ledger;
    auto alice = wallet_->create_identity("alice");
    auto bob = wallet_->create_identity("bob");

    // Alice has only 10 BUM
    ledger.seed_balance(alice.address(), 10 * ledger::BUM_DECIMALS);

    core::Transaction tx;
    tx.sender = alice.address();
    tx.recipient = bob.address();
    tx.amount = 100 * ledger::BUM_DECIMALS; // Exceeds balance!
    tx.fee = ledger::MIN_TRANSACTION_FEE;
    tx.nonce = 1;
    wallet_->sign_transaction(tx, "alice");

    EXPECT_FALSE(ledger.can_apply_transaction(tx, *crypto_));
    EXPECT_FALSE(ledger.apply_transaction(tx, *crypto_));

    // Balance remains unchanged
    EXPECT_EQ(ledger.get_balance(alice.address()), 10 * ledger::BUM_DECIMALS);
}

TEST_F(NativeCryptocurrencyTest, RejectsInvalidOrForgedSignatures) {
    ledger::AccountLedger ledger;
    auto alice = wallet_->create_identity("alice");
    auto bob = wallet_->create_identity("bob");

    ledger.seed_balance(alice.address(), 500 * ledger::BUM_DECIMALS);

    core::Transaction tx;
    tx.sender = alice.address();
    tx.recipient = bob.address();
    tx.amount = 50 * ledger::BUM_DECIMALS;
    tx.fee = ledger::MIN_TRANSACTION_FEE;
    tx.nonce = 1;
    wallet_->sign_transaction(tx, "alice");

    // Forger tampers with amount after signature was created
    tx.amount = 500 * ledger::BUM_DECIMALS;

    EXPECT_FALSE(ledger.can_apply_transaction(tx, *crypto_));
    EXPECT_FALSE(ledger.apply_transaction(tx, *crypto_));
}

TEST_F(NativeCryptocurrencyTest, BlockProducerIncentiveRewardAndFees) {
    ledger::AccountLedger ledger;
    auto miner = wallet_->create_identity("miner");

    EXPECT_EQ(ledger.get_balance(miner.address()), 0);

    // Miner produces block 10 and collects 5,000 atomic units in transaction fees
    ledger.credit_block_reward(miner.address(), 10, 5'000);

    uint64_t expected = (50 * ledger::BUM_DECIMALS) + 5'000;
    EXPECT_EQ(ledger.get_balance(miner.address()), expected);
}
