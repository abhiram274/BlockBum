import React, { useState } from "react";
import {
  NodeStatus,
  WalletIdentity,
  TransactionRecord,
  Community,
  MessageItem,
  SharedFileItem
} from "./types.ts";

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"wallet" | "messages" | "communities" | "challenges" | "files" | "network">("communities");

  // Node telemetry state
  const [nodeStatus, setNodeStatus] = useState<NodeStatus>({
    status: "online",
    node_url: "http://127.0.0.1:8545",
    chain_height: 142,
    peers_connected: 6,
    network: "BlockBum DevNet (Testnet v1.0)",
    tip_hash: "0x89fbc0120ab718c99de021a8bf92ca430182",
    mempool_tx_count: 3,
    consensus_mode: "Round-Robin PoA DevNet",
    avg_latency_ms: 24
  });
  const [inputNodeUrl, setInputNodeUrl] = useState("http://127.0.0.1:8545");

  // Multi-Identity State
  const [identities, setIdentities] = useState<WalletIdentity[]>([
    {
      alias: "Alice_Researcher",
      address: "bb1a729e8c40b82194017de8bf019",
      public_key: "0x4a91b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef12345678",
      balance_bum: 520.45,
      nonce: 5,
      recovery_phrase: "galaxy canyon timber fossil rapid orbit velvet trigger nuclear crisp hammer vivid"
    },
    {
      alias: "Bob_NodeOperator",
      address: "bb1d9812f8a429019ca5621de8821",
      public_key: "0x89abcdef1234567890abcdef1234567890abcdef1234567890abcdef12345678",
      balance_bum: 35.0,
      nonce: 2,
      recovery_phrase: "harvest puzzle vibrant harbor mountain echo thunder silver velvet trophy pulse winter"
    }
  ]);
  const [selectedIdentity, setSelectedIdentity] = useState<WalletIdentity>(identities[0]);
  const [showSeedModal, setShowSeedModal] = useState(false);

  // Transfer Form State
  const [recipient, setRecipient] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferStatus, setTransferStatus] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const [txHistory, setTxHistory] = useState<TransactionRecord[]>([
    { tx_id: "tx_91a82bf0", type: "receive", counterparty: "bb1_genesis_subsidy_pool", amount_bum: 50.0, fee_bum: 0.0, timestamp: "Today, 10:15 AM", status: "confirmed" },
    { tx_id: "tx_084cd29e", type: "send", counterparty: "bb1d9812f8a429019ca5621de8821", amount_bum: 15.0, fee_bum: 0.001, timestamp: "Yesterday, 3:20 PM", status: "confirmed" },
    { tx_id: "tx_f520ab71", type: "reward", counterparty: "Consensus Block Validator #140", amount_bum: 50.0, fee_bum: 0.003, timestamp: "Nov 19, 2026", status: "confirmed" }
  ]);

  // Communities, Governance & Challenges
  const [communities, setCommunities] = useState<Community[]>([
    {
      id: "systems_cpp",
      name: "C++ & Systems Lab",
      description: "Low-latency systems programming, C++20 core node development, and wire protocols.",
      isPrivate: false,
      memberCount: 184,
      myRole: "Member",
      channels: ["general", "code-reviews", "benchmarks", "p2p-networking"],
      governanceProposals: [
        { id: "gov_01", title: "BIP-14: Increase Max CAS Chunk Size to 512 KB", proposer: "bb1_alice", votesFor: 142, votesAgainst: 12, status: "active" },
        { id: "gov_02", title: "Establish Frankfurt Seed Node as Checkpoint Relay", proposer: "bb1_devops", votesFor: 180, votesAgainst: 3, status: "passed" }
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
      memberCount: 19,
      myRole: "Admin",
      channels: ["general", "specifications", "audit-notes", "mainnet-readiness"],
      governanceProposals: [
        { id: "gov_03", title: "Audit Verification: Commutative Diffie-Hellman Key Agreement", proposer: "bb1_security", votesFor: 18, votesAgainst: 0, status: "passed" }
      ],
      codingChallenges: [
        { id: "c3", title: "Implement Kademlia DHT Distance Routing", difficulty: "Hard", reward_bum: 750, participants: 8, deadline: "12 days left" }
      ],
      events: [
        { id: "e2", title: "Internal Security & Threat Review Call", date: "Monday, Nov 23 @ 15:00 UTC", attendees: 19, speaker: "Core Security Guild" }
      ]
    },
    {
      id: "web3_students",
      name: "Student Blockchain Guild",
      description: "Hands-on decentralized apps, smart agreements, and cryptographic primitives for university students.",
      isPrivate: false,
      memberCount: 312,
      myRole: "Member",
      channels: ["general", "introductions", "student-projects", "qa-help"],
      governanceProposals: [
        { id: "gov_04", title: "Student Grant: Allocate 5,000 tBUM for Campus Hackathon", proposer: "bb1_student_rep", votesFor: 290, votesAgainst: 5, status: "active" }
      ],
      codingChallenges: [
        { id: "c4", title: "Create a Micro-tBUM Discord Tipbot", difficulty: "Easy", reward_bum: 50, participants: 42, deadline: "Tomorrow" }
      ],
      events: [
        { id: "e3", title: "BlockBum Hackathon 2026 Kickoff", date: "Dec 1, 2026", attendees: 120, speaker: "Guest Mentors" }
      ]
    }
  ]);

  const [selectedCommunityId, setSelectedCommunityId] = useState("systems_cpp");
  const [selectedChannel, setSelectedChannel] = useState("general");
  const currentCommunity = communities.find(c => c.id === selectedCommunityId) || communities[0];

  // Messages with interactive conversation state
  const [chatMessages, setChatMessages] = useState<MessageItem[]>([
    {
      id: "m1",
      communityId: "systems_cpp",
      channel: "general",
      sender: "bb1_satya",
      senderAlias: "Satya (Node Lead)",
      content: "Welcome to the C++ & Systems Lab! Testnet nodes are fully synchronized at height #142.",
      timestamp: "10:14 AM",
      isE2EE: true,
      deliveryAck: true
    },
    {
      id: "m2",
      communityId: "systems_cpp",
      channel: "general",
      sender: "bb1_marcus",
      senderAlias: "Marcus_CPP",
      content: "All transactions are verified through the AccountLedger with atomic sequential nonce checks.",
      timestamp: "10:20 AM",
      isE2EE: true,
      deliveryAck: true
    },
    {
      id: "m3",
      communityId: "systems_cpp",
      channel: "code-reviews",
      sender: "bb1_elena",
      senderAlias: "Elena_Systems",
      content: "Reviewing PR #42: Sanitized Windows file paths in CAS chunks. Test suite passes 100%.",
      timestamp: "11:05 AM",
      isE2EE: true,
      deliveryAck: true
    },
    {
      id: "m4",
      communityId: "core_dev",
      channel: "general",
      sender: "bb1_security_lead",
      senderAlias: "Chief Auditor",
      content: "Phase 9 fuzz testing completed with 1,000 randomized malformed frames. Zero memory safety faults.",
      timestamp: "09:30 AM",
      isE2EE: true,
      deliveryAck: true
    }
  ]);
  const [inputMessage, setInputMessage] = useState("");

  // Content-Addressed Storage Files
  const [sharedFiles, setSharedFiles] = useState<SharedFileItem[]>([
    {
      cid: "bbum_cas_e841920ac3918bf0a",
      name: "BlockBum_Whitepaper_v1.0.pdf",
      size_kb: 2450,
      uploader: "Alice_Researcher",
      timestamp: "Nov 19, 2026",
      chunks_count: 10,
      encryption_status: "AES-256-GCM / SHA-256 Verified",
      isPublic: true
    },
    {
      cid: "bbum_cas_380bfe12984ab109d",
      name: "DevNet_Consensus_Audit_Report.pdf",
      size_kb: 890,
      uploader: "Bob_NodeOperator",
      timestamp: "Nov 18, 2026",
      chunks_count: 4,
      encryption_status: "AES-256-GCM / SHA-256 Verified",
      isPublic: false
    },
    {
      cid: "bbum_cas_179a04bc92048feab",
      name: "WireProtocol_Fuzz_Vectors.tar.gz",
      size_kb: 512,
      uploader: "Alice_Researcher",
      timestamp: "Today, 08:30 AM",
      chunks_count: 2,
      encryption_status: "AES-256-GCM / SHA-256 Verified",
      isPublic: true
    }
  ]);
  const [uploadNotification, setUploadNotification] = useState("");

  // Handlers
  const handleSendBum = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0 || !recipient.trim()) {
      setTransferStatus({ msg: "Please enter a valid recipient address and positive amount.", type: "error" });
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
      status: "confirmed"
    };

    setTxHistory([newTx, ...txHistory]);
    const updated = {
      ...selectedIdentity,
      balance_bum: selectedIdentity.balance_bum - totalRequired,
      nonce: selectedIdentity.nonce + 1
    };
    setSelectedIdentity(updated);
    setIdentities(identities.map(i => i.alias === updated.alias ? updated : i));

    setTransferStatus({ msg: `Transaction broadcast successfully! TxID: ${newTx.tx_id}`, type: "success" });
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

    setChatMessages([...chatMessages, newMsg]);
    setInputMessage("");
  };

  const handleVoteProposal = (communityId: string, proposalId: string, support: boolean) => {
    setCommunities(communities.map(c => {
      if (c.id !== communityId) return c;
      return {
        ...c,
        governanceProposals: c.governanceProposals.map(p => {
          if (p.id !== proposalId) return p;
          return {
            ...p,
            votesFor: support ? p.votesFor + 1 : p.votesFor,
            votesAgainst: !support ? p.votesAgainst + 1 : p.votesAgainst
          };
        })
      };
    }));
  };

  const handleCreateCommunity = () => {
    const name = prompt("Enter Community Name:");
    if (!name) return;
    const desc = prompt("Enter Description:") || "Decentralized community on BlockBum.";
    const isPriv = confirm("Should this community be private?");

    const newComm: Community = {
      id: "comm_" + Date.now(),
      name,
      description: desc,
      isPrivate: isPriv,
      memberCount: 1,
      myRole: "Owner",
      channels: ["general", "announcements"],
      governanceProposals: [],
      codingChallenges: [],
      events: []
    };

    setCommunities([newComm, ...communities]);
    setSelectedCommunityId(newComm.id);
  };

  const handleUploadFileSimulation = () => {
    const fileName = prompt("Enter file name to upload & chunk:", "Protocol_Audit_Spec.pdf");
    if (!fileName) return;

    const newFile: SharedFileItem = {
      cid: "bbum_cas_" + Math.random().toString(16).substring(2, 14),
      name: fileName,
      size_kb: Math.floor(Math.random() * 4000) + 120,
      uploader: selectedIdentity.alias,
      timestamp: "Just now",
      chunks_count: Math.floor(Math.random() * 8) + 1,
      encryption_status: "AES-256-GCM / SHA-256 Verified",
      isPublic: true
    };

    setSharedFiles([newFile, ...sharedFiles]);
    setUploadNotification(`File "${fileName}" chunked into ${newFile.chunks_count} pieces (256 KB each), encrypted locally, and stored in CAS.`);
    setTimeout(() => setUploadNotification(""), 6000);
  };

  return (
    <div style={{ fontFamily: "Segoe UI, -apple-system, BlinkMacSystemFont, Roboto, sans-serif", display: "flex", height: "100vh", backgroundColor: "#090d16", color: "#f1f5f9" }}>
      {/* SIDEBAR NAVIGATION */}
      <div style={{ width: "280px", backgroundColor: "#0f172a", borderRight: "1px solid #1e293b", display: "flex", flexDirection: "column" }}>
        {/* Brand Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #1e293b", display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: "linear-gradient(135deg, #0284c7, #38bdf8)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "900", fontSize: "1.2rem", color: "#fff" }}>
            BB
          </div>
          <div>
            <div style={{ fontWeight: "bold", fontSize: "1.1rem", letterSpacing: "0.5px" }}>BlockBum</div>
            <div style={{ fontSize: "0.75rem", color: "#38bdf8", fontWeight: "600" }}>P2P Desktop Client</div>
          </div>
        </div>

        {/* Identity Selector */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #1e293b", backgroundColor: "#0c1322" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <span style={{ fontSize: "0.7rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: "bold" }}>Active Cryptographic Identity</span>
            <button onClick={() => setShowSeedModal(true)} style={{ background: "none", border: "none", color: "#38bdf8", fontSize: "0.75rem", cursor: "pointer", padding: 0 }}>
              Backup
            </button>
          </div>
          <select
            value={selectedIdentity.alias}
            onChange={(e) => {
              const found = identities.find(i => i.alias === e.target.value);
              if (found) setSelectedIdentity(found);
            }}
            style={{ width: "100%", padding: "8px 10px", backgroundColor: "#1e293b", color: "#fff", border: "1px solid #334155", borderRadius: "6px", fontSize: "0.85rem", cursor: "pointer" }}
          >
            {identities.map(id => (
              <option key={id.alias} value={id.alias}>{id.alias} ({id.balance_bum.toFixed(1)} BUM)</option>
            ))}
          </select>
          <div style={{ fontSize: "0.7rem", color: "#64748b", marginTop: "6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            Key: {selectedIdentity.address}
          </div>
        </div>

        {/* Navigation Menu */}
        <nav style={{ padding: "16px 12px", display: "flex", flexDirection: "column", gap: "6px", flex: 1 }}>
          <button
            onClick={() => setActiveTab("communities")}
            style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", borderRadius: "8px", border: "none", backgroundColor: activeTab === "communities" ? "#0284c7" : "transparent", color: activeTab === "communities" ? "#fff" : "#94a3b8", fontWeight: "600", cursor: "pointer", textAlign: "left", fontSize: "0.9rem" }}
          >
            <span>🌐</span> Communities & Governance
          </button>
          <button
            onClick={() => setActiveTab("messages")}
            style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", borderRadius: "8px", border: "none", backgroundColor: activeTab === "messages" ? "#0284c7" : "transparent", color: activeTab === "messages" ? "#fff" : "#94a3b8", fontWeight: "600", cursor: "pointer", textAlign: "left", fontSize: "0.9rem" }}
          >
            <span>💬</span> E2EE Channels & Chat
          </button>
          <button
            onClick={() => setActiveTab("challenges")}
            style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", borderRadius: "8px", border: "none", backgroundColor: activeTab === "challenges" ? "#0284c7" : "transparent", color: activeTab === "challenges" ? "#fff" : "#94a3b8", fontWeight: "600", cursor: "pointer", textAlign: "left", fontSize: "0.9rem" }}
          >
            <span>🏆</span> Coding Challenges
          </button>
          <button
            onClick={() => setActiveTab("wallet")}
            style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", borderRadius: "8px", border: "none", backgroundColor: activeTab === "wallet" ? "#0284c7" : "transparent", color: activeTab === "wallet" ? "#fff" : "#94a3b8", fontWeight: "600", cursor: "pointer", textAlign: "left", fontSize: "0.9rem" }}
          >
            <span>💰</span> BUM Token Wallet
          </button>
          <button
            onClick={() => setActiveTab("files")}
            style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", borderRadius: "8px", border: "none", backgroundColor: activeTab === "files" ? "#0284c7" : "transparent", color: activeTab === "files" ? "#fff" : "#94a3b8", fontWeight: "600", cursor: "pointer", textAlign: "left", fontSize: "0.9rem" }}
          >
            <span>📦</span> Content Storage (CAS)
          </button>
          <button
            onClick={() => setActiveTab("network")}
            style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", borderRadius: "8px", border: "none", backgroundColor: activeTab === "network" ? "#0284c7" : "transparent", color: activeTab === "network" ? "#fff" : "#94a3b8", fontWeight: "600", cursor: "pointer", textAlign: "left", fontSize: "0.9rem" }}
          >
            <span>⚡</span> Node Telemetry
          </button>
        </nav>

        {/* Node Bottom Telemetry Pill */}
        <div style={{ padding: "14px 20px", borderTop: "1px solid #1e293b", backgroundColor: "#0c1322", fontSize: "0.8rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "#4ade80", fontWeight: "bold" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#22c55e", display: "inline-block" }}></span>
              Node Synced
            </span>
            <span style={{ color: "#94a3b8" }}>{nodeStatus.avg_latency_ms}ms</span>
          </div>
          <div style={{ color: "#64748b", fontSize: "0.75rem" }}>Height #{nodeStatus.chain_height} · {nodeStatus.peers_connected} Active Peers</div>
        </div>
      </div>

      {/* MAIN INTERACTIVE CONTENT STAGE */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* COMMUNITIES & GOVERNANCE VIEW */}
        {activeTab === "communities" && (
          <div style={{ padding: "32px", overflowY: "auto", flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <div>
                <h1 style={{ margin: 0, fontSize: "1.8rem", fontWeight: "800" }}>Community Guilds & Governance</h1>
                <p style={{ margin: "4px 0 0 0", color: "#94a3b8" }}>Discover verifiable communities with transparent on-chain governance and off-chain discussion channels.</p>
              </div>
              <button
                onClick={handleCreateCommunity}
                style={{ padding: "10px 20px", backgroundColor: "#0284c7", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
              >
                + Create Community
              </button>
            </div>

            {/* Communities Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "20px", marginBottom: "36px" }}>
              {communities.map(c => (
                <div
                  key={c.id}
                  style={{
                    backgroundColor: "#0f172a",
                    borderRadius: "12px",
                    border: selectedCommunityId === c.id ? "2px solid #38bdf8" : "1px solid #1e293b",
                    padding: "24px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between"
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                      <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: "bold" }}>{c.name}</h3>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <span style={{ fontSize: "0.7rem", padding: "3px 8px", borderRadius: "4px", backgroundColor: c.isPrivate ? "#451a03" : "#064e3b", color: c.isPrivate ? "#fdba74" : "#6ee7b7", fontWeight: "bold" }}>
                          {c.isPrivate ? "Private" : "Public"}
                        </span>
                        <span style={{ fontSize: "0.7rem", padding: "3px 8px", borderRadius: "4px", backgroundColor: "#1e293b", color: "#38bdf8", fontWeight: "bold" }}>
                          {c.myRole}
                        </span>
                      </div>
                    </div>
                    <p style={{ color: "#94a3b8", fontSize: "0.85rem", margin: "0 0 16px 0", lineHeight: "1.4" }}>{c.description}</p>
                    <div style={{ display: "flex", gap: "16px", fontSize: "0.8rem", color: "#64748b", marginBottom: "16px" }}>
                      <span>👥 {c.memberCount} Members</span>
                      <span>💬 {c.channels.length} Channels</span>
                      <span>📜 {c.governanceProposals.length} Proposals</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "10px" }}>
                    <button
                      onClick={() => {
                        setSelectedCommunityId(c.id);
                        setActiveTab("messages");
                      }}
                      style={{ flex: 1, padding: "8px 12px", backgroundColor: "#0284c7", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "bold", fontSize: "0.85rem", cursor: "pointer" }}
                    >
                      Open Channels
                    </button>
                    <button
                      onClick={() => setSelectedCommunityId(c.id)}
                      style={{ padding: "8px 12px", backgroundColor: "#1e293b", color: "#38bdf8", border: "1px solid #334155", borderRadius: "6px", fontWeight: "600", fontSize: "0.85rem", cursor: "pointer" }}
                    >
                      Inspect Governance
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Selected Community On-Chain Governance Proposals */}
            <div style={{ backgroundColor: "#0f172a", borderRadius: "12px", border: "1px solid #1e293b", padding: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: "1.3rem" }}>On-Chain Governance: {currentCommunity.name}</h2>
                  <div style={{ fontSize: "0.85rem", color: "#94a3b8" }}>Votes are attested on the BlockBum blockchain with voter key verification.</div>
                </div>
              </div>

              {currentCommunity.governanceProposals.length === 0 ? (
                <div style={{ color: "#64748b", fontSize: "0.9rem" }}>No active governance proposals in this community.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  {currentCommunity.governanceProposals.map(p => (
                    <div key={p.id} style={{ backgroundColor: "#1e293b", borderRadius: "8px", padding: "16px", border: "1px solid #334155", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontWeight: "bold", fontSize: "0.95rem" }}>{p.title}</span>
                          <span style={{ fontSize: "0.7rem", padding: "2px 6px", borderRadius: "4px", backgroundColor: p.status === "active" ? "#0284c7" : "#059669", color: "#fff" }}>
                            {p.status.toUpperCase()}
                          </span>
                        </div>
                        <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "4px" }}>
                          Proposed by <code style={{ color: "#38bdf8" }}>{p.proposer}</code> · For: {p.votesFor} · Against: {p.votesAgainst}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          onClick={() => handleVoteProposal(currentCommunity.id, p.id, true)}
                          style={{ padding: "6px 14px", backgroundColor: "#059669", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "bold", fontSize: "0.8rem", cursor: "pointer" }}
                        >
                          Vote FOR (+1)
                        </button>
                        <button
                          onClick={() => handleVoteProposal(currentCommunity.id, p.id, false)}
                          style={{ padding: "6px 14px", backgroundColor: "#dc2626", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "bold", fontSize: "0.8rem", cursor: "pointer" }}
                        >
                          Vote AGAINST
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* E2EE MESSAGES & CHANNEL CHAT VIEW */}
        {activeTab === "messages" && (
          <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
            {/* Channel List Sidebar */}
            <div style={{ width: "240px", backgroundColor: "#0f172a", borderRight: "1px solid #1e293b", display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "16px", borderBottom: "1px solid #1e293b" }}>
                <div style={{ fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: "bold" }}>Community Channels</div>
                <div style={{ fontWeight: "bold", fontSize: "1rem", color: "#38bdf8", marginTop: "2px" }}>{currentCommunity.name}</div>
              </div>
              <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "4px", flex: 1, overflowY: "auto" }}>
                {currentCommunity.channels.map(ch => (
                  <button
                    key={ch}
                    onClick={() => setSelectedChannel(ch)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "none",
                      backgroundColor: selectedChannel === ch ? "#1e293b" : "transparent",
                      color: selectedChannel === ch ? "#38bdf8" : "#94a3b8",
                      fontWeight: selectedChannel === ch ? "bold" : "normal",
                      textAlign: "left",
                      cursor: "pointer",
                      fontSize: "0.85rem"
                    }}
                  >
                    # {ch}
                  </button>
                ))}
              </div>
              <div style={{ padding: "12px", backgroundColor: "#0c1322", borderTop: "1px solid #1e293b", fontSize: "0.75rem", color: "#64748b" }}>
                🔒 Diffie-Hellman Off-Chain Forward Secrecy
              </div>
            </div>

            {/* Chat Messages Log */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", backgroundColor: "#090d16" }}>
              {/* Channel Header */}
              <div style={{ padding: "16px 24px", borderBottom: "1px solid #1e293b", backgroundColor: "#0c1322", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontWeight: "bold", fontSize: "1.1rem" }}>#{selectedChannel}</span>
                  <span style={{ fontSize: "0.8rem", color: "#94a3b8", marginLeft: "12px" }}>End-to-End Encrypted Group Channel</span>
                </div>
                <span style={{ fontSize: "0.75rem", color: "#22c55e", backgroundColor: "#052e16", padding: "4px 8px", borderRadius: "4px", border: "1px solid #166534" }}>
                  ● Off-Chain Privacy Guaranteed
                </span>
              </div>

              {/* Message Feed */}
              <div style={{ flex: 1, padding: "20px 24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px" }}>
                {chatMessages
                  .filter(m => m.communityId === selectedCommunityId && (m.channel === selectedChannel || m.channel === "general"))
                  .map(m => (
                    <div key={m.id} style={{ backgroundColor: "#0f172a", padding: "12px 16px", borderRadius: "8px", border: "1px solid #1e293b", maxWidth: "80%" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                        <span style={{ fontWeight: "bold", color: "#38bdf8", fontSize: "0.9rem" }}>{m.senderAlias}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.75rem", color: "#64748b" }}>
                          <span>{m.timestamp}</span>
                          <span>· 🔒 E2EE</span>
                          {m.deliveryAck && <span style={{ color: "#22c55e" }}>✓✓</span>}
                        </div>
                      </div>
                      <div style={{ fontSize: "0.95rem", lineHeight: "1.4", color: "#e2e8f0" }}>{m.content}</div>
                    </div>
                  ))}
              </div>

              {/* Message Composer */}
              <form onSubmit={handleSendMessage} style={{ padding: "16px 24px", backgroundColor: "#0f172a", borderTop: "1px solid #1e293b", display: "flex", gap: "12px" }}>
                <input
                  type="text"
                  placeholder={`Send an encrypted message to #${selectedChannel} as ${selectedIdentity.alias}...`}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  style={{ flex: 1, padding: "12px 16px", backgroundColor: "#090d16", border: "1px solid #334155", borderRadius: "8px", color: "#fff", fontSize: "0.9rem" }}
                />
                <button
                  type="submit"
                  style={{ padding: "12px 24px", backgroundColor: "#0284c7", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}
                >
                  Send
                </button>
              </form>
            </div>
          </div>
        )}

        {/* CODING CHALLENGES & COLLABORATIVE TASKS */}
        {activeTab === "challenges" && (
          <div style={{ padding: "32px", overflowY: "auto", flex: 1 }}>
            <h1 style={{ margin: "0 0 8px 0", fontSize: "1.8rem", fontWeight: "800" }}>Coding Challenges & Hackathons</h1>
            <p style={{ margin: "0 0 24px 0", color: "#94a3b8" }}>Participate in peer-reviewed blockchain engineering challenges and earn testnet bounty incentives.</p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "20px" }}>
              {currentCommunity.codingChallenges.map(ch => (
                <div key={ch.id} style={{ backgroundColor: "#0f172a", borderRadius: "12px", border: "1px solid #1e293b", padding: "24px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                    <h3 style={{ margin: 0, fontSize: "1.1rem" }}>{ch.title}</h3>
                    <span style={{ fontSize: "0.75rem", padding: "2px 8px", borderRadius: "4px", backgroundColor: ch.difficulty === "Easy" ? "#064e3b" : ch.difficulty === "Medium" ? "#075985" : "#7c2d12", color: "#fff", fontWeight: "bold" }}>
                      {ch.difficulty}
                    </span>
                  </div>
                  <div style={{ fontSize: "1.4rem", fontWeight: "bold", color: "#38bdf8", margin: "10px 0" }}>
                    +{ch.reward_bum} <span style={{ fontSize: "0.9rem", color: "#94a3b8" }}>tBUM Bounty</span>
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "16px" }}>
                    {ch.participants} Participants Enrolled · Deadline: {ch.deadline}
                  </div>
                  <button
                    onClick={() => alert(`Enrolled in "${ch.title}"! Clone test repo to submit your cryptographic proof.`)}
                    style={{ width: "100%", padding: "10px", backgroundColor: "#0284c7", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}
                  >
                    Enroll in Challenge
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* BUM TOKEN WALLET VIEW */}
        {activeTab === "wallet" && (
          <div style={{ padding: "32px", overflowY: "auto", flex: 1 }}>
            <h1 style={{ margin: "0 0 24px 0", fontSize: "1.8rem", fontWeight: "800" }}>Native Cryptocurrency (BUM)</h1>

            {/* Wallet Balance Hero */}
            <div style={{ backgroundColor: "#0f172a", padding: "28px", borderRadius: "16px", border: "1px solid #1e293b", marginBottom: "28px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ color: "#94a3b8", fontSize: "0.85rem", textTransform: "uppercase", fontWeight: "bold" }}>Available Account Balance</div>
                <div style={{ fontSize: "2.8rem", fontWeight: "800", color: "#38bdf8", margin: "4px 0" }}>
                  {selectedIdentity.balance_bum.toFixed(3)} <span style={{ fontSize: "1.3rem", color: "#94a3b8" }}>tBUM</span>
                </div>
                <div style={{ fontSize: "0.85rem", color: "#64748b" }}>
                  Sequential Nonce: <b>#{selectedIdentity.nonce}</b> · Account Model (Double-Spend Protected)
                </div>
              </div>
              <button
                onClick={() => {
                  const newAlias = prompt("Enter new identity alias:");
                  if (!newAlias) return;
                  const newId: WalletIdentity = {
                    alias: newAlias,
                    address: "bb1" + Math.random().toString(16).substring(2, 18),
                    public_key: "0x" + Math.random().toString(16).substring(2, 66),
                    balance_bum: 100.0,
                    nonce: 0,
                    recovery_phrase: "quantum ridge orbit velocity horizon pulse timber marble solar velvet cascade echo"
                  };
                  setIdentities([...identities, newId]);
                  setSelectedIdentity(newId);
                }}
                style={{ padding: "12px 20px", backgroundColor: "#0284c7", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}
              >
                + New Identity Keypair
              </button>
            </div>

            {/* Split: Send & History */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
              {/* Send Form */}
              <div style={{ backgroundColor: "#0f172a", padding: "24px", borderRadius: "12px", border: "1px solid #1e293b" }}>
                <h3 style={{ margin: "0 0 16px 0", fontSize: "1.2rem" }}>Send Signed Token Transfer</h3>
                <form onSubmit={handleSendBum} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div>
                    <label style={{ fontSize: "0.85rem", color: "#94a3b8", display: "block", marginBottom: "6px" }}>Recipient Address</label>
                    <input
                      type="text"
                      placeholder="bb1..."
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value)}
                      style={{ width: "100%", padding: "12px", backgroundColor: "#090d16", border: "1px solid #334155", borderRadius: "8px", color: "#fff" }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.85rem", color: "#94a3b8", display: "block", marginBottom: "6px" }}>Amount (BUM)</label>
                    <input
                      type="number"
                      step="0.001"
                      placeholder="0.000"
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                      style={{ width: "100%", padding: "12px", backgroundColor: "#090d16", border: "1px solid #334155", borderRadius: "8px", color: "#fff" }}
                    />
                    <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "4px" }}>Anti-Spam Network Fee: 0.001 tBUM</div>
                  </div>
                  <button
                    type="submit"
                    style={{ padding: "12px", backgroundColor: "#059669", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", fontSize: "0.95rem" }}
                  >
                    Sign & Broadcast Transaction
                  </button>
                  {transferStatus && (
                    <div style={{ padding: "10px", borderRadius: "6px", backgroundColor: transferStatus.type === "success" ? "#064e3b" : "#451a03", color: transferStatus.type === "success" ? "#6ee7b7" : "#fca5a5", fontSize: "0.85rem" }}>
                      {transferStatus.msg}
                    </div>
                  )}
                </form>
              </div>

              {/* Transactions Ledger */}
              <div style={{ backgroundColor: "#0f172a", padding: "24px", borderRadius: "12px", border: "1px solid #1e293b" }}>
                <h3 style={{ margin: "0 0 16px 0", fontSize: "1.2rem" }}>Recent Verified Transactions</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {txHistory.map(tx => (
                    <div key={tx.tx_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", backgroundColor: "#1e293b", borderRadius: "8px", border: "1px solid #334155" }}>
                      <div>
                        <div style={{ fontWeight: "bold", fontSize: "0.9rem" }}>{tx.type === "send" ? "Sent to" : tx.type === "receive" ? "Received from" : "Block Reward"}</div>
                        <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{tx.counterparty} · {tx.timestamp}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: "bold", color: tx.type === "send" ? "#f87171" : "#4ade80" }}>
                          {tx.type === "send" ? "-" : "+"}{tx.amount_bum.toFixed(3)} tBUM
                        </div>
                        <div style={{ fontSize: "0.7rem", color: "#64748b" }}>{tx.tx_id}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CONTENT SHARING VIEW (CAS) */}
        {activeTab === "files" && (
          <div style={{ padding: "32px", overflowY: "auto", flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div>
                <h1 style={{ margin: 0, fontSize: "1.8rem", fontWeight: "800" }}>Content-Addressed Storage (CAS)</h1>
                <p style={{ margin: "4px 0 0 0", color: "#94a3b8" }}>Files are divided into 256 KB chunks, encrypted locally, and addressed by cryptographic multihash CIDs.</p>
              </div>
              <button
                onClick={handleUploadFileSimulation}
                style={{ padding: "12px 20px", backgroundColor: "#0284c7", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}
              >
                + Chunk, Encrypt & Share File
              </button>
            </div>

            {uploadNotification && (
              <div style={{ padding: "12px 16px", borderRadius: "8px", backgroundColor: "#064e3b", color: "#6ee7b7", marginBottom: "20px", fontSize: "0.9rem" }}>
                ✓ {uploadNotification}
              </div>
            )}

            <div style={{ backgroundColor: "#0f172a", borderRadius: "12px", border: "1px solid #1e293b", overflow: "hidden" }}>
              {sharedFiles.map(file => (
                <div key={file.cid} style={{ padding: "18px 24px", borderBottom: "1px solid #1e293b", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: "bold", fontSize: "1rem" }}>{file.name}</div>
                    <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "4px" }}>
                      CID: <code style={{ color: "#38bdf8" }}>{file.cid}</code> · {file.size_kb} KB ({file.chunks_count} chunks) · Uploader: {file.uploader}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>
                      Status: 🔒 {file.encryption_status} · {file.timestamp}
                    </div>
                  </div>
                  <button
                    onClick={() => alert(`Downloading ${file.chunks_count} chunks from CAS peer mesh for ${file.name}. Verifying SHA-256 integrity commitments... Success!`)}
                    style={{ padding: "8px 16px", backgroundColor: "#1e293b", color: "#38bdf8", border: "1px solid #334155", borderRadius: "6px", fontWeight: "600", cursor: "pointer" }}
                  >
                    Retrieve & Reassemble
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* NETWORK & NODE STATUS VIEW */}
        {activeTab === "network" && (
          <div style={{ padding: "32px", overflowY: "auto", flex: 1 }}>
            <h1 style={{ margin: "0 0 24px 0", fontSize: "1.8rem", fontWeight: "800" }}>Node Telemetry & Network Health</h1>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
              {/* Gateway Connection Card */}
              <div style={{ backgroundColor: "#0f172a", padding: "24px", borderRadius: "12px", border: "1px solid #1e293b" }}>
                <h3 style={{ margin: "0 0 16px 0" }}>BlockBum Node Switcher</h3>
                <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
                  <input
                    type="text"
                    value={inputNodeUrl}
                    onChange={(e) => setInputNodeUrl(e.target.value)}
                    style={{ flex: 1, padding: "10px 14px", backgroundColor: "#090d16", border: "1px solid #334155", borderRadius: "6px", color: "#fff" }}
                  />
                  <button
                    onClick={() => {
                      setNodeStatus({
                        ...nodeStatus,
                        node_url: inputNodeUrl,
                        chain_height: nodeStatus.chain_height + 1
                      });
                      alert(`Connected to node endpoint: ${inputNodeUrl}`);
                    }}
                    style={{ padding: "10px 18px", backgroundColor: "#0284c7", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}
                  >
                    Connect
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.9rem" }}>
                  <div><span style={{ color: "#94a3b8" }}>Status:</span> <span style={{ color: "#4ade80", fontWeight: "bold" }}>● Online ({nodeStatus.status})</span></div>
                  <div><span style={{ color: "#94a3b8" }}>Consensus Engine:</span> {nodeStatus.consensus_mode}</div>
                  <div><span style={{ color: "#94a3b8" }}>Tip Block Height:</span> #{nodeStatus.chain_height}</div>
                  <div><span style={{ color: "#94a3b8" }}>Connected Peers:</span> {nodeStatus.peers_connected} nodes in mesh</div>
                  <div><span style={{ color: "#94a3b8" }}>Mempool Pending Txs:</span> {nodeStatus.mempool_tx_count} transactions</div>
                  <div><span style={{ color: "#94a3b8" }}>Wire Protocol:</span> BBUM/1.0 framing</div>
                  <div><span style={{ color: "#94a3b8" }}>Tip Block Hash:</span> <code style={{ color: "#38bdf8", wordBreak: "break-all" }}>{nodeStatus.tip_hash}</code></div>
                </div>
              </div>

              {/* Seed Node Mesh */}
              <div style={{ backgroundColor: "#0f172a", padding: "24px", borderRadius: "12px", border: "1px solid #1e293b" }}>
                <h3 style={{ margin: "0 0 16px 0" }}>Configured Multi-Bootstrap Nodes</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ padding: "12px", backgroundColor: "#1e293b", borderRadius: "8px", border: "1px solid #334155" }}>
                    <div style={{ fontWeight: "bold", color: "#38bdf8" }}>seed-eu-01 (Frankfurt)</div>
                    <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>seed1.testnet.blockbum.net:9001 · Checkpoint Consensus Relay</div>
                  </div>
                  <div style={{ padding: "12px", backgroundColor: "#1e293b", borderRadius: "8px", border: "1px solid #334155" }}>
                    <div style={{ fontWeight: "bold", color: "#38bdf8" }}>seed-us-01 (Virginia)</div>
                    <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>seed2.testnet.blockbum.net:9002 · Block Batch Propagation</div>
                  </div>
                  <div style={{ padding: "12px", backgroundColor: "#1e293b", borderRadius: "8px", border: "1px solid #334155" }}>
                    <div style={{ fontWeight: "bold", color: "#38bdf8" }}>seed-ap-01 (Singapore)</div>
                    <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>seed3.testnet.blockbum.net:9003 · Content Chunk & Mailbox Relay</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SEED PHRASE RECOVERY MODAL */}
      {showSeedModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "16px", padding: "32px", width: "520px", maxWidth: "90%" }}>
            <h2 style={{ margin: "0 0 12px 0", fontSize: "1.4rem" }}>Cryptographic Recovery Backup</h2>
            <p style={{ color: "#94a3b8", fontSize: "0.9rem", margin: "0 0 20px 0" }}>
              Your 12-word recovery seed deterministically regenerates your Ed25519 identity keypair. Never share this with anyone.
            </p>
            <div style={{ backgroundColor: "#090d16", border: "1px solid #1e293b", padding: "16px", borderRadius: "8px", fontFamily: "monospace", fontSize: "0.95rem", color: "#38bdf8", lineHeight: "1.6", marginBottom: "20px" }}>
              {selectedIdentity.recovery_phrase}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowSeedModal(false)}
                style={{ padding: "10px 20px", backgroundColor: "#0284c7", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}
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
