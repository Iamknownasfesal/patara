import { SuiClient } from '@mysten/sui/client';
import {
  Transaction,
  type TransactionArgument,
} from '@mysten/sui/transactions';

import { getCoins, mergeCoins } from '../../coin';
import { FULL_SUI_COIN_TYPE } from '../../constants';
import { DCASDK, DELEGATEE, FEE_RATE, WITNESS_TYPE } from '../constants';
import type { DCAParams } from '../types';

async function prepareCoinIn(
  transaction: Transaction,
  coinInType: string,
  coinIn: bigint,
  address: string,
  provider: SuiClient
): Promise<TransactionArgument> {
  if (coinInType === FULL_SUI_COIN_TYPE) {
    return transaction.splitCoins(transaction.gas, [coinIn]);
  } else {
    const coins = await getCoins({ address, coin: coinInType, provider });
    return transaction.splitCoins(mergeCoins({ tx: transaction, coins }), [
      coinIn,
    ]);
  }
}

export async function newDCA({
  provider,
  address,
  coinIn,
  every,
  numberOfOrders,
  timeScale,
  coinInType,
  coinOutType,
  min,
  max,
}: DCAParams): Promise<Transaction> {
  const transaction = new Transaction();
  const coinInArg = await prepareCoinIn(
    transaction,
    coinInType,
    coinIn,
    address,
    provider
  );

  DCASDK.newAndShare({
    coinIn: coinInArg,
    coinInType,
    coinOutType,
    delegatee: DELEGATEE,
    every,
    numberOfOrders,
    timeScale,
    max,
    min,
    tx: transaction,
    fee: FEE_RATE,
    witnessType: WITNESS_TYPE,
  });

  return transaction;
}
