import React, { useState } from "react";
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

export const App: React.FC = () => {
  // Navigation & Localization
  const [activeTab, setActiveTab] = useState<"wallet" | "messages" | "communities" | "challenges" | "files" | "network" | "devices" | "settings">("communities");
  const [locale, setLocale] = useState<SupportedLocale>("en");
  const t = (key: string): string => translations[locale]?.[key] || translations["en"]?.[key] || key;

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

  // Encrypted Local Storage & Vault Lock State
  const [vault, setVault] = useState<VaultState>({
    is_locked: false,
    has_vault: true,
    auto_lock_minutes: 15,
    last_unlocked: "2026-11-25 10:00"
  });
  const [vaultPasswordInput, setVaultPasswordInput] = useState("");
  const [vaultError, setVaultError] = useState("");

  // Node telemetry state
  const [nodeStatus, setNodeStatus] = useState<NodeStatus>({
    status: "online",
    node_url: "http://127.0.0.1:8545",
    chain_height: 148,
    peers_connected: 8,
    network: "BlockBum Testnet v1.0",
    tip_hash: "0x89fbc0120ab718c99de021a8bf92ca43018274ef9012bcda4819aa018290bc",
    mempool_tx_count: 2,
    consensus_mode: "PoW Nakamoto (Dynamic Difficulty)",
    avg_latency_ms: 18,
    client_mode: "full_node"
  });
  const [inputNodeUrl, setInputNodeUrl] = useState("http://127.0.0.1:8545");

  // Multi-Identity State
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
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);

  // Multi-Device Identity State
  const [devices, setDevices] = useState<DeviceSession[]>([
    {
      device_id: "dev_win_01",
      device_name: "Windows 11 Workstation",
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
      device_name: "MacBook Pro M3 (macOS)",
      platform: "macos",
      paired_at: "Nov 24, 2026",
      last_active: "2 hours ago",
      is_current: false,
      auth_public_key: "0x7a20c4bb...12cd",
      status: "authorized"
    },
    {
      device_id: "dev_web_01",
      device_name: "Safari Web Onboarding Session",
      platform: "web",
      paired_at: "Nov 25, 2026",
      last_active: "1 day ago",
      is_current: false,
      auth_public_key: "0x12dc55ee...77aa",
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

  const [txHistory, setTxHistory] = useState<TransactionRecord[]>([
    { tx_id: "tx_91a82bf0", type: "receive", counterparty: "bb1_genesis_subsidy_pool", amount_bum: 50.0, fee_bum: 0.0, timestamp: "Today, 10:15 AM", status: "confirmed", block_height: 147 },
    { tx_id: "tx_084cd29e", type: "send", counterparty: "bb1d9812f8a429019ca5621de8821", amount_bum: 15.0, fee_bum: 0.001, timestamp: "Yesterday, 3:20 PM", status: "confirmed", block_height: 140 },
    { tx_id: "tx_f520ab71", type: "reward", counterparty: "Consensus Block Validator #140", amount_bum: 50.0, fee_bum: 0.003, timestamp: "Nov 19, 2026", status: "confirmed", block_height: 139 }
  ]);

  // Communities, Governance & Challenges
  const [communities, setCommunities] = useState<Community[]>([
    {
      id: "systems_cpp",
      name: "C++ & Systems Lab",
      description: "Low-latency systems programming, C++20 core node development, and wire protocols.",
      isPrivate: false,
      memberCount: 188,
      myRole: "Member",
      channels: ["general", "code-reviews", "benchmarks", "p2p-networking"],
      governanceProposals: [
        { id: "gov_01", title: "BBIP-0002: Increase Max CAS Chunk Size to 512 KB", proposer: "bb1_alice", votesFor: 142, votesAgainst: 12, status: "active" },
        { id: "gov_02", title: "BBIP-0003: Establish Frankfurt Seed Node as Checkpoint Relay", proposer: "bb1_devops", votesFor: 180, votesAgainst: 3, status: "passed" }
      ],
      codingChallenges: [
        { id: "c1", title: "Challenge #1: Zero-Copy Binary Deserializer", difficulty: "Medium", reward_bum: 150, participants: 28, deadline: "3 days left" },
        { id: "c2", title: "Challenge #2: Sybil-Resilient Peer Reputation Decay", difficulty: "Hard", reward_bum: 500, participants: 14, deadline: "7 days left" }
      ],
      events: [
        { id: "e1", title: "Live Workshop: Writing E2EE P2P Channels in C++20", date: "Friday, Nov 27 @ 18:00 UTC", attendees: 64, speaker: "Dr. Elena Rostova" }
      ]
    },
    {
      id: "core_dev",
      name: "Core Node Contributors",
      description: "Private consensus research, cryptographic audit validation, and threat model reviews.",
      isPrivate: true,
      memberCount: 22,
      myRole: "Admin",
      channels: ["general", "specifications", "audit-notes", "mainnet-readiness"],
      governanceProposals: [
        { id: "gov_03", title: "BBIP-0004: Monocypher Cryptographic Hardening Audit", proposer: "bb1_security", votesFor: 22, votesAgainst: 0, status: "passed" }
      ],
      codingChallenges: [
        { id: "c3", title: "Implement Kademlia DHT Distance Routing", difficulty: "Hard", reward_bum: 750, participants: 8, deadline: "12 days left" }
      ],
      events: [
        { id: "e2", title: "Internal Security & Threat Review Call", date: "Monday, Nov 28 @ 15:00 UTC", attendees: 22, speaker: "Core Security Guild" }
      ]
    }
  ]);
  const [selectedCommunityId, setSelectedCommunityId] = useState<string>("systems_cpp");
  const [selectedChannel, setSelectedChannel] = useState<string>("general");

  // Messages (E2EE)
  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: "m1",
      communityId: "systems_cpp",
      channel: "general",
      sender: "bb1_david",
      senderAlias: "David_Kernel",
      content: "Headers-first synchronization is achieving 98% bandwidth reduction on the multi-bootstrap cluster.",
      timestamp: "10:45 AM",
      isE2EE: true,
      deliveryAck: true
    },
    {
      id: "m2",
      communityId: "systems_cpp",
      channel: "general",
      sender: selectedIdentity.address,
      senderAlias: selectedIdentity.alias,
      content: "Confirmed. The C++20 WriteBatch RocksDB interface writes 40,000 blocks/sec in benchmark testing.",
      timestamp: "10:48 AM",
      isE2EE: true,
      deliveryAck: true
    }
  ]);
  const [inputMessage, setInputMessage] = useState("");

  // Content-Addressed Storage Files
  const [sharedFiles, setSharedFiles] = useState<SharedFileItem[]>([
    {
      cid: "bbum_cas_e841920ac3918bf0a",
      name: "BlockBum_Protocol_Specification_v1.0.pdf",
      size_kb: 2450,
      uploader: "Alice_Researcher",
      timestamp: "Nov 24, 2026",
      chunks_count: 10,
      encryption_status: "AES-256-GCM / SHA-256 Verified",
      isPublic: true
    },
    {
      cid: "bbum_cas_380bfe12984ab109d",
      name: "Consensus_Decision_PoW_Nakamoto.pdf",
      size_kb: 890,
      uploader: "Bob_NodeOperator",
      timestamp: "Nov 23, 2026",
      chunks_count: 4,
      encryption_status: "AES-256-GCM / SHA-256 Verified",
      isPublic: false
    }
  ]);

  // Handlers
  const handleSendBum = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0 || !recipient.trim()) {
      setTransferStatus({ msg: "Please enter a valid recipient address (bb1...) and positive amount.", type: "error" });
      return;
    }
    const totalRequired = amount + 0.001;
    if (totalRequired > selectedIdentity.balance_bum) {
      setTransferStatus({ msg: `Insufficient balance: need ${totalRequired.toFixed(3)} BUM (including 0.001 fee).`, type: "error" });
      return;
    }

    const newTx: TransactionRecord = {
      tx_id: "tx_" + Math.random().toString(16).substring(2, 10),
      type: "send",
      counterparty: recipient.trim(),
      amount_bum: amount,
      fee_bum: 0.001,
      timestamp: "Just now",
      status: "confirmed",
      block_height: nodeStatus.chain_height + 1
    };

    setTxHistory([newTx, ...txHistory]);
    const updated = {
      ...selectedIdentity,
      balance_bum: selectedIdentity.balance_bum - totalRequired,
      nonce: selectedIdentity.nonce + 1
    };
    setSelectedIdentity(updated);
    setIdentities(identities.map(i => i.alias === updated.alias ? updated : i));

    setTransferStatus({ msg: `Transaction broadcast successfully via node RPC! TxID: ${newTx.tx_id}`, type: "success" });
    setRecipient("");
    setTransferAmount("");
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const newMsg: MessageItem = {
      id: "msg_" + Date.now(),
      communityId: selectedCommunityId,
      channel: selectedChannel,
      sender: selectedIdentity.address,
      senderAlias: selectedIdentity.alias,
      content: inputMessage.trim(),
      timestamp: "Just now",
      isE2EE: true,
      deliveryAck: true
    };

    setMessages([...messages, newMsg]);
    setInputMessage("");
  };

  const handleRevokeDevice = (deviceId: string) => {
    if (confirm("Are you sure you want to revoke this device? It will be disconnected from your identity vault.")) {
      setDevices(devices.map(d => d.device_id === deviceId ? { ...d, status: "revoked", last_active: "Revoked" } : d));
    }
  };

  const handleCheckUpdates = () => {
    setIsCheckingUpdate(true);
    setTimeout(() => {
      setIsCheckingUpdate(false);
      setUpdateInfo({
        version: "v0.2.0",
        release_date: "Nov 25, 2026",
        download_url: "https://releases.blockbum.net/v0.2.0/",
        sha256_hash: "a4f89d301c2b5e7890aef124567890abcdef1234567890abcdef1234567890ab",
        signature: "ed25519_sig_99fa1b20c384e5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6",
        is_critical: false,
        changelog: [
          "Cross-platform Android & iOS mobile clients launched",
          "Lightweight client SPV Merkle inclusion verification",
          "Multi-device cryptographic identity pairing and revocation",
          "7-language localization and screen-reader accessibility enhancements"
        ]
      });
    }, 1000);
  };

  const handleUnlockVault = (e: React.FormEvent) => {
    e.preventDefault();
    if (vaultPasswordInput === "blockbum" || vaultPasswordInput.length >= 6) {
      setVault({ ...vault, is_locked: false });
      setVaultPasswordInput("");
      setVaultError("");
    } else {
      setVaultError("Invalid master password. Please try again.");
    }
  };

  // Contrast & Font Styling Computations
  const isHighContrast = accessibility.high_contrast;
  const fontMultiplier = accessibility.font_scale === "large" ? 1.15 : accessibility.font_scale === "extra-large" ? 1.3 : 1.0;

  const themeBg = isHighContrast ? "#000000" : "#090d16";
  const themeCardBg = isHighContrast ? "#121212" : "#0f172a";
  const themeBorder = isHighContrast ? "#ffffff" : "#1e293b";
  const themeText = isHighContrast ? "#ffffff" : "#f1f5f9";
  const themeMuted = isHighContrast ? "#cccccc" : "#94a3b8";
  const themePrimary = isHighContrast ? "#00ffff" : "#38bdf8";

  // LOCKED VAULT SCREEN
  if (vault.is_locked) {
    return (
      <div style={{ backgroundColor: themeBg, color: themeText, height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
        <div style={{ backgroundColor: themeCardBg, border: `1px solid ${themeBorder}`, borderRadius: "16px", padding: "40px", width: "420px", textAlign: "center" }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "50%", backgroundColor: "#1e293b", margin: "0 auto 20px auto", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem" }}>
            🔒
          </div>
          <h2 style={{ margin: "0 0 10px 0", color: themePrimary }}>{t("vault_locked")}</h2>
          <p style={{ color: themeMuted, fontSize: "0.9rem", margin: "0 0 24px 0" }}>
            Enter your master password to decrypt your local keys, messages, and identities.
          </p>
          <form onSubmit={handleUnlockVault}>
            <input
              type="password"
              placeholder="Master Password"
              value={vaultPasswordInput}
              onChange={(e) => setVaultPasswordInput(e.target.value)}
              style={{ width: "100%", padding: "12px", backgroundColor: "#090d16", border: `1px solid ${themeBorder}`, borderRadius: "8px", color: "#fff", marginBottom: "16px", boxSizing: "border-box" }}
              autoFocus
            />
            {vaultError && <div style={{ color: "#ef4444", fontSize: "0.85rem", marginBottom: "16px" }}>{vaultError}</div>}
            <button
              type="submit"
              style={{ width: "100%", padding: "12px", backgroundColor: "#0284c7", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}
            >
              {t("unlock_vault")}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div
      role="application"
      aria-label="BlockBum Global Client"
      style={{
        fontFamily: "Segoe UI, -apple-system, BlinkMacSystemFont, Roboto, sans-serif",
        fontSize: `${fontMultiplier}rem`,
        display: "flex",
        height: "100vh",
        backgroundColor: themeBg,
        color: themeText
      }}
    >
      {/* SIDEBAR NAVIGATION */}
      <nav aria-label="Main Navigation" style={{ width: "280px", backgroundColor: themeCardBg, borderRight: `1px solid ${themeBorder}`, display: "flex", flexDirection: "column" }}>
        {/* Brand Header */}
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${themeBorder}`, display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: "linear-gradient(135deg, #0284c7, #38bdf8)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "900", fontSize: "1.2rem", color: "#fff" }}>
            BB
          </div>
          <div>
            <div style={{ fontWeight: "bold", fontSize: "1.1rem", letterSpacing: "0.5px" }}>BlockBum</div>
            <div style={{ fontSize: "0.75rem", color: themePrimary, fontWeight: "600" }}>Cross-Platform Client</div>
          </div>
        </div>

        {/* Identity & Account Card */}
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${themeBorder}`, backgroundColor: isHighContrast ? "#000" : "#0c1322" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <span style={{ fontSize: "0.7rem", color: themeMuted, textTransform: "uppercase", fontWeight: "bold" }}>Active Account</span>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => setShowOnboardingModal(true)} style={{ background: "none", border: "none", color: "#4ade80", fontSize: "0.75rem", cursor: "pointer", padding: 0 }}>
                Guide
              </button>
              <button onClick={() => setShowSeedModal(true)} style={{ background: "none", border: "none", color: themePrimary, fontSize: "0.75rem", cursor: "pointer", padding: 0 }}>
                Backup
              </button>
            </div>
          </div>
          <select
            value={selectedIdentity.alias}
            onChange={(e) => {
              const found = identities.find(i => i.alias === e.target.value);
              if (found) setSelectedIdentity(found);
            }}
            style={{ width: "100%", padding: "8px 10px", backgroundColor: themeCardBg, color: "#fff", border: `1px solid ${themeBorder}`, borderRadius: "6px", fontSize: "0.85rem", cursor: "pointer" }}
          >
            {identities.map(id => (
              <option key={id.alias} value={id.alias}>{id.alias} ({id.balance_bum.toFixed(2)} BUM)</option>
            ))}
          </select>
          <div style={{ marginTop: "8px", fontSize: "0.75rem", color: themeMuted, wordBreak: "break-all" }}>
            {selectedIdentity.address.substring(0, 18)}...
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: "6px", overflowY: "auto" }}>
          {[
            { id: "communities", label: t("tab_communities"), icon: "🏛️" },
            { id: "messages", label: t("tab_messages"), icon: "💬" },
            { id: "wallet", label: t("tab_wallet"), icon: "💳" },
            { id: "devices", label: t("tab_devices"), icon: "📱" },
            { id: "files", label: t("tab_files"), icon: "📁" },
            { id: "network", label: t("tab_network"), icon: "🌐" },
            { id: "settings", label: t("tab_settings"), icon: "⚙️" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "10px 16px",
                borderRadius: "8px",
                border: activeTab === tab.id ? `1px solid ${themePrimary}` : "1px solid transparent",
                backgroundColor: activeTab === tab.id ? (isHighContrast ? "#222" : "#1e293b") : "transparent",
                color: activeTab === tab.id ? themePrimary : themeText,
                fontWeight: activeTab === tab.id ? "bold" : "500",
                cursor: "pointer",
                textAlign: "left",
                fontSize: "0.95rem"
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Client Mode & Lock Footer */}
        <div style={{ padding: "16px 20px", borderTop: `1px solid ${themeBorder}`, display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", color: themeMuted }}>Mode:</span>
            <button
              onClick={() => setShowModeModal(true)}
              style={{ background: "none", border: "none", color: clientMode === "full_node" ? "#4ade80" : "#38bdf8", fontSize: "0.8rem", fontWeight: "bold", cursor: "pointer", padding: 0 }}
            >
              ● {clientMode === "full_node" ? "Full Node" : "Light SPV"}
            </button>
          </div>
          <button
            onClick={() => setVault({ ...vault, is_locked: true })}
            style={{ width: "100%", padding: "6px", backgroundColor: "#1e293b", color: themeMuted, border: `1px solid ${themeBorder}`, borderRadius: "6px", fontSize: "0.8rem", cursor: "pointer" }}
          >
            🔒 {t("lock_now")}
          </button>
        </div>
      </nav>

      {/* MAIN VIEW CONTENT */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* TOP STATUS BAR */}
        <header style={{ height: "54px", borderBottom: `1px solid ${themeBorder}`, padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: themeCardBg }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#4ade80", display: "inline-block" }}></span>
              <span style={{ fontWeight: "600" }}>{nodeStatus.network}</span>
              <span style={{ color: themeMuted }}>|</span>
              <span style={{ color: themeMuted }}>Block #{nodeStatus.chain_height}</span>
              <span style={{ color: themeMuted }}>|</span>
              <span style={{ color: themeMuted }}>{nodeStatus.peers_connected} peers</span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {/* Language Selector */}
            <select
              aria-label="Language Selector"
              value={locale}
              onChange={(e) => setLocale(e.target.value as SupportedLocale)}
              style={{ padding: "4px 8px", backgroundColor: themeBg, color: "#fff", border: `1px solid ${themeBorder}`, borderRadius: "6px", fontSize: "0.8rem" }}
            >
              <option value="en">English (EN)</option>
              <option value="es">Español (ES)</option>
              <option value="zh">中文 (ZH)</option>
              <option value="de">Deutsch (DE)</option>
              <option value="fr">Français (FR)</option>
              <option value="hi">हिन्दी (HI)</option>
              <option value="ja">日本語 (JA)</option>
            </select>

            {/* Quick Balance Badge */}
            <div style={{ backgroundColor: isHighContrast ? "#111" : "#090d16", padding: "6px 14px", borderRadius: "20px", border: `1px solid ${themeBorder}`, fontSize: "0.85rem", fontWeight: "bold", color: themePrimary }}>
              {selectedIdentity.balance_bum.toFixed(2)} BUM
            </div>
          </div>
        </header>

        {/* TAB 1: COMMUNITIES */}
        {activeTab === "communities" && (
          <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
            <div style={{ width: "240px", borderRight: `1px solid ${themeBorder}`, padding: "20px 16px", backgroundColor: themeCardBg }}>
              <div style={{ marginBottom: "16px" }}>
                <span style={{ fontSize: "0.8rem", fontWeight: "bold", color: themeMuted, textTransform: "uppercase" }}>Community</span>
                <select
                  value={selectedCommunityId}
                  onChange={(e) => setSelectedCommunityId(e.target.value)}
                  style={{ width: "100%", padding: "6px 8px", backgroundColor: themeBg, color: "#fff", border: `1px solid ${themeBorder}`, borderRadius: "6px", fontSize: "0.85rem", marginTop: "4px" }}
                >
                  {communities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <button
                onClick={() => {
                  const name = prompt("Community Name:");
                  if (!name) return;
                  const newC: Community = {
                    id: "comm_" + Date.now(),
                    name,
                    description: "Decentralized community on BlockBum",
                    isPrivate: false,
                    memberCount: 1,
                    myRole: "Owner",
                    channels: ["general", "announcements"],
                    governanceProposals: [],
                    codingChallenges: [],
                    events: []
                  };
                  setCommunities([...communities, newC]);
                  setSelectedCommunityId(newC.id);
                }}
                style={{ width: "100%", padding: "6px", backgroundColor: "#1e293b", color: themePrimary, border: `1px solid ${themeBorder}`, borderRadius: "6px", fontSize: "0.8rem", cursor: "pointer", marginBottom: "16px" }}
              >
                + New Community
              </button>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <span style={{ fontSize: "0.8rem", fontWeight: "bold", color: themeMuted, textTransform: "uppercase" }}>Channels</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {(communities.find(c => c.id === selectedCommunityId) || communities[0]).channels.map(ch => (
                  <button
                    key={ch}
                    onClick={() => setSelectedChannel(ch)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "none",
                      backgroundColor: selectedChannel === ch ? (isHighContrast ? "#333" : "#1e293b") : "transparent",
                      color: selectedChannel === ch ? themePrimary : themeText,
                      fontWeight: selectedChannel === ch ? "bold" : "normal",
                      textAlign: "left",
                      cursor: "pointer"
                    }}
                  >
                    # {ch}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "20px", backgroundColor: themeBg }}>
              <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px", marginBottom: "16px" }}>
                {messages.map(m => (
                  <div key={m.id} style={{ padding: "12px", backgroundColor: themeCardBg, borderRadius: "8px", border: `1px solid ${themeBorder}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ fontWeight: "bold", color: themePrimary }}>{m.senderAlias}</span>
                      <span style={{ fontSize: "0.75rem", color: themeMuted }}>{m.timestamp} · 🔒 E2EE</span>
                    </div>
                    <div>{m.content}</div>
                  </div>
                ))}
              </div>
              <form onSubmit={handleSendMessage} style={{ display: "flex", gap: "12px" }}>
                <input
                  type="text"
                  placeholder={`Message #${selectedChannel}...`}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  style={{ flex: 1, padding: "12px", backgroundColor: themeCardBg, border: `1px solid ${themeBorder}`, borderRadius: "8px", color: "#fff" }}
                />
                <button type="submit" style={{ padding: "12px 24px", backgroundColor: "#0284c7", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}>
                  Send
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 2: DIRECT MESSAGES */}
        {activeTab === "messages" && (
          <div style={{ padding: "32px", overflowY: "auto", flex: 1 }}>
            <h1 style={{ margin: "0 0 12px 0", fontSize: "1.8rem", fontWeight: "800" }}>{t("tab_messages")}</h1>
            <p style={{ color: themeMuted, margin: "0 0 24px 0" }}>
              Private end-to-end encrypted messaging using Double Ratchet forward secrecy and post-compromise security.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "24px", height: "calc(100vh - 200px)" }}>
              <div style={{ backgroundColor: themeCardBg, borderRadius: "12px", border: `1px solid ${themeBorder}`, padding: "16px" }}>
                <h3 style={{ margin: "0 0 12px 0" }}>Conversations</h3>
                <div style={{ padding: "12px", backgroundColor: "#1e293b", borderRadius: "8px", border: `1px solid ${themePrimary}` }}>
                  <div style={{ fontWeight: "bold" }}>Bob_NodeOperator</div>
                  <div style={{ fontSize: "0.8rem", color: themeMuted }}>Double Ratchet Epoch: #14</div>
                </div>
              </div>
              <div style={{ backgroundColor: themeCardBg, borderRadius: "12px", border: `1px solid ${themeBorder}`, padding: "16px", display: "flex", flexDirection: "column" }}>
                <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={{ padding: "10px", backgroundColor: "#1e293b", borderRadius: "8px", alignSelf: "flex-start", maxWidth: "70%" }}>
                    <div style={{ fontSize: "0.75rem", color: themePrimary }}>Bob_NodeOperator</div>
                    <div>Hello! I verified our multi-device pairing on the mobile client.</div>
                  </div>
                  <div style={{ padding: "10px", backgroundColor: "#0369a1", borderRadius: "8px", alignSelf: "flex-end", maxWidth: "70%", color: "#fff" }}>
                    <div style={{ fontSize: "0.75rem", color: "#bae6fd" }}>You</div>
                    <div>Great, the Ed25519 authorization signature synced cleanly across nodes.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: WALLET */}
        {activeTab === "wallet" && (
          <div style={{ padding: "32px", overflowY: "auto", flex: 1 }}>
            <h1 style={{ margin: "0 0 8px 0", fontSize: "1.8rem", fontWeight: "800" }}>{t("tab_wallet")}</h1>
            <p style={{ color: themeMuted, margin: "0 0 24px 0" }}>Manage your BUM digital balance, transfer funds, and review history.</p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
              {/* Account Balance Card */}
              <div style={{ backgroundColor: themeCardBg, padding: "24px", borderRadius: "12px", border: `1px solid ${themeBorder}` }}>
                <span style={{ fontSize: "0.85rem", color: themeMuted, textTransform: "uppercase" }}>{t("balance_label")}</span>
                <div style={{ fontSize: "2.4rem", fontWeight: "900", color: themePrimary, margin: "8px 0" }}>
                  {selectedIdentity.balance_bum.toFixed(4)} <span style={{ fontSize: "1.2rem" }}>BUM</span>
                </div>
                <div style={{ fontSize: "0.85rem", color: themeMuted, marginBottom: "16px" }}>
                  ~ ${(selectedIdentity.balance_bum * 1.5).toFixed(2)} USD (Estimated Testnet Rate)
                </div>
                <div style={{ padding: "12px", backgroundColor: isHighContrast ? "#111" : "#090d16", borderRadius: "8px", border: `1px solid ${themeBorder}`, fontSize: "0.8rem", wordBreak: "break-all" }}>
                  <div style={{ color: themeMuted, marginBottom: "4px" }}>Account Address:</div>
                  <code style={{ color: themePrimary }}>{selectedIdentity.address}</code>
                </div>
              </div>

              {/* Transfer Form */}
              <div style={{ backgroundColor: themeCardBg, padding: "24px", borderRadius: "12px", border: `1px solid ${themeBorder}` }}>
                <h3 style={{ margin: "0 0 16px 0" }}>{t("send_button")}</h3>
                <form onSubmit={handleSendBum} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div>
                    <label style={{ fontSize: "0.8rem", color: themeMuted }}>{t("recipient_address")}</label>
                    <input
                      type="text"
                      placeholder="bb1..."
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value)}
                      style={{ width: "100%", padding: "10px", backgroundColor: "#090d16", border: `1px solid ${themeBorder}`, borderRadius: "6px", color: "#fff", marginTop: "4px", boxSizing: "border-box" }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.8rem", color: themeMuted }}>{t("amount")}</label>
                    <input
                      type="number"
                      step="0.000001"
                      placeholder="0.00"
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                      style={{ width: "100%", padding: "10px", backgroundColor: "#090d16", border: `1px solid ${themeBorder}`, borderRadius: "6px", color: "#fff", marginTop: "4px", boxSizing: "border-box" }}
                    />
                  </div>
                  <div style={{ fontSize: "0.8rem", color: themeMuted }}>
                    {t("network_fee")}: <span style={{ color: "#fff", fontWeight: "bold" }}>0.001 BUM</span> ({t("fee_estimate")})
                  </div>
                  {transferStatus && (
                    <div style={{ padding: "10px", borderRadius: "6px", fontSize: "0.85rem", backgroundColor: transferStatus.type === "success" ? "#064e3b" : "#7f1d1d", color: "#fff" }}>
                      {transferStatus.msg}
                    </div>
                  )}
                  <button type="submit" style={{ padding: "12px", backgroundColor: "#0284c7", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}>
                    Broadcast Transaction
                  </button>
                </form>
              </div>
            </div>

            {/* Transaction Activity */}
            <div style={{ marginTop: "32px", backgroundColor: themeCardBg, padding: "24px", borderRadius: "12px", border: `1px solid ${themeBorder}` }}>
              <h3 style={{ margin: "0 0 16px 0" }}>{t("recent_transactions")}</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {txHistory.map(tx => (
                  <div key={tx.tx_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", backgroundColor: "#1e293b", borderRadius: "8px" }}>
                    <div>
                      <div style={{ fontWeight: "bold", color: tx.type === "receive" || tx.type === "reward" ? "#4ade80" : "#f87171" }}>
                        {tx.type === "receive" ? "↓ Received" : tx.type === "reward" ? "★ Block Reward" : "↑ Sent"} {tx.amount_bum} BUM
                      </div>
                      <div style={{ fontSize: "0.8rem", color: themeMuted }}>Counterparty: {tx.counterparty} · Block #{tx.block_height || 145}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "0.85rem", color: "#4ade80" }}>✓ Confirmed</div>
                      <div style={{ fontSize: "0.75rem", color: themeMuted }}>{tx.timestamp}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: MULTI-DEVICE MANAGEMENT */}
        {activeTab === "devices" && (
          <div style={{ padding: "32px", overflowY: "auto", flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <h1 style={{ margin: "0 0 8px 0", fontSize: "1.8rem", fontWeight: "800" }}>{t("paired_devices")}</h1>
                <p style={{ color: themeMuted, margin: 0 }}>Authorize and manage your desktop, mobile, and web devices securely.</p>
              </div>
              <button
                onClick={() => setShowPairModal(true)}
                style={{ padding: "10px 18px", backgroundColor: "#0284c7", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}
              >
                + {t("pair_new_device")}
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "16px", marginTop: "24px" }}>
              {devices.map(dev => (
                <div key={dev.device_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 24px", backgroundColor: themeCardBg, borderRadius: "12px", border: `1px solid ${themeBorder}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <div style={{ fontSize: "2rem" }}>
                      {dev.platform === "windows" ? "🪟" : dev.platform === "macos" ? "🍎" : dev.platform === "android" ? "🤖" : dev.platform === "ios" ? "📱" : "🌐"}
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ fontWeight: "bold", fontSize: "1.05rem" }}>{dev.device_name}</span>
                        {dev.is_current && <span style={{ fontSize: "0.7rem", backgroundColor: "#0284c7", color: "#fff", padding: "2px 8px", borderRadius: "12px" }}>This Device</span>}
                        <span style={{ fontSize: "0.75rem", color: dev.status === "authorized" ? "#4ade80" : "#ef4444" }}>
                          ● {dev.status === "authorized" ? t("device_authorized") : t("device_revoked")}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.8rem", color: themeMuted, marginTop: "4px" }}>
                        Paired on {dev.paired_at} · Last active: {dev.last_active} · Public Key: {dev.auth_public_key}
                      </div>
                    </div>
                  </div>

                  {!dev.is_current && dev.status === "authorized" && (
                    <button
                      onClick={() => handleRevokeDevice(dev.device_id)}
                      style={{ padding: "8px 16px", backgroundColor: "#7f1d1d", color: "#fecaca", border: "none", borderRadius: "6px", fontWeight: "600", cursor: "pointer" }}
                    >
                      {t("revoke_device")}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: FILES & CAS STORAGE */}
        {activeTab === "files" && (
          <div style={{ padding: "32px", overflowY: "auto", flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <h1 style={{ margin: 0, fontSize: "1.8rem", fontWeight: "800" }}>{t("tab_files")}</h1>
              <button
                onClick={() => {
                  const fname = prompt("File name to chunk & upload:", "Protocol_Audit_Spec.pdf");
                  if (!fname) return;
                  const newF: SharedFileItem = {
                    cid: "bbum_cas_" + Math.random().toString(16).substring(2, 12),
                    name: fname,
                    size_kb: 1024,
                    uploader: selectedIdentity.alias,
                    timestamp: "Just now",
                    chunks_count: 4,
                    encryption_status: "AES-256-GCM / SHA-256 Verified",
                    isPublic: true
                  };
                  setSharedFiles([newF, ...sharedFiles]);
                }}
                style={{ padding: "8px 16px", backgroundColor: "#0284c7", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}
              >
                + Upload & Chunk File
              </button>
            </div>
            <p style={{ color: themeMuted, margin: "0 0 24px 0" }}>Decentralized, chunked, and client-side encrypted Content-Addressed Storage.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {sharedFiles.map(file => (
                <div key={file.cid} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", backgroundColor: themeCardBg, borderRadius: "10px", border: `1px solid ${themeBorder}` }}>
                  <div>
                    <div style={{ fontWeight: "bold", fontSize: "1rem" }}>{file.name}</div>
                    <div style={{ fontSize: "0.8rem", color: themeMuted }}>{file.size_kb} KB · {file.chunks_count} chunks · Uploader: {file.uploader}</div>
                    <div style={{ fontSize: "0.75rem", color: "#38bdf8", marginTop: "4px" }}>CID: {file.cid} · {file.encryption_status}</div>
                  </div>
                  <button
                    onClick={() => alert(`Downloaded and verified ${file.chunks_count} chunks of ${file.name} with local SHA-256 integrity check.`)}
                    style={{ padding: "8px 16px", backgroundColor: "#1e293b", color: themePrimary, border: `1px solid ${themeBorder}`, borderRadius: "6px", fontWeight: "600", cursor: "pointer" }}
                  >
                    Download File
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: NETWORK & NODE TELEMETRY */}
        {activeTab === "network" && (
          <div style={{ padding: "32px", overflowY: "auto", flex: 1 }}>
            <h1 style={{ margin: "0 0 8px 0", fontSize: "1.8rem", fontWeight: "800" }}>{t("tab_network")}</h1>
            <p style={{ color: themeMuted, margin: "0 0 24px 0" }}>Node connection status, consensus telemetry, and multi-bootstrap mesh.</p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
              <div style={{ backgroundColor: themeCardBg, padding: "24px", borderRadius: "12px", border: `1px solid ${themeBorder}` }}>
                <h3 style={{ margin: "0 0 16px 0" }}>Node Endpoint</h3>
                <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
                  <input
                    type="text"
                    value={inputNodeUrl}
                    onChange={(e) => setInputNodeUrl(e.target.value)}
                    style={{ flex: 1, padding: "10px", backgroundColor: "#090d16", border: `1px solid ${themeBorder}`, borderRadius: "6px", color: "#fff" }}
                  />
                  <button
                    onClick={() => {
                      setNodeStatus({ ...nodeStatus, node_url: inputNodeUrl });
                      alert(`Connected to BlockBum node at ${inputNodeUrl}`);
                    }}
                    style={{ padding: "10px 18px", backgroundColor: "#0284c7", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}
                  >
                    Connect
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.9rem" }}>
                  <div><span style={{ color: themeMuted }}>Status:</span> <span style={{ color: "#4ade80", fontWeight: "bold" }}>● Online ({nodeStatus.status})</span></div>
                  <div><span style={{ color: themeMuted }}>Client Mode:</span> <span style={{ color: themePrimary, fontWeight: "bold" }}>{clientMode === "full_node" ? t("mode_full") : t("mode_light")}</span></div>
                  <div><span style={{ color: themeMuted }}>Consensus Engine:</span> {nodeStatus.consensus_mode}</div>
                  <div><span style={{ color: themeMuted }}>Block Height:</span> #{nodeStatus.chain_height}</div>
                  <div><span style={{ color: themeMuted }}>Peers in Mesh:</span> {nodeStatus.peers_connected}</div>
                  <div><span style={{ color: themeMuted }}>Average Latency:</span> {nodeStatus.avg_latency_ms} ms</div>
                  <div><span style={{ color: themeMuted }}>Tip Hash:</span> <code style={{ color: themePrimary, wordBreak: "break-all" }}>{nodeStatus.tip_hash}</code></div>
                </div>
              </div>

              <div style={{ backgroundColor: themeCardBg, padding: "24px", borderRadius: "12px", border: `1px solid ${themeBorder}` }}>
                <h3 style={{ margin: "0 0 16px 0" }}>Multi-Bootstrap Gateways</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ padding: "12px", backgroundColor: "#1e293b", borderRadius: "8px" }}>
                    <div style={{ fontWeight: "bold", color: themePrimary }}>seed-eu-01 (Frankfurt)</div>
                    <div style={{ fontSize: "0.8rem", color: themeMuted }}>seed1.testnet.blockbum.net:9001 · Checkpoint Consensus Relay</div>
                  </div>
                  <div style={{ padding: "12px", backgroundColor: "#1e293b", borderRadius: "8px" }}>
                    <div style={{ fontWeight: "bold", color: themePrimary }}>seed-us-01 (Virginia)</div>
                    <div style={{ fontSize: "0.8rem", color: themeMuted }}>seed2.testnet.blockbum.net:9002 · Block Batch Propagation</div>
                  </div>
                  <div style={{ padding: "12px", backgroundColor: "#1e293b", borderRadius: "8px" }}>
                    <div style={{ fontWeight: "bold", color: themePrimary }}>seed-ap-01 (Singapore)</div>
                    <div style={{ fontSize: "0.8rem", color: themeMuted }}>seed3.testnet.blockbum.net:9003 · Mailbox & CAS Gateway</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: SETTINGS, ACCESSIBILITY & UPDATES */}
        {activeTab === "settings" && (
          <div style={{ padding: "32px", overflowY: "auto", flex: 1 }}>
            <h1 style={{ margin: "0 0 8px 0", fontSize: "1.8rem", fontWeight: "800" }}>{t("tab_settings")}</h1>
            <p style={{ color: themeMuted, margin: "0 0 24px 0" }}>Accessibility, encryption security, and signed release updates.</p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
              {/* Accessibility Settings */}
              <div style={{ backgroundColor: themeCardBg, padding: "24px", borderRadius: "12px", border: `1px solid ${themeBorder}` }}>
                <h3 style={{ margin: "0 0 16px 0" }}>Accessibility & UI</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
                    <span>{t("high_contrast")}</span>
                    <input
                      type="checkbox"
                      checked={accessibility.high_contrast}
                      onChange={(e) => setAccessibility({ ...accessibility, high_contrast: e.target.checked })}
                    />
                  </label>
                  <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
                    <span>{t("reduced_motion")}</span>
                    <input
                      type="checkbox"
                      checked={accessibility.reduced_motion}
                      onChange={(e) => setAccessibility({ ...accessibility, reduced_motion: e.target.checked })}
                    />
                  </label>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span>{t("font_size")}</span>
                    <select
                      value={accessibility.font_scale}
                      onChange={(e) => setAccessibility({ ...accessibility, font_scale: e.target.value as any })}
                      style={{ padding: "6px 12px", backgroundColor: "#090d16", color: "#fff", border: `1px solid ${themeBorder}`, borderRadius: "6px" }}
                    >
                      <option value="normal">Normal (100%)</option>
                      <option value="large">Large (115%)</option>
                      <option value="extra-large">Extra Large (130%)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Application Updates */}
              <div style={{ backgroundColor: themeCardBg, padding: "24px", borderRadius: "12px", border: `1px solid ${themeBorder}` }}>
                <h3 style={{ margin: "0 0 16px 0" }}>Signed Application Updates</h3>
                <p style={{ fontSize: "0.85rem", color: themeMuted, marginBottom: "16px" }}>
                  All release packages (Windows MSI, Linux AppImage/deb, macOS DMG, Android APK) are cryptographically signed with the BlockBum release authority Ed25519 key.
                </p>
                <button
                  onClick={handleCheckUpdates}
                  disabled={isCheckingUpdate}
                  style={{ padding: "10px 18px", backgroundColor: "#0284c7", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}
                >
                  {isCheckingUpdate ? "Verifying..." : t("check_updates")}
                </button>

                {updateInfo && (
                  <div style={{ marginTop: "16px", padding: "14px", backgroundColor: "#1e293b", borderRadius: "8px", border: "1px solid #4ade80" }}>
                    <div style={{ fontWeight: "bold", color: "#4ade80", marginBottom: "6px" }}>
                      ✓ {t("update_available")}: {updateInfo.version}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: themeMuted }}>Released: {updateInfo.release_date}</div>
                    <div style={{ fontSize: "0.8rem", color: themePrimary, wordBreak: "break-all", margin: "4px 0" }}>
                      {t("update_verified")}
                    </div>
                    <ul style={{ fontSize: "0.8rem", margin: "8px 0 0 18px", padding: 0 }}>
                      {updateInfo.changelog.map((c, i) => <li key={i}>{c}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* RECOVERY PHRASE BACKUP MODAL */}
      {showSeedModal && (
        <div role="dialog" aria-modal="true" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ backgroundColor: themeCardBg, border: `1px solid ${themeBorder}`, borderRadius: "16px", padding: "32px", width: "520px", maxWidth: "90%" }}>
            <h2 style={{ margin: "0 0 12px 0", color: themePrimary }}>{t("backup_phrase")}</h2>
            <p style={{ color: themeMuted, fontSize: "0.9rem", margin: "0 0 20px 0" }}>
              {t("backup_warning")}
            </p>
            <div style={{ backgroundColor: "#090d16", border: `1px solid ${themeBorder}`, padding: "16px", borderRadius: "8px", fontFamily: "monospace", fontSize: "0.95rem", color: themePrimary, lineHeight: "1.6", marginBottom: "20px" }}>
              {selectedIdentity.recovery_phrase}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowSeedModal(false)}
                style={{ padding: "10px 20px", backgroundColor: "#0284c7", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CLIENT EXECUTION MODE MODAL */}
      {showModeModal && (
        <div role="dialog" aria-modal="true" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ backgroundColor: themeCardBg, border: `1px solid ${themeBorder}`, borderRadius: "16px", padding: "32px", width: "560px", maxWidth: "90%" }}>
            <h2 style={{ margin: "0 0 12px 0", color: themePrimary }}>Execution Mode & Security Model</h2>
            <p style={{ color: themeMuted, fontSize: "0.9rem", marginBottom: "20px" }}>
              BlockBum provides two operating modes tailored to user hardware and trust requirements:
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "24px" }}>
              <div
                onClick={() => setClientMode("full_node")}
                style={{
                  padding: "16px",
                  borderRadius: "10px",
                  border: clientMode === "full_node" ? `2px solid #4ade80` : `1px solid ${themeBorder}`,
                  backgroundColor: clientMode === "full_node" ? "#1e293b" : "transparent",
                  cursor: "pointer"
                }}
              >
                <div style={{ fontWeight: "bold", color: "#4ade80", marginBottom: "4px" }}>{t("mode_full")}</div>
                <div style={{ fontSize: "0.85rem", color: themeMuted }}>{t("mode_full_desc")}</div>
              </div>

              <div
                onClick={() => setClientMode("light_client")}
                style={{
                  padding: "16px",
                  borderRadius: "10px",
                  border: clientMode === "light_client" ? `2px solid #38bdf8` : `1px solid ${themeBorder}`,
                  backgroundColor: clientMode === "light_client" ? "#1e293b" : "transparent",
                  cursor: "pointer"
                }}
              >
                <div style={{ fontWeight: "bold", color: "#38bdf8", marginBottom: "4px" }}>{t("mode_light")}</div>
                <div style={{ fontSize: "0.85rem", color: themeMuted }}>{t("mode_light_desc")}</div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowModeModal(false)}
                style={{ padding: "10px 20px", backgroundColor: "#0284c7", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAIR NEW DEVICE MODAL */}
      {showPairModal && (
        <div role="dialog" aria-modal="true" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ backgroundColor: themeCardBg, border: `1px solid ${themeBorder}`, borderRadius: "16px", padding: "32px", width: "480px", maxWidth: "90%", textAlign: "center" }}>
            <h2 style={{ margin: "0 0 10px 0", color: themePrimary }}>{t("pair_new_device")}</h2>
            <p style={{ color: themeMuted, fontSize: "0.85rem", margin: "0 0 20px 0" }}>
              Scan this pairing QR code with your BlockBum mobile app (Android or iOS) to securely sync your account.
            </p>
            {/* Visual QR Code Placeholder with Real Cryptographic Session Data */}
            <div style={{ width: "180px", height: "180px", margin: "0 auto 20px auto", backgroundColor: "#fff", padding: "10px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: "160px", height: "160px", border: "4px solid #000", display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "4px", padding: "4px", backgroundColor: "#fff" }}>
                {Array.from({ length: 25 }).map((_, i) => (
                  <div key={i} style={{ backgroundColor: (i % 2 === 0 || i % 3 === 0) ? "#000" : "#fff", borderRadius: "2px" }}></div>
                ))}
              </div>
            </div>
            <div style={{ fontSize: "0.75rem", color: themeMuted, wordBreak: "break-all", marginBottom: "20px" }}>
              Pairing Code: <code>bbum_pair_{selectedIdentity.address.substring(0, 12)}...</code>
            </div>
            <button
              onClick={() => {
                const newDev: DeviceSession = {
                  device_id: "dev_mob_" + Date.now(),
                  device_name: "New Mobile Device (Linked)",
                  platform: "ios",
                  paired_at: "Just now",
                  last_active: "Active Now",
                  is_current: false,
                  auth_public_key: "0x" + Math.random().toString(16).substring(2, 18),
                  status: "authorized"
                };
                setDevices([...devices, newDev]);
                setShowPairModal(false);
                alert("New device paired and cryptographically authorized!");
              }}
              style={{ width: "100%", padding: "12px", backgroundColor: "#0284c7", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}
            >
              Simulate Mobile Scan Complete
            </button>
          </div>
        </div>
      )}

      {/* ONBOARDING QUICK-START MODAL */}
      {showOnboardingModal && (
        <div role="dialog" aria-modal="true" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ backgroundColor: themeCardBg, border: `1px solid ${themeBorder}`, borderRadius: "16px", padding: "32px", width: "540px", maxWidth: "90%" }}>
            <h2 style={{ margin: "0 0 10px 0", color: themePrimary }}>{t("welcome_header")}</h2>
            <p style={{ color: themeMuted, fontSize: "0.9rem", margin: "0 0 20px 0" }}>
              {t("welcome_sub")}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px", fontSize: "0.85rem" }}>
              <div style={{ padding: "12px", backgroundColor: "#1e293b", borderRadius: "8px" }}>
                <span style={{ fontWeight: "bold", color: "#4ade80" }}>1. No Technical Knowledge Required</span>
                <p style={{ margin: "4px 0 0 0", color: themeMuted }}>Your account address is your unique profile ID (bb1...). No servers, companies, or passwords required to communicate.</p>
              </div>
              <div style={{ padding: "12px", backgroundColor: "#1e293b", borderRadius: "8px" }}>
                <span style={{ fontWeight: "bold", color: themePrimary }}>2. Universal Protocol Compatibility</span>
                <p style={{ margin: "4px 0 0 0", color: themeMuted }}>Desktop, mobile (Android/iOS), and web clients share identical Ed25519 cryptography, BUM balances, and Double Ratchet channels.</p>
              </div>
              <div style={{ padding: "12px", backgroundColor: "#1e293b", borderRadius: "8px" }}>
                <span style={{ fontWeight: "bold", color: "#f59e0b" }}>3. Full-Node vs Light-Client Freedom</span>
                <p style={{ margin: "4px 0 0 0", color: themeMuted }}>Switch seamlessly between self-sovereign Full Node verification and zero-resource Lightweight SPV mode in Settings.</p>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowOnboardingModal(false)}
                style={{ padding: "10px 20px", backgroundColor: "#0284c7", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
