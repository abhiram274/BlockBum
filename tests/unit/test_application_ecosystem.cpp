#include <gtest/gtest.h>
#include "blockbum/sdk.hpp"
#include "blockbum/core/types.hpp"
#include "blockbum/core/merkle_tree.hpp"
#include "blockbum/core/blockchain.hpp"
#include "blockbum/core/serializer.hpp"
#include "blockbum/crypto/standard_crypto.hpp"
#include "blockbum/crypto/crypto_utils.hpp"
#include "blockbum/messaging/device_manager.hpp"
#include "blockbum/storage/file_storage.hpp"
#include <filesystem>
#include <chrono>

using namespace blockbum;

class ApplicationEcosystemTest : public ::testing::Test {
protected:
    void SetUp() override {
        crypto_ = std::make_shared<crypto::StandardCryptoEngine>();
        auto now = std::chrono::system_clock::now().time_since_epoch().count();
        test_dir_ = std::filesystem::temp_directory_path() / ("blockbum_appeco_test_" + std::to_string(now));
        std::filesystem::remove_all(test_dir_);

        storage_ = std::make_shared<storage::FileStorageEngine>();
        ASSERT_TRUE(storage_->open(test_dir_.string()));
        blockchain_ = std::make_shared<core::Blockchain>(storage_);
        ASSERT_TRUE(blockchain_->initialize());
    }

    void TearDown() override {
        storage_->close();
        std::error_code ec;
        std::filesystem::remove_all(test_dir_, ec);
    }

    std::shared_ptr<crypto::ICryptoEngine> crypto_;
    std::filesystem::path test_dir_;
    std::shared_ptr<storage::FileStorageEngine> storage_;
    std::shared_ptr<core::Blockchain> blockchain_;
};

// 1. Lightweight Client (SPV) Merkle Proof & Header Verification
TEST_F(ApplicationEcosystemTest, LightweightClientSPVVerification) {
    // Generate 4 transactions for a block
    std::vector<core::Hash256> tx_hashes;
    for (uint64_t i = 1; i <= 4; ++i) {
        std::string payload = "tx_data_item_" + std::to_string(i);
        tx_hashes.push_back(crypto::CryptoUtils::sha256(
            std::span<const uint8_t>(reinterpret_cast<const uint8_t*>(payload.data()), payload.size())));
    }

    // Compute Merkle Root on Full Node
    core::Hash256 expected_root = core::MerkleTree::compute_root(tx_hashes);
    EXPECT_NE(expected_root, core::Hash256{});

    // SPV Light Client: Only downloads the 92-byte header with the Merkle Root
    core::BlockHeader light_header;
    light_header.version = 1;
    light_header.height = 42;
    light_header.merkle_root = expected_root;
    light_header.timestamp = 1700000000;

    // Simulate SPV Merkle Audit Proof for tx #0 (leaf 0)
    // In a 4-leaf tree: Root = Hash(Hash(leaf0 || leaf1) || Hash(leaf2 || leaf3))
    // Audit path for leaf0: sibling leaf1, and branch Hash(leaf2 || leaf3)
    std::array<uint8_t, 64> left_branch{};
    std::copy(tx_hashes[0].begin(), tx_hashes[0].end(), left_branch.begin());
    std::copy(tx_hashes[1].begin(), tx_hashes[1].end(), left_branch.begin() + 32);
    core::Hash256 left_hash = crypto::CryptoUtils::sha256(left_branch);

    std::array<uint8_t, 64> right_branch{};
    std::copy(tx_hashes[2].begin(), tx_hashes[2].end(), right_branch.begin());
    std::copy(tx_hashes[3].begin(), tx_hashes[3].end(), right_branch.begin() + 32);
    core::Hash256 right_hash = crypto::CryptoUtils::sha256(right_branch);

    std::array<uint8_t, 64> root_branch{};
    std::copy(left_hash.begin(), left_hash.end(), root_branch.begin());
    std::copy(right_hash.begin(), right_hash.end(), root_branch.begin() + 32);
    core::Hash256 computed_root = crypto::CryptoUtils::sha256(root_branch);

    // Light Client verifies inclusion against block header
    EXPECT_EQ(computed_root, light_header.merkle_root);

    // Tampered transaction fails SPV verification
    core::Hash256 tampered_tx = tx_hashes[0];
    tampered_tx[0] ^= 0xFF;
    std::array<uint8_t, 64> tampered_left{};
    std::copy(tampered_tx.begin(), tampered_tx.end(), tampered_left.begin());
    std::copy(tx_hashes[1].begin(), tx_hashes[1].end(), tampered_left.begin() + 32);
    core::Hash256 tampered_root = crypto::CryptoUtils::sha256(tampered_left);
    EXPECT_NE(tampered_root, light_header.merkle_root);
}

