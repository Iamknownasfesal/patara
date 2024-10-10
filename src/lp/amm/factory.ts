import { SuiClient } from '@mysten/sui/client';

import { AftermathAMM } from './aftermath';
import { GenericAMM } from './generic';

export const AMMType = {
  Aftermath: 'aftermath',
  Flowx: 'flowx',
  Bluemove: 'bluemove',
} as const;

export type AMMTypeKeys = (typeof AMMType)[keyof typeof AMMType];

export class AMMFactory {
  static createAMM(
    type: AMMTypeKeys,
    client: SuiClient,
    objectId: string
  ): GenericAMM {
    switch (type) {
      case AMMType.Aftermath:
        return new AftermathAMM(client, objectId);
      case AMMType.Flowx:
      case AMMType.Bluemove:
        throw new Error(`AMM type ${type} not implemented yet`);
      default:
        throw new Error(`Unknown AMM type: ${type}`);
    }
  }
}
