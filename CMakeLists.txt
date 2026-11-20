cmake_minimum_required(VERSION 3.20)

project(
    BlockBum
    VERSION 0.1.0
    DESCRIPTION "BlockBum Network - Decentralized P2P Communication & Content Blockchain Node"
    LANGUAGES C CXX
)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

list(APPEND CMAKE_MODULE_PATH "${CMAKE_CURRENT_SOURCE_DIR}/cmake")
include(PreventInSourceBuilds)
include(CryptoDependencies)

option(BLOCKBUM_BUILD_TESTS "Build BlockBum test suite" ON)
option(BLOCKBUM_BUILD_NODE "Build BlockBum node executable" ON)
option(BLOCKBUM_WARNINGS_AS_ERRORS "Treat compiler warnings as errors" OFF)

configure_file(
    "${CMAKE_CURRENT_SOURCE_DIR}/include/blockbum/version.hpp.in"
    "${CMAKE_CURRENT_BINARY_DIR}/include/blockbum/version.hpp"
    @ONLY
)

function(blockbum_set_compiler_warnings target_name)
    if(MSVC)
        target_compile_options(${target_name} PRIVATE
            /W4
            /EHsc
            $<$<BOOL:${BLOCKBUM_WARNINGS_AS_ERRORS}>:/WX>
            /permissive-
            /Zc:__cplusplus
            /DNOMINMAX
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

add_subdirectory(src/crypto)
add_subdirectory(src/core)
add_subdirectory(src/storage)
add_subdirectory(src/network)
add_subdirectory(src/messaging)
add_subdirectory(src/content)
add_subdirectory(src/community)

if(BLOCKBUM_BUILD_NODE)
    add_subdirectory(src/node)
endif()

if(BLOCKBUM_BUILD_TESTS)
    enable_testing()
    add_subdirectory(tests)
endif()
