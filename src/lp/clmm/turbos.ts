import type { SuiClient } from '@mysten/sui/client';
import {
  Transaction,
  type TransactionArgument,
} from '@mysten/sui/transactions';
import { SUI_CLOCK_OBJECT_ID } from '@mysten/sui/utils';
import { Aftermath } from 'aftermath-ts-sdk';
import invariant from 'tiny-invariant';
import {
  BN,
  Decimal,
  Network,
  NFT as NFTClass,
  ONE_MINUTE,
  Pool,
  Pool as PoolClass,
  TurbosSdk,
} from 'turbos-clmm-sdk';

import { getMultipleCoinMetadataAll, getPrice } from '../../coin';
import { getCoinForInput } from '../../utils';
import { GenericCLMM } from './generic';
import type {
  ClosePositionArgs,
  CollectFeesArgs,
  CreatePositionArgs,
  DecreasePositionArgs,
  IncreasePositionArgs,
  QuoteAmountsOutResponse,
  QuoteClosePositionArgs,
  QuoteClosePositionResponse,
  QuoteCollectFeesArgs,
  QuoteCollectFeesResponse,
  QuoteCreatePositionArgs,
  QuoteDecreasePositionArgs,
  QuoteIncreasePositionArgs,
} from './types';

export class TurbosCLMM extends GenericCLMM {
  private pool?: Pool.Pool;
  private sdk: TurbosSdk;
  private poolInstance: PoolClass;
  private nftInstance: NFTClass;
  private aftermathInstance: Aftermath;
  protected readonly objectId: string;

  constructor(client: SuiClient, objectId: string) {
    super(client);
    this.objectId = objectId;
    this.sdk = new TurbosSdk(Network.mainnet, this.client);
    this.poolInstance = new PoolClass(this.sdk);
    this.nftInstance = new NFTClass(this.sdk);
    this.aftermathInstance = new Aftermath(Network.mainnet);
  }

