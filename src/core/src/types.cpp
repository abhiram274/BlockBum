#include "blockbum/core/types.hpp"
#include <iomanip>
#include <sstream>
#include <stdexcept>

namespace blockbum::core {

std::string to_hex(std::span<const uint8_t> bytes) {
    std::ostringstream oss;
    oss << std::hex << std::setfill('0');
    for (uint8_t byte : bytes) {
        oss << std::setw(2) << static_cast<int>(byte);
    }
    return oss.str();
}

std::vector<uint8_t> from_hex(std::string_view hex_str) {
    if (hex_str.size() % 2 != 0) {
        throw std::invalid_argument("Hex string must have an even number of characters");
    }

    std::vector<uint8_t> bytes;
    bytes.reserve(hex_str.size() / 2);

    for (size_t i = 0; i < hex_str.size(); i += 2) {
        std::string byte_string = std::string(hex_str.substr(i, 2));
        auto byte = static_cast<uint8_t>(std::stoul(byte_string, nullptr, 16));
        bytes.push_back(byte);
    }

    return bytes;
}

} // namespace blockbum::core
