import type Database from '@nozbe/watermelondb/Database';
import type { TableName } from '@nozbe/watermelondb/Schema';

import type {
  Client,
  Medication,
  Photo,
  SyncQueueEntry,
  Visit,
  VisitDocumentation,
} from '../../database/models';
import type { SyncQueueOperation } from '../../database/types';
import { withDatabaseWriteTelemetry } from '../../database/write-telemetry';
import { createLogger } from '../logger';
import type { SyncQueue } from './SyncQueue';
import type { SyncQueueChange } from './SyncQueue';

type Logger = ReturnType<typeof createLogger>;
type SyncModel = Client | Visit | VisitDocumentation | Medication | Photo;

const SYNC_QUEUE_TABLE = 'sync_queue' as TableName<SyncQueueEntry>;
const SYNC_ENTITY_TABLE_MAP = {
  client: 'clients',
  visit: 'visits',
  visit_documentation: 'visit_documentation',
  medication: 'medications',
  photo: 'photos',
} as const;

type SyncEntity = keyof typeof SYNC_ENTITY_TABLE_MAP;
type SyncTableName = (typeof SYNC_ENTITY_TABLE_MAP)[SyncEntity];

const TABLE_TO_ENTITY = Object.entries(SYNC_ENTITY_TABLE_MAP).reduce<Record<SyncTableName, SyncEntity>>(
  (acc, [entity, table]) => {
    acc[table as SyncTableName] = entity as SyncEntity;
    return acc;
  },
  {} as Record<SyncTableName, SyncEntity>,
);

// Heuristic used when coercing server payloads back into JS Dates. We rely on a
// naming convention where every timestamp ends with At/Time/Date (e.g.
// updatedAt, checkInTime). If a new entity introduces differently named date
// fields, update this pattern or add explicit handling before syncing.
const DATE_FIELD_PATTERN = /(At|Time|Date)$/i;

type SyncOperationPayload = Record<string, unknown>;

type SyncOperation = {
  type: SyncQueueOperation;
  entity: SyncEntity;
  data: SyncOperationPayload;
  localId: string;
  timestamp: string;
};

type SyncBatchRequest = {
  operations: SyncOperation[];
  lastSyncTimestamp: string | null;
};

type SyncBatchResult = {
  localId: string;
  status: 'success' | 'ignored' | 'error';
  entity?: SyncEntity;
};

type SyncServerChange = {
  type: SyncQueueOperation;
  entity: SyncEntity;
  data: Record<string, unknown>;
  timestamp?: string | Date | null;
};

type SyncBatchResponse = {
  results?: SyncBatchResult[];
  serverChanges?: SyncServerChange[];
  newSyncTimestamp?: string | Date | null;
};

type SyncApiClient = {
  post: (path: string, payload: SyncBatchRequest) => Promise<{ data?: SyncBatchResponse | null }>;
};

type SyncStoreAdapter = {
  beginSync: () => void;
  completeSync: (options?: { pendingChanges?: number; completedAt?: Date; isError?: boolean }) => void;
  getIsOnline: () => boolean;
  getLastSyncTime: () => Date | null;
};

type SyncEngineDependencies = {
  database: Database;
  queue: SyncQueue;
  api?: SyncApiClient;
  store?: SyncStoreAdapter;
  logger?: Logger;
  now?: () => Date;
};

type SyncConflict = {
  entity: SyncEntity;
  recordId: string;
  serverTimestamp: Date;
  localTimestamp: Date | null;
  resolution: 'server' | 'local';
};

type PendingChangeIndexes = {
  byQueueId: Map<string, SyncQueueChange>;
  byRecordId: Map<string, SyncQueueChange[]>;
};

type ProcessServerChangesResult = {
  applied: number;
  conflicts: SyncConflict[];
  serverResolvedQueueEntryIds: string[];
  localWinsQueueEntryIds: string[];
};

type SyncRunOfflineResult = {
  status: 'offline';
  pulled: 0;
  pushed: 0;
  conflicts: 0;
  lastSyncTime: Date | null;
};

