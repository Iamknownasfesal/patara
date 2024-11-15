import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { describe, expect, test } from 'bun:test';
import { PoolManager } from '../../src';

describe('PoolManager', () => {
  const client = new SuiClient({ url: getFullnodeUrl('mainnet') });

  test('Should be able to get pools', async () => {
    const poolManager = new PoolManager(client);
    const poolsPromise = await poolManager.getTurbosPositions(
      await poolManager.getSelectiveTurbosPools(),
      '0xa5b1611d756c1b2723df1b97782cacfd10c8f94df571935db87b7f54ef653d66'
    );

    expect(poolsPromise).toBeDefined();
  }, 60000);
});
