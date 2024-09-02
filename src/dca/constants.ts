import { getFullnodeUrl } from '@mysten/sui/client';
import { DcaSDK, PACKAGES, SHARED_OBJECTS } from '@patara-app/dca-sdk';

export const DCASDK = new DcaSDK({
  network: 'mainnet',
  fullNodeUrl: getFullnodeUrl('mainnet'),
  packages: PACKAGES['mainnet'],
  sharedObjects: SHARED_OBJECTS['mainnet'],
});

export const DELEGATEE =
  '0x0c96b48925580099ddb1e9398ed51f3e8504b7793ffd7cee7b7f5b2c8c0e9271';
export const WITNESS_TYPE =
  '0xae944b93ff026d699a9a4e766ffa60be7b22197b8069ca4fa2aac15cfa3ef652::whitelist_adapter::Witness';
export const BASE_URL = 'https://dca.api.patara.app/api';
export const FEE_RATE = 0.1;
