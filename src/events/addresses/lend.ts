import { buildEvent } from '../utils';

export const LEND_EVENT = buildEvent('lend', 'LendEvent');
export const BORROW_EVENT = buildEvent('lend', 'BorrowEvent');
export const REPAY_EVENT = buildEvent('lend', 'RepayEvent');
export const WITHDRAW_EVENT = buildEvent('lend', 'WithdrawEvent');
