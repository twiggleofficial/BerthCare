import { useCallback, useEffect, useRef, useState } from 'react';

import { createLogger } from '../services/logger';
import { triggerForegroundSync } from '../services/sync/sync-runner';

const logger = createLogger('manual-sync-refresh');

export function useManualSyncRefresh() {
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const isRefreshingRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleRefresh = useCallback(() => {
    if (isRefreshingRef.current) {
      return;
    }

    isRefreshingRef.current = true;
    setRefreshing(true);
    setError(null);

    void triggerForegroundSync('manual')
      .catch((error) => {
        logger.error('Manual sync refresh failed', { error });
        if (mountedRef.current) {
          setError(error as Error);
        }
      })
      .finally(() => {
        isRefreshingRef.current = false;
        if (mountedRef.current) {
          setRefreshing(false);
        }
      });
  }, []);

  return {
    refreshing,
    error,
    onRefresh: handleRefresh,
  };
}
