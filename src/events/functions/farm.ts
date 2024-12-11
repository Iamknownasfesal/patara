import type {
  Transaction,
  TransactionArgument,
} from '@mysten/sui/transactions';
import invariant from 'tiny-invariant';

import { PACKAGE } from '../constants';
import { FARM_WAY_MAP, FarmWay } from '../types';
import { getFeeConfig } from '../utils';

export function farmEvent(
  way: FarmWay = FarmWay.DEPOSIT,
  coins: TransactionArgument[],
  coinTypes: string[],
  farm_id: string,
  transaction: Transaction
): Transaction {
  invariant(coinTypes.length > 0, 'Coin types length must be greater than 0');

  transaction.moveCall({
    package: PACKAGE,
    module: 'farm',
    function:
      way === FarmWay.HARVEST
        ? `${FARM_WAY_MAP[way]}_${coinTypes.length}`
        : FARM_WAY_MAP[way],
    typeArguments: coinTypes,
    arguments: [
      getFeeConfig(transaction),
      ...coins,
      transaction.pure.id(farm_id),
    ],
  });

  return transaction;
}