  async createPosition(args: CreatePositionArgs): Promise<Transaction> {
    await this.initializeOrRefreshPool();
    invariant(this.pool, 'The pool must be defined');

    const {
      amountsIn,
      slippage,
      tickLower,
      tickUpper,
      walletAddress,
      autoConvert,
    } = args;

    let amountA = new Decimal(amountsIn.base.toString());
    let amountB = new Decimal(amountsIn.quote.toString());

    const contract = await this.sdk.contract.getConfig();

    const [coinTypeA, coinTypeB] = await this.sdk.pool.getPoolTypeArguments(
      this.objectId
    );

    const coins = await getMultipleCoinMetadataAll([coinTypeA, coinTypeB]);

    const coinA = coins.coins.find((c) => c.type === coinTypeA);
    const coinB = coins.coins.find((c) => c.type === coinTypeB);

    invariant(coinA, 'Coin A not found');
    invariant(coinB, 'Coin B not found');

    const currentPrice = this.sdk.math
      .sqrtPriceX64ToPrice(
        new BN(this.pool.sqrt_price),
        coinA.decimals,
        coinB.decimals
      )
      .toString();

    const priceA = new Decimal(amountA).mul(currentPrice);
    const priceB = amountB;
    const totalPrice = priceA.plus(priceB);
    const ratioA = new Decimal(priceA).div(totalPrice).mul(100);
    const ratioB = new Decimal(100).minus(ratioA);

    let txb = new Transaction();

    let coinAObject: TransactionArgument | undefined,
      coinBObject: TransactionArgument | undefined;

    if (autoConvert.active) {
      const coinInAmount = autoConvert.quote
        ? amountA.mul(ratioB).toString()
        : amountB.mul(ratioA).toString();

      const coinInType = autoConvert.quote
        ? this.pool?.coin_a
        : this.pool?.coin_b;

      const coinOutType = autoConvert.quote
        ? this.pool?.coin_b
        : this.pool?.coin_a;

      const route = await this.aftermathInstance
        .Router()
        .getCompleteTradeRouteGivenAmountIn({
          coinInType,
          coinOutType,
          coinInAmount: BigInt(coinInAmount),
        });

      const coinInId = await getCoinForInput(
        this.client,
        walletAddress,
        coinInType,
        autoConvert.quote ? amountA.toString() : amountB.toString(),
        txb
      );

      const { tx: endingTransaction, coinOutId } = await this.aftermathInstance
        .Router()
        .addTransactionForCompleteTradeRoute({
          completeRoute: route,
          slippage,
          walletAddress,
          tx: txb,
          coinInId,
        });

      txb = endingTransaction;
      coinAObject = autoConvert.quote ? coinInId : coinOutId;
      coinBObject = autoConvert.quote ? coinOutId : coinInId;
      amountA = new Decimal(
        autoConvert.quote
          ? route.coinOut.amount.toString()
          : route.coinIn.amount.toString()
      );
      amountB = new Decimal(
        autoConvert.quote
          ? route.coinIn.amount.toString()
          : route.coinOut.amount.toString()
      );
    } else {
      coinAObject = await getCoinForInput(
        this.client,
        walletAddress,
        this.pool?.coin_a,
        amountA.toString(),
        txb
      );
      coinBObject = await getCoinForInput(
        this.client,
        walletAddress,
        this.pool?.coin_b,
        amountB.toString(),
        txb
      );
    }

    invariant(coinAObject, 'Coin A object not found');
    invariant(coinBObject, 'Coin B object not found');

    const [positionNft, exceedCoinA, exceedCoinB] = await txb.moveCall({
      target: `${contract.PackageId}::position_manager::mint_with_return_`,
      typeArguments: [coinTypeA, coinTypeB],
      arguments: [
        // pool
        txb.object(this.objectId),
        // positions
        txb.object(contract.Positions),
        // coins
        txb.makeMoveVec({
          elements: [coinAObject],
        }),
        txb.makeMoveVec({
          elements: [coinBObject],
        }),
        // tick_lower_index
        txb.pure.u32(Number(Math.abs(tickLower).toFixed(0))),
        txb.pure.bool(tickLower < 0),
        // tick_upper_index
        txb.pure.u32(Number(Math.abs(tickUpper).toFixed(0))),
        txb.pure.bool(tickUpper < 0),
        // amount_desired
        txb.pure.u64(amountA.toFixed(0)),
        txb.pure.u64(amountB.toFixed(0)),
        // amount_min
        txb.pure.u64(this.getMinimumAmountBySlippage(amountA, slippage)),
        txb.pure.u64(this.getMinimumAmountBySlippage(amountB, slippage)),
        // recipient
        txb.pure.address(walletAddress),
        // deadline
        txb.pure.u64(Date.now() + ONE_MINUTE),
        // clock
        txb.object(SUI_CLOCK_OBJECT_ID),
        // versioned
        txb.object(contract.Versioned),
      ],
    });

    txb.transferObjects([positionNft, exceedCoinA, exceedCoinB], walletAddress);

    return txb;

    // return this.poolInstance.addLiquidity({
    //   address: walletAddress,
    //   amountA: amountsIn.base.toString(),
    //   amountB: amountsIn.quote.toString(),
    //   pool: this.objectId,
    //   slippage,
    //   tickLower,
    //   tickUpper,
    // });
  }

  async increasePosition(args: IncreasePositionArgs): Promise<Transaction> {
    await this.initializeOrRefreshPool();
    const { amountsIn, nft, walletAddress, slippage } = args;

    return this.poolInstance.increaseLiquidity({
      address: walletAddress,
      amountA: amountsIn.base.toString(),
      amountB: amountsIn.quote.toString(),
      pool: this.objectId,
      nft,
      slippage,
    });
  }

