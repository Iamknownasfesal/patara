import { type TransactionObjectArgument } from '@mysten/sui/transactions';

import type { MergeCoinArgs } from '../types';

/**
 * Merges provided coins into a single transaction block.
 * @param {Transaction} tx - The transaction block to merge coins into.
 * @param {CoinStruct[]} coins - The coins to merge.
 * @return {TransactionObjectArgument} The merged coin.
 * @throws {Error} Throws an error if no coins are provided to merge.
 */
export function mergeCoins({
  tx,
  coins,
}: MergeCoinArgs): TransactionObjectArgument {
  if (coins.length === 0) {
    throw new Error('No coins provided to merge');
  }

  const [firstCoin, ...otherCoins] = coins;
  const mergedCoin = tx.object(firstCoin.coinObjectId);

  if (otherCoins.length > 0) {
    const otherCoinIds = otherCoins.map((coin) => coin.coinObjectId);
    tx.mergeCoins(mergedCoin, otherCoinIds);
  }

  return mergedCoin;
}
