import type { Transaction } from '@mysten/sui/dist/cjs/transactions';
import { FarmsStakedPosition } from 'aftermath-ts-sdk';

import type { AftermathFarm } from './pool';

export class AftermathFarmPosition {
  constructor(
    private readonly farm: AftermathFarm,
    public readonly stakedPosition: FarmsStakedPosition
  ) {}

  async deposit(address: string, depositAmount: bigint): Promise<Transaction> {
    return this.stakedPosition.getDepositPrincipalTransaction({
      depositAmount,
      walletAddress: address,
    });
  }

  async unstakeAll(address: string): Promise<Transaction> {
    return this.stakedPosition.getUnstakeTransaction({
      stakingPool: this.farm.stakingPool,
      walletAddress: address,
    });
  }

  async lockPosition(
    address: string,
    lockDurationMs: number
  ): Promise<Transaction> {
    return this.stakedPosition.getLockTransaction({
      lockDurationMs,
      walletAddress: address,
    });
  }

  async renewLock(address: string): Promise<Transaction> {
    return this.stakedPosition.getRenewLockTransaction({
      walletAddress: address,
    });
  }

  async unlockPosition(address: string): Promise<Transaction> {
    return this.stakedPosition.getUnlockTransaction({
      walletAddress: address,
    });
  }

  async harvest(address: string): Promise<Transaction> {
    return this.stakedPosition.getHarvestRewardsTransaction({
      walletAddress: address,
      stakingPool: this.farm.stakingPool,
    });
  }

  getStakedAmount(): bigint {
    return this.stakedPosition.stakedPosition.stakedAmount;
  }

  getLockEndTimestamp(): number {
    return this.stakedPosition.unlockTimestamp();
  }
}
