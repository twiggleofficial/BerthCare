import { database } from '../../database';
import { useAppStore } from '../../store';
import { apiClient } from '../api/client';
import { createLogger } from '../logger';
import { SyncQueue } from './SyncQueue';
import { SyncEngine } from './SyncEngine';

/**
 * Coordinates background + foreground sync per the Blueprint documented in
 * `project-documentation/architecture-output.md` (Background Sync Setup).
 */

export const BACKGROUND_SYNC_TASK = 'berthcare-background-sync';

const BACKGROUND_BACKOFF_DELAYS_MS = [60_000, 120_000, 240_000, 480_000, 900_000];

type SyncTrigger = 'background' | 'app-open' | 'network' | 'manual';
type SyncEngineResult = Awaited<ReturnType<SyncEngine['sync']>>;

export type ForegroundSyncTrigger = Extract<SyncTrigger, 'app-open' | 'network' | 'manual'>;
export type ForegroundSyncOutcome = 'success' | 'offline' | 'skipped' | 'error';
export type BackgroundSyncOutcome = 'success' | 'failed' | 'skipped';

const logger = createLogger('sync-runner');

let queue: SyncQueue | null = null;
let engine: SyncEngine | null = null;
let activeRun: Promise<SyncEngineResult> | null = null;
let backgroundBackoffStep = -1;
let nextBackgroundAttemptAt = 0;

const ensureSyncQueue = () => {
  if (!queue) {
    queue = new SyncQueue(database);
  }

  return queue;
};

const ensureSyncEngine = () => {
  if (engine) {
    return engine;
  }

  const storeSnapshot = useAppStore.getState();
  engine = new SyncEngine({
    database,
    queue: ensureSyncQueue(),
    api: apiClient,
    store: {
      beginSync: storeSnapshot.beginSync,
      completeSync: storeSnapshot.completeSync,
      getIsOnline: () => useAppStore.getState().isOnline,
      getLastSyncTime: () => useAppStore.getState().lastSyncTime,
    },
    logger,
  });

  return engine;
};

const ensureAuthenticatedSession = () => {
  const state = useAppStore.getState();
  if (!state.isAuthenticated) {
    return { canSync: false as const, reason: 'unauthenticated' };
  }

  if (!state.tokens.accessToken) {
    return { canSync: false as const, reason: 'missing-token' };
  }

  return { canSync: true as const };
};

const isBackgroundInBackoff = () => {
  if (backgroundBackoffStep < 0) {
    return false;
  }

  return nextBackgroundAttemptAt > Date.now();
};

const scheduleBackgroundRetry = () => {
  backgroundBackoffStep = Math.min(
    backgroundBackoffStep + 1,
    BACKGROUND_BACKOFF_DELAYS_MS.length - 1,
  );
  const delay = BACKGROUND_BACKOFF_DELAYS_MS[backgroundBackoffStep];
  nextBackgroundAttemptAt = Date.now() + delay;

  logger.warn('Background sync failed; applying backoff', {
    attempt: backgroundBackoffStep + 1,
    delayMs: delay,
    nextAttemptAt: nextBackgroundAttemptAt,
  });
};

const resetBackgroundBackoff = () => {
  backgroundBackoffStep = -1;
  nextBackgroundAttemptAt = 0;
};

const runSyncExclusive = (source: SyncTrigger) => {
  if (activeRun) {
    return activeRun;
  }

  const instance = ensureSyncEngine();
  const promise = (async () => {
    logger.info('Starting sync pass', { source });
    try {
      const result = await instance.sync();
      logger.info('Sync pass finished', { source, status: result.status });
      return result;
    } catch (error) {
      logger.error('Sync pass failed', { source, error });
      throw error;
    }
  })();

  activeRun = promise;

  return promise.finally(() => {
    if (activeRun === promise) {
      activeRun = null;
    }
  });
};

export async function triggerForegroundSync(
  trigger: ForegroundSyncTrigger,
): Promise<ForegroundSyncOutcome> {
  const gate = ensureAuthenticatedSession();
  if (!gate.canSync) {
    logger.info('Skipping foreground sync', { trigger, reason: gate.reason });
    return 'skipped';
  }

  try {
    const result = await runSyncExclusive(trigger);
    resetBackgroundBackoff();
    return result.status === 'offline' ? 'offline' : 'success';
  } catch (error) {
    logger.error('Foreground sync failed', { trigger, error });
    return 'error';
  }
}

export async function executeBackgroundSync(): Promise<BackgroundSyncOutcome> {
  const gate = ensureAuthenticatedSession();
  if (!gate.canSync) {
    logger.info('Skipping background sync', { reason: gate.reason });
    return 'skipped';
  }

  if (isBackgroundInBackoff()) {
    logger.info('Skipping background sync while waiting for backoff window');
    return 'skipped';
  }

  try {
    const result = await runSyncExclusive('background');
    resetBackgroundBackoff();
    return result.status === 'success' ? 'success' : 'skipped';
  } catch (error) {
    logger.error('Background sync failed', { error });
    scheduleBackgroundRetry();
    return 'failed';
  }
}

/** Testing hook so Vitest can reset singleton state without reloading the module. */
export const __resetSyncStateForTests = () => {
  activeRun = null;
  backgroundBackoffStep = -1;
  nextBackgroundAttemptAt = 0;
  engine = null;
  queue = null;
};
