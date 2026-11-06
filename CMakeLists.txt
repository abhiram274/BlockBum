cmake_minimum_required(VERSION 3.20)

project(
    BlockBum
    VERSION 0.1.0
    DESCRIPTION "BlockBum Network - Decentralized P2P Communication & Content Blockchain Node"
    LANGUAGES C CXX
)

# Enforce C++20 standard
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Export compile commands for language servers (clangd, etc.)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

# Custom CMake modules
list(APPEND CMAKE_MODULE_PATH "${CMAKE_CURRENT_SOURCE_DIR}/cmake")
include(PreventInSourceBuilds)

# Options
option(BLOCKBUM_BUILD_TESTS "Build BlockBum test suite" ON)
option(BLOCKBUM_BUILD_NODE "Build BlockBum node executable" ON)
option(BLOCKBUM_WARNINGS_AS_ERRORS "Treat compiler warnings as errors" OFF)

# Configured version header
configure_file(
    "${CMAKE_CURRENT_SOURCE_DIR}/include/blockbum/version.hpp.in"
    "${CMAKE_CURRENT_BINARY_DIR}/include/blockbum/version.hpp"
    @ONLY
)

# Common compiler warnings helper function
function(blockbum_set_compiler_warnings target_name)
    if(MSVC)
        target_compile_options(${target_name} PRIVATE
            /W4
            $<$<BOOL:${BLOCKBUM_WARNINGS_AS_ERRORS}>:/WX>
            /permissive-
            /Zc:__cplusplus
        )
    else()
        target_compile_options(${target_name} PRIVATE
            -Wall
            -Wextra
            -Wpedantic
            -Wconversion
            -Wsign-conversion
            $<$<BOOL:${BLOCKBUM_WARNINGS_AS_ERRORS}>:-Werror>
        )
    endif()
endfunction()

# Subdirectories for modular subsystems
add_subdirectory(src/core)
add_subdirectory(src/crypto)
add_subdirectory(src/storage)
add_subdirectory(src/network)

# Node daemon application
if(BLOCKBUM_BUILD_NODE)
    add_subdirectory(src/node)
endif()

# Automated testing with GoogleTest
if(BLOCKBUM_BUILD_TESTS)
    enable_testing()
    add_subdirectory(tests)
endif()
