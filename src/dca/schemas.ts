import { z } from 'zod';

export const DCAOObjectsSchema = z.array(
  z.object({
    input: z.object({ name: z.string() }),
    output: z.object({ name: z.string() }),
    _id: z.string(),
    id: z.string(),
    owner: z.string(),
    receiver: z.string().optional(),
    delegatee: z.string(),
    every: z.number(),
    orderCount: z.number(),
    remainingOrders: z.number(),
    start: z.number(),
    timeScale: z.number(),
    inputBalance: z.string(),
    amountPerTrade: z.string(),
    min: z.string(),
    max: z.string(),
    active: z.boolean(),
    canceled: z.boolean(),
    isTrading: z.boolean(),
    feePercent: z.string(),
    lastTrade: z.number(),
    cooldown: z.number(),
    __v: z.number(),
    orders: z.array(
      z.object({
        input: z.object({ name: z.string() }),
        output: z.object({ name: z.string() }),
        _id: z.string(),
        fee: z.string(),
        input_amount: z.string(),
        output_amount: z.string(),
        dca: z.string(),
        timestampMs: z.number(),
        digest: z.string(),
        __v: z.number(),
      })
    ),
  })
);

export const DCAOrderSchema = z.array(
  z.object({
    input: z.object({ name: z.string() }),
    output: z.object({ name: z.string() }),
    _id: z.string(),
    fee: z.string(),
    input_amount: z.string(),
    output_amount: z.string(),
    dca: z.string(),
    timestampMs: z.number(),
    digest: z.string(),
    __v: z.number(),
  })
);

const CoinMetadataSchema = z.object({
  decimals: z.number(),
  description: z.string(),
  iconUrl: z.string().optional(),
  id: z.string().optional(),
  name: z.string(),
  symbol: z.string(),
});

export const ParsedDCAOrderSchema = z.object({
  ...DCAOrderSchema.element.shape,
  sellInfo: CoinMetadataSchema,
  buyInfo: CoinMetadataSchema,
  inputAmountNormalized: z.string(),
  outputAmountNormalized: z.string(),
  exchangeRate: z.string(),
  formattedDate: z.string(),
  url: z.string(),
});

export const ParsedDCAObjectSchema = z.object({
  ...DCAOObjectsSchema.element.shape,
  sellInfo: z.any(),
  buyInfo: z.any(),
  percentage: z.number(),
  sellBalance: z.string(),
  spentBalance: z.string(),
  eachOrderSize: z.string(),
  buyBalance: z.string(),
  minPrice: z.string(),
  maxPrice: z.string(),
  totalDeposited: z.string(),
  formattedDate: z.string(),
  orderLength: z.number(),
  orders: z.array(ParsedDCAOrderSchema),
});