type SyncRunSuccessResult = {
  status: 'success';
  pushed: number;
  pulled: number;
  conflicts: number;
  lastSyncTime: Date;
};

type SyncRunResult = SyncRunOfflineResult | SyncRunSuccessResult;

const missingApiClient: SyncApiClient = {
  post() {
    throw new Error('[SyncEngine] API client dependency was not provided.');
  },
};

const defaultStoreAdapter: SyncStoreAdapter = {
  beginSync: () => {},
  completeSync: () => {},
  getIsOnline: () => true,
  getLastSyncTime: () => null,
};

/**
 * Implements the Sync Engine contract from `project-documentation/architecture-output.md`
 * (Sync Engine Architecture + Sync Conflict Resolution). Assumes server timestamps
 * are authoritative, conflicts are last-write-wins, and every conflict is logged to
 * the backend `sync_log` per the architecture blueprint.
 */
export class SyncEngine {
  private readonly database: Database;
  private readonly queue: SyncQueue;
  private readonly api: SyncApiClient;
  private readonly store: SyncStoreAdapter;
  private readonly logger: Logger;
  private readonly now: () => Date;

  constructor(deps: SyncEngineDependencies) {
    this.database = deps.database;
    this.queue = deps.queue;
    this.api = deps.api ?? missingApiClient;
    this.store = deps.store ?? defaultStoreAdapter;
    this.logger = deps.logger ?? createLogger('sync-engine');
    this.now = deps.now ?? (() => new Date());
  }

  async sync(): Promise<SyncRunResult> {
    if (!this.store.getIsOnline()) {
      this.logger.info('Skipping sync because the device is offline.');
      return {
        status: 'offline',
        pulled: 0,
        pushed: 0,
        conflicts: 0,
        lastSyncTime: this.store.getLastSyncTime(),
      };
    }

    this.store.beginSync();
    const pendingChanges = await this.queue.list();
    const indexes = this.buildPendingIndexes(pendingChanges);
    const operations = this.buildOperations(pendingChanges);
    const lastSyncTimestamp = this.store.getLastSyncTime();
    const requestPayload: SyncBatchRequest = {
      operations,
      lastSyncTimestamp: lastSyncTimestamp ? lastSyncTimestamp.toISOString() : null,
    };

    try {
      const response = await this.api.post('/sync/batch', requestPayload);
      const batch: SyncBatchResponse = response.data ?? {};
      const serverChanges = batch.serverChanges ?? [];
      const batchResults = batch.results ?? [];
      const parsedSyncTimestamp = this.parseDate(batch.newSyncTimestamp ?? null);
      const newSyncTimestamp = parsedSyncTimestamp ?? this.now();

      const tentativeQueueRemovalSet = new Set<string>();
      if (batchResults.length) {
        batchResults.forEach((result) => {
          if (result.status !== 'success') {
            return;
          }

          const change = indexes.byQueueId.get(result.localId);
          if (change) {
            tentativeQueueRemovalSet.add(change.id);
          }
        });
      } else {
        pendingChanges.forEach((change) => tentativeQueueRemovalSet.add(change.id));
      }

      const processResult = await this.processServerChanges(serverChanges, indexes.byRecordId);
      processResult.localWinsQueueEntryIds.forEach((id) => tentativeQueueRemovalSet.delete(id));
      processResult.serverResolvedQueueEntryIds.forEach((id) => tentativeQueueRemovalSet.add(id));
      await this.removeQueueEntries([...tentativeQueueRemovalSet]);

      const pendingCount = await this.queue.count();
      this.store.completeSync({
        pendingChanges: pendingCount,
        completedAt: newSyncTimestamp,
      });

      return {
        status: 'success',
        pushed: operations.length,
        pulled: processResult.applied,
        conflicts: processResult.conflicts.length,
        lastSyncTime: newSyncTimestamp,
      };
    } catch (error) {
      const pendingCount = await this.queue.count();
      this.store.completeSync({
        isError: true,
        pendingChanges: pendingCount,
      });
      this.logger.error('Sync failed', { error });
      throw error;
    }
  }

