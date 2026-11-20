export interface NodeInfo {
  network: string;
  version: string;
  current_height: number;
  tip_hash: string;
  circulating_supply_atomic: number;
  max_supply_atomic: number;
  sync_status: string;
  peer_count: number;
}

export interface AccountInfo {
  address: string;
  balance_atomic: number;
  balance_bum: number;
  nonce: number;
}

export interface TransactionSummary {
  tx_id: string;
  sender: string;
  recipient: string;
  amount_atomic: number;
  amount_bum: number;
  fee_atomic: number;
  nonce: number;
  timestamp: number;
  payload_bytes: number;
  payload_hash: string;
  is_confidential: boolean;
}

export interface BlockDetails {
  height: number;
  block_hash: string;
  previous_hash: string;
  merkle_root: string;
  timestamp: number;
  tx_count: number;
  transactions: TransactionSummary[];
}

export interface FaucetResult {
  success: boolean;
  amount_atomic: number;
  amount_bum: number;
  tx_id: string;
  message: string;
}

export interface SendTransferParams {
  recipient: string;
  amount_bum: number;
  fee_atomic?: number;
  payload?: Uint8Array;
}
