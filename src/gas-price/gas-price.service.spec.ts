import { GasPriceService } from './gas-price.service';
import { ProviderLike, FeeDataLike } from './gas-price.types';

type GasPriceServiceHarness = {
  provider: ProviderLike | null;
  refreshOnce(): Promise<void>;
  readonly pollIntervalMs: number;
  getLatest(): ReturnType<GasPriceService['getLatest']>;
};

function asHarness(svc: GasPriceService): GasPriceServiceHarness {
  return svc as unknown as GasPriceServiceHarness;
}

// Helper to create a service with an injected mock provider
function makeServiceWithProvider(mock: ProviderLike) {
  const svc = new GasPriceService();
  asHarness(svc).provider = mock;
  return svc;
}

describe('GasPriceService (unit)', () => {
  it('getLatest() is null before any fetch', () => {
    const svc = new GasPriceService();
    expect(svc.getLatest()).toBeNull();
  });

  it('refreshOnce() updates snapshot on success', async () => {
    const fee: FeeDataLike = { gasPrice: 123n };
    const mock: ProviderLike = {
      getFeeData: jest.fn().mockResolvedValue(fee),
    };
    const svc = makeServiceWithProvider(mock);

    await asHarness(svc).refreshOnce();
    const snap = svc.getLatest();
    expect(snap).not.toBeNull();
    expect(snap!.gasPriceWei).toBe(123n);
    expect(typeof snap!.fetchedAt).toBe('number');
  });

  it('refreshOnce() leaves snapshot null on provider error', async () => {
    const mock: ProviderLike = {
      getFeeData: jest.fn().mockRejectedValue(new Error('network error')),
    };
    const svc = makeServiceWithProvider(mock);

    await asHarness(svc).refreshOnce();
    expect(svc.getLatest()).toBeNull();
  });

  it('refreshOnce() does not update on empty fee data', async () => {
    const mock: ProviderLike = {
      getFeeData: jest.fn().mockResolvedValue({} as FeeDataLike),
    };
    const svc = makeServiceWithProvider(mock);

    await asHarness(svc).refreshOnce();
    expect(svc.getLatest()).toBeNull();
  });

  it('default pollIntervalMs is 5000 when unset', () => {
    const svc = new GasPriceService();
    expect(asHarness(svc).pollIntervalMs).toBe(5000);
  });
});
