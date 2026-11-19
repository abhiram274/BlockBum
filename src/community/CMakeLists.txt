add_library(blockbum_community INTERFACE)

target_include_directories(blockbum_community
    INTERFACE
        $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
        $<INSTALL_INTERFACE:include>
)

target_link_libraries(blockbum_community INTERFACE
    blockbum_core
    blockbum_crypto
    blockbum_storage
    blockbum_network
    blockbum_messaging
    blockbum_content
)
