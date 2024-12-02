import type { address, SuiEvent, TypeName } from '../structs';

export interface AddLiquidityEvent extends SuiEvent {
  sender: address;
  coin_types: TypeName[];
  amounts: number[];
  pool_id: address;
}

export interface RemoveLiquidityEvent extends SuiEvent {
  sender: address;
  coin_types: TypeName[];
  amounts: number[];
  pool_id: address;
}
