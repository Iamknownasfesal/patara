import { type SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Aftermath, AftermathApi, Casting, Coin, Pool } from 'aftermath-ts-sdk';
import assert from 'tiny-invariant';

import { ammEvent, AmmWay } from '../../events';
import {
  deductFeeFromMap,
  getCoinForInput,
  getCoinsForInput,
} from '../../utils';
import type { Balance, CoinInRecord } from '../types';
import { GenericAMM } from './generic';
import type { ProvideLiquidityArgs, RemoveLiquidityArgs } from './types';

export class AftermathAMM extends GenericAMM {
  private readonly aftermathInstance: Aftermath;
  private aftermathApi?: AftermathApi;
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

    const aftermathApi = await this.getAftermathApi();

    const { amountsIn, slippage, walletAddress } = args;

    const tx = new Transaction();
    tx.setSender(walletAddress);

    const { coins: coinTypes, balances: coinAmounts } =
      Coin.coinsAndBalancesOverZero(amountsIn);

    const { lpRatio } = this.pool.getDepositLpAmountOut({
      amountsIn: deductFeeFromMap(amountsIn),
    });

    const expectedLpRatio = Casting.numberToFixedBigInt(lpRatio);

    const coinIds = getCoinsForInput(coinTypes, coinAmounts);

    ammEvent(
      AmmWay.ADD_LIQUIDITY,
      coinIds,
      coinTypes,
      this.pool.pool.objectId,
      tx
    );

    if (this.pool.pool.daoFeePoolObject) {
      const lpCoinId = aftermathApi.Pools().daoFeePoolMultiCoinDepositTx({
        tx,
        daoFeePoolId: this.pool.pool.daoFeePoolObject.objectId,
        lpCoinType: this.pool.pool.lpCoinType,
        coinIds,
        coinTypes,
        expectedLpRatio,
        slippage,
      });
      tx.transferObjects([lpCoinId], walletAddress);
    } else {
      aftermathApi.Pools().multiCoinDepositTx({
        tx,
        poolId: this.pool.pool.objectId,
        lpCoinType: this.pool.pool.lpCoinType,
        coinIds,
        coinTypes,
        expectedLpRatio,
        slippage,
        withTransfer: true,
      });
    }

    return tx;
  }

  async removeLiquidity(args: RemoveLiquidityArgs): Promise<Transaction> {
    await this.initializeOrRefreshPool();
    assert(this.pool, 'Pool not initialized');

    const aftermathApi = await this.getAftermathApi();

    const { walletAddress, amountIn } = args;

    const tx = new Transaction();
    tx.setSender(walletAddress);

    const coinTypes = Object.keys(this.pool.pool.coins);

    const lpCoinId = getCoinForInput(this.pool.pool.lpCoinType, amountIn);

    if (this.pool.pool.daoFeePoolObject) {
      const withdrawnCoinIds = aftermathApi
        .Pools()
        .daoFeePoolAllCoinWithdrawTx({
          tx,
          daoFeePoolId: this.pool.pool.daoFeePoolObject.objectId,
          lpCoinType: this.pool.pool.lpCoinType,
          coinTypes,
          lpCoinId,
        });

      ammEvent(
        AmmWay.REMOVE_LIQUIDITY,
        coinTypes.map((_, index) => withdrawnCoinIds[index]),
        coinTypes,
        this.pool.pool.objectId,
        tx
      );

      tx.transferObjects(
        coinTypes.map((_, index) => withdrawnCoinIds[index]),
        walletAddress
      );
    } else {
      const withdrawnCoinIds = aftermathApi.Pools().allCoinWithdrawTx({
        tx,
        poolId: this.pool.pool.objectId,
        lpCoinType: this.pool.pool.lpCoinType,
        coinTypes,
        lpCoinId,
      });

      ammEvent(
        AmmWay.REMOVE_LIQUIDITY,
        coinTypes.map((_, index) => withdrawnCoinIds[index]),
        coinTypes,
        this.pool.pool.objectId,
        tx
      );

      tx.transferObjects(
        coinTypes.map((_, index) => withdrawnCoinIds[index]),
        walletAddress
      );
    }

    return tx;
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

  private async getAftermathApi(): Promise<AftermathApi> {
    await this.initializeOrRefreshPool();
    const addresses = await this.aftermathInstance.getAddresses();

    if (!this.aftermathApi) {
      this.aftermathApi = new AftermathApi(this.client, addresses);
    }

    return this.aftermathApi;
  }
}
