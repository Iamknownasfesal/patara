import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { normalizeStructTag } from '@mysten/sui/utils';
import { describe, expect, test } from 'bun:test';
import {
  getMultipleCoinMetadataAll,
  Suilend,
  type CoinMetadataMap,
} from '../../src';

describe('Suilend', () => {
  const client = new SuiClient({ url: getFullnodeUrl('mainnet') });
  const suilend = new Suilend(client);
  let metadataMap: CoinMetadataMap = {};

  test('Should be able to get metadata map', async () => {
    const now = Math.floor(Date.now() / 1000);
    const reserves = await suilend.getRawReserves(now);

    const coinTypes: string[] = [];
    reserves.forEach((r) => {
      coinTypes.push(normalizeStructTag(r.coinType.name));

      [
        ...r.depositsPoolRewardManager.poolRewards,
        ...r.borrowsPoolRewardManager.poolRewards,
      ].forEach((pr) => {
        if (!pr) return;
        coinTypes.push(normalizeStructTag(pr.coinType.name));
      });
    });
    const coinTypesSet = new Set(coinTypes);

    const coinMetadata = await getMultipleCoinMetadataAll(
      Array.from(coinTypesSet)
    );

    metadataMap = coinMetadata.coins.reduce((acc, coin) => {
      acc[coin.type] = coin;
      return acc;
    }, {} as CoinMetadataMap);

    expect(metadataMap).toBeDefined();
  });

  test('Should be able to get user and app data', async () => {
    const data = await suilend.getUserAndAppData(
      '0x7f9c74a94069e980195fe4b75eb75b0bfd4f91d008da8e8f99b019fa135c7df2',
      metadataMap
    );

    expect(data).toBeDefined();
  });
});