  async decreasePosition(args: DecreasePositionArgs): Promise<Transaction> {
    await this.initializeOrRefreshPool();
    invariant(this.pool, 'The pool must be defined');
    const { nft, walletAddress, slippage, percentage, decimals } = args;
    const position = await this.nftInstance.getPositionFields(nft);

    const diffLiquidity = new Decimal(position.liquidity)
      .mul(percentage)
      .div(100)
      .toFixed(0);

    const [bigAmountA, bigAmountB] =
      this.poolInstance.getTokenAmountsFromLiquidity({
        liquidity: new BN(diffLiquidity),
        currentSqrtPrice: new BN(this.pool.sqrt_price),
        lowerSqrtPrice: this.sdk.math.tickIndexToSqrtPriceX64(
          this.sdk.math.bitsToNumber(position.tick_lower_index.fields.bits)
        ),
        upperSqrtPrice: this.sdk.math.tickIndexToSqrtPriceX64(
          this.sdk.math.bitsToNumber(position.tick_upper_index.fields.bits)
        ),
      });

    return this.poolInstance.decreaseLiquidity({
      address: walletAddress,
      pool: this.objectId,
      nft,
      slippage,
      amountA: this.sdk.math.scaleDown(
        new Decimal(bigAmountA.toString()).toString(),
        decimals.coinA
      ),
      amountB: this.sdk.math.scaleDown(
        new Decimal(bigAmountB.toString()).toString(),
        decimals.coinB
      ),
      decreaseLiquidity: diffLiquidity,
    });
  }

  async closePosition(args: ClosePositionArgs): Promise<Transaction> {
    await this.initializeOrRefreshPool();
    invariant(this.pool, 'The pool must be defined');
    const { walletAddress, nft, slippage, decimals } = args;
    const position = await this.nftInstance.getPositionFields(nft);

    const [bigAmountA, bigAmountB] =
      this.poolInstance.getTokenAmountsFromLiquidity({
        liquidity: new BN(position.liquidity),
        currentSqrtPrice: new BN(this.pool.sqrt_price),
        lowerSqrtPrice: this.sdk.math.tickIndexToSqrtPriceX64(
          this.sdk.math.bitsToNumber(position.tick_lower_index.fields.bits)
        ),
        upperSqrtPrice: this.sdk.math.tickIndexToSqrtPriceX64(
          this.sdk.math.bitsToNumber(position.tick_upper_index.fields.bits)
        ),
      });

    const amounts = await this.nftInstance.getUnclaimedFeesAndRewards({
      poolId: this.objectId,
      position,
      getPrice,
    });

    return this.poolInstance.removeLiquidity({
      address: walletAddress,
      nft,
      pool: this.objectId,
      slippage,
      amountA: bigAmountA.toString(),
      amountB: bigAmountB.toString(),
      decreaseLiquidity: position.liquidity,
      collectAmountA: this.scaleDown(amounts.fields.feeOwedA, decimals.coinA),
      collectAmountB: this.scaleDown(amounts.fields.feeOwedB, decimals.coinB),
      rewardAmounts: amounts.fields.collectRewards.map(this.scaleDown),
    });
  }

  async collectFees(args: CollectFeesArgs): Promise<Transaction> {
    await this.initializeOrRefreshPool();
    invariant(this.pool, 'The pool must be defined');
    const { walletAddress, nft } = args;
    const position = await this.nftInstance.getPositionFields(nft);

    const amounts = await this.nftInstance.getUnclaimedFeesAndRewards({
      poolId: this.objectId,
      position,
      getPrice,
    });

    return this.poolInstance.collectFee({
      address: walletAddress,
      nft,
      pool: this.objectId,
      collectAmountA: this.scaleDown(amounts.fields.feeOwedA),
      collectAmountB: this.scaleDown(amounts.fields.feeOwedB),
    });
  }

