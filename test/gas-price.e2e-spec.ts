import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { Response } from 'supertest';

import { AppModule } from '../src/app.module';
import { GasPriceService } from '../src/gas-price/gas-price.service';
import { GasPriceSnapshot } from '../src/gas-price/gas-price.types';

describe('/gasPrice (e2e)', () => {
  let app: INestApplication;

  afterEach(async () => {
    if (app) await app.close();
  });

  it('returns 200 with snapshot payload', async () => {
    const snapshot: GasPriceSnapshot = {
      gasPriceWei: 987654321n,
      fetchedAt: Date.now() - 250,
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(GasPriceService)
      .useValue({
        getLatest: () => snapshot,
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    const res: Response = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .get('/gasPrice')
      .expect(200);
    const body = res.body as {
      network: string;
      unit: string;
      gasPrice: string;
      fetchedAt: string;
      ageMs: number;
      source: string;
    };
    expect(body.network).toBe('ethereum-mainnet');
    expect(body.unit).toBe('wei');
    expect(body.gasPrice).toBe(snapshot.gasPriceWei.toString());
    expect(typeof body.ageMs).toBe('number');
  });

  it('returns 503 when snapshot not available', async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(GasPriceService)
      .useValue({
        getLatest: () => null,
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    const res: Response = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .get('/gasPrice')
      .expect(503);
    const body = res.body as {
      statusCode: number;
      error: string;
      message?: string;
    };
    expect(body.statusCode).toBe(503);
    expect(typeof body.error).toBe('string');
  });
});