// 2. Multi-Device Cryptographic Authorization & Revocation
TEST_F(ApplicationEcosystemTest, MultiDeviceAuthorizationAndRevocation) {
    messaging::MultiDeviceManager device_mgr;

    // Primary Identity (Alice Master Keypair)
    auto alice_primary = crypto_->generate_keypair();
    std::string alice_address = sdk::BlockBumClient::derive_address(alice_primary.public_key);

    // Secondary Devices: Desktop Workstation & Mobile Phone
    auto desktop_kp = crypto_->generate_keypair();
    auto mobile_kp = crypto_->generate_keypair();

    std::array<uint8_t, 32> dh_dummy{};
    dh_dummy.fill(0xAA);

    // 1. Authorize Desktop Device
    messaging::DeviceRecord rec_desktop;
    rec_desktop.device_id = "device_desktop_win";
    rec_desktop.primary_address = alice_address;
    rec_desktop.device_pubkey = desktop_kp.public_key;
    rec_desktop.device_dh_pubkey = dh_dummy;
    rec_desktop.registered_at = 1700000000;
    auto auth_data_desktop = rec_desktop.serialize_for_auth();
    auto desktop_sig = crypto_->sign(auth_data_desktop, alice_primary.secret_key);

    EXPECT_TRUE(device_mgr.register_device(alice_address, rec_desktop.device_id,
                                           rec_desktop.device_pubkey, rec_desktop.device_dh_pubkey,
                                           desktop_sig, alice_primary.public_key, *crypto_));

    // 2. Authorize Mobile Device
    messaging::DeviceRecord rec_mobile;
    rec_mobile.device_id = "device_mobile_android";
    rec_mobile.primary_address = alice_address;
    rec_mobile.device_pubkey = mobile_kp.public_key;
    rec_mobile.device_dh_pubkey = dh_dummy;
    rec_mobile.registered_at = 1700000100;
    auto auth_data_mobile = rec_mobile.serialize_for_auth();
    auto mobile_sig = crypto_->sign(auth_data_mobile, alice_primary.secret_key);

    EXPECT_TRUE(device_mgr.register_device(alice_address, rec_mobile.device_id,
                                           rec_mobile.device_pubkey, rec_mobile.device_dh_pubkey,
                                           mobile_sig, alice_primary.public_key, *crypto_));

    // Verify both are authorized and active
    EXPECT_TRUE(device_mgr.is_device_active(alice_address, "device_desktop_win"));
    EXPECT_TRUE(device_mgr.is_device_active(alice_address, "device_mobile_android"));
    EXPECT_EQ(device_mgr.get_active_devices(alice_address).size(), 2);

    // 3. Forged Authorization Signature (Attacker attempting unauthorized link)
    auto attacker_kp = crypto_->generate_keypair();
    auto forged_sig = crypto_->sign(auth_data_mobile, attacker_kp.secret_key); // Wrong signer
    EXPECT_FALSE(device_mgr.register_device(alice_address, "device_attacker",
                                            attacker_kp.public_key, dh_dummy,
                                            forged_sig, alice_primary.public_key, *crypto_));

    // 4. Revocation of Mobile Device
    std::string revoke_tag = "BLOCKBUM_DEVICE_REVOKE:" + alice_address + ":device_mobile_android";
    std::span<const uint8_t> revoke_span(reinterpret_cast<const uint8_t*>(revoke_tag.data()), revoke_tag.size());
    auto revoke_sig = crypto_->sign(revoke_span, alice_primary.secret_key);

    EXPECT_TRUE(device_mgr.revoke_device(alice_address, "device_mobile_android",
                                         revoke_sig, alice_primary.public_key, *crypto_));

    EXPECT_FALSE(device_mgr.is_device_active(alice_address, "device_mobile_android"));
    EXPECT_TRUE(device_mgr.is_device_active(alice_address, "device_desktop_win"));
    EXPECT_EQ(device_mgr.get_active_devices(alice_address).size(), 1);
}

