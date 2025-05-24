import { z } from 'zod';

export const CoinSchema = z.object({
  type: z.string(),
  decimals: z.number(),
  description: z.string(),
  iconUrl: z.string(),
  name: z.string(),
  symbol: z.string(),
  verified: z.boolean(),
  tags: z.array(z.string()),
});

export const MultipleCoinMetadataResponseWithPaginationSchema = z.object({
  coins: z.array(CoinSchema),
  pagination: z.object({
    limit: z.number(),
    offset: z.number(),
    total: z.number(),
  }),
});

export const MultipleCoinMetadataResponseSchema = z.object({
  coins: z.array(CoinSchema),
});

export const CoinDecimalsSchema = z.object({
  type: z.string(),
  decimals: z.number(),
});

export const MultipleCoinDecimalsResponseSchema = z.object({
  decimals: z.record(z.string(), z.number()),
});
