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

    triggerForegroundSync('manual')
      .then((outcome) => {
        if (outcome === 'error' || outcome === 'offline') {
          logger.warn('Manual sync finished without success', { outcome });
          if (mountedRef.current) {
            setError(new Error(`Sync ${outcome}`));
          }
        }
      })
      .catch((error) => {
        // Defensive: triggerForegroundSync should not reject, but capture unexpected failures.
        logger.error('Unexpected manual sync failure', { error });
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
