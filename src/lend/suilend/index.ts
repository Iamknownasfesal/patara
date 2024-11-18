import type { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { normalizeStructTag } from '@mysten/sui/utils';
import { SuiPriceServiceConnection } from '@pythnetwork/pyth-sui-js';
import {
  LENDING_MARKET_ID,
  LENDING_MARKET_TYPE,
  type ParsedObligation,
  type ParsedReserve,
  parseLendingMarket,
  parseObligation,
  SuilendClient,
} from '@suilend/sdk';
import { phantom } from '@suilend/sdk/_generated/_framework/reified';
import { LendingMarket } from '@suilend/sdk/_generated/suilend/lending-market/structs';
import type { Reserve } from '@suilend/sdk/_generated/suilend/reserve/structs';
import * as simulate from '@suilend/sdk/utils/simulate';
import BigNumber from 'bignumber.js';
import invariant from 'tiny-invariant';

import { getMultipleCoinMetadataAll } from '../../coin';
import type { CoinMetadataMap } from '../../types';
import { isSendPoints } from './coinType';
import { formatRewards } from './liquidityMining';

export class Suilend {
  private suilendClient?: SuilendClient;
  private readonly suiClient: SuiClient;

  constructor(client: SuiClient) {
    this.suiClient = client;
  }

  async deposit(
    coinType: string,
    amount: string,
    address: string,
    obligationOwnerCapId?: string
  ) {
    await this.initialize();
    invariant(this.suilendClient, 'Suilend client not initialized');

    const transaction = new Transaction();

    await this.suilendClient.depositIntoObligation(
      address,
      coinType,
      amount,
      transaction,
      obligationOwnerCapId
    );

    return transaction;
  }

  async borrow(
    coinType: string,
    amount: string,
    address: string,
    obligationOwnerCapId: string,
    obligationId: string
  ) {
    await this.initialize();
    invariant(this.suilendClient, 'Suilend client not initialized');

    const transaction = new Transaction();

    await this.suilendClient.borrow(
      obligationOwnerCapId,
      obligationId,
      coinType,
      amount,
      transaction
    );

    return transaction;
  }

  async withdraw(
    coinType: string,
    amount: string,
    address: string,
    obligationOwnerCapId: string,
    obligationId: string
  ) {
    await this.initialize();
    invariant(this.suilendClient, 'Suilend client not initialized');

    const transaction = new Transaction();

    await this.suilendClient.withdraw(
      obligationOwnerCapId,
      obligationId,
      coinType,
      amount,
      transaction
    );

    return transaction;
  }

  async repay(
    coinType: string,
    amount: string,
    address: string,
    obligationId: string
  ) {
    await this.initialize();
    invariant(this.suilendClient, 'Suilend client not initialized');

    const transaction = new Transaction();

    await this.suilendClient.repayIntoObligation(
      address,
      obligationId,
      coinType,
      amount,
      transaction
    );

    return transaction;
  }

  async getUserAndAppData(address: string) {
    await this.initialize();
    invariant(this.suilendClient, 'Suilend client not initialized');

    const now = Math.floor(Date.now() / 1000);

    const rawReserves = await this.getRawReserves(now);

    const coinMetadataMap = await getMultipleCoinMetadataAll(
      rawReserves.map((r) => '0x' + r.coinType.name)
    ).then((res) =>
      res.coins.reduce((acc, coin) => {
        acc[coin.type] = coin;
        return acc;
      }, {} as CoinMetadataMap)
    );

    const parsedLendingMarket = await this.getParsedLendingMarket(
      coinMetadataMap,
      rawReserves,
      now
    );

    const reserveMap = parsedLendingMarket.reserves.reduce(
      (acc: Record<string, ParsedReserve>, reserve: ParsedReserve) => ({
        ...acc,
        [reserve.coinType]: reserve,
      }),
      {}
    ) as Record<string, ParsedReserve>;

    let obligationOwnerCaps;
    let obligations: ParsedObligation[] = [];

    const rewardCoinTypes: string[] = [];
    rawReserves.forEach((r) => {
      rewardCoinTypes.push(normalizeStructTag(r.coinType.name));

      [
        ...r.depositsPoolRewardManager.poolRewards,
        ...r.borrowsPoolRewardManager.poolRewards,
      ].forEach((pr) => {
        if (!pr) return;

        const coinType = normalizeStructTag(pr.coinType.name);
        rewardCoinTypes.push(coinType);
      });
    });

    const lendingMarketOwnerCapId =
      await SuilendClient.getLendingMarketOwnerCapId(
        address,
        this.suilendClient.lendingMarket.$typeArgs,
        this.suiClient
      );

    obligationOwnerCaps = await SuilendClient.getObligationOwnerCaps(
      address,
      this.suilendClient.lendingMarket.$typeArgs,
      this.suiClient
    );

    if (obligationOwnerCaps.length > 0) {
      if (obligationOwnerCaps.length > 1) {
        const obligationOwnerCapTimestampsMs = (
          await Promise.all(
            obligationOwnerCaps.map((ownerCap) =>
              this.suiClient.queryTransactionBlocks({
                limit: 1,
                order: 'ascending',
                filter: { ChangedObject: ownerCap.id },
                options: { showRawInput: true },
              })
            )
          )
        ).map((res) =>
          res?.data?.[0]?.timestampMs ? +(res.data[0].timestampMs as string) : 0
        );

        obligationOwnerCaps = obligationOwnerCaps
          .map((ownerCap, index) => ({
            ...ownerCap,
            timestampMs: obligationOwnerCapTimestampsMs[index],
          }))
          .slice()
          .sort((a, b) => a.timestampMs - b.timestampMs);
      }

      const rawObligations = await Promise.all(
        obligationOwnerCaps.map((ownerCap) => {
          invariant(this.suilendClient, 'Suilend client not initialized');

          return this.suilendClient.getObligation(ownerCap.obligationId);
        })
      );

      obligations = rawObligations
        .map((rawObligation) =>
          simulate.refreshObligation(rawObligation, rawReserves)
        )
        .map((refreshedObligation) =>
          parseObligation(refreshedObligation, reserveMap)
        );
    }

    const rewardsBirdeyePriceMap: Record<string, BigNumber | undefined> = {};

    const rewardsWithoutReserves = rewardCoinTypes.filter(
      (coinType) => !isSendPoints(coinType) && !reserveMap[coinType]
    );

    const rewardsBirdeyePrices = await Promise.all(
      rewardsWithoutReserves.map(async (coinType) => {
        try {
          const url = `https://public-api.birdeye.so/defi/price?address=${coinType}`;
          const res = await fetch(url, {
            headers: {
              'X-API-KEY': process.env.NEXT_PUBLIC_BIRDEYE_API_KEY as string,
              'x-chain': 'sui',
            },
          });
          const json = await res.json();
          return new BigNumber(json.data.value);
        } catch (err) {
          console.error(err);
        }
      })
    );

    for (let i = 0; i < rewardsWithoutReserves.length; i++) {
      rewardsBirdeyePriceMap[rewardsWithoutReserves[i]] =
        rewardsBirdeyePrices[i];
    }

    const rewardMap = formatRewards(
      reserveMap,
      coinMetadataMap,
      rewardsBirdeyePriceMap,
      obligations
    );

    return {
      lendingMarket: parsedLendingMarket,
      lendingMarketOwnerCapId,
      obligationOwnerCaps,
      obligations,
      reserveMap,
      rewardMap,
    };
  }

  async getRawReserves(now: number) {
    await this.initialize();
    invariant(this.suilendClient, 'Suilend client not initialized');

    return await simulate.refreshReservePrice(
      this.suilendClient.lendingMarket.reserves.map((r: Reserve<string>) =>
        simulate.compoundReserveInterest(r, now)
      ),
      new SuiPriceServiceConnection('https://hermes.pyth.network')
    );
  }

  private async getParsedLendingMarket(
    coinMetadataMap: CoinMetadataMap,
    reserves: Reserve<string>[],
    now: number
  ) {
    await this.initialize();
    invariant(this.suilendClient, 'Suilend client not initialized');
    return parseLendingMarket(
      this.suilendClient.lendingMarket,
      reserves,
      coinMetadataMap,
      now
    );
  }

  private async initialize() {
    const rawLendingMarket = await LendingMarket.fetch(
      this.suiClient,
      phantom(LENDING_MARKET_TYPE),
      LENDING_MARKET_ID
    );

    if (!this.suilendClient) {
      this.suilendClient = await SuilendClient.initializeWithLendingMarket(
        rawLendingMarket,
        this.suiClient
      );
    } else {
      this.suilendClient.lendingMarket = rawLendingMarket;
    }
  }
}
