import type { SuiClient } from '@mysten/sui/client';
import type { Transaction } from '@mysten/sui/transactions';

import type { Balance, CoinInRecord } from '../types';
import type { AMM, ProvideLiquidityArgs, RemoveLiquidityArgs } from './types';

export abstract class GenericAMM implements AMM {
  public client: SuiClient;
  protected abstract readonly objectId: string;

  constructor(client: SuiClient) {
    this.client = client;
  }

  abstract provideLiquidity(args: ProvideLiquidityArgs): Promise<Transaction>;
  abstract removeLiquidity(args: RemoveLiquidityArgs): Promise<Transaction>;
  abstract quoteProvideLiquidity(args: ProvideLiquidityArgs): Promise<Balance>;
  abstract quoteRemoveLiquidity(
    args: RemoveLiquidityArgs
  ): Promise<CoinInRecord>;
}
