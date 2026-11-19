include(FetchContent)

FetchContent_Declare(
    googletest
    GIT_REPOSITORY https://github.com/google/googletest.git
    GIT_TAG        v1.14.0
)

set(gtest_force_shared_crt ON CACHE BOOL "" FORCE)

FetchContent_MakeAvailable(googletest)

include(GoogleTest)

add_executable(blockbum_tests
    unit/test_version.cpp
    unit/test_interfaces.cpp
    unit/test_blockchain.cpp
    unit/test_p2p_network.cpp
    unit/test_wallet.cpp
    unit/test_messaging.cpp
    unit/test_content_sharing.cpp
    unit/test_community.cpp
    unit/test_token_ledger.cpp
)

target_link_libraries(blockbum_tests PRIVATE
    blockbum_core
    blockbum_crypto
    blockbum_storage
    blockbum_network
    blockbum_messaging
    blockbum_content
    blockbum_community
    GTest::gtest_main
)

if(WIN32)
    target_link_libraries(blockbum_tests PRIVATE ws2_32)
endif()

blockbum_set_compiler_warnings(blockbum_tests)

gtest_discover_tests(blockbum_tests)
