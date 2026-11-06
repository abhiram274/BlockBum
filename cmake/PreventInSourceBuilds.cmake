# Prevent in-source builds to keep working directory clean
function(prevent_in_source_builds)
    get_filename_component(srcdir "${CMAKE_SOURCE_DIR}" REALPATH)
    get_filename_component(bindir "${CMAKE_BINARY_DIR}" REALPATH)

    if("${srcdir}" STREQUAL "${bindir}")
        message(FATAL_ERROR
            "In-source builds are forbidden.\n"
            "Please create a dedicated build directory (e.g. `mkdir build && cd build`) and invoke cmake from there."
        )
    endif()
endfunction()

prevent_in_source_builds()
