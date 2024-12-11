import { buildEvent } from '../utils';

export const ADD_LIQUIDITY_EVENT = buildEvent('amm', 'AddLiquidityEvent');
export const REMOVE_LIQUIDITY_EVENT = buildEvent('amm', 'RemoveLiquidityEvent');
