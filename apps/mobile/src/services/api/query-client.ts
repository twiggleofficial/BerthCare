import type { DefaultOptions } from '@tanstack/react-query';
import { QueryClient } from '@tanstack/react-query';

/**
 * Shared stale time presets so individual queries can opt into longer caching windows
 * for relatively static data (caregiver profile, care plans, etc.).
 */
export const QUERY_STALE_TIMES = {
  default: 60 * 1000, // 1 minute for fast-changing data
  stableCareData: 10 * 60 * 1000, // 10 minutes for slow-changing resources
} as const;

const DEFAULT_QUERY_OPTIONS: DefaultOptions = {
  queries: {
    staleTime: QUERY_STALE_TIMES.default,
    gcTime: 5 * 60 * 1000, // cacheTime (garbage collection) in React Query v5+
    retry: 2,
    refetchOnReconnect: true,
    refetchOnWindowFocus: false,
  },
  mutations: {
    retry: 0,
  },
};

export const createQueryClient = () => new QueryClient({ defaultOptions: DEFAULT_QUERY_OPTIONS });
export { DEFAULT_QUERY_OPTIONS };
