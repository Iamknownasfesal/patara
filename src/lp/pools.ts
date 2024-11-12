import type { SuiClient } from '@mysten/sui/client';
import { Aftermath, Pool as AftermathPool } from 'aftermath-ts-sdk';
import { Network, Pool as TurbosPool, TurbosSdk } from 'turbos-clmm-sdk';

import type { CoinInRecord } from './types';

export class PoolManager {
  private readonly aftermathInstance: Aftermath;
  private aftermathInitialized: boolean = false;
  private readonly turbosInstance: TurbosSdk;
  private readonly client: SuiClient;
  private readonly TURBOS_POSITION =
    '0x91bfbc386a41afcfd9b2533058d7e915a1d3829089cc268ff4333d54d6339ca1::position_nft::TurbosPositionNFT';

  readonly DefaultAftermathPools: string[] = [
    '0x97aae7a80abb29c9feabbe7075028550230401ffe7fb745757d3c28a30437408',
    '0xfe25614a57b5979cfa37fc4f9d269b0aae16ba25718b82f72dcfe7b123e45607',
    '0xdeacf7ab460385d4bcb567f183f916367f7d43666a2c72323013822eb3c57026',
    '0xfd3f72a5285b0fe46be4930bde4fa4746505b7b7783ddfc56fea640efae7a905',
    '0xab995e64af6c85423a59c53bf70214e40527e7653115c70f690efd8ac8a5288b',
    '0xb0cc4ce941a6c6ac0ca6d8e6875ae5d86edbec392c3333d008ca88f377e5e181',
    '0x41ef59cccc07e3422238cbd904de574610354e49e2e0b2193b461c6c25d50b35',
  ];
  readonly DefaultTurbosPools: string[] = [
    '0x770010854059edf1dd3d49a97f3054c39b870ec708fe2f408e30a8ef4724caef',
    '0x77f786e7bbd5f93f7dc09edbcffd9ea073945564767b65cf605f388328449d50',
    '0x2c6fc12bf0d093b5391e7c0fed7e044d52bc14eb29f6352a3fb358e33e80729e',
    '0x27645957e0260f3c5874c4895c11d2adca6b2c3d60ad4afb805acb635dd46f21',
    '0x21026a3198bf7e656441355dd78f2c14778134d10d16d17c2cf5651d99d00ee9',
  ];

  constructor(client: SuiClient) {
    this.aftermathInstance = new Aftermath('MAINNET');
    this.turbosInstance = new TurbosSdk(Network.mainnet);
    this.client = client;
  }

  async getTurbosPositions(pools: TurbosPool.Pool[], address: string) {
    let cursor: string | undefined | null = undefined;
    let hasNextPage = true;
    const positions: string[] = [];

    while (hasNextPage) {
      const {
        data,
        hasNextPage: nextHasNextPage,
        nextCursor,
      } = await this.client.getOwnedObjects({
        owner: address,
        filter: {
          StructType: this.TURBOS_POSITION,
        },
        cursor,
        limit: 20,
      });

      positions.push(
        ...data
          .filter((obj) => obj.data)
          .map((obj) => obj.data?.objectId as string)
      );
      cursor = nextCursor;
      hasNextPage = nextHasNextPage;
    }

    const poolIds = pools.map((pool) => pool.objectId);

    const parsedPositions = await Promise.all(
      positions.map(this.getTurbosPositionNftFields)
    );

    return parsedPositions.filter((position) =>
      poolIds.includes(position.pool_id)
    );
  }

  async getAftermathPositions(
    pools: AftermathPool[],
    coinInRecord: CoinInRecord
  ) {
    const coinTypes = pools.map((pool) => pool.pool.lpCoinType);

    const existingCoins = Object.keys(coinInRecord).filter((coin) =>
      coinTypes.includes(coin)
    );

    return existingCoins;
  }

  async getPools() {
    await this.initializeAftermath();

    return {
      aftermath: await this.getAftermathPools(),
      turbos: await this.getTurbosPools(),
    };
  }

  async getAftermathPools() {
    await this.initializeAftermath();
    return await this.aftermathInstance.Pools().getAllPools();
  }

  async getSelectiveAftermathPools(
    pools: string[] = this.DefaultAftermathPools
  ) {
    await this.initializeAftermath();
    return await this.aftermathInstance.Pools().getPools({
      objectIds: pools,
    });
  }

  async getTurbosPools() {
    return this.turbosInstance.pool.getPools();
  }

  async getSelectiveTurbosPools(pools: string[] = this.DefaultTurbosPools) {
    const results = [];

    for (let i = 0; i < pools.length; i++) {
      const pool = await this.turbosInstance.pool.getPool(pools[i]);
      results.push(pool);
    }

    return results;
  }

  private async getTurbosPositionNftFields(objectId: string) {
    return this.turbosInstance.nft.getFields(objectId);
  }

  private async initializeAftermath() {
    if (this.aftermathInitialized) {
      return;
    }

    this.aftermathInitialized = true;
    await this.aftermathInstance.init();
  }
}
