#include "blockbum/version.hpp"
#include "blockbum/core/types.hpp"
#include <iostream>

int main(int argc, char* argv[]) {
    (void)argc;
    (void)argv;

    std::cout << "==================================================\n";
    std::cout << "  " << blockbum::PROJECT_NAME << " - Core Node Daemon\n";
    std::cout << "  Version: " << blockbum::get_version_string() << "\n";
    std::cout << "  " << blockbum::PROJECT_DESCRIPTION << "\n";
    std::cout << "==================================================\n";
    std::cout << "Engine status: Foundation initialized.\n";

    // Simple test of core types
    blockbum::core::Hash256 dummy_hash{};
    dummy_hash[0] = 0xDE;
    dummy_hash[1] = 0xAD;
    dummy_hash[2] = 0xBE;
    dummy_hash[3] = 0xEF;
    std::cout << "Sample genesis prefix: 0x" << blockbum::core::to_hex(dummy_hash) << "\n";

    return 0;
}
