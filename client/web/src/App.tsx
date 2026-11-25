import React, { useState } from "react";

export const App: React.FC = () => {
  const [isGuest, setIsGuest] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"explore" | "wallet" | "channels" | "governance" | "nodes">("explore");
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [seedPhrase, setSeedPhrase] = useState<string>("");
  const [balance, setBalance] = useState<number>(0);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showPairModal, setShowPairModal] = useState<boolean>(false);
  const [highContrast, setHighContrast] = useState<boolean>(false);

  // Transfer state
  const [recipient, setRecipient] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [transferStatus, setTransferStatus] = useState<string>("");

  const handleCreateBrowserAccount = () => {
    // Generate simulated in-browser Ed25519 identity matching BlockBum Bech32 format
    const words = [
      "harbor", "gravity", "orbit", "crystal", "quantum", "breeze",
      "mountain", "timber", "silver", "rapid", "velvet", "shield"
    ];
    const generatedPhrase = words.join(" ");
    const generatedAddress = "bb1web" + Math.random().toString(16).substring(2, 18) + "42918bc";

    setSeedPhrase(generatedPhrase);
    setWalletAddress(generatedAddress);
    setBalance(25.0); // Testnet faucet welcome credit
    setIsGuest(false);
    setShowCreateModal(true);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0 || !recipient.startsWith("bb1")) {
      setTransferStatus("Please enter a valid recipient address (bb1...) and amount.");
      return;
    }
    if (val + 0.001 > balance) {
      setTransferStatus("Insufficient BUM balance.");
      return;
    }

    setBalance(balance - (val + 0.001));
    setTransferStatus(`Success! Broadcast tx to ${recipient.substring(0, 16)}... via RPC.`);
    setRecipient("");
    setAmount("");
  };

  const themeBg = highContrast ? "#000000" : "#090d16";
  const themeCard = highContrast ? "#121212" : "#0f172a";
  const themeBorder = highContrast ? "#ffffff" : "#1e293b";
  const themeText = highContrast ? "#ffffff" : "#f1f5f9";
  const themePrimary = highContrast ? "#00ffff" : "#38bdf8";

  return (
    <div style={{ backgroundColor: themeBg, color: themeText, minHeight: "100vh", fontFamily: "Segoe UI, sans-serif" }}>
      {/* NAVBAR */}
      <header style={{ height: "64px", borderBottom: `1px solid ${themeBorder}`, padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: themeCard }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "linear-gradient(135deg, #0284c7, #38bdf8)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "1.2rem", color: "#fff" }}>
            BB
          </div>
          <div>
            <div style={{ fontWeight: "bold", fontSize: "1.1rem" }}>BlockBum Web Portal</div>
            <div style={{ fontSize: "0.75rem", color: themePrimary }}>Zero-Install Browser Onboarding</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button
            onClick={() => setHighContrast(!highContrast)}
            style={{ background: "none", border: `1px solid ${themeBorder}`, color: themeText, padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "0.8rem" }}
          >
            {highContrast ? "Standard Contrast" : "High Contrast"}
          </button>

          {isGuest ? (
            <button
              onClick={handleCreateBrowserAccount}
              style={{ backgroundColor: "#0284c7", color: "#fff", border: "none", padding: "8px 18px", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}
            >
              Create Account in 1-Click
            </button>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "0.85rem", color: "#4ade80", fontWeight: "bold" }}>● {balance.toFixed(2)} BUM</span>
              <button
                onClick={() => setShowPairModal(true)}
                style={{ backgroundColor: "#1e293b", color: themePrimary, border: `1px solid ${themeBorder}`, padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "0.8rem" }}
              >
                Link to Desktop/Mobile
              </button>
            </div>
          )}
        </div>
      </header>

      {/* SUB-HEADER / TAB NAV */}
      <div style={{ borderBottom: `1px solid ${themeBorder}`, padding: "0 32px", backgroundColor: themeBg, display: "flex", gap: "24px" }}>
        {[
          { id: "explore", label: "🌟 Explore Communities" },
          { id: "channels", label: "💬 Public Channels" },
          { id: "governance", label: "🏛️ Technical Governance (BBIPs)" },
          { id: "wallet", label: "💳 Web Wallet" },
          { id: "nodes", label: "🌐 Live Network Mesh" }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            style={{
              padding: "14px 4px",
              background: "none",
              border: "none",
              borderBottom: activeTab === t.id ? `2px solid ${themePrimary}` : "2px solid transparent",
              color: activeTab === t.id ? themePrimary : "#94a3b8",
              fontWeight: activeTab === t.id ? "bold" : "500",
              cursor: "pointer",
              fontSize: "0.95rem"
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* HERO BANNER FOR GUESTS */}
      {isGuest && (
        <div style={{ padding: "32px", background: "linear-gradient(180deg, rgba(2, 132, 199, 0.15) 0%, transparent 100%)", borderBottom: `1px solid ${themeBorder}`, textAlign: "center" }}>
          <h1 style={{ margin: "0 0 10px 0", fontSize: "2.2rem", fontWeight: "900" }}>Welcome to BlockBum Decentralized Mesh</h1>
          <p style={{ color: "#94a3b8", maxWidth: "680px", margin: "0 auto 20px auto", lineHeight: "1.6" }}>
            Experience censorship-resistant community discussions, open protocol proposals, and peer-to-peer transfers directly in your web browser. No blockchain expertise required.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: "16px" }}>
            <button
              onClick={handleCreateBrowserAccount}
              style={{ padding: "12px 28px", backgroundColor: "#0284c7", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", fontSize: "1rem" }}
            >
              Get Started (Zero Setup)
            </button>
            <button
              onClick={() => setActiveTab("governance")}
              style={{ padding: "12px 24px", backgroundColor: "#1e293b", color: themePrimary, border: `1px solid ${themeBorder}`, borderRadius: "8px", fontWeight: "bold", cursor: "pointer", fontSize: "1rem" }}
            >
              Read Improvement Proposals
            </button>
          </div>
        </div>
      )}

      {/* MAIN CONTAINER */}
      <main style={{ padding: "32px", maxWidth: "1200px", margin: "0 auto" }}>
        {/* EXPLORE COMMUNITIES */}
        {activeTab === "explore" && (
          <div>
            <h2 style={{ margin: "0 0 20px 0" }}>Featured Open Communities</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "24px" }}>
              <div style={{ backgroundColor: themeCard, borderRadius: "12px", border: `1px solid ${themeBorder}`, padding: "24px" }}>
                <span style={{ fontSize: "0.8rem", color: "#4ade80", fontWeight: "bold" }}>PUBLIC COMMUNITY · 188 MEMBERS</span>
                <h3 style={{ margin: "8px 0" }}>C++ & Systems Lab</h3>
                <p style={{ color: "#94a3b8", fontSize: "0.9rem", lineHeight: "1.5", marginBottom: "16px" }}>
                  Low-latency systems programming, C++20 core node development, peer-to-peer wire framing, and memory safety benchmarks.
                </p>
                <button
                  onClick={() => setActiveTab("channels")}
                  style={{ width: "100%", padding: "10px", backgroundColor: "#1e293b", color: themePrimary, border: `1px solid ${themeBorder}`, borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}
                >
                  Explore Discussions
                </button>
              </div>

              <div style={{ backgroundColor: themeCard, borderRadius: "12px", border: `1px solid ${themeBorder}`, padding: "24px" }}>
                <span style={{ fontSize: "0.8rem", color: themePrimary, fontWeight: "bold" }}>OPEN PROTOCOL GUILD · 240 PARTICIPANTS</span>
                <h3 style={{ margin: "8px 0" }}>Decentralized Web Developers</h3>
                <p style={{ color: "#94a3b8", fontSize: "0.9rem", lineHeight: "1.5", marginBottom: "16px" }}>
                  Building decentralized applications, cross-platform mobile tools, and community frontends powered by BlockBum JSON-RPC 2.0.
                </p>
                <button
                  onClick={() => setActiveTab("channels")}
                  style={{ width: "100%", padding: "10px", backgroundColor: "#1e293b", color: themePrimary, border: `1px solid ${themeBorder}`, borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}
                >
                  Explore Discussions
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CHANNELS */}
        {activeTab === "channels" && (
          <div style={{ backgroundColor: themeCard, borderRadius: "12px", border: `1px solid ${themeBorder}`, padding: "24px" }}>
            <h2 style={{ margin: "0 0 16px 0" }}>#general — C++ & Systems Lab</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "24px" }}>
              <div style={{ padding: "12px", backgroundColor: "#1e293b", borderRadius: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ fontWeight: "bold", color: themePrimary }}>David_Kernel</span>
                  <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>10:45 AM</span>
                </div>
                <div>Headers-first synchronization is achieving 98% bandwidth reduction on the multi-bootstrap cluster.</div>
              </div>
              <div style={{ padding: "12px", backgroundColor: "#1e293b", borderRadius: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ fontWeight: "bold", color: "#4ade80" }}>Alice_Researcher</span>
                  <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>10:48 AM</span>
                </div>
                <div>The Web Crypto and SPV light client implementations allow zero-install browser participants to read verified blocks seamlessly.</div>
              </div>
            </div>
            {isGuest ? (
              <div style={{ textAlign: "center", padding: "16px", backgroundColor: "#090d16", borderRadius: "8px", border: `1px dashed ${themeBorder}` }}>
                <p style={{ color: "#94a3b8", margin: "0 0 10px 0" }}>Create an instant account to join the conversation and post messages.</p>
                <button
                  onClick={handleCreateBrowserAccount}
                  style={{ padding: "8px 20px", backgroundColor: "#0284c7", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}
                >
                  Create Account
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", gap: "12px" }}>
                <input
                  type="text"
                  placeholder="Type a message to #general..."
                  style={{ flex: 1, padding: "12px", backgroundColor: "#090d16", border: `1px solid ${themeBorder}`, borderRadius: "8px", color: "#fff" }}
                />
                <button
                  onClick={() => alert("Message signed and broadcast via node RPC relay.")}
                  style={{ padding: "12px 24px", backgroundColor: "#0284c7", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}
                >
                  Post
                </button>
              </div>
            )}
          </div>
        )}

        {/* GOVERNANCE */}
        {activeTab === "governance" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <h2 style={{ margin: "0 0 8px 0" }}>BlockBum Improvement Proposals (BBIP)</h2>
            <p style={{ color: "#94a3b8", margin: "0 0 16px 0" }}>Open technical proposals governing consensus, protocol upgrades, and ecosystem grants.</p>
            <div style={{ backgroundColor: themeCard, borderRadius: "12px", border: `1px solid ${themeBorder}`, padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0, color: themePrimary }}>BBIP-0001: BlockBum Improvement Proposal Process</h3>
                <span style={{ fontSize: "0.8rem", color: "#4ade80", backgroundColor: "#064e3b", padding: "4px 10px", borderRadius: "12px" }}>Active Standard</span>
              </div>
              <p style={{ color: "#94a3b8", fontSize: "0.9rem", margin: "10px 0 0 0" }}>
                Specifies the formalized multi-stage workflow (Draft, Review, Last Call, Final) for open technical modifications without central gatekeeping.
              </p>
            </div>

            <div style={{ backgroundColor: themeCard, borderRadius: "12px", border: `1px solid ${themeBorder}`, padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0, color: themePrimary }}>BBIP-0002: Dynamic Proof-of-Retrievability Challenges</h3>
                <span style={{ fontSize: "0.8rem", color: "#38bdf8", backgroundColor: "#0c4a6e", padding: "4px 10px", borderRadius: "12px" }}>Under Review</span>
              </div>
              <p style={{ color: "#94a3b8", fontSize: "0.9rem", margin: "10px 0 0 0" }}>
                Cryptographic availability verification algorithm enforcing decentralized storage integrity through periodic unforgeable proof challenges.
              </p>
            </div>
          </div>
        )}

        {/* WALLET */}
        {activeTab === "wallet" && (
          <div>
            <h2 style={{ margin: "0 0 16px 0" }}>Browser Web Wallet</h2>
            {isGuest ? (
              <div style={{ backgroundColor: themeCard, borderRadius: "12px", border: `1px solid ${themeBorder}`, padding: "40px", textAlign: "center" }}>
                <div style={{ fontSize: "3rem", marginBottom: "12px" }}>💳</div>
                <h3>No Account Linked in Browser</h3>
                <p style={{ color: "#94a3b8", maxWidth: "480px", margin: "0 auto 20px auto" }}>
                  Create a new wallet in one click or import an existing recovery phrase to send BUM and manage your profile.
                </p>
                <button
                  onClick={handleCreateBrowserAccount}
                  style={{ padding: "12px 28px", backgroundColor: "#0284c7", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}
                >
                  Create Account Now
                </button>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                <div style={{ backgroundColor: themeCard, borderRadius: "12px", border: `1px solid ${themeBorder}`, padding: "24px" }}>
                  <div style={{ color: "#94a3b8", fontSize: "0.85rem", textTransform: "uppercase" }}>Balance</div>
                  <div style={{ fontSize: "2.4rem", fontWeight: "bold", color: themePrimary, margin: "8px 0" }}>
                    {balance.toFixed(2)} BUM
                  </div>
                  <div style={{ color: "#94a3b8", fontSize: "0.85rem", marginBottom: "16px" }}>Address:</div>
                  <code style={{ color: "#4ade80", wordBreak: "break-all", fontSize: "0.85rem" }}>{walletAddress}</code>
                </div>

                <div style={{ backgroundColor: themeCard, borderRadius: "12px", border: `1px solid ${themeBorder}`, padding: "24px" }}>
                  <h3 style={{ margin: "0 0 16px 0" }}>Transfer BUM</h3>
                  <form onSubmit={handleSend} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <input
                      type="text"
                      placeholder="Recipient (bb1...)"
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value)}
                      style={{ padding: "10px", backgroundColor: "#090d16", border: `1px solid ${themeBorder}`, borderRadius: "6px", color: "#fff" }}
                    />
                    <input
                      type="number"
                      step="0.001"
                      placeholder="Amount (BUM)"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      style={{ padding: "10px", backgroundColor: "#090d16", border: `1px solid ${themeBorder}`, borderRadius: "6px", color: "#fff" }}
                    />
                    {transferStatus && <div style={{ fontSize: "0.85rem", color: "#38bdf8" }}>{transferStatus}</div>}
                    <button
                      type="submit"
                      style={{ padding: "12px", backgroundColor: "#0284c7", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}
                    >
                      Send Transfer
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* NODES */}
        {activeTab === "nodes" && (
          <div>
            <h2 style={{ margin: "0 0 16px 0" }}>Global Multi-Bootstrap Mesh</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
              <div style={{ backgroundColor: themeCard, borderRadius: "10px", border: `1px solid ${themeBorder}`, padding: "16px" }}>
                <div style={{ fontWeight: "bold", color: "#4ade80" }}>seed-eu-01 (Frankfurt)</div>
                <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "4px" }}>seed1.testnet.blockbum.net:9001</div>
                <div style={{ fontSize: "0.75rem", color: themePrimary, marginTop: "8px" }}>Status: Synced · Height #148</div>
              </div>
              <div style={{ backgroundColor: themeCard, borderRadius: "10px", border: `1px solid ${themeBorder}`, padding: "16px" }}>
                <div style={{ fontWeight: "bold", color: "#4ade80" }}>seed-us-01 (Virginia)</div>
                <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "4px" }}>seed2.testnet.blockbum.net:9002</div>
                <div style={{ fontSize: "0.75rem", color: themePrimary, marginTop: "8px" }}>Status: Synced · Height #148</div>
              </div>
              <div style={{ backgroundColor: themeCard, borderRadius: "10px", border: `1px solid ${themeBorder}`, padding: "16px" }}>
                <div style={{ fontWeight: "bold", color: "#4ade80" }}>seed-ap-01 (Singapore)</div>
                <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "4px" }}>seed3.testnet.blockbum.net:9003</div>
                <div style={{ fontSize: "0.75rem", color: themePrimary, marginTop: "8px" }}>Status: Synced · Height #148</div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* CREATE ACCOUNT SUCCESS MODAL */}
      {showCreateModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ backgroundColor: themeCard, border: `1px solid ${themeBorder}`, borderRadius: "16px", padding: "32px", width: "500px", maxWidth: "90%" }}>
            <h2 style={{ margin: "0 0 10px 0", color: "#4ade80" }}>Account Created Successfully!</h2>
            <p style={{ color: "#94a3b8", fontSize: "0.9rem", lineHeight: "1.5" }}>
              Your Ed25519 identity keypair has been generated locally in your browser. Below is your 12-word cryptographic recovery phrase. Save this offline:
            </p>
            <div style={{ backgroundColor: "#090d16", border: `1px solid ${themeBorder}`, borderRadius: "8px", padding: "16px", fontFamily: "monospace", color: themePrimary, lineHeight: "1.6", margin: "16px 0" }}>
              {seedPhrase}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ padding: "10px 20px", backgroundColor: "#0284c7", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}
              >
                I've Saved My Phrase
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAIRING MODAL */}
      {showPairModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ backgroundColor: themeCard, border: `1px solid ${themeBorder}`, borderRadius: "16px", padding: "32px", width: "460px", maxWidth: "90%", textAlign: "center" }}>
            <h2 style={{ margin: "0 0 10px 0", color: themePrimary }}>Link to Desktop or Mobile</h2>
            <p style={{ color: "#94a3b8", fontSize: "0.85rem", marginBottom: "20px" }}>
              Enter this ephemeral authorization pairing code into your BlockBum Desktop or Mobile app:
            </p>
            <div style={{ backgroundColor: "#090d16", border: `1px solid ${themeBorder}`, borderRadius: "8px", padding: "16px", fontFamily: "monospace", color: "#4ade80", fontSize: "1.1rem", fontWeight: "bold", marginBottom: "20px" }}>
              BBUM-WEB-{Math.random().toString(36).substring(2, 8).toUpperCase()}
            </div>
            <button
              onClick={() => setShowPairModal(false)}
              style={{ width: "100%", padding: "10px", backgroundColor: "#0284c7", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
