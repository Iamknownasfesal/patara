import { buildEvent } from '../utils';

export const FARM_DEPOSIT_EVENT = buildEvent('farm', 'DepositEvent');
export const FARM_WITHDRAW_EVENT = buildEvent('farm', 'WithdrawEvent');
export const FARM_RELOCK_EVENT = buildEvent('farm', 'RelockEvent');
export const FARM_HARVEST_EVENT = buildEvent('farm', 'HarvestEvent');
