import type { SuiEvent as MystenSuiEvent } from '@mysten/sui/client';

export type SuiEvent = {
  metadata: MystenSuiEvent;
};

export type address = string;
export type TypeName = { name: string };
