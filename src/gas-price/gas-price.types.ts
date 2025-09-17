export type FeeDataLike = {
  gasPrice?: bigint | null;
  maxFeePerGas?: bigint | null;
};

export type ProviderLike = {
  getFeeData(): Promise<FeeDataLike>;
};

export type GasPriceSnapshot = {
  gasPriceWei: bigint; // raw wei value
  fetchedAt: number; // epoch ms
};