  private buildOperations(changes: SyncQueueChange[]): SyncOperation[] {
    return changes.reduce<SyncOperation[]>((acc, change) => {
      const entity = this.getEntityForTable(change.table);
      if (!entity) {
        this.logger.warn('Skipping queue entry with unmapped table', { table: change.table });
        return acc;
      }

      const payload: Record<string, unknown> = { ...(change.payload ?? {}) };
      if (typeof payload.id !== 'string') {
        Reflect.set(payload, 'id', change.recordId);
      }

      acc.push({
        type: change.operation,
        entity,
        data: payload,
        localId: change.id,
        timestamp: change.createdAt.toISOString(),
      });

      return acc;
    }, []);
  }

  private buildPendingIndexes(changes: SyncQueueChange[]): PendingChangeIndexes {
    const byQueueId = new Map<string, SyncQueueChange>();
    const byRecordId = new Map<string, SyncQueueChange[]>();

    changes.forEach((change) => {
      byQueueId.set(change.id, change);
      const scoped = byRecordId.get(change.recordId);
      if (scoped) {
        scoped.push(change);
      } else {
        byRecordId.set(change.recordId, [change]);
      }
    });

    return { byQueueId, byRecordId };
  }

  private async processServerChanges(
    serverChanges: SyncServerChange[],
    pendingByRecordId: Map<string, SyncQueueChange[]>,
  ): Promise<ProcessServerChangesResult> {
    let applied = 0;
    const conflicts: SyncConflict[] = [];
    const serverResolvedQueueEntryIds: string[] = [];
    const localWinsQueueEntryIds: string[] = [];

    for (const change of serverChanges) {
      const table = SYNC_ENTITY_TABLE_MAP[change.entity];
      if (!table) {
        this.logger.warn('Received server change for unknown entity', { entity: change.entity });
        continue;
      }

      const recordId = this.resolveRecordId(change.data);
      if (!recordId) {
        this.logger.warn('Server change missing record id', { entity: change.entity });
        continue;
      }

      const pending = pendingByRecordId.get(recordId);
      const serverTimestamp = this.parseDate(change.timestamp) ?? this.now();

      if (pending && pending.length) {
        const localTimestamp = this.getLatestLocalTimestamp(pending);
        const serverWins = !localTimestamp || serverTimestamp >= localTimestamp;
        const conflict: SyncConflict = {
          entity: change.entity,
          recordId,
          serverTimestamp,
          localTimestamp,
          resolution: serverWins ? 'server' : 'local',
        };
        conflicts.push(conflict);
        this.logConflict(conflict);

        if (serverWins) {
          serverResolvedQueueEntryIds.push(...pending.map((item) => item.id));
        } else {
          localWinsQueueEntryIds.push(...pending.map((item) => item.id));
          continue;
        }
      }

      const appliedChange = await this.applyServerChange(table, recordId, change, serverTimestamp);
      if (appliedChange) {
        applied += 1;
      }
    }

    return { applied, conflicts, serverResolvedQueueEntryIds, localWinsQueueEntryIds };
  }

