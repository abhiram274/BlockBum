import React, { useState } from "react";
import {
  NodeStatus,
  WalletIdentity,
  TransactionRecord,
  Community,
  MessageItem,
  ClientExecutionMode
} from "./types";
import bbCoinImg from "./assets/bb_coin.png";

// ============================================================================
// CLEAN MONOCHROME VECTOR ICONS (BLACK & WHITE / HIGH-CONTRAST BOLD STROKES)
// ============================================================================

const IconOverview = ({ size = 20, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 12V8H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h12v4" />
    <path d="M4 6v12a2 2 0 0 0 2 2h14v-4" />
    <path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z" />
  </svg>
);

const IconSend = ({ size = 20, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" fill="currentColor" fillOpacity="0.15" />
  </svg>
);

const IconReceive = ({ size = 20, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 15v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const IconTransactions = ({ size = 20, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);

const IconCommunities = ({ size = 20, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const IconDebug = ({ size = 20, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="4 17 10 11 4 5" />
    <line x1="12" y1="19" x2="20" y2="19" />
  </svg>
);

const IconLock = ({ size = 16, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const IconSignal = ({ size = 16, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 20h20" />
    <path d="M5 20v-4" />
    <path d="M9 20v-8" />
    <path d="M13 20V8" />
    <path d="M17 20V4" />
  </svg>
);

const IconShield = ({ size = 16, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const IconCheck = ({ size = 15, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconCopy = ({ size = 14, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const IconTxIn = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <polyline points="19 12 12 19 5 12" />
  </svg>
);

const IconTxOut = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="19" x2="12" y2="5" />
    <polyline points="5 12 12 5 19 12" />
  </svg>
);

const IconTxMined = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 9.5 21 3m0 0h-6m6 0v6M3 21l6.5-6.5m0 0 3-3-4-4-3 3 4 4z" />
  </svg>
);

export const App: React.FC = () => {
  // Navigation Tabs (Bitcoin Core Qt style: Overview, Send, Receive, Transactions, Communities, Node & Debug)
  const [activeTab, setActiveTab] = useState<
    "overview" | "send" | "receive" | "transactions" | "communities" | "debug"
  >("overview");

  // Client Execution Mode (Full Node, SPV Light Mode, Pruned Node)
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

  // Wallet Identities (Primary: Founder Abhiram)
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
      alias: "BlockBum Mining Rig",
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
  const [feeRateOption, setFeeRateOption] = useState<"recommended" | "custom">("recommended");
  const [sendFeeRate, setSendFeeRate] = useState<number>(0.0005);
  const [showSendConfirmModal, setShowSendConfirmModal] = useState(false);

  // Receive Form & Payment Requests
  const [receiveLabel, setReceiveLabel] = useState("");
  const [receiveAmount, setReceiveAmount] = useState("");
  const [receiveMessage, setReceiveMessage] = useState("");
  interface PaymentRequest {
    id: string;
    date: string;
    label: string;
    message: string;
    amount: string;
    address: string;
  }
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([
    {
      id: "req_1",
      date: "2026-11-26 10:14",
      label: "Dev Grant Contribution",
      message: "Q4 Core Engineering Support",
      amount: "25.00000000",
      address: "bb1abhiram729e8c40b82194017de8bf019abcdef0123"
    },
    {
      id: "req_2",
      date: "2026-11-25 18:30",
      label: "Node Shard Rent",
      message: "Encrypted Storage Shard P2P",
      amount: "10.50000000",
      address: "bb1abhiram88410294819aa018290bc019a778899aabb"
    }
  ]);
  const [activeQrModal, setActiveQrModal] = useState<PaymentRequest | null>(null);

  // Transactions Filter State
  const [txDateFilter, setTxDateFilter] = useState("all");
  const [txTypeFilter, setTxTypeFilter] = useState("all");
  const [txMinAmount, setTxMinAmount] = useState("");
  const [txSearchQuery, setTxSearchQuery] = useState("");
  const [selectedTx, setSelectedTx] = useState<TransactionRecord | null>(null);

  // ==========================================================================
  // DYNAMIC COMMUNITIES & CHAT STATE
  // ==========================================================================
  const [communities, setCommunities] = useState<Community[]>([
    {
      id: "comm_core",
      name: "BlockBum Core Engineering",
      description: "Protocol standardization, dynamic difficulty PoW, and P2P consensus.",
      isPrivate: false,
      memberCount: 142,
      myRole: "Owner",
      channels: ["general", "announcements", "consensus-security"],
      governanceProposals: [],
      codingChallenges: [],
      events: []
    },
    {
      id: "comm_nodes",
      name: "Global Node Operators Guild",
      description: "Sovereign full node operators and validator infrastructure over IPv4/IPv6.",
      isPrivate: true,
      memberCount: 88,
      myRole: "Admin",
      channels: ["infrastructure", "peer-discovery", "hardware-tuning"],
      governanceProposals: [],
      codingChallenges: [],
      events: []
    },
    {
      id: "comm_miners",
      name: "BUM Miners & Stakers",
      description: "SHA-256 hashrate coordination, energy efficiency, and reward sustainability.",
      isPrivate: false,
      memberCount: 65,
      myRole: "Member",
      channels: ["mining-rigs", "difficulty-smoothing"],
      governanceProposals: [],
      codingChallenges: [],
      events: []
    }
  ]);
  const [selectedCommunityId, setSelectedCommunityId] = useState<string>("comm_core");
  const activeCommunity = communities.find((c) => c.id === selectedCommunityId) || communities[0];
  const [activeChannel, setActiveChannel] = useState<string>("general");
  const [chatInput, setChatInput] = useState("");

  // Dynamic Chat Messages Store
  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: "m1",
      communityId: "comm_core",
      channel: "general",
      sender: "bb1abhiram729e8c40b82194017de8bf019abcdef0123",
      senderAlias: "Abhiram (Founder)",
      content: "Welcome to BlockBum Core. Dynamic difficulty retargeting and encrypted P2P messaging are fully active on mainnet.",
      timestamp: "12:30 PM",
      isE2EE: true,
      deliveryAck: true
    },
    {
      id: "m2",
      communityId: "comm_core",
      channel: "general",
      sender: "bb1nodeop98471928374619283746192837461928",
      senderAlias: "Frankfurt_Node_01",
      content: "Connected to 8 peers over IPv6. Block #124,890 verified locally in 14ms using Ubuntu OpenSSL cryptography.",
      timestamp: "12:34 PM",
      isE2EE: true,
      deliveryAck: true
    },
    {
      id: "m3",
      communityId: "comm_core",
      channel: "announcements",
      sender: "bb1abhiram729e8c40b82194017de8bf019abcdef0123",
      senderAlias: "Abhiram (Founder)",
      content: "BlockBum Core release v1.0 is finalized with native Full Node, SPV, and Pruned modes.",
      timestamp: "10:15 AM",
      isE2EE: true,
      deliveryAck: true
    },
    {
      id: "m4",
      communityId: "comm_nodes",
      channel: "infrastructure",
      sender: "bb1nodeop98471928374619283746192837461928",
      senderAlias: "Frankfurt_Node_01",
      content: "Mempool memory pool is stable at 4.6 KB with 12 pending transactions.",
      timestamp: "11:20 AM",
      isE2EE: true,
      deliveryAck: true
    }
  ]);

  // Modal Dialogs for Community
  const [showCreateCommunityModal, setShowCreateCommunityModal] = useState(false);
  const [newCommName, setNewCommName] = useState("");
  const [newCommDesc, setNewCommDesc] = useState("");
  const [newCommIsPrivate, setNewCommIsPrivate] = useState(false);
  const [newCommChannels, setNewCommChannels] = useState("general, announcements");

  const [showAddChannelModal, setShowAddChannelModal] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");

  // Debug Window / RPC Console State
  const [debugSubTab, setDebugSubTab] = useState<"info" | "console" | "network" | "modes">("info");
  const [rpcCommand, setRpcCommand] = useState("");
  const [consoleOutput, setConsoleOutput] = useState<string[]>([
    "BlockBum Core RPC Debug Console [Qt Architecture] v1.0.0",
    "Type 'help', 'getblockchaininfo', 'getpeerinfo', 'getmempoolinfo', or 'getclientmode' to execute.",
    ""
  ]);
  const [peers] = useState([
    { ip: "198.51.100.24:8333", latency: "14ms", height: 124890, version: "/BlockBum:1.0.0/", type: "Outbound" },
    { ip: "203.0.113.88:8333", latency: "22ms", height: 124890, version: "/BlockBum:1.0.0/", type: "Inbound" },
    { ip: "[2001:db8::1]:8333", latency: "18ms", height: 124889, version: "/BlockBum:1.0.0/", type: "Outbound" },
    { ip: "192.0.2.145:8333", latency: "35ms", height: 124890, version: "/BlockBum:1.0.0/", type: "Inbound" },
    { ip: "198.51.100.102:8333", latency: "16ms", height: 124890, version: "/BlockBum:1.0.0/", type: "Outbound" }
  ]);

  // Top Menu Bar Dropdowns
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  // Toast Notification
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  // ==========================================================================
  // Handlers
  // ==========================================================================

  const handleSetClientMode = (mode: ClientExecutionMode) => {
    setClientMode(mode);
    setNodeStatus((prev) => ({ ...prev, client_mode: mode }));
    showToast(`Execution mode set to: ${mode === "full_node" ? "Full Node Mode" : mode === "light_client" ? "Lightweight (SPV) Mode" : "Pruned Node Mode"}`);
  };

  const handleExecuteSend = () => {
    const amt = parseFloat(sendAmount);
    if (!sendToAddress.trim() || isNaN(amt) || amt <= 0) {
      alert("Invalid payment address or amount.");
      return;
    }
    if (amt + sendFeeRate > selectedIdentity.balance_bum) {
      alert("Insufficient funds to pay amount and fee.");
      return;
    }

    const newTx: TransactionRecord = {
      tx_id: "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(""),
      type: "send",
      counterparty: sendToAddress.trim(),
      amount_bum: amt,
      fee_bum: sendFeeRate,
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
      status: "confirmed",
      block_height: nodeStatus.chain_height + 1
    };

    setSelectedIdentity((prev) => ({
      ...prev,
      balance_bum: parseFloat((prev.balance_bum - (amt + sendFeeRate)).toFixed(8))
    }));
    setTransactions([newTx, ...transactions]);
    setShowSendConfirmModal(false);
    setSendToAddress("");
    setSendLabel("");
    setSendAmount("");
    showToast(`Transaction Broadcast: Sent ${amt.toFixed(4)} BUM to ${sendToAddress.substring(0, 12)}...`);
  };

  const handleCreatePaymentRequest = (e: React.FormEvent) => {
    e.preventDefault();
    const req: PaymentRequest = {
      id: "req_" + Date.now(),
      date: new Date().toISOString().replace("T", " ").substring(0, 16),
      label: receiveLabel.trim() || "Payment Request",
      message: receiveMessage.trim() || "N/A",
      amount: parseFloat(receiveAmount || "0").toFixed(8),
      address: selectedIdentity.address
    };
    setPaymentRequests([req, ...paymentRequests]);
    setActiveQrModal(req);
    setReceiveLabel("");
    setReceiveAmount("");
    setReceiveMessage("");
  };

  const handleCreateCommunity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommName.trim()) return;

    const channelList = newCommChannels
      .split(",")
      .map((ch) => ch.trim().replace(/^#/, ""))
      .filter((ch) => ch.length > 0);

    const created: Community = {
      id: "comm_" + Date.now(),
      name: newCommName.trim(),
      description: newCommDesc.trim() || "Independent peer community cluster.",
      isPrivate: newCommIsPrivate,
      memberCount: 1,
      myRole: "Owner",
      channels: channelList.length > 0 ? channelList : ["general"],
      governanceProposals: [],
      codingChallenges: [],
      events: []
    };

    setCommunities([...communities, created]);
    setSelectedCommunityId(created.id);
    setActiveChannel(created.channels[0]);
    setNewCommName("");
    setNewCommDesc("");
    setShowCreateCommunityModal(false);
    showToast(`Created Community: ${created.name}`);
  };

  const handleAddChannel = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newChannelName.trim().replace(/^#/, "").toLowerCase();
    if (!cleanName) return;

    setCommunities((prev) =>
      prev.map((c) =>
        c.id === selectedCommunityId
          ? { ...c, channels: [...c.channels, cleanName] }
          : c
      )
    );
    setActiveChannel(cleanName);
    setNewChannelName("");
    setShowAddChannelModal(false);
    showToast(`Channel #${cleanName} added to ${activeCommunity.name}`);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const newMsg: MessageItem = {
      id: "msg_" + Date.now(),
      communityId: selectedCommunityId,
      channel: activeChannel,
      sender: selectedIdentity.address,
      senderAlias: selectedIdentity.alias,
      content: chatInput.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isE2EE: true,
      deliveryAck: true
    };

    setMessages([...messages, newMsg]);
    setChatInput("");
  };

  const handleExecuteRpc = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = rpcCommand.trim().toLowerCase();
    if (!cmd) return;

    let res = "";
    if (cmd === "help") {
      res = "Available RPC Commands:\n - getblockchaininfo : Returns chain height, consensus, and block tip hash.\n - getpeerinfo       : Returns active IPv4/IPv6 peer telemetry.\n - getmempoolinfo    : Returns pending transactions count and memory usage.\n - getclientmode     : Returns active client mode (full_node, light_client, pruned_node).\n - clear             : Clears terminal history.";
    } else if (cmd === "getblockchaininfo") {
      res = JSON.stringify({
        chain: "main",
        blocks: nodeStatus.chain_height,
        headers: nodeStatus.chain_height,
        bestblockhash: nodeStatus.tip_hash,
        difficulty: "0x1d00ffff",
        verificationprogress: 1.0,
        consensus_engine: "BlockBum Dynamic Difficulty PoW"
      }, null, 2);
    } else if (cmd === "getpeerinfo") {
      res = JSON.stringify(peers, null, 2);
    } else if (cmd === "getmempoolinfo") {
      res = JSON.stringify({ size: nodeStatus.mempool_tx_count, bytes: nodeStatus.mempool_tx_count * 384 }, null, 2);
    } else if (cmd === "getclientmode") {
      res = JSON.stringify({ mode: clientMode, full_validation: true, spv_proofs: true }, null, 2);
    } else if (cmd === "clear") {
      setConsoleOutput(["Terminal cleared."]);
      setRpcCommand("");
      return;
    } else {
      res = `Unknown command: '${cmd}'. Type 'help' for available RPC calls.`;
    }

    setConsoleOutput([...consoleOutput, `> ${rpcCommand}`, res, ""]);
    setRpcCommand("");
  };

  // Pure SVG QR Generator
  const renderQrSvg = (text: string, sizePx = 180) => {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
      hash |= 0;
    }
    const size = 21;
    const cells: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

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

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if ((r < 8 && c < 8) || (r < 8 && c >= size - 8) || (r >= size - 8 && c < 8)) continue;
        cells[r][c] = ((hash * (r + 1) * 31) ^ (c * 17)) % 3 === 0;
      }
    }

    return (
      <svg width={sizePx} height={sizePx} viewBox={`0 0 ${size} ${size}`} style={{ backgroundColor: "#FFFFFF", padding: "10px", borderRadius: "3px", border: "1px solid #CBD5E1" }}>
        {cells.map((row, r) =>
          row.map((val, c) =>
            val ? <rect key={`${r}-${c}`} x={c} y={r} width="1" height="1" fill="#0F172A" /> : null
          )
        )}
      </svg>
    );
  };

  // Filtered Transactions
  const filteredTxs = transactions.filter((tx) => {
    if (txTypeFilter !== "all" && tx.type !== txTypeFilter) return false;
    if (txMinAmount && tx.amount_bum < parseFloat(txMinAmount)) return false;
    if (txSearchQuery.trim()) {
      const q = txSearchQuery.toLowerCase();
      return tx.tx_id.toLowerCase().includes(q) || tx.counterparty.toLowerCase().includes(q);
    }
    return true;
  });

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
      {/* BITCOIN CORE QT MENU BAR (File, Settings, Window, Help)               */}
      {/* ===================================================================== */}
      <div
        style={{
          display: "flex",
          backgroundColor: "#F1F5F9",
          borderBottom: "1px solid #CBD5E1",
          padding: "3px 8px",
          fontSize: "13px",
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
              { label: "Backup Wallet...", action: () => showToast("Wallet backed up to local encrypted vault.") },
              { label: "Sign Message...", action: () => alert("Secp256k1 message signing dialog.") },
              { label: "Verify Message...", action: () => alert("Signature verification dialog.") },
              { type: "separator" },
              { label: "Exit BlockBum Core", action: () => window.close() }
            ]
          },
          {
            id: "settings",
            name: "Settings",
            items: [
              { label: "Execution Mode: Full Node", action: () => handleSetClientMode("full_node") },
              { label: "Execution Mode: SPV (Light)", action: () => handleSetClientMode("light_client") },
              { label: "Execution Mode: Pruned Node", action: () => handleSetClientMode("pruned_node") },
              { type: "separator" },
              { label: "Encrypt Wallet...", action: () => alert("Wallet is already encrypted with AES-256-GCM.") },
              { label: "Change Passphrase...", action: () => alert("Change passphrase dialog.") }
            ]
          },
          {
            id: "window",
            name: "Window",
            items: [
              { label: "Minimize", action: () => {} },
              { label: "Zoom", action: () => {} },
              { type: "separator" },
              { label: "Node & Debug Window", action: () => setActiveTab("debug") }
            ]
          },
          {
            id: "help",
            name: "Help",
            items: [
              { label: "BlockBum Protocol Specification", action: () => alert("BlockBum Protocol v1.0. Dynamic PoW Consensus.") },
              { label: "About BlockBum Core", action: () => alert("BlockBum Core v1.0.0\nFounder: Abhiram\nDynamic Communities & Cryptography") }
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
                padding: "4px 10px",
                fontSize: "13px",
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
                  borderRadius: "3px",
                  boxShadow: "0 3px 10px rgba(0,0,0,0.12)",
                  minWidth: "240px",
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
                        padding: "7px 16px",
                        fontSize: "13px",
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
      {/* BITCOIN CORE QT TOOLBAR (With Clean Monochrome Black & White Icons)  */}
      {/* ===================================================================== */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: "#FFFFFF",
          borderBottom: "1px solid #CBD5E1",
          padding: "5px 12px 0 12px",
          userSelect: "none"
        }}
      >
        {/* Core Navigation Buttons with Big Legible Icons & Text */}
        <div style={{ display: "flex", gap: "4px" }}>
          {[
            { id: "overview", label: "Overview", icon: <IconOverview size={21} /> },
            { id: "send", label: "Send", icon: <IconSend size={21} /> },
            { id: "receive", label: "Receive", icon: <IconReceive size={21} /> },
            { id: "transactions", label: "Transactions", icon: <IconTransactions size={21} /> },
            { id: "communities", label: "Communities & Chat", icon: <IconCommunities size={21} /> },
            { id: "debug", label: "Node & Debug", icon: <IconDebug size={21} /> }
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "9px",
                  padding: "9px 18px",
                  backgroundColor: isActive ? "#F4F6F9" : "#FFFFFF",
                  borderTop: isActive ? "3px solid #D4AF37" : "3px solid transparent",
                  borderLeft: isActive ? "1px solid #CBD5E1" : "1px solid transparent",
                  borderRight: isActive ? "1px solid #CBD5E1" : "1px solid transparent",
                  borderBottom: isActive ? "1px solid #F4F6F9" : "1px solid transparent",
                  borderRadius: "4px 4px 0 0",
                  color: isActive ? "#0F172A" : "#64748B",
                  fontWeight: isActive ? "bold" : "600",
                  fontSize: "14px",
                  cursor: "pointer",
                  marginBottom: "-1px"
                }}
              >
                <span style={{ display: "flex", alignItems: "center", color: isActive ? "#0F172A" : "#475569" }}>
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Info: Coin Emblem & Founder Identity */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", paddingBottom: "5px" }}>
          <img src={bbCoinImg} alt="BB" style={{ width: "26px", height: "26px", objectFit: "contain" }} />
          <div style={{ fontSize: "12px", textAlign: "right" }}>
            <span style={{ fontWeight: "bold", color: "#0F172A", fontSize: "13px" }}>{selectedIdentity.alias}</span>
            <div style={{ fontFamily: "monospace", color: "#B8860B", fontWeight: "bold", fontSize: "13px" }}>
              {selectedIdentity.balance_bum.toFixed(4)} BUM
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification Banner */}
      {toastMsg && (
        <div
          style={{
            backgroundColor: "#ECFDF5",
            borderBottom: "1px solid #A7F3D0",
            color: "#065F46",
            padding: "8px 18px",
            fontSize: "13px",
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <IconCheck size={16} color="#059669" /> {toastMsg}
          </span>
          <button onClick={() => setToastMsg(null)} style={{ background: "none", border: "none", color: "#065F46", cursor: "pointer", fontWeight: "bold", fontSize: "14px" }}>
            ✕
          </button>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MAIN QT WORKSPACE                                                     */}
      {/* ===================================================================== */}
      <div style={{ flex: 1, overflowY: "auto", padding: "18px 22px" }}>
        {/* =================================================================== */}
        {/* TAB 1: OVERVIEW (EXACT BITCOIN CORE QT LAYOUT)                      */}
        {/* =================================================================== */}
        {activeTab === "overview" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px" }}>
            {/* Left Box: Balances (Bitcoin Core GroupBox) */}
            <fieldset
              style={{
                backgroundColor: "#FFFFFF",
                border: "1px solid #CBD5E1",
                borderRadius: "4px",
                padding: "20px 24px",
                margin: 0
              }}
            >
              <legend style={{ fontWeight: "bold", fontSize: "15px", color: "#0F172A", padding: "0 8px" }}>
                Balances
              </legend>

              <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginTop: "6px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontSize: "14px", color: "#64748B", fontWeight: "600" }}>Available:</span>
                  <span style={{ fontSize: "26px", fontWeight: "bold", fontFamily: "monospace", color: "#0F172A" }}>
                    {selectedIdentity.balance_bum.toFixed(8)} <span style={{ color: "#B8860B", fontSize: "16px" }}>BUM</span>
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontSize: "14px", color: "#64748B" }}>Pending:</span>
                  <span style={{ fontSize: "16px", fontFamily: "monospace", color: "#64748B" }}>
                    0.00000000 BUM
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontSize: "14px", color: "#64748B" }}>Immature (Mining):</span>
                  <span style={{ fontSize: "16px", fontFamily: "monospace", color: "#64748B" }}>
                    0.00000000 BUM
                  </span>
                </div>

                <div style={{ height: "1px", backgroundColor: "#E2E8F0", margin: "8px 0" }} />

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontSize: "15px", fontWeight: "bold", color: "#0F172A" }}>Total Balance:</span>
                  <span style={{ fontSize: "22px", fontWeight: "bold", fontFamily: "monospace", color: "#059669" }}>
                    {selectedIdentity.balance_bum.toFixed(8)} BUM
                  </span>
                </div>

                {/* Primary Address Box */}
                <div style={{ marginTop: "12px", backgroundColor: "#F8FAFC", padding: "12px", borderRadius: "4px", border: "1px solid #E2E8F0" }}>
                  <div style={{ fontSize: "12px", color: "#64748B", fontWeight: "bold", marginBottom: "4px" }}>
                    Primary Receiving Address:
                  </div>
                  <div style={{ fontFamily: "monospace", fontSize: "13px", wordBreak: "break-all", color: "#0F172A", fontWeight: "bold" }}>
                    {selectedIdentity.address}
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
                  <button
                    onClick={() => setActiveTab("send")}
                    style={{
                      flex: 1,
                      padding: "10px",
                      backgroundColor: "#FF6B00",
                      border: "1px solid #EA580C",
                      borderRadius: "3px",
                      color: "#FFFFFF",
                      fontWeight: "bold",
                      fontSize: "14px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px"
                    }}
                  >
                    <IconSend size={18} color="#FFFFFF" />
                    <span>Send Coins</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("receive")}
                    style={{
                      flex: 1,
                      padding: "10px",
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #D4AF37",
                      borderRadius: "3px",
                      color: "#B8860B",
                      fontWeight: "bold",
                      fontSize: "14px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px"
                    }}
                  >
                    <IconReceive size={18} color="#B8860B" />
                    <span>Receive Coins</span>
                  </button>
                </div>
              </div>
            </fieldset>

            {/* Right Box: Recent Transactions (Bitcoin Core GroupBox) */}
            <fieldset
              style={{
                backgroundColor: "#FFFFFF",
                border: "1px solid #CBD5E1",
                borderRadius: "4px",
                padding: "20px 24px",
                margin: 0,
                display: "flex",
                flexDirection: "column"
              }}
            >
              <legend style={{ fontWeight: "bold", fontSize: "15px", color: "#0F172A", padding: "0 8px" }}>
                Recent Transactions
              </legend>

              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px", marginTop: "6px" }}>
                {transactions.slice(0, 5).map((tx) => (
                  <div
                    key={tx.tx_id}
                    onClick={() => setSelectedTx(tx)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      backgroundColor: "#F8FAFC",
                      borderRadius: "3px",
                      border: "1px solid #E2E8F0",
                      fontSize: "13px",
                      cursor: "pointer"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span>
                        {tx.type === "receive" ? <IconTxIn /> : tx.type === "send" ? <IconTxOut /> : <IconTxMined />}
                      </span>
                      <div>
                        <div style={{ fontWeight: "bold", color: "#0F172A" }}>
                          {tx.type === "receive" ? "Received with" : tx.type === "send" ? "Payment to" : "Mined Block"}
                        </div>
                        <div style={{ color: "#64748B", fontSize: "12px" }}>{tx.timestamp}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          fontWeight: "bold",
                          fontFamily: "monospace",
                          fontSize: "14px",
                          color: tx.type === "send" ? "#DC2626" : "#059669"
                        }}
                      >
                        {tx.type === "send" ? "-" : "+"}
                        {tx.amount_bum.toFixed(4)} BUM
                      </div>
                      <div style={{ color: "#64748B", fontSize: "11px" }}>Block #{tx.block_height}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ textAlign: "right", marginTop: "14px" }}>
                <button
                  onClick={() => setActiveTab("transactions")}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#FF6B00",
                    fontWeight: "bold",
                    fontSize: "13px",
                    cursor: "pointer"
                  }}
                >
                  View All Transactions →
                </button>
              </div>
            </fieldset>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: SEND (EXACT BITCOIN CORE QT LAYOUT)                          */}
        {/* =================================================================== */}
        {activeTab === "send" && (
          <fieldset
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #CBD5E1",
              borderRadius: "4px",
              padding: "24px 28px",
              margin: "0 auto",
              maxWidth: "860px"
            }}
          >
            <legend style={{ fontWeight: "bold", fontSize: "16px", color: "#0F172A", padding: "0 8px" }}>
              Send Coins
            </legend>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setShowSendConfirmModal(true);
              }}
            >
              {/* Pay To */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", color: "#334155", marginBottom: "6px" }}>
                  Pay To:
                </label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="text"
                    value={sendToAddress}
                    onChange={(e) => setSendToAddress(e.target.value)}
                    placeholder="Enter a BlockBum address (e.g. bb1...)"
                    required
                    style={{
                      flex: 1,
                      padding: "9px 12px",
                      backgroundColor: "#F8FAFC",
                      border: "1px solid #CBD5E1",
                      borderRadius: "3px",
                      fontSize: "14px",
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
                      padding: "9px 14px",
                      backgroundColor: "#F1F5F9",
                      border: "1px solid #CBD5E1",
                      borderRadius: "3px",
                      fontSize: "13px",
                      fontWeight: "600",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px"
                    }}
                  >
                    <IconCopy size={15} color="#334155" /> Paste
                  </button>
                </div>
              </div>

              {/* Label */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", color: "#334155", marginBottom: "6px" }}>
                  Label:
                </label>
                <input
                  type="text"
                  value={sendLabel}
                  onChange={(e) => setSendLabel(e.target.value)}
                  placeholder="Enter a label for this address to add it to your address book"
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    backgroundColor: "#F8FAFC",
                    border: "1px solid #CBD5E1",
                    borderRadius: "3px",
                    fontSize: "14px",
                    boxSizing: "border-box"
                  }}
                />
              </div>

              {/* Amount */}
              <div style={{ marginBottom: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <label style={{ fontSize: "13px", fontWeight: "bold", color: "#334155" }}>
                    Amount:
                  </label>
                  <span style={{ fontSize: "13px", color: "#64748B" }}>
                    Balance: <strong style={{ color: "#0F172A" }}>{selectedIdentity.balance_bum.toFixed(8)} BUM</strong>
                  </span>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="number"
                    step="0.0001"
                    min="0.0001"
                    value={sendAmount}
                    onChange={(e) => setSendAmount(e.target.value)}
                    placeholder="0.00000000"
                    required
                    style={{
                      flex: 1,
                      padding: "9px 12px",
                      backgroundColor: "#F8FAFC",
                      border: "1px solid #CBD5E1",
                      borderRadius: "3px",
                      fontSize: "15px",
                      fontWeight: "bold",
                      fontFamily: "monospace"
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setSendAmount(Math.max(0, selectedIdentity.balance_bum - sendFeeRate).toFixed(8))}
                    style={{
                      padding: "9px 16px",
                      backgroundColor: "#F1F5F9",
                      border: "1px solid #CBD5E1",
                      borderRadius: "3px",
                      fontSize: "13px",
                      fontWeight: "bold",
                      cursor: "pointer"
                    }}
                  >
                    Use Available
                  </button>
                </div>
              </div>

              {/* Transaction Fee */}
              <fieldset
                style={{
                  border: "1px solid #E2E8F0",
                  borderRadius: "3px",
                  padding: "14px 18px",
                  marginBottom: "24px",
                  backgroundColor: "#F8FAFC"
                }}
              >
                <legend style={{ fontSize: "12px", fontWeight: "bold", color: "#64748B", padding: "0 6px" }}>
                  Transaction Fee
                </legend>

                <div style={{ display: "flex", gap: "24px", marginBottom: "8px" }}>
                  <label style={{ fontSize: "13px", display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="feeOption"
                      checked={feeRateOption === "recommended"}
                      onChange={() => {
                        setFeeRateOption("recommended");
                        setSendFeeRate(0.0005);
                      }}
                    />
                    <span>Recommended (0.0005 BUM)</span>
                  </label>
                  <label style={{ fontSize: "13px", display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="feeOption"
                      checked={feeRateOption === "custom"}
                      onChange={() => {
                        setFeeRateOption("custom");
                        setSendFeeRate(0.001);
                      }}
                    />
                    <span>Priority (0.0010 BUM)</span>
                  </label>
                </div>

                <div style={{ fontSize: "12px", color: "#64748B" }}>
                  Estimated confirmation target: <strong>~2 blocks (20 minutes)</strong>
                </div>
              </fieldset>

              {/* Buttons */}
              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: "11px",
                    background: "linear-gradient(135deg, #FF6B00 0%, #FF8800 100%)",
                    border: "1px solid #EA580C",
                    borderRadius: "3px",
                    color: "#FFFFFF",
                    fontWeight: "bold",
                    fontSize: "14px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px"
                  }}
                >
                  <IconSend size={18} color="#FFFFFF" />
                  <span>Send Coins</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSendToAddress("");
                    setSendLabel("");
                    setSendAmount("");
                  }}
                  style={{
                    padding: "11px 24px",
                    backgroundColor: "#FFFFFF",
                    border: "1px solid #CBD5E1",
                    borderRadius: "3px",
                    color: "#334155",
                    fontSize: "14px",
                    cursor: "pointer"
                  }}
                >
                  Clear All
                </button>
              </div>
            </form>
          </fieldset>
        )}

        {/* =================================================================== */}
        {/* TAB 3: RECEIVE (EXACT BITCOIN CORE QT LAYOUT)                       */}
        {/* =================================================================== */}
        {activeTab === "receive" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "18px", maxWidth: "900px", margin: "0 auto" }}>
            {/* GroupBox: Request Payment */}
            <fieldset
              style={{
                backgroundColor: "#FFFFFF",
                border: "1px solid #CBD5E1",
                borderRadius: "4px",
                padding: "20px 24px",
                margin: 0
              }}
            >
              <legend style={{ fontWeight: "bold", fontSize: "15px", color: "#0F172A", padding: "0 8px" }}>
                Request Payment
              </legend>

              <form onSubmit={handleCreatePaymentRequest}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", color: "#64748B", marginBottom: "4px" }}>
                      Label:
                    </label>
                    <input
                      type="text"
                      value={receiveLabel}
                      onChange={(e) => setReceiveLabel(e.target.value)}
                      placeholder="e.g. Q4 Dev Grant"
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        backgroundColor: "#F8FAFC",
                        border: "1px solid #CBD5E1",
                        borderRadius: "3px",
                        fontSize: "14px",
                        boxSizing: "border-box"
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", color: "#64748B", marginBottom: "4px" }}>
                      Amount (BUM):
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      value={receiveAmount}
                      onChange={(e) => setReceiveAmount(e.target.value)}
                      placeholder="0.00000000"
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        backgroundColor: "#F8FAFC",
                        border: "1px solid #CBD5E1",
                        borderRadius: "3px",
                        fontSize: "14px",
                        boxSizing: "border-box"
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", color: "#64748B", marginBottom: "4px" }}>
                    Message:
                  </label>
                  <input
                    type="text"
                    value={receiveMessage}
                    onChange={(e) => setReceiveMessage(e.target.value)}
                    placeholder="Enter an optional payment description"
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      backgroundColor: "#F8FAFC",
                      border: "1px solid #CBD5E1",
                      borderRadius: "3px",
                      fontSize: "14px",
                      boxSizing: "border-box"
                    }}
                  />
                </div>

                <div style={{ display: "flex", gap: "12px" }}>
                  <button
                    type="submit"
                    style={{
                      padding: "9px 20px",
                      backgroundColor: "#FF6B00",
                      border: "1px solid #EA580C",
                      borderRadius: "3px",
                      color: "#FFFFFF",
                      fontWeight: "bold",
                      fontSize: "13px",
                      cursor: "pointer"
                    }}
                  >
                    Request Payment
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const cleanReq: PaymentRequest = {
                        id: "req_" + Date.now(),
                        date: new Date().toISOString().replace("T", " ").substring(0, 16),
                        label: "General Payment",
                        message: "Direct transfer",
                        amount: "0.00000000",
                        address: selectedIdentity.address
                      };
                      setActiveQrModal(cleanReq);
                    }}
                    style={{
                      padding: "9px 20px",
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #CBD5E1",
                      borderRadius: "3px",
                      color: "#334155",
                      fontSize: "13px",
                      cursor: "pointer"
                    }}
                  >
                    Show My Address & QR Code
                  </button>
                </div>
              </form>
            </fieldset>

            {/* Previously Requested Payments Table */}
            <fieldset
              style={{
                backgroundColor: "#FFFFFF",
                border: "1px solid #CBD5E1",
                borderRadius: "4px",
                padding: "18px 22px",
                margin: 0
              }}
            >
              <legend style={{ fontWeight: "bold", fontSize: "15px", color: "#0F172A", padding: "0 8px" }}>
                Requested Payments History
              </legend>

              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", marginTop: "8px" }}>
                <thead>
                  <tr style={{ backgroundColor: "#F8FAFC", borderBottom: "1px solid #CBD5E1", textAlign: "left", color: "#64748B" }}>
                    <th style={{ padding: "8px 12px" }}>Date</th>
                    <th style={{ padding: "8px 12px" }}>Label</th>
                    <th style={{ padding: "8px 12px" }}>Message</th>
                    <th style={{ padding: "8px 12px", textAlign: "right" }}>Amount (BUM)</th>
                    <th style={{ padding: "8px 12px", textAlign: "center" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentRequests.map((req) => (
                    <tr key={req.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                      <td style={{ padding: "8px 12px", color: "#64748B" }}>{req.date}</td>
                      <td style={{ padding: "8px 12px", fontWeight: "bold" }}>{req.label}</td>
                      <td style={{ padding: "8px 12px", color: "#475569" }}>{req.message}</td>
                      <td style={{ padding: "8px 12px", textAlign: "right", fontFamily: "monospace", fontWeight: "bold" }}>
                        {req.amount}
                      </td>
                      <td style={{ padding: "8px 12px", textAlign: "center" }}>
                        <button
                          onClick={() => setActiveQrModal(req)}
                          style={{
                            padding: "4px 10px",
                            backgroundColor: "#F1F5F9",
                            border: "1px solid #CBD5E1",
                            borderRadius: "3px",
                            fontSize: "12px",
                            cursor: "pointer"
                          }}
                        >
                          Show QR
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </fieldset>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 4: TRANSACTIONS (EXACT BITCOIN CORE QT LAYOUT)                  */}
        {/* =================================================================== */}
        {activeTab === "transactions" && (
          <fieldset
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #CBD5E1",
              borderRadius: "4px",
              padding: "18px 22px",
              margin: 0
            }}
          >
            <legend style={{ fontWeight: "bold", fontSize: "15px", color: "#0F172A", padding: "0 8px" }}>
              Transaction History
            </legend>

            {/* Filter Row */}
            <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "16px", marginTop: "6px" }}>
              <select
                value={txDateFilter}
                onChange={(e) => setTxDateFilter(e.target.value)}
                style={{ padding: "6px 10px", border: "1px solid #CBD5E1", borderRadius: "3px", fontSize: "13px" }}
              >
                <option value="all">All Dates</option>
                <option value="today">Today</option>
                <option value="this_week">This week</option>
                <option value="this_month">This month</option>
              </select>

              <select
                value={txTypeFilter}
                onChange={(e) => setTxTypeFilter(e.target.value)}
                style={{ padding: "6px 10px", border: "1px solid #CBD5E1", borderRadius: "3px", fontSize: "13px" }}
              >
                <option value="all">All Types</option>
                <option value="receive">Received with</option>
                <option value="send">Sent to</option>
                <option value="reward">Mined by</option>
              </select>

              <input
                type="number"
                value={txMinAmount}
                onChange={(e) => setTxMinAmount(e.target.value)}
                placeholder="Min amount"
                style={{ padding: "6px 10px", border: "1px solid #CBD5E1", borderRadius: "3px", fontSize: "13px", width: "110px" }}
              />

              <input
                type="text"
                value={txSearchQuery}
                onChange={(e) => setTxSearchQuery(e.target.value)}
                placeholder="Enter address or label to search..."
                style={{ flex: 1, padding: "6px 12px", border: "1px solid #CBD5E1", borderRadius: "3px", fontSize: "13px" }}
              />

              <button
                onClick={() => showToast("Exported transactions.csv to disk.")}
                style={{
                  padding: "6px 14px",
                  backgroundColor: "#F1F5F9",
                  border: "1px solid #CBD5E1",
                  borderRadius: "3px",
                  fontSize: "13px",
                  cursor: "pointer"
                }}
              >
                Export...
              </button>
            </div>

            {/* Data Table */}
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ backgroundColor: "#F8FAFC", borderBottom: "1px solid #CBD5E1", textAlign: "left", color: "#64748B" }}>
                  <th style={{ padding: "10px 12px" }}>Status</th>
                  <th style={{ padding: "10px 12px" }}>Date</th>
                  <th style={{ padding: "10px 12px" }}>Type</th>
                  <th style={{ padding: "10px 12px" }}>Address / Label</th>
                  <th style={{ padding: "10px 12px", textAlign: "right" }}>Amount (BUM)</th>
                </tr>
              </thead>
              <tbody>
                {filteredTxs.map((tx) => (
                  <tr
                    key={tx.tx_id}
                    onClick={() => setSelectedTx(tx)}
                    style={{ borderBottom: "1px solid #F1F5F9", cursor: "pointer" }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "#F8FAFC")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "transparent")}
                  >
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "#059669", fontWeight: "bold" }}>
                        <IconCheck size={14} color="#059669" /> Confirmed
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px", color: "#64748B" }}>{tx.timestamp}</td>
                    <td style={{ padding: "10px 12px", fontWeight: "bold" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {tx.type === "receive" ? <IconTxIn /> : tx.type === "send" ? <IconTxOut /> : <IconTxMined />}
                        <span>{tx.type === "receive" ? "Received with" : tx.type === "send" ? "Sent to" : "Mined Block"}</span>
                      </div>
                    </td>
                    <td style={{ padding: "10px 12px", fontFamily: "monospace", color: "#334155" }}>
                      {tx.counterparty.length > 28
                        ? `${tx.counterparty.substring(0, 14)}...${tx.counterparty.substring(tx.counterparty.length - 6)}`
                        : tx.counterparty}
                    </td>
                    <td
                      style={{
                        padding: "10px 12px",
                        textAlign: "right",
                        fontFamily: "monospace",
                        fontWeight: "bold",
                        fontSize: "14px",
                        color: tx.type === "send" ? "#DC2626" : "#059669"
                      }}
                    >
                      {tx.type === "send" ? "-" : "+"}
                      {tx.amount_bum.toFixed(8)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </fieldset>
        )}

        {/* =================================================================== */}
        {/* TAB 5: DYNAMIC COMMUNITIES & CHAT                                   */}
        {/* =================================================================== */}
        {activeTab === "communities" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "260px 200px 1fr",
              height: "calc(100vh - 145px)",
              backgroundColor: "#FFFFFF",
              border: "1px solid #CBD5E1",
              borderRadius: "4px",
              overflow: "hidden"
            }}
          >
            {/* Column 1: Communities List */}
            <div style={{ backgroundColor: "#F8FAFC", borderRight: "1px solid #CBD5E1", display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  padding: "12px 14px",
                  borderBottom: "1px solid #E2E8F0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}
              >
                <span style={{ fontSize: "14px", fontWeight: "bold", color: "#0F172A" }}>Communities</span>
                <button
                  onClick={() => setShowCreateCommunityModal(true)}
                  style={{
                    padding: "4px 10px",
                    backgroundColor: "#FF6B00",
                    border: "none",
                    borderRadius: "3px",
                    color: "#FFFFFF",
                    fontSize: "12px",
                    fontWeight: "bold",
                    cursor: "pointer"
                  }}
                >
                  + Create
                </button>
              </div>

              <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
                {communities.map((comm) => {
                  const isSel = comm.id === selectedCommunityId;
                  return (
                    <div
                      key={comm.id}
                      onClick={() => {
                        setSelectedCommunityId(comm.id);
                        setActiveChannel(comm.channels[0] || "general");
                      }}
                      style={{
                        padding: "10px 12px",
                        marginBottom: "5px",
                        backgroundColor: isSel ? "#FFFFFF" : "transparent",
                        border: isSel ? "1px solid #CBD5E1" : "1px solid transparent",
                        borderRadius: "3px",
                        cursor: "pointer"
                      }}
                    >
                      <div style={{ fontSize: "13px", fontWeight: isSel ? "bold" : "600", color: "#0F172A" }}>
                        {comm.name}
                      </div>
                      <div style={{ fontSize: "11px", color: "#64748B", display: "flex", justifyContent: "space-between", marginTop: "3px" }}>
                        <span>{comm.memberCount} members</span>
                        <span>{comm.isPrivate ? "🔒 Private" : "🌐 Public"}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Column 2: Channels in Selected Community */}
            <div style={{ backgroundColor: "#FFFFFF", borderRight: "1px solid #CBD5E1", display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  padding: "12px 14px",
                  borderBottom: "1px solid #E2E8F0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}
              >
                <span style={{ fontSize: "14px", fontWeight: "bold", color: "#0F172A" }}>Channels</span>
                <button
                  onClick={() => setShowAddChannelModal(true)}
                  style={{
                    padding: "3px 8px",
                    backgroundColor: "#F1F5F9",
                    border: "1px solid #CBD5E1",
                    borderRadius: "3px",
                    fontSize: "11px",
                    cursor: "pointer"
                  }}
                >
                  + Add
                </button>
              </div>

              <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
                {activeCommunity.channels.map((ch) => {
                  const isAct = activeChannel === ch;
                  return (
                    <div
                      key={ch}
                      onClick={() => setActiveChannel(ch)}
                      style={{
                        padding: "7px 10px",
                        marginBottom: "3px",
                        backgroundColor: isAct ? "#EFF6FF" : "transparent",
                        border: isAct ? "1px solid #BFDBFE" : "1px solid transparent",
                        borderRadius: "3px",
                        fontSize: "13px",
                        fontWeight: isAct ? "bold" : "normal",
                        color: isAct ? "#1D4ED8" : "#334155",
                        cursor: "pointer"
                      }}
                    >
                      #{ch}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Column 3: Chat Feed & Realtime Input */}
            <div style={{ display: "flex", flexDirection: "column", backgroundColor: "#F8FAFC" }}>
              {/* Channel Header */}
              <div
                style={{
                  padding: "12px 18px",
                  backgroundColor: "#FFFFFF",
                  borderBottom: "1px solid #E2E8F0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}
              >
                <div>
                  <span style={{ fontSize: "14px", fontWeight: "bold", color: "#0F172A" }}>
                    {activeCommunity.name} &gt; #{activeChannel}
                  </span>
                  <div style={{ fontSize: "12px", color: "#64748B", marginTop: "2px" }}>{activeCommunity.description}</div>
                </div>
                <span
                  style={{
                    fontSize: "11px",
                    backgroundColor: "#ECFDF5",
                    color: "#065F46",
                    padding: "3px 8px",
                    borderRadius: "3px",
                    fontWeight: "bold",
                    border: "1px solid #A7F3D0"
                  }}
                >
                  🔒 E2EE Encrypted
                </span>
              </div>

              {/* Message Feed */}
              <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
                {messages
                  .filter((m) => m.communityId === selectedCommunityId && m.channel === activeChannel)
                  .map((msg) => (
                    <div
                      key={msg.id}
                      style={{
                        backgroundColor: "#FFFFFF",
                        border: "1px solid #E2E8F0",
                        borderRadius: "4px",
                        padding: "10px 14px"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                        <span style={{ fontSize: "12px", fontWeight: "bold", color: "#0F172A" }}>
                          {msg.senderAlias}
                        </span>
                        <span style={{ fontSize: "11px", color: "#94A3B8" }}>{msg.timestamp}</span>
                      </div>
                      <div style={{ fontSize: "14px", color: "#334155", lineHeight: "1.5" }}>{msg.content}</div>
                    </div>
                  ))}
              </div>

              {/* Send Box */}
              <form onSubmit={handleSendMessage} style={{ padding: "12px 16px", backgroundColor: "#FFFFFF", borderTop: "1px solid #E2E8F0", display: "flex", gap: "10px" }}>
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
                    borderRadius: "3px",
                    fontSize: "13px"
                  }}
                />
                <button
                  type="submit"
                  style={{
                    padding: "9px 20px",
                    backgroundColor: "#FF6B00",
                    border: "1px solid #EA580C",
                    borderRadius: "3px",
                    color: "#FFFFFF",
                    fontWeight: "bold",
                    fontSize: "13px",
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
        {/* TAB 6: NODE & DEBUG (BITCOIN CORE DEBUG WINDOW)                     */}
        {/* =================================================================== */}
        {activeTab === "debug" && (
          <fieldset
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #CBD5E1",
              borderRadius: "4px",
              padding: "18px 22px",
              margin: 0
            }}
          >
            <legend style={{ fontWeight: "bold", fontSize: "15px", color: "#0F172A", padding: "0 8px" }}>
              BlockBum Core Debug Window
            </legend>

            {/* Sub Tabs */}
            <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid #CBD5E1", paddingBottom: "8px", marginBottom: "16px" }}>
              {[
                { id: "info", label: "Information" },
                { id: "console", label: "Console" },
                { id: "network", label: "Peers & Network" },
                { id: "modes", label: "Client Execution Modes" }
              ].map((st) => (
                <button
                  key={st.id}
                  onClick={() => setDebugSubTab(st.id as any)}
                  style={{
                    padding: "6px 14px",
                    backgroundColor: debugSubTab === st.id ? "#0F172A" : "#F8FAFC",
                    border: "1px solid #CBD5E1",
                    borderRadius: "3px",
                    color: debugSubTab === st.id ? "#FFFFFF" : "#334155",
                    fontSize: "13px",
                    fontWeight: debugSubTab === st.id ? "bold" : "normal",
                    cursor: "pointer"
                  }}
                >
                  {st.label}
                </button>
              ))}
            </div>

            {/* Information Sub-tab */}
            {debugSubTab === "info" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", fontSize: "13px" }}>
                <div>
                  <h4 style={{ margin: "0 0 10px 0", color: "#64748B", fontSize: "14px" }}>General Information</h4>
                  <div style={{ lineHeight: "1.9" }}>
                    <div><strong>Client name:</strong> BlockBum Core Desktop Qt Edition</div>
                    <div><strong>User Agent:</strong> /BlockBum:1.0.0(Windows; x64)/</div>
                    <div><strong>Consensus Engine:</strong> BlockBum Dynamic Difficulty PoW</div>
                    <div><strong>Founder & Architect:</strong> Abhiram</div>
                  </div>
                </div>
                <div>
                  <h4 style={{ margin: "0 0 10px 0", color: "#64748B", fontSize: "14px" }}>Blockchain State</h4>
                  <div style={{ lineHeight: "1.9" }}>
                    <div><strong>Current number of blocks:</strong> #{nodeStatus.chain_height.toLocaleString()}</div>
                    <div><strong>Best block hash:</strong> <code style={{ fontSize: "12px" }}>{nodeStatus.tip_hash.substring(0, 24)}...</code></div>
                    <div><strong>Mempool transactions:</strong> {nodeStatus.mempool_tx_count} transactions</div>
                    <div><strong>Verification progress:</strong> 100.00%</div>
                  </div>
                </div>
              </div>
            )}

            {/* Console Sub-tab */}
            {debugSubTab === "console" && (
              <div>
                <div
                  style={{
                    height: "190px",
                    backgroundColor: "#0F172A",
                    color: "#34D399",
                    padding: "12px",
                    borderRadius: "3px",
                    fontFamily: "monospace",
                    fontSize: "13px",
                    overflowY: "auto",
                    marginBottom: "10px"
                  }}
                >
                  {consoleOutput.map((l, i) => (
                    <div key={i} style={{ color: l.startsWith(">") ? "#F59E0B" : "#34D399" }}>{l}</div>
                  ))}
                </div>
                <form onSubmit={handleExecuteRpc} style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="text"
                    value={rpcCommand}
                    onChange={(e) => setRpcCommand(e.target.value)}
                    placeholder="Type RPC command (e.g. getblockchaininfo, getpeerinfo, help)..."
                    style={{ flex: 1, padding: "7px 12px", fontFamily: "monospace", fontSize: "13px", border: "1px solid #CBD5E1", borderRadius: "3px" }}
                  />
                  <button
                    type="submit"
                    style={{ padding: "7px 16px", backgroundColor: "#0F172A", color: "#FFFFFF", border: "none", borderRadius: "3px", fontSize: "13px", cursor: "pointer" }}
                  >
                    Execute
                  </button>
                </form>
              </div>
            )}

            {/* Peers Sub-tab */}
            {debugSubTab === "network" && (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ backgroundColor: "#F8FAFC", borderBottom: "1px solid #CBD5E1", textAlign: "left", color: "#64748B" }}>
                    <th style={{ padding: "8px 10px" }}>Peer Address</th>
                    <th style={{ padding: "8px 10px" }}>Direction</th>
                    <th style={{ padding: "8px 10px" }}>Ping</th>
                    <th style={{ padding: "8px 10px" }}>Height</th>
                    <th style={{ padding: "8px 10px" }}>Version</th>
                  </tr>
                </thead>
                <tbody>
                  {peers.map((p, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid #F1F5F9" }}>
                      <td style={{ padding: "8px 10px", fontFamily: "monospace", fontWeight: "bold" }}>{p.ip}</td>
                      <td style={{ padding: "8px 10px" }}>{p.type}</td>
                      <td style={{ padding: "8px 10px" }}>{p.latency}</td>
                      <td style={{ padding: "8px 10px", fontFamily: "monospace" }}>#{p.height}</td>
                      <td style={{ padding: "8px 10px", color: "#64748B" }}>{p.version}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Modes Sub-tab */}
            {debugSubTab === "modes" && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px" }}>
                {[
                  { id: "full_node" as ClientExecutionMode, title: "Full Sovereign Node", desc: "Validates 100% of blocks and state transitions from Genesis. Highest zero-trust security." },
                  { id: "light_client" as ClientExecutionMode, title: "Lightweight (SPV)", desc: "Downloads 92-byte block headers. Verifies transactions using cryptographic Merkle inclusion proofs." },
                  { id: "pruned_node" as ClientExecutionMode, title: "Pruned Node", desc: "Full sovereign validation from genesis, but discards historical raw blocks past rolling 2,000 blocks (~5GB cap)." }
                ].map((m) => {
                  const isCur = clientMode === m.id;
                  return (
                    <div
                      key={m.id}
                      onClick={() => handleSetClientMode(m.id)}
                      style={{
                        padding: "14px",
                        borderRadius: "4px",
                        border: isCur ? "2px solid #D4AF37" : "1px solid #CBD5E1",
                        backgroundColor: isCur ? "#FFFDF5" : "#F8FAFC",
                        cursor: "pointer"
                      }}
                    >
                      <div style={{ fontWeight: "bold", fontSize: "14px", color: "#0F172A", marginBottom: "6px" }}>
                        {m.title} {isCur && "✓ Active"}
                      </div>
                      <p style={{ fontSize: "12px", color: "#475569", margin: 0, lineHeight: "1.4" }}>{m.desc}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </fieldset>
        )}
      </div>

      {/* ===================================================================== */}
      {/* BITCOIN CORE QT STATUS BAR (BOTTOM)                                   */}
      {/* ===================================================================== */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "5px 14px",
          backgroundColor: "#F1F5F9",
          borderTop: "1px solid #CBD5E1",
          fontSize: "12px",
          color: "#475569",
          userSelect: "none"
        }}
      >
        {/* Left: Sync Progress */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "#059669", fontWeight: "bold" }}>
            <IconCheck size={14} color="#059669" /> Synchronized with network
          </span>
          <span style={{ color: "#94A3B8" }}>|</span>
          <span>Block #{nodeStatus.chain_height.toLocaleString()}</span>
        </div>

        {/* Right: Icons (Connections, Mode, Vault Lock) */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }} title="8 active connections to BlockBum network">
            <IconSignal size={15} color="#475569" /> 8 peers
          </span>
          <span
            onClick={() => {
              const nextMode: ClientExecutionMode =
                clientMode === "full_node" ? "light_client" : clientMode === "light_client" ? "pruned_node" : "full_node";
              handleSetClientMode(nextMode);
            }}
            style={{ cursor: "pointer", fontWeight: "bold", color: "#B8860B", display: "flex", alignItems: "center", gap: "6px" }}
            title="Click to toggle execution mode"
          >
            <IconShield size={15} color="#B8860B" /> {clientMode === "full_node" ? "Full Node" : clientMode === "light_client" ? "SPV Mode" : "Pruned"}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "5px" }} title="Wallet is encrypted and currently unlocked">
            <IconLock size={15} color="#059669" /> Unlocked
          </span>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* MODAL: QR CODE & PAYMENT REQUEST DETAILS                              */}
      {/* ===================================================================== */}
      {activeQrModal && (
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
          onClick={() => setActiveQrModal(null)}
        >
          <div
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #CBD5E1",
              borderRadius: "4px",
              padding: "24px 28px",
              width: "520px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.18)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 14px 0", fontSize: "16px", fontWeight: "bold", color: "#0F172A" }}>
              Payment Information
            </h3>

            <div style={{ display: "flex", gap: "20px", alignItems: "center", marginBottom: "16px" }}>
              <div>{renderQrSvg(activeQrModal.address, 150)}</div>
              <div style={{ flex: 1, fontSize: "13px", lineHeight: "1.7" }}>
                <div><strong>URI:</strong> <code style={{ fontSize: "11px", wordBreak: "break-all" }}>blockbum:{activeQrModal.address}</code></div>
                <div><strong>Address:</strong> <code style={{ fontSize: "11px", wordBreak: "break-all" }}>{activeQrModal.address}</code></div>
                <div><strong>Amount:</strong> {activeQrModal.amount} BUM</div>
                <div><strong>Label:</strong> {activeQrModal.label}</div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(`blockbum:${activeQrModal.address}?amount=${activeQrModal.amount}`);
                  showToast("URI copied to clipboard.");
                }}
                style={{ padding: "7px 14px", backgroundColor: "#F1F5F9", border: "1px solid #CBD5E1", borderRadius: "3px", fontSize: "12px", cursor: "pointer" }}
              >
                Copy URI
              </button>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(activeQrModal.address);
                  showToast("Address copied to clipboard.");
                }}
                style={{ padding: "7px 14px", backgroundColor: "#F1F5F9", border: "1px solid #CBD5E1", borderRadius: "3px", fontSize: "12px", cursor: "pointer" }}
              >
                Copy Address
              </button>
              <button
                onClick={() => setActiveQrModal(null)}
                style={{ padding: "7px 16px", backgroundColor: "#0F172A", border: "none", color: "#FFFFFF", borderRadius: "3px", fontSize: "12px", fontWeight: "bold", cursor: "pointer" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: CREATE COMMUNITY                                               */}
      {/* ===================================================================== */}
      {showCreateCommunityModal && (
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
          onClick={() => setShowCreateCommunityModal(false)}
        >
          <div
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #CBD5E1",
              borderRadius: "4px",
              padding: "24px 28px",
              width: "480px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.18)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 14px 0", fontSize: "16px", fontWeight: "bold", color: "#0F172A" }}>
              + Create New Community
            </h3>
            <form onSubmit={handleCreateCommunity}>
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", color: "#64748B", marginBottom: "4px" }}>
                  Community Name:
                </label>
                <input
                  type="text"
                  value={newCommName}
                  onChange={(e) => setNewCommName(e.target.value)}
                  placeholder="e.g. DeFi Builders Guild"
                  required
                  autoFocus
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #CBD5E1", borderRadius: "3px", fontSize: "13px", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", color: "#64748B", marginBottom: "4px" }}>
                  Description:
                </label>
                <input
                  type="text"
                  value={newCommDesc}
                  onChange={(e) => setNewCommDesc(e.target.value)}
                  placeholder="Brief summary of this peer community"
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #CBD5E1", borderRadius: "3px", fontSize: "13px", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", color: "#64748B", marginBottom: "4px" }}>
                  Initial Channels (comma separated):
                </label>
                <input
                  type="text"
                  value={newCommChannels}
                  onChange={(e) => setNewCommChannels(e.target.value)}
                  placeholder="general, announcements, trading"
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #CBD5E1", borderRadius: "3px", fontSize: "13px", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ fontSize: "13px", display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={newCommIsPrivate}
                    onChange={(e) => setNewCommIsPrivate(e.target.checked)}
                  />
                  <span>Private Community (invite only / encrypted membership)</span>
                </label>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setShowCreateCommunityModal(false)}
                  style={{ padding: "8px 16px", backgroundColor: "#FFFFFF", border: "1px solid #CBD5E1", borderRadius: "3px", fontSize: "13px", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: "8px 20px", backgroundColor: "#FF6B00", border: "1px solid #EA580C", color: "#FFFFFF", borderRadius: "3px", fontSize: "13px", fontWeight: "bold", cursor: "pointer" }}
                >
                  Create Community
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: ADD CHANNEL                                                    */}
      {/* ===================================================================== */}
      {showAddChannelModal && (
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
          onClick={() => setShowAddChannelModal(false)}
        >
          <div
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #CBD5E1",
              borderRadius: "4px",
              padding: "24px 28px",
              width: "400px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.18)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 14px 0", fontSize: "16px", fontWeight: "bold", color: "#0F172A" }}>
              + Add Channel to {activeCommunity.name}
            </h3>
            <form onSubmit={handleAddChannel}>
              <div style={{ marginBottom: "18px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", color: "#64748B", marginBottom: "4px" }}>
                  Channel Name:
                </label>
                <input
                  type="text"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder="e.g. trading or miners"
                  required
                  autoFocus
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #CBD5E1", borderRadius: "3px", fontSize: "13px", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setShowAddChannelModal(false)}
                  style={{ padding: "7px 14px", backgroundColor: "#FFFFFF", border: "1px solid #CBD5E1", borderRadius: "3px", fontSize: "13px", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: "7px 18px", backgroundColor: "#FF6B00", border: "1px solid #EA580C", color: "#FFFFFF", borderRadius: "3px", fontSize: "13px", fontWeight: "bold", cursor: "pointer" }}
                >
                  Add Channel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: SEND CONFIRMATION DIALOG (BITCOIN CORE STYLE)                  */}
      {/* ===================================================================== */}
      {showSendConfirmModal && (
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
          onClick={() => setShowSendConfirmModal(false)}
        >
          <div
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #CBD5E1",
              borderRadius: "4px",
              padding: "24px 28px",
              width: "500px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.18)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 12px 0", fontSize: "16px", fontWeight: "bold", color: "#0F172A" }}>
              Confirm Transaction
            </h3>
            <p style={{ margin: "0 0 16px 0", fontSize: "13px", color: "#475569" }}>
              Are you sure you want to broadcast this transaction to the BlockBum network?
            </p>

            <div style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0", padding: "14px", borderRadius: "3px", fontSize: "13px", lineHeight: "1.7", marginBottom: "18px" }}>
              <div><strong>Amount:</strong> <span style={{ color: "#DC2626", fontWeight: "bold" }}>{parseFloat(sendAmount || "0").toFixed(8)} BUM</span></div>
              <div><strong>Network Fee:</strong> {sendFeeRate.toFixed(8)} BUM</div>
              <div><strong>Recipient:</strong> <code style={{ fontSize: "12px", wordBreak: "break-all" }}>{sendToAddress}</code></div>
              {sendLabel && <div><strong>Label:</strong> {sendLabel}</div>}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setShowSendConfirmModal(false)}
                style={{ padding: "8px 16px", backgroundColor: "#FFFFFF", border: "1px solid #CBD5E1", borderRadius: "3px", fontSize: "13px", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteSend}
                style={{ padding: "8px 20px", backgroundColor: "#FF6B00", border: "1px solid #EA580C", color: "#FFFFFF", borderRadius: "3px", fontSize: "13px", fontWeight: "bold", cursor: "pointer" }}
              >
                Yes, Broadcast Transaction
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: TRANSACTION DETAILS                                            */}
      {/* ===================================================================== */}
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
              borderRadius: "4px",
              padding: "24px 28px",
              width: "540px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.18)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 14px 0", fontSize: "16px", fontWeight: "bold", color: "#0F172A" }}>
              Transaction Details
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px" }}>
              <div>
                <strong style={{ color: "#64748B" }}>TxID:</strong>
                <div style={{ fontFamily: "monospace", wordBreak: "break-all", backgroundColor: "#F8FAFC", padding: "8px", borderRadius: "3px", marginTop: "4px" }}>
                  {selectedTx.tx_id}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <strong style={{ color: "#64748B" }}>Amount:</strong>
                  <div style={{ fontSize: "15px", fontWeight: "bold", color: selectedTx.type === "send" ? "#DC2626" : "#059669" }}>
                    {selectedTx.amount_bum.toFixed(8)} BUM
                  </div>
                </div>
                <div>
                  <strong style={{ color: "#64748B" }}>Network Fee:</strong>
                  <div>{selectedTx.fee_bum.toFixed(8)} BUM</div>
                </div>
                <div>
                  <strong style={{ color: "#64748B" }}>Block Height:</strong>
                  <div>#{selectedTx.block_height}</div>
                </div>
                <div>
                  <strong style={{ color: "#64748B" }}>Confirmations:</strong>
                  <div style={{ color: "#059669", fontWeight: "bold" }}>12 Confirmations</div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: "18px", textAlign: "right" }}>
              <button
                onClick={() => setSelectedTx(null)}
                style={{ padding: "7px 18px", backgroundColor: "#0F172A", border: "none", color: "#FFFFFF", borderRadius: "3px", fontSize: "13px", cursor: "pointer" }}
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
