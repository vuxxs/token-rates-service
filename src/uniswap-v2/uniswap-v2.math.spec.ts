import { getAmountOut } from './uniswap-v2.types';

describe('UniswapV2 math: getAmountOut', () => {
  it('returns 0 for non-positive inputs or empty reserves', () => {
    expect(getAmountOut(0n, 1n, 1n)).toBe(0n);
    expect(getAmountOut(1n, 0n, 1n)).toBe(0n);
    expect(getAmountOut(1n, 1n, 0n)).toBe(0n);
  });

  it('computes expected integer output', () => {
    const amountIn = 10_000n;
    const reserveIn = 1_000_000n;
    const reserveOut = 1_000_000n;
    const out = getAmountOut(amountIn, reserveIn, reserveOut);
    expect(out).toBe(9n); // approx 9.87 truncated
  });
});
