import type Collection from '@nozbe/watermelondb/Collection';
import type Database from '@nozbe/watermelondb/Database';
import type { TableName } from '@nozbe/watermelondb/Schema';

import type { SyncableModel } from '../models/syncable-model';
import type { SyncQueueOperation, SyncQueuePriority, SyncStatus } from '../types';
import type { SyncQueue } from '../../services/sync/SyncQueue';
import { withDatabaseWriteTelemetry, type WriteOperationKind } from '../write-telemetry';

export type RepositoryDependencies = {
  database: Database;
  queue: SyncQueue;
  now?: () => Date;
};

export abstract class BaseRepository<TRecord extends SyncableModel> {
  protected readonly tableName: TableName<TRecord>;
  protected readonly database: Database;
  protected readonly collection: Collection<TRecord>;
  protected readonly queue: SyncQueue;
  protected readonly now: () => Date;

  protected constructor(tableName: TableName<TRecord>, deps: RepositoryDependencies) {
    this.tableName = tableName;
    this.database = deps.database;
    this.queue = deps.queue;
    this.collection = this.database.get<TRecord>(tableName);
    this.now = deps.now ?? (() => new Date());
  }

  async findById(id: string): Promise<TRecord | null> {
    try {
      return await this.collection.find(id);
    } catch {
      return null;
    }
  }

  async getAll(): Promise<TRecord[]> {
    try {
      return await this.collection.query().fetch();
    } catch (error) {
      console.warn(`[repository][${String(this.tableName)}] Failed to fetch all records`, error);
      return [];
    }
  }

  protected serializePayload(payload?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!payload) {
      return undefined;
    }

    try {
      return JSON.parse(JSON.stringify(payload)) as Record<string, unknown>;
    } catch {
      return undefined;
    }
  }

  protected async queueChange(params: {
    recordId: string;
    operation: SyncQueueOperation;
    payload?: Record<string, unknown>;
    priority?: SyncQueuePriority;
  }): Promise<void> {
    const priority = params.priority ?? (params.operation === 'delete' ? 'critical' : 'normal');
    await this.queue.enqueue({
      table: this.tableName as unknown as string,
      recordId: params.recordId,
      operation: params.operation,
      payload: this.serializePayload(params.payload),
      priority,
    });
  }

  protected applySyncState(
    record: TRecord,
    status: SyncStatus = 'pending',
    timestamp = this.now(),
  ): void {
    record.syncState = status;
    record.updatedAt = timestamp;
  }

  protected writeWithTelemetry<T>(
    operation: WriteOperationKind,
    work: () => Promise<T>,
  ): Promise<T> {
    return withDatabaseWriteTelemetry(
      {
        entity: String(this.tableName),
        operation,
        database: this.database,
      },
      () => this.database.write(work),
    );
  }
}
