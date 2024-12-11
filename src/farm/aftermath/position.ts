import { SuiClient } from '@mysten/sui/client';
import {
  Transaction,
  type TransactionObjectArgument,
} from '@mysten/sui/transactions';
import {
  Aftermath,
  AftermathApi,
  type CoinType,
  FarmsStakedPosition,
} from 'aftermath-ts-sdk';

import { FarmWay } from '../../events';
import { farmEvent } from '../../events/functions/farm';
import { getCoinForInput } from '../../utils';
import type { AftermathFarm } from './pool';

export class AftermathFarmPosition {
  private aftermathApi?: AftermathApi;

  constructor(
    private readonly farm: AftermathFarm,
    private readonly provider: SuiClient,
    private readonly aftermathInstance: Aftermath,
    public readonly stakedPosition: FarmsStakedPosition
  ) {}

  async deposit(address: string, depositAmount: bigint): Promise<Transaction> {
    const tx = new Transaction();
    tx.setSender(address);

    const aftermathApi = await this.getAftermathApi();

    const stakeCoinId = await getCoinForInput(
      this.provider,
      address,
      this.stakedPosition.stakedPosition.stakeCoinType,
      depositAmount,
      tx
    );

    farmEvent(
      FarmWay.DEPOSIT,
      [stakeCoinId],
      [this.stakedPosition.stakedPosition.stakeCoinType],
      this.stakedPosition.stakedPosition.stakingPoolObjectId,
      tx
    );

    aftermathApi.Farms().depositPrincipalTx({
      stakeCoinType: this.stakedPosition.stakedPosition.stakeCoinType,
      stakingPoolId: this.stakedPosition.stakedPosition.stakingPoolObjectId,
      stakeCoinId,
      stakedPositionId: this.stakedPosition.stakedPosition.objectId,
      tx,
    });

    return tx;
  }

  async unstakeAll(address: string): Promise<Transaction> {
    return this.stakedPosition.getUnstakeTransaction({
      stakingPool: this.farm.stakingPool,
      walletAddress: address,
    });
  }

  async lockPosition(
    address: string,
    lockDurationMs: number
  ): Promise<Transaction> {
    const tx = new Transaction();
    tx.setSender(address);

    const aftermathApi = await this.getAftermathApi();

    farmEvent(
      FarmWay.RELOCK,
      [],
      [this.stakedPosition.stakedPosition.stakeCoinType],
      this.stakedPosition.stakedPosition.stakingPoolObjectId,
      tx
    );

    aftermathApi.Farms().lockTx({
      tx,
      stakedPositionId: this.stakedPosition.stakedPosition.objectId,
      stakingPoolId: this.stakedPosition.stakedPosition.stakingPoolObjectId,
      lockDurationMs,
      stakeCoinType: this.stakedPosition.stakedPosition.stakeCoinType,
    });

    return tx;
  }

  async unlockPosition(address: string): Promise<Transaction> {
    const tx = new Transaction();
    tx.setSender(address);

    const aftermathApi = await this.getAftermathApi();

    const coin = aftermathApi.Farms().unlockTx({
      tx,
      stakedPositionId: this.stakedPosition.stakedPosition.objectId,
      stakingPoolId: this.stakedPosition.stakedPosition.stakingPoolObjectId,
      stakeCoinType: this.stakedPosition.stakedPosition.stakeCoinType,
    });

    farmEvent(
      FarmWay.WITHDRAW,
      [coin],
      [this.stakedPosition.stakedPosition.stakeCoinType],
      this.stakedPosition.stakedPosition.stakingPoolObjectId,
      tx
    );

    tx.transferObjects([coin], address);

    return tx;
  }

  async harvest(address: string): Promise<Transaction> {
    const tx = new Transaction();
    tx.setSender(address);

    const aftermathApi = await this.getAftermathApi();

    const harvestedRewardsEventMetadataId = aftermathApi
      .Farms()
      .beginHarvestTx({
        stakeCoinType: this.stakedPosition.stakedPosition.stakeCoinType,
        stakingPoolId: this.stakedPosition.stakedPosition.stakingPoolObjectId,
        tx,
      });

    const harvestedCoins: Record<CoinType, TransactionObjectArgument[]> = {};

    for (const rewardCoinType of this.stakedPosition.nonZeroRewardCoinTypes(
      this.farm
    )) {
      const harvestedCoin = aftermathApi.Farms().harvestRewardsTx({
        tx,
        stakedPositionId: this.stakedPosition.stakedPosition.objectId,
        stakingPoolId: this.stakedPosition.stakedPosition.stakingPoolObjectId,
        stakeCoinType: this.stakedPosition.stakedPosition.stakeCoinType,
        rewardCoinType,
        harvestedRewardsEventMetadataId,
      });

      if (rewardCoinType in harvestedCoins) {
        harvestedCoins[rewardCoinType].push(harvestedCoin);
      } else {
        harvestedCoins[rewardCoinType] = [harvestedCoin];
      }
    }

    aftermathApi.Farms().endHarvestTx({
      tx,
      harvestedRewardsEventMetadataId,
    });

    farmEvent(
      FarmWay.HARVEST,
      Object.values(harvestedCoins).flat(),
      Object.keys(harvestedCoins),
      this.stakedPosition.stakedPosition.stakingPoolObjectId,
      tx
    );

    for (const [, harvestedCoinIds] of Object.entries(harvestedCoins)) {
      const coinToTransfer = harvestedCoinIds[0];

      if (harvestedCoinIds.length > 1)
        tx.mergeCoins(coinToTransfer, harvestedCoinIds.slice(1));

      tx.transferObjects([coinToTransfer], address);
    }

    return tx;
  }

  getStakedAmount(): bigint {
    return this.stakedPosition.stakedPosition.stakedAmount;
  }

  getLockEndTimestamp(): number {
    return this.stakedPosition.unlockTimestamp();
  }

  private async getAftermathApi(): Promise<AftermathApi> {
    const addresses = await this.aftermathInstance.getAddresses();

    if (!this.aftermathApi) {
      this.aftermathApi = new AftermathApi(this.provider, addresses);
    }

    return this.aftermathApi;
  }
}
