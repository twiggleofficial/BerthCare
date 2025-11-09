import { Q } from '@nozbe/watermelondb';
import type { TableName } from '@nozbe/watermelondb/Schema';

import type { Medication } from '../models/medication';
import type { SyncStatus } from '../types';
import { BaseRepository, type RepositoryDependencies } from './base-repository';

export type CreateMedicationInput = {
  clientId: string;
  name: string;
  dosage?: string | null;
  frequency?: string | null;
  instructions?: string | null;
  isActive?: boolean;
  syncState?: SyncStatus;
};

export type UpdateMedicationInput = Partial<CreateMedicationInput>;

const MEDICATIONS_TABLE = 'medications' as TableName<Medication>;

export class MedicationRepository extends BaseRepository<Medication> {
  constructor(deps: RepositoryDependencies) {
    super(MEDICATIONS_TABLE, deps);
  }

  async create(input: CreateMedicationInput): Promise<Medication> {
    const timestamp = this.now();
    const medication = await this.writeWithTelemetry('insert', async () =>
      this.collection.create((record) => {
        record.clientId = input.clientId;
        record.name = input.name;
        record.dosage = input.dosage ?? null;
        record.frequency = input.frequency ?? null;
        record.instructions = input.instructions ?? null;
        record.isActive = input.isActive ?? true;
        record.createdAt = timestamp;
        this.applySyncState(record, input.syncState ?? 'pending', timestamp);
      }),
    );

    await this.queueChange({
      recordId: medication.id,
      operation: 'create',
      payload: this.toPayload(medication),
    });

    return medication;
  }

  async update(id: string, patch: UpdateMedicationInput): Promise<Medication> {
    const timestamp = this.now();
    const medication = await this.writeWithTelemetry('update', async () => {
      const record = await this.collection.find(id);
      await record.update((entity) => {
        if (patch.clientId !== undefined) entity.clientId = patch.clientId;
        if (patch.name !== undefined) entity.name = patch.name;
        if (patch.dosage !== undefined) entity.dosage = patch.dosage ?? null;
        if (patch.frequency !== undefined) entity.frequency = patch.frequency ?? null;
        if (patch.instructions !== undefined) entity.instructions = patch.instructions ?? null;
        if (patch.isActive !== undefined) entity.isActive = patch.isActive;

        this.applySyncState(entity, patch.syncState ?? 'pending', timestamp);
      });

      return record;
    });

    await this.queueChange({
      recordId: medication.id,
      operation: 'update',
      payload: this.toPayload(medication),
    });

    return medication;
  }

  async delete(id: string): Promise<void> {
    const timestamp = this.now();
    const medication = await this.writeWithTelemetry('delete', async () => {
      const record = await this.collection.find(id);
      await record.update((entity) => {
        entity.isActive = false;
        this.applySyncState(entity, 'pending', timestamp);
      });
      return record;
    });

    await this.queueChange({
      recordId: medication.id,
      operation: 'delete',
      payload: {
        id: medication.id,
        isActive: false,
        updatedAt: timestamp.toISOString(),
      },
    });
  }

  async getByClient(clientId: string): Promise<Medication[]> {
    return this.collection
      .query(Q.where('client_id', clientId), Q.where('is_active', true), Q.sortBy('name', Q.asc))
      .fetch();
  }

  getRecent(limit = 20): Promise<Medication[]> {
    const bounded = Math.max(0, Math.floor(limit));
    if (bounded === 0) {
      return Promise.resolve([]);
    }

    return this.collection
      .query(Q.where('is_active', true), Q.sortBy('updated_at', Q.desc), Q.take(bounded))
      .fetch();
  }

  private toPayload(medication: Medication): Record<string, unknown> {
    return {
      id: medication.id,
      clientId: medication.clientId,
      name: medication.name,
      dosage: medication.dosage ?? null,
      frequency: medication.frequency ?? null,
      instructions: medication.instructions ?? null,
      isActive: medication.isActive,
      syncState: medication.syncState,
      createdAt: medication.createdAt.toISOString(),
      updatedAt: medication.updatedAt.toISOString(),
    };
  }
}
