import { normalizeStructTag } from '@mysten/sui/utils';

import { SUI_COIN_TYPE } from '../constants';

const SEND_POINTS_S1_COINTYPE =
  '0x34fe4f3c9e450fed4d0a3c587ed842eec5313c30c3cc3c0841247c49425e246b::suilend_point::SUILEND_POINT';
const SEND_POINTS_S2_COINTYPE =
  '0x97d2a76efce8e7cdf55b781bd3d23382237fb1d095f9b9cad0bf1fd5f7176b62::suilend_point_2::SUILEND_POINT_2';
const MAYA_COINTYPE =
  '0x3bf0aeb7b9698b18ec7937290a5701088fcd5d43ad11a2564b074d022a6d71ec::maya::MAYA';

export const isSendPoints = (coinType: string) =>
  normalizeStructTag(coinType) ===
    normalizeStructTag(SEND_POINTS_S1_COINTYPE) ||
  normalizeStructTag(coinType) === normalizeStructTag(SEND_POINTS_S2_COINTYPE);

export const isMayaCoinType = (coinType: string) =>
  normalizeStructTag(coinType) === normalizeStructTag(MAYA_COINTYPE);

export const isSui = (coinType: string) =>
  normalizeStructTag(coinType) === normalizeStructTag(SUI_COIN_TYPE);
