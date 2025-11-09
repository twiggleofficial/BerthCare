import { useCallback, useRef, useState } from 'react';

import { createLogger } from '../services/logger';
import { triggerForegroundSync } from '../services/sync/sync-runner';

const logger = createLogger('manual-sync-refresh');

export function useManualSyncRefresh() {
  const [refreshing, setRefreshing] = useState(false);
  const isRefreshingRef = useRef(false);

  const handleRefresh = useCallback(() => {
    if (isRefreshingRef.current) {
      return;
    }

    isRefreshingRef.current = true;
    setRefreshing(true);

    void triggerForegroundSync('manual')
      .catch((error) => {
        logger.error('Manual sync refresh failed', { error });
      })
      .finally(() => {
        isRefreshingRef.current = false;
        setRefreshing(false);
      });
  }, []);

  return {
    refreshing,
    onRefresh: handleRefresh,
  };
}
