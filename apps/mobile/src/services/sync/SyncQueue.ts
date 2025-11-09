import type Collection from '@nozbe/watermelondb/Collection';
import type Database from '@nozbe/watermelondb/Database';
import { Q } from '@nozbe/watermelondb';
import type { Clause } from '@nozbe/watermelondb/QueryDescription';
import type { TableName } from '@nozbe/watermelondb/Schema';

import type { SyncQueueEntry } from '../../database/models/sync-queue-entry';
import type { SyncQueueOperation, SyncQueuePriority } from '../../database/types';
import { withDatabaseWriteTelemetry } from '../../database/write-telemetry';

const SYNC_QUEUE_TABLE = 'sync_queue' as TableName<SyncQueueEntry>;
const PRIORITY_ORDER: Record<SyncQueuePriority, number> = {
  critical: 0,
  normal: 1,
};
const PRIORITY_VALUES: SyncQueuePriority[] = ['critical', 'normal'];

type QueueOptions = {
  now?: () => Date;
};

export type SyncQueueEnqueueInput = {
  table: string;
  recordId: string;
  operation: SyncQueueOperation;
  payload?: Record<string, unknown>;
  priority?: SyncQueuePriority;
};

export type SyncQueueChange = {
  id: string;
  table: string;
  recordId: string;
  operation: SyncQueueOperation;
  payload?: Record<string, unknown>;
  priority: SyncQueuePriority;
  createdAt: Date;
};

const clonePayload = (
  payload?: Record<string, unknown>,
): Record<string, unknown> | undefined => {
  if (!payload) {
    return undefined;
  }

  try {
    return JSON.parse(JSON.stringify(payload)) as Record<string, unknown>;
  } catch {
    return payload;
  }
};

const priorityToValue = (priority: SyncQueuePriority): number => PRIORITY_ORDER[priority];

const valueToPriority = (value: number): SyncQueuePriority => {
  const resolved = PRIORITY_VALUES.find((priority) => PRIORITY_ORDER[priority] === value);
  return resolved ?? 'normal';
};

type WriteTelemetryContext = Parameters<typeof withDatabaseWriteTelemetry>[0];

/**
 * Persists pending mutations in a WatermelonDB-backed queue so sync can resume
 * seamlessly across app restarts. Entries with a `critical` priority always
 * drain before normal items to keep essential data moving first.
 */
export class SyncQueue {
  private readonly database: Database;
  private readonly collection: Collection<SyncQueueEntry>;
  private readonly now: () => Date;

  constructor(database: Database, options: QueueOptions = {}) {
    this.database = database;
    this.collection = database.get<SyncQueueEntry>(SYNC_QUEUE_TABLE);
    this.now = options.now ?? (() => new Date());
  }

  async enqueue(change: SyncQueueEnqueueInput): Promise<SyncQueueChange> {
    const timestamp = this.now();
    const priorityValue = priorityToValue(change.priority ?? 'normal');
    const payload = clonePayload(change.payload);

    const entry = await withDatabaseWriteTelemetry(
      {
        entity: SYNC_QUEUE_TABLE,
        operation: 'insert',
        database: this.database,
        rowsAffected: 1,
      },
      () =>
        this.database.write(async () =>
          this.collection.create((record) => {
            record.tableName = change.table;
            record.recordId = change.recordId;
            record.operation = change.operation;
            record.priority = priorityValue;
            record.createdAt = timestamp;
            record.payload = payload ?? null;
          }),
        ),
    );

    return this.toChange(entry);
  }

  async peek(): Promise<SyncQueueChange | null> {
    const entry = await this.getNextEntry();
    return entry ? this.toChange(entry) : null;
  }

  async dequeue(): Promise<SyncQueueChange | null> {
    const telemetryContext: WriteTelemetryContext = {
      entity: SYNC_QUEUE_TABLE,
      operation: 'delete',
      database: this.database,
      rowsAffected: 0,
    };

    return withDatabaseWriteTelemetry(telemetryContext, () =>
      this.database.write(async () => {
        const entry = await this.getNextEntry();
        if (!entry) {
          return null;
        }

        telemetryContext.rowsAffected = 1;
        const change = this.toChange(entry);
        await entry.destroyPermanently();
        return change;
      }),
    );
  }

  async list(limit?: number): Promise<SyncQueueChange[]> {
    const clauses: Clause[] = [Q.sortBy('priority', Q.asc), Q.sortBy('created_at', Q.asc)];
    if (typeof limit === 'number') {
      const bounded = Math.max(0, Math.floor(limit));
      if (bounded === 0) {
        return [];
      }
      clauses.push(Q.take(bounded));
    }

    const entries = await this.collection.query(...clauses).fetch();
    return entries.map((entry) => this.toChange(entry));
  }

  async count(): Promise<number> {
    return this.collection.query().fetchCount();
  }

  async clear(): Promise<void> {
    const telemetryContext: WriteTelemetryContext = {
      entity: SYNC_QUEUE_TABLE,
      operation: 'bulk',
      database: this.database,
      rowsAffected: 0,
    };

    await withDatabaseWriteTelemetry(telemetryContext, () =>
      this.database.write(async () => {
        const entries = await this.collection.query().fetch();
        const total = entries.length;
        telemetryContext.rowsAffected = total;
        if (!total) {
          return;
        }

        await this.database.batch(
          ...entries.map((entry) => entry.prepareDestroyPermanently()),
        );
      }),
    );
  }

  private async getNextEntry(): Promise<SyncQueueEntry | null> {
    const entries = await this.collection
      .query(Q.sortBy('priority', Q.asc), Q.sortBy('created_at', Q.asc), Q.take(1))
      .fetch();
    return entries[0] ?? null;
  }

  private toChange(entry: SyncQueueEntry): SyncQueueChange {
    return {
      id: entry.id,
      table: entry.tableName,
      recordId: entry.recordId,
      operation: entry.operation,
      payload: entry.payload ? clonePayload(entry.payload) : undefined,
      priority: valueToPriority(entry.priority),
      createdAt: entry.createdAt,
    };
  }
}
