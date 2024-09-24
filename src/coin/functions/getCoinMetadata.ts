import { z } from 'zod';

import {
  PATARA_METADATA_API_BASE_URL,
  PATARA_METADATA_API_ENDPOINTS,
} from '../constants';

const CoinSchema = z.object({
  type: z.string(),
  decimals: z.number(),
  description: z.string(),
  iconUrl: z.string(),
  name: z.string(),
  symbol: z.string(),
  verified: z.boolean(),
  tags: z.array(z.string()),
});

const MultipleCoinMetadataResponseWithPaginationSchema = z.object({
  coins: z.array(CoinSchema),
  pagination: z.object({
    limit: z.number(),
    offset: z.number(),
    total: z.number(),
  }),
});

const MultipleCoinMetadataResponseSchema = z.object({
  coins: z.array(CoinSchema),
});

async function fetchAndParse(url: string, schema: z.ZodSchema) {
  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch data');
  }

  return schema.parse(data);
}

async function fetchAndParseWithBody(
  url: string,
  schema: z.ZodSchema,
  body: Record<string, any>
) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch data');
  }

  return schema.parse(data);
}

export async function getMultipleCoinMetadata(
  coinTypes: string[]
): Promise<z.infer<typeof MultipleCoinMetadataResponseSchema>> {
  if (coinTypes.length > 20)
    throw new Error(
      'Maximum of 20 coin types allowed. Please use getMultipleCoinMetadataAll function instead.'
    );

  const url = `${PATARA_METADATA_API_BASE_URL}/${PATARA_METADATA_API_ENDPOINTS.MULTIPLE_COIN_METADATA}`;
  return fetchAndParseWithBody(url, MultipleCoinMetadataResponseSchema, {
    types: coinTypes,
  });
}

export async function getMultipleCoinMetadataAll(
  coinTypes: string[]
): Promise<z.infer<typeof MultipleCoinMetadataResponseSchema>> {
  const url = `${PATARA_METADATA_API_BASE_URL}/${PATARA_METADATA_API_ENDPOINTS.MULTIPLE_COIN_METADATA}`;
  const allResults = [];

  for (let i = 0; i < coinTypes.length; i += 20) {
    const chunk = coinTypes.slice(i, i + 20);
    const result = await fetchAndParseWithBody(
      url,
      MultipleCoinMetadataResponseSchema,
      {
        types: chunk,
      }
    );
    allResults.push(...result.coins);
  }

  return { coins: allResults };
}

export async function getCoinMetadata(coinType: string) {
  const url = `${PATARA_METADATA_API_BASE_URL}/${PATARA_METADATA_API_ENDPOINTS.SINGLE_COIN_METADATA}/${coinType}`;
  return fetchAndParse(url, CoinSchema);
}

export async function getTaggedCoins(
  tags: string[],
  limit: number = 20,
  offset: number = 0
) {
  const url = `${PATARA_METADATA_API_BASE_URL}/${PATARA_METADATA_API_ENDPOINTS.TAGGED_COINS}?tags=${tags.join(',')}&limit=${limit}&offset=${offset}`;
  return fetchAndParse(url, MultipleCoinMetadataResponseWithPaginationSchema);
}

export async function getTaggedCoinsAll(tags: string[]) {
  const allResults = [];
  const limit = 20;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const url = `${PATARA_METADATA_API_BASE_URL}/${PATARA_METADATA_API_ENDPOINTS.TAGGED_COINS}?tags=${tags.join(',')}&limit=${limit}&offset=${offset}`;
    const result = await fetchAndParse(
      url,
      MultipleCoinMetadataResponseWithPaginationSchema
    );

    allResults.push(...result.coins);
    offset += limit;
    hasMore = result.coins.length === limit;
  }

  return { coins: allResults };
}

export async function searchCoins(
  query: string,
  limit: number = 20,
  offset: number = 0
) {
  const url = `${PATARA_METADATA_API_BASE_URL}/${PATARA_METADATA_API_ENDPOINTS.SEARCH}?search=${query}&limit=${limit}&offset=${offset}`;
  return fetchAndParse(url, MultipleCoinMetadataResponseWithPaginationSchema);
}

export async function searchCoinsAll(query: string) {
  const allResults = [];
  const limit = 20;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const url = `${PATARA_METADATA_API_BASE_URL}/${PATARA_METADATA_API_ENDPOINTS.SEARCH}?search=${query}&limit=${limit}&offset=${offset}`;
    const result = await fetchAndParse(
      url,
      MultipleCoinMetadataResponseWithPaginationSchema
    );

    allResults.push(...result.coins);
    offset += limit;
    hasMore = result.coins.length === limit;
  }

  return { coins: allResults };
}
