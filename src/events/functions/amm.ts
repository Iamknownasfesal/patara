import type {
  Transaction,
  TransactionArgument,
} from '@mysten/sui/transactions';
import invariant from 'tiny-invariant';

import { PACKAGE } from '../constants';
import { AMM_WAY_MAP, AmmWay } from '../types';
import { getFeeConfig } from '../utils';

export function ammEvent(
  way: AmmWay = AmmWay.ADD_LIQUIDITY,
  coins: TransactionArgument[],
  coinTypes: string[],
  pool_id: string,
  transaction: Transaction
): Transaction {
  invariant(coins.length === coinTypes.length, 'Coin length mismatch');
  invariant(coins.length > 0, 'Coins length must be greater than 0');
  invariant(coinTypes.length > 0, 'Coin types length must be greater than 0');

  transaction.moveCall({
    package: PACKAGE,
    module: 'amm',
    function: `${AMM_WAY_MAP[way]}_${coinTypes.length}_coins`,
    typeArguments: coinTypes,
    arguments: [
      getFeeConfig(transaction),
      ...coins,
      transaction.pure.id(pool_id),
    ],
  });

  return transaction;
}
