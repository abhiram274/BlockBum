include(FetchContent)

# Fetch pico_sha2 for portable header-only SHA-256
FetchContent_Declare(
    pico_sha2
    GIT_REPOSITORY https://github.com/okdshin/PicoSHA2.git
    GIT_TAG        v1.0.0
)
FetchContent_MakeAvailable(pico_sha2)

# Define pico_sha2 as a SYSTEM interface library to suppress third-party compiler warnings
if(NOT TARGET pico_sha2)
    add_library(pico_sha2 INTERFACE)
    target_include_directories(pico_sha2 SYSTEM INTERFACE ${pico_sha2_SOURCE_DIR})
endif()
