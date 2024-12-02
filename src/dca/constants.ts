import { getFullnodeUrl } from '@mysten/sui/client';
import { Inputs } from '@mysten/sui/transactions';

import { DcaSDK } from './sdk';

export const PACKAGES = {
  mainnet: {
    DCA: '0x44ff70939f77930fc35d6ede7302b0158ca5fdbf9487f347fde97c665cd63529',
    ADAPTERS:
      '0xae944b93ff026d699a9a4e766ffa60be7b22197b8069ca4fa2aac15cfa3ef652',
  },
  testnet: {
    DCA: '0xdc0d29408c946eacd2e175639957fe8a9095f2cbbf222d15f9a77fc44413120c',
    ADAPTERS:
      '0x559031b01a343fb8950a4142e0fe9667231f5283dba6334c9fc6b7ebf32222cf',
  },
} as const;

export const OWNED_OBJECTS = {
  mainnet: {
    ADAPTER_UPGRADE_CAP:
      '0x1c3b13d8b94a2b0cf75d38d55016dae4ba297b0360f3c760acbec91ef2f884e0',
    DCA_UPGRADE_CAP:
      '0x3dbe7f8a980a1b668dc72b8a39453a29595bb82bd6503b256be4b01c29e9c9a4',
    DCA_ADMIN:
      '0x2b24355e429f9bbb7cb3c55623055bff0e03222914f0d79bd5b3264fb5875f0d',
  },
  testnet: {
    ADAPTER_UPGRADE_CAP:
      '0xdd095fb1d1d69151bd0bc9109ad9b16baf796a70022bcab3b9e0d0a453c97e09',
    DCA_UPGRADE_CAP:
      '0xbeb2fa6fecaca163420c2c1d754a26f5c25ab9819181f7950b05db18f5c522d3',
    DCA_ADMIN:
      '0x7c528cf80424278dfcf5d907dca7c89bb525f21979c767d09082a6db3d74285f',
  },
} as const;

export const SHARED_OBJECTS = {
  mainnet: {
    TRADE_POLICY_MUT: Inputs.SharedObjectRef({
      objectId:
        '0x4c34eb1fa0f2a043b8481386ebd2ba420b1c9d81db79fcb3f33320f3e00729ac',
      initialSharedVersion: '323122763',
      mutable: true,
    }) as ReturnType<typeof Inputs.SharedObjectRef>,
    TRADE_POLICY: Inputs.SharedObjectRef({
      objectId:
        '0x4c34eb1fa0f2a043b8481386ebd2ba420b1c9d81db79fcb3f33320f3e00729ac',
      initialSharedVersion: '323122763',
      mutable: false,
    }) as ReturnType<typeof Inputs.SharedObjectRef>,
    WHITELIST_MUT: Inputs.SharedObjectRef({
      objectId:
        '0x4aa86e2bb719ecd69f291363b0e46ad49ca6196dcf4f4d06a6c38fdb413a68ae',
      initialSharedVersion: '323122764',
      mutable: true,
    }) as ReturnType<typeof Inputs.SharedObjectRef>,
    WHITELIST: Inputs.SharedObjectRef({
      objectId:
        '0x4aa86e2bb719ecd69f291363b0e46ad49ca6196dcf4f4d06a6c38fdb413a68ae',
      initialSharedVersion: '323122764',
      mutable: false,
    }) as ReturnType<typeof Inputs.SharedObjectRef>,
  },
  testnet: {
    TRADE_POLICY_MUT: Inputs.SharedObjectRef({
      objectId:
        '0x7af707af5407a0c8d84b9fc2f5068292d224d6ab349d52f9121900ff5e229977',
      initialSharedVersion: '109319125',
      mutable: true,
    }) as ReturnType<typeof Inputs.SharedObjectRef>,
    TRADE_POLICY: Inputs.SharedObjectRef({
      objectId:
        '0x7af707af5407a0c8d84b9fc2f5068292d224d6ab349d52f9121900ff5e229977',
      initialSharedVersion: '109319125',
      mutable: false,
    }) as ReturnType<typeof Inputs.SharedObjectRef>,
    WHITELIST_MUT: Inputs.SharedObjectRef({
      objectId:
        '0x391be588882816e3f3bf755d14ad7fad12062ad1c19c71020a9605ac662f9ea5',
      initialSharedVersion: '109319126',
      mutable: true,
    }) as ReturnType<typeof Inputs.SharedObjectRef>,
    WHITELIST: Inputs.SharedObjectRef({
      objectId:
        '0x391be588882816e3f3bf755d14ad7fad12062ad1c19c71020a9605ac662f9ea5',
      initialSharedVersion: '109319126',
      mutable: false,
    }) as ReturnType<typeof Inputs.SharedObjectRef>,
  },
} as const;

export const WITNESSES = {
  mainnet: {
    WHITELIST_ADAPTER: `${PACKAGES['mainnet'].ADAPTERS}::whitelist_adapter::Witness`,
  },
  testnet: {
    WHITELIST_ADAPTER: `${PACKAGES['testnet'].ADAPTERS}::whitelist_adapter::Witness`,
  },
} as const;

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
export const BASE_URL = 'https://api.patara.app/dca/api';
export const FEE_RATE = 0.1;
