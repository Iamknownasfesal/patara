import type {
  Transaction,
  TransactionObjectArgument,
} from '@mysten/sui/transactions';

import { SHARED_OBJECTS } from './constants';

export function getFeeConfig(tx: Transaction): TransactionObjectArgument {
  return tx.object(SHARED_OBJECTS.FEE_CONFIG);
}
