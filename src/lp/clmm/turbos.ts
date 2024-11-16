import type { SuiClient } from '@mysten/sui/client';
import type { Transaction } from '@mysten/sui/dist/cjs/transactions';
import invariant from 'tiny-invariant';
import {
  BN,
  Decimal,
  Network,
  NFT as NFTClass,
  Pool,
  Pool as PoolClass,
  TurbosSdk,
} from 'turbos-clmm-sdk';

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
  protected readonly objectId: string;

  constructor(client: SuiClient, objectId: string) {
    super(client);
    this.objectId = objectId;
    this.sdk = new TurbosSdk(Network.mainnet, this.client);
    this.poolInstance = new PoolClass(this.sdk);
    this.nftInstance = new NFTClass(this.sdk);
  }

  async createPosition(args: CreatePositionArgs): Promise<Transaction> {
    await this.initializeOrRefreshPool();
    const { amountsIn, slippage, tickLower, tickUpper, walletAddress } = args;

    return this.poolInstance.addLiquidity({
      address: walletAddress,
      amountA: amountsIn.base.toString(),
      amountB: amountsIn.quote.toString(),
      pool: this.objectId,
      slippage,
      tickLower,
      tickUpper,
    });
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
      getPrice(_coinType: string): Promise<number | string | undefined> {
        return new Promise(() => {
          return 0;
        });
      },
    });

    return this.poolInstance.removeLiquidity({
      address: walletAddress,
      nft,
      pool: this.objectId,
      slippage,
      amountA: this.sdk.math.scaleDown(
        new Decimal(bigAmountA.toString()).toString(),
        decimals.coinA
      ),
      amountB: this.sdk.math.scaleDown(
        new Decimal(bigAmountB.toString()).toString(),
        decimals.coinB
      ),
      decreaseLiquidity: position.liquidity,
      collectAmountA: amounts.fields.feeOwedA,
      collectAmountB: amounts.fields.feeOwedB,
      rewardAmounts: amounts.fields.collectRewards,
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
      getPrice(_coinType: string): Promise<number | string | undefined> {
        return new Promise(() => {
          return 0;
        });
      },
    });

    return this.poolInstance.collectFee({
      address: walletAddress,
      nft,
      pool: this.objectId,
      collectAmountA: amounts.fields.feeOwedA,
      collectAmountB: amounts.fields.feeOwedB,
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
      .toString();

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
      getPrice(_coinType: string): Promise<number | string | undefined> {
        return new Promise(() => {
          return 0;
        });
      },
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
      getPrice(_coinType: string): Promise<number | string | undefined> {
        return new Promise(() => {
          return 0;
        });
      },
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
}
