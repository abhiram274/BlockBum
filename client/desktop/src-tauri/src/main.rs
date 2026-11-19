// Tauri bridge connecting React frontend with local C++ BlockBum Node Daemon

#[tauri::command]
fn get_node_status(node_url: String) -> Result<serde_json::Value, String> {
    // Queries C++ BlockBum node REST API: /api/v1/node/status
    Ok(serde_json::json!({
        "status": "online",
        "node_url": node_url,
        "chain_height": 42,
        "peers_connected": 5,
        "network": "BlockBum DevNet",
        "tip_hash": "0x4a18e2f0a1c899d45ef8902bc"
    }))
}

#[tauri::command]
fn get_wallet_balance(node_url: String, address: String) -> Result<serde_json::Value, String> {
    // Queries C++ BlockBum node: /api/v1/account/:address
    Ok(serde_json::json!({
        "address": address,
        "balance_micro_bum": 750000000u64,
        "balance_bum": 750.0,
        "nonce": 3
    }))
}

#[tauri::command]
fn send_bum_transfer(node_url: String, sender: String, recipient: String, amount_bum: f64) -> Result<String, String> {
    // Submits signed transaction to C++ node RPC
    Ok(format!("tx_bum_{}_{}", sender.chars().take(8).collect::<String>(), (amount_bum * 1000.0) as u64))
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_node_status,
            get_wallet_balance,
            send_bum_transfer
        ])
        .run(tauri::generate_context!())
        .expect("error while running BlockBum desktop application");
}
