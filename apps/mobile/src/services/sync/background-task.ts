import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';

import { createLogger } from '../logger';
import { BACKGROUND_SYNC_TASK, executeBackgroundSync } from './sync-runner';

const logger = createLogger('background-sync');

declare global {
  // eslint-disable-next-line no-var
  var __BERTHCARE_BACKGROUND_SYNC_TASK__: boolean | undefined;
}

const taskFlag = '__BERTHCARE_BACKGROUND_SYNC_TASK__';
const globalScope = globalThis as typeof globalThis & {
  __BERTHCARE_BACKGROUND_SYNC_TASK__?: boolean;
};

if (!globalScope[taskFlag]) {
  /**
   * Mirrors `project-documentation/architecture-output.md` → "Background Sync Setup".
   */
  TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
    const outcome = await executeBackgroundSync();
    if (outcome === 'success') {
      return BackgroundFetch.BackgroundFetchResult.NewData;
    }

    if (outcome === 'skipped') {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    return BackgroundFetch.BackgroundFetchResult.Failed;
  });

  globalScope[taskFlag] = true;
}

export const registerBackgroundSyncAsync = async () => {
  const status = await BackgroundFetch.getStatusAsync();
  if (
    status === BackgroundFetch.BackgroundFetchStatus.Restricted ||
    status === BackgroundFetch.BackgroundFetchStatus.Denied
  ) {
    logger.warn('Background fetch unavailable', { status });
    return { registered: false, status };
  }

  const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
  if (isRegistered) {
    logger.info('Background sync task already registered');
    return { registered: true, status };
  }

  await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
    minimumInterval: 15 * 60,
    stopOnTerminate: false,
    startOnBoot: true,
  });

  logger.info('Background sync task registered', { minimumInterval: 15 * 60 });
  return { registered: true, status };
};
