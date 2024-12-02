import type { address, SuiEvent, TypeName } from '../structs';

export interface SwapEvent extends SuiEvent {
  sender: address;
  coin_in_type: TypeName;
  coin_out_type: TypeName;
  amount_in: number;
  amount_out: number;
}
