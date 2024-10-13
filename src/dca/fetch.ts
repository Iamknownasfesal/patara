import BigNumber from 'bignumber.js';

import { getMultipleCoinMetadataAll } from '../coin';
import type { CoinMetadataMap } from '../types';
import { BASE_URL } from './constants';
import {
  type DCAObject,
  DCAOObjectsSchema,
  type DCAOrder,
  DCAOrderSchema,
  type ParsedDCAObject,
  type ParsedDCAOrder,
} from './types';

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
): Promise<ParsedDCAObject[]> {
  const dcaObjects = await fetchDCAObjects(owner);

  const updatedCoinMetadataMap = await fetchMissingCoinMetadata(
    dcaObjects,
    coinMetadataMap
  );

  return dcaObjects.map((dca) => parseDCAObject(dca, updatedCoinMetadataMap));
}

export async function fetchDCAOrdersAndParse(
  dca: string,
  coinMetadataMap: CoinMetadataMap
) {
  const dcaOrders = await fetchDCAOrders(dca);

  const updatedCoinMetadataMap = await fetchMissingCoinMetadataForOrders(
    dcaOrders,
    coinMetadataMap
  );

  return dcaOrders.map((dcaOrder) =>
    parseDCAOrder(dcaOrder, updatedCoinMetadataMap)
  );
}

function parseDCAObject(
  dca: DCAObject,
  coinMetadataMap: CoinMetadataMap
): ParsedDCAObject {
  const sellInfo = coinMetadataMap[`0x${dca.input.name}`];
  const buyInfo = coinMetadataMap[`0x${dca.output.name}`];

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
  const sellInfo = coinMetadataMap[`0x${dcaOrder.input.name}`];
  const buyInfo = coinMetadataMap[`0x${dcaOrder.output.name}`];

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
    sellInfo: {
      symbol: sellInfo.symbol,
      name: sellInfo.name,
      decimals: sellInfo.decimals,
      description: sellInfo.description,
      id: sellInfo.id || undefined,
      iconUrl: sellInfo.iconUrl || undefined,
    },
    buyInfo: {
      symbol: buyInfo.symbol,
      name: buyInfo.name,
      decimals: buyInfo.decimals,
      description: buyInfo.description,
      id: buyInfo.id || undefined,
      iconUrl: buyInfo.iconUrl || undefined,
    },
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
  return new Date(timestampMs).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'numeric',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
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
  return new Date(timestamp * 1000).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function fetchMissingCoinMetadata(
  dcaObjects: DCAObject[],
  coinMetadataMap: CoinMetadataMap
): Promise<CoinMetadataMap> {
  const coinsInThatIsNotInMetadata = dcaObjects
    .filter((dca) => !coinMetadataMap[`0x${dca.input.name}`])
    .map((dca) => `0x${dca.input.name}`);

  const coinsOutThatIsNotInMetadata = dcaObjects
    .filter((dca) => !coinMetadataMap[`0x${dca.output.name}`])
    .map((dca) => `0x${dca.output.name}`);

  const all = [...coinsInThatIsNotInMetadata, ...coinsOutThatIsNotInMetadata];

  if (all.length === 0) {
    return coinMetadataMap;
  }

  const coinMetadata = await getMultipleCoinMetadataAll(all);

  return {
    ...coinMetadataMap,
    ...coinMetadata.coins.reduce((acc, coin) => {
      acc[coin.type] = coin;
      return acc;
    }, {} as CoinMetadataMap),
  };
}

async function fetchMissingCoinMetadataForOrders(
  dcaOrders: DCAOrder[],
  coinMetadataMap: CoinMetadataMap
): Promise<CoinMetadataMap> {
  const coinsInThatIsNotInMetadata = dcaOrders
    .filter((order) => !coinMetadataMap[`0x${order.input.name}`])
    .map((order) => `0x${order.input.name}`);

  const coinsOutThatIsNotInMetadata = dcaOrders
    .filter((order) => !coinMetadataMap[`0x${order.output.name}`])
    .map((order) => `0x${order.output.name}`);

  const all = [...coinsInThatIsNotInMetadata, ...coinsOutThatIsNotInMetadata];

  if (all.length === 0) {
    return coinMetadataMap;
  }

  const coinMetadata = await getMultipleCoinMetadataAll(all);

  return {
    ...coinMetadataMap,
    ...coinMetadata.coins.reduce((acc, coin) => {
      acc[coin.type] = coin;
      return acc;
    }, {} as CoinMetadataMap),
  };
}
