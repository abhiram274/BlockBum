#pragma once

#include "blockbum/core/types.hpp"
#include "blockbum/crypto/crypto_utils.hpp"
#include <vector>
#include <span>

namespace blockbum::core {

class MerkleTree {
public:
    static Hash256 compute_root(const std::vector<Hash256>& leaves) {
        if (leaves.empty()) {
            return Hash256{};
        }

        std::vector<Hash256> current_level = leaves;

        while (current_level.size() > 1) {
            std::vector<Hash256> next_level;
            next_level.reserve((current_level.size() + 1) / 2);

            for (size_t i = 0; i < current_level.size(); i += 2) {
                const auto& left = current_level[i];
                const auto& right = (i + 1 < current_level.size()) ? current_level[i + 1] : left;

                std::array<uint8_t, 64> combined{};
                std::copy(left.begin(), left.end(), combined.begin());
                std::copy(right.begin(), right.end(), combined.begin() + 32);

                next_level.push_back(crypto::CryptoUtils::sha256(combined));
            }

            current_level = std::move(next_level);
        }

        return current_level.front();
    }
};

} // namespace blockbum::core
