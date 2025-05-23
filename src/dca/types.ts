import { z } from 'zod';

import type { CoinMetadataMap } from '../types';
import type {
  DCAOObjectsSchema,
  DCAOrderSchema,
  ParsedDCAObjectSchema,
  ParsedDCAOrderSchema,
} from './schemas';

export type DCAObject = z.infer<typeof DCAOObjectsSchema>[0];

export type DCAOrder = z.infer<typeof DCAOrderSchema>[0];

export type DCAParams = {
  address: string;
  coinIn: bigint;
  every: number;
  numberOfOrders: number;
  timeScale: number;
  coinInType: string;
  coinOutType: string;
  min?: bigint;
  max?: bigint;
  receiver?: string;
};

export type StopAndDestroyParams = {
  coinInType: string;
  coinOutType: string;
  dca: string;
};

export type ParsedDCAObject = z.infer<typeof ParsedDCAObjectSchema>;

export type ParsedDCAOrder = z.infer<typeof ParsedDCAOrderSchema>;

export type UseDCAParams = {
  address?: string;
  metadata?: CoinMetadataMap;
};
