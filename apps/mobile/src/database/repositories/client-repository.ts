import { Q } from '@nozbe/watermelondb';
import type { TableName } from '@nozbe/watermelondb/Schema';

import type { Client } from '../models/client';
import type { SyncStatus } from '../types';
import { BaseRepository, type RepositoryDependencies } from './base-repository';

export type ClientLocationInput = {
  latitude?: number | null;
  longitude?: number | null;
};

export type CreateClientInput = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  address: string;
  zoneId: string;
  phone?: string | null;
  carePlanSummary?: string | null;
  allergies?: string[];
  specialInstructions?: string | null;
  location?: ClientLocationInput;
  isActive?: boolean;
  syncState?: SyncStatus;
  lastSyncedAt?: Date | null;
};

export type UpdateClientInput = Partial<CreateClientInput>;

const CLIENTS_TABLE = 'clients' as TableName<Client>;

export class ClientRepository extends BaseRepository<Client> {
  constructor(deps: RepositoryDependencies) {
    super(CLIENTS_TABLE, deps);
  }

  async create(input: CreateClientInput): Promise<Client> {
    const timestamp = this.now();
    const client = await this.writeWithTelemetry('insert', async () =>
      this.collection.create((record) => {
        record.firstName = input.firstName;
        record.lastName = input.lastName;
        record.dateOfBirth = input.dateOfBirth;
        record.address = input.address;
        record.zoneId = input.zoneId;
        record.phone = input.phone ?? null;
        record.carePlanSummary = input.carePlanSummary ?? null;
        record.allergies = input.allergies ?? [];
        record.specialInstructions = input.specialInstructions ?? null;
        record.latitude = input.location?.latitude ?? null;
        record.longitude = input.location?.longitude ?? null;
        record.isActive = input.isActive ?? true;
        record.createdAt = timestamp;
        record.lastSyncedAt = input.lastSyncedAt ?? null;
        this.applySyncState(record, input.syncState ?? 'pending', timestamp);
      }),
    );

    await this.queueChange({
      recordId: client.id,
      operation: 'create',
      payload: this.toPayload(client),
    });

    return client;
  }

  async update(id: string, patch: UpdateClientInput): Promise<Client> {
    const timestamp = this.now();
    const client = await this.writeWithTelemetry('update', async () => {
      const record = await this.collection.find(id);
      await record.update((entity) => {
        if (patch.firstName !== undefined) entity.firstName = patch.firstName;
        if (patch.lastName !== undefined) entity.lastName = patch.lastName;
        if (patch.dateOfBirth !== undefined) entity.dateOfBirth = patch.dateOfBirth;
        if (patch.address !== undefined) entity.address = patch.address;
        if (patch.zoneId !== undefined) entity.zoneId = patch.zoneId;
        if (patch.phone !== undefined) entity.phone = patch.phone ?? null;
        if (patch.carePlanSummary !== undefined) entity.carePlanSummary = patch.carePlanSummary ?? null;
        if (patch.allergies !== undefined) entity.allergies = patch.allergies;
        if (patch.specialInstructions !== undefined) {
          entity.specialInstructions = patch.specialInstructions ?? null;
        }
        if (patch.location) {
          entity.latitude = patch.location.latitude ?? null;
          entity.longitude = patch.location.longitude ?? null;
        }
        if (patch.isActive !== undefined) {
          entity.isActive = patch.isActive;
        }

        this.applySyncState(entity, patch.syncState ?? 'pending', timestamp);
      });
      return record;
    });

    await this.queueChange({
      recordId: client.id,
      operation: 'update',
      payload: this.toPayload(client),
    });

    return client;
  }

  async delete(id: string): Promise<void> {
    const timestamp = this.now();
    const client = await this.writeWithTelemetry('delete', async () => {
      const record = await this.collection.find(id);
      await record.update((entity) => {
        entity.isActive = false;
        this.applySyncState(entity, 'pending', timestamp);
      });
      return record;
    });

    await this.queueChange({
      recordId: client.id,
      operation: 'delete',
      payload: {
        id: client.id,
        isActive: false,
        updatedAt: timestamp.toISOString(),
      },
    });
  }

  async getByZone(zoneId: string): Promise<Client[]> {
    return this.collection
      .query(Q.where('zone_id', zoneId), Q.where('is_active', true), Q.sortBy('last_name', Q.asc))
      .fetch();
  }

  getRecent(limit = 10): Promise<Client[]> {
    const bounded = Math.max(0, Math.floor(limit));
    if (bounded === 0) {
      return Promise.resolve([]);
    }

    return this.collection
      .query(Q.where('is_active', true), Q.sortBy('updated_at', Q.desc), Q.take(bounded))
      .fetch();
  }

  async getInactive(): Promise<Client[]> {
    return this.collection.query(Q.where('is_active', false)).fetch();
  }

  async getPendingSync(): Promise<Client[]> {
    return this.collection.query(Q.where('sync_state', 'pending')).fetch();
  }

  private toPayload(client: Client): Record<string, unknown> {
    return {
      id: client.id,
      firstName: client.firstName,
      lastName: client.lastName,
      dateOfBirth: client.dateOfBirth,
      address: client.address,
      zoneId: client.zoneId,
      phone: client.phone ?? null,
      carePlanSummary: client.carePlanSummary ?? null,
      allergies: client.allergies,
      specialInstructions: client.specialInstructions ?? null,
      latitude: client.latitude ?? null,
      longitude: client.longitude ?? null,
      isActive: client.isActive,
      syncState: client.syncState,
      lastSyncedAt: client.lastSyncedAt ? client.lastSyncedAt.toISOString() : null,
      createdAt: client.createdAt.toISOString(),
      updatedAt: client.updatedAt.toISOString(),
    };
  }
}
