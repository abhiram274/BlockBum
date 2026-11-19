export interface NodeStatus {
  status: "online" | "offline" | "connecting";
  node_url: string;
  chain_height: number;
  peers_connected: number;
  network: string;
  tip_hash: string;
}

export interface WalletIdentity {
  alias: string;
  address: string;
  balance_bum: number;
  nonce: number;
}

export interface TransactionRecord {
  tx_id: string;
  type: "send" | "receive" | "reward";
  counterparty: string;
  amount_bum: number;
  fee_bum: number;
  timestamp: string;
}

export interface Community {
  id: string;
  name: string;
  description: string;
  isPrivate: boolean;
  memberCount: number;
  channels: string[];
}

export interface MessageItem {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
  isE2EE: boolean;
}

export interface SharedFileItem {
  cid: string;
  name: string;
  size_kb: number;
  uploader: string;
  timestamp: string;
}
