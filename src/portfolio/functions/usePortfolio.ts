import type { FetchersResult, TokenInfo } from '@sonarwatch/portfolio-core';
import { useQuery } from '@tanstack/react-query';
import invariant from 'tiny-invariant';

import { getMultipleCoinMetadataAll } from '../../coin/functions/getCoinMetadata';
import { PORTFOLIO_API_BASE_URL } from '../constants';
import { getTokenInfo } from './token';

type UsePortfolioParams = {
  address?: string;
};

export function usePortfolio({ address }: UsePortfolioParams) {
  return useQuery({
    queryKey: ['suiPortfolio', address],
    queryFn: () => {
      invariant(address, 'Address is required');

      return fetchSuiPortfolio(address);
    },
    enabled: !!address,
  });
}

async function fetchSuiPortfolio(address: string): Promise<FetchersResult> {
  invariant(address, 'Address is required');

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
  coinAddresses: string[],
  existingTokenInfo: Record<string, TokenInfo>
): Promise<Record<string, TokenInfo>> {
  const coinMetadataMap = await getMultipleCoinMetadataAll(coinAddresses);

  const newTokenInfo = { ...existingTokenInfo };

  coinMetadataMap.coins.forEach((coin) => {
    newTokenInfo[coin.type] = {
      address: coin.type,
      decimals: coin.decimals,
      name: coin.name,
      symbol: coin.symbol,
      networkId: 'sui',
      tags: coin.tags,
    };
  });

  return newTokenInfo;
}
