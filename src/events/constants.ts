import { Inputs } from '@mysten/sui/transactions';

export const PACKAGE = '0x0';
export const SHARED_OBJECTS = {
  FEE_CONFIG: Inputs.SharedObjectRef({
    objectId: '0x0',
    initialSharedVersion: '0',
    mutable: true,
  }) as ReturnType<typeof Inputs.SharedObjectRef>,
} as const;
