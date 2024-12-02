import type { address, SuiEvent, TypeName } from '../structs';

export interface LendEvent extends SuiEvent {
  sender: address;
  coin_type: TypeName;
  amount: number;
}

export interface BorrowEvent extends SuiEvent {
  sender: address;
  coin_type: TypeName;
  amount: number;
}

export interface RepayEvent extends SuiEvent {
  sender: address;
  coin_type: TypeName;
  amount: number;
}

export interface WithdrawEvent extends SuiEvent {
  sender: address;
  coin_type: TypeName;
  amount: number;
}
