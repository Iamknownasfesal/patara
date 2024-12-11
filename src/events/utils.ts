import type {
  Transaction,
  TransactionObjectArgument,
} from '@mysten/sui/transactions';

import { EVENTS_PACKAGE, SHARED_OBJECTS } from './constants';

export function getFeeConfig(tx: Transaction): TransactionObjectArgument {
  return tx.object(SHARED_OBJECTS.FEE_CONFIG);
}

export function buildEvent(module: string, event: string) {
  return `${EVENTS_PACKAGE}::events_${module}::${event}`;
}
