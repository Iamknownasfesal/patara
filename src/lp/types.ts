import type { NFT } from 'turbos-clmm-sdk';

export type WalletAddress = string;
export type CoinType = string;
export type Balance = bigint;
export type CoinInRecord = Record<CoinType, Balance>;

export interface TurbosPoolTickItem {
  id: string;
  index: number;
  initialized: false;
  liquidity_net: string;
  liquidity_gross: string;
  fee_growth_outside_a: string;
  fee_growth_outside_b: string;
}
export interface TurbosPoolRewardItem {
  type: string;
  fields: {
    emissions_per_second: string;
    growth_global: string;
    id: {
      id: string;
    };
    manager: string;
    vault: string;
    vault_coin_type: string;
  };
}
export interface TurbosPoolItem {
  id: number;
  coin_a: string;
  coin_b: string;
  deploy_time_ms: string;
  fee: string;
  fee_growth_global_a: string;
  fee_growth_global_b: string;
  fee_protocol: string;
  liquidity: string;
  max_liquidity_per_tick: string;
  protocol_fees_a: string;
  protocol_fees_b: string;
  sqrt_price: string;
  tick_current_index: number;
  tick_spacing: string;
  unlocked: boolean;
  pool_id: string;
  type: string;
  coin_symbol_a: string;
  coin_symbol_b: string;
  coin_type_a: string;
  coin_type_b: string;
  fee_type: string;
  add_2_percent_depth: string;
  reduce_2_percent_depth: string;
  ticks?: TurbosPoolTickItem[];
  reward_infos: TurbosPoolRewardItem[];
  reward_last_updated_time_ms: string;
  apr: number;
  fee_apr: number;
  reward_apr: number;
  apr_percent: number;
  volume_24h_usd: number;
  liquidity_usd: number;
  category: 'lsd' | 'meme' | 'stable' | null;
  created_at: Date;
  updated_at: Date;
  fee_24h_usd: number;
  coin_a_liquidity_usd: number;
  coin_b_liquidity_usd: number;
  flag: number;
  is_vault: boolean;
  top1_pool?: boolean;
}

export type TurbosPositionItem = {
  objectId: string;
  nft: NFT.NftField;
  position: NFT.PositionField;
};
