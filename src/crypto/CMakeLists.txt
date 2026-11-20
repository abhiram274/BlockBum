add_library(monocypher STATIC
    third_party/monocypher/monocypher.c
    third_party/monocypher/monocypher-ed25519.c
)

target_include_directories(monocypher
    PUBLIC
        $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/third_party/monocypher>
)

if(MSVC)
    target_compile_options(monocypher PRIVATE /W0)
else()
    target_compile_options(monocypher PRIVATE -w)
endif()

add_library(blockbum_crypto INTERFACE)

target_include_directories(blockbum_crypto
    INTERFACE
        $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
        $<INSTALL_INTERFACE:include>
)

target_link_libraries(blockbum_crypto
    INTERFACE
        pico_sha2
        blockbum_core
        monocypher
)
