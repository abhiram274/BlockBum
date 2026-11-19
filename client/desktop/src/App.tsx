import React, { useState } from "react";
import { Community, CodingChallenge, MessageItem } from "./types.ts";

export const App: React.FC = () => {
  const [nodeUrl, setNodeUrl] = useState("http://127.0.0.1:8545");
  const [activeTab, setActiveTab] = useState<"communities" | "chat" | "challenges" | "files">("communities");
  const [selectedCommunity, setSelectedCommunity] = useState("rust_devs");
  const [activeChannel, setActiveChannel] = useState("general");

  const [communities] = useState<Community[]>([
    {
      id: "rust_devs",
      name: "Rust & Systems Devs",
      description: "Decentralized systems, C++20 and Rust engineering",
      isPrivate: false,
      memberCount: 142,
      channels: ["general", "code-reviews", "benchmarks"]
    },
    {
      id: "algorithms_club",
      name: "Algorithms & Competitive Coding",
      description: "Weekly collaborative coding challenges & peer learning",
      isPrivate: false,
      memberCount: 89,
      channels: ["general", "daily-challenge", "solutions"]
    },
    {
      id: "core_research",
      name: "BlockBum Core Research",
      description: "Private consensus and zero-knowledge protocol research",
      isPrivate: true,
      memberCount: 12,
      channels: ["general", "specifications"]
    }
  ]);

  const [challenges] = useState<CodingChallenge[]>([
    {
      id: "c1",
      title: "Merkle Tree Proof Verification",
      difficulty: "Medium",
      points: 150,
      description: "Implement a sparse Merkle multiproof verification algorithm in C++20."
    },
    {
      id: "c2",
      title: "P2P Stream Framer",
      difficulty: "Easy",
      points: 80,
      description: "Parse length-delimited binary wire protocol buffers with zero copy."
    }
  ]);

  const [messages, setMessages] = useState<MessageItem[]>([
    { id: "1", sender: "bb1_alice", content: "Welcome to the decentralized community channel!", timestamp: "12:04 PM" },
    { id: "2", sender: "bb1_bob", content: "Excited to collaborate on the new consensus specs.", timestamp: "12:08 PM" }
  ]);

  const [newMessage, setNewMessage] = useState("");

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    setMessages([
      ...messages,
      {
        id: Date.now().toString(),
        sender: "bb1_my_identity",
        content: newMessage,
        timestamp: "Just now"
      }
    ]);
    setNewMessage("");
  };

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", display: "flex", height: "100vh", backgroundColor: "#0f172a", color: "#f8fafc" }}>
      {/* Sidebar */}
      <div style={{ width: "260px", backgroundColor: "#1e293b", padding: "16px", display: "flex", flexDirection: "column", borderRight: "1px solid #334155" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", margin: "0 0 16px 0", color: "#38bdf8" }}>BlockBum Platform</h2>

        <div style={{ marginBottom: "16px" }}>
          <label style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Node Connection</label>
          <input
            type="text"
            value={nodeUrl}
            onChange={(e) => setNodeUrl(e.target.value)}
            style={{ width: "100%", padding: "6px", borderRadius: "4px", backgroundColor: "#0f172a", border: "1px solid #475569", color: "#fff", fontSize: "0.8rem", marginTop: "4px" }}
          />
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <button onClick={() => setActiveTab("communities")} style={{ padding: "8px", borderRadius: "6px", backgroundColor: activeTab === "communities" ? "#38bdf8" : "transparent", color: activeTab === "communities" ? "#0f172a" : "#cbd5e1", border: "none", cursor: "pointer", textAlign: "left", fontWeight: "600" }}>
            Communities
          </button>
          <button onClick={() => setActiveTab("chat")} style={{ padding: "8px", borderRadius: "6px", backgroundColor: activeTab === "chat" ? "#38bdf8" : "transparent", color: activeTab === "chat" ? "#0f172a" : "#cbd5e1", border: "none", cursor: "pointer", textAlign: "left", fontWeight: "600" }}>
            Discussions & Chat
          </button>
          <button onClick={() => setActiveTab("challenges")} style={{ padding: "8px", borderRadius: "6px", backgroundColor: activeTab === "challenges" ? "#38bdf8" : "transparent", color: activeTab === "challenges" ? "#0f172a" : "#cbd5e1", border: "none", cursor: "pointer", textAlign: "left", fontWeight: "600" }}>
            Coding Challenges
          </button>
          <button onClick={() => setActiveTab("files")} style={{ padding: "8px", borderRadius: "6px", backgroundColor: activeTab === "files" ? "#38bdf8" : "transparent", color: activeTab === "files" ? "#0f172a" : "#cbd5e1", border: "none", cursor: "pointer", textAlign: "left", fontWeight: "600" }}>
            Resources & Files
          </button>
        </nav>
      </div>

      {/* Main View Area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {activeTab === "communities" && (
          <div style={{ padding: "24px", overflowY: "auto" }}>
            <h1 style={{ fontSize: "1.5rem", marginBottom: "16px" }}>Explore Communities</h1>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
              {communities.map((c) => (
                <div key={c.id} style={{ backgroundColor: "#1e293b", padding: "16px", borderRadius: "8px", border: "1px solid #334155" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h3 style={{ margin: 0, fontSize: "1.1rem" }}>{c.name}</h3>
                    {c.isPrivate ? (
                      <span style={{ fontSize: "0.75rem", backgroundColor: "#7c2d12", color: "#fdba74", padding: "2px 6px", borderRadius: "4px" }}>Private</span>
                    ) : (
                      <span style={{ fontSize: "0.75rem", backgroundColor: "#065f46", color: "#6ee7b7", padding: "2px 6px", borderRadius: "4px" }}>Public</span>
                    )}
                  </div>
                  <p style={{ color: "#94a3b8", fontSize: "0.85rem", margin: "8px 0 16px 0" }}>{c.description}</p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.8rem", color: "#64748b" }}>{c.memberCount} members</span>
                    <button
                      onClick={() => {
                        setSelectedCommunity(c.id);
                        setActiveTab("chat");
                      }}
                      style={{ padding: "6px 12px", backgroundColor: "#0284c7", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "0.85rem" }}
                    >
                      Enter
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "chat" && (
          <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
            {/* Channel List */}
            <div style={{ width: "200px", backgroundColor: "#0f172a", borderRight: "1px solid #334155", padding: "16px" }}>
              <h4 style={{ fontSize: "0.85rem", color: "#94a3b8", textTransform: "uppercase", margin: "0 0 12px 0" }}>Channels</h4>
              {communities.find(c => c.id === selectedCommunity)?.channels.map((ch) => (
                <div
                  key={ch}
                  onClick={() => setActiveChannel(ch)}
                  style={{ padding: "6px 8px", borderRadius: "4px", cursor: "pointer", backgroundColor: activeChannel === ch ? "#1e293b" : "transparent", color: activeChannel === ch ? "#38bdf8" : "#94a3b8", marginBottom: "4px" }}
                >
                  # {ch}
                </div>
              ))}
            </div>

            {/* Chat Messages */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <div style={{ flex: 1, padding: "16px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px" }}>
                {messages.map((m) => (
                  <div key={m.id} style={{ backgroundColor: "#1e293b", padding: "12px", borderRadius: "6px", maxWidth: "80%" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ fontWeight: "bold", fontSize: "0.85rem", color: "#38bdf8" }}>{m.sender}</span>
                      <span style={{ fontSize: "0.75rem", color: "#64748b" }}>{m.timestamp}</span>
                    </div>
                    <div style={{ fontSize: "0.9rem" }}>{m.content}</div>
                  </div>
                ))}
              </div>

              {/* Message Input */}
              <form onSubmit={handleSendMessage} style={{ padding: "16px", backgroundColor: "#1e293b", borderTop: "1px solid #334155", display: "flex", gap: "8px" }}>
                <input
                  type="text"
                  placeholder={`Message #${activeChannel}... (E2EE encrypted off-chain)`}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  style={{ flex: 1, padding: "8px 12px", borderRadius: "4px", backgroundColor: "#0f172a", border: "1px solid #475569", color: "#fff" }}
                />
                <button type="submit" style={{ padding: "8px 16px", backgroundColor: "#0284c7", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}>
                  Send
                </button>
              </form>
            </div>
          </div>
        )}

        {activeTab === "challenges" && (
          <div style={{ padding: "24px", overflowY: "auto" }}>
            <h1 style={{ fontSize: "1.5rem", marginBottom: "16px" }}>Collaborative Coding Challenges</h1>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {challenges.map((ch) => (
                <div key={ch.id} style={{ backgroundColor: "#1e293b", padding: "16px", borderRadius: "8px", border: "1px solid #334155" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h3 style={{ margin: 0 }}>{ch.title}</h3>
                    <span style={{ backgroundColor: "#1e3a8a", color: "#93c5fd", padding: "4px 8px", borderRadius: "4px", fontSize: "0.8rem" }}>
                      {ch.difficulty} · {ch.points} pts
                    </span>
                  </div>
                  <p style={{ color: "#94a3b8", fontSize: "0.9rem", margin: "8px 0" }}>{ch.description}</p>
                  <button style={{ padding: "6px 12px", backgroundColor: "#10b981", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "0.85rem" }}>
                    Start Challenge
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "files" && (
          <div style={{ padding: "24px", overflowY: "auto" }}>
            <h1 style={{ fontSize: "1.5rem", marginBottom: "16px" }}>Decentralized Educational Resources</h1>
            <p style={{ color: "#94a3b8", fontSize: "0.9rem" }}>Files are verified via IPFS-compatible Content-Addressed Storage (CAS) and encrypted locally.</p>
            <div style={{ backgroundColor: "#1e293b", padding: "16px", borderRadius: "8px", border: "1px solid #334155", marginTop: "16px" }}>
              <h4>Distributed File Notes.pdf</h4>
              <p style={{ fontSize: "0.8rem", color: "#64748b" }}>Root CID: bbum_cas_a847f9810a9c8b74f01</p>
              <button style={{ padding: "6px 12px", backgroundColor: "#0284c7", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "0.85rem" }}>
                Download & Reassemble
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
