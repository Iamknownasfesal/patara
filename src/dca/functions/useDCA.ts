import { useQuery } from '@tanstack/react-query';
import invariant from 'tiny-invariant';

import { fetchDCAObjectsAndParse } from '../fetch';
import type { DCAObject, UseDCAParams } from '../types';

export function useDCA({ address, metadata }: UseDCAParams) {
  const queryKey = ['dca', address];

  const queryFn = async () => {
    invariant(address, 'Address is required to fetch DCA objects');

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
