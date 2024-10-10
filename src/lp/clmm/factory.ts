import { SuiClient } from '@mysten/sui/client';

import type { GenericCLMM } from './generic';
import { TurbosCLMM } from './turbos';

export const CLMMType = {
  Turbos: 'Turbos',
} as const;

export type CLMMTypeKeys = (typeof CLMMType)[keyof typeof CLMMType];

export class CLMMFactory {
  static createCLMM(
    type: CLMMTypeKeys,
    client: SuiClient,
    objectId: string
  ): GenericCLMM {
    switch (type) {
      case CLMMType.Turbos:
        return new TurbosCLMM(client, objectId);
      default:
        throw new Error(`Unknown CLMM type: ${type}`);
    }
  }
}
