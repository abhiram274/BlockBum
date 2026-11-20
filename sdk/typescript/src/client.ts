import { NodeInfo, BlockDetails, AccountInfo, TransactionSummary, FaucetResult, SendTransferParams } from './types.js';
import { calculateMinimumFee, toHex } from './crypto.js';
import { WalletIdentity } from './wallet.js';

export class BlockBumClient {
  private rpcUrl: string;

  constructor(rpcUrl = 'http://localhost:9000') {
    this.rpcUrl = rpcUrl.replace(/\/$/, '');
  }

  /**
   * Query general node status, peer count, and current chain height
   */
  public async getNodeInfo(): Promise<NodeInfo> {
    const res = await this.callRest<NodeInfo>('/api/v1/node/info');
    return res;
  }

  /**
   * Fetch confirmed block by height
   */
  public async getBlockByHeight(height: number): Promise<BlockDetails> {
    return this.callRest<BlockDetails>(`/api/v1/blocks/${height}`);
  }

  /**
   * Fetch confirmed block by block hash
   */
  public async getBlockByHash(hash: string): Promise<BlockDetails> {
    return this.callRest<BlockDetails>(`/api/v1/blocks/${hash}`);
  }

  /**
   * Inspect account balance and sequence nonce
   */
  public async getAccount(address: string): Promise<AccountInfo> {
    return this.callRest<AccountInfo>(`/api/v1/account/${address}`);
  }

  /**
   * Query transaction summary by transaction ID
   */
  public async getTransaction(txId: string): Promise<TransactionSummary> {
    return this.callRest<TransactionSummary>(`/api/v1/tx/${txId}`);
  }

  /**
   * Request rate-limited testnet tokens from the node faucet
   */
  public async requestFaucet(address: string): Promise<FaucetResult> {
    return this.callRest<FaucetResult>('/api/v1/faucet', 'POST', {
      address,
      timestamp: Math.floor(Date.now() / 1000)
    });
  }

  /**
   * Estimate minimum recommended network fee for a given payload size
   */
  public estimateFee(payloadSizeBytes = 0): number {
    return calculateMinimumFee(payloadSizeBytes);
  }

  /**
   * Generic JSON-RPC 2.0 invocation
   */
  public async callRpc<T>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    const payload = {
      jsonrpc: '2.0',
      id: String(Date.now()),
      method,
      params
    };

    const response = await fetch(`${this.rpcUrl}/rpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`RPC HTTP error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(`JSON-RPC Error [${data.error.code}]: ${data.error.message}`);
    }

    return data.result as T;
  }

  private async callRest<T>(endpoint: string, method = 'GET', body?: unknown): Promise<T> {
    const options: RequestInit = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${this.rpcUrl}${endpoint}`, options);
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`REST Error [${response.status}]: ${errText}`);
    }

    return response.json() as Promise<T>;
  }
}
