#pragma once

#include "blockbum/core/types.hpp"
#include "blockbum/core/block.hpp"
#include "blockbum/core/blockchain.hpp"
#include <string>
#include <vector>
#include <algorithm>

namespace blockbum::consensus {

class DevNetConsensus {
public:
    explicit DevNetConsensus(std::vector<std::string> authorized_validators)
        : validators_(std::move(authorized_validators)) {
        std::sort(validators_.begin(), validators_.end());
    }

    [[nodiscard]] std::string get_scheduled_proposer(core::BlockHeight height) const {
        if (validators_.empty()) {
            return "DevNode";
        }
        size_t idx = static_cast<size_t>(height % validators_.size());
        return validators_[idx];
    }

    [[nodiscard]] bool is_authorized(const std::string& validator_id) const {
        if (validators_.empty()) return true;
        return std::binary_search(validators_.begin(), validators_.end(), validator_id);
    }

    [[nodiscard]] bool validate_block_consensus(const core::Block& block) const {
        if (validators_.empty()) return true;

        std::string expected_proposer = get_scheduled_proposer(block.header.height);
        if (block.transactions.empty()) {
            return false;
        }

        // In DevNet round-robin PoA, first transaction must originate from the assigned proposer
        const auto& coinbase_or_proposer_tx = block.transactions[0];
        if (coinbase_or_proposer_tx.sender != expected_proposer) {
            return false;
        }

        return true;
    }

private:
    std::vector<std::string> validators_;
};

} // namespace blockbum::consensus
