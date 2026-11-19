#include "blockbum/version.hpp"
#include "blockbum/core/types.hpp"
#include "blockbum/core/blockchain.hpp"
#include "blockbum/storage/file_storage.hpp"
#include <iostream>
#include <memory>
#include <string>
#include <chrono>

void print_usage() {
    std::cout << "Usage: blockbum_node <command> [options]\n\n"
              << "Commands:\n"
              << "  init                     Initialize genesis block in local storage\n"
              << "  status                   Display current blockchain height and tip hash\n"
              << "  create-block <msg>       Create and append a new block with a payload\n"
              << "  list                     List all blocks in the local chain\n"
              << "  validate                 Validate the entire chain structure and hashes\n"
              << "  --version, -v            Print BlockBum version\n";
}

int main(int argc, char* argv[]) {
    if (argc < 2) {
        std::cout << "==================================================\n";
        std::cout << "  " << blockbum::PROJECT_NAME << " - Core Node Daemon\n";
        std::cout << "  Version: " << blockbum::get_version_string() << "\n";
        std::cout << "  " << blockbum::PROJECT_DESCRIPTION << "\n";
        std::cout << "==================================================\n\n";
        print_usage();
        return 0;
    }

    std::string command = argv[1];

    if (command == "--version" || command == "-v") {
        std::cout << "BlockBum v" << blockbum::get_version_string() << "\n";
        return 0;
    }

    auto storage = std::make_shared<blockbum::storage::FileStorageEngine>();
    std::string data_path = "data/devnet";
    if (!storage->open(data_path)) {
        std::cerr << "Error: Failed to open storage at " << data_path << "\n";
        return 1;
    }

    blockbum::core::Blockchain chain(storage);
    if (!chain.initialize()) {
        std::cerr << "Error: Failed to initialize blockchain from storage\n";
        return 1;
    }

    if (command == "init") {
        std::cout << "[SUCCESS] Blockchain initialized. Height: " << chain.height() << "\n";
        auto tip = chain.get_tip_block();
        if (tip) {
            std::cout << "Tip Hash: 0x" << blockbum::core::to_hex(tip->block_hash) << "\n";
        }
    } else if (command == "status") {
        std::cout << "Blockchain Status:\n";
        std::cout << "  Current Height: " << chain.height() << "\n";
        auto tip = chain.get_tip_block();
        if (tip) {
            std::cout << "  Tip Hash:       0x" << blockbum::core::to_hex(tip->block_hash) << "\n";
            std::cout << "  Transactions:   " << tip->transactions.size() << "\n";
            std::cout << "  Timestamp:      " << tip->header.timestamp << "\n";
        }
    } else if (command == "create-block") {
        std::string payload_str = (argc >= 3) ? argv[2] : "BlockBum message payload";
        blockbum::core::Transaction tx;
        tx.version = 1;
        tx.sender = "DevNode";
        tx.recipient = "CommunityFeed";
        tx.amount = 10;
        tx.fee = 1;
        tx.nonce = chain.height() + 1;
        tx.payload = std::vector<uint8_t>(payload_str.begin(), payload_str.end());
        auto now = std::chrono::duration_cast<std::chrono::seconds>(
            std::chrono::system_clock::now().time_since_epoch()).count();
        tx.timestamp = static_cast<uint64_t>(now);

        auto block = chain.create_next_block({tx}, 42, static_cast<uint64_t>(now));
        if (chain.add_block(block)) {
            std::cout << "[SUCCESS] Block #" << block.header.height << " added!\n";
            std::cout << "  Hash:        0x" << blockbum::core::to_hex(block.block_hash) << "\n";
            std::cout << "  Merkle Root: 0x" << blockbum::core::to_hex(block.header.merkle_root) << "\n";
            std::cout << "  Payload:     " << payload_str << "\n";
        } else {
            std::cerr << "[ERROR] Block validation or insertion failed!\n";
            return 1;
        }
    } else if (command == "list") {
        std::cout << "Blockchain History (" << (chain.height() + 1) << " blocks):\n";
        for (uint64_t h = 0; h <= chain.height(); ++h) {
            auto b = chain.get_block_by_height(h);
            if (b) {
                std::cout << "  Block #" << b->header.height
                          << " | Hash: " << blockbum::core::to_hex(b->block_hash).substr(0, 16) << "..."
                          << " | Prev: " << blockbum::core::to_hex(b->header.previous_hash).substr(0, 16) << "..."
                          << " | Txs: " << b->transactions.size() << "\n";
            }
        }
    } else if (command == "validate") {
        auto res = chain.validate_entire_chain();
        if (res == blockbum::core::ValidationResult::Valid) {
            std::cout << "[VALID] Entire blockchain is cryptographically consistent and valid.\n";
            std::cout << "  Verified: " << (chain.height() + 1) << " blocks.\n";
        } else {
            std::cout << "[CORRUPTED] Chain validation failed: "
                      << blockbum::core::validation_result_to_string(res) << "\n";
            return 1;
        }
    } else {
        std::cerr << "Unknown command: " << command << "\n\n";
        print_usage();
        return 1;
    }

    storage->close();
    return 0;
}
