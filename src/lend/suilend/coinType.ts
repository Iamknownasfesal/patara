import { normalizeStructTag } from '@mysten/sui/utils';

const SEND_POINTS_COINTYPE =
  '0x34fe4f3c9e450fed4d0a3c587ed842eec5313c30c3cc3c0841247c49425e246b::suilend_point::SUILEND_POINT';
const MAYA_COINTYPE =
  '0x3bf0aeb7b9698b18ec7937290a5701088fcd5d43ad11a2564b074d022a6d71ec::maya::MAYA';

export const isSendPoints = (coinType: string) =>
  normalizeStructTag(coinType) === normalizeStructTag(SEND_POINTS_COINTYPE);

export const isMayaCoinType = (coinType: string) =>
  normalizeStructTag(coinType) === normalizeStructTag(MAYA_COINTYPE);
