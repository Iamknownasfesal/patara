import { coinWithBalance, Transaction } from '@mysten/sui/transactions';

import { DCASDK, DELEGATEE, FEE_RATE, WITNESS_TYPE } from '../constants';
import type { DCAParams } from '../types';

export function newDCA({
  address,
  coinIn,
  every,
  numberOfOrders,
  timeScale,
  coinInType,
  coinOutType,
  min,
  max,
  receiver,
}: DCAParams): Transaction {
  const transaction = new Transaction();

  DCASDK.newAndShare({
    coinIn: coinWithBalance({
      balance: coinIn,
      type: coinInType,
    }),
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
    receiver: receiver ?? address,
  });

  return transaction;
}
