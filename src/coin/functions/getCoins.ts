import { type CoinStruct } from '@mysten/sui/client';
import invariant from 'tiny-invariant';

import type { CoinArgs, CoinWithDecimalsArgs, MultiCoinArgs } from '../types';

export async function getCoins(params: CoinArgs): Promise<CoinStruct[]> {
  return fetchAllCoins(params);
}

export async function getCoinsAndNormalizeWithDecimals(
  params: CoinWithDecimalsArgs
) {
  const { coin, address, provider, decimals } = params;
  invariant(address, 'Address is required to get coins');

  const coinStructs = await fetchAllCoins({ coin, address, provider });
  const balance = calculateTotalBalance(coinStructs);

  return {
    raw: balance,
    formatted: formatBalance(balance, decimals),
  };
}

export async function getMultiCoinsAndNormalizeWithDecimals(
  params: MultiCoinArgs
) {
  const { coins, address, provider, decimals } = params;
  let balances = await provider.getAllBalances({ owner: address });
  balances = balances.filter((balance) => coins.includes(balance.coinType));

  return balances.map((balance) => {
    const balanceValue = BigInt(balance.totalBalance);
    return {
      raw: balanceValue,
      formatted: formatBalance(balanceValue, decimals),
      type: balance.coinType,
    };
  });
}

async function fetchAllCoins({
  coin,
  address,
  provider,
}: CoinArgs): Promise<CoinStruct[]> {
  let hasNextPage = true;
  let cursor: string | null | undefined = null;
  let coinStructs: CoinStruct[] = [];

  while (hasNextPage) {
    const response = await provider.getCoins({
      owner: address,
      coinType: coin,
      cursor,
    });

    coinStructs = [...coinStructs, ...response.data];
    hasNextPage = response.hasNextPage;
    cursor = response.nextCursor;
  }

  return coinStructs;
}

function calculateTotalBalance(coinStructs: CoinStruct[]): bigint {
  return coinStructs.reduce(
    (acc, coin) => acc + BigInt(coin.balance),
    BigInt(0)
  );
}

function formatBalance(balance: bigint, decimals: number): string {
  return (Number(balance) / 10 ** decimals).toFixed(2);
}
