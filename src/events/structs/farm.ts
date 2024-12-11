import type { address, SuiEvent, TypeName } from '../structs';

export interface FarmDepositEvent extends SuiEvent {
  sender: address;
  lp_coin_type: TypeName;
  lp_coin_amount: number;
  farm_id: address;
}

export interface FarmWithdrawEvent extends SuiEvent {
  sender: address;
  lp_coin_type: TypeName;
  lp_coin_amount: number;
  farm_id: address;
}

export interface FarmRelockEvent extends SuiEvent {
  sender: address;
  lp_coin_type: TypeName;
  farm_id: address;
}

export interface FarmHarvestEvent extends SuiEvent {
  sender: address;
  coin_types: TypeName[];
  amounts: number[];
  farm_id: address;
}
