import type { SuiClient } from '@mysten/sui/client';
import {
  Transaction,
  type TransactionObjectArgument,
} from '@mysten/sui/transactions';
import { normalizeStructTag } from '@mysten/sui/utils';
import { SuiPriceServiceConnection } from '@pythnetwork/pyth-sui-js';
import {
  type ClaimRewardsReward,
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
import type { PoolReward } from '@suilend/sdk/_generated/suilend/liquidity-mining/structs';
import type { Reserve } from '@suilend/sdk/_generated/suilend/reserve/structs';
import * as simulate from '@suilend/sdk/utils/simulate';
import { Aftermath } from 'aftermath-ts-sdk';
import BigNumber from 'bignumber.js';
import invariant from 'tiny-invariant';

import { getMultipleCoinMetadataAll, getPrices } from '../../coin';
import { lendEvent, LendWay } from '../../events';
import type { CoinMetadataMap } from '../../types';
import { getCoinForInput } from '../../utils';
import { isMayaCoinType, isSendPoints } from '../../utils/coinType';
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

    const coin = getCoinForInput(coinType, amount);

    lendEvent(LendWay.LEND, coin, coinType, transaction);

    this.suilendClient.depositCoin(
      address,
      coin,
      coinType,
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

    const borrowedCoin = await this.suilendClient.borrow(
      obligationOwnerCapId,
      obligationId,
      coinType,
      amount,
      transaction
    );

    lendEvent(LendWay.BORROW, borrowedCoin, coinType, transaction);

    transaction.transferObjects([borrowedCoin], address);

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

    const withdrawnCoin = await this.suilendClient.withdraw(
      obligationOwnerCapId,
      obligationId,
      coinType,
      amount,
      transaction
    );

    lendEvent(LendWay.WITHDRAW, withdrawnCoin, coinType, transaction);

    transaction.transferObjects([withdrawnCoin], address);

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

    const coin = getCoinForInput(coinType, amount);

    lendEvent(LendWay.REPAY, coin, coinType, transaction);

    this.suilendClient.repay(obligationId, coinType, coin, transaction);

    transaction.transferObjects([coin], address);

    return transaction;
  }

  async claimRewards(
    address: string,
    obligationOwnerCapId: string,
    rewards: (ClaimRewardsReward & { coinInAmount: bigint })[],
    isUsdc: boolean = false
  ) {
    await this.initialize();
    invariant(this.suilendClient, 'Suilend client not initialized');

    let transaction = new Transaction();
    const coinOuts: TransactionObjectArgument[] = [];

    if (isUsdc) {
      const afSdk = new Aftermath('MAINNET');
      await afSdk.init();
      const router = afSdk.Router();

      for (const reward of rewards) {
        const coin = this.suilendClient.claimReward(
          obligationOwnerCapId,
          reward.reserveArrayIndex,
          reward.rewardIndex,
          reward.rewardCoinType,
          reward.side,
          transaction
        );

        if (
          reward.rewardCoinType ===
          '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC'
        ) {
          coinOuts.push(coin);
          continue;
        }

        const route = await router.getCompleteTradeRouteGivenAmountIn({
          coinInType: reward.rewardCoinType,
          coinOutType:
            '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC',
          coinInAmount: reward.coinInAmount,
        });

        const { tx, coinOutId } =
          await router.addTransactionForCompleteTradeRoute({
            completeRoute: route,
            slippage: 0.01,
            tx: transaction,
            walletAddress: address,
            coinInId: coin,
          });

        transaction = tx;
        coinOuts.push(coinOutId!);
      }

      if (coinOuts.length > 1) {
        const mergedCoin = transaction.mergeCoins(
          coinOuts[0],
          coinOuts.slice(1)
        );
        transaction.transferObjects([mergedCoin], address);
      } else {
        transaction.transferObjects(coinOuts, address);
      }
    } else {
      this.suilendClient.claimRewardsAndSendToUser(
        address,
        obligationOwnerCapId,
        rewards,
        transaction
      );
    }

    return transaction;
  }

  async getUserAndAppData(metadata: CoinMetadataMap, address: string) {
    await this.initialize();
    invariant(this.suilendClient, 'Suilend client not initialized');

    const now = Math.floor(Date.now() / 1000);

    const rawReserves = await this.getRawReserves(now);

    const rawReservesThatIsUnknown = rawReserves
      .filter((r) => !metadata[r.coinType.name])
      .map((r) => normalizeStructTag(r.coinType.name));

    const rewardsThatIsUnknown = Array.from(
      new Set(
        [
          ...rawReserves.map((r) => r.depositsPoolRewardManager.poolRewards),
          ...rawReserves.map((r) => r.borrowsPoolRewardManager.poolRewards),
        ]
          .flat()
          .filter((r): r is PoolReward => r !== undefined && r !== null)
          .filter((r) => !metadata[normalizeStructTag(r.coinType.name)])
          .map((r) => normalizeStructTag(r.coinType.name))
      )
    );

    const coinMetadataMapWithout = await getMultipleCoinMetadataAll([
      ...rawReservesThatIsUnknown,
      ...rewardsThatIsUnknown,
    ]).then((res) =>
      res.coins.reduce((acc, coin) => {
        acc[coin.type] = coin;
        return acc;
      }, {} as CoinMetadataMap)
    );

    const combinedCoinMetadataMap = {
      ...metadata,
      ...coinMetadataMapWithout,
    };

    const parsedLendingMarket = await this.getParsedLendingMarket(
      combinedCoinMetadataMap,
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

    const rewardsWithoutReserves = rewardCoinTypes.filter(
      (coinType) =>
        !isSendPoints(coinType) &&
        !isMayaCoinType(coinType) &&
        !reserveMap[coinType]
    );

    const rewardsPriceMap = Object.entries(
      await getPrices(rewardsWithoutReserves)
    ).reduce(
      (acc, [coinType, price]) => {
        acc[coinType] = BigNumber(price);
        return acc;
      },
      {} as Record<string, BigNumber>
    );

    const rewardMap = formatRewards(
      reserveMap,
      combinedCoinMetadataMap,
      rewardsPriceMap,
      obligations
    );

    return {
      lendingMarket: parsedLendingMarket,
      lendingMarketOwnerCapId,
      obligationOwnerCaps,
      obligations,
      reserveMap,
      rewardMap,
      rewardsPriceMap,
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

  async getReserveCoinTypes() {
    await this.initialize();
    invariant(this.suilendClient, 'Suilend client not initialized');
    return this.suilendClient.lendingMarket.reserves.map((r) =>
      normalizeStructTag(r.coinType.name)
    );
  }

  async getRewardsCoinTypes() {
    await this.initialize();
    invariant(this.suilendClient, 'Suilend client not initialized');

    const borrowRewards = this.suilendClient.lendingMarket.reserves
      .map((r) =>
        r.borrowsPoolRewardManager.poolRewards
          .filter((pr): pr is PoolReward => pr !== null && pr !== undefined)
          .map((pr) => normalizeStructTag(pr.coinType.name))
      )
      .flat();

    const depositRewards = this.suilendClient.lendingMarket.reserves
      .map((r) =>
        r.depositsPoolRewardManager.poolRewards
          .filter((pr): pr is PoolReward => pr !== null && pr !== undefined)
          .map((pr) => normalizeStructTag(pr.coinType.name))
      )
      .flat();

    const set = new Set([...borrowRewards, ...depositRewards]);

    return Array.from(set);
  }

  async getReservesAndRewardsCoinTypes() {
    await this.initialize();
    invariant(this.suilendClient, 'Suilend client not initialized');
    const set = new Set([
      ...this.suilendClient.lendingMarket.reserves.map((r) =>
        normalizeStructTag(r.coinType.name)
      ),
      ...this.suilendClient.lendingMarket.reserves
        .map((r) =>
          r.borrowsPoolRewardManager.poolRewards
            .filter((pr): pr is PoolReward => pr !== null && pr !== undefined)
            .map((pr) => normalizeStructTag(pr.coinType.name))
        )
        .flat(),
      ...this.suilendClient.lendingMarket.reserves
        .map((r) =>
          r.depositsPoolRewardManager.poolRewards
            .filter((pr): pr is PoolReward => pr !== null && pr !== undefined)
            .map((pr) => normalizeStructTag(pr.coinType.name))
        )
        .flat(),
    ]);

    return Array.from(set);
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
