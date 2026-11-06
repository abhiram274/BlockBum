add_library(blockbum_network INTERFACE)

target_include_directories(blockbum_network
    INTERFACE
        $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
        $<INSTALL_INTERFACE:include>
)

target_link_libraries(blockbum_network INTERFACE blockbum_core)
