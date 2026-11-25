cmake_minimum_required(VERSION 3.20)

# Optional Native Qt GUI Desktop Application: blockbum-qt
find_package(Qt6 COMPONENTS Widgets Core Gui QUIET)
if(NOT Qt6_FOUND)
    find_package(Qt5 COMPONENTS Widgets Core Gui QUIET)
endif()

if(Qt6_FOUND OR Qt5_FOUND)
    message(STATUS "Qt framework detected - configuring native desktop client: blockbum-qt")
    set(CMAKE_AUTOMOC ON)
    set(CMAKE_AUTORCC ON)
    set(CMAKE_AUTOUIC ON)

    set(QT_SOURCES
        main.cpp
        mainwindow.cpp
        overviewpage.cpp
        sendcoinsdialog.cpp
        receivecoinsdialog.cpp
        resources.qrc
    )

    set(QT_HEADERS
        mainwindow.hpp
        overviewpage.hpp
        sendcoinsdialog.hpp
        receivecoinsdialog.hpp
    )

    add_executable(blockbum-qt ${QT_SOURCES} ${QT_HEADERS})

    if(Qt6_FOUND)
        target_link_libraries(blockbum-qt PRIVATE
            Qt6::Widgets
            Qt6::Core
            Qt6::Gui
            blockbum_core
            blockbum_crypto
            blockbum_storage
            blockbum_network
            blockbum_messaging
        )
    else()
        target_link_libraries(blockbum-qt PRIVATE
            Qt5::Widgets
            Qt5::Core
            Qt5::Gui
            blockbum_core
            blockbum_crypto
            blockbum_storage
            blockbum_network
            blockbum_messaging
        )
    endif()

    target_include_directories(blockbum-qt PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}
        ${CMAKE_SOURCE_DIR}/src/core/include
        ${CMAKE_SOURCE_DIR}/src/crypto/include
        ${CMAKE_SOURCE_DIR}/src/storage/include
        ${CMAKE_SOURCE_DIR}/src/network/include
        ${CMAKE_SOURCE_DIR}/src/messaging/include
        ${CMAKE_SOURCE_DIR}/src/node/include
    )
    blockbum_set_compiler_warnings(blockbum-qt)
else()
    message(STATUS "Qt framework not detected - blockbum-qt native desktop target will be skipped (optional GUI)")
endif()
