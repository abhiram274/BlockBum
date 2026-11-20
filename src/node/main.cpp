#include "blockbum/version.hpp"
#include "blockbum/core/types.hpp"
#include "blockbum/core/blockchain.hpp"
#include "blockbum/storage/file_storage.hpp"
#include "blockbum/network/tcp_transport.hpp"
#include "blockbum/network/sync_manager.hpp"
#include "blockbum/crypto/wallet.hpp"
#include <iostream>
#include <memory>
#include <string>
#include <chrono>
#include <thread>

void print_usage() {
    std::cout << "Usage: blockbum_node <command> [options]\n\n"
              << "Blockchain Commands:\n"
              << "  init                              Initialize genesis block in local storage\n"
              << "  status                            Display current blockchain height and tip hash\n"
              << "  create-block <msg>                Create and append a new block with a payload\n"
              << "  list                              List all blocks in the local chain\n"
              << "  validate                          Validate the entire chain structure and hashes\n"
              << "  run-node [options]                Start P2P node daemon (IPv4/IPv6 dual-stack)\n"
              << "    --port <p>                      P2P listen port (default: 9000)\n"
              << "    --peer <h>                      Connect to remote peer (can repeat)\n"
              << "    --bootstrap <h>                 Connect to bootstrap node\n"
              << "    --no-bootstrap                  Do not connect to default bootstrap nodes\n"
              << "    --peer-file <path>              Path to persistent peer book (default: data/peers.dat)\n"
              << "    --prune <blocks>                Pruned mode: keep last N blocks (0 = archival)\n"
              << "    --max-peers <n>                 Maximum inbound peer connections (default: 32)\n\n"
              << "Wallet & Identity Commands:\n"
              << "  wallet-create <alias>             Generate a new pseudonymous identity keypair\n"
              << "  wallet-list                       List all identities in the local wallet\n"
              << "  wallet-export <alias>             Export secure recovery phrase for backup\n"
              << "  wallet-recover <alias> <phrase>   Recover an identity from recovery phrase\n"
              << "  --version, -v                     Print BlockBum version\n";
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

    // Wallet commands
    if (command == "wallet-create") {
        if (argc < 3) {
            std::cerr << "Error: alias required. Usage: blockbum_node wallet-create <alias>\n";
            return 1;
        }
        std::string alias = argv[2];
        blockbum::crypto::Wallet wallet("data/wallet");
        try {
            auto id = wallet.create_identity(alias);
            std::cout << "[SUCCESS] Created identity '" << id.alias() << "'\n";
            std::cout << "  Address:    " << id.address() << "\n";
            std::cout << "  Public Key: 0x" << blockbum::core::to_hex(id.public_key()) << "\n";
            std::cout << "  Recovery:   " << id.export_recovery_phrase() << "\n";
            std::cout << "  Note: Keep your recovery phrase safe. Private keys never leave this device.\n";
            return 0;
        } catch (const std::exception& e) {
            std::cerr << "Error: " << e.what() << "\n";
            return 1;
        }
    } else if (command == "wallet-list") {
        blockbum::crypto::Wallet wallet("data/wallet");
        auto list = wallet.list_identities();
        std::cout << "BlockBum Local Wallet (" << list.size() << " identities):\n";
        for (const auto& id : list) {
            std::cout << "  [" << id.alias << "] Address: " << id.address
                      << " | PubKey: " << blockbum::core::to_hex(id.public_key).substr(0, 16) << "...\n";
        }
        return 0;
    } else if (command == "wallet-export") {
        if (argc < 3) {
            std::cerr << "Error: alias required. Usage: blockbum_node wallet-export <alias>\n";
            return 1;
        }
        std::string alias = argv[2];
        blockbum::crypto::Wallet wallet("data/wallet");
        auto id = wallet.get_identity(alias);
        if (!id) {
            std::cerr << "Error: Identity not found: " << alias << "\n";
            return 1;
        }
        std::cout << "Recovery phrase for '" << alias << "':\n";
        std::cout << id->export_recovery_phrase() << "\n";
        return 0;
    } else if (command == "wallet-recover") {
        if (argc < 4) {
            std::cerr << "Error: Usage: blockbum_node wallet-recover <alias> <phrase>\n";
            return 1;
        }
        std::string alias = argv[2];
        std::string phrase = argv[3];
        blockbum::crypto::Wallet wallet("data/wallet");
        try {
            auto id = wallet.recover_identity(alias, phrase);
            std::cout << "[SUCCESS] Recovered identity '" << id.alias() << "'\n";
            std::cout << "  Address: " << id.address() << "\n";
            return 0;
        } catch (const std::exception& e) {
            std::cerr << "Error: " << e.what() << "\n";
            return 1;
        }
    }

    auto storage = std::make_shared<blockbum::storage::FileStorageEngine>();
    std::string data_path = "data/devnet";
    if (!storage->open(data_path)) {
        std::cerr << "Error: Failed to open storage at " << data_path << "\n";
        return 1;
    }

    auto chain = std::make_shared<blockbum::core::Blockchain>(storage);
    if (!chain->initialize()) {
        std::cerr << "Error: Failed to initialize blockchain from storage\n";
        return 1;
    }

    if (command == "init") {
        std::cout << "[SUCCESS] Blockchain initialized. Height: " << chain->height() << "\n";
        auto tip = chain->get_tip_block();
        if (tip) {
            std::cout << "Tip Hash: 0x" << blockbum::core::to_hex(tip->block_hash) << "\n";
        }
    } else if (command == "status") {
        std::cout << "Blockchain Status:\n";
        std::cout << "  Current Height: " << chain->height() << "\n";
        auto tip = chain->get_tip_block();
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
        tx.nonce = chain->height() + 1;
        tx.payload = std::vector<uint8_t>(payload_str.begin(), payload_str.end());
        auto now = std::chrono::duration_cast<std::chrono::seconds>(
            std::chrono::system_clock::now().time_since_epoch()).count();
        tx.timestamp = static_cast<uint64_t>(now);

        auto block = chain->create_next_block({tx}, 42, static_cast<uint64_t>(now));
        if (chain->add_block(block)) {
            std::cout << "[SUCCESS] Block #" << block.header.height << " added!\n";
            std::cout << "  Hash:        0x" << blockbum::core::to_hex(block.block_hash) << "\n";
            std::cout << "  Merkle Root: 0x" << blockbum::core::to_hex(block.header.merkle_root) << "\n";
            std::cout << "  Payload:     " << payload_str << "\n";
        } else {
            std::cerr << "[ERROR] Block validation or insertion failed!\n";
            return 1;
        }
    } else if (command == "list") {
        std::cout << "Blockchain History (" << (chain->height() + 1) << " blocks):\n";
        for (uint64_t h = 0; h <= chain->height(); ++h) {
            auto b = chain->get_block_by_height(h);
            if (b) {
                std::cout << "  Block #" << b->header.height
                          << " | Hash: " << blockbum::core::to_hex(b->block_hash).substr(0, 16) << "..."
                          << " | Prev: " << blockbum::core::to_hex(b->header.previous_hash).substr(0, 16) << "..."
                          << " | Txs: " << b->transactions.size() << "\n";
            }
        }
    } else if (command == "validate") {
        auto res = chain->validate_entire_chain();
        if (res == blockbum::core::ValidationResult::Valid) {
            std::cout << "[VALID] Entire blockchain is cryptographically consistent and valid.\n";
            std::cout << "  Verified: " << (chain->height() + 1) << " blocks.\n";
        } else {
            std::cout << "[CORRUPTED] Chain validation failed: "
                      << blockbum::core::validation_result_to_string(res) << "\n";
            return 1;
        }
    } else if (command == "run-node") {
        uint16_t port = 9000;
        std::vector<std::string> peers;
        std::string peer_file = "data/peers.dat";
        size_t prune_depth = 0; // 0 = Archival mode
        size_t max_peers = 32;
        bool no_bootstrap = false;

        for (int i = 2; i < argc; ++i) {
            std::string arg = argv[i];
            if (arg == "--port" && i + 1 < argc) {
                port = static_cast<uint16_t>(std::stoi(argv[++i]));
            } else if (arg == "--peer" && i + 1 < argc) {
                peers.push_back(argv[++i]);
            } else if (arg == "--bootstrap" && i + 1 < argc) {
                peers.push_back(argv[++i]);
            } else if (arg == "--peer-file" && i + 1 < argc) {
                peer_file = argv[++i];
            } else if (arg == "--prune" && i + 1 < argc) {
                prune_depth = static_cast<size_t>(std::stoul(argv[++i]));
            } else if (arg == "--max-peers" && i + 1 < argc) {
                max_peers = static_cast<size_t>(std::stoul(argv[++i]));
            } else if (arg == "--no-bootstrap") {
                no_bootstrap = true;
            }
        }

        auto peer_book = std::make_shared<blockbum::network::PeerAddressBook>(peer_file);
        auto transport = std::make_shared<blockbum::network::TcpNetworkTransport>(max_peers);
        if (!transport->start(port)) {
            std::cerr << "Failed to start listening on port " << port << "\n";
            return 1;
        }

        std::string node_id = "node_" + std::to_string(port);
        auto sync_mgr = std::make_shared<blockbum::network::NodeSyncManager>(node_id, chain, transport, peer_book);
        std::cout << "[P2P] BlockBum node " << node_id << " listening on dual-stack port " << port << "...\n";
        std::cout << "[P2P] Node Mode: " << (prune_depth > 0 ? ("Pruned (retain last " + std::to_string(prune_depth) + " blocks)") : "Archival (retains full chain history)") << "\n";
        std::cout << "[P2P] Loaded " << peer_book->size() << " known peers from address book (" << peer_file << ")\n";

        // Connect to known peers from local address book first
        sync_mgr->connect_to_known_peers(8);

        if (!no_bootstrap && !peers.empty()) {
            std::cout << "[P2P] Connecting to bootstrap peers...\n";
            sync_mgr->connect_to_bootstrap_nodes(peers);
        }

        std::cout << "[P2P] Node active. Running... (Press Ctrl+C to terminate)\n";
        while (true) {
            std::this_thread::sleep_for(std::chrono::seconds(5));
            sync_mgr->broadcast_status();
            sync_mgr->connect_to_known_peers(8);

            if (prune_depth > 0) {
                chain->prune_history(prune_depth);
            }
        }
    } else {
        std::cerr << "Unknown command: " << command << "\n\n";
        print_usage();
        return 1;
    }

    storage->close();
    return 0;
}
