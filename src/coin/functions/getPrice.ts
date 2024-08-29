import { FULL_SUI_COIN_TYPE, SUI_COIN_TYPE } from "../../constants";
import { API_BASE_URL } from "../constants";
import type { PriceResponse } from "../types";

export async function getPrice(type: string): Promise<number> {
  try {
    const normalizedType = normalizeCoinType(type);
    const result = await fetchPrice(normalizedType);
    return result[normalizedType].price;
  } catch (error) {
    console.error("Failed to fetch price", error);
    return 0;
  }
}

function normalizeCoinType(type: string): string {
  return type === SUI_COIN_TYPE ? FULL_SUI_COIN_TYPE : type;
}

async function fetchPrice(coinType: string): Promise<PriceResponse> {
  const url = `${API_BASE_URL}/[%22${coinType}%22]`;
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  return response.json();
}
