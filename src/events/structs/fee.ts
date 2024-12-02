import type { address, SuiEvent, TypeName } from '../structs';

export interface FeeEvent extends SuiEvent {
  sender: address;
  coin_type: TypeName;
  amount: number;
  event_type: TypeName;
}
