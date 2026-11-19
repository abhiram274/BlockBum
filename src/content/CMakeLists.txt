add_library(blockbum_content INTERFACE)

target_include_directories(blockbum_content
    INTERFACE
        $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
        $<INSTALL_INTERFACE:include>
)

target_link_libraries(blockbum_content INTERFACE
    blockbum_core
    blockbum_crypto
    blockbum_storage
    blockbum_network
)
