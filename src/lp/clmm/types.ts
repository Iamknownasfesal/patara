import type { SuiClient } from '@mysten/sui/client';
import type { Transaction } from '@mysten/sui/transactions';

import type { WalletAddress } from '../types';

export type CreatePositionArgs = {
  walletAddress: WalletAddress;
  amountsIn: {
    base: bigint;
    quote: bigint;
  };
  tickLower: number;
  tickUpper: number;
  slippage: number;
  autoConvert: {
    active: boolean;
    base: boolean;
    quote: boolean;
  };
};

export type QuoteCreatePositionArgs = {
  walletAddress: WalletAddress;
  amountsIn: {
    base?: bigint;
    quote?: bigint;
  };
  whatChanged: 'base' | 'quote';
  tickLower: number;
  tickUpper: number;
};

export type IncreasePositionArgs = {
  walletAddress: WalletAddress;
  amountsIn: {
    base: bigint;
    quote: bigint;
  };
  nft: string;
  slippage: number;
};

export type QuoteIncreasePositionArgs = {
  amountsIn: {
    base?: bigint;
    quote?: bigint;
  };
  whatChanged: 'base' | 'quote';
  nft: string;
};

export type DecreasePositionArgs = {
  walletAddress: WalletAddress;
  nft: string;
  slippage: number;
  percentage: number;
  decimals: {
    coinA: number;
    coinB: number;
  };
};

export type QuoteDecreasePositionArgs = {
  nft: string;
  percentage: number;
};

export type ClosePositionArgs = {
  walletAddress: WalletAddress;
  nft: string;
  slippage: number;
  decimals: {
    coinA: number;
    coinB: number;
  };
};

export type CollectFeesArgs = {
  walletAddress: WalletAddress;
  nft: string;
};

export type QuoteAmountsOutResponse = {
  amountsOut: {
    base: bigint;
    quote: bigint;
  };
};

export type QuoteClosePositionResponse = {
  amountsOut: {
    base: bigint;
    quote: bigint;
  };
  fees: {
    base: bigint;
    quote: bigint;
  };
};

export type QuoteClosePositionArgs = {
  nft: string;
};

export type QuoteCollectFeesArgs = {
  nft: string;
};

export type QuoteCollectFeesResponse = {
  fees: {
    base: bigint;
    quote: bigint;
  };
};

export interface CLMM {
  client: SuiClient;
  createPosition: (args: CreatePositionArgs) => Promise<Transaction>;
  increasePosition: (args: IncreasePositionArgs) => Promise<Transaction>;
  decreasePosition: (args: DecreasePositionArgs) => Promise<Transaction>;
  closePosition: (args: ClosePositionArgs) => Promise<Transaction>;
  collectFees: (args: CollectFeesArgs) => Promise<Transaction>;

  quoteCreatePosition: (
    args: QuoteCreatePositionArgs
  ) => Promise<QuoteAmountsOutResponse>;
  quoteIncreasePosition: (
    args: QuoteIncreasePositionArgs
  ) => Promise<QuoteAmountsOutResponse>;
  quoteDecreasePosition: (
    args: QuoteDecreasePositionArgs
  ) => Promise<QuoteAmountsOutResponse>;
  quoteClosePosition: (
    args: QuoteClosePositionArgs
  ) => Promise<QuoteClosePositionResponse>;
  quoteCollectFees: (
    args: QuoteCollectFeesArgs
  ) => Promise<QuoteCollectFeesResponse>;
}
