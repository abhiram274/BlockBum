import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  SafeAreaView,
  StatusBar,
  Alert
} from "react-native";

export default function MobileApp() {
  const [activeTab, setActiveTab] = useState<"wallet" | "messages" | "communities" | "devices" | "settings">("wallet");
  const [balance, setBalance] = useState<number>(520.45);
  const [recipient, setRecipient] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [showPairModal, setShowPairModal] = useState<boolean>(false);
  const [clientMode, setClientMode] = useState<"light" | "full">("light");
  const [biometricsEnabled, setBiometricsEnabled] = useState<boolean>(true);

  // Address in Bech32 BlockBum format
  const myAddress = "bb1a729e8c40b82194017de8bf019abcdef0123456";

  const handleSend = () => {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0 || !recipient.startsWith("bb1")) {
      Alert.alert("Invalid Input", "Please enter a valid recipient address (bb1...) and positive BUM amount.");
      return;
    }
    if (val + 0.001 > balance) {
      Alert.alert("Insufficient Balance", "Insufficient funds for transfer and 0.001 BUM network fee.");
      return;
    }

    setBalance(balance - (val + 0.001));
    Alert.alert("Transfer Broadcast", `Successfully sent ${val} BUM to ${recipient.substring(0, 16)}... via node RPC.`);
    setRecipient("");
    setAmount("");
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#090d16" />

      {/* TOP MOBILE APP BAR */}
      <View style={styles.appBar}>
        <View style={styles.brandRow}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>BB</Text>
          </View>
          <View>
            <Text style={styles.brandTitle}>BlockBum Mobile</Text>
            <Text style={styles.brandSubtitle}>
              {clientMode === "light" ? "● SPV Light Client (Instant)" : "● Full Node (Validating)"}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => setShowQrModal(true)}
          style={styles.qrButton}
          accessibilityLabel="Show Receive QR Code"
        >
          <Text style={styles.qrButtonText}>Receive</Text>
        </TouchableOpacity>
      </View>

      {/* BODY CONTENT BY TAB */}
      <ScrollView style={styles.contentScroll} contentContainerStyle={styles.scrollPadding}>
        {/* TAB 1: WALLET */}
        {activeTab === "wallet" && (
          <View>
            {/* Balance Card */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Available Balance</Text>
              <Text style={styles.balanceValue}>{balance.toFixed(4)} BUM</Text>
              <Text style={styles.balanceFiat}>~ ${(balance * 1.5).toFixed(2)} USD (Testnet Valuation)</Text>
              <View style={styles.addressBox}>
                <Text style={styles.addressLabel}>Your Profile Address:</Text>
                <Text style={styles.addressText} numberOfLines={1}>{myAddress}</Text>
              </View>
            </View>

            {/* Quick Send Form */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Send Digital Value</Text>
              <TextInput
                style={styles.input}
                placeholder="Recipient Address (bb1...)"
                placeholderTextColor="#64748b"
                value={recipient}
                onChangeText={setRecipient}
                autoCapitalize="none"
              />
              <TextInput
                style={styles.input}
                placeholder="Amount (BUM)"
                placeholderTextColor="#64748b"
                keyboardType="decimal-pad"
                value={amount}
                onChangeText={setAmount}
              />
              <Text style={styles.feeHint}>Estimated network fee: 0.001 BUM (~$0.002)</Text>
              <TouchableOpacity style={styles.primaryButton} onPress={handleSend}>
                <Text style={styles.primaryButtonText}>Send BUM</Text>
              </TouchableOpacity>
            </View>

            {/* Activity History */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
              <View style={styles.txRow}>
                <View>
                  <Text style={styles.txReceive}>↓ Received 50.0 BUM</Text>
                  <Text style={styles.txMeta}>From Genesis Subsidy · Block #147</Text>
                </View>
                <Text style={styles.txStatus}>Confirmed</Text>
              </View>
              <View style={styles.txRow}>
                <View>
                  <Text style={styles.txSend}>↑ Sent 15.0 BUM</Text>
                  <Text style={styles.txMeta}>To bb1d9812f8a4290... · Block #140</Text>
                </View>
                <Text style={styles.txStatus}>Confirmed</Text>
              </View>
            </View>
          </View>
        )}

        {/* TAB 2: MESSAGES */}
        {activeTab === "messages" && (
          <View>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>End-to-End Encrypted Chats</Text>
              <Text style={styles.bodyMuted}>Double Ratchet forward secrecy guarantees complete privacy across all your messages.</Text>
            </View>
            <View style={styles.chatCard}>
              <View style={styles.chatRow}>
                <Text style={styles.chatSender}>Bob (Node Operator)</Text>
                <Text style={styles.chatTime}>10:15 AM · 🔒</Text>
              </View>
              <Text style={styles.chatPreview}>The mobile client synced headers in under 200 milliseconds!</Text>
            </View>
          </View>
        )}

        {/* TAB 3: COMMUNITIES */}
        {activeTab === "communities" && (
          <View>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Decentralized Communities</Text>
              <Text style={styles.bodyMuted}>Join topic-based channels, vote on on-chain governance, and solve challenges.</Text>
            </View>
            <View style={styles.commCard}>
              <Text style={styles.commName}>🏛️ C++ & Systems Lab</Text>
              <Text style={styles.commDesc}>188 members · #general #benchmarks #code-reviews</Text>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => Alert.alert("Joined Channel", "Now following #general channel.")}
              >
                <Text style={styles.secondaryButtonText}>Open Channels</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* TAB 4: DEVICES */}
        {activeTab === "devices" && (
          <View>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Multi-Device Sessions</Text>
              <Text style={styles.bodyMuted}>Your cryptographic identity is securely shared across authorized desktop and mobile devices.</Text>
              <TouchableOpacity style={styles.primaryButton} onPress={() => setShowPairModal(true)}>
                <Text style={styles.primaryButtonText}>+ Pair New Device</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.deviceCard}>
              <Text style={styles.deviceName}>📱 Mobile (This Device - Android/iOS)</Text>
              <Text style={styles.deviceStatus}>● Authorized · Biometric Hardware Keystore</Text>
            </View>
            <View style={styles.deviceCard}>
              <Text style={styles.deviceName}>🪟 Windows 11 Workstation</Text>
              <Text style={styles.deviceStatus}>● Authorized · Active 2 hours ago</Text>
            </View>
          </View>
        )}

        {/* TAB 5: SETTINGS */}
        {activeTab === "settings" && (
          <View>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Node & Protocol Mode</Text>
              <TouchableOpacity
                style={[styles.modeToggle, clientMode === "light" && styles.modeActive]}
                onPress={() => setClientMode("light")}
              >
                <Text style={styles.modeTitle}>Lightweight Client (SPV)</Text>
                <Text style={styles.modeSub}>Verifies block headers and Merkle proofs via RPC. Instant sync, minimal battery usage.</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeToggle, clientMode === "full" && styles.modeActive]}
                onPress={() => setClientMode("full")}
              >
                <Text style={styles.modeTitle}>Full Node Mode</Text>
                <Text style={styles.modeSub}>Validates all transactions locally. Highest security, higher bandwidth.</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Security & Biometrics</Text>
              <TouchableOpacity
                style={styles.switchRow}
                onPress={() => setBiometricsEnabled(!biometricsEnabled)}
              >
                <Text style={styles.switchLabel}>Biometric Unlock (Face ID / Fingerprint)</Text>
                <Text style={styles.switchVal}>{biometricsEnabled ? "Enabled" : "Disabled"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* BOTTOM NAVIGATION BAR */}
      <View style={styles.bottomNav}>
        {[
          { id: "wallet", label: "Wallet", icon: "💳" },
          { id: "messages", label: "Chats", icon: "💬" },
          { id: "communities", label: "Communities", icon: "🏛️" },
          { id: "devices", label: "Devices", icon: "📱" },
          { id: "settings", label: "Settings", icon: "⚙️" }
        ].map(tab => (
          <TouchableOpacity
            key={tab.id}
            onPress={() => setActiveTab(tab.id as any)}
            style={styles.navItem}
          >
            <Text style={styles.navIcon}>{tab.icon}</Text>
            <Text style={[styles.navLabel, activeTab === tab.id && styles.navLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* RECEIVE MODAL */}
      <Modal visible={showQrModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Receive BUM</Text>
            <View style={styles.qrPlaceholder}>
              <Text style={styles.qrIcon}>📱 QR CODE</Text>
            </View>
            <Text style={styles.modalSub}>{myAddress}</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={() => setShowQrModal(false)}>
              <Text style={styles.primaryButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* PAIR DEVICE MODAL */}
      <Modal visible={showPairModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Pair New Device</Text>
            <Text style={styles.bodyMuted}>Point your camera at the QR code displayed on your desktop or secondary mobile device.</Text>
            <View style={styles.qrPlaceholder}>
              <Text style={styles.qrIcon}>📷 CAMERA SCANNER ACTIVE</Text>
            </View>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => {
                setShowPairModal(false);
                Alert.alert("Pairing Verified", "Cryptographic authorization token exchanged and signed.");
              }}
            >
              <Text style={styles.primaryButtonText}>Simulate Pairing Code</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#090d16"
  },
  appBar: {
    height: 64,
    backgroundColor: "#0f172a",
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#0284c7",
    justifyContent: "center",
    alignItems: "center"
  },
  logoText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16
  },
  brandTitle: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16
  },
  brandSubtitle: {
    color: "#38bdf8",
    fontSize: 11
  },
  qrButton: {
    backgroundColor: "#0284c7",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6
  },
  qrButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12
  },
  contentScroll: {
    flex: 1
  },
  scrollPadding: {
    padding: 16,
    gap: 16
  },
  card: {
    backgroundColor: "#0f172a",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1e293b",
    padding: 16,
    marginBottom: 16
  },
  cardLabel: {
    color: "#94a3b8",
    fontSize: 12,
    textTransform: "uppercase"
  },
  balanceValue: {
    color: "#38bdf8",
    fontSize: 32,
    fontWeight: "900",
    marginVertical: 4
  },
  balanceFiat: {
    color: "#94a3b8",
    fontSize: 13,
    marginBottom: 12
  },
  addressBox: {
    backgroundColor: "#090d16",
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#1e293b"
  },
  addressLabel: {
    color: "#94a3b8",
    fontSize: 11,
    marginBottom: 2
  },
  addressText: {
    color: "#38bdf8",
    fontSize: 12,
    fontFamily: "monospace"
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12
  },
  input: {
    backgroundColor: "#090d16",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 8,
    color: "#fff",
    padding: 12,
    fontSize: 14,
    marginBottom: 10
  },
  feeHint: {
    color: "#94a3b8",
    fontSize: 12,
    marginBottom: 12
  },
  primaryButton: {
    backgroundColor: "#0284c7",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center"
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14
  },
  txRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b"
  },
  txReceive: {
    color: "#4ade80",
    fontWeight: "bold",
    fontSize: 14
  },
  txSend: {
    color: "#f87171",
    fontWeight: "bold",
    fontSize: 14
  },
  txMeta: {
    color: "#94a3b8",
    fontSize: 11
  },
  txStatus: {
    color: "#4ade80",
    fontSize: 12
  },
  chatCard: {
    backgroundColor: "#0f172a",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1e293b"
  },
  chatRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4
  },
  chatSender: {
    color: "#38bdf8",
    fontWeight: "bold"
  },
  chatTime: {
    color: "#94a3b8",
    fontSize: 11
  },
  chatPreview: {
    color: "#e2e8f0",
    fontSize: 13
  },
  bodyMuted: {
    color: "#94a3b8",
    fontSize: 13,
    marginBottom: 12
  },
  commCard: {
    backgroundColor: "#0f172a",
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1e293b"
  },
  commName: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
    marginBottom: 4
  },
  commDesc: {
    color: "#94a3b8",
    fontSize: 12,
    marginBottom: 12
  },
  secondaryButton: {
    backgroundColor: "#1e293b",
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: "center"
  },
  secondaryButtonText: {
    color: "#38bdf8",
    fontWeight: "600",
    fontSize: 13
  },
  deviceCard: {
    backgroundColor: "#0f172a",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1e293b",
    marginBottom: 10
  },
  deviceName: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
    marginBottom: 4
  },
  deviceStatus: {
    color: "#4ade80",
    fontSize: 12
  },
  modeToggle: {
    backgroundColor: "#090d16",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10
  },
  modeActive: {
    borderColor: "#38bdf8"
  },
  modeTitle: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
    marginBottom: 2
  },
  modeSub: {
    color: "#94a3b8",
    fontSize: 12
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10
  },
  switchLabel: {
    color: "#fff",
    fontSize: 14
  },
  switchVal: {
    color: "#4ade80",
    fontWeight: "bold",
    fontSize: 14
  },
  bottomNav: {
    height: 60,
    backgroundColor: "#0f172a",
    borderTopWidth: 1,
    borderTopColor: "#1e293b",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center"
  },
  navItem: {
    alignItems: "center"
  },
  navIcon: {
    fontSize: 18,
    marginBottom: 2
  },
  navLabel: {
    color: "#94a3b8",
    fontSize: 10
  },
  navLabelActive: {
    color: "#38bdf8",
    fontWeight: "bold"
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20
  },
  modalContent: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#0f172a",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155"
  },
  modalTitle: {
    color: "#38bdf8",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16
  },
  modalSub: {
    color: "#94a3b8",
    fontSize: 11,
    fontFamily: "monospace",
    marginVertical: 12,
    textAlign: "center"
  },
  qrPlaceholder: {
    width: 160,
    height: 160,
    backgroundColor: "#1e293b",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155"
  },
  qrIcon: {
    color: "#38bdf8",
    fontSize: 13,
    fontWeight: "bold",
    textAlign: "center"
  }
});
