import {
  Transaction,
  type TransactionArgument,
} from '@mysten/sui/transactions';

import { PACKAGE } from '../constants';
import { getFeeConfig } from '../utils';

export function startSwapEvent(
  coinIn: TransactionArgument,
  coinTypes: [string, string],
  minAmountOut: number,
  transaction: Transaction
): TransactionArgument {
  return transaction.moveCall({
    package: PACKAGE,
    module: 'swap',
    function: 'start_swap',
    typeArguments: coinTypes,
    arguments: [coinIn, transaction.pure.u64(minAmountOut)],
  });
}

export function endSwapEvent(
  coinOut: TransactionArgument,
  coinTypes: [string, string],
  hotPotato: TransactionArgument,
  transaction: Transaction
): Transaction {
  transaction.moveCall({
    package: PACKAGE,
    module: 'swap',
    function: 'swap_exact_in_for_exact_out',
    typeArguments: coinTypes,
    arguments: [getFeeConfig(transaction), hotPotato, coinOut],
  });

  return transaction;
}
