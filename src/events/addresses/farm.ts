import { buildNewEvent } from '../utils';

export const FARM_DEPOSIT_EVENT = buildNewEvent('farm', 'DepositEvent');
export const FARM_WITHDRAW_EVENT = buildNewEvent('farm', 'WithdrawEvent');
export const FARM_RELOCK_EVENT = buildNewEvent('farm', 'RelockEvent');
export const FARM_HARVEST_EVENT = buildNewEvent('farm', 'HarvestEvent');
