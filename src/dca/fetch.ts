import BigNumber from "bignumber.js";
import { getTokenInfoFromMetadata } from "../portfolio/functions/token";
import type { CoinMetadataMap } from "../types";
import { BASE_URL } from "./constants";
import {
  DCAOObjectsSchema,
  type DCAObject,
  type DCAOrder,
  DCAOrderSchema,
  type ParsedDCAObject,
  type ParsedDCAOrder,
} from "./types";

async function fetchAndParse<T>(
  url: string,
  schema: typeof DCAOObjectsSchema | typeof DCAOrderSchema
): Promise<T> {
  const response = await fetch(url);
  const data = await response.json();
  return schema.parse(data) as T;
}

export async function fetchDCAObjects(owner: string): Promise<DCAObject[]> {
  return fetchAndParse<DCAObject[]>(
    `${BASE_URL}/dcas?owner=${owner}`,
    DCAOObjectsSchema
  );
}

export async function fetchDCAOrders(dca: string): Promise<DCAOrder[]> {
  return fetchAndParse<DCAOrder[]>(
    `${BASE_URL}/dcas/${dca}/orders`,
    DCAOrderSchema
  );
}

export async function fetchDCAObjectsAndParse(
  owner: string,
  coinMetadataMap: CoinMetadataMap
) {
  const dcaObjects = await fetchDCAObjects(owner);
  return dcaObjects.map((dca) => parseDCAObject(dca, coinMetadataMap));
}

export async function fetchDCAOrdersAndParse(
  dca: string,
  coinMetadataMap: CoinMetadataMap
) {
  const dcaOrders = await fetchDCAOrders(dca);
  return dcaOrders.map((dcaOrder) => parseDCAOrder(dcaOrder, coinMetadataMap));
}

function parseDCAObject(
  dca: DCAObject,
  coinMetadataMap: CoinMetadataMap
): ParsedDCAObject {
  const sellInfo = getTokenInfoFromMetadata(
    coinMetadataMap,
    `0x${dca.input.name}`
  );
  const buyInfo = getTokenInfoFromMetadata(
    coinMetadataMap,
    `0x${dca.output.name}`
  );

  const percentage = calculatePercentage(dca.remainingOrders, dca.orderCount);
  const sellBalance = calculateSellBalance(dca, sellInfo);
  const spentBalance = calculateSpentBalance(dca, sellInfo);
  const eachOrderSize = calculateEachOrderSize(dca, sellInfo);
  const buyBalance = calculateBuyBalance(dca, buyInfo);
  const { minPrice, maxPrice } = calculatePrices(dca, buyInfo, sellInfo);
  const totalDeposited = calculateTotalDeposited(dca, sellInfo);
  const formattedDate = formatDate(dca.start);

  return {
    ...dca,
    sellInfo,
    buyInfo,
    percentage,
    sellBalance,
    spentBalance,
    eachOrderSize,
    buyBalance,
    minPrice,
    maxPrice,
    totalDeposited,
    formattedDate,
    orderLength: dca.orders.length,
    orders: dca.orders.map((order) => parseDCAOrder(order, coinMetadataMap)),
  };
}

function parseDCAOrder(
  dcaOrder: DCAOrder,
  coinMetadataMap: CoinMetadataMap
): ParsedDCAOrder {
  const sellInfo = getTokenInfoFromMetadata(
    coinMetadataMap,
    `0x${dcaOrder.input.name}`
  );

  const buyInfo = getTokenInfoFromMetadata(
    coinMetadataMap,
    `0x${dcaOrder.output.name}`
  );

  const inputAmountNormalized = normalizeAmount(
    dcaOrder.input_amount,
    sellInfo.decimals
  );

  const outputAmountNormalized = normalizeAmount(
    dcaOrder.output_amount,
    buyInfo.decimals
  );

  const exchangeRate = calculateExchangeRate(
    outputAmountNormalized,
    inputAmountNormalized
  );

  const formattedDate = formatOrderDate(dcaOrder.timestampMs);
  const url = generateTransactionUrl(dcaOrder.digest);

  return {
    ...dcaOrder,
    sellInfo,
    buyInfo,
    inputAmountNormalized,
    outputAmountNormalized,
    exchangeRate,
    formattedDate,
    url,
  };
}

function normalizeAmount(amount: string, decimals: number): string {
  return BigNumber(amount).div(BigNumber(10).pow(decimals)).toFixed(2);
}

function calculateExchangeRate(
  outputAmount: string,
  inputAmount: string
): string {
  return BigNumber(outputAmount).div(BigNumber(inputAmount)).toFixed(2);
}

function formatOrderDate(timestampMs: number): string {
  return new Date(timestampMs).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "numeric",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function generateTransactionUrl(digest: string): string {
  return `https://suivision.xyz/txblock/${digest}`;
}

function calculatePercentage(
  remainingOrders: number,
  orderCount: number
): number {
  return 100 - (remainingOrders / orderCount) * 100;
}

function calculateSellBalance(dca: DCAObject, sellInfo: any): string {
  return BigNumber(
    dca.orders.reduce(
      (acc, order) => acc.plus(order.input_amount),
      new BigNumber(0)
    )
  )
    .minus(dca.inputBalance)
    .abs()
    .div(10 ** sellInfo.decimals)
    .toFixed(2);
}

function calculateSpentBalance(dca: DCAObject, sellInfo: any): string {
  return BigNumber(
    dca.orders.reduce(
      (acc, order) => acc.plus(order.input_amount),
      new BigNumber(0)
    )
  )
    .div(10 ** sellInfo.decimals)
    .toFixed(2);
}

function calculateEachOrderSize(dca: DCAObject, sellInfo: any): string {
  return BigNumber(
    dca.orders.reduce(
      (acc, order) => acc.plus(order.input_amount),
      new BigNumber(0)
    )
  )
    .div(dca.orderCount)
    .div(10 ** sellInfo.decimals)
    .toFixed(2);
}

function calculateBuyBalance(dca: DCAObject, buyInfo: any): string {
  return BigNumber(
    dca.orders.reduce(
      (acc, order) => acc.plus(order.output_amount),
      new BigNumber(0)
    )
  )
    .div(10 ** buyInfo.decimals)
    .toFixed(2);
}

function calculatePrices(dca: DCAObject, buyInfo: any, sellInfo: any) {
  const calculatePrice = (value: string) =>
    BigNumber(value)
      .div(BigNumber(10).pow(buyInfo.decimals))
      .div(
        BigNumber(dca.amountPerTrade).div(BigNumber(10).pow(sellInfo.decimals))
      )
      .toFixed(0);

  return {
    minPrice: calculatePrice(dca.min),
    maxPrice: calculatePrice(dca.max),
  };
}

function calculateTotalDeposited(dca: DCAObject, sellInfo: any): string {
  return BigNumber(dca.inputBalance)
    .div(10 ** sellInfo.decimals)
    .toFixed(2);
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
