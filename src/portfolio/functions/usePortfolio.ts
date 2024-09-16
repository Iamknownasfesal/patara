import { SuiClient } from '@mysten/sui/client';
import type { FetchersResult, TokenInfo } from '@sonarwatch/portfolio-core';
import { useQuery } from '@tanstack/react-query';
import invariant from 'tiny-invariant';

import { PORTFOLIO_API_BASE_URL } from '../constants';
import { getCoinMetadataMap } from './getCoinMetadataMap';
import { getTokenInfo } from './token';

type UsePortfolioParams = {
  address?: string;
  client: SuiClient;
};

export function usePortfolio({ address, client }: UsePortfolioParams) {
  return useQuery({
    queryKey: ['suiPortfolio', address],
    queryFn: () => {
      invariant(address, 'Address is required');

      return fetchSuiPortfolio(address, client);
    },
    enabled: !!address,
  });
}

async function fetchSuiPortfolio(
  address: string,
  client: SuiClient
): Promise<FetchersResult> {
  invariant(address, 'Address is required');
  invariant(client, 'Client is required');

  const response = await fetch(`${PORTFOLIO_API_BASE_URL}/sui/v1/${address}`);
  if (!response.ok) {
    throw new Error('Failed to fetch portfolio');
  }
  let data: FetchersResult = await response.json();

  const tokenInfo = data.tokenInfo?.['sui'] as
    | Record<string, TokenInfo>
    | undefined;
  if (!tokenInfo) {
    return data;
  }

  const tokensToFetch = getTokensToFetch(data, tokenInfo);
  if (tokensToFetch.size > 0) {
    const updatedTokenInfo = await updateTokenInfo(
      client,
      Array.from(tokensToFetch),
      tokenInfo
    );
    data = {
      ...data,
      tokenInfo: {
        sui: updatedTokenInfo,
      },
    };
  }

  return data;
}

function getTokensToFetch(
  data: FetchersResult,
  tokenInfo: Record<string, TokenInfo>
): Set<string> {
  const tokensToFetch = new Set<string>();
  data.elements.forEach((element) => {
    if (element.type === 'multiple' && element.data.assets.length > 0) {
      element.data.assets.forEach((asset) => {
        if (
          asset.type === 'token' &&
          getTokenInfo(tokenInfo, asset.data.address).name === 'Unknown'
        ) {
          const address = asset.data.address.replaceAll('-', '::');
          tokensToFetch.add(address);
        }
      });
    }
  });
  return tokensToFetch;
}

async function updateTokenInfo(
  client: SuiClient,
  coinAddresses: string[],
  existingTokenInfo: Record<string, TokenInfo>
): Promise<Record<string, TokenInfo>> {
  const coinMetadataMap = await getCoinMetadataMap(client, coinAddresses);
  const newTokenInfo = { ...existingTokenInfo };

  Object.entries(coinMetadataMap).forEach(([address, metadata]) => {
    const formattedAddress = address.replaceAll('::', '-');
    newTokenInfo[formattedAddress] = {
      address: formattedAddress,
      name: metadata.name,
      symbol: metadata.symbol,
      decimals: metadata.decimals,
      logoURI: metadata.iconUrl || '',
      networkId: 'sui',
    };
  });

  return newTokenInfo;
}
