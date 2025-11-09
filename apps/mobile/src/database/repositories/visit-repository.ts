import { Q } from '@nozbe/watermelondb';
import type { TableName } from '@nozbe/watermelondb/Schema';

import type { Client } from '../models/client';
import type { Visit } from '../models/visit';
import type { SyncStatus, VisitStatus } from '../types';
import { BaseRepository, type RepositoryDependencies } from './base-repository';

export type LatLngInput = {
  latitude?: number | null;
  longitude?: number | null;
};

export type CreateVisitInput = {
  clientId: string;
  staffId?: string | null;
  scheduledStartTime: Date;
  status?: VisitStatus;
  localId: string;
  checkInTime?: Date | null;
  checkInLocation?: LatLngInput;
  checkOutTime?: Date | null;
  checkOutLocation?: LatLngInput;
  durationMinutes?: number | null;
  copiedFromVisitId?: string | null;
  isActive?: boolean;
  syncState?: SyncStatus;
};

export type UpdateVisitInput = Partial<Omit<CreateVisitInput, 'clientId' | 'localId'>> & {
  clientId?: string;
};

const VISITS_TABLE = 'visits' as TableName<Visit>;

export class VisitRepository extends BaseRepository<Visit> {
  constructor(deps: RepositoryDependencies) {
    super(VISITS_TABLE, deps);
  }

  private static readonly DEFAULT_RECENT_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
  static readonly DEFAULT_RECENT_LIMIT = 15;
  static readonly MAX_RECENT_LIMIT = 50;

  async create(input: CreateVisitInput): Promise<Visit> {
    const timestamp = this.now();
    const visit = await this.writeWithTelemetry('insert', async () =>
      this.collection.create((record) => {
        record.clientId = input.clientId;
        record.staffId = input.staffId ?? null;
        record.scheduledStartTime = input.scheduledStartTime;
        record.checkInTime = input.checkInTime ?? null;
        record.checkInLatitude = input.checkInLocation?.latitude ?? null;
        record.checkInLongitude = input.checkInLocation?.longitude ?? null;
        record.checkOutTime = input.checkOutTime ?? null;
        record.checkOutLatitude = input.checkOutLocation?.latitude ?? null;
        record.checkOutLongitude = input.checkOutLocation?.longitude ?? null;
        record.durationMinutes = input.durationMinutes ?? null;
        record.status = input.status ?? 'scheduled';
        record.copiedFromVisitId = input.copiedFromVisitId ?? null;
        record.isActive = input.isActive ?? true;
        record.localId = input.localId;
        record.createdAt = timestamp;
        this.applySyncState(record, input.syncState ?? 'pending', timestamp);
      }),
    );

    await this.queueChange({
      recordId: visit.id,
      operation: 'create',
      payload: this.toPayload(visit),
    });

    return visit;
  }

  async update(id: string, patch: UpdateVisitInput): Promise<Visit> {
    const timestamp = this.now();
    const visit = await this.writeWithTelemetry('update', async () => {
      const record = await this.collection.find(id);
      await record.update((entity) => {
        if (patch.clientId !== undefined) entity.clientId = patch.clientId;
        if (patch.staffId !== undefined) entity.staffId = patch.staffId ?? null;
        if (patch.scheduledStartTime !== undefined) {
          entity.scheduledStartTime = patch.scheduledStartTime;
        }
        if (patch.checkInTime !== undefined) entity.checkInTime = patch.checkInTime ?? null;
        if (patch.checkInLocation) {
          entity.checkInLatitude = patch.checkInLocation.latitude ?? null;
          entity.checkInLongitude = patch.checkInLocation.longitude ?? null;
        }
        if (patch.checkOutTime !== undefined) entity.checkOutTime = patch.checkOutTime ?? null;
        if (patch.checkOutLocation) {
          entity.checkOutLatitude = patch.checkOutLocation.latitude ?? null;
          entity.checkOutLongitude = patch.checkOutLocation.longitude ?? null;
        }
        if (patch.durationMinutes !== undefined) {
          entity.durationMinutes = patch.durationMinutes ?? null;
        }
        if (patch.status !== undefined) {
          entity.status = patch.status;
        }
        if (patch.copiedFromVisitId !== undefined) {
          entity.copiedFromVisitId = patch.copiedFromVisitId ?? null;
        }
        if (patch.isActive !== undefined) {
          entity.isActive = patch.isActive;
        }

        this.applySyncState(entity, patch.syncState ?? 'pending', timestamp);
      });
      return record;
    });

    await this.queueChange({
      recordId: visit.id,
      operation: 'update',
      payload: this.toPayload(visit),
    });

    return visit;
  }

