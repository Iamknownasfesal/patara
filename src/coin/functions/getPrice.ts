import { normalizeStructTag } from '@mysten/sui/utils';

import { API_BASE_URL } from '../constants';
import type { PriceResponse } from '../types';

export async function getPrice(type: string): Promise<number> {
  try {
    const normalizedType = normalizeStructTag(type);
    const result = await fetchPrice(normalizedType);
    return result[normalizedType].price;
  } catch (error) {
    console.error('Failed to fetch price', error);
    return 0;
  }
}

export async function getPrices(
  types: string[]
): Promise<Record<string, number>> {
  try {
    const normalizedTypes = types.map(normalizeStructTag);
    const result = await fetchPrices(normalizedTypes);
    return Object.fromEntries(
      normalizedTypes.map((type) => [type, result[type].price])
    );
  } catch (error) {
    console.error('Failed to fetch price', error);
    return Object.fromEntries(types.map((type) => [type, 0]));
  }
}

async function fetchPrice(coinType: string): Promise<PriceResponse> {
  const url = `${API_BASE_URL}/[%22${coinType}%22]`;
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  });
  return response.json();
}

async function fetchPrices(coinTypes: string[]): Promise<PriceResponse> {
  const batchSize = 50;
  const results: PriceResponse = {};

  for (let i = 0; i < coinTypes.length; i += batchSize) {
    const batch = coinTypes.slice(i, i + batchSize);
    const url = `${API_BASE_URL}/[${batch.map((type) => `"${type}"`).join(',')}]`;

    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
    });

    const batchResults: PriceResponse = await response.json();
    Object.assign(results, batchResults);
  }

  return results;
}
