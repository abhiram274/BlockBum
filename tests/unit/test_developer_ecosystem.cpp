#include <gtest/gtest.h>
#include "blockbum/sdk.hpp"
#include "blockbum/core/blockchain.hpp"
#include "blockbum/core/account_ledger.hpp"
#include "blockbum/core/economic_model.hpp"
#include "blockbum/crypto/standard_crypto.hpp"
#include "blockbum/crypto/crypto_utils.hpp"
#include "blockbum/rpc/rpc_server.hpp"
#include "blockbum/rpc/faucet.hpp"
#include "blockbum/sdk/client.hpp"
#include "blockbum/storage/file_storage.hpp"
#include <filesystem>
#include <chrono>

using namespace blockbum;

class DeveloperEcosystemTest : public ::testing::Test {
protected:
    void SetUp() override {
        auto now = std::chrono::system_clock::now().time_since_epoch().count();
        test_dir_ = std::filesystem::temp_directory_path() / ("blockbum_deveco_test_" + std::to_string(now));
        std::filesystem::remove_all(test_dir_);

        storage_ = std::make_shared<storage::FileStorageEngine>();
        ASSERT_TRUE(storage_->open(test_dir_.string()));

        blockchain_ = std::make_shared<core::Blockchain>(storage_);
        ASSERT_TRUE(blockchain_->initialize());

        ledger_ = std::make_shared<ledger::AccountLedger>();
        faucet_ = std::make_shared<rpc::TestnetFaucet>(ledger_, 10ULL * ledger::BUM_DECIMALS, 3600);
        rpc_server_ = std::make_shared<rpc::RpcServer>(blockchain_, ledger_, faucet_);
        sdk_client_ = std::make_unique<sdk::BlockBumClient>();
    }

    void TearDown() override {
        storage_->close();
        std::error_code ec;
        std::filesystem::remove_all(test_dir_, ec);
    }

    std::filesystem::path test_dir_;
    std::shared_ptr<storage::FileStorageEngine> storage_;
    std::shared_ptr<core::Blockchain> blockchain_;
    std::shared_ptr<ledger::AccountLedger> ledger_;
    std::shared_ptr<rpc::TestnetFaucet> faucet_;
    std::shared_ptr<rpc::RpcServer> rpc_server_;
    std::unique_ptr<sdk::BlockBumClient> sdk_client_;
};

// 1. JSON-RPC 2.0 Node Info Endpoint
TEST_F(DeveloperEcosystemTest, JsonRpcNodeInfo) {
    std::string resp = rpc_server_->handle_json_rpc("blockbum_getNodeInfo", "{}", "42");
    EXPECT_NE(resp.find("\"jsonrpc\":\"2.0\""), std::string::npos);
    EXPECT_NE(resp.find("\"id\":42"), std::string::npos);
    EXPECT_NE(resp.find("\"network\":\"blockbum-testnet\""), std::string::npos);
    EXPECT_NE(resp.find("\"current_height\":0"), std::string::npos);
    EXPECT_NE(resp.find("\"max_supply_atomic\":21000000000000"), std::string::npos);
    EXPECT_NE(resp.find("\"sync_status\":\"synced\""), std::string::npos);
}

// 2. JSON-RPC 2.0 Block and Transaction Queries
TEST_F(DeveloperEcosystemTest, JsonRpcBlockAndTxQueries) {
    // Genesis block query
    std::string b0_resp = rpc_server_->handle_json_rpc("blockbum_getBlockByHeight", "{\"height\":0}", "101");
    EXPECT_NE(b0_resp.find("\"height\":0"), std::string::npos);
    EXPECT_NE(b0_resp.find("\"tx_count\":1"), std::string::npos);

    // Non-existent block query
    std::string b999_resp = rpc_server_->handle_json_rpc("blockbum_getBlockByHeight", "{\"height\":9999}", "102");
    EXPECT_NE(b999_resp.find("\"error\""), std::string::npos);
    EXPECT_NE(b999_resp.find("-32002"), std::string::npos);

    // Block by hash query
    auto tip = blockchain_->get_tip_block();
    ASSERT_TRUE(tip.has_value());
    std::string hash_hex = core::to_hex(tip->block_hash);

    std::string b_hash_resp = rpc_server_->handle_json_rpc("blockbum_getBlockByHash", "{\"hash\":\"" + hash_hex + "\"}", "103");
    EXPECT_NE(b_hash_resp.find("\"block_hash\":\"0x" + hash_hex + "\""), std::string::npos);

    // Transaction query on Genesis transaction
    ASSERT_FALSE(tip->transactions.empty());
    std::string tx_hex = core::to_hex(tip->transactions[0].tx_id);
    std::string tx_resp = rpc_server_->handle_json_rpc("blockbum_getTransactionByHash", "{\"tx_id\":\"" + tx_hex + "\"}", "104");
    EXPECT_NE(tx_resp.find("\"tx_id\":\"0x" + tx_hex + "\""), std::string::npos);
    EXPECT_NE(tx_resp.find("\"sender\":\"SYSTEM\""), std::string::npos);

    // Non-existent transaction
    std::string fake_tx = rpc_server_->handle_json_rpc("blockbum_getTransactionByHash", "{\"tx_id\":\"ffffffffffffffff\"}", "105");
    EXPECT_NE(fake_tx.find("-32002"), std::string::npos);
}