  async quoteCreatePosition(
    args: QuoteCreatePositionArgs
  ): Promise<QuoteAmountsOutResponse> {
    await this.initializeOrRefreshPool();
    invariant(this.pool, 'The pool must be defined');
    const { tickLower, tickUpper, amountsIn, whatChanged } = args;

    const [bigAmountA, bigAmountB] =
      this.poolInstance.getTokenAmountsFromLiquidity({
        currentSqrtPrice: new BN(this.pool.sqrt_price),
        lowerSqrtPrice: this.sdk.math.tickIndexToSqrtPriceX64(tickLower),
        upperSqrtPrice: this.sdk.math.tickIndexToSqrtPriceX64(tickUpper),
        liquidity: new BN(this.pool.liquidity),
      });

    const ratio = bigAmountA.isZero()
      ? new Decimal(0)
      : bigAmountB.isZero()
        ? new Decimal(1)
        : new Decimal(bigAmountA.toString()).div(
            new Decimal(bigAmountB.toString())
          );

    if (whatChanged === 'quote' && amountsIn.quote) {
      if (ratio.isZero()) {
        return {
          amountsOut: {
            base: BigInt(0),
            quote: amountsIn.quote,
          },
        };
      } else if (
        ratio.toString() === '1' &&
        amountsIn?.base?.toString() === '0'
      ) {
        return {
          amountsOut: {
            base: BigInt(0),
            quote: amountsIn.quote,
          },
        };
      } else {
        const amountOut = ratio.mul(amountsIn.quote.toString());

        return {
          amountsOut: {
            base: BigInt(amountOut.toFixed(0)),
            quote: amountsIn.quote,
          },
        };
      }
    } else if (whatChanged === 'base' && amountsIn.base) {
      if (ratio.isZero()) {
        return {
          amountsOut: {
            base: amountsIn.base,
            quote: BigInt(0),
          },
        };
      } else if (
        ratio.toString() === '1' &&
        amountsIn?.base?.toString() === '0'
      ) {
        return {
          amountsOut: {
            base: amountsIn.base,
            quote: BigInt(0),
          },
        };
      } else {
        const amountOut = new Decimal(amountsIn.base.toString()).div(ratio);

        return {
          amountsOut: {
            base: amountsIn.base,
            quote: BigInt(amountOut.toFixed(0)),
          },
        };
      }
    }

    return {
      amountsOut: {
        base: BigInt(0),
        quote: BigInt(0),
      },
    };
  }

  async quoteIncreasePosition(
    args: QuoteIncreasePositionArgs
  ): Promise<QuoteAmountsOutResponse> {
    await this.initializeOrRefreshPool();
    invariant(this.pool, 'The pool must be defined');
    const { amountsIn, nft, whatChanged } = args;
    const position = await this.nftInstance.getPositionFields(nft);

    const [bigAmountA, bigAmountB] =
      this.poolInstance.getTokenAmountsFromLiquidity({
        currentSqrtPrice: new BN(this.pool.sqrt_price),
        lowerSqrtPrice: this.sdk.math.tickIndexToSqrtPriceX64(
          this.sdk.math.bitsToNumber(position.tick_lower_index.fields.bits)
        ),
        upperSqrtPrice: this.sdk.math.tickIndexToSqrtPriceX64(
          this.sdk.math.bitsToNumber(position.tick_upper_index.fields.bits)
        ),
        liquidity: new BN(position.liquidity),
      });

    const ratio = bigAmountA.isZero()
      ? new Decimal(0)
      : bigAmountB.isZero()
        ? new Decimal(1)
        : new Decimal(bigAmountA.toString()).div(
            new Decimal(bigAmountB.toString())
          );

    if (whatChanged === 'quote' && amountsIn.quote) {
      if (ratio.isZero()) {
        return {
          amountsOut: {
            base: BigInt(0),
            quote: amountsIn.quote,
          },
        };
      } else if (
        ratio.toString() === '1' &&
        amountsIn?.base?.toString() === '0'
      ) {
        return {
          amountsOut: {
            base: BigInt(0),
            quote: amountsIn.quote,
          },
        };
      } else {
        const amountOut = ratio.mul(amountsIn.quote.toString());

        return {
          amountsOut: {
            base: BigInt(amountOut.toFixed(0)),
            quote: amountsIn.quote,
          },
        };
      }
    } else if (whatChanged === 'base' && amountsIn.base) {
      if (ratio.isZero()) {
        return {
          amountsOut: {
            base: amountsIn.base,
            quote: BigInt(0),
          },
        };
      } else if (
        ratio.toString() === '1' &&
        amountsIn?.base?.toString() === '0'
      ) {
        return {
          amountsOut: {
            base: amountsIn.base,
            quote: BigInt(0),
          },
        };
      } else {
        const amountOut = ratio.mul(amountsIn.base.toString());

        return {
          amountsOut: {
            base: amountsIn.base,
            quote: BigInt(amountOut.toFixed(0)),
          },
        };
      }
    }

    return {
      amountsOut: {
        base: BigInt(0),
        quote: BigInt(0),
      },
    };
  }

