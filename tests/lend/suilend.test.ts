import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { describe, expect, test } from 'bun:test';
import { Suilend } from '../../src';

describe('Suilend', () => {
  const client = new SuiClient({ url: getFullnodeUrl('mainnet') });

  test('Should be able to get reserves', async () => {
    const suilend = new Suilend(client);
    const userAndAppDataPromise = await suilend.getUserAndAppData(
      {},
      '0xa5b1611d756c1b2723df1b97782cacfd10c8f94df571935db87b7f54ef653d66'
    );

    expect(userAndAppDataPromise).toBeDefined();
  }, 60000);
});
