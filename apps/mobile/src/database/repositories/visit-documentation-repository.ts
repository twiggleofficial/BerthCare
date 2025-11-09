import { Q } from '@nozbe/watermelondb';
import type { TableName } from '@nozbe/watermelondb/Schema';

import type { VisitDocumentation } from '../models/visit-documentation';
import type { SyncStatus, VisitActivities, VitalSigns } from '../types';
import { BaseRepository, type RepositoryDependencies } from './base-repository';

export type CreateVisitDocumentationInput = {
  visitId: string;
  vitalSigns?: Partial<VitalSigns>;
  activities?: Partial<VisitActivities>;
  observations?: string | null;
  concerns?: string | null;
  signatureUrl?: string | null;
  isActive?: boolean;
  syncState?: SyncStatus;
};

export type UpdateVisitDocumentationInput = Partial<CreateVisitDocumentationInput>;

const VISIT_DOCS_TABLE = 'visit_documentation' as TableName<VisitDocumentation>;

const defaultActivities: VisitActivities = {
  personalCare: false,
  medication: false,
  mealPreparation: false,
  mobility: false,
};

export class VisitDocumentationRepository extends BaseRepository<VisitDocumentation> {
  constructor(deps: RepositoryDependencies) {
    super(VISIT_DOCS_TABLE, deps);
  }

  async create(input: CreateVisitDocumentationInput): Promise<VisitDocumentation> {
    const timestamp = this.now();
    const documentation = await this.writeWithTelemetry('insert', async () =>
      this.collection.create((record) => {
        record.visitId = input.visitId;
        record.vitalSigns = { ...(input.vitalSigns ?? {}) };
        record.activities = { ...defaultActivities, ...(input.activities ?? {}) };
        record.observations = input.observations ?? null;
        record.concerns = input.concerns ?? null;
        record.signatureUrl = input.signatureUrl ?? null;
        record.isActive = input.isActive ?? true;
        record.createdAt = timestamp;
        this.applySyncState(record, input.syncState ?? 'pending', timestamp);
      }),
    );

    await this.queueChange({
      recordId: documentation.id,
      operation: 'create',
      payload: this.toPayload(documentation),
    });

    return documentation;
  }

  async update(id: string, patch: UpdateVisitDocumentationInput): Promise<VisitDocumentation> {
    const timestamp = this.now();
    const documentation = await this.writeWithTelemetry('update', async () => {
      const record = await this.collection.find(id);
      await record.update((entity) => {
        if (patch.vitalSigns) {
          entity.vitalSigns = {
            ...entity.vitalSigns,
            ...Object.fromEntries(Object.entries(patch.vitalSigns).filter(([, value]) => value !== undefined)),
          };
        }

        if (patch.activities) {
          entity.activities = {
            ...entity.activities,
            ...Object.fromEntries(Object.entries(patch.activities).filter(([, value]) => value !== undefined)),
          } as VisitActivities;
        }

        if (patch.observations !== undefined) {
          entity.observations = patch.observations ?? null;
        }

        if (patch.concerns !== undefined) {
          entity.concerns = patch.concerns ?? null;
        }

        if (patch.signatureUrl !== undefined) {
          entity.signatureUrl = patch.signatureUrl ?? null;
        }

        if (patch.isActive !== undefined) {
          entity.isActive = patch.isActive;
        }

        this.applySyncState(entity, patch.syncState ?? 'pending', timestamp);
      });

      return record;
    });

    await this.queueChange({
      recordId: documentation.id,
      operation: 'update',
      payload: this.toPayload(documentation),
    });

    return documentation;
  }

  async delete(id: string): Promise<void> {
    const timestamp = this.now();
    const documentation = await this.writeWithTelemetry('delete', async () => {
      const record = await this.collection.find(id);
      await record.update((entity) => {
        entity.isActive = false;
        this.applySyncState(entity, 'pending', timestamp);
      });
      return record;
    });

    await this.queueChange({
      recordId: documentation.id,
      operation: 'delete',
      payload: {
        id: documentation.id,
        isActive: false,
        updatedAt: timestamp.toISOString(),
      },
    });
  }

  async getByVisit(visitId: string): Promise<VisitDocumentation[]> {
    return this.collection
      .query(Q.where('visit_id', visitId), Q.where('is_active', true), Q.sortBy('updated_at', Q.desc))
      .fetch();
  }

  getRecent(limit = 10): Promise<VisitDocumentation[]> {
    const bounded = Math.max(0, Math.floor(limit));
    if (bounded === 0) {
      return Promise.resolve([]);
    }

    return this.collection
      .query(Q.where('is_active', true), Q.sortBy('updated_at', Q.desc), Q.take(bounded))
      .fetch();
  }

  private toPayload(documentation: VisitDocumentation): Record<string, unknown> {
    return {
      id: documentation.id,
      visitId: documentation.visitId,
      vitalSigns: documentation.vitalSigns,
      activities: documentation.activities,
      observations: documentation.observations ?? null,
      concerns: documentation.concerns ?? null,
      signatureUrl: documentation.signatureUrl ?? null,
      isActive: documentation.isActive,
      syncState: documentation.syncState,
      createdAt: documentation.createdAt.toISOString(),
      updatedAt: documentation.updatedAt.toISOString(),
    };
  }
}
