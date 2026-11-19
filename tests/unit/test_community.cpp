#include <gtest/gtest.h>
#include "blockbum/community/types.hpp"
#include "blockbum/community/community_service.hpp"
#include "blockbum/core/blockchain.hpp"
#include "blockbum/storage/file_storage.hpp"
#include "blockbum/content/content_manager.hpp"
#include "blockbum/content/content_store.hpp"
#include "blockbum/crypto/standard_crypto.hpp"
#include "blockbum/crypto/wallet.hpp"
#include <filesystem>

using namespace blockbum;

class CommunityPlatformTest : public ::testing::Test {
protected:
    void SetUp() override {
        test_dir_ = std::filesystem::temp_directory_path() / "blockbum_comm_test";
        std::filesystem::remove_all(test_dir_);

        storage_ = std::make_shared<storage::FileStorageEngine>();
        storage_->open((test_dir_ / "chain_store").string());

        chain_ = std::make_shared<core::Blockchain>(storage_);
        chain_->initialize();

        content_store_ = std::make_shared<content::ContentStore>(test_dir_ / "content_cas");
        content_mgr_ = std::make_shared<content::ContentManager>(content_store_);

        crypto_ = std::make_shared<crypto::StandardCryptoEngine>();
        wallet_ = std::make_unique<crypto::Wallet>(test_dir_ / "wallet", crypto_);
    }

    void TearDown() override {
        if (storage_) storage_->close();
        std::filesystem::remove_all(test_dir_);
    }

    std::filesystem::path test_dir_;
    std::shared_ptr<storage::FileStorageEngine> storage_;
    std::shared_ptr<core::Blockchain> chain_;
    std::shared_ptr<content::ContentStore> content_store_;
    std::shared_ptr<content::ContentManager> content_mgr_;
    std::shared_ptr<crypto::StandardCryptoEngine> crypto_;
    std::unique_ptr<crypto::Wallet> wallet_;
};

TEST_F(CommunityPlatformTest, CreateAndDiscoverPublicCommunity) {
    community::CommunityService comm_service(chain_, content_mgr_);
    auto alice = wallet_->create_identity("alice");

    auto comm = comm_service.create_community(
        "rust_devs", "Rust Developers", "Decentralized Rust enthusiasts",
        community::CommunityVisibility::Public, alice.address());

    EXPECT_EQ(comm.id, "rust_devs");
    EXPECT_EQ(comm.owner_address, alice.address());
    EXPECT_EQ(comm.channels.size(), 1); // general

    // Verify creator is owner
    EXPECT_TRUE(comm_service.has_permission("rust_devs", alice.address(), community::MemberRole::Owner));

    // Verify discovery
    auto discovered = comm_service.discover_communities(alice.address());
    EXPECT_EQ(discovered.size(), 1);
    EXPECT_EQ(discovered[0].name, "Rust Developers");

    // Verify on-chain governance block was anchored
    EXPECT_GE(chain_->height(), 1);
}

TEST_F(CommunityPlatformTest, PrivateCommunityAccessControlAndInvitations) {
    community::CommunityService comm_service(chain_, content_mgr_);
    auto alice = wallet_->create_identity("alice");
    auto bob = wallet_->create_identity("bob");
    auto charlie = wallet_->create_identity("charlie");

    // Alice creates private research community
    comm_service.create_community(
        "core_research", "Core Research", "Private R&D Lab",
        community::CommunityVisibility::Private, alice.address());

    // Bob cannot join without invitation token
    EXPECT_FALSE(comm_service.join_community("core_research", bob.address()));
    EXPECT_FALSE(comm_service.has_permission("core_research", bob.address(), community::MemberRole::Member));

    // Alice generates invitation token for Bob
    std::string token = comm_service.generate_invitation("core_research", alice.address());
    EXPECT_FALSE(token.empty());

    // Bob joins successfully using invitation
    EXPECT_TRUE(comm_service.join_community("core_research", bob.address(), token));
    EXPECT_TRUE(comm_service.has_permission("core_research", bob.address(), community::MemberRole::Member));

    // Charlie has no invite and cannot see private community in discovery
    auto charlie_discovered = comm_service.discover_communities(charlie.address());
    EXPECT_EQ(charlie_discovered.size(), 0);
}

TEST_F(CommunityPlatformTest, RolesAndPermissionEnforcement) {
    community::CommunityService comm_service(chain_, content_mgr_);
    auto alice = wallet_->create_identity("alice");
    auto bob = wallet_->create_identity("bob");
    auto charlie = wallet_->create_identity("charlie");

    comm_service.create_community("game_dev", "Game Dev", "Indie Game Developers",
                                 community::CommunityVisibility::Public, alice.address());

    comm_service.join_community("game_dev", bob.address());
    comm_service.join_community("game_dev", charlie.address());

    // Bob is regular member: cannot add channels
    EXPECT_FALSE(comm_service.add_channel("game_dev", bob.address(), {"shaders", "shaders", "GLSL shaders", false}));

    // Alice promotes Bob to Admin
    EXPECT_TRUE(comm_service.assign_role("game_dev", alice.address(), bob.address(), community::MemberRole::Admin));
    EXPECT_TRUE(comm_service.has_permission("game_dev", bob.address(), community::MemberRole::Admin));

    // Bob can now add channels
    EXPECT_TRUE(comm_service.add_channel("game_dev", bob.address(), {"shaders", "shaders", "GLSL shaders", false}));

    auto comm = comm_service.get_community("game_dev");
    ASSERT_TRUE(comm.has_value());
    EXPECT_EQ(comm->channels.size(), 2); // general + shaders
}

TEST_F(CommunityPlatformTest, CodingChallengesAndEducationalResources) {
    community::CommunityService comm_service(chain_, content_mgr_);
    auto alice = wallet_->create_identity("alice");

    comm_service.create_community("algorithms", "Algorithms Club", "Data Structures & Algos",
                                 community::CommunityVisibility::Public, alice.address());

    // Post coding challenge
    community::CodingChallenge challenge;
    challenge.challenge_id = "two_sum";
    challenge.title = "Two Sum Problem";
    challenge.description = "Find two numbers in array that add up to target.";
    challenge.difficulty = "Easy";
    challenge.reward_points = 50;

    EXPECT_TRUE(comm_service.post_coding_challenge("algorithms", alice.address(), challenge));

    // Share educational PDF resource
    std::vector<uint8_t> course_pdf = {'%', 'P', 'D', 'F', '-', '1', '.', '4', ' ', 'D', 'a', 't', 'a'};
    auto upload = content_mgr_->prepare_and_store_file("DSA_Notes.pdf", content::FileContentType::DocumentPDF, course_pdf, alice, true);

    EXPECT_TRUE(comm_service.share_educational_resource("algorithms", alice.address(), upload.manifest.root_cid));

    auto comm = comm_service.get_community("algorithms");
    ASSERT_TRUE(comm.has_value());
    EXPECT_EQ(comm->challenges.size(), 1);
    EXPECT_EQ(comm->educational_resource_cids.size(), 1);
    EXPECT_EQ(comm->educational_resource_cids[0], upload.manifest.root_cid);
}