  async updateStatus(id: string, status: VisitStatus): Promise<Visit> {
    return this.update(id, { status });
  }

  async delete(id: string): Promise<void> {
    const timestamp = this.now();
    const visit = await this.writeWithTelemetry('delete', async () => {
      const record = await this.collection.find(id);
      await record.update((entity) => {
        entity.isActive = false;
        this.applySyncState(entity, 'pending', timestamp);
      });
      return record;
    });

    await this.queueChange({
      recordId: visit.id,
      operation: 'delete',
      payload: {
        id: visit.id,
        isActive: false,
        updatedAt: timestamp.toISOString(),
      },
    });
  }

  async getByStatus(status: VisitStatus): Promise<Visit[]> {
    return this.collection
      .query(Q.where('status', status), Q.where('is_active', true), Q.sortBy('scheduled_start_time', Q.asc))
      .fetch();
  }

  /**
   * Returns the most recently updated visits within a bounded time window.
   * By default only visits updated in the last 30 days are queried so large
   * datasets do not require a full table scan. Callers can override the
   * window via `options.since` when they need a different range.
   */
  async getRecent(
    limit = VisitRepository.DEFAULT_RECENT_LIMIT,
    options: { since?: Date } = {},
  ): Promise<Visit[]> {
    const boundedLimit = this.normalizeRecentLimit(limit);
    const since =
      options.since ??
      new Date(Date.now() - VisitRepository.DEFAULT_RECENT_WINDOW_MS);
    return this.collection
      .query(
        Q.where('is_active', true),
        Q.where('updated_at', Q.gt(since.getTime())),
        Q.sortBy('updated_at', Q.desc),
        Q.take(boundedLimit),
      )
      .fetch();
  }

  async getByZone(zoneId: string): Promise<Visit[]> {
    const clientCollection = this.database.get<Client>('clients');
    const clientsInZone = await clientCollection
      .query(Q.where('zone_id', zoneId), Q.where('is_active', true))
      .fetch();

    if (!clientsInZone.length) {
      return [];
    }

    const clientIds = clientsInZone.map((client) => client.id);

    return this.collection
      .query(
        Q.where('client_id', Q.oneOf(clientIds)),
        Q.where('is_active', true),
        Q.sortBy('scheduled_start_time', Q.asc),
      )
      .fetch();
  }

  async getByClient(clientId: string): Promise<Visit[]> {
    return this.collection
      .query(Q.where('client_id', clientId), Q.where('is_active', true), Q.sortBy('scheduled_start_time', Q.asc))
      .fetch();
  }

  async getPendingSync(): Promise<Visit[]> {
    return this.collection.query(Q.where('sync_state', 'pending')).fetch();
  }

  private normalizeRecentLimit(limitInput: number): number {
    if (!Number.isFinite(limitInput)) {
      return VisitRepository.DEFAULT_RECENT_LIMIT;
    }

    const floored = Math.floor(limitInput);
    if (floored <= 0) {
      return VisitRepository.DEFAULT_RECENT_LIMIT;
    }

    return Math.min(floored, VisitRepository.MAX_RECENT_LIMIT);
  }

  private toPayload(visit: Visit): Record<string, unknown> {
    return {
      id: visit.id,
      clientId: visit.clientId,
      staffId: visit.staffId ?? null,
      scheduledStartTime: visit.scheduledStartTime.toISOString(),
      checkInTime: visit.checkInTime?.toISOString() ?? null,
      checkInLatitude: visit.checkInLatitude ?? null,
      checkInLongitude: visit.checkInLongitude ?? null,
      checkOutTime: visit.checkOutTime?.toISOString() ?? null,
      checkOutLatitude: visit.checkOutLatitude ?? null,
      checkOutLongitude: visit.checkOutLongitude ?? null,
      durationMinutes: visit.durationMinutes ?? null,
      status: visit.status,
      copiedFromVisitId: visit.copiedFromVisitId ?? null,
      isActive: visit.isActive,
      localId: visit.localId,
      syncState: visit.syncState,
      createdAt: visit.createdAt.toISOString(),
      updatedAt: visit.updatedAt.toISOString(),
    };
  }
}
