export interface NodeStatus {
  status: "online" | "offline" | "connecting";
  node_url: string;
  chain_height: number;
  peers_connected: number;
  network: string;
  tip_hash: string;
  mempool_tx_count: number;
  consensus_mode: string;
  avg_latency_ms: number;
}

export interface WalletIdentity {
  alias: string;
  address: string;
  public_key: string;
  balance_bum: number;
  nonce: number;
  recovery_phrase: string;
}

export interface TransactionRecord {
  tx_id: string;
  type: "send" | "receive" | "reward";
  counterparty: string;
  amount_bum: number;
  fee_bum: number;
  timestamp: string;
  status: "confirmed" | "pending";
}

export interface GovernanceProposal {
  id: string;
  title: string;
  proposer: string;
  votesFor: number;
  votesAgainst: number;
  status: "active" | "passed";
}

export interface CodingChallenge {
  id: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  reward_bum: number;
  participants: number;
  deadline: string;
}

export interface CommunityEvent {
  id: string;
  title: string;
  date: string;
  attendees: number;
  speaker: string;
}

export interface Community {
  id: string;
  name: string;
  description: string;
  isPrivate: boolean;
  memberCount: number;
  myRole: "Owner" | "Admin" | "Member" | "Guest";
  channels: string[];
  governanceProposals: GovernanceProposal[];
  codingChallenges: CodingChallenge[];
  events: CommunityEvent[];
}

export interface MessageItem {
  id: string;
  communityId: string;
  channel: string;
  sender: string;
  senderAlias: string;
  content: string;
  timestamp: string;
  isE2EE: boolean;
  deliveryAck: boolean;
}

export interface SharedFileItem {
  cid: string;
  name: string;
  size_kb: number;
  uploader: string;
  timestamp: string;
  chunks_count: number;
  encryption_status: "AES-256-GCM / SHA-256 Verified";
  isPublic: boolean;
}
