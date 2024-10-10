import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { describe, expect, test } from 'bun:test';
import { AMMManager } from '../../src';

describe('Aftermath AMM', () => {
  const client = new SuiClient({ url: getFullnodeUrl('mainnet') });
  const objectId =
    '0x97aae7a80abb29c9feabbe7075028550230401ffe7fb745757d3c28a30437408';

  test('Can Initialize Aftermath AMM', () => {
    const amm = new AMMManager('aftermath', client, objectId);
    expect(amm).toBeDefined();
  });

  test('Should be able to provide liquidity', async () => {
    const amm = new AMMManager('aftermath', client, objectId);
    const tx = await amm.provideLiquidity({
      amountsIn: {
        '0x2::sui::SUI': 100_000n,
        '0xf325ce1300e8dac124071d3152c5c5ee6174914f8bc2161e88329cf579246efc::afsui::AFSUI':
          100_000n,
      },
      slippage: 1,
      walletAddress:
        '0xed05819386c54a5983c312cfbdd40698f3807e25e9f590c0678c63d20a854ee9',
    });

    expect(tx).toBeDefined();
  });

  test('Should be able to quote provide liquidity', async () => {
    const amm = new AMMManager('aftermath', client, objectId);
    const amount = await amm.quoteProvideLiquidity({
      amountsIn: {
        '0x2::sui::SUI': 100_000n,
        '0xf325ce1300e8dac124071d3152c5c5ee6174914f8bc2161e88329cf579246efc::afsui::AFSUI':
          100_000n,
      },
      slippage: 1,
      walletAddress:
        '0xed05819386c54a5983c312cfbdd40698f3807e25e9f590c0678c63d20a854ee9',
    });

    expect(amount).toBeGreaterThan(50_000n);
  });

  test('Should throw error when providing liquidity', async () => {
    const amm = new AMMManager('aftermath', client, objectId);
    const promise = amm.provideLiquidity({
      amountsIn: {
        '0x2::sui::SUI': 100_000_000n,
        '0xf325ce1300e8dac124071d3152c5c5ee6174914f8bc2161e88329cf579246efc::afsui::AFSUI':
          100_000_000n,
      },
      slippage: 1,
      walletAddress:
        '0xe084b116bba67b20e915cbf87d331989a843f1623a0fd38dcbeb196e03c11566',
    });

    expect(promise).rejects.toThrow();
  });

  test('Should be able to remove liquidity', async () => {
    const amm = new AMMManager('aftermath', client, objectId);
    const tx = await amm.removeLiquidity({
      amountIn: 1_000_000_000n,
      walletAddress:
        '0xa5b1611d756c1b2723df1b97782cacfd10c8f94df571935db87b7f54ef653d66',
    });

    expect(tx).toBeDefined();
  });

  test('Should be able to quote remove liquidity', async () => {
    const amm = new AMMManager('aftermath', client, objectId);
    const out = await amm.quoteRemoveLiquidity({
      amountIn: 100_000_000_000n,
      walletAddress:
        '0xa5b1611d756c1b2723df1b97782cacfd10c8f94df571935db87b7f54ef653d66',
    });

    expect(out).toBeDefined();
    expect(
      out[
        '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI'
      ]
    ).toBeGreaterThan(11607349696n);
    expect(
      out[
        '0xf325ce1300e8dac124071d3152c5c5ee6174914f8bc2161e88329cf579246efc::afsui::AFSUI'
      ]
    ).toBeGreaterThan(90444568057n);
  });

  test('Should throw error when removing liquidity', async () => {
    const amm = new AMMManager('aftermath', client, objectId);
    const promise = amm.removeLiquidity({
      amountIn: 100_000_000_000n,
      walletAddress:
        '0xa5b1611d756c1b2723df1b97782cacfd10c8f94df571935db87b7f54ef653d66',
    });

    expect(promise).rejects.toThrow();
  });
});
