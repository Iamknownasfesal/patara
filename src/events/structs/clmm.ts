import type { address, SuiEvent, TypeName } from '../structs';

export interface CreatePositionEvent extends SuiEvent {
  sender: address;
  coin_types: TypeName[];
  amounts: number[];
  pool_id: address;
}

export interface DecreasePositionEvent extends SuiEvent {
  sender: address;
  coin_types: TypeName[];
  amounts: number[];
  pool_id: address;
}

export interface IncreasePositionEvent extends SuiEvent {
  sender: address;
  coin_types: TypeName[];
  amounts: number[];
  pool_id: address;
}

export interface ClosePositionEvent extends SuiEvent {
  sender: address;
  coin_types: TypeName[];
  amounts: number[];
  pool_id: address;
}

export interface HarvestPositionEvent extends SuiEvent {
  sender: address;
  coin_types: TypeName[];
  amounts: number[];
  pool_id: address;
}
