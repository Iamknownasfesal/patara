import { type SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Aftermath, Pool } from 'aftermath-ts-sdk';
import assert from 'tiny-invariant';

import type { Balance, CoinInRecord } from '../types';
import { GenericAMM } from './generic';
import type { ProvideLiquidityArgs, RemoveLiquidityArgs } from './types';

export class AftermathAMM extends GenericAMM {
  private readonly aftermathInstance: Aftermath;
  protected readonly objectId: string;
  private pool?: Pool;
  private isInitialized: boolean = false;

  constructor(client: SuiClient, objectId: string) {
    super(client);
    this.aftermathInstance = new Aftermath('MAINNET');
    this.objectId = objectId;
  }

  async provideLiquidity(args: ProvideLiquidityArgs): Promise<Transaction> {
    await this.initializeOrRefreshPool();
    assert(this.pool, 'Pool not initialized');

    const { amountsIn, slippage, walletAddress } = args;

    return await this.pool.getDepositTransaction({
      amountsIn,
      slippage,
      walletAddress,
    });
  }

  async removeLiquidity(args: RemoveLiquidityArgs): Promise<Transaction> {
    await this.initializeOrRefreshPool();
    assert(this.pool, 'Pool not initialized');

    const { walletAddress, amountIn } = args;

    return await this.pool.getAllCoinWithdrawTransaction({
      walletAddress,
      lpCoinAmount: amountIn,
    });
  }

  async quoteProvideLiquidity(args: ProvideLiquidityArgs): Promise<Balance> {
    await this.initializeOrRefreshPool();
    assert(this.pool, 'Pool not initialized');

    const { amountsIn } = args;
    return this.pool.getDepositLpAmountOut({ amountsIn }).lpAmountOut;
  }

  async quoteRemoveLiquidity(args: RemoveLiquidityArgs): Promise<CoinInRecord> {
    await this.initializeOrRefreshPool();
    assert(this.pool, 'Pool not initialized');

    const { amountIn } = args;

    return this.pool.getAllCoinWithdrawAmountsOut({
      lpRatio: this.pool.getAllCoinWithdrawLpRatio({
        lpCoinAmountIn: amountIn,
      }),
    });
  }

  private async initializeOrRefreshPool(): Promise<void> {
    if (!this.isInitialized) {
      await this.aftermathInstance.init();
      this.isInitialized = true;
    }

    this.pool = await this.aftermathInstance.Pools().getPool({
      objectId: this.objectId,
    });
  }
}
