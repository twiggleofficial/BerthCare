import type Database from '@nozbe/watermelondb/Database';

import { WRITE_LATENCY_ROLLBACK_THRESHOLD_MS } from '../config/feature-flags';
import { trackAnalyticsEvent } from '../services/analytics';
import { createLogger } from '../services/logger';
import { requestOptionalIndexRollback } from './optional-index-manager';
import { schema } from './schema';

export type WriteOperationKind = 'insert' | 'update' | 'delete' | 'bulk';

type TelemetryContext = {
  entity: string;
  operation: WriteOperationKind;
  database?: Database;
  rowsAffected?: number;
};

const now = () =>
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();

const logger = createLogger('db-telemetry');
let rollbackTriggered = false;

const maybeTriggerRollback = async (database?: Database, durationMs?: number) => {
  if (rollbackTriggered) {
    return;
  }

  rollbackTriggered = true;
  try {
    if (!database) {
      logger.warn('Latency regression detected but no database instance was provided');
      return;
    }
    await requestOptionalIndexRollback(database);
    logger.warn('Optional indexes rolled back due to latency regression', {
      durationMs,
    });
  } catch (error) {
    logger.error('Failed to rollback optional indexes after latency regression', { error });
  }
};

export const withDatabaseWriteTelemetry = async <T>(
  context: TelemetryContext,
  work: () => Promise<T>,
): Promise<T> => {
  const start = now();
  try {
    return await work();
  } finally {
    const durationMs = Math.round(now() - start);
    void trackAnalyticsEvent({
      name: 'database_write_latency',
      properties: {
        entity: context.entity,
        operation: context.operation,
        durationMs,
        rowsAffected: context.rowsAffected,
        schemaVersion: schema.version,
        thresholdMs: WRITE_LATENCY_ROLLBACK_THRESHOLD_MS,
        timestamp: new Date().toISOString(),
      },
    });

    if (durationMs >= WRITE_LATENCY_ROLLBACK_THRESHOLD_MS) {
      void maybeTriggerRollback(context.database, durationMs);
    }
  }
};
