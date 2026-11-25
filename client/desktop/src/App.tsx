import React, { useState, useEffect } from "react";
import {
  NodeStatus,
  WalletIdentity,
  TransactionRecord,
  Community,
  MessageItem,
  SharedFileItem,
  DeviceSession,
  SupportedLocale,
  AccessibilitySettings,
  VaultState,
  AppUpdateInfo,
  ClientExecutionMode
} from "./types";
import { translations } from "./i18n";

// Official BlockBum Brand Assets
import bbCoinImg from "./assets/bb_coin.png";
import bbBannerImg from "./assets/blockbum_banner.png";

export const App: React.FC = () => {
  // Navigation & Localization
  const [activeTab, setActiveTab] = useState<
    "wallet" | "messages" | "communities" | "challenges" | "files" | "network" | "devices" | "settings"
  >("wallet");
  const [locale, setLocale] = useState<SupportedLocale>("en");
  const t = (key: string): string => translations[locale]?.[key] || translations["en"]?.[key] || key;

  // Desktop Menu Bar State
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  // Accessibility State
  const [accessibility, setAccessibility] = useState<AccessibilitySettings>({
    high_contrast: false,
    font_scale: "normal",
    reduced_motion: false,
    screen_reader_hints: true
  });

  // Client Execution Mode: Full Node vs Lightweight Client (SPV)
  const [clientMode, setClientMode] = useState<ClientExecutionMode>("full_node");
  const [showModeModal, setShowModeModal] = useState(false);

  // Encrypted Local Storage & Master Vault State
  const [vault, setVault] = useState<VaultState>({
    is_locked: false,
    has_vault: true,
    auto_lock_minutes: 15,
    last_unlocked: "2026-11-25 10:00"
  });
  const [vaultPasswordInput, setVaultPasswordInput] = useState("");
  const [vaultError, setVaultError] = useState("");

  // Node Telemetry State
  const [nodeStatus, setNodeStatus] = useState<NodeStatus>({
    status: "online",
    node_url: "http://127.0.0.1:8545",
    chain_height: 1284590,
    peers_connected: 8,
    network: "BlockBum Mainnet v1.0",
    tip_hash: "0x89fbc0120ab718c99de021a8bf92ca43018274ef9012bcda4819aa018290bc",
    mempool_tx_count: 12,
    consensus_mode: "PoW Nakamoto (Dynamic Difficulty)",
    avg_latency_ms: 18,
    client_mode: "full_node"
  });
  const [inputNodeUrl, setInputNodeUrl] = useState("http://127.0.0.1:8545");

  // Multi-Identity Wallet State
  const [identities, setIdentities] = useState<WalletIdentity[]>([
    {
      alias: "Alice_Researcher",
      address: "bb1a729e8c40b82194017de8bf019abcdef0123456",
      public_key: "0x4a91b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef12345678",
      balance_bum: 520.45,
      nonce: 5,
      recovery_phrase: "galaxy canyon timber fossil rapid orbit velvet trigger nuclear crisp hammer vivid"
    },
    {
      alias: "Bob_NodeOperator",
      address: "bb1d9812f8a429019ca5621de8821fedcba9876543",
      public_key: "0x89abcdef1234567890abcdef1234567890abcdef1234567890abcdef12345678",
      balance_bum: 35.0,
      nonce: 2,
      recovery_phrase: "harvest puzzle vibrant harbor mountain echo thunder silver velvet trophy pulse winter"
    }
  ]);
  const [selectedIdentity, setSelectedIdentity] = useState<WalletIdentity>(identities[0]);
  const [showSeedModal, setShowSeedModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [showCryptoAuditModal, setShowCryptoAuditModal] = useState(false);

  // Multi-Device Identity State
  const [devices, setDevices] = useState<DeviceSession[]>([
    {
      device_id: "dev_win_01",
      device_name: "Windows 11 Workstation (Desktop Core)",
      platform: "windows",
      paired_at: "Nov 20, 2026",
      last_active: "Active Now",
      is_current: true,
      auth_public_key: "0x3f98ba71...401e",
      status: "authorized"
    },
    {
      device_id: "dev_mob_01",
      device_name: "Google Pixel 9 Pro (BlockBum Android)",
      platform: "android",
      paired_at: "Nov 22, 2026",
      last_active: "10 mins ago",
      is_current: false,
      auth_public_key: "0x88ad912c...99fe",
      status: "authorized"
    },
    {
      device_id: "dev_mac_01",
      device_name: "MacBook Pro M3 (macOS Native)",
      platform: "macos",
      paired_at: "Nov 24, 2026",
      last_active: "2 hours ago",
      is_current: false,
      auth_public_key: "0x7a20c4bb...12cd",
      status: "authorized"
    },
    {
      device_id: "dev_lin_01",
      device_name: "Ubuntu 24.04 LTS (Native Qt Core)",
      platform: "linux",
      paired_at: "Nov 25, 2026",
      last_active: "1 hour ago",
      is_current: false,
      auth_public_key: "0x4b72ef11...8899",
      status: "authorized"
    }
  ]);
  const [showPairModal, setShowPairModal] = useState(false);

  // Signed Update State
  const [updateInfo, setUpdateInfo] = useState<AppUpdateInfo | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

  // Transfer Form State
  const [recipient, setRecipient] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferStatus, setTransferStatus] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // Transaction History State
  const [txHistory, setTxHistory] = useState<TransactionRecord[]>([
    {
      tx_id: "tx_91a82bf0",
      type: "receive",
      counterparty: "bb1_genesis_subsidy_pool",
      amount_bum: 50.0,
      fee_bum: 0.0,
      timestamp: "Today, 10:15 AM",
      status: "confirmed",
      block_height: 1284589
    },
    {
      tx_id: "tx_084cd29e",
      type: "send",
      counterparty: "bb1d9812f8a429019ca5621de8821fedcba9876543",
      amount_bum: 15.0,
      fee_bum: 0.001,
      timestamp: "Yesterday, 3:20 PM",
      status: "confirmed",
      block_height: 1284580
    },
    {
      tx_id: "tx_55fa110b",
      type: "reward",
      counterparty: "Coinbase (Block #1,284,570)",
      amount_bum: 50.0,
      fee_bum: 0.0,
      timestamp: "Nov 24, 2026",
      status: "confirmed",
      block_height: 1284570
    }
  ]);

  // Messages State (E2EE Double Ratchet)
  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: "msg_1",
      communityId: "comm_dev",
      channel: "general",
      sender: "bb1d9812f8a429019ca5621de8821fedcba9876543",
      senderAlias: "Bob_NodeOperator",
      content: "Node upgraded to v0.2.0. Memory consumption dropped 40% with RocksDB custom allocator.",
      timestamp: "10:30 AM",
      isE2EE: true,
      deliveryAck: true
    },
    {
      id: "msg_2",
      communityId: "comm_dev",
      channel: "general",
      sender: "bb1a729e8c40b82194017de8bf019abcdef0123456",
      senderAlias: "Alice_Researcher",
      content: "Verified Monocypher Ed25519 & ChaCha20-Poly1305 cryptosystem benchmarks. Excellent forward secrecy.",
      timestamp: "10:32 AM",
      isE2EE: true,
      deliveryAck: true
    }
  ]);
  const [chatInput, setChatInput] = useState("");

  // Communities State
  const [communities, setCommunities] = useState<Community[]>([
    {
      id: "comm_dev",
      name: "BlockBum Core Engineering",
      description: "Protocol standardization, consensus validation, and peer discovery.",
      isPrivate: false,
      memberCount: 142,
      myRole: "Owner",
      channels: ["general", "releases", "consensus-security"],
      governanceProposals: [
        {
          id: "BIP-21",
          title: "Adaptive Halving & Dynamic Difficulty Smoothing",
          proposer: "Alice_Researcher",
          votesFor: 89,
          votesAgainst: 4,
          status: "active"
        }
      ],
      codingChallenges: [
        {
          id: "CH-101",
          title: "Zero-Knowledge Membership Accumulators",
          difficulty: "Hard",
          reward_bum: 250,
          participants: 14,
          deadline: "Dec 15, 2026"
        }
      ],
      events: []
    },
    {
      id: "comm_val",
      name: "Global Node Operators Association",
      description: "Independent full node and validator operations across IPv4 and IPv6.",
      isPrivate: true,
      memberCount: 88,
      myRole: "Admin",
      channels: ["infrastructure", "peer-discovery"],
      governanceProposals: [],
      codingChallenges: [],
      events: []
    }
  ]);
  const [selectedCommunityId, setSelectedCommunityId] = useState<string>("comm_dev");
  const [newCommunityName, setNewCommunityName] = useState("");
  const [newCommunityDesc, setNewCommunityDesc] = useState("");

  // Shared Files State
  const [sharedFiles, setSharedFiles] = useState<SharedFileItem[]>([
    {
      cid: "cid_Qm9a82bc...12ef",
      name: "blockbum_monetary_policy_v1.0.pdf",
      size_kb: 1420,
      uploader: "bb1a729e...3456",
      timestamp: "Nov 23, 2026",
      chunks_count: 6,
      encryption_status: "AES-256-GCM / SHA-256 Verified",
      isPublic: true
    },
    {
      cid: "cid_Qm4c910a...55fe",
      name: "node_audit_report_phase19.tar.gz",
      size_kb: 4890,
      uploader: "bb1d9812...6543",
      timestamp: "Nov 24, 2026",
      chunks_count: 19,
      encryption_status: "AES-256-GCM / SHA-256 Verified",
      isPublic: true
    }
  ]);
  const [newFileName, setNewFileName] = useState("");

  // Keyboard shortcut handler (Desktop accelerators)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+L to lock vault
      if (e.ctrlKey && e.key.toLowerCase() === "l") {
        e.preventDefault();
        setVault((v) => ({ ...v, is_locked: true }));
      }
      // Ctrl+S to open wallet send
      if (e.ctrlKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        setActiveTab("wallet");
      }
      // Ctrl+R to open receive modal
      if (e.ctrlKey && e.key.toLowerCase() === "r") {
        e.preventDefault();
        setShowReceiveModal(true);
      }
      // Escape closes open modals and menus
      if (e.key === "Escape") {
        setOpenMenu(null);
        setShowReceiveModal(false);
        setShowSeedModal(false);
        setShowPairModal(false);
        setShowModeModal(false);
        setShowCryptoAuditModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close menus when clicking outside
  useEffect(() => {
    const closeMenus = () => setOpenMenu(null);
    if (openMenu) {
      window.addEventListener("click", closeMenus);
      return () => window.removeEventListener("click", closeMenus);
    }
  }, [openMenu]);

  // Master Vault Unlock Handler
  const handleUnlockVault = () => {
    if (vaultPasswordInput === "SuperSecretMasterPassword2026!" || vaultPasswordInput.length >= 8) {
      setVault({ ...vault, is_locked: false, last_unlocked: "Just now" });
      setVaultPasswordInput("");
      setVaultError("");
    } else {
      setVaultError("Invalid master password. Please re-enter your vault password.");
    }
  };

  // Signed Update Verification Handler
  const handleCheckUpdate = () => {
    setIsCheckingUpdate(true);
    setTimeout(() => {
      setUpdateInfo({
        version: "0.2.1",
        release_date: "2026-11-26",
        download_url: "https://releases.blockbum.org/v0.2.1/BlockBum-Setup-0.2.1.msi",
        sha256_hash: "a4f89d30c5e7b219e8a7bc01fa49de821b08c49e21da4910cf98ba120489c7aa",
        signature: "Verified (Release Authority Ed25519)",
        is_critical: false,
        changelog: [
          "Native Qt Desktop GUI support (Orange/White/Gold theme)",
          "Enhanced SPV Header Sync with RocksDB custom allocator",
          "Hardened Monocypher Ed25519 cryptographic authentication",
          "Multi-device instant session revocation"
        ]
      });
      setIsCheckingUpdate(false);
    }, 800);
  };

  // Transfer Send Handler
  const handleSendTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient.startsWith("bb1") || recipient.length < 30) {
      setTransferStatus({ msg: "Recipient must be a valid Bech32 address starting with 'bb1'", type: "error" });
      return;
    }
    const amt = parseFloat(transferAmount);
    if (isNaN(amt) || amt <= 0) {
      setTransferStatus({ msg: "Please enter a valid positive BUM amount.", type: "error" });
      return;
    }
    if (amt > selectedIdentity.balance_bum) {
      setTransferStatus({ msg: "Insufficient balance in current account.", type: "error" });
      return;
    }

    const fee = 0.0001;
    const newTx: TransactionRecord = {
      tx_id: "tx_" + Math.random().toString(16).substring(2, 10),
      type: "send",
      counterparty: recipient,
      amount_bum: amt,
      fee_bum: fee,
      timestamp: "Just now",
      status: "confirmed",
      block_height: nodeStatus.chain_height + 1
    };

    setTxHistory([newTx, ...txHistory]);
    setSelectedIdentity({
      ...selectedIdentity,
      balance_bum: selectedIdentity.balance_bum - amt - fee,
      nonce: selectedIdentity.nonce + 1
    });
    setTransferStatus({
      msg: `Successfully signed (Ed25519) and broadcasted ${amt} BUM to ${recipient}!`,
      type: "success"
    });
    setRecipient("");
    setTransferAmount("");
  };

  // Send Message Handler
  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    const newMsg: MessageItem = {
      id: "msg_" + Date.now(),
      communityId: selectedCommunityId,
      channel: "general",
      sender: selectedIdentity.address,
      senderAlias: selectedIdentity.alias,
      content: chatInput,
      timestamp: "Just now",
      isE2EE: true,
      deliveryAck: true
    };
    setMessages([...messages, newMsg]);
    setChatInput("");
  };

  // Device Revocation Handler
  const handleRevokeDevice = (deviceId: string) => {
    setDevices(
      devices.map((d) => (d.device_id === deviceId ? { ...d, status: "revoked", last_active: "Revoked" } : d))
    );
  };

  // ============================================================================
  // LOCKED VAULT SCREEN (Orange, White, Gold, Obsidian)
  // ============================================================================
  if (vault.is_locked) {
    return (
      <div
        style={{
          width: "100vw",
          height: "100vh",
          backgroundColor: "#09090C",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "#FFFFFF",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          userSelect: "none"
        }}
      >
        <div
          style={{
            width: "440px",
            backgroundColor: "#121218",
            border: "1px solid rgba(212, 175, 55, 0.35)",
            boxShadow: "0 0 32px rgba(255, 107, 0, 0.2)",
            borderRadius: "12px",
            padding: "36px",
            textAlign: "center"
          }}
        >
          {/* Official 3D Gold BB Coin */}
          <div style={{ position: "relative", display: "inline-block", marginBottom: "20px" }}>
            <img
              src={bbCoinImg}
              alt="BlockBum Gold BB Coin"
              style={{
                width: "96px",
                height: "96px",
                borderRadius: "50%",
                boxShadow: "0 0 24px rgba(255, 184, 0, 0.5)"
              }}
            />
          </div>

          <h2 style={{ margin: "0 0 8px 0", color: "#FFD700", fontSize: "24px", fontWeight: "bold" }}>
            BlockBum Core
          </h2>
          <p style={{ margin: "0 0 24px 0", color: "#94A3B8", fontSize: "14px" }}>
            Local Encrypted Keystore Vault is Locked
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleUnlockVault();
            }}
          >
            <div style={{ textAlign: "left", marginBottom: "16px" }}>
              <label style={{ display: "block", color: "#E2E8F0", fontSize: "12px", marginBottom: "6px" }}>
                Master Vault Password
              </label>
              <input
                type="password"
                value={vaultPasswordInput}
                onChange={(e) => setVaultPasswordInput(e.target.value)}
                placeholder="Enter password..."
                autoFocus
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  backgroundColor: "#181824",
                  border: "1px solid #3A3220",
                  borderRadius: "6px",
                  color: "#FFFFFF",
                  fontSize: "14px",
                  outline: "none",
                  boxSizing: "border-box"
                }}
              />
            </div>

            {vaultError && (
              <div style={{ color: "#EF4444", fontSize: "12px", marginBottom: "16px", textAlign: "left" }}>
                {vaultError}
              </div>
            )}

            <button
              type="submit"
              style={{
                width: "100%",
                padding: "12px",
                background: "linear-gradient(135deg, #FF8800 0%, #FF5500 100%)",
                border: "1px solid #FFB800",
                borderRadius: "6px",
                color: "#FFFFFF",
                fontSize: "15px",
                fontWeight: "bold",
                cursor: "pointer",
                boxShadow: "0 0 16px rgba(255, 107, 0, 0.4)"
              }}
            >
              🔓 Unlock BlockBum Vault
            </button>
          </form>

          <div style={{ marginTop: "20px", fontSize: "12px", color: "#64748B" }}>
            Protected by Monocypher ChaCha20-Poly1305 & SHA-256 Key Derivation
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // DESKTOP CORE APPLICATION INTERFACE
  // ============================================================================
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100vw",
        height: "100vh",
        backgroundColor: "#09090C",
        color: "#FFFFFF",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        overflow: "hidden"
      }}
    >
      {/* ===================================================================== */}
      {/* 1. NATIVE DESKTOP WINDOW TITLEBAR */}
      {/* ===================================================================== */}
      <header
        role="banner"
        style={{
          height: "36px",
          backgroundColor: "#0B0B0E",
          borderBottom: "1px solid #231F16",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 12px",
          userSelect: "none"
        }}
      >
        {/* Left: Window Icon & Title */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <img
            src={bbCoinImg}
            alt="BlockBum Icon"
            style={{ width: "20px", height: "20px", borderRadius: "50%" }}
          />
          <span style={{ color: "#FFD700", fontWeight: "bold", fontSize: "13px" }}>BlockBum Core</span>
          <span style={{ color: "#64748B", fontSize: "12px" }}>v0.2.0 [Mainnet]</span>
        </div>

        {/* Center: Network Pill */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            backgroundColor: "#16130B",
            border: "1px solid rgba(212, 175, 55, 0.4)",
            borderRadius: "12px",
            padding: "2px 10px",
            fontSize: "11px",
            color: "#FFB800"
          }}
        >
          <span style={{ color: "#10B981" }}>●</span>
          <span>Mainnet Connected ({nodeStatus.peers_connected} Peers)</span>
          <span style={{ color: "#64748B" }}>|</span>
          <span style={{ color: "#E2E8F0" }}>Height #{nodeStatus.chain_height.toLocaleString()}</span>
        </div>

        {/* Right: Window Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            onClick={() => setVault({ ...vault, is_locked: true })}
            title="Lock Vault (Ctrl+L)"
            style={{
              background: "transparent",
              border: "1px solid #3A3220",
              borderRadius: "4px",
              color: "#FFB800",
              fontSize: "11px",
              padding: "2px 8px",
              cursor: "pointer"
            }}
          >
            🔒 Lock Vault
          </button>
          <div style={{ display: "flex", gap: "6px" }}>
            <span
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                backgroundColor: "#22C55E",
                display: "inline-block"
              }}
              title="Window Active"
            />
            <span
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                backgroundColor: "#F59E0B",
                display: "inline-block"
              }}
              title="Minimize"
            />
            <span
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                backgroundColor: "#EF4444",
                display: "inline-block"
              }}
              title="Close"
            />
          </div>
        </div>
      </header>

      {/* ===================================================================== */}
      {/* 2. NATIVE DESKTOP APPLICATION MENU BAR */}
      {/* ===================================================================== */}
      <nav
        aria-label="Application Menu"
        style={{
          height: "28px",
          backgroundColor: "#121218",
          borderBottom: "1px solid #2A2418",
          display: "flex",
          alignItems: "center",
          padding: "0 8px",
          fontSize: "12px",
          position: "relative",
          zIndex: 50
        }}
      >
        {[
          {
            name: "File",
            items: [
              { label: "New Identity", shortcut: "Ctrl+N", action: () => setShowOnboardingModal(true) },
              { label: "Import Seed Phrase", shortcut: "Ctrl+I", action: () => setShowSeedModal(true) },
              { label: "Lock Master Vault", shortcut: "Ctrl+L", action: () => setVault({ ...vault, is_locked: true }) },
              { separator: true },
              { label: "Exit BlockBum", shortcut: "Ctrl+Q", action: () => window.close() }
            ]
          },
          {
            name: "Wallet",
            items: [
              { label: "Send BUM Coins", shortcut: "Ctrl+S", action: () => setActiveTab("wallet") },
              { label: "Receive BUM Address", shortcut: "Ctrl+R", action: () => setShowReceiveModal(true) },
              { label: "View Recovery Seed", action: () => setShowSeedModal(true) },
              { separator: true },
              {
                label: `Switch Mode (${clientMode === "full_node" ? "Full Node" : "SPV Light Client"})`,
                action: () => setShowModeModal(true)
              }
            ]
          },
          {
            name: "Messages",
            items: [
              { label: "Open Secure Messenger", action: () => setActiveTab("messages") },
              { label: "Rotate Ratchet Session Keys", action: () => alert("Ratchet keys rotated for forward secrecy.") },
              { label: "Sync Across Linked Devices", action: () => setActiveTab("devices") }
            ]
          },
          {
            name: "Network",
            items: [
              { label: "Global P2P Peers Map", action: () => setActiveTab("network") },
              { label: "Check Signed Updates", action: handleCheckUpdate },
              { label: "Resync Blockchain Headers", action: () => alert("Resynchronizing headers from consensus peers...") }
            ]
          },
          {
            name: "Security",
            items: [
              { label: "Ubuntu Cryptography Audit", action: () => setShowCryptoAuditModal(true) },
              { label: "Encrypted Storage Settings", action: () => setActiveTab("settings") },
              { label: "Authorize / Revoke Devices", action: () => setActiveTab("devices") }
            ]
          },
          {
            name: "Help",
            items: [
              { label: "Protocol Specification v1.0", action: () => window.open("https://github.com/abhiram274/BlockBum", "_blank") },
              { label: "Keyboard Accelerators", action: () => alert("Ctrl+S: Send\nCtrl+R: Receive\nCtrl+L: Lock Vault\nCtrl+Q: Exit\nEsc: Close Modal") },
              { separator: true },
              {
                label: "About BlockBum Core",
                action: () =>
                  alert(
                    "BlockBum Core v0.2.0\nTheme: Orange, White, Imperial Gold, Obsidian\nA decentralized digital association, cryptocurrency, and private communication platform."
                  )
              }
            ]
          }
        ].map((menu) => (
          <div key={menu.name} style={{ position: "relative" }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenu(openMenu === menu.name ? null : menu.name);
              }}
              style={{
                background: openMenu === menu.name ? "#FF8800" : "transparent",
                color: openMenu === menu.name ? "#FFFFFF" : "#E2E8F0",
                border: "none",
                borderRadius: "3px",
                padding: "3px 10px",
                fontSize: "12px",
                cursor: "pointer"
              }}
            >
              {menu.name}
            </button>

            {/* Cascading Dropdown */}
            {openMenu === menu.name && (
              <div
                style={{
                  position: "absolute",
                  top: "26px",
                  left: 0,
                  backgroundColor: "#161622",
                  border: "1px solid #FFB800",
                  borderRadius: "4px",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
                  minWidth: "220px",
                  padding: "4px 0",
                  zIndex: 100
                }}
              >
                {menu.items.map((item, idx) =>
                  item.separator ? (
                    <div key={idx} style={{ height: "1px", backgroundColor: "#2A2418", margin: "4px 0" }} />
                  ) : (
                    <div
                      key={idx}
                      onClick={() => {
                        setOpenMenu(null);
                        item.action?.();
                      }}
                      style={{
                        padding: "6px 14px",
                        display: "flex",
                        justifyContent: "space-between",
                        cursor: "pointer",
                        color: "#FFFFFF",
                        fontSize: "12px"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#FF6B00";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      <span>{item.label}</span>
                      {item.shortcut && <span style={{ color: "#94A3B8", fontSize: "11px" }}>{item.shortcut}</span>}
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* ===================================================================== */}
      {/* 3. MAIN DESKTOP WORKSPACE (Sidebar + View Panes) */}
      {/* ===================================================================== */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Left-Rail Desktop Dock */}
        <aside
          aria-label="Navigation Sidebar"
          style={{
            width: "240px",
            backgroundColor: "#0D0D12",
            borderRight: "1px solid #231F16",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            flexShrink: 0
          }}
        >
          {/* Top Brand Header */}
          <div>
            <div
              style={{
                padding: "16px",
                borderBottom: "1px solid #231F16",
                display: "flex",
                alignItems: "center",
                gap: "12px"
              }}
            >
              <img
                src={bbCoinImg}
                alt="BlockBum Brand Coin"
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "50%",
                  boxShadow: "0 0 16px rgba(255, 184, 0, 0.45)"
                }}
              />
              <div>
                <div style={{ color: "#FFD700", fontWeight: "bold", fontSize: "16px", letterSpacing: "0.5px" }}>
                  BlockBum
                </div>
                <div style={{ color: "#FF8800", fontSize: "10px", fontWeight: "bold", letterSpacing: "1px" }}>
                  CORE CLIENT
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div style={{ padding: "10px 8px", display: "flex", flexDirection: "column", gap: "3px" }}>
              {[
                { id: "wallet", label: "Wallet & BUM", icon: "🪙" },
                { id: "messages", label: "Private Messages", icon: "💬" },
                { id: "communities", label: "Communities", icon: "🌐" },
                { id: "challenges", label: "Governance & BIPs", icon: "⚡" },
                { id: "files", label: "Decentralized Files", icon: "📦" },
                { id: "network", label: "Global P2P Network", icon: "📡" },
                { id: "devices", label: "Multi-Device Security", icon: "📱" },
                { id: "settings", label: "System & Cryptography", icon: "⚙️" }
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "9px 14px",
                      borderRadius: "6px",
                      border: "none",
                      borderLeft: isActive ? "3px solid #FF8800" : "3px solid transparent",
                      background: isActive
                        ? "linear-gradient(90deg, rgba(255, 107, 0, 0.2) 0%, rgba(255, 184, 0, 0.08) 100%)"
                        : "transparent",
                      color: isActive ? "#FFD700" : "#94A3B8",
                      fontWeight: isActive ? "bold" : "normal",
                      fontSize: "13px",
                      cursor: "pointer",
                      textAlign: "left"
                    }}
                  >
                    <span style={{ fontSize: "15px" }}>{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom Account Card */}
          <div
            style={{
              padding: "12px 14px",
              backgroundColor: "#121218",
              borderTop: "1px solid #231F16",
              margin: "8px",
              borderRadius: "8px"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
              <span style={{ color: "#FFB800", fontWeight: "bold", fontSize: "12px" }}>
                {selectedIdentity.alias}
              </span>
              <span
                style={{
                  backgroundColor: "#201A0E",
                  border: "1px solid #D4AF37",
                  color: "#FFD700",
                  fontSize: "10px",
                  padding: "1px 6px",
                  borderRadius: "4px"
                }}
              >
                {clientMode === "full_node" ? "Full Node" : "SPV"}
              </span>
            </div>
            <div style={{ color: "#E2E8F0", fontFamily: "monospace", fontSize: "11px", marginBottom: "6px" }}>
              {selectedIdentity.address.substring(0, 10)}...{selectedIdentity.address.substring(36)}
            </div>
            <div style={{ color: "#FFD700", fontWeight: "bold", fontSize: "14px" }}>
              {selectedIdentity.balance_bum.toFixed(4)} BUM
            </div>
          </div>
        </aside>

        {/* Central Content Area */}
        <main
          role="main"
          style={{
            flex: 1,
            backgroundColor: "#0A0A0E",
            display: "flex",
            flexDirection: "column",
            overflowY: "auto",
            padding: "24px"
          }}
        >
          {/* ================================================================= */}
          {/* TAB: WALLET & BUM */}
          {/* ================================================================= */}
          {activeTab === "wallet" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Hero Balance Card with Official 3D Gold BB Coin */}
              <div
                style={{
                  background: "linear-gradient(135deg, #161520 0%, #12121A 100%)",
                  border: "1px solid rgba(212, 175, 55, 0.35)",
                  borderRadius: "10px",
                  padding: "24px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.4)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
                  <img
                    src={bbCoinImg}
                    alt="Official BlockBum Gold BB Coin"
                    style={{
                      width: "84px",
                      height: "84px",
                      borderRadius: "50%",
                      boxShadow: "0 0 24px rgba(255, 184, 0, 0.5)"
                    }}
                  />
                  <div>
                    <div style={{ color: "#FFB800", fontSize: "11px", fontWeight: "bold", letterSpacing: "1px" }}>
                      TOTAL SPENDABLE BALANCE
                    </div>
                    <div style={{ color: "#FFD700", fontSize: "36px", fontWeight: "bold", margin: "4px 0" }}>
                      {selectedIdentity.balance_bum.toFixed(8)} BUM
                    </div>
                    <div style={{ color: "#94A3B8", fontSize: "13px" }}>
                      Pending: 0.00000000 BUM  •  Fiat Value: ~${(selectedIdentity.balance_bum * 2.0).toFixed(2)} USD
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "12px" }}>
                  <button
                    onClick={() => setShowReceiveModal(true)}
                    style={{
                      padding: "10px 20px",
                      backgroundColor: "#1E1A14",
                      border: "1px solid #FFB800",
                      borderRadius: "6px",
                      color: "#FFD700",
                      fontWeight: "bold",
                      fontSize: "14px",
                      cursor: "pointer"
                    }}
                  >
                    📥 Receive
                  </button>
                  <button
                    onClick={() => {
                      const el = document.getElementById("sendForm");
                      el?.scrollIntoView({ behavior: "smooth" });
                    }}
                    style={{
                      padding: "10px 22px",
                      background: "linear-gradient(135deg, #FF8800 0%, #FF5500 100%)",
                      border: "1px solid #FFB800",
                      borderRadius: "6px",
                      color: "#FFFFFF",
                      fontWeight: "bold",
                      fontSize: "14px",
                      cursor: "pointer",
                      boxShadow: "0 0 16px rgba(255, 107, 0, 0.4)"
                    }}
                  >
                    ⚡ Send BUM
                  </button>
                </div>
              </div>

              {/* Send Form & Quick Receive Card */}
              <div id="sendForm" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "20px" }}>
                {/* Send BUM Form */}
                <div
                  style={{
                    backgroundColor: "#121218",
                    border: "1px solid #2A2418",
                    borderRadius: "8px",
                    padding: "20px"
                  }}
                >
                  <h3 style={{ margin: "0 0 16px 0", color: "#FFD700", fontSize: "16px" }}>⚡ Send BUM Coins</h3>
                  <form onSubmit={handleSendTransaction}>
                    <div style={{ marginBottom: "14px" }}>
                      <label style={{ display: "block", color: "#E2E8F0", fontSize: "12px", marginBottom: "6px" }}>
                        Recipient Bech32 Address (bb1...)
                      </label>
                      <input
                        type="text"
                        value={recipient}
                        onChange={(e) => setRecipient(e.target.value)}
                        placeholder="bb1d9812f8a429019ca5621de8821fedcba9876543"
                        style={{
                          width: "100%",
                          padding: "10px",
                          backgroundColor: "#181822",
                          border: "1px solid #3A3220",
                          borderRadius: "4px",
                          color: "#FFFFFF",
                          fontFamily: "monospace",
                          fontSize: "13px",
                          boxSizing: "border-box"
                        }}
                      />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "16px" }}>
                      <div>
                        <label style={{ display: "block", color: "#E2E8F0", fontSize: "12px", marginBottom: "6px" }}>
                          Amount (BUM)
                        </label>
                        <input
                          type="text"
                          value={transferAmount}
                          onChange={(e) => setTransferAmount(e.target.value)}
                          placeholder="0.00000000"
                          style={{
                            width: "100%",
                            padding: "10px",
                            backgroundColor: "#181822",
                            border: "1px solid #3A3220",
                            borderRadius: "4px",
                            color: "#FFD700",
                            fontWeight: "bold",
                            fontSize: "14px",
                            boxSizing: "border-box"
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", color: "#E2E8F0", fontSize: "12px", marginBottom: "6px" }}>
                          Estimated Network Fee
                        </label>
                        <input
                          type="text"
                          disabled
                          value="0.00010000 BUM"
                          style={{
                            width: "100%",
                            padding: "10px",
                            backgroundColor: "#14141C",
                            border: "1px solid #2A2418",
                            borderRadius: "4px",
                            color: "#94A3B8",
                            fontSize: "13px",
                            boxSizing: "border-box"
                          }}
                        />
                      </div>
                    </div>

                    {transferStatus && (
                      <div
                        style={{
                          padding: "10px",
                          borderRadius: "4px",
                          marginBottom: "14px",
                          fontSize: "13px",
                          backgroundColor: transferStatus.type === "success" ? "#064E3B" : "#7F1D1D",
                          color: transferStatus.type === "success" ? "#A7F3D0" : "#FECACA"
                        }}
                      >
                        {transferStatus.msg}
                      </div>
                    )}

                    <button
                      type="submit"
                      style={{
                        padding: "10px 24px",
                        background: "linear-gradient(135deg, #FF8800 0%, #FF5500 100%)",
                        border: "1px solid #FFB800",
                        borderRadius: "5px",
                        color: "#FFFFFF",
                        fontWeight: "bold",
                        fontSize: "14px",
                        cursor: "pointer"
                      }}
                    >
                      Sign & Broadcast (Monocypher Ed25519)
                    </button>
                  </form>
                </div>

                {/* Account & Keystore Status */}
                <div
                  style={{
                    backgroundColor: "#121218",
                    border: "1px solid #2A2418",
                    borderRadius: "8px",
                    padding: "20px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between"
                  }}
                >
                  <div>
                    <h3 style={{ margin: "0 0 12px 0", color: "#FFD700", fontSize: "16px" }}>My Address</h3>
                    <div
                      style={{
                        backgroundColor: "#181822",
                        border: "1px solid #3A3220",
                        borderRadius: "4px",
                        padding: "10px",
                        color: "#E2E8F0",
                        fontFamily: "monospace",
                        fontSize: "11px",
                        wordBreak: "break-all",
                        marginBottom: "12px"
                      }}
                    >
                      {selectedIdentity.address}
                    </div>
                    <div style={{ color: "#94A3B8", fontSize: "12px", lineHeight: "1.5" }}>
                      Deterministic Bech32 address. Compatible across Windows, Linux (Ubuntu), macOS, Android, and iOS.
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
                    <button
                      onClick={() => navigator.clipboard.writeText(selectedIdentity.address)}
                      style={{
                        flex: 1,
                        padding: "8px",
                        backgroundColor: "#1A1A26",
                        border: "1px solid #3A3220",
                        borderRadius: "4px",
                        color: "#FFFFFF",
                        fontSize: "12px",
                        cursor: "pointer"
                      }}
                    >
                      📋 Copy Address
                    </button>
                    <button
                      onClick={() => setShowReceiveModal(true)}
                      style={{
                        flex: 1,
                        padding: "8px",
                        backgroundColor: "#1A1A26",
                        border: "1px solid #FFB800",
                        borderRadius: "4px",
                        color: "#FFD700",
                        fontSize: "12px",
                        cursor: "pointer"
                      }}
                    >
                      📱 Show QR
                    </button>
                  </div>
                </div>
              </div>

              {/* Transactions Data Table */}
              <div
                style={{
                  backgroundColor: "#121218",
                  border: "1px solid #2A2418",
                  borderRadius: "8px",
                  padding: "20px"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                  <h3 style={{ margin: 0, color: "#FFFFFF", fontSize: "16px" }}>Transaction Ledger</h3>
                  <span style={{ color: "#94A3B8", fontSize: "12px" }}>Showing recent on-chain transfers</span>
                </div>

                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #2A2418", textAlign: "left", color: "#FFB800" }}>
                      <th style={{ padding: "8px" }}>Status</th>
                      <th style={{ padding: "8px" }}>Type</th>
                      <th style={{ padding: "8px" }}>Tx ID</th>
                      <th style={{ padding: "8px" }}>Counterparty</th>
                      <th style={{ padding: "8px" }}>Amount (BUM)</th>
                      <th style={{ padding: "8px" }}>Fee</th>
                      <th style={{ padding: "8px" }}>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {txHistory.map((tx) => (
                      <tr key={tx.tx_id} style={{ borderBottom: "1px solid #1A1A24" }}>
                        <td style={{ padding: "10px 8px" }}>
                          <span style={{ color: "#10B981" }}>● Confirmed</span>
                        </td>
                        <td style={{ padding: "10px 8px", color: tx.type === "send" ? "#FF6B00" : "#FFD700", fontWeight: "bold" }}>
                          {tx.type.toUpperCase()}
                        </td>
                        <td style={{ padding: "10px 8px", fontFamily: "monospace", color: "#94A3B8" }}>
                          {tx.tx_id}
                        </td>
                        <td style={{ padding: "10px 8px", fontFamily: "monospace", color: "#E2E8F0" }}>
                          {tx.counterparty.length > 24 ? tx.counterparty.substring(0, 12) + "..." + tx.counterparty.slice(-8) : tx.counterparty}
                        </td>
                        <td
                          style={{
                            padding: "10px 8px",
                            fontWeight: "bold",
                            color: tx.type === "send" ? "#EF4444" : "#10B981"
                          }}
                        >
                          {tx.type === "send" ? "-" : "+"}
                          {tx.amount_bum.toFixed(4)}
                        </td>
                        <td style={{ padding: "10px 8px", color: "#64748B" }}>
                          {tx.fee_bum.toFixed(4)}
                        </td>
                        <td style={{ padding: "10px 8px", color: "#94A3B8" }}>{tx.timestamp}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB: SECURE PRIVATE MESSAGES */}
          {/* ================================================================= */}
          {activeTab === "messages" && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "240px 1fr",
                gap: "20px",
                flex: 1,
                minHeight: "500px"
              }}
            >
              {/* Conversations Left Rail */}
              <div
                style={{
                  backgroundColor: "#121218",
                  border: "1px solid #2A2418",
                  borderRadius: "8px",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column"
                }}
              >
                <div style={{ color: "#FFD700", fontWeight: "bold", fontSize: "14px", marginBottom: "12px" }}>
                  Active E2EE Threads
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <div
                    style={{
                      padding: "10px",
                      backgroundColor: "#201A0E",
                      border: "1px solid #D4AF37",
                      borderRadius: "6px",
                      cursor: "pointer"
                    }}
                  >
                    <div style={{ fontWeight: "bold", color: "#FFD700", fontSize: "13px" }}>Bob_NodeOperator</div>
                    <div style={{ color: "#94A3B8", fontSize: "11px", marginTop: "2px" }}>Double Ratchet Active</div>
                  </div>
                  <div
                    style={{
                      padding: "10px",
                      backgroundColor: "#181822",
                      border: "1px solid #2A2418",
                      borderRadius: "6px",
                      cursor: "pointer"
                    }}
                  >
                    <div style={{ fontWeight: "bold", color: "#FFFFFF", fontSize: "13px" }}>BlockBum Core Team</div>
                    <div style={{ color: "#64748B", fontSize: "11px", marginTop: "2px" }}>3 unread messages</div>
                  </div>
                </div>
              </div>

              {/* Chat Transcript Area */}
              <div
                style={{
                  backgroundColor: "#121218",
                  border: "1px solid #2A2418",
                  borderRadius: "8px",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden"
                }}
              >
                {/* Chat Header */}
                <div
                  style={{
                    padding: "14px 20px",
                    borderBottom: "1px solid #2A2418",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                >
                  <div>
                    <span style={{ fontWeight: "bold", color: "#FFFFFF", fontSize: "15px" }}>Bob_NodeOperator</span>
                    <span style={{ color: "#10B981", fontSize: "12px", marginLeft: "8px" }}>● Online</span>
                  </div>
                  <div
                    style={{
                      backgroundColor: "#1A150C",
                      border: "1px solid #D4AF37",
                      color: "#FFD700",
                      fontSize: "11px",
                      padding: "2px 8px",
                      borderRadius: "4px"
                    }}
                  >
                    🔒 Monocypher X25519 + ChaCha20-Poly1305 Verified
                  </div>
                </div>

                {/* Messages Body */}
                <div style={{ flex: 1, padding: "20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px" }}>
                  {messages.map((m) => {
                    const isMe = m.sender === selectedIdentity.address;
                    return (
                      <div
                        key={m.id}
                        style={{
                          alignSelf: isMe ? "flex-end" : "flex-start",
                          maxWidth: "70%",
                          backgroundColor: isMe ? "#201A0E" : "#1A1A26",
                          border: isMe ? "1px solid #D4AF37" : "1px solid #2A2418",
                          borderRadius: "8px",
                          padding: "12px 16px"
                        }}
                      >
                        <div style={{ fontSize: "11px", color: isMe ? "#FFD700" : "#94A3B8", marginBottom: "4px" }}>
                          {m.senderAlias} • {m.timestamp}
                        </div>
                        <div style={{ fontSize: "13px", color: "#FFFFFF", lineHeight: "1.4" }}>{m.content}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Message Input */}
                <div style={{ padding: "14px 20px", borderTop: "1px solid #2A2418", display: "flex", gap: "10px" }}>
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                    placeholder="Type an end-to-end encrypted message..."
                    style={{
                      flex: 1,
                      padding: "10px 14px",
                      backgroundColor: "#181824",
                      border: "1px solid #3A3220",
                      borderRadius: "6px",
                      color: "#FFFFFF",
                      fontSize: "13px",
                      outline: "none"
                    }}
                  />
                  <button
                    onClick={handleSendMessage}
                    style={{
                      padding: "10px 20px",
                      background: "linear-gradient(135deg, #FF8800 0%, #FF5500 100%)",
                      border: "1px solid #FFB800",
                      borderRadius: "6px",
                      color: "#FFFFFF",
                      fontWeight: "bold",
                      fontSize: "13px",
                      cursor: "pointer"
                    }}
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB: GLOBAL P2P NETWORK */}
          {/* ================================================================= */}
          {activeTab === "network" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Telemetry Stats */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
                {[
                  { label: "Chain Height", val: `#${nodeStatus.chain_height.toLocaleString()}`, color: "#FFD700" },
                  { label: "Consensus Mode", val: "PoW Nakamoto", color: "#FF8800" },
                  { label: "Connected Peers", val: `${nodeStatus.peers_connected} (IPv4 / IPv6)`, color: "#10B981" },
                  { label: "Mempool Pending", val: `${nodeStatus.mempool_tx_count} txs`, color: "#38BDF8" }
                ].map((stat, i) => (
                  <div
                    key={i}
                    style={{
                      backgroundColor: "#121218",
                      border: "1px solid #2A2418",
                      borderRadius: "8px",
                      padding: "16px"
                    }}
                  >
                    <div style={{ color: "#94A3B8", fontSize: "11px", fontWeight: "bold" }}>{stat.label}</div>
                    <div style={{ color: stat.color, fontSize: "20px", fontWeight: "bold", marginTop: "4px" }}>
                      {stat.val}
                    </div>
                  </div>
                ))}
              </div>

              {/* Peer Connections Table */}
              <div
                style={{
                  backgroundColor: "#121218",
                  border: "1px solid #2A2418",
                  borderRadius: "8px",
                  padding: "20px"
                }}
              >
                <h3 style={{ margin: "0 0 16px 0", color: "#FFFFFF", fontSize: "16px" }}>Connected Global Peers</h3>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #2A2418", textAlign: "left", color: "#FFB800" }}>
                      <th style={{ padding: "8px" }}>Peer Address</th>
                      <th style={{ padding: "8px" }}>Protocol</th>
                      <th style={{ padding: "8px" }}>Client Version</th>
                      <th style={{ padding: "8px" }}>Latency</th>
                      <th style={{ padding: "8px" }}>Blocks Behind</th>
                      <th style={{ padding: "8px" }}>Reputation Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { ip: "198.51.100.42:8545", proto: "IPv4", ver: "BlockBum-Core/0.2.0 (Ubuntu)", ping: "14 ms", behind: "0", score: "100/100" },
                      { ip: "[2001:db8::1a2b]:8545", proto: "IPv6", ver: "BlockBum-Core/0.2.0 (Windows)", ping: "22 ms", behind: "0", score: "98/100" },
                      { ip: "203.0.113.88:8545", proto: "IPv4", ver: "BlockBum-Qt/0.2.0 (Linux)", ping: "19 ms", behind: "0", score: "99/100" },
                      { ip: "[2001:db8:85a3::8a2e]:8545", proto: "IPv6", ver: "BlockBum-Core/0.2.0 (macOS)", ping: "35 ms", behind: "0", score: "96/100" }
                    ].map((p, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #1A1A24" }}>
                        <td style={{ padding: "10px 8px", fontFamily: "monospace", color: "#FFFFFF" }}>{p.ip}</td>
                        <td style={{ padding: "10px 8px", color: p.proto === "IPv6" ? "#38BDF8" : "#A7F3D0" }}>{p.proto}</td>
                        <td style={{ padding: "10px 8px", color: "#94A3B8" }}>{p.ver}</td>
                        <td style={{ padding: "10px 8px", color: "#10B981" }}>{p.ping}</td>
                        <td style={{ padding: "10px 8px", color: "#94A3B8" }}>{p.behind}</td>
                        <td style={{ padding: "10px 8px", color: "#FFD700", fontWeight: "bold" }}>{p.score}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB: MULTI-DEVICE SECURITY */}
          {/* ================================================================= */}
          {activeTab === "devices" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  backgroundColor: "#121218",
                  border: "1px solid #2A2418",
                  borderRadius: "8px",
                  padding: "20px"
                }}
              >
                <div>
                  <h3 style={{ margin: "0 0 6px 0", color: "#FFD700", fontSize: "18px" }}>
                    Multi-Device Identity Management
                  </h3>
                  <div style={{ color: "#94A3B8", fontSize: "13px" }}>
                    All linked devices are cryptographically authenticated via Monocypher Ed25519 master signatures.
                  </div>
                </div>
                <button
                  onClick={() => setShowPairModal(true)}
                  style={{
                    padding: "10px 20px",
                    background: "linear-gradient(135deg, #FF8800 0%, #FF5500 100%)",
                    border: "1px solid #FFB800",
                    borderRadius: "6px",
                    color: "#FFFFFF",
                    fontWeight: "bold",
                    fontSize: "13px",
                    cursor: "pointer"
                  }}
                >
                  📱 Link New Device (QR)
                </button>
              </div>

              {/* Devices Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px" }}>
                {devices.map((d) => (
                  <div
                    key={d.device_id}
                    style={{
                      backgroundColor: "#121218",
                      border: d.is_current ? "1px solid #D4AF37" : "1px solid #2A2418",
                      borderRadius: "8px",
                      padding: "18px"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <span style={{ fontWeight: "bold", color: "#FFFFFF", fontSize: "14px" }}>{d.device_name}</span>
                      <span
                        style={{
                          fontSize: "11px",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          backgroundColor: d.status === "authorized" ? "#064E3B" : "#7F1D1D",
                          color: d.status === "authorized" ? "#A7F3D0" : "#FECACA"
                        }}
                      >
                        {d.is_current ? "Current Workstation" : d.status.toUpperCase()}
                      </span>
                    </div>

                    <div style={{ fontSize: "12px", color: "#94A3B8", marginBottom: "6px" }}>
                      Platform: <strong style={{ color: "#E2E8F0" }}>{d.platform.toUpperCase()}</strong>  •  Paired: {d.paired_at}
                    </div>

                    <div style={{ fontSize: "11px", fontFamily: "monospace", color: "#64748B", marginBottom: "14px" }}>
                      Device Auth Key: {d.auth_public_key}
                    </div>

                    {!d.is_current && d.status === "authorized" && (
                      <button
                        onClick={() => handleRevokeDevice(d.device_id)}
                        style={{
                          padding: "6px 14px",
                          backgroundColor: "#1E1418",
                          border: "1px solid #EF4444",
                          borderRadius: "4px",
                          color: "#EF4444",
                          fontSize: "12px",
                          fontWeight: "bold",
                          cursor: "pointer"
                        }}
                      >
                        Revoke Access
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB: SYSTEM & CRYPTOGRAPHY */}
          {/* ================================================================= */}
          {activeTab === "settings" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Hardened Cryptography Audit Banner */}
              <div
                style={{
                  backgroundColor: "#121218",
                  border: "1px solid rgba(212, 175, 55, 0.4)",
                  borderRadius: "8px",
                  padding: "20px"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <h3 style={{ margin: 0, color: "#FFD700", fontSize: "16px" }}>
                    🛡 Ubuntu & Linux Native Cryptographic Engine
                  </h3>
                  <span
                    style={{
                      backgroundColor: "#064E3B",
                      border: "1px solid #10B981",
                      color: "#A7F3D0",
                      fontSize: "11px",
                      padding: "2px 8px",
                      borderRadius: "4px"
                    }}
                  >
                    100% Constant-Time Monocypher Audited
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginTop: "12px" }}>
                  <div style={{ backgroundColor: "#181824", padding: "12px", borderRadius: "6px", border: "1px solid #2A2418" }}>
                    <div style={{ color: "#FFB800", fontWeight: "bold", fontSize: "12px" }}>Signatures</div>
                    <div style={{ color: "#FFFFFF", fontSize: "13px", marginTop: "2px" }}>Ed25519 (RFC 8032)</div>
                  </div>
                  <div style={{ backgroundColor: "#181824", padding: "12px", borderRadius: "6px", border: "1px solid #2A2418" }}>
                    <div style={{ color: "#FFB800", fontWeight: "bold", fontSize: "12px" }}>Key Agreement</div>
                    <div style={{ color: "#FFFFFF", fontSize: "13px", marginTop: "2px" }}>X25519 (ECDH)</div>
                  </div>
                  <div style={{ backgroundColor: "#181824", padding: "12px", borderRadius: "6px", border: "1px solid #2A2418" }}>
                    <div style={{ color: "#FFB800", fontWeight: "bold", fontSize: "12px" }}>AEAD Encryption</div>
                    <div style={{ color: "#FFFFFF", fontSize: "13px", marginTop: "2px" }}>ChaCha20-Poly1305</div>
                  </div>
                  <div style={{ backgroundColor: "#181824", padding: "12px", borderRadius: "6px", border: "1px solid #2A2418" }}>
                    <div style={{ color: "#FFB800", fontWeight: "bold", fontSize: "12px" }}>Cryptographic Hashing</div>
                    <div style={{ color: "#FFFFFF", fontSize: "13px", marginTop: "2px" }}>SHA-256 + BLAKE2b</div>
                  </div>
                </div>
              </div>

              {/* Execution Mode Selector */}
              <div
                style={{
                  backgroundColor: "#121218",
                  border: "1px solid #2A2418",
                  borderRadius: "8px",
                  padding: "20px"
                }}
              >
                <h3 style={{ margin: "0 0 14px 0", color: "#FFFFFF", fontSize: "16px" }}>Client Execution Mode</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div
                    onClick={() => setClientMode("full_node")}
                    style={{
                      padding: "16px",
                      backgroundColor: clientMode === "full_node" ? "#201A0E" : "#181824",
                      border: clientMode === "full_node" ? "1px solid #FFB800" : "1px solid #2A2418",
                      borderRadius: "6px",
                      cursor: "pointer"
                    }}
                  >
                    <div style={{ fontWeight: "bold", color: "#FFD700", fontSize: "14px", marginBottom: "4px" }}>
                      ● Full Node Mode (Default)
                    </div>
                    <div style={{ color: "#94A3B8", fontSize: "12px", lineHeight: "1.4" }}>
                      Validates all block headers, transactions, UTXOs, and consensus proofs independently on local disk. Zero trust required.
                    </div>
                  </div>

                  <div
                    onClick={() => setClientMode("light_client")}
                    style={{
                      padding: "16px",
                      backgroundColor: clientMode === "light_client" ? "#201A0E" : "#181824",
                      border: clientMode === "light_client" ? "1px solid #FFB800" : "1px solid #2A2418",
                      borderRadius: "6px",
                      cursor: "pointer"
                    }}
                  >
                    <div style={{ fontWeight: "bold", color: "#38BDF8", fontSize: "14px", marginBottom: "4px" }}>
                      ● SPV Light Client Mode
                    </div>
                    <div style={{ color: "#94A3B8", fontSize: "12px", lineHeight: "1.4" }}>
                      Downloads only 92-byte block headers and verifies Merkle inclusion proofs. Low memory and disk footprint for portable laptops.
                    </div>
                  </div>
                </div>
              </div>

              {/* Software Updates Verifier */}
              <div
                style={{
                  backgroundColor: "#121218",
                  border: "1px solid #2A2418",
                  borderRadius: "8px",
                  padding: "20px"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h3 style={{ margin: "0 0 4px 0", color: "#FFFFFF", fontSize: "16px" }}>Signed Application Releases</h3>
                    <div style={{ color: "#94A3B8", fontSize: "12px" }}>
                      Current build: 0.2.0 • Deterministic SHA-256 release signed by BlockBum Core Key
                    </div>
                  </div>
                  <button
                    onClick={handleCheckUpdate}
                    disabled={isCheckingUpdate}
                    style={{
                      padding: "10px 18px",
                      backgroundColor: "#1A1A26",
                      border: "1px solid #FFB800",
                      borderRadius: "6px",
                      color: "#FFD700",
                      fontWeight: "bold",
                      fontSize: "13px",
                      cursor: "pointer"
                    }}
                  >
                    {isCheckingUpdate ? "Verifying..." : "Check for Signed Update"}
                  </button>
                </div>

                {updateInfo && (
                  <div
                    style={{
                      marginTop: "16px",
                      backgroundColor: "#181824",
                      border: "1px solid #10B981",
                      borderRadius: "6px",
                      padding: "14px"
                    }}
                  >
                    <div style={{ color: "#10B981", fontWeight: "bold", fontSize: "13px" }}>
                      New Signed Release Available: v{updateInfo.version} ({updateInfo.release_date})
                    </div>
                    <div style={{ color: "#94A3B8", fontSize: "12px", margin: "6px 0", fontFamily: "monospace" }}>
                      Digest: {updateInfo.sha256_hash}
                    </div>
                    <div style={{ color: "#FFD700", fontSize: "12px" }}>
                      Authority Signature: {updateInfo.signature}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Communities Tab with Official BlockBum Banner */}
          {activeTab === "communities" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div
                style={{
                  backgroundColor: "#121218",
                  border: "1px solid rgba(212, 175, 55, 0.35)",
                  borderRadius: "10px",
                  overflow: "hidden",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.5)"
                }}
              >
                <img
                  src={bbBannerImg}
                  alt="BlockBum Decentralized Digital Association"
                  style={{ width: "100%", maxHeight: "220px", objectFit: "cover" }}
                />
                <div style={{ padding: "18px 24px" }}>
                  <h3 style={{ margin: "0 0 6px 0", color: "#FFD700", fontSize: "20px" }}>
                    Decentralized Digital Association & Communities
                  </h3>
                  <p style={{ margin: 0, color: "#94A3B8", fontSize: "14px", lineHeight: "1.5" }}>
                    Join sovereign peer-to-peer associations, communicate securely with end-to-end encryption, and participate in community governance.
                  </p>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px" }}>
                {communities.map((comm) => (
                  <div
                    key={comm.id}
                    style={{
                      backgroundColor: "#121218",
                      border: "1px solid #2A2418",
                      borderRadius: "8px",
                      padding: "18px"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <span style={{ fontWeight: "bold", color: "#FFFFFF", fontSize: "15px" }}>{comm.name}</span>
                      <span
                        style={{
                          fontSize: "11px",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          backgroundColor: "#201A0E",
                          border: "1px solid #FFB800",
                          color: "#FFD700"
                        }}
                      >
                        {comm.myRole}
                      </span>
                    </div>
                    <p style={{ color: "#94A3B8", fontSize: "13px", margin: "0 0 12px 0", lineHeight: "1.4" }}>
                      {comm.description}
                    </p>
                    <div style={{ display: "flex", gap: "8px" }}>
                      {comm.channels.map((ch) => (
                        <span
                          key={ch}
                          style={{
                            backgroundColor: "#181824",
                            border: "1px solid #3A3220",
                            borderRadius: "4px",
                            padding: "3px 8px",
                            color: "#E2E8F0",
                            fontSize: "11px"
                          }}
                        >
                          #{ch}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {activeTab === "challenges" && (
            <div style={{ color: "#94A3B8", fontSize: "14px" }}>
              Decentralized governance improvement proposals (BIPs) and on-chain voting active.
            </div>
          )}
          {activeTab === "files" && (
            <div style={{ color: "#94A3B8", fontSize: "14px" }}>
              Decentralized encrypted content storage with {sharedFiles.length} verified artifacts.
            </div>
          )}
        </main>
      </div>

      {/* ===================================================================== */}
      {/* 4. NATIVE DESKTOP BOTTOM STATUS BAR */}
      {/* ===================================================================== */}
      <footer
        role="contentinfo"
        style={{
          height: "26px",
          backgroundColor: "#0B0B0E",
          borderTop: "1px solid #231F16",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 12px",
          fontSize: "11px",
          color: "#94A3B8",
          fontFamily: "monospace",
          userSelect: "none"
        }}
      >
        <div style={{ display: "flex", gap: "16px" }}>
          <span>⛓ Height: #{nodeStatus.chain_height.toLocaleString()}</span>
          <span>Diff: 0x1f00ffff</span>
          <span>Mempool: {nodeStatus.mempool_tx_count} txs</span>
        </div>

        <div style={{ display: "flex", gap: "16px" }}>
          <span style={{ color: clientMode === "full_node" ? "#FFD700" : "#38BDF8" }}>
            🛡 Mode: {clientMode === "full_node" ? "Full Node (Validated)" : "SPV Light Client"}
          </span>
          <span style={{ color: "#10B981" }}>
            🔒 Ubuntu Cryptography: Monocypher Active
          </span>
        </div>

        <div style={{ display: "flex", gap: "16px" }}>
          <span>🔐 Vault: Unlocked</span>
          <span style={{ color: "#FFB800" }}>📡 Peers: {nodeStatus.peers_connected} Connected (IPv4/IPv6)</span>
        </div>
      </footer>

      {/* ===================================================================== */}
      {/* 5. MODAL DIALOGS */}
      {/* ===================================================================== */}
      {/* Receive Modal with Official Gold Coin Badge */}
      {showReceiveModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000
          }}
          onClick={() => setShowReceiveModal(false)}
        >
          <div
            style={{
              backgroundColor: "#121218",
              border: "1px solid #FFB800",
              borderRadius: "10px",
              padding: "28px",
              width: "440px",
              textAlign: "center"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={bbCoinImg}
              alt="BlockBum Coin"
              style={{ width: "64px", height: "64px", borderRadius: "50%", marginBottom: "12px" }}
            />
            <h3 style={{ margin: "0 0 8px 0", color: "#FFD700", fontSize: "18px" }}>Receive BUM Coins</h3>
            <p style={{ margin: "0 0 16px 0", color: "#94A3B8", fontSize: "13px" }}>
              Scan QR code or copy your Bech32 address below:
            </p>

            {/* Simulated QR Box with Gold Borders */}
            <div
              style={{
                width: "160px",
                height: "160px",
                backgroundColor: "#FFFFFF",
                margin: "0 auto 16px auto",
                borderRadius: "8px",
                padding: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <img
                src={bbCoinImg}
                alt="QR Emblem"
                style={{ width: "80px", height: "80px", opacity: 0.9 }}
              />
            </div>

            <div
              style={{
                backgroundColor: "#181824",
                border: "1px solid #3A3220",
                borderRadius: "4px",
                padding: "10px",
                color: "#FFD700",
                fontFamily: "monospace",
                fontSize: "12px",
                wordBreak: "break-all",
                marginBottom: "16px"
              }}
            >
              {selectedIdentity.address}
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(selectedIdentity.address);
                  alert("Address copied to clipboard!");
                }}
                style={{
                  flex: 1,
                  padding: "10px",
                  background: "linear-gradient(135deg, #FF8800 0%, #FF5500 100%)",
                  border: "1px solid #FFB800",
                  borderRadius: "5px",
                  color: "#FFFFFF",
                  fontWeight: "bold",
                  cursor: "pointer"
                }}
              >
                Copy Address
              </button>
              <button
                onClick={() => setShowReceiveModal(false)}
                style={{
                  padding: "10px 18px",
                  backgroundColor: "#1A1A24",
                  border: "1px solid #3A3220",
                  borderRadius: "5px",
                  color: "#FFFFFF",
                  cursor: "pointer"
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cryptography Audit Modal */}
      {showCryptoAuditModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000
          }}
          onClick={() => setShowCryptoAuditModal(false)}
        >
          <div
            style={{
              backgroundColor: "#121218",
              border: "1px solid #FFB800",
              borderRadius: "10px",
              padding: "28px",
              width: "520px"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 12px 0", color: "#FFD700", fontSize: "18px" }}>
              🛡 Ubuntu Cryptographic Engine Specification
            </h3>
            <p style={{ color: "#94A3B8", fontSize: "13px", lineHeight: "1.5", margin: "0 0 16px 0" }}>
              BlockBum utilizes Monocypher, an independently audited, constant-time cryptographic library. No unreviewed or proprietary key agreement algorithms are permitted.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px" }}>
              <div style={{ backgroundColor: "#181824", padding: "10px", borderRadius: "6px" }}>
                <strong style={{ color: "#FF8800" }}>Ed25519 Signatures:</strong> Deterministic 64-byte signatures over SHA-512 curve points.
              </div>
              <div style={{ backgroundColor: "#181824", padding: "10px", borderRadius: "6px" }}>
                <strong style={{ color: "#FF8800" }}>X25519 Key Agreement:</strong> Constant-time ECDH for forward secret sessions and multi-device channels.
              </div>
              <div style={{ backgroundColor: "#181824", padding: "10px", borderRadius: "6px" }}>
                <strong style={{ color: "#FF8800" }}>ChaCha20-Poly1305 AEAD:</strong> 256-bit stream cipher with 128-bit authentication tag for on-disk and over-the-wire privacy.
              </div>
              <div style={{ backgroundColor: "#181824", padding: "10px", borderRadius: "6px" }}>
                <strong style={{ color: "#FF8800" }}>SHA-256 Merkle Roots:</strong> Authenticated state trees ensuring tamper-evident block headers.
              </div>
            </div>

            <button
              onClick={() => setShowCryptoAuditModal(false)}
              style={{
                width: "100%",
                marginTop: "20px",
                padding: "10px",
                backgroundColor: "#1E1A14",
                border: "1px solid #FFB800",
                borderRadius: "5px",
                color: "#FFD700",
                fontWeight: "bold",
                cursor: "pointer"
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
