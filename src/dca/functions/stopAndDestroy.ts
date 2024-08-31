import { Transaction } from '@mysten/sui/transactions';

import { DCASDK } from '../constants';
import type { StopAndDestroyParams } from '../types';

export async function stopAndDestroy({
  coinInType,
  coinOutType,
  dca,
}: StopAndDestroyParams): Promise<Transaction> {
  return DCASDK.stopAndDestroy({
    coinInType,
    coinOutType,
    dca,
  });
}
