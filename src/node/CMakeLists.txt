add_executable(blockbum_node
    main.cpp
)

target_link_libraries(blockbum_node PRIVATE
    blockbum_core
    blockbum_crypto
    blockbum_storage
    blockbum_network
    blockbum_messaging
    blockbum_content
    blockbum_community
)

if(WIN32)
    target_link_libraries(blockbum_node PRIVATE ws2_32)
endif()

blockbum_set_compiler_warnings(blockbum_node)

install(TARGETS blockbum_node DESTINATION bin)
