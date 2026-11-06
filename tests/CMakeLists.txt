include(FetchContent)

# Fetch GoogleTest
FetchContent_Declare(
    googletest
    GIT_REPOSITORY https://github.com/google/googletest.git
    GIT_TAG        v1.14.0
)

# For Windows: Prevent overriding the parent project's compiler/linker settings
set(gtest_force_shared_crt ON CACHE BOOL "" FORCE)

FetchContent_MakeAvailable(googletest)

include(GoogleTest)

# Test target
add_executable(blockbum_tests
    unit/test_version.cpp
    unit/test_interfaces.cpp
)

target_link_libraries(blockbum_tests PRIVATE
    blockbum_core
    blockbum_crypto
    blockbum_storage
    blockbum_network
    GTest::gtest_main
)

blockbum_set_compiler_warnings(blockbum_tests)

gtest_discover_tests(blockbum_tests)
