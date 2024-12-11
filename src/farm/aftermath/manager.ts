import { SuiClient } from '@mysten/sui/client';
import {
  Aftermath,
  AftermathApi,
  FarmsStakedPosition,
  FarmsStakingPool,
  type FarmsStakingPoolObject,
} from 'aftermath-ts-sdk';
import invariant from 'tiny-invariant';

import { AftermathFarm } from './pool';
import { AftermathFarmPosition } from './position';

type AftermathFarmWithPositions = {
  pool: AftermathFarm;
  positions: AftermathFarmPosition[];
};

export class AftermathFarmManager {
  private readonly aftermathInstance: Aftermath;
  private readonly provider: SuiClient;
  private isInitialized: boolean = false;

  constructor(provider: SuiClient) {
    this.aftermathInstance = new Aftermath('MAINNET');
    this.provider = provider;
  }

  async getPools(): Promise<AftermathFarm[]> {
    await this.initializeOrRefreshManager();
    const farms: FarmsStakingPoolObject[] = await fetch(
      'https://aftermath.finance/api/farms'
    ).then((res) =>
      res.json().then((json) =>
        JSON.parse(JSON.stringify(json), (key, value) => {
          if (typeof value === 'string' && /^-?\d+n$/.test(value)) {
            return BigInt(value.slice(0, -1));
          }

          if (typeof value === 'string' && /^\d*\.?\d*$/g.test(value)) {
            return BigInt(value);
          }

          return value;
        })
      )
    );

    const provider = new AftermathApi(
      this.provider,
      await this.aftermathInstance.getAddresses()
    );

    return farms.map(
      (pool) =>
        new AftermathFarm(new FarmsStakingPool(pool, 'MAINNET', provider))
    );
  }

  async getPositions(
    address: string,
    pools: AftermathFarm[]
  ): Promise<AftermathFarmPosition[]> {
    await this.initializeOrRefreshManager();
    const positions = await this.aftermathInstance
      .Farms()
      .getOwnedStakedPositions({
        walletAddress: address,
      });

    return positions.map((position) => {
      const farm = pools.find(
        (pool) =>
          pool.stakingPool.stakingPool.objectId ===
          position.stakedPosition.stakingPoolObjectId
      );

      invariant(farm, 'Farm not found');

      return this.getAftermathPosition(
        farm,
        this.provider,
        this.aftermathInstance,
        position
      );
    });
  }

  async getPoolsWithPositions(
    address: string
  ): Promise<AftermathFarmWithPositions[]> {
    const farms = await this.getPools();
    const positions = await this.getPositions(address, farms);

    return farms.map((farm) => ({
      pool: farm,
      positions: positions.filter(
        (position) =>
          position.stakedPosition.stakedPosition.stakingPoolObjectId ===
          farm.stakingPool.stakingPool.objectId
      ),
    }));
  }

  getAftermathFarm(farm: FarmsStakingPool): AftermathFarm {
    return new AftermathFarm(farm);
  }

  getAftermathPosition(
    farm: AftermathFarm,
    provider: SuiClient,
    aftermath: Aftermath,
    position: FarmsStakedPosition
  ): AftermathFarmPosition {
    return new AftermathFarmPosition(farm, provider, aftermath, position);
  }

  private async initializeOrRefreshManager(): Promise<void> {
    if (!this.isInitialized) {
      await this.aftermathInstance.init();
      this.isInitialized = true;
    }
  }
}
