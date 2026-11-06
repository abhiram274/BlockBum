add_library(blockbum_crypto INTERFACE)

target_include_directories(blockbum_crypto
    INTERFACE
        $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
        $<INSTALL_INTERFACE:include>
)

target_link_libraries(blockbum_crypto INTERFACE blockbum_core)
