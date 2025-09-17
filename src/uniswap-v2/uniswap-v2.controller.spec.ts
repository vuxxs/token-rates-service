import { HttpException } from '@nestjs/common';
import { UniswapV2Controller } from './uniswap-v2.controller';
import { Address } from './uniswap-v2.types';
import type { UniswapV2Service } from './uniswap-v2.service';

type PairStatus = 'NO_PAIR' | 'WARMING' | 'READY';

describe('UniswapV2Controller', () => {
  it('validates address and amount', async () => {
    const mockSvc = {} as unknown as UniswapV2Service;
    const c = new UniswapV2Controller(mockSvc);
    await expect(c.getReturn('0x123', '0xabc', '1')).rejects.toBeInstanceOf(
      HttpException,
    );
    await expect(
      c.getReturn(
        '0x0000000000000000000000000000000000000000',
        '0x0000000000000000000000000000000000000000',
        '0',
      ),
    ).rejects.toBeInstanceOf(HttpException);
  });

  it('returns 404 for NO_PAIR', async () => {
    const mockSvc: Pick<UniswapV2Service, 'getPairStatus'> = {
      getPairStatus: () => Promise.resolve('NO_PAIR' as PairStatus),
    };
    const c = new UniswapV2Controller(mockSvc as unknown as UniswapV2Service);
    await expect(
      c.getReturn(
        '0x0000000000000000000000000000000000000001',
        '0x0000000000000000000000000000000000000002',
        '1',
      ),
    ).rejects.toBeInstanceOf(HttpException);
  });

  it('returns 503 when WARMING', async () => {
    const mockSvc: Pick<UniswapV2Service, 'getPairStatus'> = {
      getPairStatus: () => Promise.resolve('WARMING' as PairStatus),
    };
    const c = new UniswapV2Controller(mockSvc as unknown as UniswapV2Service);
    await expect(
      c.getReturn(
        '0x0000000000000000000000000000000000000001',
        '0x0000000000000000000000000000000000000002',
        '1',
      ),
    ).rejects.toBeInstanceOf(HttpException);
  });

  it('returns amount when READY', async () => {
    const mockSvc: Pick<UniswapV2Service, 'getPairStatus' | 'estimateReturn'> =
      {
        getPairStatus: () => Promise.resolve('READY' as PairStatus),
        estimateReturn: (_a: Address, _b: Address, _amt: bigint) => {
          void _amt;
          return Promise.resolve({
            amountOut: 42n,
            meta: {
              pair: '0x0000000000000000000000000000000000000003' as Address,
              tokenIn: _a,
              tokenOut: _b,
              reserveIn: 1000n,
              reserveOut: 1000n,
              feeBps: 30,
              fetchedAt: new Date().toISOString(),
              ageMs: 0,
            },
          });
        },
      };
    const c = new UniswapV2Controller(mockSvc as unknown as UniswapV2Service);
    const res = await c.getReturn(
      '0x0000000000000000000000000000000000000001',
      '0x0000000000000000000000000000000000000002',
      '100',
    );
    expect(res.amountOut).toBe('42');
  });
});