  async quoteDecreasePosition(
    args: QuoteDecreasePositionArgs
  ): Promise<QuoteAmountsOutResponse> {
    await this.initializeOrRefreshPool();
    invariant(this.pool, 'The pool must be defined');
    const { nft, percentage } = args;
    const position = await this.nftInstance.getPositionFields(nft);

    const liquidity = new Decimal(position.liquidity)
      .mul(percentage)
      .div(100)
      .toFixed(0);

    const [bigAmountA, bigAmountB] =
      this.poolInstance.getTokenAmountsFromLiquidity({
        liquidity: new BN(liquidity),
        currentSqrtPrice: new BN(this.pool.sqrt_price),
        lowerSqrtPrice: this.sdk.math.tickIndexToSqrtPriceX64(
          this.sdk.math.bitsToNumber(position.tick_lower_index.fields.bits)
        ),
        upperSqrtPrice: this.sdk.math.tickIndexToSqrtPriceX64(
          this.sdk.math.bitsToNumber(position.tick_upper_index.fields.bits)
        ),
      });

    return {
      amountsOut: {
        base: BigInt(bigAmountA.toString()),
        quote: BigInt(bigAmountB.toString()),
      },
    };
  }

  async quoteClosePosition(
    args: QuoteClosePositionArgs
  ): Promise<QuoteClosePositionResponse> {
    await this.initializeOrRefreshPool();
    invariant(this.pool, 'The pool must be defined');
    const { nft } = args;
    const position = await this.nftInstance.getPositionFields(nft);

    const [bigAmountA, bigAmountB] =
      this.poolInstance.getTokenAmountsFromLiquidity({
        liquidity: new BN(position.liquidity),
        currentSqrtPrice: new BN(this.pool.sqrt_price),
        lowerSqrtPrice: this.sdk.math.tickIndexToSqrtPriceX64(
          this.sdk.math.bitsToNumber(position.tick_lower_index.fields.bits)
        ),
        upperSqrtPrice: this.sdk.math.tickIndexToSqrtPriceX64(
          this.sdk.math.bitsToNumber(position.tick_upper_index.fields.bits)
        ),
      });

    const amounts = await this.nftInstance.getUnclaimedFeesAndRewards({
      poolId: this.objectId,
      position,
      getPrice,
    });

    return {
      amountsOut: {
        base: BigInt(bigAmountA.toString()),
        quote: BigInt(bigAmountB.toString()),
      },
      fees: {
        base: BigInt(amounts.fields.feeOwedA),
        quote: BigInt(amounts.fields.feeOwedB),
      },
    };
  }

  async quoteCollectFees(
    args: QuoteCollectFeesArgs
  ): Promise<QuoteCollectFeesResponse> {
    await this.initializeOrRefreshPool();
    invariant(this.pool, 'The pool must be defined');
    const { nft } = args;
    const position = await this.nftInstance.getPositionFields(nft);

    const amounts = await this.nftInstance.getUnclaimedFeesAndRewards({
      poolId: this.objectId,
      position,
      getPrice,
    });

    return {
      fees: {
        base: BigInt(amounts.fields.feeOwedA),
        quote: BigInt(amounts.fields.feeOwedB),
      },
    };
  }

  private async initializeOrRefreshPool(): Promise<void> {
    this.pool = await this.poolInstance.getPool(this.objectId);
  }

  private scaleDown(amount: string, decimals: number = 6): string {
    return new BN(amount)
      .mul(new BN(10))
      .add(new BN(1 * 10 ** decimals))
      .toString();
  }

  protected getMinimumAmountBySlippage(
    amount: Decimal.Value,
    slippage: Decimal.Value
  ): string {
    const origin = new Decimal(amount);
    const ratio = new Decimal(1).minus(new Decimal(slippage).div(100));
    if (ratio.lte(0) || ratio.gt(1)) {
      throw new Error('invalid slippage range');
    }
    return origin.mul(ratio).toFixed(0);
  }
}
