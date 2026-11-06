#include <gtest/gtest.h>
#include "blockbum/version.hpp"

TEST(VersionTest, VersionStringIsNotEmpty) {
    EXPECT_FALSE(blockbum::PROJECT_NAME.empty());
    EXPECT_FALSE(blockbum::PROJECT_VERSION.empty());
    EXPECT_EQ(blockbum::get_version_string(), blockbum::PROJECT_VERSION);
}

TEST(VersionTest, SemanticVersionComponents) {
    EXPECT_EQ(blockbum::VERSION_MAJOR, 0);
    EXPECT_EQ(blockbum::VERSION_MINOR, 1);
    EXPECT_EQ(blockbum::VERSION_PATCH, 0);
}
