import type { Platform } from '@sonarwatch/portfolio-core';
import { useQuery } from '@tanstack/react-query';

import { PORTFOLIO_API_BASE_URL } from '../constants';

export function usePlatform(platformId: string) {
  return useQuery({
    queryKey: ['suiPlatform', platformId],
    queryFn: async () => {
      const platforms = await fetchSuiPlatforms();
      return getPlatform(platformId, platforms);
    },
  });
}

async function fetchSuiPlatforms(): Promise<Platform[]> {
  const response = await fetch(`${PORTFOLIO_API_BASE_URL}/supported_platforms`);
  if (!response.ok) {
    throw new Error('Failed to fetch platforms');
  }
  return response.json();
}

export function getPlatform(
  id: string,
  platforms: Platform[]
): Platform | undefined {
  return platforms.find((platform) => platform.id === id);
}
