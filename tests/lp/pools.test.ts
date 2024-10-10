import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { describe, expect, test } from 'bun:test';
import { PoolManager } from '../../src';

describe('PoolManager', () => {
  const client = new SuiClient({ url: getFullnodeUrl('mainnet') });

  test('Should be able to get pools', async () => {
    const poolManager = new PoolManager(client);
    const poolsPromise = await poolManager.getAftermathPools();

    console.log(poolsPromise.length);

    expect(poolsPromise).toBeDefined();
  }, 60000);
});
