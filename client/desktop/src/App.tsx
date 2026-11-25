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
  ClientExecutionMode,
} from "./types";
import { translations } from "./i18n";

// Official BlockBum Brand Coin
import bbCoinImg from "./assets/bb_coin.png";

export const App: React.FC = () => {
  // Navigation & Localization
  const [activeTab, setActiveTab] = useState<
    "wallet" | "messages" | "communities" | "files" | "network" | "devices" | "settings"
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

  // Modal Dialog States
  const [showSeedModal, setShowSeedModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [showCryptoAuditModal, setShowCryptoAuditModal] = useState(false);
  const [showNewCommunityModal, setShowNewCommunityModal] = useState(false);
  const [showPairModal, setShowPairModal] = useState(false);

  // New Identity Creation Form State
  const [newAlias, setNewAlias] = useState("");

  // Transfer Form State
  const [recipient, setRecipient] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferStatus, setTransferStatus] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [txFilter, setTxFilter] = useState<"all" | "send" | "receive" | "reward">("all");

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
      governanceProposals: [],
      codingChallenges: [],
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
    },
    {
      id: "comm_econ",
      name: "BUM Monetary & Economic Guild",
      description: "Supply schedules, fee sustainability, and storage provider incentives.",
      isPrivate: false,
      memberCount: 65,
      myRole: "Member",
      channels: ["monetary-policy", "treasury-rules"],
      governanceProposals: [],
      codingChallenges: [],
      events: []
    }
  ]);
  const [selectedCommunityId, setSelectedCommunityId] = useState<string>("comm_dev");
  const [activeChannel, setActiveChannel] = useState<string>("general");
  const [communityMessageInput, setCommunityMessageInput] = useState("");
  const [newCommunityNameInput, setNewCommunityNameInput] = useState("");
  const [newCommunityDescInput, setNewCommunityDescInput] = useState("");
  const [newCommunityPrivateInput, setNewCommunityPrivateInput] = useState(false);

  // Messages State (E2EE Double Ratchet)
  const [activeContact, setActiveContact] = useState<string>("bob");
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
    },
    {
      id: "msg_3",
      communityId: "direct_bob",
      channel: "dm",
      sender: "bb1d9812f8a429019ca5621de8821fedcba9876543",
      senderAlias: "Bob_NodeOperator",
      content: "Hey Alice, could you review the new headers-first sync batching algorithm?",
      timestamp: "11:05 AM",
      isE2EE: true,
      deliveryAck: true
    }
  ]);
  const [chatInput, setChatInput] = useState("");

  // Shared Files State
  const [sharedFiles, setSharedFiles] = useState<SharedFileItem[]>([
    {
      cid: "cid_Qm9a82bc01284590fefacbe1098412ef",
      name: "blockbum_monetary_policy_v1.0.pdf",
      size_kb: 1420,
      uploader: "bb1a729e8c40b82194017de8bf019abcdef0123456",
      timestamp: "Nov 23, 2026",
      chunks_count: 6,
      encryption_status: "AES-256-GCM / SHA-256 Verified",
      isPublic: true
    },
    {
      cid: "cid_Qm4c910ab871092471928409182355fe",
      name: "node_audit_report_phase19.tar.gz",
      size_kb: 4890,
      uploader: "bb1d9812f8a429019ca5621de8821fedcba9876543",
      timestamp: "Nov 24, 2026",
      chunks_count: 19,
      encryption_status: "AES-256-GCM / SHA-256 Verified",
      isPublic: true
    }
  ]);
  const [uploadFileName, setUploadFileName] = useState("");
  const [uploadFileSize, setUploadFileSize] = useState("1024");
  const [uploadIsPublic, setUploadIsPublic] = useState(true);

  // Network Peers State
  const [peersList, setPeersList] = useState([
    { ip: "198.51.100.42:8545", proto: "IPv4", ver: "BlockBum-Core/0.2.0 (Ubuntu)", ping: "14 ms", behind: "0", score: "100/100" },
    { ip: "[2001:db8::1a2b]:8545", proto: "IPv6", ver: "BlockBum-Core/0.2.0 (Windows)", ping: "22 ms", behind: "0", score: "98/100" },
    { ip: "203.0.113.88:8545", proto: "IPv4", ver: "BlockBum-Qt/0.2.0 (Linux)", ping: "19 ms", behind: "0", score: "99/100" },
    { ip: "[2001:db8:85a3::8a2e]:8545", proto: "IPv6", ver: "BlockBum-Core/0.2.0 (macOS)", ping: "35 ms", behind: "0", score: "96/100" }
  ]);
  const [newPeerIp, setNewPeerIp] = useState("");

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

  // Signed Update State
  const [updateInfo, setUpdateInfo] = useState<AppUpdateInfo | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

  // Keyboard Shortcuts (Desktop Accelerators)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === "l") {
        e.preventDefault();
        setVault((v) => ({ ...v, is_locked: true }));
      }
      if (e.ctrlKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        setActiveTab("wallet");
      }
      if (e.ctrlKey && e.key.toLowerCase() === "r") {
        e.preventDefault();
        setShowReceiveModal(true);
      }
      if (e.key === "Escape") {
        setOpenMenu(null);
        setShowReceiveModal(false);
        setShowSeedModal(false);
        setShowPairModal(false);
        setShowModeModal(false);
        setShowCryptoAuditModal(false);
        setShowNewCommunityModal(false);
        setShowOnboardingModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close menus on outside click
  useEffect(() => {
    const closeMenus = () => setOpenMenu(null);
    if (openMenu) {
      window.addEventListener("click", closeMenus);
      return () => window.removeEventListener("click", closeMenus);
    }
  }, [openMenu]);

  // Unlock Master Vault
  const handleUnlockVault = () => {
    if (vaultPasswordInput === "SuperSecretMasterPassword2026!" || vaultPasswordInput.length >= 6) {
      setVault({ ...vault, is_locked: false, last_unlocked: "Just now" });
      setVaultPasswordInput("");
      setVaultError("");
    } else {
      setVaultError("Invalid master password. Please re-enter your vault password.");
    }
  };

  // Check Signed Updates
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
          "Soft Light White theme with Imperial Gold & Radiant Orange accents",
          "Complete interactive button state resolution across all views",
          "Native Qt Desktop GUI support (blockbum-qt)",
          "Enhanced RocksDB custom memory allocator"
        ]
      });
      setIsCheckingUpdate(false);
    }, 600);
  };

  // Send BUM Transaction
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
      msg: `Transaction signed (Ed25519) and broadcasted: ${amt} BUM sent to ${recipient.substring(0, 14)}...`,
      type: "success"
    });
    setRecipient("");
    setTransferAmount("");
  };

  // Create New Wallet Identity
  const handleCreateIdentity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlias.trim()) return;
    const newId: WalletIdentity = {
      alias: newAlias.trim(),
      address: "bb1" + Math.random().toString(16).substring(2, 10) + "abcdef01234567890123456789",
      public_key: "0x" + Math.random().toString(16).substring(2, 18) + "...ed25519",
      balance_bum: 100.0,
      nonce: 0,
      recovery_phrase: "velvet galaxy timber fossil rapid orbit crystal nuclear crisp hammer vivid orbit"
    };
    setIdentities([...identities, newId]);
    setSelectedIdentity(newId);
    setNewAlias("");
    setShowOnboardingModal(false);
  };

  // Send Direct Message
  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    const newMsg: MessageItem = {
      id: "msg_" + Date.now(),
      communityId: "direct_" + activeContact,
      channel: "dm",
      sender: selectedIdentity.address,
      senderAlias: selectedIdentity.alias,
      content: chatInput.trim(),
      timestamp: "Just now",
      isE2EE: true,
      deliveryAck: true
    };
    setMessages([...messages, newMsg]);
    setChatInput("");
  };

  // Send Community Message
  const handleSendCommunityMessage = () => {
    if (!communityMessageInput.trim()) return;
    const newMsg: MessageItem = {
      id: "cmsg_" + Date.now(),
      communityId: selectedCommunityId,
      channel: activeChannel,
      sender: selectedIdentity.address,
      senderAlias: selectedIdentity.alias,
      content: communityMessageInput.trim(),
      timestamp: "Just now",
      isE2EE: true,
      deliveryAck: true
    };
    setMessages([...messages, newMsg]);
    setCommunityMessageInput("");
  };

  // Create Community
  const handleCreateCommunity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommunityNameInput.trim()) return;
    const newComm: Community = {
      id: "comm_" + Date.now(),
      name: newCommunityNameInput.trim(),
      description: newCommunityDescInput.trim() || "Independent peer community cluster.",
      isPrivate: newCommunityPrivateInput,
      memberCount: 1,
      myRole: "Owner",
      channels: ["general", "announcements"],
      governanceProposals: [],
      codingChallenges: [],
      events: []
    };
    setCommunities([...communities, newComm]);
    setSelectedCommunityId(newComm.id);
    setActiveChannel("general");
    setNewCommunityNameInput("");
    setNewCommunityDescInput("");
    setShowNewCommunityModal(false);
  };

  // Upload Shared File
  const handleUploadFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFileName.trim()) return;
    const size = parseInt(uploadFileSize, 10) || 512;
    const newFile: SharedFileItem = {
      cid: "cid_Qm" + Math.random().toString(16).substring(2, 10) + "89ab0123cdef",
      name: uploadFileName.trim(),
      size_kb: size,
      uploader: selectedIdentity.address,
      timestamp: "Just now",
      chunks_count: Math.max(1, Math.ceil(size / 256)),
      encryption_status: "AES-256-GCM / SHA-256 Verified",
      isPublic: uploadIsPublic
    };
    setSharedFiles([newFile, ...sharedFiles]);
    setUploadFileName("");
  };

  // Add Network Peer
  const handleAddPeer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPeerIp.trim()) return;
    const isV6 = newPeerIp.includes(":");
    setPeersList([
      {
        ip: newPeerIp.trim(),
        proto: isV6 ? "IPv6" : "IPv4",
        ver: "BlockBum-Core/0.2.0 (Peer)",
        ping: "16 ms",
        behind: "0",
        score: "100/100"
      },
      ...peersList
    ]);
    setNewPeerIp("");
  };

  // Ping All Peers
  const handlePingPeers = () => {
    setPeersList(
      peersList.map((p) => ({
        ...p,
        ping: Math.floor(Math.random() * 25 + 10) + " ms"
      }))
    );
  };

  // Revoke Device
  const handleRevokeDevice = (deviceId: string) => {
    setDevices(
      devices.map((d) => (d.device_id === deviceId ? { ...d, status: "revoked", last_active: "Revoked" } : d))
    );
  };

  // Pair New Device
  const handlePairDevice = (deviceName: string) => {
    if (!deviceName.trim()) return;
    const newDev: DeviceSession = {
      device_id: "dev_" + Math.random().toString(16).substring(2, 8),
      device_name: deviceName.trim(),
      platform: "android",
      paired_at: "Just now",
      last_active: "Active Now",
      is_current: false,
      auth_public_key: "0x" + Math.random().toString(16).substring(2, 10) + "...pair",
      status: "authorized"
    };
    setDevices([...devices, newDev]);
    setShowPairModal(false);
  };

  // Filter Transactions
  const filteredTxs = txHistory.filter((tx) => {
    if (txFilter === "all") return true;
    return tx.type === txFilter;
  });

  const activeComm = communities.find((c) => c.id === selectedCommunityId) || communities[0];

  // ============================================================================
  // LOCKED VAULT SCREEN (Light White, Gold, Radiant Orange)
  // ============================================================================
  if (vault.is_locked) {
    return (
      <div
        style={{
          width: "100vw",
          height: "100vh",
          backgroundColor: "#F4F6F9",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "#0F172A",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          userSelect: "none"
        }}
      >
        <div
          style={{
            width: "440px",
            backgroundColor: "#FFFFFF",
            border: "1px solid #D4AF37",
            boxShadow: "0 12px 36px rgba(0, 0, 0, 0.08)",
            borderRadius: "14px",
            padding: "36px",
            textAlign: "center"
          }}
        >
          <div style={{ position: "relative", display: "inline-block", marginBottom: "16px" }}>
            <img
              src={bbCoinImg}
              alt="BlockBum Gold BB Coin"
              style={{
                width: "92px",
                height: "92px",
                borderRadius: "50%",
                boxShadow: "0 4px 20px rgba(212, 175, 55, 0.45)"
              }}
            />
          </div>

          <h2 style={{ margin: "0 0 6px 0", color: "#0F172A", fontSize: "24px", fontWeight: "bold" }}>
            BlockBum Core
          </h2>
          <p style={{ margin: "0 0 24px 0", color: "#64748B", fontSize: "14px" }}>
            Local Encrypted Keystore Vault is Locked
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleUnlockVault();
            }}
          >
            <div style={{ textAlign: "left", marginBottom: "16px" }}>
              <label style={{ display: "block", color: "#334155", fontSize: "12px", fontWeight: "600", marginBottom: "6px" }}>
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
                  padding: "11px 14px",
                  backgroundColor: "#F8FAFC",
                  border: "1px solid #CBD5E1",
                  borderRadius: "6px",
                  color: "#0F172A",
                  fontSize: "14px",
                  outline: "none",
                  boxSizing: "border-box"
                }}
              />
            </div>

            {vaultError && (
              <div style={{ color: "#DC2626", fontSize: "12px", marginBottom: "16px", textAlign: "left" }}>
                {vaultError}
              </div>
            )}

            <button
              type="submit"
              style={{
                width: "100%",
                padding: "12px",
                background: "linear-gradient(135deg, #FF6B00 0%, #FF8800 100%)",
                border: "1px solid #EA580C",
                borderRadius: "6px",
                color: "#FFFFFF",
                fontSize: "15px",
                fontWeight: "bold",
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(255, 107, 0, 0.3)"
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
  // DESKTOP CORE APPLICATION (LIGHT WHITE THEME)
  // ============================================================================
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100vw",
        height: "100vh",
        backgroundColor: "#F4F6F9",
        color: "#0F172A",
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
          backgroundColor: "#EAEFF5",
          borderBottom: "1px solid #D8DFE8",
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
          <span style={{ color: "#0F172A", fontWeight: "bold", fontSize: "13px" }}>BlockBum Core</span>
          <span style={{ color: "#64748B", fontSize: "12px" }}>v0.2.0 [Mainnet]</span>
        </div>

        {/* Center: Network Status Pill */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            backgroundColor: "#FEF9C3",
            border: "1px solid #D4AF37",
            borderRadius: "12px",
            padding: "2px 10px",
            fontSize: "11px",
            color: "#B8860B",
            fontWeight: "600"
          }}
        >
          <span style={{ color: "#059669" }}>●</span>
          <span>Mainnet Connected ({nodeStatus.peers_connected} Peers)</span>
          <span style={{ color: "#CBD5E1" }}>|</span>
          <span>Height #{nodeStatus.chain_height.toLocaleString()}</span>
        </div>

        {/* Right: Window Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            onClick={() => setVault({ ...vault, is_locked: true })}
            title="Lock Vault (Ctrl+L)"
            style={{
              background: "#FFFFFF",
              border: "1px solid #CBD5E1",
              borderRadius: "4px",
              color: "#B8860B",
              fontSize: "11px",
              fontWeight: "600",
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
                backgroundColor: "#10B981",
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
          backgroundColor: "#E2E8F0",
          borderBottom: "1px solid #CBD5E1",
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
              { label: "New Identity / Create Wallet", shortcut: "Ctrl+N", action: () => setShowOnboardingModal(true) },
              { label: "Import Recovery Seed Phrase", shortcut: "Ctrl+I", action: () => setShowSeedModal(true) },
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
              { label: "View Recovery Seed Phrase", action: () => setShowSeedModal(true) },
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
              { label: "Rotate Ratchet Session Keys", action: () => alert("Double Ratchet session keys rotated with forward secrecy.") },
              { label: "Sync Across Linked Devices", action: () => setActiveTab("devices") }
            ]
          },
          {
            name: "Network",
            items: [
              { label: "Global P2P Peers Map", action: () => setActiveTab("network") },
              { label: "Check Signed Updates", action: handleCheckUpdate },
              { label: "Resync Blockchain Headers", action: () => alert("Blockchain headers re-verified against BlockBum consensus protocol.") }
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
              { label: "Keyboard Accelerators", action: () => alert("Ctrl+S: Send BUM\nCtrl+R: Receive BUM\nCtrl+L: Lock Vault\nCtrl+N: New Wallet\nCtrl+Q: Exit\nEsc: Close Modal") },
              { separator: true },
              {
                label: "About BlockBum Core",
                action: () =>
                  alert(
                    "BlockBum Core v0.2.0\nTheme: Soft Light White, Imperial Gold, Radiant Orange\nA decentralized digital association, cryptocurrency, and private communication platform."
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
                color: openMenu === menu.name ? "#FFFFFF" : "#1E293B",
                border: "none",
                borderRadius: "3px",
                padding: "3px 10px",
                fontSize: "12px",
                cursor: "pointer",
                fontWeight: "500"
              }}
            >
              {menu.name}
            </button>

            {openMenu === menu.name && (
              <div
                style={{
                  position: "absolute",
                  top: "26px",
                  left: 0,
                  backgroundColor: "#FFFFFF",
                  border: "1px solid #D4AF37",
                  borderRadius: "6px",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                  minWidth: "240px",
                  padding: "4px 0",
                  zIndex: 100
                }}
              >
                {menu.items.map((item, idx) =>
                  item.separator ? (
                    <div key={idx} style={{ height: "1px", backgroundColor: "#E2E8F0", margin: "4px 0" }} />
                  ) : (
                    <div
                      key={idx}
                      onClick={() => {
                        setOpenMenu(null);
                        item.action?.();
                      }}
                      style={{
                        padding: "7px 16px",
                        display: "flex",
                        justifyContent: "space-between",
                        cursor: "pointer",
                        color: "#0F172A",
                        fontSize: "12px"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#FEF9EE";
                        e.currentTarget.style.color = "#FF6B00";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                        e.currentTarget.style.color = "#0F172A";
                      }}
                    >
                      <span>{item.label}</span>
                      {item.shortcut && <span style={{ color: "#64748B", fontSize: "11px" }}>{item.shortcut}</span>}
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
            backgroundColor: "#EAEFF5",
            borderRight: "1px solid #D8DFE8",
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
                borderBottom: "1px solid #D8DFE8",
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
                  boxShadow: "0 2px 10px rgba(212, 175, 55, 0.4)"
                }}
              />
              <div>
                <div style={{ color: "#0F172A", fontWeight: "bold", fontSize: "16px", letterSpacing: "0.5px" }}>
                  BlockBum
                </div>
                <div style={{ color: "#FF6B00", fontSize: "10px", fontWeight: "bold", letterSpacing: "1px" }}>
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
                      borderLeft: isActive ? "3px solid #FF6B00" : "3px solid transparent",
                      background: isActive
                        ? "linear-gradient(90deg, rgba(255, 107, 0, 0.12) 0%, rgba(212, 175, 55, 0.08) 100%)"
                        : "transparent",
                      color: isActive ? "#B8860B" : "#475569",
                      fontWeight: isActive ? "bold" : "500",
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
              backgroundColor: "#FFFFFF",
              border: "1px solid #D8DFE8",
              margin: "8px",
              borderRadius: "8px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.03)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
              <span style={{ color: "#0F172A", fontWeight: "bold", fontSize: "12px" }}>
                {selectedIdentity.alias}
              </span>
              <button
                onClick={() => setShowModeModal(true)}
                title="Switch client execution mode"
                style={{
                  backgroundColor: "#FEF9C3",
                  border: "1px solid #D4AF37",
                  color: "#B8860B",
                  fontSize: "10px",
                  fontWeight: "600",
                  padding: "1px 6px",
                  borderRadius: "4px",
                  cursor: "pointer"
                }}
              >
                {clientMode === "full_node" ? "Full Node" : "SPV"}
              </button>
            </div>
            <div style={{ color: "#64748B", fontFamily: "monospace", fontSize: "11px", marginBottom: "6px" }}>
              {selectedIdentity.address.substring(0, 10)}...{selectedIdentity.address.substring(36)}
            </div>
            <div style={{ color: "#B8860B", fontWeight: "bold", fontSize: "14px" }}>
              {selectedIdentity.balance_bum.toFixed(4)} BUM
            </div>
          </div>
        </aside>

        {/* Central Content Area (Light White Theme) */}
        <main
          role="main"
          style={{
            flex: 1,
            backgroundColor: "#F4F6F9",
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
                  background: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  borderRadius: "10px",
                  padding: "24px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.04)"
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
                      boxShadow: "0 4px 18px rgba(212, 175, 55, 0.4)"
                    }}
                  />
                  <div>
                    <div style={{ color: "#B8860B", fontSize: "11px", fontWeight: "bold", letterSpacing: "1px" }}>
                      TOTAL SPENDABLE BALANCE
                    </div>
                    <div style={{ color: "#B8860B", fontSize: "36px", fontWeight: "bold", margin: "4px 0" }}>
                      {selectedIdentity.balance_bum.toFixed(8)} BUM
                    </div>
                    <div style={{ color: "#64748B", fontSize: "13px" }}>
                      Pending: 0.00000000 BUM  •  Fiat Estimate: ~${(selectedIdentity.balance_bum * 2.0).toFixed(2)} USD
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "12px" }}>
                  <button
                    onClick={() => setShowReceiveModal(true)}
                    style={{
                      padding: "10px 20px",
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #D4AF37",
                      borderRadius: "6px",
                      color: "#B8860B",
                      fontWeight: "bold",
                      fontSize: "14px",
                      cursor: "pointer"
                    }}
                  >
                    📥 Receive
                  </button>
                  <button
                    onClick={() => {
                      const el = document.getElementById("recipientInput");
                      el?.focus();
                    }}
                    style={{
                      padding: "10px 22px",
                      background: "linear-gradient(135deg, #FF6B00 0%, #FF8800 100%)",
                      border: "1px solid #EA580C",
                      borderRadius: "6px",
                      color: "#FFFFFF",
                      fontWeight: "bold",
                      fontSize: "14px",
                      cursor: "pointer",
                      boxShadow: "0 2px 10px rgba(255, 107, 0, 0.25)"
                    }}
                  >
                    ⚡ Send BUM
                  </button>
                </div>
              </div>

              {/* Send Form & Address Card */}
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "20px" }}>
                {/* Send BUM Form */}
                <div
                  style={{
                    backgroundColor: "#FFFFFF",
                    border: "1px solid #E2E8F0",
                    borderRadius: "8px",
                    padding: "20px",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.03)"
                  }}
                >
                  <h3 style={{ margin: "0 0 16px 0", color: "#0F172A", fontSize: "16px", fontWeight: "bold" }}>
                    ⚡ Send BUM Coins
                  </h3>
                  <form onSubmit={handleSendTransaction}>
                    <div style={{ marginBottom: "14px" }}>
                      <label style={{ display: "block", color: "#334155", fontSize: "12px", fontWeight: "600", marginBottom: "6px" }}>
                        Recipient Bech32 Address (bb1...)
                      </label>
                      <input
                        id="recipientInput"
                        type="text"
                        value={recipient}
                        onChange={(e) => setRecipient(e.target.value)}
                        placeholder="bb1d9812f8a429019ca5621de8821fedcba9876543"
                        style={{
                          width: "100%",
                          padding: "10px",
                          backgroundColor: "#F8FAFC",
                          border: "1px solid #CBD5E1",
                          borderRadius: "4px",
                          color: "#0F172A",
                          fontFamily: "monospace",
                          fontSize: "13px",
                          boxSizing: "border-box"
                        }}
                      />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "16px" }}>
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                          <label style={{ color: "#334155", fontSize: "12px", fontWeight: "600" }}>Amount (BUM)</label>
                          <button
                            type="button"
                            onClick={() => setTransferAmount(Math.max(0, selectedIdentity.balance_bum - 0.0001).toFixed(4))}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#FF6B00",
                              fontSize: "11px",
                              fontWeight: "bold",
                              cursor: "pointer"
                            }}
                          >
                            MAX
                          </button>
                        </div>
                        <input
                          type="text"
                          value={transferAmount}
                          onChange={(e) => setTransferAmount(e.target.value)}
                          placeholder="0.00000000"
                          style={{
                            width: "100%",
                            padding: "10px",
                            backgroundColor: "#F8FAFC",
                            border: "1px solid #CBD5E1",
                            borderRadius: "4px",
                            color: "#B8860B",
                            fontWeight: "bold",
                            fontSize: "14px",
                            boxSizing: "border-box"
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", color: "#334155", fontSize: "12px", fontWeight: "600", marginBottom: "6px" }}>
                          Estimated Network Fee
                        </label>
                        <input
                          type="text"
                          disabled
                          value="0.00010000 BUM"
                          style={{
                            width: "100%",
                            padding: "10px",
                            backgroundColor: "#F1F5F9",
                            border: "1px solid #CBD5E1",
                            borderRadius: "4px",
                            color: "#64748B",
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
                          backgroundColor: transferStatus.type === "success" ? "#ECFDF5" : "#FEF2F2",
                          border: transferStatus.type === "success" ? "1px solid #A7F3D0" : "1px solid #FECACA",
                          color: transferStatus.type === "success" ? "#065F46" : "#991B1B"
                        }}
                      >
                        {transferStatus.msg}
                      </div>
                    )}

                    <button
                      type="submit"
                      style={{
                        padding: "10px 24px",
                        background: "linear-gradient(135deg, #FF6B00 0%, #FF8800 100%)",
                        border: "1px solid #EA580C",
                        borderRadius: "5px",
                        color: "#FFFFFF",
                        fontWeight: "bold",
                        fontSize: "14px",
                        cursor: "pointer",
                        boxShadow: "0 2px 10px rgba(255, 107, 0, 0.25)"
                      }}
                    >
                      Sign & Broadcast (Monocypher Ed25519)
                    </button>
                  </form>
                </div>

                {/* My Address Card */}
                <div
                  style={{
                    backgroundColor: "#FFFFFF",
                    border: "1px solid #E2E8F0",
                    borderRadius: "8px",
                    padding: "20px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.03)"
                  }}
                >
                  <div>
                    <h3 style={{ margin: "0 0 12px 0", color: "#0F172A", fontSize: "16px", fontWeight: "bold" }}>
                      My Receive Address
                    </h3>
                    <div
                      style={{
                        backgroundColor: "#F8FAFC",
                        border: "1px solid #CBD5E1",
                        borderRadius: "4px",
                        padding: "10px",
                        color: "#0F172A",
                        fontFamily: "monospace",
                        fontSize: "12px",
                        wordBreak: "break-all",
                        marginBottom: "12px"
                      }}
                    >
                      {selectedIdentity.address}
                    </div>
                    <div style={{ color: "#64748B", fontSize: "12px", lineHeight: "1.5" }}>
                      Deterministic Bech32 address. Compatible across Windows, Linux (Ubuntu), macOS, Android, and iOS.
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(selectedIdentity.address);
                        alert("Address copied to clipboard:\n" + selectedIdentity.address);
                      }}
                      style={{
                        flex: 1,
                        padding: "8px",
                        backgroundColor: "#FFFFFF",
                        border: "1px solid #CBD5E1",
                        borderRadius: "4px",
                        color: "#0F172A",
                        fontSize: "12px",
                        fontWeight: "600",
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
                        backgroundColor: "#FFFFFF",
                        border: "1px solid #D4AF37",
                        borderRadius: "4px",
                        color: "#B8860B",
                        fontSize: "12px",
                        fontWeight: "600",
                        cursor: "pointer"
                      }}
                    >
                      📱 Show QR
                    </button>
                  </div>
                </div>
              </div>

              {/* Transactions Data Table with Real-time Filters */}
              <div
                style={{
                  backgroundColor: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  borderRadius: "8px",
                  padding: "20px",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.03)"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                  <h3 style={{ margin: 0, color: "#0F172A", fontSize: "16px", fontWeight: "bold" }}>Transaction Ledger</h3>
                  <div style={{ display: "flex", gap: "6px" }}>
                    {(["all", "send", "receive", "reward"] as const).map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setTxFilter(filter)}
                        style={{
                          padding: "4px 10px",
                          borderRadius: "4px",
                          border: txFilter === filter ? "1px solid #FF6B00" : "1px solid #CBD5E1",
                          backgroundColor: txFilter === filter ? "#FF6B00" : "#FFFFFF",
                          color: txFilter === filter ? "#FFFFFF" : "#475569",
                          fontSize: "11px",
                          fontWeight: "bold",
                          cursor: "pointer"
                        }}
                      >
                        {filter.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #E2E8F0", textAlign: "left", color: "#64748B", backgroundColor: "#F8FAFC" }}>
                      <th style={{ padding: "10px 8px" }}>Status</th>
                      <th style={{ padding: "10px 8px" }}>Type</th>
                      <th style={{ padding: "10px 8px" }}>Tx ID</th>
                      <th style={{ padding: "10px 8px" }}>Counterparty</th>
                      <th style={{ padding: "10px 8px" }}>Amount (BUM)</th>
                      <th style={{ padding: "10px 8px" }}>Fee</th>
                      <th style={{ padding: "10px 8px" }}>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTxs.map((tx) => (
                      <tr key={tx.tx_id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                        <td style={{ padding: "10px 8px" }}>
                          <span style={{ color: "#059669", fontWeight: "600" }}>● Confirmed</span>
                        </td>
                        <td style={{ padding: "10px 8px", color: tx.type === "send" ? "#EA580C" : "#B8860B", fontWeight: "bold" }}>
                          {tx.type.toUpperCase()}
                        </td>
                        <td style={{ padding: "10px 8px", fontFamily: "monospace", color: "#64748B" }}>
                          {tx.tx_id}
                        </td>
                        <td style={{ padding: "10px 8px", fontFamily: "monospace", color: "#0F172A" }}>
                          {tx.counterparty.length > 24 ? tx.counterparty.substring(0, 12) + "..." + tx.counterparty.slice(-8) : tx.counterparty}
                        </td>
                        <td
                          style={{
                            padding: "10px 8px",
                            fontWeight: "bold",
                            color: tx.type === "send" ? "#DC2626" : "#059669"
                          }}
                        >
                          {tx.type === "send" ? "-" : "+"}
                          {tx.amount_bum.toFixed(4)}
                        </td>
                        <td style={{ padding: "10px 8px", color: "#64748B" }}>
                          {tx.fee_bum.toFixed(4)}
                        </td>
                        <td style={{ padding: "10px 8px", color: "#64748B" }}>{tx.timestamp}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB: COMMUNITIES (BANNER REMOVED, ALL BUTTONS FUNCTIONAL) */}
          {/* ================================================================= */}
          {activeTab === "communities" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Header Bar */}
              <div
                style={{
                  backgroundColor: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  borderRadius: "8px",
                  padding: "18px 24px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.03)"
                }}
              >
                <div>
                  <h2 style={{ margin: "0 0 4px 0", color: "#0F172A", fontSize: "20px", fontWeight: "bold" }}>
                    {activeComm.name}
                  </h2>
                  <p style={{ margin: 0, color: "#64748B", fontSize: "13px" }}>
                    {activeComm.description} • Role: <strong style={{ color: "#B8860B" }}>{activeComm.myRole}</strong>
                  </p>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    onClick={() => setShowNewCommunityModal(true)}
                    style={{
                      padding: "8px 16px",
                      background: "linear-gradient(135deg, #FF6B00 0%, #FF8800 100%)",
                      border: "1px solid #EA580C",
                      borderRadius: "5px",
                      color: "#FFFFFF",
                      fontWeight: "bold",
                      fontSize: "13px",
                      cursor: "pointer"
                    }}
                  >
                    + Create Community
                  </button>
                  <button
                    onClick={() => alert(`You have joined ${activeComm.name} as an active peer member.`)}
                    style={{
                      padding: "8px 16px",
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #D4AF37",
                      borderRadius: "5px",
                      color: "#B8860B",
                      fontWeight: "bold",
                      fontSize: "13px",
                      cursor: "pointer"
                    }}
                  >
                    ✓ Joined ({activeComm.memberCount})
                  </button>
                </div>
              </div>

              {/* Main Community Workspace: Channels + Active Stream */}
              <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: "20px", minHeight: "480px" }}>
                {/* Left: Community & Channel Switcher */}
                <div
                  style={{
                    backgroundColor: "#FFFFFF",
                    border: "1px solid #E2E8F0",
                    borderRadius: "8px",
                    padding: "16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.03)"
                  }}
                >
                  <div>
                    <div style={{ color: "#0F172A", fontWeight: "bold", fontSize: "12px", marginBottom: "8px", textTransform: "uppercase" }}>
                      Communities
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      {communities.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => {
                            setSelectedCommunityId(c.id);
                            setActiveChannel(c.channels[0] || "general");
                          }}
                          style={{
                            padding: "8px 10px",
                            borderRadius: "5px",
                            border: selectedCommunityId === c.id ? "1px solid #D4AF37" : "1px solid transparent",
                            backgroundColor: selectedCommunityId === c.id ? "#FEF9EE" : "transparent",
                            color: selectedCommunityId === c.id ? "#B8860B" : "#334155",
                            fontWeight: selectedCommunityId === c.id ? "bold" : "500",
                            textAlign: "left",
                            fontSize: "12px",
                            cursor: "pointer"
                          }}
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div style={{ color: "#0F172A", fontWeight: "bold", fontSize: "12px", marginBottom: "8px", textTransform: "uppercase" }}>
                      Channels
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      {activeComm.channels.map((ch) => (
                        <button
                          key={ch}
                          onClick={() => setActiveChannel(ch)}
                          style={{
                            padding: "7px 10px",
                            borderRadius: "5px",
                            border: activeChannel === ch ? "1px solid #FF6B00" : "1px solid transparent",
                            backgroundColor: activeChannel === ch ? "rgba(255, 107, 0, 0.1)" : "transparent",
                            color: activeChannel === ch ? "#EA580C" : "#64748B",
                            fontWeight: activeChannel === ch ? "bold" : "500",
                            textAlign: "left",
                            fontSize: "13px",
                            cursor: "pointer"
                          }}
                        >
                          # {ch}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right: Channel Messages Stream */}
                <div
                  style={{
                    backgroundColor: "#FFFFFF",
                    border: "1px solid #E2E8F0",
                    borderRadius: "8px",
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.03)"
                  }}
                >
                  <div
                    style={{
                      padding: "12px 20px",
                      borderBottom: "1px solid #E2E8F0",
                      backgroundColor: "#F8FAFC",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}
                  >
                    <span style={{ fontWeight: "bold", color: "#0F172A", fontSize: "14px" }}>#{activeChannel}</span>
                    <span style={{ fontSize: "11px", color: "#059669", fontWeight: "600" }}>🔒 Authenticated Broadcast</span>
                  </div>

                  <div style={{ flex: 1, padding: "20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px" }}>
                    {messages
                      .filter((m) => m.communityId === selectedCommunityId || m.channel === activeChannel)
                      .map((m) => (
                        <div
                          key={m.id}
                          style={{
                            backgroundColor: "#F8FAFC",
                            border: "1px solid #E2E8F0",
                            borderRadius: "8px",
                            padding: "12px 16px"
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                            <span style={{ fontWeight: "bold", color: "#B8860B", fontSize: "12px" }}>{m.senderAlias}</span>
                            <span style={{ color: "#94A3B8", fontSize: "11px" }}>{m.timestamp}</span>
                          </div>
                          <div style={{ color: "#0F172A", fontSize: "13px", lineHeight: "1.4" }}>{m.content}</div>
                        </div>
                      ))}
                  </div>

                  {/* Channel Chat Input */}
                  <div style={{ padding: "14px 20px", borderTop: "1px solid #E2E8F0", display: "flex", gap: "10px", backgroundColor: "#F8FAFC" }}>
                    <input
                      type="text"
                      value={communityMessageInput}
                      onChange={(e) => setCommunityMessageInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendCommunityMessage()}
                      placeholder={`Message #${activeChannel}...`}
                      style={{
                        flex: 1,
                        padding: "10px 14px",
                        backgroundColor: "#FFFFFF",
                        border: "1px solid #CBD5E1",
                        borderRadius: "6px",
                        color: "#0F172A",
                        fontSize: "13px",
                        outline: "none"
                      }}
                    />
                    <button
                      onClick={handleSendCommunityMessage}
                      style={{
                        padding: "10px 20px",
                        background: "linear-gradient(135deg, #FF6B00 0%, #FF8800 100%)",
                        border: "1px solid #EA580C",
                        borderRadius: "6px",
                        color: "#FFFFFF",
                        fontWeight: "bold",
                        fontSize: "13px",
                        cursor: "pointer"
                      }}
                    >
                      Post
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB: DECENTRALIZED FILES */}
          {/* ================================================================= */}
          {activeTab === "files" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* File Upload Card */}
              <div
                style={{
                  backgroundColor: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  borderRadius: "8px",
                  padding: "20px",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.03)"
                }}
              >
                <h3 style={{ margin: "0 0 14px 0", color: "#0F172A", fontSize: "16px", fontWeight: "bold" }}>
                  📦 Publish Distributed Artifact
                </h3>
                <form onSubmit={handleUploadFile} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: "12px", alignItems: "flex-end" }}>
                  <div>
                    <label style={{ display: "block", color: "#334155", fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>
                      Artifact / File Name
                    </label>
                    <input
                      type="text"
                      value={uploadFileName}
                      onChange={(e) => setUploadFileName(e.target.value)}
                      placeholder="e.g. protocol_audit_v2.tar.gz"
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        backgroundColor: "#F8FAFC",
                        border: "1px solid #CBD5E1",
                        borderRadius: "4px",
                        fontSize: "13px",
                        boxSizing: "border-box"
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", color: "#334155", fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>
                      Size (KB)
                    </label>
                    <input
                      type="number"
                      value={uploadFileSize}
                      onChange={(e) => setUploadFileSize(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        backgroundColor: "#F8FAFC",
                        border: "1px solid #CBD5E1",
                        borderRadius: "4px",
                        fontSize: "13px",
                        boxSizing: "border-box"
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "flex", alignItems: "center", gap: "6px", color: "#334155", fontSize: "12px", fontWeight: "600", height: "36px" }}>
                      <input
                        type="checkbox"
                        checked={uploadIsPublic}
                        onChange={(e) => setUploadIsPublic(e.target.checked)}
                      />
                      Public Swarm
                    </label>
                  </div>
                  <button
                    type="submit"
                    style={{
                      padding: "10px 20px",
                      background: "linear-gradient(135deg, #FF6B00 0%, #FF8800 100%)",
                      border: "1px solid #EA580C",
                      borderRadius: "5px",
                      color: "#FFFFFF",
                      fontWeight: "bold",
                      fontSize: "13px",
                      cursor: "pointer"
                    }}
                  >
                    Upload & Chunk
                  </button>
                </form>
              </div>

              {/* Files Table */}
              <div
                style={{
                  backgroundColor: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  borderRadius: "8px",
                  padding: "20px",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.03)"
                }}
              >
                <h3 style={{ margin: "0 0 14px 0", color: "#0F172A", fontSize: "16px", fontWeight: "bold" }}>
                  Active Swarm Artifacts ({sharedFiles.length})
                </h3>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #E2E8F0", textAlign: "left", color: "#64748B", backgroundColor: "#F8FAFC" }}>
                      <th style={{ padding: "10px 8px" }}>Name</th>
                      <th style={{ padding: "10px 8px" }}>CID Digest</th>
                      <th style={{ padding: "10px 8px" }}>Size</th>
                      <th style={{ padding: "10px 8px" }}>Chunks</th>
                      <th style={{ padding: "10px 8px" }}>Integrity Status</th>
                      <th style={{ padding: "10px 8px" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sharedFiles.map((file) => (
                      <tr key={file.cid} style={{ borderBottom: "1px solid #F1F5F9" }}>
                        <td style={{ padding: "10px 8px", fontWeight: "bold", color: "#0F172A" }}>{file.name}</td>
                        <td style={{ padding: "10px 8px", fontFamily: "monospace", color: "#B8860B" }}>{file.cid.substring(0, 16)}...</td>
                        <td style={{ padding: "10px 8px", color: "#64748B" }}>{file.size_kb} KB</td>
                        <td style={{ padding: "10px 8px", color: "#64748B" }}>{file.chunks_count}</td>
                        <td style={{ padding: "10px 8px" }}>
                          <span style={{ color: "#059669", fontWeight: "600", fontSize: "11px" }}>✓ SHA-256 Verified</span>
                        </td>
                        <td style={{ padding: "10px 8px" }}>
                          <button
                            onClick={() => alert(`Starting download for ${file.name}...\nVerified SHA-256 chunk hashes from 8 swarm peers!`)}
                            style={{
                              padding: "4px 10px",
                              backgroundColor: "#FEF9EE",
                              border: "1px solid #D4AF37",
                              borderRadius: "4px",
                              color: "#B8860B",
                              fontSize: "11px",
                              fontWeight: "bold",
                              cursor: "pointer",
                              marginRight: "6px"
                            }}
                          >
                            ⬇ Download
                          </button>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(file.cid);
                              alert("CID copied to clipboard:\n" + file.cid);
                            }}
                            style={{
                              padding: "4px 8px",
                              backgroundColor: "#FFFFFF",
                              border: "1px solid #CBD5E1",
                              borderRadius: "4px",
                              color: "#475569",
                              fontSize: "11px",
                              cursor: "pointer"
                            }}
                          >
                            📋 Copy CID
                          </button>
                        </td>
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
            <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: "20px", flex: 1, minHeight: "500px" }}>
              {/* Contacts Rail */}
              <div
                style={{
                  backgroundColor: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  borderRadius: "8px",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.03)"
                }}
              >
                <div style={{ color: "#0F172A", fontWeight: "bold", fontSize: "13px", marginBottom: "8px" }}>
                  Encrypted Contacts
                </div>
                {[
                  { id: "bob", name: "Bob_NodeOperator", status: "Online" },
                  { id: "alice", name: "Alice_Researcher", status: "Online" },
                  { id: "team", name: "Core Security Team", status: "Active" }
                ].map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setActiveContact(c.id)}
                    style={{
                      padding: "10px",
                      borderRadius: "6px",
                      border: activeContact === c.id ? "1px solid #D4AF37" : "1px solid #E2E8F0",
                      backgroundColor: activeContact === c.id ? "#FEF9EE" : "#FFFFFF",
                      textAlign: "left",
                      cursor: "pointer"
                    }}
                  >
                    <div style={{ fontWeight: "bold", color: activeContact === c.id ? "#B8860B" : "#0F172A", fontSize: "13px" }}>
                      {c.name}
                    </div>
                    <div style={{ color: "#059669", fontSize: "11px", marginTop: "2px" }}>● {c.status}</div>
                  </button>
                ))}
              </div>

              {/* Chat View */}
              <div
                style={{
                  backgroundColor: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  borderRadius: "8px",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.03)"
                }}
              >
                <div
                  style={{
                    padding: "14px 20px",
                    borderBottom: "1px solid #E2E8F0",
                    backgroundColor: "#F8FAFC",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                >
                  <span style={{ fontWeight: "bold", color: "#0F172A", fontSize: "15px" }}>
                    {activeContact === "bob" ? "Bob_NodeOperator" : activeContact === "alice" ? "Alice_Researcher" : "Core Security Team"}
                  </span>
                  <span
                    style={{
                      backgroundColor: "#ECFDF5",
                      border: "1px solid #A7F3D0",
                      color: "#065F46",
                      fontSize: "11px",
                      padding: "3px 8px",
                      borderRadius: "4px",
                      fontWeight: "bold"
                    }}
                  >
                    🔒 Monocypher X25519 + ChaCha20-Poly1305 E2EE
                  </span>
                </div>

                <div style={{ flex: 1, padding: "20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px" }}>
                  {messages.map((m) => {
                    const isMe = m.sender === selectedIdentity.address;
                    return (
                      <div
                        key={m.id}
                        style={{
                          alignSelf: isMe ? "flex-end" : "flex-start",
                          maxWidth: "70%",
                          backgroundColor: isMe ? "#FEF9EE" : "#F8FAFC",
                          border: isMe ? "1px solid #D4AF37" : "1px solid #E2E8F0",
                          borderRadius: "8px",
                          padding: "12px 16px"
                        }}
                      >
                        <div style={{ fontSize: "11px", color: isMe ? "#B8860B" : "#64748B", marginBottom: "4px" }}>
                          {m.senderAlias} • {m.timestamp}
                        </div>
                        <div style={{ fontSize: "13px", color: "#0F172A", lineHeight: "1.4" }}>{m.content}</div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ padding: "14px 20px", borderTop: "1px solid #E2E8F0", display: "flex", gap: "10px", backgroundColor: "#F8FAFC" }}>
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                    placeholder="Type an end-to-end encrypted message..."
                    style={{
                      flex: 1,
                      padding: "10px 14px",
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #CBD5E1",
                      borderRadius: "6px",
                      color: "#0F172A",
                      fontSize: "13px",
                      outline: "none"
                    }}
                  />
                  <button
                    onClick={handleSendMessage}
                    style={{
                      padding: "10px 20px",
                      background: "linear-gradient(135deg, #FF6B00 0%, #FF8800 100%)",
                      border: "1px solid #EA580C",
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
                  { label: "Chain Height", val: `#${nodeStatus.chain_height.toLocaleString()}`, color: "#B8860B" },
                  { label: "Consensus Mode", val: "BlockBum PoW", color: "#EA580C" },
                  { label: "Connected Peers", val: `${peersList.length} (IPv4/IPv6)`, color: "#059669" },
                  { label: "Mempool Pending", val: `${nodeStatus.mempool_tx_count} txs`, color: "#0284C7" }
                ].map((stat, i) => (
                  <div
                    key={i}
                    style={{
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #E2E8F0",
                      borderRadius: "8px",
                      padding: "16px",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.03)"
                    }}
                  >
                    <div style={{ color: "#64748B", fontSize: "11px", fontWeight: "bold" }}>{stat.label}</div>
                    <div style={{ color: stat.color, fontSize: "20px", fontWeight: "bold", marginTop: "4px" }}>
                      {stat.val}
                    </div>
                  </div>
                ))}
              </div>

              {/* Connect Peer Form */}
              <div
                style={{
                  backgroundColor: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  borderRadius: "8px",
                  padding: "18px 20px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.03)"
                }}
              >
                <form onSubmit={handleAddPeer} style={{ display: "flex", gap: "10px", flex: 1, marginRight: "16px" }}>
                  <input
                    type="text"
                    value={newPeerIp}
                    onChange={(e) => setNewPeerIp(e.target.value)}
                    placeholder="Enter peer IP:Port (e.g. 192.0.2.1:8545 or [2001:db8::1]:8545)"
                    style={{
                      flex: 1,
                      padding: "9px 12px",
                      backgroundColor: "#F8FAFC",
                      border: "1px solid #CBD5E1",
                      borderRadius: "5px",
                      fontSize: "13px"
                    }}
                  />
                  <button
                    type="submit"
                    style={{
                      padding: "9px 18px",
                      background: "linear-gradient(135deg, #FF6B00 0%, #FF8800 100%)",
                      border: "1px solid #EA580C",
                      borderRadius: "5px",
                      color: "#FFFFFF",
                      fontWeight: "bold",
                      fontSize: "13px",
                      cursor: "pointer"
                    }}
                  >
                    + Connect Peer
                  </button>
                </form>
                <button
                  onClick={handlePingPeers}
                  style={{
                    padding: "9px 16px",
                    backgroundColor: "#FFFFFF",
                    border: "1px solid #D4AF37",
                    borderRadius: "5px",
                    color: "#B8860B",
                    fontWeight: "bold",
                    fontSize: "13px",
                    cursor: "pointer"
                  }}
                >
                  📡 Ping All Peers
                </button>
              </div>

              {/* Peer Connections Table */}
              <div
                style={{
                  backgroundColor: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  borderRadius: "8px",
                  padding: "20px",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.03)"
                }}
              >
                <h3 style={{ margin: "0 0 16px 0", color: "#0F172A", fontSize: "16px", fontWeight: "bold" }}>
                  Connected Global Peers ({peersList.length})
                </h3>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #E2E8F0", textAlign: "left", color: "#64748B", backgroundColor: "#F8FAFC" }}>
                      <th style={{ padding: "10px 8px" }}>Peer Address</th>
                      <th style={{ padding: "10px 8px" }}>Protocol</th>
                      <th style={{ padding: "10px 8px" }}>Client Version</th>
                      <th style={{ padding: "10px 8px" }}>Latency</th>
                      <th style={{ padding: "10px 8px" }}>Blocks Behind</th>
                      <th style={{ padding: "10px 8px" }}>Reputation Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {peersList.map((p, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #F1F5F9" }}>
                        <td style={{ padding: "10px 8px", fontFamily: "monospace", color: "#0F172A" }}>{p.ip}</td>
                        <td style={{ padding: "10px 8px", color: p.proto === "IPv6" ? "#0284C7" : "#059669", fontWeight: "600" }}>{p.proto}</td>
                        <td style={{ padding: "10px 8px", color: "#64748B" }}>{p.ver}</td>
                        <td style={{ padding: "10px 8px", color: "#059669", fontWeight: "bold" }}>{p.ping}</td>
                        <td style={{ padding: "10px 8px", color: "#64748B" }}>{p.behind}</td>
                        <td style={{ padding: "10px 8px", color: "#B8860B", fontWeight: "bold" }}>{p.score}</td>
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
                  backgroundColor: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  borderRadius: "8px",
                  padding: "20px",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.03)"
                }}
              >
                <div>
                  <h3 style={{ margin: "0 0 6px 0", color: "#0F172A", fontSize: "18px", fontWeight: "bold" }}>
                    Multi-Device Identity Management
                  </h3>
                  <div style={{ color: "#64748B", fontSize: "13px" }}>
                    All linked devices are cryptographically authenticated via Monocypher Ed25519 master signatures.
                  </div>
                </div>
                <button
                  onClick={() => setShowPairModal(true)}
                  style={{
                    padding: "10px 20px",
                    background: "linear-gradient(135deg, #FF6B00 0%, #FF8800 100%)",
                    border: "1px solid #EA580C",
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
                      backgroundColor: "#FFFFFF",
                      border: d.is_current ? "1px solid #D4AF37" : "1px solid #E2E8F0",
                      borderRadius: "8px",
                      padding: "18px",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.03)"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <span style={{ fontWeight: "bold", color: "#0F172A", fontSize: "14px" }}>{d.device_name}</span>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: "bold",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          backgroundColor: d.status === "authorized" ? "#ECFDF5" : "#FEF2F2",
                          color: d.status === "authorized" ? "#065F46" : "#991B1B",
                          border: d.status === "authorized" ? "1px solid #A7F3D0" : "1px solid #FECACA"
                        }}
                      >
                        {d.is_current ? "Current Workstation" : d.status.toUpperCase()}
                      </span>
                    </div>

                    <div style={{ fontSize: "12px", color: "#64748B", marginBottom: "6px" }}>
                      Platform: <strong style={{ color: "#0F172A" }}>{d.platform.toUpperCase()}</strong>  •  Paired: {d.paired_at}
                    </div>

                    <div style={{ fontSize: "11px", fontFamily: "monospace", color: "#64748B", marginBottom: "14px" }}>
                      Device Auth Key: {d.auth_public_key}
                    </div>

                    {!d.is_current && d.status === "authorized" && (
                      <button
                        onClick={() => handleRevokeDevice(d.device_id)}
                        style={{
                          padding: "6px 14px",
                          backgroundColor: "#FEF2F2",
                          border: "1px solid #EF4444",
                          borderRadius: "4px",
                          color: "#DC2626",
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
                  backgroundColor: "#FFFFFF",
                  border: "1px solid #D4AF37",
                  borderRadius: "8px",
                  padding: "20px",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.03)"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <h3 style={{ margin: 0, color: "#0F172A", fontSize: "16px", fontWeight: "bold" }}>
                    🛡 Ubuntu & Linux Native Cryptographic Engine
                  </h3>
                  <button
                    onClick={() => setShowCryptoAuditModal(true)}
                    style={{
                      backgroundColor: "#ECFDF5",
                      border: "1px solid #10B981",
                      color: "#065F46",
                      fontSize: "11px",
                      fontWeight: "bold",
                      padding: "4px 10px",
                      borderRadius: "4px",
                      cursor: "pointer"
                    }}
                  >
                    View Cryptography Specification
                  </button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginTop: "12px" }}>
                  <div style={{ backgroundColor: "#F8FAFC", padding: "12px", borderRadius: "6px", border: "1px solid #E2E8F0" }}>
                    <div style={{ color: "#B8860B", fontWeight: "bold", fontSize: "12px" }}>Signatures</div>
                    <div style={{ color: "#0F172A", fontSize: "13px", marginTop: "2px", fontWeight: "600" }}>Ed25519 (RFC 8032)</div>
                  </div>
                  <div style={{ backgroundColor: "#F8FAFC", padding: "12px", borderRadius: "6px", border: "1px solid #E2E8F0" }}>
                    <div style={{ color: "#B8860B", fontWeight: "bold", fontSize: "12px" }}>Key Agreement</div>
                    <div style={{ color: "#0F172A", fontSize: "13px", marginTop: "2px", fontWeight: "600" }}>X25519 (ECDH)</div>
                  </div>
                  <div style={{ backgroundColor: "#F8FAFC", padding: "12px", borderRadius: "6px", border: "1px solid #E2E8F0" }}>
                    <div style={{ color: "#B8860B", fontWeight: "bold", fontSize: "12px" }}>AEAD Encryption</div>
                    <div style={{ color: "#0F172A", fontSize: "13px", marginTop: "2px", fontWeight: "600" }}>ChaCha20-Poly1305</div>
                  </div>
                  <div style={{ backgroundColor: "#F8FAFC", padding: "12px", borderRadius: "6px", border: "1px solid #E2E8F0" }}>
                    <div style={{ color: "#B8860B", fontWeight: "bold", fontSize: "12px" }}>Cryptographic Hashing</div>
                    <div style={{ color: "#0F172A", fontSize: "13px", marginTop: "2px", fontWeight: "600" }}>SHA-256 + BLAKE2b</div>
                  </div>
                </div>
              </div>

              {/* Execution Mode Selector */}
              <div
                style={{
                  backgroundColor: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  borderRadius: "8px",
                  padding: "20px",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.03)"
                }}
              >
                <h3 style={{ margin: "0 0 14px 0", color: "#0F172A", fontSize: "16px", fontWeight: "bold" }}>
                  Client Execution Mode
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div
                    onClick={() => setClientMode("full_node")}
                    style={{
                      padding: "16px",
                      backgroundColor: clientMode === "full_node" ? "#FEF9EE" : "#F8FAFC",
                      border: clientMode === "full_node" ? "1px solid #D4AF37" : "1px solid #CBD5E1",
                      borderRadius: "6px",
                      cursor: "pointer"
                    }}
                  >
                    <div style={{ fontWeight: "bold", color: "#B8860B", fontSize: "14px", marginBottom: "4px" }}>
                      ● Full Node Mode {clientMode === "full_node" && "(Active)"}
                    </div>
                    <div style={{ color: "#64748B", fontSize: "12px", lineHeight: "1.4" }}>
                      Validates all block headers, transactions, UTXOs, and consensus proofs independently on local disk. Zero trust required.
                    </div>
                  </div>

                  <div
                    onClick={() => setClientMode("light_client")}
                    style={{
                      padding: "16px",
                      backgroundColor: clientMode === "light_client" ? "#FEF9EE" : "#F8FAFC",
                      border: clientMode === "light_client" ? "1px solid #D4AF37" : "1px solid #CBD5E1",
                      borderRadius: "6px",
                      cursor: "pointer"
                    }}
                  >
                    <div style={{ fontWeight: "bold", color: "#0284C7", fontSize: "14px", marginBottom: "4px" }}>
                      ● SPV Light Client Mode {clientMode === "light_client" && "(Active)"}
                    </div>
                    <div style={{ color: "#64748B", fontSize: "12px", lineHeight: "1.4" }}>
                      Downloads only 92-byte block headers and verifies Merkle inclusion proofs. Low memory and disk footprint for portable laptops.
                    </div>
                  </div>
                </div>
              </div>

              {/* Software Updates Verifier */}
              <div
                style={{
                  backgroundColor: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  borderRadius: "8px",
                  padding: "20px",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.03)"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h3 style={{ margin: "0 0 4px 0", color: "#0F172A", fontSize: "16px", fontWeight: "bold" }}>
                      Signed Application Releases
                    </h3>
                    <div style={{ color: "#64748B", fontSize: "12px" }}>
                      Current build: 0.2.0 • Deterministic SHA-256 release signed by BlockBum Core Key
                    </div>
                  </div>
                  <button
                    onClick={handleCheckUpdate}
                    disabled={isCheckingUpdate}
                    style={{
                      padding: "10px 18px",
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #D4AF37",
                      borderRadius: "6px",
                      color: "#B8860B",
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
                      backgroundColor: "#ECFDF5",
                      border: "1px solid #A7F3D0",
                      borderRadius: "6px",
                      padding: "14px"
                    }}
                  >
                    <div style={{ color: "#065F46", fontWeight: "bold", fontSize: "13px" }}>
                      New Signed Release Available: v{updateInfo.version} ({updateInfo.release_date})
                    </div>
                    <div style={{ color: "#475569", fontSize: "12px", margin: "6px 0", fontFamily: "monospace" }}>
                      Digest: {updateInfo.sha256_hash}
                    </div>
                    <div style={{ color: "#B8860B", fontSize: "12px", fontWeight: "600" }}>
                      Authority Signature: {updateInfo.signature}
                    </div>
                  </div>
                )}
              </div>

              {/* Localization & Accessibility */}
              <div
                style={{
                  backgroundColor: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  borderRadius: "8px",
                  padding: "20px",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "20px",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.03)"
                }}
              >
                <div>
                  <h4 style={{ margin: "0 0 10px 0", color: "#0F172A", fontSize: "14px" }}>Localization</h4>
                  <select
                    value={locale}
                    onChange={(e) => setLocale(e.target.value as SupportedLocale)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      backgroundColor: "#F8FAFC",
                      border: "1px solid #CBD5E1",
                      borderRadius: "4px",
                      fontSize: "13px"
                    }}
                  >
                    <option value="en">English (US)</option>
                    <option value="es">Español</option>
                    <option value="zh">中文 (Chinese)</option>
                    <option value="de">Deutsch</option>
                    <option value="fr">Français</option>
                    <option value="hi">हिन्दी (Hindi)</option>
                    <option value="ja">日本語 (Japanese)</option>
                  </select>
                </div>

                <div>
                  <h4 style={{ margin: "0 0 10px 0", color: "#0F172A", fontSize: "14px" }}>Accessibility</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px", color: "#334155" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <input
                        type="checkbox"
                        checked={accessibility.high_contrast}
                        onChange={(e) => setAccessibility({ ...accessibility, high_contrast: e.target.checked })}
                      />
                      High Contrast Mode
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <input
                        type="checkbox"
                        checked={accessibility.reduced_motion}
                        onChange={(e) => setAccessibility({ ...accessibility, reduced_motion: e.target.checked })}
                      />
                      Reduced Motion
                    </label>
                  </div>
                </div>
              </div>
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
          backgroundColor: "#E2E8F0",
          borderTop: "1px solid #CBD5E1",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 12px",
          fontSize: "11px",
          color: "#475569",
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
          <span style={{ color: clientMode === "full_node" ? "#B8860B" : "#0284C7", fontWeight: "bold" }}>
            🛡 Mode: {clientMode === "full_node" ? "Full Node (Validated)" : "SPV Light Client"}
          </span>
          <span style={{ color: "#059669", fontWeight: "bold" }}>
            🔒 Ubuntu Cryptography: Monocypher Active
          </span>
        </div>

        <div style={{ display: "flex", gap: "16px" }}>
          <span>🔐 Vault: Unlocked</span>
          <span style={{ color: "#B8860B", fontWeight: "bold" }}>📡 Peers: {peersList.length} Connected</span>
        </div>
      </footer>

      {/* ===================================================================== */}
      {/* 5. MODAL DIALOGS (LIGHT WHITE THEME) */}
      {/* ===================================================================== */}
      {/* Receive Modal */}
      {showReceiveModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000
          }}
          onClick={() => setShowReceiveModal(false)}
        >
          <div
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #D4AF37",
              borderRadius: "12px",
              padding: "28px",
              width: "440px",
              textAlign: "center",
              boxShadow: "0 12px 36px rgba(0,0,0,0.15)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={bbCoinImg}
              alt="BlockBum Coin"
              style={{ width: "64px", height: "64px", borderRadius: "50%", marginBottom: "12px" }}
            />
            <h3 style={{ margin: "0 0 6px 0", color: "#0F172A", fontSize: "18px", fontWeight: "bold" }}>
              Receive BUM Coins
            </h3>
            <p style={{ margin: "0 0 16px 0", color: "#64748B", fontSize: "13px" }}>
              Scan QR code or copy your Bech32 address below:
            </p>

            <div
              style={{
                width: "160px",
                height: "160px",
                backgroundColor: "#F8FAFC",
                border: "1px solid #CBD5E1",
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
                style={{ width: "90px", height: "90px", opacity: 0.95 }}
              />
            </div>

            <div
              style={{
                backgroundColor: "#F8FAFC",
                border: "1px solid #CBD5E1",
                borderRadius: "4px",
                padding: "10px",
                color: "#B8860B",
                fontFamily: "monospace",
                fontSize: "12px",
                wordBreak: "break-all",
                marginBottom: "16px",
                fontWeight: "600"
              }}
            >
              {selectedIdentity.address}
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(selectedIdentity.address);
                  alert("Address copied to clipboard:\n" + selectedIdentity.address);
                }}
                style={{
                  flex: 1,
                  padding: "10px",
                  background: "linear-gradient(135deg, #FF6B00 0%, #FF8800 100%)",
                  border: "1px solid #EA580C",
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
                  backgroundColor: "#FFFFFF",
                  border: "1px solid #CBD5E1",
                  borderRadius: "5px",
                  color: "#0F172A",
                  cursor: "pointer"
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recovery Seed Phrase Modal */}
      {showSeedModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000
          }}
          onClick={() => setShowSeedModal(false)}
        >
          <div
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #D4AF37",
              borderRadius: "12px",
              padding: "28px",
              width: "480px",
              boxShadow: "0 12px 36px rgba(0,0,0,0.15)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 8px 0", color: "#0F172A", fontSize: "18px", fontWeight: "bold" }}>
              🔑 Secret Recovery Seed Phrase
            </h3>
            <p style={{ margin: "0 0 16px 0", color: "#64748B", fontSize: "13px" }}>
              Write these 12 words down in private. Never share them with anyone:
            </p>

            <div
              style={{
                backgroundColor: "#FEF9EE",
                border: "1px solid #D4AF37",
                borderRadius: "8px",
                padding: "16px",
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "10px",
                marginBottom: "20px"
              }}
            >
              {selectedIdentity.recovery_phrase.split(" ").map((w, i) => (
                <div key={i} style={{ fontSize: "12px", color: "#B8860B", fontWeight: "bold" }}>
                  <span style={{ color: "#64748B", fontWeight: "normal", marginRight: "4px" }}>{i + 1}.</span>
                  {w}
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowSeedModal(false)}
              style={{
                width: "100%",
                padding: "10px",
                background: "linear-gradient(135deg, #FF6B00 0%, #FF8800 100%)",
                border: "1px solid #EA580C",
                borderRadius: "5px",
                color: "#FFFFFF",
                fontWeight: "bold",
                cursor: "pointer"
              }}
            >
              I Have Stored My Seed Safely
            </button>
          </div>
        </div>
      )}

      {/* New Identity / Onboarding Modal */}
      {showOnboardingModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000
          }}
          onClick={() => setShowOnboardingModal(false)}
        >
          <div
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #D4AF37",
              borderRadius: "12px",
              padding: "28px",
              width: "440px",
              boxShadow: "0 12px 36px rgba(0,0,0,0.15)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 8px 0", color: "#0F172A", fontSize: "18px", fontWeight: "bold" }}>
              + Create New Wallet Identity
            </h3>
            <p style={{ margin: "0 0 16px 0", color: "#64748B", fontSize: "13px" }}>
              Derive a new sovereign Bech32 identity backed by Monocypher Ed25519:
            </p>

            <form onSubmit={handleCreateIdentity}>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", color: "#334155", fontSize: "12px", fontWeight: "600", marginBottom: "6px" }}>
                  Account Alias / Name
                </label>
                <input
                  type="text"
                  value={newAlias}
                  onChange={(e) => setNewAlias(e.target.value)}
                  placeholder="e.g. Carol_Developer"
                  autoFocus
                  style={{
                    width: "100%",
                    padding: "10px",
                    backgroundColor: "#F8FAFC",
                    border: "1px solid #CBD5E1",
                    borderRadius: "4px",
                    fontSize: "13px",
                    boxSizing: "border-box"
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: "10px",
                    background: "linear-gradient(135deg, #FF6B00 0%, #FF8800 100%)",
                    border: "1px solid #EA580C",
                    borderRadius: "5px",
                    color: "#FFFFFF",
                    fontWeight: "bold",
                    cursor: "pointer"
                  }}
                >
                  Create Identity
                </button>
                <button
                  type="button"
                  onClick={() => setShowOnboardingModal(false)}
                  style={{
                    padding: "10px 18px",
                    backgroundColor: "#FFFFFF",
                    border: "1px solid #CBD5E1",
                    borderRadius: "5px",
                    color: "#0F172A",
                    cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Community Modal */}
      {showNewCommunityModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000
          }}
          onClick={() => setShowNewCommunityModal(false)}
        >
          <div
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #D4AF37",
              borderRadius: "12px",
              padding: "28px",
              width: "460px",
              boxShadow: "0 12px 36px rgba(0,0,0,0.15)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 8px 0", color: "#0F172A", fontSize: "18px", fontWeight: "bold" }}>
              + Create Digital Community
            </h3>
            <form onSubmit={handleCreateCommunity}>
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", color: "#334155", fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>
                  Community Name
                </label>
                <input
                  type="text"
                  value={newCommunityNameInput}
                  onChange={(e) => setNewCommunityNameInput(e.target.value)}
                  placeholder="e.g. BlockBum Security Research"
                  autoFocus
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    backgroundColor: "#F8FAFC",
                    border: "1px solid #CBD5E1",
                    borderRadius: "4px",
                    fontSize: "13px",
                    boxSizing: "border-box"
                  }}
                />
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", color: "#334155", fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>
                  Description
                </label>
                <textarea
                  value={newCommunityDescInput}
                  onChange={(e) => setNewCommunityDescInput(e.target.value)}
                  placeholder="Purpose and focus of this association..."
                  rows={3}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    backgroundColor: "#F8FAFC",
                    border: "1px solid #CBD5E1",
                    borderRadius: "4px",
                    fontSize: "13px",
                    boxSizing: "border-box"
                  }}
                />
              </div>

              <div style={{ marginBottom: "18px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#334155" }}>
                  <input
                    type="checkbox"
                    checked={newCommunityPrivateInput}
                    onChange={(e) => setNewCommunityPrivateInput(e.target.checked)}
                  />
                  Private Membership (Invite-Only)
                </label>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: "10px",
                    background: "linear-gradient(135deg, #FF6B00 0%, #FF8800 100%)",
                    border: "1px solid #EA580C",
                    borderRadius: "5px",
                    color: "#FFFFFF",
                    fontWeight: "bold",
                    cursor: "pointer"
                  }}
                >
                  Create Association
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewCommunityModal(false)}
                  style={{
                    padding: "10px 18px",
                    backgroundColor: "#FFFFFF",
                    border: "1px solid #CBD5E1",
                    borderRadius: "5px",
                    color: "#0F172A",
                    cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pair New Device Modal */}
      {showPairModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000
          }}
          onClick={() => setShowPairModal(false)}
        >
          <div
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #D4AF37",
              borderRadius: "12px",
              padding: "28px",
              width: "440px",
              textAlign: "center",
              boxShadow: "0 12px 36px rgba(0,0,0,0.15)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 6px 0", color: "#0F172A", fontSize: "18px", fontWeight: "bold" }}>
              📱 Link Secondary Device
            </h3>
            <p style={{ margin: "0 0 16px 0", color: "#64748B", fontSize: "13px" }}>
              Scan this pairing code with your BlockBum mobile or laptop client:
            </p>

            <div
              style={{
                width: "140px",
                height: "140px",
                backgroundColor: "#F8FAFC",
                border: "1px solid #CBD5E1",
                margin: "0 auto 16px auto",
                borderRadius: "8px",
                padding: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <img src={bbCoinImg} alt="QR Code" style={{ width: "80px", height: "80px" }} />
            </div>

            <div
              style={{
                backgroundColor: "#FEF9EE",
                border: "1px solid #D4AF37",
                borderRadius: "6px",
                padding: "10px",
                fontSize: "14px",
                fontWeight: "bold",
                color: "#B8860B",
                letterSpacing: "2px",
                marginBottom: "16px"
              }}
            >
              BB-9842-7104
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => handlePairDevice("Mobile Device (Android)")}
                style={{
                  flex: 1,
                  padding: "10px",
                  background: "linear-gradient(135deg, #FF6B00 0%, #FF8800 100%)",
                  border: "1px solid #EA580C",
                  borderRadius: "5px",
                  color: "#FFFFFF",
                  fontWeight: "bold",
                  cursor: "pointer"
                }}
              >
                Confirm Pairing
              </button>
              <button
                onClick={() => setShowPairModal(false)}
                style={{
                  padding: "10px 18px",
                  backgroundColor: "#FFFFFF",
                  border: "1px solid #CBD5E1",
                  borderRadius: "5px",
                  color: "#0F172A",
                  cursor: "pointer"
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Execution Mode Modal */}
      {showModeModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000
          }}
          onClick={() => setShowModeModal(false)}
        >
          <div
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #D4AF37",
              borderRadius: "12px",
              padding: "28px",
              width: "480px",
              boxShadow: "0 12px 36px rgba(0,0,0,0.15)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 10px 0", color: "#0F172A", fontSize: "18px", fontWeight: "bold" }}>
              Switch Client Execution Mode
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
              <button
                onClick={() => {
                  setClientMode("full_node");
                  setShowModeModal(false);
                }}
                style={{
                  padding: "14px",
                  backgroundColor: clientMode === "full_node" ? "#FEF9EE" : "#F8FAFC",
                  border: clientMode === "full_node" ? "1px solid #D4AF37" : "1px solid #CBD5E1",
                  borderRadius: "6px",
                  textAlign: "left",
                  cursor: "pointer"
                }}
              >
                <div style={{ fontWeight: "bold", color: "#B8860B", fontSize: "14px" }}>
                  ● Full Node (Independent Validation) {clientMode === "full_node" && "✓ Active"}
                </div>
                <div style={{ color: "#64748B", fontSize: "12px", marginTop: "4px" }}>
                  Validates all consensus rules, PoW difficulty, and transactions locally. Highest security.
                </div>
              </button>

              <button
                onClick={() => {
                  setClientMode("light_client");
                  setShowModeModal(false);
                }}
                style={{
                  padding: "14px",
                  backgroundColor: clientMode === "light_client" ? "#FEF9EE" : "#F8FAFC",
                  border: clientMode === "light_client" ? "1px solid #D4AF37" : "1px solid #CBD5E1",
                  borderRadius: "6px",
                  textAlign: "left",
                  cursor: "pointer"
                }}
              >
                <div style={{ fontWeight: "bold", color: "#0284C7", fontSize: "14px" }}>
                  ● SPV Light Client (Header & Merkle Proofs) {clientMode === "light_client" && "✓ Active"}
                </div>
                <div style={{ color: "#64748B", fontSize: "12px", marginTop: "4px" }}>
                  Only stores 92-byte block headers. Verifies transactions via Merkle audit proofs over RPC.
                </div>
              </button>
            </div>

            <button
              onClick={() => setShowModeModal(false)}
              style={{
                width: "100%",
                padding: "10px",
                backgroundColor: "#F1F5F9",
                border: "1px solid #CBD5E1",
                borderRadius: "5px",
                color: "#0F172A",
                cursor: "pointer"
              }}
            >
              Done
            </button>
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
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000
          }}
          onClick={() => setShowCryptoAuditModal(false)}
        >
          <div
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #D4AF37",
              borderRadius: "12px",
              padding: "28px",
              width: "520px",
              boxShadow: "0 12px 36px rgba(0,0,0,0.15)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 10px 0", color: "#0F172A", fontSize: "18px", fontWeight: "bold" }}>
              🛡 Ubuntu Cryptographic Engine Specification
            </h3>
            <p style={{ color: "#64748B", fontSize: "13px", lineHeight: "1.5", margin: "0 0 16px 0" }}>
              BlockBum utilizes Monocypher, an independently audited, constant-time cryptographic library. No unreviewed or proprietary key agreement algorithms are permitted.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px" }}>
              <div style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0", padding: "10px", borderRadius: "6px" }}>
                <strong style={{ color: "#EA580C" }}>Ed25519 Signatures:</strong> Deterministic 64-byte signatures over SHA-512 curve points.
              </div>
              <div style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0", padding: "10px", borderRadius: "6px" }}>
                <strong style={{ color: "#EA580C" }}>X25519 Key Agreement:</strong> Constant-time ECDH for forward secret sessions and multi-device channels.
              </div>
              <div style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0", padding: "10px", borderRadius: "6px" }}>
                <strong style={{ color: "#EA580C" }}>ChaCha20-Poly1305 AEAD:</strong> 256-bit stream cipher with 128-bit authentication tag for on-disk and over-the-wire privacy.
              </div>
              <div style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0", padding: "10px", borderRadius: "6px" }}>
                <strong style={{ color: "#EA580C" }}>SHA-256 Merkle Roots:</strong> Authenticated state trees ensuring tamper-evident block headers.
              </div>
            </div>

            <button
              onClick={() => setShowCryptoAuditModal(false)}
              style={{
                width: "100%",
                marginTop: "20px",
                padding: "10px",
                background: "linear-gradient(135deg, #FF6B00 0%, #FF8800 100%)",
                border: "1px solid #EA580C",
                borderRadius: "5px",
                color: "#FFFFFF",
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
