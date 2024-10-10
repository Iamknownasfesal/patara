import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';

import type { Balance, CoinInRecord } from '../types';
import { AMMFactory, type AMMTypeKeys } from './factory';
import type { GenericAMM } from './generic';
import type { ProvideLiquidityArgs, RemoveLiquidityArgs } from './types';

export class AMMManager {
  private amm: GenericAMM;

  constructor(type: AMMTypeKeys, client: SuiClient, objectId: string) {
    this.amm = AMMFactory.createAMM(type, client, objectId);
  }

  async provideLiquidity(args: ProvideLiquidityArgs): Promise<Transaction> {
    return this.amm.provideLiquidity(args);
  }

  async removeLiquidity(args: RemoveLiquidityArgs): Promise<Transaction> {
    return this.amm.removeLiquidity(args);
  }

  async quoteProvideLiquidity(args: ProvideLiquidityArgs): Promise<Balance> {
    return this.amm.quoteProvideLiquidity(args);
  }

  async quoteRemoveLiquidity(args: RemoveLiquidityArgs): Promise<CoinInRecord> {
    return this.amm.quoteRemoveLiquidity(args);
  }
}
