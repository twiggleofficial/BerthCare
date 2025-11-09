import { Alert, Platform } from 'react-native';
import Database from '@nozbe/watermelondb/Database';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { DatabaseProvider } from '@nozbe/watermelondb/DatabaseProvider';

import { Client, Medication, Photo, SyncQueueEntry, Visit, VisitDocumentation } from './models';
import { schema } from './schema';
import { migrations } from './migrations';
import { createLogger } from '../services/logger';
import { trackAnalyticsEvent } from '../services/analytics';
import { syncOptionalIndexes } from './optional-index-manager';

const setupLogger = createLogger('database');

const adapter = new SQLiteAdapter({
  schema,
  migrations,
  dbName: 'berthcare',
  jsi: Platform.OS !== 'web',
  onSetUpError(error) {
    console.error('[database] Failed to set up WatermelonDB', error);
    setupLogger.error('Failed to set up WatermelonDB', { error, stage: 'database-setup' });
    void trackAnalyticsEvent({
      name: 'app_launch_requirement_failed',
      properties: {
        requirement: 'database-setup',
        metTarget: false,
        timestamp: new Date().toISOString(),
      },
    });
    Alert.alert(
      'App Error',
      'We could not prepare your offline data. Please restart Berthcare or contact support if this keeps happening.',
    );
    throw error;
  },
});

export const database = new Database({
  adapter,
  modelClasses: [Client, Medication, Photo, Visit, VisitDocumentation, SyncQueueEntry],
});

void syncOptionalIndexes(database).catch((error) => {
  setupLogger.warn('Failed to synchronize optional indexes', { error });
});

export { DatabaseProvider };
export { schema } from './schema';
export { migrations } from './migrations';
export * from './models';
