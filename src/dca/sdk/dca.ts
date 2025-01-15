import { bcs } from '@mysten/sui/bcs';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import {
  Transaction,
  type TransactionArgument,
} from '@mysten/sui/transactions';
import {
  isValidSuiAddress,
  isValidSuiObjectId,
  SUI_CLOCK_OBJECT_ID,
  SUI_DECIMALS,
} from '@mysten/sui/utils';
import { devInspectAndGetExecutionResults } from '@polymedia/suitcase-core';
import BigNumber from 'bignumber.js';
import invariant from 'tiny-invariant';

import { DELEGATEE, PACKAGES, SHARED_OBJECTS } from '../constants';
import type {
  DCA,
  DCAConstructorArgs,
  DestroyArgs,
  IsActiveArgs,
  Network,
  NewArgs,
  StopArgs,
  SwapWhitelistEndArgs,
  SwapWhitelistStartArgs,
} from './dca.types';
import { parseDCAObject } from './utils';
export class DcaSDK {
  #client: SuiClient;
  #packages: (typeof PACKAGES)[Network];
  #sharedObjects: (typeof SHARED_OBJECTS)[Network];

  MAX_U64 = 18446744073709551615n;
  defaultFee = 500000n;

  constructor(args: DCAConstructorArgs | undefined | null = null) {
    const defaultData = {
      network: 'testnet',
      fullNodeUrl: getFullnodeUrl('testnet'),
      packages: PACKAGES['testnet'],
      sharedObjects: SHARED_OBJECTS['testnet'],
    };

    const data = args ? args : defaultData;

    this.#client = new SuiClient({
      url: data.fullNodeUrl || defaultData.fullNodeUrl,
    });
    this.#packages = data.packages || defaultData.packages;
    this.#sharedObjects = data.sharedObjects || defaultData.sharedObjects;
  }

  async get(objectId: string): Promise<DCA> {
    invariant(isValidSuiObjectId(objectId), 'Invalid DCA id');

    const obj = await this.#client.getObject({
      id: objectId,
      options: { showContent: true, showType: true },
    });

    return parseDCAObject(obj);
  }

  newAndShare({
    tx = new Transaction(),
    coinInType,
    coinOutType,
    witnessType,
    coinIn,
    timeScale,
    every,
    numberOfOrders,
    max = this.MAX_U64,
    min = 0n,
    fee,
    delegatee,
    receiver,
  }: NewArgs): Transaction {
    invariant(isValidSuiAddress(delegatee), 'Invalid delegatee address');
    invariant(numberOfOrders > 0, 'Number of orders must be greater than 0');

    // Get 0.01 Sui for each order
    tx.transferObjects(
      [
        tx.splitCoins(tx.gas, [
          tx.pure.u64(
            BigNumber(0.01)
              .multipliedBy(10 ** SUI_DECIMALS)
              .multipliedBy(numberOfOrders)
              .toNumber()
          ),
        ]),
      ],
      DELEGATEE
    );

    const dca = tx.moveCall({
      target: `${this.#packages.DCA}::dca::new_v2`,
      typeArguments: [coinInType, coinOutType, witnessType],
      arguments: [
        tx.object(this.#sharedObjects.TRADE_POLICY),
        tx.object(SUI_CLOCK_OBJECT_ID),
        tx.object(coinIn),
        tx.pure.u64(every),
        tx.pure.u64(numberOfOrders),
        tx.pure.u8(timeScale),
        tx.pure.u64(min),
        tx.pure.u64(max),
        tx.pure.u64(fee ? BigInt(fee * 1e7) : this.defaultFee),
        tx.pure.address(delegatee),
        tx.pure.address(receiver),
      ],
    });

    tx.moveCall({
      target: `${this.#packages.DCA}::dca::share`,
      typeArguments: [coinInType, coinOutType],
      arguments: [tx.object(dca)],
    });

    return tx;
  }

  async isActive({
    dca,
    coinInType,
    coinOutType,
  }: IsActiveArgs): Promise<boolean> {
    invariant(isValidSuiObjectId(dca), 'Invalid DCA id');

    const tx = new Transaction();

    tx.moveCall({
      target: `${this.#packages.DCA}::dca::active`,
      typeArguments: [coinInType, coinOutType],
      arguments: [tx.object(dca)],
    });

    const result = await devInspectAndGetExecutionResults(
      this.#client as any,
      tx as any
    );

    const values = result[result.length - 1].returnValues;

    invariant(values && values.length, 'Failed to get values');

    return values.map((elem) => {
      const [x] = elem;
      return bcs.Bool.parse(new Uint8Array(x));
    })[0];
  }

  stop({ dca, coinInType, coinOutType }: StopArgs): Transaction {
    invariant(isValidSuiObjectId(dca), 'Invalid DCA id');

    const tx = new Transaction();

    tx.moveCall({
      target: `${this.#packages.DCA}::dca::stop`,
      typeArguments: [coinInType, coinOutType],
      arguments: [tx.object(dca)],
    });

    return tx;
  }

  destroy({ dca, coinInType, coinOutType }: DestroyArgs): Transaction {
    invariant(isValidSuiObjectId(dca), 'Invalid DCA id');

    const tx = new Transaction();

    tx.moveCall({
      target: `${this.#packages.DCA}::dca::destroy`,
      typeArguments: [coinInType, coinOutType],
      arguments: [tx.object(dca)],
    });

    return tx;
  }

  stopAndDestroy({ dca, coinInType, coinOutType }: DestroyArgs): Transaction {
    invariant(isValidSuiObjectId(dca), 'Invalid DCA id');

    const tx = new Transaction();

    tx.moveCall({
      target: `${this.#packages.DCA}::dca::stop`,
      typeArguments: [coinInType, coinOutType],
      arguments: [tx.object(dca)],
    });

    tx.moveCall({
      target: `${this.#packages.DCA}::dca::destroy`,
      typeArguments: [coinInType, coinOutType],
      arguments: [tx.object(dca)],
    });

    return tx;
  }

  swapWhitelistStart({
    dca,
    coinInType,
    coinOutType,
    tx = new Transaction(),
  }: SwapWhitelistStartArgs) {
    invariant(isValidSuiObjectId(dca), 'Invalid DCA id');

    const [request, coinIn] = tx.moveCall({
      target: `${this.#packages.DCA}::dca::request`,
      typeArguments: [coinInType, coinOutType],
      arguments: [tx.object(dca)],
    });

    return {
      coinIn,
      request,
      tx,
    };
  }

  swapWhitelistEnd({
    dca,
    coinInType,
    coinOutType,
    tx = new Transaction(),
    request,
    coinOut,
    whitelist,
  }: SwapWhitelistEndArgs) {
    invariant(isValidSuiObjectId(dca), 'Invalid DCA id');

    tx.moveCall({
      target: `0xd1bb6bb53fabe4a384ce699dca9ad14e00b522b1929bfdc143b33e31d5b85094::whitelist_adapter::swap`,
      typeArguments: [coinOutType],
      arguments: [whitelist, request as TransactionArgument, coinOut],
    });

    tx.moveCall({
      target: `${this.#packages.DCA}::dca::confirm`,
      typeArguments: [coinInType, coinOutType],
      arguments: [
        tx.object(dca),
        tx.object(SUI_CLOCK_OBJECT_ID),
        request as TransactionArgument,
      ],
    });

    return tx;
  }
}
