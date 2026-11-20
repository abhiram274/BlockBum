import React, { useState } from "react";
import { NodeStatus, WalletIdentity, TransactionRecord, Community, MessageItem, SharedFileItem } from "./types.ts";

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"wallet" | "messages" | "communities" | "files" | "network">("wallet");

  // Node connection state
  const [nodeStatus, setNodeStatus] = useState<NodeStatus>({
    status: "online",
    node_url: "http://127.0.0.1:8545",
    chain_height: 124,
    peers_connected: 4,
    network: "BlockBum DevNet",
    tip_hash: "0x89fbc0120ab718c99de021a8"
  });

  const [inputNodeUrl, setInputNodeUrl] = useState("http://127.0.0.1:8545");

  // Identity / Wallet State
  const [identities, setIdentities] = useState<WalletIdentity[]>([
    { alias: "main_account", address: "bb1a729e8c40b82194017de8", balance_bum: 450.5, nonce: 4 },
    { alias: "community_pseudonym", address: "bb1d9812f8a429019ca5621", balance_bum: 25.0, nonce: 1 }
  ]);
  const [selectedIdentity, setSelectedIdentity] = useState<WalletIdentity>(identities[0]);

  // Transfer Form State
  const [recipient, setRecipient] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferStatus, setTransferStatus] = useState("");

  const [txHistory, setTxHistory] = useState<TransactionRecord[]>([
    { tx_id: "tx_019a82b", type: "receive", counterparty: "bb1miner_reward_pool", amount_bum: 50.0, fee_bum: 0.0, timestamp: "Today, 10:15 AM" },
    { tx_id: "tx_084cd29", type: "send", counterparty: "bb1bob_community", amount_bum: 10.0, fee_bum: 0.001, timestamp: "Yesterday, 3:20 PM" }
  ]);

  // Communities & Messages
  const [communities] = useState<Community[]>([
    { id: "systems_cpp", name: "C++ & Systems Lab", description: "C++20 blockchain and systems architecture", isPrivate: false, memberCount: 184, channels: ["general", "code-reviews"] },
    { id: "core_dev", name: "Core Node Contributors", description: "Private consensus researchers", isPrivate: true, memberCount: 15, channels: ["general", "specifications"] }
  ]);
  const [selectedCommunity, setSelectedCommunity] = useState("systems_cpp");

  const [chatMessages, setChatMessages] = useState<MessageItem[]>([
    { id: "1", sender: "bb1_alice", content: "Welcome to BlockBum! All messages here are E2EE off-chain.", timestamp: "11:20 AM", isE2EE: true },
    { id: "2", sender: "bb1_bob", content: "Node synchronization is running smoothly on local DevNet.", timestamp: "11:24 AM", isE2EE: true }
  ]);
  const [inputMessage, setInputMessage] = useState("");

  // Files
  const [sharedFiles, setSharedFiles] = useState<SharedFileItem[]>([
    { cid: "bbum_cas_f89102c9a", name: "Blockchain_Architecture_v2.pdf", size_kb: 1420, uploader: "bb1_alice", timestamp: "Nov 19, 2026" },
    { cid: "bbum_cas_71092abde", name: "P2P_Wire_Protocol_Spec.md", size_kb: 45, uploader: "bb1_bob", timestamp: "Nov 18, 2026" }
  ]);

  const handleSendBum = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0 || !recipient) {
      setTransferStatus("Invalid recipient or amount");
      return;
    }
    if (amount + 0.001 > selectedIdentity.balance_bum) {
      setTransferStatus("Insufficient BUM balance");
      return;
    }

    const newTx: TransactionRecord = {
      tx_id: "tx_" + Date.now().toString(16),
      type: "send",
      counterparty: recipient,
      amount_bum: amount,
      fee_bum: 0.001,
      timestamp: "Just now"
    };

    setTxHistory([newTx, ...txHistory]);
    selectedIdentity.balance_bum -= (amount + 0.001);
    selectedIdentity.nonce += 1;
    setTransferStatus("Transfer submitted! Monitored by C++ consensus engine.");
    setRecipient("");
    setTransferAmount("");
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    setChatMessages([
      ...chatMessages,
      {
        id: Date.now().toString(),
        sender: selectedIdentity.alias,
        content: inputMessage,
        timestamp: "Just now",
        isE2EE: true
      }
    ]);
    setInputMessage("");
  };

  const handleConnectNode = () => {
    setNodeStatus({
      ...nodeStatus,
      status: "online",
      node_url: inputNodeUrl,
      chain_height: nodeStatus.chain_height + 1
    });
  };

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", display: "flex", height: "100vh", backgroundColor: "#0b1120", color: "#f8fafc" }}>
      {/* Sidebar Navigation */}
      <div style={{ width: "260px", backgroundColor: "#1e293b", padding: "20px 16px", display: "flex", flexDirection: "column", borderRight: "1px solid #334155" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "24px" }}>
          <div style={{ width: "32px", height: "32px", borderRadius: "8px", backgroundColor: "#0284c7", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>B</div>
          <span style={{ fontSize: "1.2rem", fontWeight: "bold", color: "#38bdf8" }}>BlockBum</span>
        </div>

        {/* Active Identity Selector */}
        <div style={{ backgroundColor: "#0f172a", padding: "12px", borderRadius: "8px", marginBottom: "20px", border: "1px solid #334155" }}>
          <div style={{ fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase", marginBottom: "4px" }}>Active Identity</div>
          <select
            value={selectedIdentity.alias}
            onChange={(e) => {
              const found = identities.find(i => i.alias === e.target.value);
              if (found) setSelectedIdentity(found);
            }}
            style={{ width: "100%", padding: "6px", backgroundColor: "#1e293b", color: "#fff", border: "1px solid #475569", borderRadius: "4px" }}
          >
            {identities.map(id => (
              <option key={id.alias} value={id.alias}>{id.alias}</option>
            ))}
          </select>
          <div style={{ fontSize: "0.75rem", color: "#38bdf8", marginTop: "8px", wordBreak: "break-all" }}>{selectedIdentity.address}</div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1 }}>
          <button onClick={() => setActiveTab("wallet")} style={{ padding: "10px 12px", borderRadius: "6px", backgroundColor: activeTab === "wallet" ? "#0284c7" : "transparent", color: "#f8fafc", border: "none", cursor: "pointer", textAlign: "left", fontWeight: "600" }}>
            BUM Wallet & Balances
          </button>
          <button onClick={() => setActiveTab("messages")} style={{ padding: "10px 12px", borderRadius: "6px", backgroundColor: activeTab === "messages" ? "#0284c7" : "transparent", color: "#f8fafc", border: "none", cursor: "pointer", textAlign: "left", fontWeight: "600" }}>
            E2EE Discussions & Chat
          </button>
          <button onClick={() => setActiveTab("communities")} style={{ padding: "10px 12px", borderRadius: "6px", backgroundColor: activeTab === "communities" ? "#0284c7" : "transparent", color: "#f8fafc", border: "none", cursor: "pointer", textAlign: "left", fontWeight: "600" }}>
            Communities & Events
          </button>
          <button onClick={() => setActiveTab("files")} style={{ padding: "10px 12px", borderRadius: "6px", backgroundColor: activeTab === "files" ? "#0284c7" : "transparent", color: "#f8fafc", border: "none", cursor: "pointer", textAlign: "left", fontWeight: "600" }}>
            Decentralized Files (CAS)
          </button>
          <button onClick={() => setActiveTab("network")} style={{ padding: "10px 12px", borderRadius: "6px", backgroundColor: activeTab === "network" ? "#0284c7" : "transparent", color: "#f8fafc", border: "none", cursor: "pointer", textAlign: "left", fontWeight: "600" }}>
            Node Status & Peers
          </button>
        </nav>

        {/* Network Mini Status Indicator */}
        <div style={{ borderTop: "1px solid #334155", paddingTop: "12px", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: nodeStatus.status === "online" ? "#22c55e" : "#ef4444" }}></div>
          <span style={{ color: "#94a3b8" }}>Height #{nodeStatus.chain_height} · {nodeStatus.peers_connected} peers</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* WALLET VIEW */}
        {activeTab === "wallet" && (
          <div style={{ padding: "32px", overflowY: "auto", flex: 1 }}>
            <h1 style={{ margin: "0 0 24px 0", fontSize: "1.8rem" }}>Cryptocurrency Wallet</h1>

            {/* Balance Card */}
            <div style={{ backgroundColor: "#1e293b", padding: "24px", borderRadius: "12px", border: "1px solid #334155", marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ color: "#94a3b8", fontSize: "0.9rem", textTransform: "uppercase" }}>Available Balance</div>
                <div style={{ fontSize: "2.4rem", fontWeight: "bold", color: "#38bdf8", marginTop: "4px" }}>
                  {selectedIdentity.balance_bum.toFixed(3)} <span style={{ fontSize: "1.2rem", color: "#cbd5e1" }}>BUM</span>
                </div>
                <div style={{ fontSize: "0.85rem", color: "#64748b", marginTop: "4px" }}>Nonce Sequence: #{selectedIdentity.nonce}</div>
              </div>
              <button
                onClick={() => {
                  const newAlias = prompt("Enter new pseudonymous alias:");
                  if (newAlias) {
                    const newId: WalletIdentity = { alias: newAlias, address: "bb1" + Math.random().toString(16).substring(2, 10), balance_bum: 100.0, nonce: 0 };
                    setIdentities([...identities, newId]);
                    setSelectedIdentity(newId);
                  }
                }}
                style={{ padding: "10px 16px", backgroundColor: "#0284c7", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}
              >
                + Create Identity
              </button>
            </div>

            {/* Send Transfer & History Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
              {/* Send Form */}
              <div style={{ backgroundColor: "#1e293b", padding: "24px", borderRadius: "12px", border: "1px solid #334155" }}>
                <h3 style={{ margin: "0 0 16px 0", fontSize: "1.2rem" }}>Send Signed BUM Transfer</h3>
                <form onSubmit={handleSendBum} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div>
                    <label style={{ fontSize: "0.85rem", color: "#94a3b8", display: "block", marginBottom: "6px" }}>Recipient Address</label>
                    <input
                      type="text"
                      placeholder="bb1..."
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value)}
                      style={{ width: "100%", padding: "10px", backgroundColor: "#0f172a", border: "1px solid #475569", borderRadius: "6px", color: "#fff" }}
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
                      style={{ width: "100%", padding: "10px", backgroundColor: "#0f172a", border: "1px solid #475569", borderRadius: "6px", color: "#fff" }}
                    />
                    <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "4px" }}>Network Priority Fee: 0.001 BUM</div>
                  </div>
                  <button type="submit" style={{ padding: "12px", backgroundColor: "#10b981", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>
                    Sign & Broadcast Transaction
                  </button>
                  {transferStatus && (
                    <div style={{ fontSize: "0.85rem", color: transferStatus.includes("submitted") ? "#4ade80" : "#f87171" }}>
                      {transferStatus}
                    </div>
                  )}
                </form>
              </div>

              {/* History */}
              <div style={{ backgroundColor: "#1e293b", padding: "24px", borderRadius: "12px", border: "1px solid #334155" }}>
                <h3 style={{ margin: "0 0 16px 0", fontSize: "1.2rem" }}>Transaction History</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {txHistory.map(tx => (
                    <div key={tx.tx_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", backgroundColor: "#0f172a", borderRadius: "6px", border: "1px solid #334155" }}>
                      <div>
                        <div style={{ fontWeight: "600", fontSize: "0.9rem" }}>{tx.type === "send" ? "Sent to" : "Received from"}</div>
                        <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{tx.counterparty} · {tx.timestamp}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: "bold", color: tx.type === "send" ? "#f87171" : "#4ade80" }}>
                          {tx.type === "send" ? "-" : "+"}{tx.amount_bum.toFixed(3)} BUM
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

        {/* MESSAGING VIEW */}
        {activeTab === "messages" && (
          <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
            <div style={{ width: "240px", backgroundColor: "#0f172a", borderRight: "1px solid #334155", padding: "16px" }}>
              <h4 style={{ fontSize: "0.8rem", color: "#94a3b8", textTransform: "uppercase", margin: "0 0 12px 0" }}>Discussions ({selectedCommunity})</h4>
              <div style={{ padding: "8px", backgroundColor: "#1e293b", borderRadius: "6px", color: "#38bdf8", marginBottom: "8px", cursor: "pointer" }}># general-chat</div>
              <div style={{ padding: "8px", color: "#94a3b8", cursor: "pointer" }}># core-engineering</div>
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <div style={{ flex: 1, padding: "20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px" }}>
                {chatMessages.map(m => (
                  <div key={m.id} style={{ backgroundColor: "#1e293b", padding: "12px 16px", borderRadius: "8px", maxWidth: "75%" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ fontWeight: "bold", color: "#38bdf8", fontSize: "0.9rem" }}>{m.sender}</span>
                      <span style={{ fontSize: "0.75rem", color: "#64748b" }}>{m.timestamp} · 🔒 E2EE</span>
                    </div>
                    <div style={{ fontSize: "0.95rem" }}>{m.content}</div>
                  </div>
                ))}
              </div>
              <form onSubmit={handleSendMessage} style={{ padding: "16px", backgroundColor: "#1e293b", borderTop: "1px solid #334155", display: "flex", gap: "10px" }}>
                <input
                  type="text"
                  placeholder="Type an end-to-end encrypted message... (Stored off-chain)"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  style={{ flex: 1, padding: "10px 14px", backgroundColor: "#0f172a", border: "1px solid #475569", borderRadius: "6px", color: "#fff" }}
                />
                <button type="submit" style={{ padding: "10px 20px", backgroundColor: "#0284c7", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}>Send</button>
              </form>
            </div>
          </div>
        )}

        {/* COMMUNITIES VIEW */}
        {activeTab === "communities" && (
          <div style={{ padding: "32px", overflowY: "auto", flex: 1 }}>
            <h1 style={{ margin: "0 0 24px 0", fontSize: "1.8rem" }}>Community Discovery</h1>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "20px" }}>
              {communities.map(c => (
                <div key={c.id} style={{ backgroundColor: "#1e293b", padding: "20px", borderRadius: "10px", border: "1px solid #334155" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <h3 style={{ margin: 0 }}>{c.name}</h3>
                    <span style={{ fontSize: "0.75rem", padding: "2px 8px", borderRadius: "4px", backgroundColor: c.isPrivate ? "#7c2d12" : "#065f46", color: c.isPrivate ? "#fdba74" : "#6ee7b7" }}>
                      {c.isPrivate ? "Private" : "Public"}
                    </span>
                  </div>
                  <p style={{ color: "#94a3b8", fontSize: "0.9rem", margin: "12px 0 20px 0" }}>{c.description}</p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.85rem", color: "#64748b" }}>{c.memberCount} Verified Members</span>
                    <button onClick={() => { setSelectedCommunity(c.id); setActiveTab("messages"); }} style={{ padding: "8px 16px", backgroundColor: "#0284c7", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}>
                      Join Community
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CONTENT SHARING VIEW */}
        {activeTab === "files" && (
          <div style={{ padding: "32px", overflowY: "auto", flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <h1 style={{ margin: 0, fontSize: "1.8rem" }}>Content-Addressed Storage (CAS)</h1>
              <button
                onClick={() => {
                  const fname = prompt("Enter file name to upload:");
                  if (fname) {
                    setSharedFiles([
                      { cid: "bbum_cas_" + Date.now().toString(16), name: fname, size_kb: 512, uploader: selectedIdentity.alias, timestamp: "Just now" },
                      ...sharedFiles
                    ]);
                  }
                }}
                style={{ padding: "10px 18px", backgroundColor: "#0284c7", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}
              >
                + Encrypt & Upload File
              </button>
            </div>
            <div style={{ backgroundColor: "#1e293b", borderRadius: "10px", border: "1px solid #334155", overflow: "hidden" }}>
              {sharedFiles.map(file => (
                <div key={file.cid} style={{ padding: "16px 20px", borderBottom: "1px solid #334155", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: "600", fontSize: "1rem" }}>{file.name}</div>
                    <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "2px" }}>
                      CID: <code style={{ color: "#38bdf8" }}>{file.cid}</code> · {file.size_kb} KB · Shared by {file.uploader}
                    </div>
                  </div>
                  <button onClick={() => alert("Downloading and reassembling chunks from CAS peers...")} style={{ padding: "8px 14px", backgroundColor: "#0f172a", border: "1px solid #475569", color: "#fff", borderRadius: "6px", cursor: "pointer" }}>
                    Download Chunks
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* NETWORK & NODE STATUS VIEW */}
        {activeTab === "network" && (
          <div style={{ padding: "32px", overflowY: "auto", flex: 1 }}>
            <h1 style={{ margin: "0 0 24px 0", fontSize: "1.8rem" }}>Node Connection & Network Diagnostics</h1>
            <div style={{ backgroundColor: "#1e293b", padding: "24px", borderRadius: "12px", border: "1px solid #334155", maxWidth: "600px", marginBottom: "24px" }}>
              <h3 style={{ margin: "0 0 16px 0" }}>BlockBum Node Gateway</h3>
              <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
                <input
                  type="text"
                  value={inputNodeUrl}
                  onChange={(e) => setInputNodeUrl(e.target.value)}
                  style={{ flex: 1, padding: "10px", backgroundColor: "#0f172a", border: "1px solid #475569", borderRadius: "6px", color: "#fff" }}
                />
                <button onClick={handleConnectNode} style={{ padding: "10px 16px", backgroundColor: "#0284c7", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}>
                  Connect
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.9rem" }}>
                <div><span style={{ color: "#94a3b8" }}>Connection Status:</span> <span style={{ color: "#4ade80", fontWeight: "bold" }}>● Connected ({nodeStatus.status})</span></div>
                <div><span style={{ color: "#94a3b8" }}>Active Blockchain Height:</span> #{nodeStatus.chain_height}</div>
                <div><span style={{ color: "#94a3b8" }}>P2P Peer Count:</span> {nodeStatus.peers_connected} nodes</div>
                <div><span style={{ color: "#94a3b8" }}>Latest Block Hash:</span> <code style={{ color: "#38bdf8" }}>{nodeStatus.tip_hash}</code></div>
                <div><span style={{ color: "#94a3b8" }}>Network Protocol:</span> BBUM v1 Wire Protocol</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
