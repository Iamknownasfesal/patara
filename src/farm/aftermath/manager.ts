import {
  getFullnodeUrl,
  SuiClient,
  SuiHTTPTransport,
} from '@mysten/sui/client';
import {
  Aftermath,
  AftermathApi,
  FarmsStakedPosition,
  FarmsStakingPool,
  type FarmsStakingPoolObject,
  IndexerCaller,
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
  private isInitialized: boolean = false;

  constructor() {
    this.aftermathInstance = new Aftermath('MAINNET');
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
      new SuiClient({
        transport: new SuiHTTPTransport({
          url: getFullnodeUrl('mainnet'),
        }),
      }),
      await this.aftermathInstance.getAddresses(),
      new IndexerCaller('MAINNET')
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

      return this.getAftermathPosition(farm, position);
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
    position: FarmsStakedPosition
  ): AftermathFarmPosition {
    return new AftermathFarmPosition(farm, position);
  }

  private async initializeOrRefreshManager(): Promise<void> {
    if (!this.isInitialized) {
      await this.aftermathInstance.init();
      this.isInitialized = true;
    }
  }
}
