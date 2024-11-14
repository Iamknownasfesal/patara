import type { CoinMetadata, SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { SuiPriceServiceConnection } from '@pythnetwork/pyth-sui-js';
import {
  LENDING_MARKET_ID,
  LENDING_MARKET_TYPE,
  type ParsedReserve,
  parseLendingMarket,
  parseObligation,
  SuilendClient,
} from '@suilend/sdk/mainnet';
import { phantom } from '@suilend/sdk/mainnet/_generated/_framework/reified';
import { LendingMarket } from '@suilend/sdk/mainnet/_generated/suilend/lending-market/structs';
import type { Reserve } from '@suilend/sdk/mainnet/_generated/suilend/reserve/structs';
import * as simulate from '@suilend/sdk/mainnet/utils/simulate';
import invariant from 'tiny-invariant';

import { getMultipleCoinMetadataAll } from '../../coin';
import type { CoinMetadataMap } from '../../types';
import { formatRewards } from './liquidityMining';

export class Suilend {
  private suilendClient?: SuilendClient<string>;
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

    await this.suilendClient.borrowFromObligation(
      address,
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

    await this.suilendClient.withdrawFromObligation(
      address,
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

  async getUserAndAppData(address: string, coinMetadataMap: CoinMetadataMap) {
    await this.initialize();
    invariant(this.suilendClient, 'Suilend client not initialized');

    const now = Math.floor(Date.now() / 1000);

    const rawReserves = await this.getRawReserves(now);

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

    let obligationOwnerCaps, obligations;

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
        .filter(
          (obligation): obligation is NonNullable<typeof obligation> =>
            obligation !== null
        )
        .map((rawObligation) =>
          simulate.refreshObligation(rawObligation, rawReserves)
        )
        .map((refreshedObligation) => {
          const parsedObligation = parseObligation(
            refreshedObligation,
            reserveMap
          );
          return parsedObligation;
        });
    }

    const rewardMap = formatRewards(reserveMap, coinMetadataMap, obligations);

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
      this.suilendClient.LendingMarket.reserves.map((r: Reserve<string>) =>
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

    // Update coin metadata map with the ones that doesn't have metadata
    const coinTypesWithMetadata = Object.keys(coinMetadataMap);
    const coinTypesWithoutMetadata = reserves
      .filter((r) => !coinTypesWithMetadata.includes(r.coinType.name))
      .map((r) => r.coinType.name);

    const withoutOnes = await getMultipleCoinMetadataAll(
      coinTypesWithoutMetadata
    );

    return parseLendingMarket(
      this.suilendClient.LendingMarket,
      reserves,
      {
        ...coinMetadataMap,
        ...withoutOnes.coins.reduce(
          (acc, coin) => {
            acc[coin.type] = coin;
            return acc;
          },
          {} as Record<string, CoinMetadata>
        ),
      },
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
      this.suilendClient.LendingMarket = rawLendingMarket;
    }
  }
}
