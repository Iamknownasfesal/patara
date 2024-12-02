import type {
  Transaction,
  TransactionArgument,
} from '@mysten/sui/transactions';

import { PACKAGE } from '../constants';
import { LEND_WAY_MAP, LendWay } from '../types';
import { getFeeConfig } from '../utils';

export function lendEvent(
  way: LendWay = LendWay.LEND,
  coinIn: TransactionArgument,
  coinType: string,
  transaction: Transaction
): Transaction {
  transaction.moveCall({
    package: PACKAGE,
    module: 'lend',
    function: LEND_WAY_MAP[way],
    typeArguments: [coinType],
    arguments: [getFeeConfig(transaction), coinIn],
  });

  return transaction;
}
