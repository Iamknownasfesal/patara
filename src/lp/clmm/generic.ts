import type { SuiClient } from '@mysten/sui/client';
import type { Transaction } from '@mysten/sui/transactions';

import type {
  CLMM,
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

export abstract class GenericCLMM implements CLMM {
  public client: SuiClient;
  protected abstract readonly objectId: string;

  constructor(client: SuiClient) {
    this.client = client;
  }

  abstract createPosition(args: CreatePositionArgs): Promise<Transaction>;
  abstract increasePosition(args: IncreasePositionArgs): Promise<Transaction>;
  abstract decreasePosition(args: DecreasePositionArgs): Promise<Transaction>;
  abstract closePosition(args: ClosePositionArgs): Promise<Transaction>;
  abstract collectFees(args: CollectFeesArgs): Promise<Transaction>;

  abstract quoteCreatePosition(
    args: QuoteCreatePositionArgs
  ): Promise<QuoteAmountsOutResponse>;
  abstract quoteIncreasePosition(
    args: QuoteIncreasePositionArgs
  ): Promise<QuoteAmountsOutResponse>;
  abstract quoteDecreasePosition(
    args: QuoteDecreasePositionArgs
  ): Promise<QuoteAmountsOutResponse>;
  abstract quoteClosePosition(
    args: QuoteClosePositionArgs
  ): Promise<QuoteClosePositionResponse>;
  abstract quoteCollectFees(
    args: QuoteCollectFeesArgs
  ): Promise<QuoteCollectFeesResponse>;
}
