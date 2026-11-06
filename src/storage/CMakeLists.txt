add_library(blockbum_storage INTERFACE)

target_include_directories(blockbum_storage
    INTERFACE
        $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
        $<INSTALL_INTERFACE:include>
)

target_link_libraries(blockbum_storage INTERFACE blockbum_core)
