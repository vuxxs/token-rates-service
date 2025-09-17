import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JsonRpcProvider, Contract } from 'ethers';
import { getAmountOut } from './uniswap-v2.types';
import type {
  Address,
  ReserveSnapshot,
  ReturnEstimationResult,
} from './uniswap-v2.types';

type FactoryLike = {
  getPair(tokenA: string, tokenB: string): Promise<string>;
};

type PairLike = {
  token0(): Promise<string>;
  token1(): Promise<string>;
  getReserves(): Promise<[bigint, bigint, number]>;
};

// Minimal ABIs
const UNISWAP_V2_FACTORY_ABI = [
  'function getPair(address tokenA, address tokenB) external view returns (address pair)',
];
const UNISWAP_V2_PAIR_ABI = [
  'function token0() external view returns (address)',
  'function token1() external view returns (address)',
  'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
];

function sortAddresses(a: Address, b: Address): [Address, Address] {
  return a.toLowerCase() < b.toLowerCase() ? [a, b] : [b, a];
}

@Injectable()
export class UniswapV2Service implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(UniswapV2Service.name);
  private provider: object | null = null;
  private factory: FactoryLike | null = null;

  private pairCache = new Map<string, Address | null>(); // key: `${a}_${b}` sorted -> pair or null if no pair
  private reserveCache = new Map<Address, ReserveSnapshot>();

  private pollTimer: NodeJS.Timeout | null = null;
  private readonly pollIntervalMs: number;

  constructor(private readonly config: ConfigService) {
    this.pollIntervalMs = Number(
      this.config.get<string>('UNI_V2_POLL_INTERVAL_MS') ?? 5000,
    );
  }

  onModuleInit() {
    const rpcUrl = this.config.get<string>('ETHEREUM_RPC_URL');
    if (!rpcUrl) {
      this.logger.warn(
        'ETHEREUM_RPC_URL is not set; UniswapV2Service disabled',
      );
      return;
    }

    this.provider = new (JsonRpcProvider as unknown as {
      new (url: string): object;
    })(rpcUrl);
    const factoryAddress =
      this.config.get<string>('UNI_V2_FACTORY_ADDRESS') ??
      '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f';
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    this.factory = new Contract(
      factoryAddress,
      UNISWAP_V2_FACTORY_ABI,
      this.provider as any,
    ) as unknown as FactoryLike;

    // Background refresh loop (only refreshes known pairs)
    this.pollTimer = setInterval(() => {
      void this.refreshAllKnownPairs();
    }, this.pollIntervalMs);
  }

  onModuleDestroy() {
    if (this.pollTimer) clearInterval(this.pollTimer);
  }

  // Public API used by controller
  // Returns null if not warmed; controller should respond 503 in that case
  async estimateReturn(
    fromToken: Address,
    toToken: Address,
    amountIn: bigint,
  ): Promise<ReturnEstimationResult | null> {
    const pair = await this.getOrDiscoverPair(fromToken, toToken);
    if (!pair) return null; // pair doesn't exist or not yet discovered

    const snap = this.reserveCache.get(pair);
    if (!snap) {
      // schedule initial fetch and return null for now
      void this.refreshPair(pair);
      return null;
    }

    const isFromToken0 = fromToken.toLowerCase() === snap.token0.toLowerCase();
    const reserveIn = isFromToken0 ? snap.reserve0 : snap.reserve1;
    const reserveOut = isFromToken0 ? snap.reserve1 : snap.reserve0;

    const amountOut = getAmountOut(amountIn, reserveIn, reserveOut);

    return {
      amountOut,
      meta: {
        pair,
        tokenIn: fromToken,
        tokenOut: toToken,
        reserveIn,
        reserveOut,
        feeBps: 30,
        fetchedAt: new Date(snap.fetchedAt).toISOString(),
        ageMs: Date.now() - snap.fetchedAt,
      },
    };
  }

  async getPairStatus(
    a: Address,
    b: Address,
  ): Promise<'NO_PAIR' | 'WARMING' | 'READY'> {
    const pair = await this.getOrDiscoverPair(a, b);
    const [x, y] = sortAddresses(a, b);
    const key = `${x}_${y}`;
    if (!pair) {
      // if explicitly cached as null, then NO_PAIR, otherwise still warming
      return this.pairCache.has(key) ? 'NO_PAIR' : 'WARMING';
    }
    return this.reserveCache.has(pair) ? 'READY' : 'WARMING';
  }

  private async getOrDiscoverPair(
    a: Address,
    b: Address,
  ): Promise<Address | null> {
    const [x, y] = sortAddresses(a, b);
    const key = `${x}_${y}`;
    if (this.pairCache.has(key)) return this.pairCache.get(key)!;
    // Discover via factory
    try {
      if (!this.factory) return null;
      const pairAddr = await this.factory.getPair(x, y);
      const normalized = pairAddr as Address;
      const isZero = /^0x0{40}$/i.test(pairAddr);
      this.pairCache.set(key, isZero ? null : normalized);
      if (!isZero) void this.refreshPair(normalized);
      return isZero ? null : normalized;
    } catch (e) {
      this.logger.error(`getPair failed for ${x}, ${y}`, e as Error);
      return null;
    }
  }

  private async refreshAllKnownPairs(): Promise<void> {
    const pairs = Array.from(this.pairCache.values()).filter(
      (p): p is Address => !!p,
    );
    await Promise.all(pairs.map((p) => this.refreshPair(p)));
  }

  private async refreshPair(pair: Address): Promise<void> {
    if (!this.provider) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      const c = new Contract(
        pair,
        UNISWAP_V2_PAIR_ABI,
        this.provider as any,
      ) as unknown as PairLike;
      const [token0, token1] = await Promise.all([c.token0(), c.token1()]);
      const [r0, r1] = await c.getReserves();
      const reserve0 = BigInt(r0.toString());
      const reserve1 = BigInt(r1.toString());
      this.reserveCache.set(pair, {
        pair,
        token0: token0 as Address,
        token1: token1 as Address,
        reserve0,
        reserve1,
        fetchedAt: Date.now(),
      });
    } catch (e) {
      this.logger.error(
        `Failed to refresh reserves for pair ${pair}`,
        e as Error,
      );
    }
  }
}