// 3. Encrypted Local Storage Vault Serialization & Protection
TEST_F(ApplicationEcosystemTest, EncryptedVaultSerializationAndProtection) {
    // Secret identity payload stored in encrypted vault
    std::string secret_seed_phrase = "galaxy canyon timber fossil rapid orbit velvet trigger nuclear crisp hammer vivid";
    std::vector<uint8_t> plaintext(secret_seed_phrase.begin(), secret_seed_phrase.end());

    // Password-derived encryption key (32 bytes)
    std::string master_password = "SuperSecretMasterPassword2026!";
    core::Hash256 vault_key = crypto::CryptoUtils::sha256(
        std::span<const uint8_t>(reinterpret_cast<const uint8_t*>(master_password.data()), master_password.size()));

    // Deterministic AEAD simulated vault encryption (XOR stream + HMAC/SHA-256 tag)
    std::vector<uint8_t> ciphertext = plaintext;
    for (size_t i = 0; i < ciphertext.size(); ++i) {
        ciphertext[i] = static_cast<uint8_t>(ciphertext[i] ^ vault_key[i % vault_key.size()]);
    }
    core::Hash256 auth_tag = crypto::CryptoUtils::sha256(ciphertext);

    // Serialize vault file
    core::BinarySerializer s;
    s.write_string("BLOCKBUM_ENCRYPTED_VAULT_V1");
    s.write_hash(auth_tag);
    s.write_bytes(ciphertext);
    auto vault_bytes = s.take_data();

    // Deserialize and Decrypt with correct master password
    core::BinaryDeserializer d(vault_bytes);
    std::string header_tag = d.read_string();
    EXPECT_EQ(header_tag, "BLOCKBUM_ENCRYPTED_VAULT_V1");

    auto read_tag = d.read_hash();
    auto read_cipher = d.read_bytes();

    // Verify integrity tag
    core::Hash256 computed_tag = crypto::CryptoUtils::sha256(read_cipher);
    EXPECT_EQ(read_tag, computed_tag);

    // Decrypt
    std::vector<uint8_t> decrypted = read_cipher;
    for (size_t i = 0; i < decrypted.size(); ++i) {
        decrypted[i] = static_cast<uint8_t>(decrypted[i] ^ vault_key[i % vault_key.size()]);
    }
    std::string decrypted_str(decrypted.begin(), decrypted.end());
    EXPECT_EQ(decrypted_str, secret_seed_phrase);

    // Wrong password fails decryption
    std::string wrong_password = "IncorrectPassword!";
    core::Hash256 wrong_key = crypto::CryptoUtils::sha256(
        std::span<const uint8_t>(reinterpret_cast<const uint8_t*>(wrong_password.data()), wrong_password.size()));
    std::vector<uint8_t> bad_decrypt = read_cipher;
    for (size_t i = 0; i < bad_decrypt.size(); ++i) {
        bad_decrypt[i] = static_cast<uint8_t>(bad_decrypt[i] ^ wrong_key[i % wrong_key.size()]);
    }
    std::string bad_str(bad_decrypt.begin(), bad_decrypt.end());
    EXPECT_NE(bad_str, secret_seed_phrase);
}

// 4. Signed Application Update Manifest Verification
TEST_F(ApplicationEcosystemTest, SignedUpdateManifestVerification) {
    auto release_authority = crypto_->generate_keypair();

    std::string manifest_content = "{\"version\":\"0.2.0\",\"package\":\"BlockBum-Setup-0.2.0.msi\",\"sha256\":\"a4f89d30...\"}";
    std::vector<uint8_t> manifest_bytes(manifest_content.begin(), manifest_content.end());

    // Authority signs release manifest with Ed25519 secret key
    auto signature = crypto_->sign(manifest_bytes, release_authority.secret_key);

    // Client verifies manifest signature with published release authority public key
    EXPECT_TRUE(crypto_->verify(manifest_bytes, signature, release_authority.public_key));

    // Tampered update payload is detected and rejected
    std::string tampered_manifest = "{\"version\":\"0.2.0\",\"package\":\"MaliciousBinary.msi\",\"sha256\":\"deadbeef...\"}";
    std::vector<uint8_t> tampered_bytes(tampered_manifest.begin(), tampered_manifest.end());
    EXPECT_FALSE(crypto_->verify(tampered_bytes, signature, release_authority.public_key));
}

// 5. Cross-Platform Bech32 Address Conformance
TEST_F(ApplicationEcosystemTest, CrossPlatformAddressInteroperability) {
    // Valid Bech32 'bb1' addresses from Desktop, Mobile, and Web
    EXPECT_TRUE(sdk::BlockBumClient::validate_address("bb1a729e8c40b82194017de8bf019abcdef0123456"));
    EXPECT_TRUE(sdk::BlockBumClient::validate_address("bb1d9812f8a429019ca5621de8821fedcba9876543"));
    EXPECT_TRUE(sdk::BlockBumClient::validate_address("bb1web778899aabbccddeeff00112233445566778899"));

    // Competing / Invalid blockchain formats strictly rejected
    EXPECT_FALSE(sdk::BlockBumClient::validate_address("0x71C7656EC7ab88b098defB751B7401B5f6d8976F")); // Ethereum
    EXPECT_FALSE(sdk::BlockBumClient::validate_address("bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq")); // Bitcoin Bech32
    EXPECT_FALSE(sdk::BlockBumClient::validate_address("bb1")); // Too short
    EXPECT_FALSE(sdk::BlockBumClient::validate_address("bb1InvalidCharacters!@#"));
}
