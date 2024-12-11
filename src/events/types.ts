export enum AmmWay {
  ADD_LIQUIDITY = 'add_liquidity',
  REMOVE_LIQUIDITY = 'remove_liquidity',
}

export const AMM_WAY_MAP = {
  [AmmWay.ADD_LIQUIDITY]: 'add_liquidity',
  [AmmWay.REMOVE_LIQUIDITY]: 'remove_liquidity',
};

export enum ClmmWay {
  CREATE_POSITION = 'create_position',
  INCREASE_LIQUIDITY = 'increase_liquidity',
  DECREASE_LIQUIDITY = 'decrease_liquidity',
  CLOSE_POSITION = 'close_position',
  HARVEST_POSITION = 'harvest_position',
}

export const CLMM_WAY_MAP = {
  [ClmmWay.CREATE_POSITION]: 'create_position',
  [ClmmWay.INCREASE_LIQUIDITY]: 'increase_liquidity',
  [ClmmWay.DECREASE_LIQUIDITY]: 'decrease_liquidity',
  [ClmmWay.CLOSE_POSITION]: 'close_position',
  [ClmmWay.HARVEST_POSITION]: 'harvest_position',
};

export enum LendWay {
  LEND = 'lend',
  BORROW = 'borrow',
  REPAY = 'repay',
  WITHDRAW = 'withdraw',
}

export const LEND_WAY_MAP = {
  [LendWay.LEND]: 'lend',
  [LendWay.BORROW]: 'borrow',
  [LendWay.REPAY]: 'repay',
  [LendWay.WITHDRAW]: 'withdraw',
};

export enum FarmWay {
  DEPOSIT = 'deposit',
  WITHDRAW = 'withdraw',
  RELOCK = 'relock',
  HARVEST = 'harvest',
}

export const FARM_WAY_MAP = {
  [FarmWay.DEPOSIT]: 'deposit',
  [FarmWay.WITHDRAW]: 'withdraw',
  [FarmWay.RELOCK]: 'relock',
  [FarmWay.HARVEST]: 'harvest',
};
