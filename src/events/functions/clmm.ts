import type {
  Transaction,
  TransactionArgument,
} from '@mysten/sui/transactions';
import invariant from 'tiny-invariant';

import { PACKAGE } from '../constants';
import { CLMM_WAY_MAP, ClmmWay } from '../types';
import { getFeeConfig } from '../utils';

export function clmmEvent(
  way: ClmmWay = ClmmWay.CREATE_POSITION,
  coins: [TransactionArgument, TransactionArgument],
  coinTypes: [string, string],
  pool_id: string,
  transaction: Transaction
): Transaction {
  invariant(coins.length === coinTypes.length, 'Coin length mismatch');
  invariant(coins.length === 2, 'Coins length must be 2');
  invariant(coinTypes.length === 2, 'Coin types length must be 2');

  transaction.moveCall({
    package: PACKAGE,
    module: 'clmm',
    function: CLMM_WAY_MAP[way],
    typeArguments: coinTypes,
    arguments: [
      getFeeConfig(transaction),
      ...coins,
      transaction.pure.id(pool_id),
    ],
  });

  return transaction;
}
