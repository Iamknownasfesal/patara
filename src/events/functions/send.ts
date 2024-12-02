import {
  Transaction,
  type TransactionArgument,
} from '@mysten/sui/transactions';

import { PACKAGE } from '../constants';

export function sendEvent(
  coin: TransactionArgument,
  coinType: string,
  receiver: string,
  transaction: Transaction
): Transaction {
  transaction.moveCall({
    package: PACKAGE,
    module: 'send',
    function: 'transfer',
    typeArguments: [coinType],
    arguments: [coin, transaction.pure.address(receiver)],
  });

  return transaction;
}
