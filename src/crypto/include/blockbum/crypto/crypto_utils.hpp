#pragma once

#include "blockbum/core/types.hpp"
#include "picosha2.h"
#include <span>
#include <string_view>
#include <vector>

namespace blockbum::crypto {

class CryptoUtils {
public:
    static core::Hash256 sha256(std::span<const uint8_t> data) {
        core::Hash256 hash{};
        picosha2::hash256(data.begin(), data.end(), hash.begin(), hash.end());
        return hash;
    }

    static core::Hash256 sha256(std::string_view str) {
        core::Hash256 hash{};
        picosha2::hash256(str.begin(), str.end(), hash.begin(), hash.end());
        return hash;
    }

    static core::Hash256 double_sha256(std::span<const uint8_t> data) {
        auto first = sha256(data);
        return sha256(std::span<const uint8_t>(first.data(), first.size()));
    }
};

} // namespace blockbum::crypto
