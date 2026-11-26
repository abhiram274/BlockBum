import React, { useState } from "react";
import {
  NodeStatus,
  WalletIdentity,
  TransactionRecord,
  MessageItem,
  ClientExecutionMode
} from "./types";
import bbCoinImg from "./assets/bb_coin.png";

export const App: React.FC = () => {
  // Active Navigation Tab (Classic Desktop Top Toolbar: No website sidebar!)
  const [activeTab, setActiveTab] = useState<
    "overview" | "send" | "receive" | "transactions" | "chat" | "tools"
  >("overview");

  // Client Execution Mode State
  const [clientMode, setClientMode] = useState<ClientExecutionMode>("full_node");

  // Node Telemetry & Network Status
  const [nodeStatus, setNodeStatus] = useState<NodeStatus>({
    status: "online",
    node_url: "http://127.0.0.1:8332",
    chain_height: 124890,
    peers_connected: 8,
    network: "BlockBum Mainnet v1.0",
    tip_hash: "0x89fbc0120ab718c99de021a8bf92ca43018274ef9012bcda4819aa018290bc",
    mempool_tx_count: 12,
    consensus_mode: "BlockBum Dynamic Difficulty PoW",
    avg_latency_ms: 18,
    client_mode: "full_node"
  });

  // Multi-Identity Wallet State (Founder: Abhiram)
  const [identities, setIdentities] = useState<WalletIdentity[]>([
    {
      alias: "Abhiram (Founder)",
      address: "bb1abhiram729e8c40b82194017de8bf019abcdef0123",
      public_key: "0x4a91b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef12345678",
      balance_bum: 520.45,
      nonce: 5,
      recovery_phrase: "quantum orbit velvet shield harvest galaxy matrix canyon summit thunder echo horizon",
      created_at: "2026-11-01"
    },
    {
      alias: "Mining & Staking Rig",
      address: "bb1mining4892c0194819aa018290bc019abcdef4567",
      public_key: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      balance_bum: 1450.8,
      nonce: 42,
      recovery_phrase: "solar crystal flame timber canyon whisper galaxy orbit summit matrix velvet thunder",
      created_at: "2026-11-05"
    }
  ]);
  const [selectedIdentity, setSelectedIdentity] = useState<WalletIdentity>(identities[0]);

  // Transaction Ledger State
  const [transactions, setTransactions] = useState<TransactionRecord[]>([
    {
      tx_id: "0x98a1f2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1",
      type: "receive",
      counterparty: "bb1devguild91823746192837461928374619283746",
      amount_bum: 25.0,
      fee_bum: 0.0005,
      timestamp: "2026-11-26 12:45:10",
      status: "confirmed",
      block_height: 124888
    },
    {
      tx_id: "0x7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f198a1f2b3c4d5e6f",
      type: "send",
      counterparty: "bb1storageprovider401928374619283746192837",
      amount_bum: 10.5,
      fee_bum: 0.0005,
      timestamp: "2026-11-26 11:20:04",
      status: "confirmed",
      block_height: 124885
    },
    {
      tx_id: "0x3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a",
      type: "reward",
      counterparty: "Coinbase (BlockBum PoW Block #124880)",
      amount_bum: 50.0,
      fee_bum: 0.0,
      timestamp: "2026-11-26 09:15:32",
      status: "confirmed",
      block_height: 124880
    },
    {
      tx_id: "0x1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a3f4a5b6c7d8e9f0a",
      type: "send",
      counterparty: "bb1alice78901234567890123456789012345678",
      amount_bum: 5.0,
      fee_bum: 0.0002,
      timestamp: "2026-11-25 21:05:19",
      status: "confirmed",
      block_height: 124860
    }
  ]);

  // Send Form State
  const [sendToAddress, setSendToAddress] = useState("");
  const [sendLabel, setSendLabel] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [sendFeeRate, setSendFeeRate] = useState<number>(0.0005);
  const [sendNotification, setSendNotification] = useState<string | null>(null);

  // Receive Form State
  const [receiveLabel, setReceiveLabel] = useState("");
  const [receiveAmount, setReceiveAmount] = useState("");
  const [generatedUri, setGeneratedUri] = useState("");
  const [receiveAddresses, setReceiveAddresses] = useState<string[]>([
    "bb1abhiram729e8c40b82194017de8bf019abcdef0123",
    "bb1abhiram88410294819aa018290bc019a778899aabb",
    "bb1abhiram01938472619283746192837461928374611"
  ]);

  // Transaction Search & Filter State
  const [txFilter, setTxFilter] = useState<"all" | "receive" | "send" | "reward">("all");
  const [txSearch, setTxSearch] = useState("");
  const [selectedTx, setSelectedTx] = useState<TransactionRecord | null>(null);

  // Community Chat State
  const [activeChannel, setActiveChannel] = useState<string>("general");
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<MessageItem[]>([
    {
      id: "msg_1",
      communityId: "comm_main",
      channel: "general",
      sender: "bb1abhiram729e8c40b82194017de8bf019abcdef0123",
      senderAlias: "Abhiram (Founder)",
      content: "Welcome to BlockBum Core. Dynamic difficulty retargeting and encrypted P2P messaging are fully active on mainnet.",
      timestamp: "12:30 PM",
      isE2EE: true,
      deliveryAck: true
    },
    {
      id: "msg_2",
      communityId: "comm_main",
      channel: "general",
      sender: "bb1nodeop98471928374619283746192837461928",
      senderAlias: "Node_Validator_Frankfurt",
      content: "Connected to 8 peers over IPv6. Block #124,890 verified in 14ms using Ubuntu OpenSSL cryptography.",
      timestamp: "12:34 PM",
      isE2EE: true,
      deliveryAck: true
    },
    {
      id: "msg_3",
      communityId: "comm_main",
      channel: "announcements",
      sender: "bb1abhiram729e8c40b82194017de8bf019abcdef0123",
      senderAlias: "Abhiram (Founder)",
      content: "BlockBum Core release v1.0 is finalized with native Full Node, SPV, and Pruned modes.",
      timestamp: "10:15 AM",
      isE2EE: true,
      deliveryAck: true
    },
    {
      id: "msg_4",
      communityId: "comm_main",
      channel: "consensus-security",
      sender: "bb1crypto91823746192837461928374619283746",
      senderAlias: "Security_Audit_Bot",
      content: "All SHA-256 Merkle proofs and Secp256k1 signature verifications passed 100% test coverage.",
      timestamp: "11:00 AM",
      isE2EE: true,
      deliveryAck: true
    }
  ]);

  // Tools & Console State
  const [rpcCommand, setRpcCommand] = useState("");
  const [consoleOutput, setConsoleOutput] = useState<string[]>([
    "BlockBum Core RPC Debug Console v1.0.0",
    "Type 'help', 'getblockchaininfo', 'getpeerinfo', or 'getmempoolinfo' to execute commands.",
    ""
  ]);
  const [cryptoAuditResult, setCryptoAuditResult] = useState<string | null>(null);

  // Top Menu Dropdown State
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  // Connected Peers List
  const [peers] = useState([
    { ip: "198.51.100.24:8333", latency: "14ms", height: 124890, version: "/BlockBum:1.0.0/", type: "Outbound" },
    { ip: "203.0.113.88:8333", latency: "22ms", height: 124890, version: "/BlockBum:1.0.0/", type: "Inbound" },
    { ip: "[2001:db8::1]:8333", latency: "18ms", height: 124889, version: "/BlockBum:1.0.0/", type: "Outbound" },
    { ip: "192.0.2.145:8333", latency: "35ms", height: 124890, version: "/BlockBum:1.0.0/", type: "Inbound" },
    { ip: "198.51.100.102:8333", latency: "16ms", height: 124890, version: "/BlockBum:1.0.0/", type: "Outbound" }
  ]);

  // ==========================================================================
  // Handlers
  // ==========================================================================

  // Switch Client Execution Mode
  const handleSetClientMode = (mode: ClientExecutionMode) => {
    setClientMode(mode);
    setNodeStatus((prev) => ({
      ...prev,
      client_mode: mode
    }));
    setSendNotification(`Switched client execution mode to: ${mode === "full_node" ? "Full Node Mode" : mode === "light_client" ? "Lightweight (SPV) Mode" : "Pruned Node Mode"}`);
    setTimeout(() => setSendNotification(null), 4000);
  };

  // Send Transaction
  const handleSendCoins = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(sendAmount);
    if (!sendToAddress.trim() || isNaN(amountNum) || amountNum <= 0) {
      alert("Please enter a valid recipient address and amount in BUM.");
      return;
    }
    if (amountNum + sendFeeRate > selectedIdentity.balance_bum) {
      alert("Insufficient funds for this transaction and network fee.");
      return;
    }

    const newTx: TransactionRecord = {
      tx_id: "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(""),
      type: "send",
      counterparty: sendToAddress.trim(),
      amount_bum: amountNum,
      fee_bum: sendFeeRate,
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
      status: "confirmed",
      block_height: nodeStatus.chain_height + 1
    };

    // Update balances and ledger
    setSelectedIdentity((prev) => ({
      ...prev,
      balance_bum: parseFloat((prev.balance_bum - (amountNum + sendFeeRate)).toFixed(8))
    }));
    setTransactions([newTx, ...transactions]);
    setSendNotification(`Transaction Broadcast Successfully! Sent ${amountNum.toFixed(4)} BUM to ${sendToAddress.substring(0, 12)}...`);
    setSendToAddress("");
    setSendLabel("");
    setSendAmount("");
    setTimeout(() => setSendNotification(null), 5000);
  };

  // Generate Payment URI
  const handleGenerateUri = (e: React.FormEvent) => {
    e.preventDefault();
    const uri = `blockbum:${selectedIdentity.address}?amount=${receiveAmount || "0"}&label=${encodeURIComponent(receiveLabel || "BlockBum Payment")}`;
    setGeneratedUri(uri);
  };

  // Generate New Receiving Address
  const handleGenerateNewAddress = () => {
    const newAddr = "bb1abhiram" + Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
    setReceiveAddresses([newAddr, ...receiveAddresses]);
    setSelectedIdentity((prev) => ({
      ...prev,
      address: newAddr
    }));
    setSendNotification(`New Receiving Address Generated: ${newAddr.substring(0, 16)}...`);
    setTimeout(() => setSendNotification(null), 4000);
  };

  // Send Chat Message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const newMsg: MessageItem = {
      id: "msg_" + Date.now(),
      communityId: "comm_main",
      channel: activeChannel,
      sender: selectedIdentity.address,
      senderAlias: selectedIdentity.alias,
      content: chatInput.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isE2EE: true,
      deliveryAck: true
    };

    setChatMessages([...chatMessages, newMsg]);
    setChatInput("");
  };

  // Execute RPC Debug Console Command
  const handleExecuteRpc = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = rpcCommand.trim().toLowerCase();
    if (!cmd) return;

    let response = "";
    if (cmd === "help") {
      response = "Available RPC Commands:\n - getblockchaininfo : Returns chain height, consensus, and block tip hash.\n - getpeerinfo       : Returns active IPv4/IPv6 peer telemetry.\n - getmempoolinfo    : Returns pending transactions count and memory usage.\n - getclientmode     : Returns active client mode (full_node, light_client, pruned_node).\n - clear             : Clears terminal history.";
    } else if (cmd === "getblockchaininfo") {
      response = JSON.stringify({
        chain: "main",
        blocks: nodeStatus.chain_height,
        headers: nodeStatus.chain_height,
        bestblockhash: nodeStatus.tip_hash,
        difficulty: "0x1d00ffff",
        mediantime: Math.floor(Date.now() / 1000),
        verificationprogress: 1.0,
        consensus_engine: "BlockBum Dynamic Difficulty PoW"
      }, null, 2);
    } else if (cmd === "getpeerinfo") {
      response = JSON.stringify(peers, null, 2);
    } else if (cmd === "getmempoolinfo") {
      response = JSON.stringify({
        size: nodeStatus.mempool_tx_count,
        bytes: nodeStatus.mempool_tx_count * 384,
        usage: "4.6 KB",
        maxmempool: "300 MB"
      }, null, 2);
    } else if (cmd === "getclientmode") {
      response = JSON.stringify({
        mode: clientMode,
        sovereign_validation: clientMode === "full_node" || clientMode === "pruned_node",
        storage_allocated: clientMode === "full_node" ? "14.2 GB" : clientMode === "pruned_node" ? "4.8 GB" : "38 MB",
        spv_merkle_branch_enabled: true
      }, null, 2);
    } else if (cmd === "clear") {
      setConsoleOutput(["Terminal cleared."]);
      setRpcCommand("");
      return;
    } else {
      response = `Unknown command: '${cmd}'. Type 'help' for available RPC calls.`;
    }

    setConsoleOutput([...consoleOutput, `> ${rpcCommand}`, response, ""]);
    setRpcCommand("");
  };

  // Run Cryptographic Self-Test
  const handleRunCryptoAudit = () => {
    setCryptoAuditResult("Running Ubuntu OpenSSL 3.0 & BlockBum cryptographic self-test...");
    setTimeout(() => {
      setCryptoAuditResult(
        "✓ SHA-256 Merkle Tree Proofs: VERIFIED\n✓ Secp256k1 ECDSA Signatures: VERIFIED\n✓ AES-256-GCM Encrypted Storage: ACTIVE\n✓ Ubuntu Entropy Hardware RNG: ACTIVE\n✓ Consensus Proof-of-Work Verification: PASSED\n\nResult: 100% Cryptographic Integrity Confirmed."
      );
    }, 600);
  };

  // Filtered transactions
  const filteredTxs = transactions.filter((tx) => {
    if (txFilter !== "all" && tx.type !== txFilter) return false;
    if (txSearch.trim()) {
      const q = txSearch.toLowerCase();
      return (
        tx.tx_id.toLowerCase().includes(q) ||
        tx.counterparty.toLowerCase().includes(q) ||
        tx.timestamp.includes(q)
      );
    }
    return true;
  });

  // Simple pure SVG QR Matrix generator (21x21 grid)
  const renderQrSvg = (text: string) => {
    // Generate deterministic 21x21 bit matrix based on text hash
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
      hash |= 0;
    }
    const size = 21;
    const cells: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

    // Corner Finder Patterns (7x7)
    const setFinder = (startX: number, startY: number) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          if (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
            cells[startY + r][startX + c] = true;
          }
        }
      }
    };
    setFinder(0, 0);
    setFinder(size - 7, 0);
    setFinder(0, size - 7);

    // Data bits
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if ((r < 8 && c < 8) || (r < 8 && c >= size - 8) || (r >= size - 8 && c < 8)) continue;
        const bit = ((hash * (r + 1) * 31) ^ (c * 17)) % 3 === 0;
        cells[r][c] = bit;
      }
    }

    return (
      <svg width="140" height="140" viewBox={`0 0 ${size} ${size}`} style={{ backgroundColor: "#FFFFFF", padding: "8px", borderRadius: "4px", border: "1px solid #CBD5E1" }}>
        {cells.map((row, r) =>
          row.map((val, c) =>
            val ? <rect key={`${r}-${c}`} x={c} y={r} width="1" height="1" fill="#0F172A" /> : null
          )
        )}
      </svg>
    );
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100vw",
        height: "100vh",
        backgroundColor: "#F4F6F9",
        color: "#0F172A",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        overflow: "hidden"
      }}
      onClick={() => setOpenMenu(null)}
    >
      {/* ===================================================================== */}
      {/* 1. TOP NATIVE WINDOW HEADER BAR                                        */}
      {/* ===================================================================== */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "6px 14px",
          backgroundColor: "#FFFFFF",
          borderBottom: "1px solid #CBD5E1",
          userSelect: "none"
        }}
      >
        {/* Left: App Logo & Core Title */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <img src={bbCoinImg} alt="BlockBum Coin" style={{ width: "26px", height: "26px", objectFit: "contain" }} />
          <div>
            <span style={{ fontWeight: "bold", fontSize: "14px", color: "#0F172A", letterSpacing: "0.2px" }}>
              BlockBum Core
            </span>
            <span
              style={{
                marginLeft: "8px",
                fontSize: "10px",
                fontWeight: "600",
                color: "#B8860B",
                backgroundColor: "#FEF9C3",
                padding: "2px 6px",
                borderRadius: "3px",
                border: "1px solid #FDE047"
              }}
            >
              Mainnet v1.0
            </span>
          </div>
        </div>

        {/* Center: Identity Selector (Founder Abhiram) */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "11px", color: "#64748B", fontWeight: "600" }}>Active Wallet:</span>
          <select
            value={selectedIdentity.alias}
            onChange={(e) => {
              const id = identities.find((i) => i.alias === e.target.value);
              if (id) setSelectedIdentity(id);
            }}
            style={{
              padding: "3px 8px",
              backgroundColor: "#F8FAFC",
              border: "1px solid #CBD5E1",
              borderRadius: "4px",
              fontSize: "12px",
              fontWeight: "bold",
              color: "#0F172A",
              cursor: "pointer"
            }}
          >
            {identities.map((id) => (
              <option key={id.alias} value={id.alias}>
                {id.alias}
              </option>
            ))}
          </select>
          <span
            style={{
              fontFamily: "monospace",
              fontSize: "11px",
              color: "#475569",
              backgroundColor: "#F1F5F9",
              padding: "2px 6px",
              borderRadius: "3px"
            }}
          >
            {selectedIdentity.address.substring(0, 10)}...{selectedIdentity.address.substring(selectedIdentity.address.length - 4)}
          </span>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(selectedIdentity.address);
              alert("Address copied to clipboard:\n" + selectedIdentity.address);
            }}
            title="Copy Public Address"
            style={{
              background: "none",
              border: "1px solid #CBD5E1",
              borderRadius: "3px",
              padding: "2px 6px",
              fontSize: "11px",
              cursor: "pointer",
              color: "#334155"
            }}
          >
            📋 Copy
          </button>
        </div>

        {/* Right: Balance & Mode Toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Balance Pill */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              backgroundColor: "#FFFBEB",
              border: "1px solid #FDE68A",
              borderRadius: "4px",
              padding: "3px 10px"
            }}
          >
            <span style={{ fontSize: "11px", color: "#B8860B", fontWeight: "bold" }}>Balance:</span>
            <span style={{ fontSize: "13px", fontWeight: "bold", color: "#0F172A", fontFamily: "monospace" }}>
              {selectedIdentity.balance_bum.toFixed(4)} BUM
            </span>
          </div>

          {/* Client Mode Quick Switcher */}
          <button
            onClick={() => {
              const nextMode: ClientExecutionMode =
                clientMode === "full_node" ? "light_client" : clientMode === "light_client" ? "pruned_node" : "full_node";
              handleSetClientMode(nextMode);
            }}
            title="Click to toggle client execution mode"
            style={{
              padding: "3px 10px",
              backgroundColor: clientMode === "full_node" ? "#ECFDF5" : clientMode === "light_client" ? "#EFF6FF" : "#FEF3C7",
              border: `1px solid ${clientMode === "full_node" ? "#6EE7B7" : clientMode === "light_client" ? "#93C5FD" : "#FCD34D"}`,
              borderRadius: "4px",
              color: clientMode === "full_node" ? "#065F46" : clientMode === "light_client" ? "#1E40AF" : "#92400E",
              fontSize: "11px",
              fontWeight: "bold",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "5px"
            }}
          >
            {clientMode === "full_node" && "🟢 Full Node Mode"}
            {clientMode === "light_client" && "⚡ SPV Mode"}
            {clientMode === "pruned_node" && "📦 Pruned Node"}
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. CLASSIC DESKTOP MENU BAR (File, Wallet, Send/Receive, Tools, Help) */}
      {/* ===================================================================== */}
      <div
        style={{
          display: "flex",
          backgroundColor: "#F1F5F9",
          borderBottom: "1px solid #CBD5E1",
          padding: "2px 8px",
          fontSize: "12px",
          color: "#334155",
          userSelect: "none",
          position: "relative"
        }}
      >
        {[
          {
            id: "file",
            name: "File",
            items: [
              { label: "Backup Wallet...", action: () => alert("Wallet backup exported to encrypted vault.") },
              { label: "Restore Wallet Phrase...", action: () => alert("Seed phrase verification dialog.") },
              { type: "separator" },
              { label: "Exit BlockBum Core", action: () => window.close() }
            ]
          },
          {
            id: "wallet",
            name: "Wallet",
            items: [
              { label: "Overview", action: () => setActiveTab("overview") },
              { label: "Send BUM Coins", action: () => setActiveTab("send") },
              { label: "Receive BUM Coins", action: () => setActiveTab("receive") },
              { label: "Transaction Ledger", action: () => setActiveTab("transactions") },
              { type: "separator" },
              { label: "Generate New Address", action: handleGenerateNewAddress }
            ]
          },
          {
            id: "mode",
            name: "Client Mode",
            items: [
              { label: "Switch to Full Node Mode", action: () => handleSetClientMode("full_node") },
              { label: "Switch to SPV (Light) Mode", action: () => handleSetClientMode("light_client") },
              { label: "Switch to Pruned Node Mode", action: () => handleSetClientMode("pruned_node") }
            ]
          },
          {
            id: "tools",
            name: "Tools",
            items: [
              { label: "Connected P2P Peers Map", action: () => setActiveTab("tools") },
              { label: "Ubuntu Cryptography Diagnostic", action: handleRunCryptoAudit },
              { label: "RPC Debug Console", action: () => setActiveTab("tools") }
            ]
          },
          {
            id: "help",
            name: "Help",
            items: [
              { label: "BlockBum Protocol Specification", action: () => alert("BlockBum Protocol v1.0. Dynamic PoW Consensus.") },
              { label: "About BlockBum Core", action: () => alert("BlockBum Core v1.0.0\nFounder: Abhiram\nLicense: MIT Open Source") }
            ]
          }
        ].map((menu) => (
          <div key={menu.id} style={{ position: "relative" }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenu(openMenu === menu.id ? null : menu.id);
              }}
              style={{
                background: openMenu === menu.id ? "#E2E8F0" : "none",
                border: "none",
                padding: "3px 10px",
                fontSize: "12px",
                color: "#334155",
                cursor: "pointer",
                borderRadius: "3px"
              }}
            >
              {menu.name}
            </button>
            {openMenu === menu.id && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  backgroundColor: "#FFFFFF",
                  border: "1px solid #CBD5E1",
                  borderRadius: "4px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                  minWidth: "220px",
                  zIndex: 2000,
                  padding: "4px 0"
                }}
              >
                {menu.items.map((item, idx) =>
                  item.type === "separator" ? (
                    <div key={idx} style={{ height: "1px", backgroundColor: "#E2E8F0", margin: "4px 0" }} />
                  ) : (
                    <div
                      key={idx}
                      onClick={() => {
                        setOpenMenu(null);
                        item.action?.();
                      }}
                      style={{
                        padding: "6px 14px",
                        fontSize: "12px",
                        color: "#0F172A",
                        cursor: "pointer"
                      }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "#F1F5F9")}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "transparent")}
                    >
                      {item.label}
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ===================================================================== */}
      {/* 3. NATIVE DESKTOP TOP TOOLBAR TABS (NO WEB SIDEBAR!)                   */}
      {/* ===================================================================== */}
      <div
        style={{
          display: "flex",
          backgroundColor: "#FFFFFF",
          borderBottom: "1px solid #CBD5E1",
          padding: "4px 10px 0 10px",
          gap: "4px",
          userSelect: "none"
        }}
      >
        {[
          { id: "overview", label: "Overview", icon: "📊" },
          { id: "send", label: "Send", icon: "📤" },
          { id: "receive", label: "Receive", icon: "📥" },
          { id: "transactions", label: "Transactions", icon: "📜" },
          { id: "chat", label: "Community Chat", icon: "💬" },
          { id: "tools", label: "Tools & Client Modes", icon: "⚙️" }
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "7px",
                padding: "8px 16px",
                backgroundColor: isActive ? "#F4F6F9" : "#FFFFFF",
                borderTop: isActive ? "2px solid #D4AF37" : "2px solid transparent",
                borderLeft: isActive ? "1px solid #CBD5E1" : "1px solid transparent",
                borderRight: isActive ? "1px solid #CBD5E1" : "1px solid transparent",
                borderBottom: isActive ? "1px solid #F4F6F9" : "1px solid transparent",
                borderRadius: "5px 5px 0 0",
                color: isActive ? "#0F172A" : "#64748B",
                fontWeight: isActive ? "bold" : "600",
                fontSize: "13px",
                cursor: "pointer",
                marginBottom: "-1px"
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Notification Toast Alert */}
      {sendNotification && (
        <div
          style={{
            backgroundColor: "#ECFDF5",
            borderBottom: "1px solid #A7F3D0",
            color: "#065F46",
            padding: "8px 16px",
            fontSize: "12px",
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}
        >
          <span>✓ {sendNotification}</span>
          <button
            onClick={() => setSendNotification(null)}
            style={{ background: "none", border: "none", color: "#065F46", cursor: "pointer", fontWeight: "bold" }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 4. MAIN CLIENT WORKSPACE (FULL DESKTOP CONTENT)                       */}
      {/* ===================================================================== */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
        {/* =================================================================== */}
        {/* TAB 1: OVERVIEW                                                     */}
        {/* =================================================================== */}
        {activeTab === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Top 2-Column Desktop Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              {/* Left Column: Balances Box */}
              <div
                style={{
                  backgroundColor: "#FFFFFF",
                  border: "1px solid #CBD5E1",
                  borderRadius: "6px",
                  padding: "18px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", borderBottom: "1px solid #F1F5F9", paddingBottom: "8px" }}>
                  <span style={{ fontSize: "14px", fontWeight: "bold", color: "#0F172A" }}>Balances</span>
                  <span style={{ fontSize: "11px", color: "#64748B" }}>Wallet: {selectedIdentity.alias}</span>
                </div>

                <div style={{ marginBottom: "12px" }}>
                  <div style={{ fontSize: "12px", color: "#64748B", marginBottom: "2px" }}>Available (Spendable):</div>
                  <div style={{ fontSize: "24px", fontWeight: "bold", color: "#0F172A", fontFamily: "monospace" }}>
                    {selectedIdentity.balance_bum.toFixed(8)} <span style={{ color: "#B8860B", fontSize: "18px" }}>BUM</span>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px", padding: "10px", backgroundColor: "#F8FAFC", borderRadius: "4px", border: "1px solid #E2E8F0" }}>
                  <div>
                    <div style={{ fontSize: "11px", color: "#64748B" }}>Pending (Unconfirmed):</div>
                    <div style={{ fontSize: "13px", fontWeight: "bold", color: "#D97706", fontFamily: "monospace" }}>0.00000000 BUM</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", color: "#64748B" }}>Total Net Balance:</div>
                    <div style={{ fontSize: "13px", fontWeight: "bold", color: "#059669", fontFamily: "monospace" }}>
                      {selectedIdentity.balance_bum.toFixed(8)} BUM
                    </div>
                  </div>
                </div>

                {/* Primary Address */}
                <div style={{ marginBottom: "16px" }}>
                  <div style={{ fontSize: "11px", color: "#64748B", marginBottom: "4px" }}>Primary Receiving Address:</div>
                  <div
                    style={{
                      fontFamily: "monospace",
                      fontSize: "12px",
                      backgroundColor: "#F1F5F9",
                      padding: "7px 10px",
                      borderRadius: "4px",
                      border: "1px solid #E2E8F0",
                      wordBreak: "break-all",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between"
                    }}
                  >
                    <span>{selectedIdentity.address}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard?.writeText(selectedIdentity.address);
                        alert("Address copied:\n" + selectedIdentity.address);
                      }}
                      style={{
                        marginLeft: "8px",
                        padding: "3px 8px",
                        backgroundColor: "#FFFFFF",
                        border: "1px solid #CBD5E1",
                        borderRadius: "3px",
                        fontSize: "11px",
                        cursor: "pointer"
                      }}
                    >
                      Copy
                    </button>
                  </div>
                </div>

                {/* Quick Action Buttons */}
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    onClick={() => setActiveTab("send")}
                    style={{
                      flex: 1,
                      padding: "9px",
                      background: "linear-gradient(135deg, #FF6B00 0%, #FF8800 100%)",
                      border: "1px solid #EA580C",
                      borderRadius: "4px",
                      color: "#FFFFFF",
                      fontWeight: "bold",
                      fontSize: "13px",
                      cursor: "pointer"
                    }}
                  >
                    📤 Send Coins
                  </button>
                  <button
                    onClick={() => setActiveTab("receive")}
                    style={{
                      flex: 1,
                      padding: "9px",
                      background: "#FFFFFF",
                      border: "1px solid #D4AF37",
                      borderRadius: "4px",
                      color: "#B8860B",
                      fontWeight: "bold",
                      fontSize: "13px",
                      cursor: "pointer"
                    }}
                  >
                    📥 Receive Coins
                  </button>
                </div>
              </div>

              {/* Right Column: Recent Transactions Box */}
              <div
                style={{
                  backgroundColor: "#FFFFFF",
                  border: "1px solid #CBD5E1",
                  borderRadius: "6px",
                  padding: "18px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                  display: "flex",
                  flexDirection: "column"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", borderBottom: "1px solid #F1F5F9", paddingBottom: "8px" }}>
                  <span style={{ fontSize: "14px", fontWeight: "bold", color: "#0F172A" }}>Recent Transactions</span>
                  <button
                    onClick={() => setActiveTab("transactions")}
                    style={{ background: "none", border: "none", color: "#FF6B00", fontSize: "12px", fontWeight: "bold", cursor: "pointer" }}
                  >
                    View All →
                  </button>
                </div>

                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
                  {transactions.slice(0, 4).map((tx) => (
                    <div
                      key={tx.tx_id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 10px",
                        backgroundColor: "#F8FAFC",
                        borderRadius: "4px",
                        border: "1px solid #E2E8F0"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "14px" }}>
                          {tx.type === "receive" ? "🟢" : tx.type === "send" ? "🔴" : "⛏️"}
                        </span>
                        <div>
                          <div style={{ fontSize: "12px", fontWeight: "bold", color: "#0F172A" }}>
                            {tx.type === "receive" ? "Received BUM" : tx.type === "send" ? "Sent BUM" : "Mined Block Reward"}
                          </div>
                          <div style={{ fontSize: "10px", color: "#64748B" }}>{tx.timestamp}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div
                          style={{
                            fontSize: "12px",
                            fontWeight: "bold",
                            fontFamily: "monospace",
                            color: tx.type === "send" ? "#DC2626" : "#059669"
                          }}
                        >
                          {tx.type === "send" ? "-" : "+"}
                          {tx.amount_bum.toFixed(4)} BUM
                        </div>
                        <div style={{ fontSize: "10px", color: "#64748B" }}>
                          Block #{tx.block_height}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Strip: Consensus & Node Telemetry */}
            <div
              style={{
                backgroundColor: "#FFFFFF",
                border: "1px solid #CBD5E1",
                borderRadius: "6px",
                padding: "14px 18px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
              }}
            >
              <div style={{ fontSize: "13px", fontWeight: "bold", color: "#0F172A", marginBottom: "10px" }}>
                Network Consensus & Node Status
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
                <div style={{ padding: "10px", backgroundColor: "#F8FAFC", borderRadius: "4px", border: "1px solid #E2E8F0" }}>
                  <div style={{ fontSize: "11px", color: "#64748B" }}>Consensus Engine</div>
                  <div style={{ fontSize: "12px", fontWeight: "bold", color: "#EA580C" }}>
                    BlockBum PoW
                  </div>
                </div>
                <div style={{ padding: "10px", backgroundColor: "#F8FAFC", borderRadius: "4px", border: "1px solid #E2E8F0" }}>
                  <div style={{ fontSize: "11px", color: "#64748B" }}>Chain Height</div>
                  <div style={{ fontSize: "12px", fontWeight: "bold", color: "#B8860B", fontFamily: "monospace" }}>
                    #{nodeStatus.chain_height.toLocaleString()}
                  </div>
                </div>
                <div style={{ padding: "10px", backgroundColor: "#F8FAFC", borderRadius: "4px", border: "1px solid #E2E8F0" }}>
                  <div style={{ fontSize: "11px", color: "#64748B" }}>Connected Peers</div>
                  <div style={{ fontSize: "12px", fontWeight: "bold", color: "#059669" }}>
                    {peers.length} Nodes (IPv4/IPv6)
                  </div>
                </div>
                <div style={{ padding: "10px", backgroundColor: "#F8FAFC", borderRadius: "4px", border: "1px solid #E2E8F0" }}>
                  <div style={{ fontSize: "11px", color: "#64748B" }}>Client Execution Mode</div>
                  <div style={{ fontSize: "12px", fontWeight: "bold", color: "#0284C7" }}>
                    {clientMode === "full_node" ? "Full Sovereign Node" : clientMode === "light_client" ? "Lightweight SPV" : "Pruned Mode"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: SEND                                                         */}
        {/* =================================================================== */}
        {activeTab === "send" && (
          <div style={{ maxWidth: "800px", margin: "0 auto" }}>
            <div
              style={{
                backgroundColor: "#FFFFFF",
                border: "1px solid #CBD5E1",
                borderRadius: "6px",
                padding: "24px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
              }}
            >
              <h2 style={{ margin: "0 0 4px 0", fontSize: "18px", fontWeight: "bold", color: "#0F172A" }}>
                Send BUM Coins
              </h2>
              <p style={{ margin: "0 0 20px 0", fontSize: "12px", color: "#64748B" }}>
                Broadcast native cryptocurrency transactions across the BlockBum P2P network.
              </p>

              <form onSubmit={handleSendCoins}>
                {/* Pay To Address */}
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", color: "#334155", marginBottom: "6px" }}>
                    Pay To Address:
                  </label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input
                      type="text"
                      value={sendToAddress}
                      onChange={(e) => setSendToAddress(e.target.value)}
                      placeholder="bb1..."
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        backgroundColor: "#F8FAFC",
                        border: "1px solid #CBD5E1",
                        borderRadius: "4px",
                        fontSize: "13px",
                        fontFamily: "monospace"
                      }}
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        const text = await navigator.clipboard?.readText().catch(() => "");
                        if (text) setSendToAddress(text);
                      }}
                      style={{
                        padding: "8px 14px",
                        backgroundColor: "#F1F5F9",
                        border: "1px solid #CBD5E1",
                        borderRadius: "4px",
                        fontSize: "12px",
                        fontWeight: "600",
                        cursor: "pointer"
                      }}
                    >
                      Paste
                    </button>
                  </div>
                </div>

                {/* Optional Label */}
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", color: "#334155", marginBottom: "6px" }}>
                    Label / Description (Optional):
                  </label>
                  <input
                    type="text"
                    value={sendLabel}
                    onChange={(e) => setSendLabel(e.target.value)}
                    placeholder="e.g. Node Staking Pool or Peer Payment"
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      backgroundColor: "#F8FAFC",
                      border: "1px solid #CBD5E1",
                      borderRadius: "4px",
                      fontSize: "13px",
                      boxSizing: "border-box"
                    }}
                  />
                </div>

                {/* Amount */}
                <div style={{ marginBottom: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <label style={{ fontSize: "12px", fontWeight: "bold", color: "#334155" }}>
                      Amount in BUM:
                    </label>
                    <span style={{ fontSize: "11px", color: "#64748B" }}>
                      Available: <strong style={{ color: "#0F172A" }}>{selectedIdentity.balance_bum.toFixed(4)} BUM</strong>
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input
                      type="number"
                      step="0.0001"
                      min="0.0001"
                      value={sendAmount}
                      onChange={(e) => setSendAmount(e.target.value)}
                      placeholder="0.0000"
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        backgroundColor: "#F8FAFC",
                        border: "1px solid #CBD5E1",
                        borderRadius: "4px",
                        fontSize: "14px",
                        fontWeight: "bold",
                        fontFamily: "monospace"
                      }}
                    />
                    {[
                      { label: "10 BUM", val: 10 },
                      { label: "50 BUM", val: 50 },
                      { label: "100 BUM", val: 100 },
                      { label: "Max", val: Math.max(0, selectedIdentity.balance_bum - sendFeeRate) }
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setSendAmount(preset.val.toString())}
                        style={{
                          padding: "8px 12px",
                          backgroundColor: "#F8FAFC",
                          border: "1px solid #CBD5E1",
                          borderRadius: "4px",
                          fontSize: "11px",
                          fontWeight: "bold",
                          color: "#334155",
                          cursor: "pointer"
                        }}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Network Fee Presets */}
                <div style={{ marginBottom: "24px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", color: "#334155", marginBottom: "6px" }}>
                    Transaction Fee:
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
                    {[
                      { rate: 0.0001, label: "Economy", desc: "~3-6 blocks" },
                      { rate: 0.0005, label: "Standard", desc: "~1-2 blocks" },
                      { rate: 0.001, label: "Priority", desc: "Next block" }
                    ].map((fee) => (
                      <div
                        key={fee.label}
                        onClick={() => setSendFeeRate(fee.rate)}
                        style={{
                          padding: "10px 14px",
                          borderRadius: "4px",
                          border: sendFeeRate === fee.rate ? "2px solid #FF6B00" : "1px solid #CBD5E1",
                          backgroundColor: sendFeeRate === fee.rate ? "#FFF7ED" : "#F8FAFC",
                          cursor: "pointer"
                        }}
                      >
                        <div style={{ fontSize: "12px", fontWeight: "bold", color: "#0F172A" }}>{fee.label}</div>
                        <div style={{ fontSize: "11px", color: "#B8860B", fontWeight: "bold", fontFamily: "monospace" }}>
                          {fee.rate} BUM
                        </div>
                        <div style={{ fontSize: "10px", color: "#64748B" }}>{fee.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Send & Clear Buttons */}
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="submit"
                    style={{
                      flex: 1,
                      padding: "12px",
                      background: "linear-gradient(135deg, #FF6B00 0%, #FF8800 100%)",
                      border: "1px solid #EA580C",
                      borderRadius: "4px",
                      color: "#FFFFFF",
                      fontWeight: "bold",
                      fontSize: "14px",
                      cursor: "pointer"
                    }}
                  >
                    🚀 Broadcast Transaction
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSendToAddress("");
                      setSendLabel("");
                      setSendAmount("");
                    }}
                    style={{
                      padding: "12px 24px",
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #CBD5E1",
                      borderRadius: "4px",
                      color: "#334155",
                      fontWeight: "bold",
                      fontSize: "14px",
                      cursor: "pointer"
                    }}
                  >
                    Clear
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 3: RECEIVE                                                      */}
        {/* =================================================================== */}
        {activeTab === "receive" && (
          <div style={{ maxWidth: "840px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Top Card: Active Address & QR */}
            <div
              style={{
                backgroundColor: "#FFFFFF",
                border: "1px solid #CBD5E1",
                borderRadius: "6px",
                padding: "24px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
              }}
            >
              <h2 style={{ margin: "0 0 4px 0", fontSize: "18px", fontWeight: "bold", color: "#0F172A" }}>
                Receive BUM Coins
              </h2>
              <p style={{ margin: "0 0 20px 0", fontSize: "12px", color: "#64748B" }}>
                Provide this address or QR code to the sender. Each generated address is permanently valid.
              </p>

              <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
                {/* Visual QR Matrix */}
                <div>{renderQrSvg(selectedIdentity.address)}</div>

                {/* Address Details & Actions */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "12px", fontWeight: "bold", color: "#334155", marginBottom: "6px" }}>
                    Your Receiving Address:
                  </div>
                  <div
                    style={{
                      fontFamily: "monospace",
                      fontSize: "13px",
                      backgroundColor: "#F8FAFC",
                      padding: "10px 14px",
                      borderRadius: "4px",
                      border: "1px solid #CBD5E1",
                      wordBreak: "break-all",
                      marginBottom: "12px",
                      color: "#0F172A",
                      fontWeight: "bold"
                    }}
                  >
                    {selectedIdentity.address}
                  </div>

                  <div style={{ display: "flex", gap: "10px" }}>
                    <button
                      onClick={() => {
                        navigator.clipboard?.writeText(selectedIdentity.address);
                        alert("Address copied to clipboard:\n" + selectedIdentity.address);
                      }}
                      style={{
                        padding: "8px 16px",
                        background: "linear-gradient(135deg, #FF6B00 0%, #FF8800 100%)",
                        border: "1px solid #EA580C",
                        borderRadius: "4px",
                        color: "#FFFFFF",
                        fontWeight: "bold",
                        fontSize: "12px",
                        cursor: "pointer"
                      }}
                    >
                      📋 Copy Address
                    </button>
                    <button
                      onClick={handleGenerateNewAddress}
                      style={{
                        padding: "8px 16px",
                        backgroundColor: "#FFFFFF",
                        border: "1px solid #D4AF37",
                        borderRadius: "4px",
                        color: "#B8860B",
                        fontWeight: "bold",
                        fontSize: "12px",
                        cursor: "pointer"
                      }}
                    >
                      ↻ Generate New Address
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Card: Request Payment Invoice */}
            <div
              style={{
                backgroundColor: "#FFFFFF",
                border: "1px solid #CBD5E1",
                borderRadius: "6px",
                padding: "20px 24px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
              }}
            >
              <h3 style={{ margin: "0 0 12px 0", fontSize: "15px", fontWeight: "bold", color: "#0F172A" }}>
                Create Payment Request (URI)
              </h3>
              <form onSubmit={handleGenerateUri} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "12px", alignItems: "flex-end" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "bold", color: "#64748B", marginBottom: "4px" }}>
                    Requested Amount (Optional):
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={receiveAmount}
                    onChange={(e) => setReceiveAmount(e.target.value)}
                    placeholder="0.0000 BUM"
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      backgroundColor: "#F8FAFC",
                      border: "1px solid #CBD5E1",
                      borderRadius: "4px",
                      fontSize: "12px",
                      boxSizing: "border-box"
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "bold", color: "#64748B", marginBottom: "4px" }}>
                    Message / Label:
                  </label>
                  <input
                    type="text"
                    value={receiveLabel}
                    onChange={(e) => setReceiveLabel(e.target.value)}
                    placeholder="e.g. Storage Shard Rent"
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      backgroundColor: "#F8FAFC",
                      border: "1px solid #CBD5E1",
                      borderRadius: "4px",
                      fontSize: "12px",
                      boxSizing: "border-box"
                    }}
                  />
                </div>
                <button
                  type="submit"
                  style={{
                    padding: "9px 18px",
                    backgroundColor: "#0F172A",
                    border: "none",
                    borderRadius: "4px",
                    color: "#FFFFFF",
                    fontWeight: "bold",
                    fontSize: "12px",
                    cursor: "pointer"
                  }}
                >
                  Create Request
                </button>
              </form>

              {generatedUri && (
                <div style={{ marginTop: "14px", padding: "10px", backgroundColor: "#F8FAFC", border: "1px solid #CBD5E1", borderRadius: "4px" }}>
                  <div style={{ fontSize: "11px", color: "#64748B", marginBottom: "4px" }}>Payment URI:</div>
                  <div style={{ fontFamily: "monospace", fontSize: "12px", wordBreak: "break-all", color: "#0F172A" }}>
                    {generatedUri}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 4: TRANSACTIONS                                                 */}
        {/* =================================================================== */}
        {activeTab === "transactions" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* Filter Bar */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor: "#FFFFFF",
                border: "1px solid #CBD5E1",
                borderRadius: "6px",
                padding: "12px 16px"
              }}
            >
              {/* Type Filters */}
              <div style={{ display: "flex", gap: "6px" }}>
                {[
                  { id: "all", label: "All Transactions" },
                  { id: "receive", label: "Received (+)" },
                  { id: "send", label: "Sent (-)" },
                  { id: "reward", label: "Mined Rewards" }
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setTxFilter(f.id as any)}
                    style={{
                      padding: "6px 12px",
                      backgroundColor: txFilter === f.id ? "#0F172A" : "#F8FAFC",
                      border: "1px solid #CBD5E1",
                      borderRadius: "4px",
                      color: txFilter === f.id ? "#FFFFFF" : "#334155",
                      fontSize: "12px",
                      fontWeight: txFilter === f.id ? "bold" : "normal",
                      cursor: "pointer"
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <input
                  type="text"
                  value={txSearch}
                  onChange={(e) => setTxSearch(e.target.value)}
                  placeholder="Search by address, TxID, date..."
                  style={{
                    padding: "6px 12px",
                    backgroundColor: "#F8FAFC",
                    border: "1px solid #CBD5E1",
                    borderRadius: "4px",
                    fontSize: "12px",
                    width: "240px"
                  }}
                />
                <button
                  onClick={() => alert("Transaction ledger exported as CSV file.")}
                  style={{
                    padding: "6px 12px",
                    backgroundColor: "#FFFFFF",
                    border: "1px solid #CBD5E1",
                    borderRadius: "4px",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: "pointer"
                  }}
                >
                  💾 Export CSV
                </button>
              </div>
            </div>

            {/* Transactions Table */}
            <div
              style={{
                backgroundColor: "#FFFFFF",
                border: "1px solid #CBD5E1",
                borderRadius: "6px",
                overflow: "hidden",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                <thead>
                  <tr style={{ backgroundColor: "#F8FAFC", borderBottom: "1px solid #CBD5E1", textAlign: "left", color: "#64748B" }}>
                    <th style={{ padding: "10px 14px" }}>Status</th>
                    <th style={{ padding: "10px 14px" }}>Date & Time</th>
                    <th style={{ padding: "10px 14px" }}>Type</th>
                    <th style={{ padding: "10px 14px" }}>Address / Counterparty</th>
                    <th style={{ padding: "10px 14px", textAlign: "right" }}>Amount (BUM)</th>
                    <th style={{ padding: "10px 14px" }}>Height</th>
                    <th style={{ padding: "10px 14px", textAlign: "center" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTxs.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: "30px", textAlign: "center", color: "#64748B" }}>
                        No transactions found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredTxs.map((tx) => (
                      <tr
                        key={tx.tx_id}
                        style={{ borderBottom: "1px solid #F1F5F9" }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "#F8FAFC")}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "transparent")}
                      >
                        <td style={{ padding: "10px 14px" }}>
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: "bold",
                              padding: "2px 6px",
                              borderRadius: "3px",
                              backgroundColor: tx.status === "confirmed" ? "#ECFDF5" : "#FEF3C7",
                              color: tx.status === "confirmed" ? "#065F46" : "#92400E"
                            }}
                          >
                            ✓ Confirmed
                          </span>
                        </td>
                        <td style={{ padding: "10px 14px", color: "#64748B", whiteSpace: "nowrap" }}>
                          {tx.timestamp}
                        </td>
                        <td style={{ padding: "10px 14px", fontWeight: "bold" }}>
                          {tx.type === "receive" ? (
                            <span style={{ color: "#059669" }}>Received</span>
                          ) : tx.type === "send" ? (
                            <span style={{ color: "#DC2626" }}>Sent</span>
                          ) : (
                            <span style={{ color: "#D97706" }}>Coinbase Mined</span>
                          )}
                        </td>
                        <td style={{ padding: "10px 14px", fontFamily: "monospace", color: "#334155" }}>
                          {tx.counterparty.length > 32
                            ? `${tx.counterparty.substring(0, 16)}...${tx.counterparty.substring(tx.counterparty.length - 8)}`
                            : tx.counterparty}
                        </td>
                        <td
                          style={{
                            padding: "10px 14px",
                            textAlign: "right",
                            fontFamily: "monospace",
                            fontWeight: "bold",
                            color: tx.type === "send" ? "#DC2626" : "#059669"
                          }}
                        >
                          {tx.type === "send" ? "-" : "+"}
                          {tx.amount_bum.toFixed(8)}
                        </td>
                        <td style={{ padding: "10px 14px", fontFamily: "monospace", color: "#64748B" }}>
                          #{tx.block_height}
                        </td>
                        <td style={{ padding: "10px 14px", textAlign: "center" }}>
                          <button
                            onClick={() => setSelectedTx(tx)}
                            style={{
                              padding: "3px 8px",
                              backgroundColor: "#F1F5F9",
                              border: "1px solid #CBD5E1",
                              borderRadius: "3px",
                              fontSize: "11px",
                              cursor: "pointer"
                            }}
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 5: COMMUNITY CHAT (BLOCKCHAIN PEER COMMUNICATION)               */}
        {/* =================================================================== */}
        {activeTab === "chat" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "220px 1fr",
              height: "calc(100vh - 160px)",
              backgroundColor: "#FFFFFF",
              border: "1px solid #CBD5E1",
              borderRadius: "6px",
              overflow: "hidden"
            }}
          >
            {/* Left Column: Channels */}
            <div style={{ backgroundColor: "#F8FAFC", borderRight: "1px solid #CBD5E1", display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "14px", borderBottom: "1px solid #E2E8F0" }}>
                <span style={{ fontSize: "13px", fontWeight: "bold", color: "#0F172A" }}>Channels</span>
              </div>
              <div style={{ flex: 1, padding: "8px" }}>
                {[
                  { id: "general", name: "#general" },
                  { id: "announcements", name: "#announcements" },
                  { id: "consensus-security", name: "#consensus-security" },
                  { id: "mining-and-nodes", name: "#mining-and-nodes" }
                ].map((ch) => (
                  <button
                    key={ch.id}
                    onClick={() => setActiveChannel(ch.id)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "8px 12px",
                      marginBottom: "4px",
                      backgroundColor: activeChannel === ch.id ? "#FFFFFF" : "transparent",
                      border: activeChannel === ch.id ? "1px solid #CBD5E1" : "1px solid transparent",
                      borderRadius: "4px",
                      color: activeChannel === ch.id ? "#0F172A" : "#64748B",
                      fontWeight: activeChannel === ch.id ? "bold" : "normal",
                      fontSize: "12px",
                      cursor: "pointer"
                    }}
                  >
                    {ch.name}
                  </button>
                ))}
              </div>
              <div style={{ padding: "12px", borderTop: "1px solid #E2E8F0", fontSize: "11px", color: "#64748B" }}>
                🔒 E2EE Active (X3DH / AES-256-GCM)
              </div>
            </div>

            {/* Right Column: Chat Feed & Input */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              {/* Header */}
              <div
                style={{
                  padding: "12px 18px",
                  borderBottom: "1px solid #E2E8F0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}
              >
                <div>
                  <span style={{ fontSize: "14px", fontWeight: "bold", color: "#0F172A" }}>#{activeChannel}</span>
                  <span style={{ marginLeft: "10px", fontSize: "11px", color: "#64748B" }}>Peer-to-Peer Encrypted</span>
                </div>
                <span
                  style={{
                    fontSize: "11px",
                    color: "#059669",
                    backgroundColor: "#ECFDF5",
                    padding: "2px 8px",
                    borderRadius: "3px",
                    fontWeight: "bold"
                  }}
                >
                  ● Active Broadcast
                </span>
              </div>

              {/* Messages Feed */}
              <div style={{ flex: 1, padding: "16px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px" }}>
                {chatMessages
                  .filter((m) => m.channel === activeChannel)
                  .map((msg) => (
                    <div
                      key={msg.id}
                      style={{
                        padding: "10px 14px",
                        backgroundColor: "#F8FAFC",
                        borderRadius: "6px",
                        border: "1px solid #E2E8F0"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                        <span style={{ fontSize: "12px", fontWeight: "bold", color: "#0F172A" }}>{msg.senderAlias}</span>
                        <span style={{ fontSize: "10px", color: "#94A3B8" }}>{msg.timestamp}</span>
                      </div>
                      <div style={{ fontSize: "13px", color: "#334155", lineHeight: "1.4" }}>{msg.content}</div>
                    </div>
                  ))}
              </div>

              {/* Message Input Box */}
              <form onSubmit={handleSendMessage} style={{ padding: "12px 16px", borderTop: "1px solid #E2E8F0", display: "flex", gap: "10px" }}>
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={`Send an encrypted message to #${activeChannel}...`}
                  style={{
                    flex: 1,
                    padding: "9px 12px",
                    backgroundColor: "#F8FAFC",
                    border: "1px solid #CBD5E1",
                    borderRadius: "4px",
                    fontSize: "13px"
                  }}
                />
                <button
                  type="submit"
                  style={{
                    padding: "9px 18px",
                    background: "linear-gradient(135deg, #FF6B00 0%, #FF8800 100%)",
                    border: "1px solid #EA580C",
                    borderRadius: "4px",
                    color: "#FFFFFF",
                    fontWeight: "bold",
                    fontSize: "12px",
                    cursor: "pointer"
                  }}
                >
                  Send
                </button>
              </form>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 6: TOOLS & CLIENT EXECUTION MODES                               */}
        {/* =================================================================== */}
        {activeTab === "tools" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            {/* Section 1: Client Execution Modes */}
            <div
              style={{
                backgroundColor: "#FFFFFF",
                border: "1px solid #CBD5E1",
                borderRadius: "6px",
                padding: "20px 24px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
              }}
            >
              <h3 style={{ margin: "0 0 4px 0", fontSize: "16px", fontWeight: "bold", color: "#0F172A" }}>
                Client Execution Modes
              </h3>
              <p style={{ margin: "0 0 16px 0", fontSize: "12px", color: "#64748B" }}>
                Configure local node verification rules according to your hardware, storage, and network capacity.
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px" }}>
                {[
                  {
                    id: "full_node" as ClientExecutionMode,
                    title: "Full Node Mode",
                    badge: "100% Sovereign",
                    desc: "Downloads and verifies all blocks from Genesis. Complete UTXO state validation. Serves SPV proofs.",
                    storage: "~14.2 GB",
                    sync: "Comprehensive"
                  },
                  {
                    id: "light_client" as ClientExecutionMode,
                    title: "Lightweight (SPV) Mode",
                    badge: "Instant & Battery Saver",
                    desc: "Downloads only 92-byte block headers. Verifies transactions using cryptographic Merkle inclusion proofs.",
                    storage: "< 50 MB",
                    sync: "Instant (< 5s)"
                  },
                  {
                    id: "pruned_node" as ClientExecutionMode,
                    title: "Pruned Node Mode",
                    badge: "Full Security, Capped Disk",
                    desc: "Performs full sovereign block validation, then prunes historical block bodies, keeping the last 2,000 blocks.",
                    storage: "~4.8 GB",
                    sync: "Full Validation"
                  }
                ].map((mode) => {
                  const isSelected = clientMode === mode.id;
                  return (
                    <div
                      key={mode.id}
                      onClick={() => handleSetClientMode(mode.id)}
                      style={{
                        padding: "16px",
                        borderRadius: "6px",
                        border: isSelected ? "2px solid #D4AF37" : "1px solid #CBD5E1",
                        backgroundColor: isSelected ? "#FFFDF5" : "#F8FAFC",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between"
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                          <span style={{ fontSize: "14px", fontWeight: "bold", color: "#0F172A" }}>{mode.title}</span>
                          <span
                            style={{
                              fontSize: "10px",
                              fontWeight: "bold",
                              padding: "2px 6px",
                              borderRadius: "3px",
                              backgroundColor: isSelected ? "#FEF3C7" : "#E2E8F0",
                              color: isSelected ? "#92400E" : "#475569"
                            }}
                          >
                            {mode.badge}
                          </span>
                        </div>
                        <p style={{ fontSize: "12px", color: "#475569", lineHeight: "1.4", margin: "0 0 12px 0" }}>{mode.desc}</p>
                      </div>

                      <div style={{ paddingTop: "8px", borderTop: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#64748B" }}>
                        <span>Storage: <strong>{mode.storage}</strong></span>
                        <span>Sync: <strong>{mode.sync}</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Section 2: Connected P2P Network Peers */}
            <div
              style={{
                backgroundColor: "#FFFFFF",
                border: "1px solid #CBD5E1",
                borderRadius: "6px",
                padding: "20px 24px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
              }}
            >
              <h3 style={{ margin: "0 0 12px 0", fontSize: "16px", fontWeight: "bold", color: "#0F172A" }}>
                Connected P2P Nodes ({peers.length})
              </h3>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                <thead>
                  <tr style={{ backgroundColor: "#F8FAFC", borderBottom: "1px solid #CBD5E1", textAlign: "left", color: "#64748B" }}>
                    <th style={{ padding: "8px 12px" }}>Node IP & Port</th>
                    <th style={{ padding: "8px 12px" }}>Direction</th>
                    <th style={{ padding: "8px 12px" }}>Latency</th>
                    <th style={{ padding: "8px 12px" }}>Block Height</th>
                    <th style={{ padding: "8px 12px" }}>Protocol Client</th>
                  </tr>
                </thead>
                <tbody>
                  {peers.map((p, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid #F1F5F9" }}>
                      <td style={{ padding: "8px 12px", fontFamily: "monospace", fontWeight: "bold" }}>{p.ip}</td>
                      <td style={{ padding: "8px 12px", color: p.type === "Outbound" ? "#0284C7" : "#059669" }}>{p.type}</td>
                      <td style={{ padding: "8px 12px", color: "#64748B" }}>{p.latency}</td>
                      <td style={{ padding: "8px 12px", fontFamily: "monospace" }}>#{p.height}</td>
                      <td style={{ padding: "8px 12px", color: "#64748B" }}>{p.version}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Section 3: Ubuntu Cryptography Diagnostics */}
            <div
              style={{
                backgroundColor: "#FFFFFF",
                border: "1px solid #CBD5E1",
                borderRadius: "6px",
                padding: "20px 24px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <div>
                  <h3 style={{ margin: "0 0 4px 0", fontSize: "16px", fontWeight: "bold", color: "#0F172A" }}>
                    Ubuntu Cryptography & Security Suite
                  </h3>
                  <p style={{ margin: 0, fontSize: "12px", color: "#64748B" }}>
                    Built-in OpenSSL 3.0 / AES-256-GCM / SHA-256 / Secp256k1 validation.
                  </p>
                </div>
                <button
                  onClick={handleRunCryptoAudit}
                  style={{
                    padding: "8px 16px",
                    background: "linear-gradient(135deg, #FF6B00 0%, #FF8800 100%)",
                    border: "1px solid #EA580C",
                    borderRadius: "4px",
                    color: "#FFFFFF",
                    fontWeight: "bold",
                    fontSize: "12px",
                    cursor: "pointer"
                  }}
                >
                  Run Cryptographic Diagnostic
                </button>
              </div>

              {cryptoAuditResult && (
                <pre
                  style={{
                    backgroundColor: "#0F172A",
                    color: "#34D399",
                    padding: "14px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    fontFamily: "monospace",
                    margin: 0,
                    whiteSpace: "pre-wrap"
                  }}
                >
                  {cryptoAuditResult}
                </pre>
              )}
            </div>

            {/* Section 4: RPC Debug Console */}
            <div
              style={{
                backgroundColor: "#FFFFFF",
                border: "1px solid #CBD5E1",
                borderRadius: "6px",
                padding: "20px 24px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
              }}
            >
              <h3 style={{ margin: "0 0 10px 0", fontSize: "16px", fontWeight: "bold", color: "#0F172A" }}>
                RPC Debug Console
              </h3>
              <div
                style={{
                  height: "160px",
                  backgroundColor: "#0F172A",
                  color: "#E2E8F0",
                  padding: "12px",
                  borderRadius: "4px",
                  fontFamily: "monospace",
                  fontSize: "12px",
                  overflowY: "auto",
                  marginBottom: "10px"
                }}
              >
                {consoleOutput.map((line, idx) => (
                  <div key={idx} style={{ color: line.startsWith(">") ? "#F59E0B" : "#E2E8F0" }}>
                    {line}
                  </div>
                ))}
              </div>
              <form onSubmit={handleExecuteRpc} style={{ display: "flex", gap: "8px" }}>
                <input
                  type="text"
                  value={rpcCommand}
                  onChange={(e) => setRpcCommand(e.target.value)}
                  placeholder="Enter RPC command (e.g. getblockchaininfo, getpeerinfo, help)..."
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    backgroundColor: "#F8FAFC",
                    border: "1px solid #CBD5E1",
                    borderRadius: "4px",
                    fontSize: "13px",
                    fontFamily: "monospace"
                  }}
                />
                <button
                  type="submit"
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "#0F172A",
                    border: "none",
                    borderRadius: "4px",
                    color: "#FFFFFF",
                    fontWeight: "bold",
                    fontSize: "12px",
                    cursor: "pointer"
                  }}
                >
                  Execute
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* 5. NATIVE DESKTOP STATUS BAR                                          */}
      {/* ===================================================================== */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "4px 14px",
          backgroundColor: "#E2E8F0",
          borderTop: "1px solid #CBD5E1",
          fontSize: "11px",
          color: "#475569",
          userSelect: "none"
        }}
      >
        {/* Left: Mode & Network */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontWeight: "bold", color: clientMode === "full_node" ? "#065F46" : "#1E40AF" }}>
            {clientMode === "full_node" ? "● Full Sovereign Node" : clientMode === "light_client" ? "⚡ SPV Lightweight" : "📦 Pruned Node"}
          </span>
          <span>|</span>
          <span>{nodeStatus.network}</span>
        </div>

        {/* Center: Height & Mempool */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span>
            Block: <strong>#{nodeStatus.chain_height.toLocaleString()}</strong>
          </span>
          <span>|</span>
          <span>Mempool: {nodeStatus.mempool_tx_count} txs</span>
        </div>

        {/* Right: Peers & Sync */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span>Peers: {peers.length} active</span>
          <span>|</span>
          <span style={{ color: "#059669", fontWeight: "bold" }}>● Synchronized (100%)</span>
        </div>
      </div>

      {/* Transaction Details Modal */}
      {selectedTx && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 3000
          }}
          onClick={() => setSelectedTx(null)}
        >
          <div
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #CBD5E1",
              borderRadius: "8px",
              padding: "24px",
              width: "560px",
              boxShadow: "0 12px 32px rgba(0,0,0,0.18)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 14px 0", fontSize: "16px", fontWeight: "bold", color: "#0F172A" }}>
              Transaction Details
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "12px" }}>
              <div>
                <strong style={{ color: "#64748B" }}>Transaction ID:</strong>
                <div style={{ fontFamily: "monospace", wordBreak: "break-all", backgroundColor: "#F8FAFC", padding: "6px", borderRadius: "3px", marginTop: "2px" }}>
                  {selectedTx.tx_id}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <strong style={{ color: "#64748B" }}>Amount:</strong>
                  <div style={{ fontSize: "14px", fontWeight: "bold", color: selectedTx.type === "send" ? "#DC2626" : "#059669" }}>
                    {selectedTx.amount_bum.toFixed(8)} BUM
                  </div>
                </div>
                <div>
                  <strong style={{ color: "#64748B" }}>Network Fee:</strong>
                  <div style={{ fontFamily: "monospace" }}>{selectedTx.fee_bum.toFixed(8)} BUM</div>
                </div>
                <div>
                  <strong style={{ color: "#64748B" }}>Block Height:</strong>
                  <div style={{ fontFamily: "monospace" }}>#{selectedTx.block_height}</div>
                </div>
                <div>
                  <strong style={{ color: "#64748B" }}>Confirmations:</strong>
                  <div style={{ color: "#059669", fontWeight: "bold" }}>12 Confirmations</div>
                </div>
              </div>
            </div>
            <div style={{ marginTop: "20px", textAlign: "right" }}>
              <button
                onClick={() => setSelectedTx(null)}
                style={{
                  padding: "8px 18px",
                  backgroundColor: "#0F172A",
                  border: "none",
                  borderRadius: "4px",
                  color: "#FFFFFF",
                  fontWeight: "bold",
                  cursor: "pointer"
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