  private async applyServerChange(
    tableName: SyncTableName,
    recordId: string,
    change: SyncServerChange,
    serverTimestamp: Date,
  ): Promise<boolean> {
    const collection = this.database.get<SyncModel>(tableName as TableName<SyncModel>);
    const existing = await collection.find(recordId).catch(() => null as SyncModel | null);

    if (change.type === 'delete') {
      if (!existing) {
        return false;
      }

      await withDatabaseWriteTelemetry(
        {
          entity: tableName,
          operation: 'delete',
          database: this.database,
        },
        () =>
          this.database.write(async () => {
            await existing.update((record) => {
              if ('isActive' in record) {
                (record as SyncModel & { isActive: boolean }).isActive = false;
              }

              this.applySyncedMetadata(record, serverTimestamp);
            });
          }),
      );

      return true;
    }

    if (existing) {
      await withDatabaseWriteTelemetry(
        {
          entity: tableName,
          operation: 'update',
          database: this.database,
        },
        () =>
          this.database.write(async () => {
            await existing.update((record) => {
              this.assignRecordFields(record, change.data);
              this.applySyncedMetadata(record, serverTimestamp);
            });
          }),
      );

      return true;
    }

    await withDatabaseWriteTelemetry(
      {
        entity: tableName,
        operation: 'insert',
        database: this.database,
      },
      () =>
        this.database.write(async () => {
          await collection.create((record) => {
            record._raw.id = recordId;
            this.assignRecordFields(record, change.data);
            this.applySyncedMetadata(record, serverTimestamp);
            if (
              'isActive' in record &&
              typeof (record as SyncModel & { isActive?: unknown }).isActive !== 'boolean'
            ) {
              (record as SyncModel & { isActive: boolean }).isActive = true;
            }
          });
        }),
    );

    return true;
  }

  private assignRecordFields(record: SyncModel, data: Record<string, unknown>): void {
    Object.entries(data).forEach(([key, value]) => {
      if (value === undefined || key === 'id') {
        return;
      }

      Reflect.set(record, key, this.coerceValue(key, value));
    });
  }

  private applySyncedMetadata(record: SyncModel, timestamp: Date): void {
    record.syncState = 'synced';
    record.updatedAt = timestamp;

    if ('lastSyncedAt' in record) {
      (record as SyncModel & { lastSyncedAt: Date | null }).lastSyncedAt = timestamp;
    }
  }

  private coerceValue(key: string, value: unknown): unknown {
    if (typeof value === 'string' && DATE_FIELD_PATTERN.test(key)) {
      const parsed = this.parseDate(value);
      if (parsed) {
        return parsed;
      }
    }

    return value;
  }

  private parseDate(value: unknown): Date | null {
    if (!value) {
      return null;
    }

    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }

    if (typeof value === 'string' || typeof value === 'number') {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    return null;
  }

  private getLatestLocalTimestamp(changes?: SyncQueueChange[]): Date | null {
    if (!changes?.length) {
      return null;
    }

    let latest: Date | null = null;
    changes.forEach((change) => {
      const payloadTimestamp = this.parseDate(change.payload?.updatedAt ?? null);
      const candidate = payloadTimestamp ?? change.createdAt;
      if (!latest || candidate.getTime() > latest.getTime()) {
        latest = candidate;
      }
    });

    return latest;
  }

  private async removeQueueEntries(ids: string[]): Promise<void> {
    if (!ids.length) {
      return;
    }

    const collection = this.database.get<SyncQueueEntry>(SYNC_QUEUE_TABLE);
    await withDatabaseWriteTelemetry(
      {
        entity: SYNC_QUEUE_TABLE,
        operation: 'bulk',
        database: this.database,
        rowsAffected: ids.length,
      },
      () =>
        this.database.write(async () => {
          for (const id of ids) {
            try {
              const entry = await collection.find(id);
              await entry.destroyPermanently();
            } catch {
              // Entry already removed; ignore.
            }
          }
        }),
    );
  }

  private logConflict(conflict: SyncConflict): void {
    const metadata = {
      entity: conflict.entity,
      recordId: conflict.recordId,
      serverTimestamp: conflict.serverTimestamp.toISOString(),
      localTimestamp: conflict.localTimestamp?.toISOString() ?? null,
      resolution: conflict.resolution,
      specification: 'project-documentation/architecture-output.md#Sync Conflict Resolution',
    };
    this.logger.warn('Sync conflict resolved via last-write-wins; logged to sync_log.', metadata);
  }

  private resolveRecordId(data: Record<string, unknown>): string | null {
    const rawId = data.id;
    return typeof rawId === 'string' ? rawId : null;
  }

  private getEntityForTable(table: string): SyncEntity | null {
    return (TABLE_TO_ENTITY as Record<string, SyncEntity | undefined>)[table] ?? null;
  }
}