// 3. JSON-RPC 2.0 Account State and Fee Estimation
TEST_F(DeveloperEcosystemTest, JsonRpcAccountAndFeeEstimation) {
    std::string test_addr = "bb1developeraddress123456789";
    ledger_->seed_balance(test_addr, 50ULL * ledger::BUM_DECIMALS);

    std::string acc_resp = rpc_server_->handle_json_rpc("blockbum_getAccount", "{\"address\":\"" + test_addr + "\"}", "201");
    EXPECT_NE(acc_resp.find("\"address\":\"" + test_addr + "\""), std::string::npos);
    EXPECT_NE(acc_resp.find("\"balance_atomic\":50000000"), std::string::npos);
    EXPECT_NE(acc_resp.find("\"balance_bum\":50.000000"), std::string::npos);
    EXPECT_NE(acc_resp.find("\"nonce\":0"), std::string::npos);

    // Estimate fee
    std::string fee_resp = rpc_server_->handle_json_rpc("blockbum_estimateFee", "{\"payload_size\":200}", "202");
    EXPECT_NE(fee_resp.find("\"estimated_fee_atomic\""), std::string::npos);
    EXPECT_NE(fee_resp.find("\"fee_bum\""), std::string::npos);

    // Peer list
    std::string peer_resp = rpc_server_->handle_json_rpc("blockbum_getPeers", "{}", "203");
    EXPECT_NE(peer_resp.find("peer_seed_01"), std::string::npos);

    // Unsupported method
    std::string err_resp = rpc_server_->handle_json_rpc("blockbum_invalidMethod", "{}", "204");
    EXPECT_NE(err_resp.find("-32601"), std::string::npos);
}

// 4. REST HTTP Router Interfaces
TEST_F(DeveloperEcosystemTest, RestHttpEndpoints) {
    // GET /api/v1/node/info
    auto r1 = rpc_server_->handle_http_request("GET", "/api/v1/node/info");
    EXPECT_EQ(r1.status_code, 200);
    EXPECT_NE(r1.body.find("\"network\":\"blockbum-testnet\""), std::string::npos);

    // GET /api/v1/blocks/latest
    auto r2 = rpc_server_->handle_http_request("GET", "/api/v1/blocks/latest");
    EXPECT_EQ(r2.status_code, 200);
    EXPECT_NE(r2.body.find("\"height\":0"), std::string::npos);

    // GET /api/v1/blocks/0
    auto r3 = rpc_server_->handle_http_request("GET", "/api/v1/blocks/0");
    EXPECT_EQ(r3.status_code, 200);
    EXPECT_NE(r3.body.find("\"height\":0"), std::string::npos);

    // GET /api/v1/blocks/99999
    auto r4 = rpc_server_->handle_http_request("GET", "/api/v1/blocks/99999");
    EXPECT_EQ(r4.status_code, 404);

    // POST /rpc with embedded JSON-RPC
    std::string rpc_body = "{\"method\":\"blockbum_getNodeInfo\",\"id\":\"88\"}";
    auto r5 = rpc_server_->handle_http_request("POST", "/rpc", rpc_body);
    EXPECT_EQ(r5.status_code, 200);
    EXPECT_NE(r5.body.find("\"id\":88"), std::string::npos);

    // Invalid endpoint
    auto r6 = rpc_server_->handle_http_request("GET", "/api/v1/nonexistent");
    EXPECT_EQ(r6.status_code, 404);
}

