add_library(blockbum_messaging INTERFACE)

target_include_directories(blockbum_messaging
    INTERFACE
        $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
        $<INSTALL_INTERFACE:include>
)

target_link_libraries(blockbum_messaging INTERFACE
    blockbum_core
    blockbum_crypto
    blockbum_network
)
