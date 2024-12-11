import { buildEvent } from '../utils';

export const CREATE_POSITION_EVENT = buildEvent('clmm', 'CreatePositionEvent');
export const DECREASE_POSITION_EVENT = buildEvent(
  'clmm',
  'DecreasePositionEvent'
);
export const INCREASE_POSITION_EVENT = buildEvent(
  'clmm',
  'IncreasePositionEvent'
);
export const CLOSE_POSITION_EVENT = buildEvent('clmm', 'ClosePositionEvent');
export const HARVEST_POSITION_EVENT = buildEvent(
  'clmm',
  'HarvestPositionEvent'
);
