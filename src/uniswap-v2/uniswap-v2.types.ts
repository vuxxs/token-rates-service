export type Address = `0x${string}`;

export interface ReserveSnapshot {
  pair: Address;
  token0: Address;
  token1: Address;
  reserve0: bigint;
  reserve1: bigint;
  fetchedAt: number; // epoch ms
}

export interface ReturnEstimationMeta {
  pair: Address;
  tokenIn: Address;
  tokenOut: Address;
  reserveIn: bigint;
  reserveOut: bigint;
  feeBps: number; // basis points (e.g., 30 for 0.30%)
  fetchedAt: string; // ISO string
  ageMs: number;
}

export interface ReturnEstimationResult {
  amountOut: bigint;
  meta: ReturnEstimationMeta;
}

export function isAddressLike(s: string): s is Address {
  return /^0x[a-fA-F0-9]{40}$/.test(s);
}

export function getAmountOut(
  amountIn: bigint,
  reserveIn: bigint,
  reserveOut: bigint,
): bigint {
  // Uniswap V2 formula with 0.30% fee: amountOut = (amountIn * 997 * reserveOut) / (reserveIn*1000 + amountIn*997)
  if (amountIn <= 0n) return 0n;
  if (reserveIn <= 0n || reserveOut <= 0n) return 0n;
  const amountInWithFee = amountIn * 997n;
  const numerator = amountInWithFee * reserveOut;
  const denominator = reserveIn * 1000n + amountInWithFee;
  return denominator === 0n ? 0n : numerator / denominator;
}
