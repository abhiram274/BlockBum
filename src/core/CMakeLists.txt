add_library(blockbum_core STATIC
    src/types.cpp
)

target_include_directories(blockbum_core
    PUBLIC
        $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
        $<BUILD_INTERFACE:${CMAKE_BINARY_DIR}/include>
        $<INSTALL_INTERFACE:include>
)

blockbum_set_compiler_warnings(blockbum_core)
