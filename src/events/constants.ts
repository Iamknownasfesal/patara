import { Inputs } from '@mysten/sui/transactions';

export const PACKAGE =
  '0x72b79165ebc2a35e9166168b952c31aafc1531b73bc29c471dc4944b0054b88e';
export const EVENTS_PACKAGE =
  '0x72b79165ebc2a35e9166168b952c31aafc1531b73bc29c471dc4944b0054b88e';
export const SHARED_OBJECTS = {
  FEE_CONFIG: Inputs.SharedObjectRef({
    objectId:
      '0x0c11bc35a748db7971d9afbcf4fa26176e7277697c95e596b7cdc9b3e2df0c73',
    initialSharedVersion: '436319355',
    mutable: true,
  }) as ReturnType<typeof Inputs.SharedObjectRef>,
} as const;
