import {
  coinWithBalance,
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
