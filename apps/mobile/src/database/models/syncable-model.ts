import { Model } from '@nozbe/watermelondb';
import { writer } from '@nozbe/watermelondb/decorators';

import type { SyncStatus } from '../types';

type SyncableWithLastSyncedAt = {
  lastSyncedAt?: Date | null;
};

/**
 * Base class that centralizes sync lifecycle helpers so model methods
 * automatically keep `sync_status` and timestamps in step with the
 * architecture spec (project-documentation/architecture-output.md).
 */
export abstract class SyncableModel extends Model {
  declare syncState: SyncStatus;
  declare createdAt: Date;
  declare updatedAt: Date;

  protected setSyncState(record: this, status: SyncStatus, timestamp = new Date()): void {
    record.syncState = status;
    record.updatedAt = timestamp;
  }

  protected setSyncedAtIfAvailable(record: this, timestamp: Date): void {
    if ('lastSyncedAt' in record) {
      (record as this & SyncableWithLastSyncedAt).lastSyncedAt = timestamp;
    }
  }

  @writer
  async markSynced(timestamp = new Date()): Promise<void> {
    await this.update((record) => {
      this.setSyncState(record, 'synced', timestamp);
      this.setSyncedAtIfAvailable(record, timestamp);
    });
  }

  @writer
  async markPending(): Promise<void> {
    await this.update((record) => {
      this.setSyncState(record, 'pending');
    });
  }

  @writer
  async markConflict(): Promise<void> {
    await this.update((record) => {
      this.setSyncState(record, 'conflict');
    });
  }
}
