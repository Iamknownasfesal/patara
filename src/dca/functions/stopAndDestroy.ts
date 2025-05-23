import { Transaction } from '@mysten/sui/transactions';

import { DCASDK } from '../constants';
import type { StopAndDestroyParams } from '../types';

export function stopAndDestroy({
  coinInType,
  coinOutType,
  dca,
}: StopAndDestroyParams): Transaction {
  return DCASDK.stopAndDestroy({
    coinInType,
    coinOutType,
    dca,
  });
}
