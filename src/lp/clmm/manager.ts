import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';

import { CLMMFactory, type CLMMTypeKeys } from './factory';
import type { GenericCLMM } from './generic';
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

export class CLMMManager {
  private clmm: GenericCLMM;

  constructor(type: CLMMTypeKeys, client: SuiClient, objectId: string) {
    this.clmm = CLMMFactory.createCLMM(type, client, objectId);
  }

  async createPosition(args: CreatePositionArgs): Promise<Transaction> {
    return this.clmm.createPosition(args);
  }

  async increasePosition(args: IncreasePositionArgs): Promise<Transaction> {
    return this.clmm.increasePosition(args);
  }

  async decreasePosition(args: DecreasePositionArgs): Promise<Transaction> {
    return this.clmm.decreasePosition(args);
  }

  async closePosition(args: ClosePositionArgs): Promise<Transaction> {
    return this.clmm.closePosition(args);
  }

  async collectFees(args: CollectFeesArgs): Promise<Transaction> {
    return this.clmm.collectFees(args);
  }

  async quoteCreatePosition(
    args: QuoteCreatePositionArgs
  ): Promise<QuoteAmountsOutResponse> {
    return this.clmm.quoteCreatePosition(args);
  }

  async quoteIncreasePosition(
    args: QuoteIncreasePositionArgs
  ): Promise<QuoteAmountsOutResponse> {
    return this.clmm.quoteIncreasePosition(args);
  }

  async quoteDecreasePosition(
    args: QuoteDecreasePositionArgs
  ): Promise<QuoteAmountsOutResponse> {
    return this.clmm.quoteDecreasePosition(args);
  }

  async quoteClosePosition(
    args: QuoteClosePositionArgs
  ): Promise<QuoteClosePositionResponse> {
    return this.clmm.quoteClosePosition(args);
  }

  async quoteCollectFees(
    args: QuoteCollectFeesArgs
  ): Promise<QuoteCollectFeesResponse> {
    return this.clmm.quoteCollectFees(args);
  }
}
