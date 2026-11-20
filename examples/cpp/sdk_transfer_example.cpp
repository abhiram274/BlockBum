#include "blockbum/sdk.hpp"
#include <iostream>
#include <iomanip>

int main() {
    std::cout << "====================================================\n";
    std::cout << "  BlockBum C++ Developer SDK - Value Transfer Demo   \n";
    std::cout << "====================================================\n\n";

    // 1. Initialize Developer Client SDK
    blockbum::sdk::BlockBumClient client;

    // 2. Generate sender & recipient keypairs
    auto alice = client.generate_keypair("alice");
    auto bob = client.generate_keypair("bob");

    std::cout << "[SDK] Generated Developer Identities:\n";
    std::cout << "  Alice Address:     " << alice.address << "\n";
    std::cout << "  Bob Address:       " << bob.address << "\n\n";

    // 3. Verify Address Validation
    bool alice_valid = blockbum::sdk::BlockBumClient::validate_address(alice.address);
    bool bob_valid = blockbum::sdk::BlockBumClient::validate_address(bob.address);
    std::cout << "[SDK] Address Format Verification (bb1...): " 
              << (alice_valid && bob_valid ? "VALID" : "INVALID") << "\n\n";

    // 4. Estimate Fee for Transfer
    std::vector<uint8_t> memo = {'H', 'e', 'l', 'l', 'o', ' ', 'B', 'l', 'o', 'c', 'k', 'B', 'u', 'm'};
    uint64_t est_fee = blockbum::sdk::BlockBumClient::estimate_fee(memo.size());
    std::cout << "[SDK] Estimated minimum fee: " << est_fee << " atomic units ("
              << std::fixed << std::setprecision(6) << (static_cast<double>(est_fee) / 1'000'000.0) << " BUM)\n\n";

    // 5. Build Value Transfer Transaction
    uint64_t transfer_amount = 5ULL * 1'000'000ULL; // 5.0 BUM
    uint64_t nonce = 1;
    auto tx = client.build_transfer(alice.address, alice.public_key, bob.address,
                                    transfer_amount, nonce, est_fee, memo);

    std::cout << "[SDK] Built Unsigned Transaction:\n";
    std::cout << "  Sender:    " << tx.sender << "\n";
    std::cout << "  Recipient: " << tx.recipient << "\n";
    std::cout << "  Amount:    " << (tx.amount / 1'000'000.0) << " BUM\n";
    std::cout << "  Fee:       " << tx.fee << " atomic units\n";
    std::cout << "  Nonce:     " << tx.nonce << "\n\n";

    // 6. Cryptographically Sign Transaction
    bool signed_ok = client.sign_transaction(tx, alice.private_key);
    std::cout << "[SDK] Transaction Signed: " << (signed_ok ? "SUCCESS" : "FAILED") << "\n";
    std::cout << "  Tx ID:     0x" << blockbum::core::to_hex(tx.tx_id) << "\n";
    std::cout << "  Signature: " << blockbum::core::to_hex(tx.signature).substr(0, 32) << "...\n\n";

    // 7. Cryptographically Verify Transaction
    bool valid = client.verify_transaction(tx);
    std::cout << "[SDK] Independent Transaction Verification: " 
              << (valid ? "PASSED (Cryptographically Valid)" : "FAILED") << "\n";

    std::cout << "\n====================================================\n";
    std::cout << "  Demo Completed Successfully                        \n";
    std::cout << "====================================================\n";

    return 0;
}