// 5. Privacy Preservation in Public Explorer APIs (Payload Scrubbing)
TEST_F(DeveloperEcosystemTest, PrivacyPreservingPayloadScrubbing) {
    // Add block with transaction containing sensitive payload data
    core::Block b1;
    b1.header.version = 1;
    b1.header.height = 1;
    b1.header.timestamp = 1700000001;
    b1.header.previous_hash = blockchain_->get_tip_block()->block_hash;

    core::Transaction priv_tx;
    priv_tx.version = 1;
    priv_tx.sender = "bb1sender_privacy_test";
    priv_tx.recipient = "bb1recipient_privacy_test";
    priv_tx.amount = 1000;
    priv_tx.fee = 1000;
    priv_tx.nonce = 1;
    priv_tx.timestamp = 1700000001;
    std::string sensitive_secret = "OFF_CHAIN_CONFIDENTIAL_ENCRYPTED_MESSAGE_KEY_SECRET";
    priv_tx.payload = std::vector<uint8_t>(sensitive_secret.begin(), sensitive_secret.end());
    priv_tx.tx_id = crypto::CryptoUtils::sha256(priv_tx.serialize_for_id());

    b1.transactions.push_back(priv_tx);
    b1.block_hash = b1.compute_block_hash();
    ASSERT_TRUE(blockchain_->add_block(b1));

    // Query transaction through JSON-RPC
    std::string tx_hex = core::to_hex(priv_tx.tx_id);
    std::string tx_json = rpc_server_->handle_json_rpc("blockbum_getTransactionByHash", "{\"tx_id\":\"" + tx_hex + "\"}", "301");

    // CRITICAL PRIVACY REQUIREMENT: Raw confidential message content must NEVER appear in public explorer outputs
    EXPECT_EQ(tx_json.find(sensitive_secret), std::string::npos) << "Sensitive message leaked in public RPC response!";
    // Must expose payload_bytes, payload_hash, and is_confidential: true
    EXPECT_NE(tx_json.find("\"is_confidential\":true"), std::string::npos);
    EXPECT_NE(tx_json.find("\"payload_bytes\":" + std::to_string(sensitive_secret.size())), std::string::npos);
    EXPECT_NE(tx_json.find("\"payload_hash\":\"0x"), std::string::npos);

    // Also check block query
    std::string b1_json = rpc_server_->handle_json_rpc("blockbum_getBlockByHeight", "{\"height\":1}", "302");
    EXPECT_EQ(b1_json.find(sensitive_secret), std::string::npos) << "Sensitive message leaked in public block explorer!";
    EXPECT_NE(b1_json.find("\"is_confidential\":true"), std::string::npos);
}

// 6. Testnet Faucet Rate Limiting and Solvency
TEST_F(DeveloperEcosystemTest, TestnetFaucetRateLimiting) {
    std::string dev_addr = "bb1developerfaucettestaddress123456";
    std::string client_ip = "192.168.1.100";
    uint64_t t0 = 1700000000;

    // Initial pool check
    EXPECT_EQ(faucet_->pool_balance(), rpc::TestnetFaucet::INITIAL_FAUCET_POOL);

    // Invalid address rejected
    auto bad_resp = faucet_->request_tokens("invalid_addr_format", client_ip, t0);
    EXPECT_EQ(bad_resp.status, rpc::FaucetStatus::InvalidAddress);

    // First request succeeds
    auto ok_resp = faucet_->request_tokens(dev_addr, client_ip, t0);
    EXPECT_EQ(ok_resp.status, rpc::FaucetStatus::Success);
    EXPECT_EQ(ok_resp.amount_dispensed, 10ULL * ledger::BUM_DECIMALS);
    EXPECT_EQ(ledger_->get_balance(dev_addr), 10ULL * ledger::BUM_DECIMALS);
    EXPECT_EQ(faucet_->pool_balance(), rpc::TestnetFaucet::INITIAL_FAUCET_POOL - (10ULL * ledger::BUM_DECIMALS));

    // Immediate second request from same address should be rate-limited
    auto rate_limited_addr = faucet_->request_tokens(dev_addr, "192.168.1.101", t0 + 60);
    EXPECT_EQ(rate_limited_addr.status, rpc::FaucetStatus::RateLimited);
    EXPECT_EQ(rate_limited_addr.cooldown_remaining_seconds, 3540);

    // Second request from different address but same client IP should be rate-limited
    std::string dev_addr_2 = "bb1developerfaucettestaddress654321";
    auto rate_limited_ip = faucet_->request_tokens(dev_addr_2, client_ip, t0 + 120);
    EXPECT_EQ(rate_limited_ip.status, rpc::FaucetStatus::RateLimited);

    // After cooldown period (3601s), request succeeds
    auto expired_cooldown = faucet_->request_tokens(dev_addr, client_ip, t0 + 3601);
    EXPECT_EQ(expired_cooldown.status, rpc::FaucetStatus::Success);
    EXPECT_EQ(ledger_->get_balance(dev_addr), 20ULL * ledger::BUM_DECIMALS);

    // Test REST API faucet endpoint
    std::string post_faucet_body = "{\"address\":\"" + dev_addr_2 + "\",\"timestamp\":1700010000}";
    auto http_faucet = rpc_server_->handle_http_request("POST", "/api/v1/faucet", post_faucet_body, "10.0.0.1");
    EXPECT_EQ(http_faucet.status_code, 200);
    EXPECT_NE(http_faucet.body.find("\"success\":true"), std::string::npos);
}

