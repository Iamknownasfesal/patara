import type { SuiClient } from '@mysten/sui/client';
import {
  coinWithBalance,
  Transaction,
  type TransactionArgument,
} from '@mysten/sui/transactions';

import { isSui } from './coinType';

export function getCoinForInput(
  coinType: string,
  splitValue: number | string | bigint
) {
  return coinWithBalance({
    balance: BigInt(splitValue),
    type: coinType,
    useGasCoin: isSui(coinType),
  });
}

export function getCoinsForInput(
  coinTypes: string[],
  splitValues: (number | string | bigint)[]
): TransactionArgument[] {
  return coinTypes.map((coinType, i) =>
    getCoinForInput(coinType, splitValues[i])
  );
}

export async function getCoinForInputTraditional(
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

export async function getCoinsForInputTraditional(
  client: SuiClient,
  address: string,
  coinTypes: string[],
  splitValues: (number | string | bigint)[],
  transaction: Transaction
): Promise<TransactionArgument[]> {
  return Promise.all(
    coinTypes.map((coinType, i) =>
      getCoinForInputTraditional(
        client,
        address,
        coinType,
        splitValues[i],
        transaction
      )
    )
  );
}
