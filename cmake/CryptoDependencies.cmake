#include "FetchContent"

# Fetch pico_sha2 for portable header-only SHA-256
FetchContent_Declare(
    pico_sha2
    GIT_REPOSITORY https://github.com/okdshin/PicoSHA2.git
    GIT_TAG        v1.0.0
)
FetchContent_MakeAvailable(pico_sha2)
