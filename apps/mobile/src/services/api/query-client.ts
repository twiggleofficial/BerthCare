import type { DefaultOptions} from '@tanstack/react-query';
import { QueryClient } from '@tanstack/react-query';

const DEFAULT_QUERY_OPTIONS: DefaultOptions = {
  queries: {
    staleTime: 60 * 1000, // keep caregiver data "fresh" for 1 minute
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
