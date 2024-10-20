import type { Transaction } from '@mysten/sui/transactions';
import { FarmsStakingPool } from 'aftermath-ts-sdk';
import invariant from 'tiny-invariant';

export class AftermathFarm {
  constructor(public readonly stakingPool: FarmsStakingPool) {}

  async harvestRewards(
    address: string,
    positionIds: string[]
  ): Promise<Transaction> {
    invariant(this.stakingPool, 'Staking pool not initialized');

    return this.stakingPool.getHarvestRewardsTransaction({
      walletAddress: address,
      stakedPositionIds: positionIds,
    });
  }

  async stake(
    address: string,
    lockDurationMs: number,
    stakeAmount: bigint
  ): Promise<Transaction> {
    invariant(this.stakingPool, 'Staking pool not initialized');

    return this.stakingPool.getStakeTransaction({
      walletAddress: address,
      lockDurationMs,
      stakeAmount,
    });
  }

  getTotalStaked(): bigint {
    return this.stakingPool.stakingPool.stakedAmount;
  }

  getRewardTokens() {
    return this.stakingPool.stakingPool.rewardCoins;
  }
}