// 7. C++ Developer SDK Client Operations
TEST_F(DeveloperEcosystemTest, CppDeveloperSdkOperations) {
    // Address validation
    EXPECT_TRUE(sdk::BlockBumClient::validate_address("bb1abcdef0123456789"));
    EXPECT_FALSE(sdk::BlockBumClient::validate_address("0xabcdef0123456789")); // Wrong prefix
    EXPECT_FALSE(sdk::BlockBumClient::validate_address("bb1")); // Too short
    EXPECT_FALSE(sdk::BlockBumClient::validate_address("bb1ABCDEF!")); // Invalid characters

    // Generate Keypair
    auto alice = sdk_client_->generate_keypair("alice");
    auto bob = sdk_client_->generate_keypair("bob");

    EXPECT_TRUE(sdk::BlockBumClient::validate_address(alice.address));
    EXPECT_TRUE(sdk::BlockBumClient::validate_address(bob.address));
    EXPECT_EQ(alice.address, sdk::BlockBumClient::derive_address(alice.public_key));

    // Build Transaction
    core::Balance transfer_amount = 5ULL * ledger::BUM_DECIMALS;
    core::Nonce nonce = 1;
    std::vector<uint8_t> memo = {0x01, 0x02, 0x03};

    auto tx = sdk_client_->build_transfer(alice.address, alice.public_key, bob.address,
                                          transfer_amount, nonce, std::nullopt, memo);
    EXPECT_EQ(tx.sender, alice.address);
    EXPECT_EQ(tx.recipient, bob.address);
    EXPECT_EQ(tx.amount, transfer_amount);
    EXPECT_GE(tx.fee, economics::MIN_TRANSACTION_FEE);

    // Sign Transaction
    ASSERT_TRUE(sdk_client_->sign_transaction(tx, alice.private_key));
    EXPECT_FALSE(tx.signature.empty());
    EXPECT_NE(tx.tx_id, core::Hash256{});

    // Verify Transaction
    EXPECT_TRUE(sdk_client_->verify_transaction(tx));

    // Tampering Detection 1: Modify amount
    core::Transaction tampered_tx = tx;
    tampered_tx.amount = 100ULL * ledger::BUM_DECIMALS;
    EXPECT_FALSE(sdk_client_->verify_transaction(tampered_tx));

    // Tampering Detection 2: Modify recipient
    core::Transaction tampered_recipient = tx;
    tampered_recipient.recipient = "bb1maliciousattackeraddress999";
    EXPECT_FALSE(sdk_client_->verify_transaction(tampered_recipient));

    // Tampering Detection 3: Sub-minimum fee
    core::Transaction low_fee_tx = tx;
    low_fee_tx.fee = 10; // below MIN_TRANSACTION_FEE (1000)
    EXPECT_FALSE(sdk_client_->verify_transaction(low_fee_tx));
}

// 8. Protocol Test Vectors Invariants
TEST_F(DeveloperEcosystemTest, ProtocolTestVectorsInvariants) {
    // Halving Schedule Invariants
    EXPECT_EQ(ledger::calculate_block_reward(0), 50ULL * ledger::BUM_DECIMALS);
    EXPECT_EQ(ledger::calculate_block_reward(ledger::HALVING_INTERVAL), 25ULL * ledger::BUM_DECIMALS);
    EXPECT_EQ(ledger::calculate_block_reward(ledger::HALVING_INTERVAL * 2), 12ULL * ledger::BUM_DECIMALS + 500'000ULL);
    EXPECT_EQ(ledger::calculate_block_reward(ledger::HALVING_INTERVAL * 25), 1ULL); // 1 atomic unit (0.000001 BUM)
    EXPECT_EQ(ledger::calculate_block_reward(ledger::HALVING_INTERVAL * 26), 0ULL); // Complete cessation of subsidy

    // Supply Invariants
    EXPECT_EQ(economics::MAX_BUM_SUPPLY, 21'000'000ULL * ledger::BUM_DECIMALS);
    EXPECT_EQ(economics::EXACT_RIGHT_SHIFT_EMISSION, 20'999'997'480'000ULL);
    EXPECT_LE(economics::EXACT_RIGHT_SHIFT_EMISSION, economics::MAX_BUM_SUPPLY);
}
