#include <gtest/gtest.h>
#include "blockbum/core/types.hpp"
#include "blockbum/core/serializer.hpp"
#include "blockbum/core/transaction.hpp"
#include "blockbum/core/block.hpp"
#include "blockbum/core/merkle_tree.hpp"
#include "blockbum/crypto/crypto_utils.hpp"
#include "blockbum/crypto/standard_crypto.hpp"
#include "blockbum/crypto/e2e_encryption.hpp"
#include "blockbum/network/wire_protocol.hpp"
#include <string>
#include <vector>
#include <array>
#include <cstring>

using namespace blockbum::core;
using namespace blockbum::crypto;
using namespace blockbum::network;

// =========================================================================
// 1. Primitive Serialization Test Vectors (BB-SPEC-08 §2)
// =========================================================================
TEST(ProtocolVectorsTest, PrimitiveSerializationEncodings) {
    // uint8_t 0x42
    {
        BinarySerializer s;
        s.write_u8(0x42);
        EXPECT_EQ(to_hex(s.data()), "42");
        BinaryDeserializer d(s.data());
        EXPECT_EQ(d.read_u8(), 0x42);
    }

    // uint16_t 0x1234
    {
        BinarySerializer s;
        s.write_u16(0x1234);
        EXPECT_EQ(to_hex(s.data()), "3412");
        BinaryDeserializer d(s.data());
        EXPECT_EQ(d.read_u16(), 0x1234);
    }

    // uint32_t 0xdeadbeef
    {
        BinarySerializer s;
        s.write_u32(0xdeadbeef);
        EXPECT_EQ(to_hex(s.data()), "efbeadde");
        BinaryDeserializer d(s.data());
        EXPECT_EQ(d.read_u32(), 0xdeadbeef);
    }

    // uint64_t 0x0102030405060708
    {
        BinarySerializer s;
        s.write_u64(0x0102030405060708ULL);
        EXPECT_EQ(to_hex(s.data()), "0807060504030201");
        BinaryDeserializer d(s.data());
        EXPECT_EQ(d.read_u64(), 0x0102030405060708ULL);
    }

    // string "BlockBum"
    {
        BinarySerializer s;
        s.write_string("BlockBum");
        EXPECT_EQ(to_hex(s.data()), "08000000426c6f636b42756d");
        BinaryDeserializer d(s.data());
        EXPECT_EQ(d.read_string(), "BlockBum");
    }

    // bytes {0xaa, 0xbb, 0xcc}
    {
        std::vector<uint8_t> payload = {0xaa, 0xbb, 0xcc};
        BinarySerializer s;
        s.write_bytes(payload);
        EXPECT_EQ(to_hex(s.data()), "03000000aabbcc");
        BinaryDeserializer d(s.data());
        EXPECT_EQ(d.read_bytes(), payload);
    }
}

// =========================================================================
// 2. Cryptographic Address Derivation Test Vector (BB-SPEC-08 §3)
// =========================================================================
TEST(ProtocolVectorsTest, AddressDerivationVector) {
    auto pub_bytes = from_hex("d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a");
    ASSERT_EQ(pub_bytes.size(), 32U);

    PublicKey pubkey{};
    std::memcpy(pubkey.data(), pub_bytes.data(), 32);

    std::string expected_address = "bb1d75a980182b10ab7d54bfed3c964073a0ee172f3";
    std::string actual_address = "bb1" + to_hex(pubkey).substr(0, 40);

    EXPECT_EQ(actual_address, expected_address);
}

// =========================================================================
// 3. Merkle Tree Root Computation Vectors (BB-SPEC-08 §4)
// =========================================================================
TEST(ProtocolVectorsTest, MerkleTreeRootVectors) {
    // 3.1 Empty leaf set -> 32 zero bytes
    Hash256 empty_root = MerkleTree::compute_root({});
    EXPECT_EQ(to_hex(empty_root), "0000000000000000000000000000000000000000000000000000000000000000");

    // 3.2 Single leaf set
    Hash256 h1 = CryptoUtils::sha256("tx1");
    EXPECT_EQ(to_hex(h1), "709b55bd3da0f5a838125bd0ee20c5bfdd7caba173912d4281cae816b79a201b");

    Hash256 root_single = MerkleTree::compute_root({h1});
    EXPECT_EQ(root_single, h1);

    // 3.3 Two leaves
    Hash256 h2 = CryptoUtils::sha256("tx2");
    EXPECT_EQ(to_hex(h2), "27ca64c092a959c7edc525ed45e845b1de6a7590d173fd2fad9133c8a779a1e3");

    Hash256 root_pair = MerkleTree::compute_root({h1, h2});
    EXPECT_EQ(to_hex(root_pair), "bbea820f07f7f89aeea1ab4a354ecea39f2f72accd05c64371522ee371cd0c48");
}

