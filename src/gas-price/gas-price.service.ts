import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

import { JsonRpcProvider } from 'ethers';

import { FeeDataLike, ProviderLike, GasPriceSnapshot } from './gas-price.types';

@Injectable()
export class GasPriceService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GasPriceService.name);
  private provider: ProviderLike | null = null;
  private pollTimer: NodeJS.Timeout | null = null;
  private latest: GasPriceSnapshot | null = null;

  // Poll every N ms to keep response time under 50ms without per-request RPC
  private get pollIntervalMs(): number {
    const n = Number(process.env.GAS_PRICE_POLL_INTERVAL_MS ?? 5000);
    return Number.isFinite(n) && n > 0 ? n : 5000;
  }

  onModuleInit() {
    const rpcUrl = process.env.ETHEREUM_RPC_URL;
    if (!rpcUrl) {
      this.logger.warn(
        'ETHEREUM_RPC_URL is not set; gas price polling disabled',
      );
      return;
    }

    const ProviderCtor = JsonRpcProvider as unknown as new (
      url: string,
    ) => ProviderLike;
    this.provider = new ProviderCtor(rpcUrl);
    this.logger.log(
      'Initialized Ethereum JSON-RPC provider for gas price polling',
    );

    // Kick off an immediate fetch, then poll
    void this.refreshOnce();
    this.pollTimer = setInterval(() => {
      void this.refreshOnce();
    }, this.pollIntervalMs);
  }

  onModuleDestroy() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  // Exposed for controller. Returns last known value or null if not ready.
  getLatest(): GasPriceSnapshot | null {
    return this.latest;
  }

  // Reference for manual verification of gas prices:
  // Etherscan Gas Tracker (gwei): https://etherscan.io/gastracker
  // Note: Our API returns wei; to compare, convert gwei to wei by multiplying by 1e9.
  private async refreshOnce(): Promise<void> {
    if (!this.provider) return;
    try {
      const feeData: FeeDataLike = await this.provider.getFeeData();
      // Prefer direct gasPrice if available; otherwise fallback to maxFeePerGas
      const gas: bigint | null | undefined =
        feeData.gasPrice ?? feeData.maxFeePerGas;

      if (gas !== null && gas !== undefined) {
        this.latest = {
          gasPriceWei: gas,
          fetchedAt: Date.now(),
        };
        // Log the first population for visibility
        this.logger.verbose?.(
          `Fetched gas price: ${this.latest.gasPriceWei.toString()} wei`,
        );
      } else {
        this.logger.warn(
          'Provider returned empty fee data; retaining previous snapshot',
        );
      }
    } catch (err) {
      const e = err as unknown;
      if (e instanceof Error) {
        this.logger.error(`Failed to fetch gas price: ${e.message}`, e.stack);
      } else {
        this.logger.error(`Failed to fetch gas price: ${String(e)}`);
      }
    }
  }
}
export type { GasPriceSnapshot };
