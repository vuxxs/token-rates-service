import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { UniswapV2Service } from '../src/uniswap-v2/uniswap-v2.service';
import { Address } from '../src/uniswap-v2/uniswap-v2.types';

describe('UniswapV2 /return (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(UniswapV2Service)
      .useValue({
        getPairStatus: () => Promise.resolve('READY' as const),
        estimateReturn: (a: Address, b: Address, _amt: bigint) => {
          void _amt;
          return Promise.resolve({
            amountOut: 42n,
            meta: {
              pair: '0x0000000000000000000000000000000000000003' as Address,
              tokenIn: a,
              tokenOut: b,
              reserveIn: 1000n,
              reserveOut: 1000n,
              feeBps: 30,
              fetchedAt: new Date().toISOString(),
              ageMs: 0,
            },
          });
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /return/:from/:to/:amountIn -> 200 with amountOut', async () => {
    const httpServer = app.getHttpServer() as unknown as App;
    const res = await request(httpServer)
      .get(
        '/return/0x0000000000000000000000000000000000000001/0x0000000000000000000000000000000000000002/100',
      )
      .expect(200);
    type ReturnDto = { amountOut: string; network: string };
    const body = res.body as ReturnDto;
    expect(body.amountOut).toBe('42');
    expect(body.network).toBe('ethereum-mainnet');
  });
});
