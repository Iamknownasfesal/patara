import type { SuiClient } from '@mysten/sui/client';
import type { CoinStruct } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';

export type CoinArgs = {
  coin: string;
  address: string;
  provider: SuiClient;
};

export type CoinWithDecimalsArgs = CoinArgs & {
  decimals: number;
};

export type MultiCoinArgs = Omit<CoinWithDecimalsArgs, 'coin'> & {
  coins: string[];
};

export type MergeCoinArgs = {
  tx: Transaction;
  coins: CoinStruct[];
};

export type PriceOutput = {
  price: number;
};

export type PriceResponse = Record<string, PriceOutput>;
