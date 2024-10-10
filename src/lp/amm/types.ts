import type { SuiClient } from '@mysten/sui/client';
import type { Transaction } from '@mysten/sui/transactions';

import type { Balance, CoinInRecord, WalletAddress } from '../types';

export type ProvideLiquidityArgs = {
  walletAddress: WalletAddress;
  amountsIn: CoinInRecord;
  slippage: number;
};

export type RemoveLiquidityArgs = {
  walletAddress: WalletAddress;
  amountIn: Balance;
};

export interface AMM {
  client: SuiClient;
  provideLiquidity: (args: ProvideLiquidityArgs) => Promise<Transaction>;
  quoteProvideLiquidity: (args: ProvideLiquidityArgs) => Promise<Balance>;
  removeLiquidity: (args: RemoveLiquidityArgs) => Promise<Transaction>;
  quoteRemoveLiquidity: (args: RemoveLiquidityArgs) => Promise<CoinInRecord>;
}
