import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import type { CoinMetadataMap } from '../../types';
import { fetchDCAObjectsAndParse } from '../fetch';
import type { DCAObject } from '../types';

export function useDCA(
  address?: string,
  metadata?: CoinMetadataMap
): UseQueryResult<DCAObject[], Error> {
  const queryKey = ['dca', address];

  const queryFn = async () => {
    if (!address) {
      throw new Error('Address is required to fetch DCA objects');
    }

    return fetchDCAObjectsAndParse(address, metadata || {});
  };

  return useQuery<DCAObject[], Error>({
    queryKey,
    queryFn,
    enabled: Boolean(address),
    refetchInterval: 1000,
    staleTime: 500,
    retry: 3,
  });
}
