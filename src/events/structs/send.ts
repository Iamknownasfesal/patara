import type { address, SuiEvent, TypeName } from '../structs';

export interface SendEvent extends SuiEvent {
  sender: address;
  coin_type: TypeName;
  amount: number;
  receiver: address;
}