// =========================================================================
// 4. BlockHeader Serialization & Hash Vector (BB-SPEC-08 §5)
// =========================================================================
TEST(ProtocolVectorsTest, BlockHeaderSerializationAndHashVector) {
    BlockHeader h;
    h.version = 1;
    h.height = 10;
    h.previous_hash.fill(0x11);
    h.merkle_root.fill(0x22);
    h.timestamp = 1700000000;
    h.nonce = 42;

    auto serialized = h.serialize();
    EXPECT_EQ(serialized.size(), 92U);

    std::string expected_hex =
        "010000000a00000000000000"
        "1111111111111111111111111111111111111111111111111111111111111111"
        "2222222222222222222222222222222222222222222222222222222222222222"
        "00f1536500000000"
        "2a00000000000000";

    EXPECT_EQ(to_hex(serialized), expected_hex);

    Hash256 block_hash = CryptoUtils::sha256(serialized);
    EXPECT_EQ(to_hex(block_hash), "7318e57793f3fa1bf9d7153c86d8cb9b1ac8aa0246f3852480fecb701e159e0b");

    // Deserialization round-trip
    BinaryDeserializer d(serialized);
    BlockHeader deserialized = BlockHeader::deserialize(d);
    EXPECT_EQ(deserialized.version, h.version);
    EXPECT_EQ(deserialized.height, h.height);
    EXPECT_EQ(deserialized.previous_hash, h.previous_hash);
    EXPECT_EQ(deserialized.merkle_root, h.merkle_root);
    EXPECT_EQ(deserialized.timestamp, h.timestamp);
    EXPECT_EQ(deserialized.nonce, h.nonce);
}

// =========================================================================
// 5. Transaction Pre-Image & ID Vector (BB-SPEC-08 §6)
// =========================================================================
TEST(ProtocolVectorsTest, TransactionPreImageAndIdVector) {
    Transaction tx;
    tx.version = 1;
    tx.sender = "bb1sender";
    tx.recipient = "bb1recipient";
    tx.amount = 5000000;
    tx.fee = 1000;
    tx.nonce = 1;
    std::string payload_str = "hello";
    tx.payload = std::vector<uint8_t>(payload_str.begin(), payload_str.end());
    tx.timestamp = 1700000000;
    tx.sender_pubkey.fill(0x00);

    auto preimage = tx.serialize_for_id();
    EXPECT_EQ(preimage.size(), 110U);

    std::string expected_preimage_hex =
        "01000000"                                                              // version (4B)
        "0900000062623173656e646572"                                          // sender (4B len + 9B)
        "0c000000626231726563697069656e74"                                  // recipient (4B len + 12B)
        "404b4c0000000000"                                                      // amount = 5000000 (8B)
        "e803000000000000"                                                      // fee = 1000 (8B)
        "0100000000000000"                                                      // nonce = 1 (8B)
        "0500000068656c6c6f"                                                    // payload (4B len + 5B)
        "00f1536500000000"                                                      // timestamp = 1700000000 (8B)
        "200000000000000000000000000000000000000000000000000000000000000000000000"; // sender_pubkey (4B len + 32B)

    EXPECT_EQ(to_hex(preimage), expected_preimage_hex);

    Hash256 tx_id = CryptoUtils::sha256(preimage);
    EXPECT_EQ(to_hex(tx_id), "2b2b0a67e2841acac6a67df13bc360878891401065798827a1def21663ec5515");
}

// =========================================================================
// 6. Network Wire Header Framing Vector (BB-SPEC-08 §7)
// =========================================================================
TEST(ProtocolVectorsTest, NetworkWireHeaderFramingVector) {
    MessageHeader h;
    h.magic = PROTOCOL_MAGIC;
    h.version = 1;
    h.type = MessageType::Ping;
    h.payload_size = 0;

    auto serialized = h.serialize();
    EXPECT_EQ(serialized.size(), 13U);
    EXPECT_EQ(to_hex(serialized), "4242554d010000000100000000");

    BinaryDeserializer d(serialized);
    MessageHeader deserialized = MessageHeader::deserialize(d);
    EXPECT_EQ(deserialized.magic, PROTOCOL_MAGIC);
    EXPECT_EQ(deserialized.version, 1U);
    EXPECT_EQ(deserialized.type, MessageType::Ping);
    EXPECT_EQ(deserialized.payload_size, 0U);
}

// =========================================================================
// 7. Cryptographic Ed25519 & E2EE Verification Vector
// =========================================================================
TEST(ProtocolVectorsTest, Ed25519AndE2EEKeyAgreement) {
    StandardCryptoEngine engine;

    auto seed = from_hex("9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60");
    ASSERT_EQ(seed.size(), 32U);

    auto kp = engine.derive_keypair_from_seed(seed);
    EXPECT_EQ(to_hex(kp.public_key), "d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a");

    std::string msg = "BlockBum Protocol v1 Verification";
    std::vector<uint8_t> msg_bytes(msg.begin(), msg.end());
    auto sig = engine.sign(msg_bytes, kp.secret_key);
    EXPECT_TRUE(engine.verify(msg_bytes, sig, kp.public_key));

    // Peer B keypair
    auto peer_seed = from_hex("4ccd089b28ff96da9db6c346ec114e0f5b8a319f35aba624da8cf6ed4fb8a6fb");
    auto peer_kp = engine.derive_keypair_from_seed(peer_seed);

    // Both parties compute symmetric shared secret
    auto secret_a = E2EEncryptionEngine::compute_shared_secret(peer_kp.public_key, kp.public_key, kp.secret_key);
    auto secret_b = E2EEncryptionEngine::compute_shared_secret(kp.public_key, peer_kp.public_key, peer_kp.secret_key);

    EXPECT_EQ(secret_a, secret_b);

    // E2EE AEAD Encrypt / Decrypt
    uint64_t nonce = 101;
    auto ciphertext = E2EEncryptionEngine::encrypt(msg_bytes, secret_a, nonce);
    auto decrypted = E2EEncryptionEngine::decrypt(ciphertext, secret_b, nonce);

    EXPECT_EQ(decrypted, msg_bytes);
}
