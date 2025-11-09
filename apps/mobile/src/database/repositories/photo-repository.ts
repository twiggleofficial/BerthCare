import { Q } from '@nozbe/watermelondb';
import type { TableName } from '@nozbe/watermelondb/Schema';

import type { Photo } from '../models/photo';
import type { SyncStatus } from '../types';
import { BaseRepository, type RepositoryDependencies } from './base-repository';

export type CreatePhotoInput = {
  visitId: string;
  s3Key: string;
  fileName?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
  uploadedAt?: Date;
  isActive?: boolean;
  syncState?: SyncStatus;
};

export type UpdatePhotoInput = Partial<CreatePhotoInput>;

const PHOTOS_TABLE = 'photos' as TableName<Photo>;

export class PhotoRepository extends BaseRepository<Photo> {
  private static readonly DEFAULT_RECENT_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

  constructor(deps: RepositoryDependencies) {
    super(PHOTOS_TABLE, deps);
  }

  async create(input: CreatePhotoInput): Promise<Photo> {
    const timestamp = this.now();
    const photo = await this.writeWithTelemetry('insert', async () =>
      this.collection.create((record) => {
        record.visitId = input.visitId;
        record.s3Key = input.s3Key;
        record.fileName = input.fileName ?? null;
        record.fileSize = input.fileSize ?? null;
        record.mimeType = input.mimeType ?? null;
        record.uploadedAt = input.uploadedAt ?? timestamp;
        record.isActive = input.isActive ?? true;
        record.createdAt = timestamp;
        this.applySyncState(record, input.syncState ?? 'pending', timestamp);
      }),
    );

    await this.queueChange({
      recordId: photo.id,
      operation: 'create',
      payload: this.toPayload(photo),
    });

    return photo;
  }

  async update(id: string, patch: UpdatePhotoInput): Promise<Photo> {
    const timestamp = this.now();
    const photo = await this.writeWithTelemetry('update', async () => {
      const record = await this.collection.find(id);
      await record.update((entity) => {
        if (patch.visitId !== undefined) entity.visitId = patch.visitId;
        if (patch.s3Key !== undefined) entity.s3Key = patch.s3Key;
        if (patch.fileName !== undefined) entity.fileName = patch.fileName ?? null;
        if (patch.fileSize !== undefined) entity.fileSize = patch.fileSize ?? null;
        if (patch.mimeType !== undefined) entity.mimeType = patch.mimeType ?? null;
        if (patch.uploadedAt !== undefined) entity.uploadedAt = patch.uploadedAt ?? timestamp;
        if (patch.isActive !== undefined) entity.isActive = patch.isActive;

        this.applySyncState(entity, patch.syncState ?? 'pending', timestamp);
      });

      return record;
    });

    await this.queueChange({
      recordId: photo.id,
      operation: 'update',
      payload: this.toPayload(photo),
    });

    return photo;
  }

  async delete(id: string): Promise<void> {
    const timestamp = this.now();
    const photo = await this.writeWithTelemetry('delete', async () => {
      const record = await this.collection.find(id);
      await record.update((entity) => {
        entity.isActive = false;
        this.applySyncState(entity, 'pending', timestamp);
      });
      return record;
    });

    await this.queueChange({
      recordId: photo.id,
      operation: 'delete',
      payload: {
        id: photo.id,
        isActive: false,
        updatedAt: timestamp.toISOString(),
      },
    });
  }

  async getByVisit(visitId: string): Promise<Photo[]> {
    return this.collection
      .query(Q.where('visit_id', visitId), Q.where('is_active', true), Q.sortBy('uploaded_at', Q.desc))
      .fetch();
  }

  /**
   * Returns the most recently updated photos constrained to a recent window
   * (30 days by default) to avoid loading the entire photo catalog into
   * memory. Provide `options.since` to override the window when needed.
   * Consider paginating for very large datasets.
   */
  async getRecent(limit = 20, options: { since?: Date } = {}): Promise<Photo[]> {
    const bounded = Math.max(0, Math.floor(limit));
    if (bounded === 0) {
      return [];
    }

    const since =
      options.since ??
      new Date(Date.now() - PhotoRepository.DEFAULT_RECENT_WINDOW_MS);
    return this.collection
      .query(
        Q.where('is_active', true),
        Q.where('updated_at', Q.gt(since.getTime())),
        Q.sortBy('updated_at', Q.desc),
        Q.take(bounded),
      )
      .fetch();
  }

  private toPayload(photo: Photo): Record<string, unknown> {
    return {
      id: photo.id,
      visitId: photo.visitId,
      s3Key: photo.s3Key,
      fileName: photo.fileName ?? null,
      fileSize: photo.fileSize ?? null,
      mimeType: photo.mimeType ?? null,
      uploadedAt: photo.uploadedAt.toISOString(),
      isActive: photo.isActive,
      syncState: photo.syncState,
      createdAt: photo.createdAt.toISOString(),
      updatedAt: photo.updatedAt.toISOString(),
    };
  }
}
