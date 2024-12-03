import { SuiClient } from '@mysten/sui/client';
import type {
  Transaction,
  TransactionArgument,
} from '@mysten/sui/transactions';

import { isSui } from './coinType';

export async function getCoinForInput(
  client: SuiClient,
  address: string,
  coinType: string,
  splitValue: number | string | bigint,
  transaction: Transaction
): Promise<TransactionArgument> {
  const coins = (
    await client.getCoins({
      owner: address,
      coinType,
    })
  ).data;

  const mergeCoin = coins[0];
  if (coins.length > 1 && !isSui(coinType)) {
    transaction.mergeCoins(
      transaction.object(mergeCoin.coinObjectId),
      coins.map((c) => transaction.object(c.coinObjectId)).slice(1)
    );
  }

  const [sendCoin] = transaction.splitCoins(
    isSui(coinType)
      ? transaction.gas
      : transaction.object(mergeCoin.coinObjectId),
    [splitValue]
  );

  return sendCoin;
}

export async function getCoinsForInput(
  client: SuiClient,
  address: string,
  coinTypes: string[],
  splitValues: (number | string | bigint)[],
  transaction: Transaction
): Promise<TransactionArgument[]> {
  return Promise.all(
    coinTypes.map((coinType, i) =>
      getCoinForInput(client, address, coinType, splitValues[i], transaction)
    )
  );
}
