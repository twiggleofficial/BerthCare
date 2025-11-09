import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { useAppStore } from '../store';
import { createLogger } from '../services/logger';
import { registerBackgroundSyncAsync } from '../services/sync/background-task';
import { triggerForegroundSync } from '../services/sync/sync-runner';

const logger = createLogger('sync-manager');

export function SyncManager() {
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const isOnline = useAppStore((state) => state.isOnline);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const hasTriggeredForegroundRef = useRef(false);
  const previousOnlineRef = useRef<boolean | null>(null);

  useEffect(() => {
    void registerBackgroundSyncAsync().catch((error) => {
      logger.error('Failed to register background sync', { error });
    });
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      previousOnlineRef.current = isOnline;
      return;
    }

    const previous = previousOnlineRef.current;
    previousOnlineRef.current = isOnline;

    if (previous === false && isOnline) {
      void triggerForegroundSync('network');
    }
  }, [isAuthenticated, isOnline]);

  useEffect(() => {
    if (!isAuthenticated) {
      hasTriggeredForegroundRef.current = false;
      return;
    }

    const maybeTriggerSync = () => {
      hasTriggeredForegroundRef.current = true;
      void triggerForegroundSync('app-open');
    };

    if (!hasTriggeredForegroundRef.current && appStateRef.current === 'active') {
      maybeTriggerSync();
    }

    const handleAppStateChange = (nextState: AppStateStatus) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextState;

      const cameToForeground =
        (previousState === 'background' || previousState === 'inactive') &&
        nextState === 'active';

      if (cameToForeground) {
        maybeTriggerSync();
      } else if (nextState === 'background') {
        hasTriggeredForegroundRef.current = false;
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [isAuthenticated]);

  return null;
}
