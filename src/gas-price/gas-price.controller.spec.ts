import { HttpException } from '@nestjs/common';
import { GasPriceController } from './gas-price.controller';
import type { GasPriceService, GasPriceSnapshot } from './gas-price.service';

type MinimalService = Pick<GasPriceService, 'getLatest'>;

describe('GasPriceController', () => {
  it('should return 503 when no snapshot available', () => {
    const mockService: MinimalService = {
      getLatest: () => null,
    };
    const controller = new GasPriceController(
      mockService as unknown as GasPriceService,
    );
    expect(() => controller.getGasPrice()).toThrow(HttpException);
    try {
      controller.getGasPrice();
    } catch (e) {
      const err = e as HttpException;
      expect(err.getStatus()).toBe(503);
    }
  });

  it('should return payload when snapshot exists', () => {
    const snapshot: GasPriceSnapshot = {
      gasPriceWei: 1234567890123456789n,
      fetchedAt: Date.now() - 1000,
    };
    const mockService: MinimalService = {
      getLatest: () => snapshot,
    };
    const controller = new GasPriceController(
      mockService as unknown as GasPriceService,
    );
    const res = controller.getGasPrice();
    expect(res.unit).toBe('wei');
    expect(res.network).toBe('ethereum-mainnet');
    expect(res.gasPrice).toBe(snapshot.gasPriceWei.toString());
    expect(typeof res.ageMs).toBe('number');
  });
});
