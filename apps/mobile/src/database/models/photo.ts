import type Relation from '@nozbe/watermelondb/Relation';
import { date, field, relation, writer } from '@nozbe/watermelondb/decorators';

import { SyncableModel } from './syncable-model';
import type { Visit } from './visit';
import { model } from '../decorators';
import type { SyncStatus } from '../types';

type PhotoMetadataPatch = {
  s3Key?: string;
  fileName?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
  uploadedAt?: Date;
};

/**
 * Photo metadata captured per visit (see architecture-output.md WatermelonDB models).
 * Methods keep media uploads and sync timestamps tightly coupled.
 */
@model('photos')
export class Photo extends SyncableModel {
  @field('visit_id') visitId!: string;
  @field('s3_key') s3Key!: string;
  @field('file_name') fileName?: string | null;
  @field('file_size') fileSize?: number | null;
  @field('mime_type') mimeType?: string | null;
  @date('uploaded_at') uploadedAt!: Date;
  @field('is_active') isActive!: boolean;
  @field('sync_status') syncState!: SyncStatus;
  @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  @relation('visits', 'visit_id') visit!: Relation<Visit>;

  @writer
  async updateMetadata(patch: PhotoMetadataPatch): Promise<void> {
    await this.update((record) => {
      if (patch.s3Key !== undefined) record.s3Key = patch.s3Key;
      if (patch.fileName !== undefined) record.fileName = patch.fileName ?? null;
      if (patch.fileSize !== undefined) record.fileSize = patch.fileSize ?? null;
      if (patch.mimeType !== undefined) record.mimeType = patch.mimeType ?? null;
      if (patch.uploadedAt !== undefined) record.uploadedAt = patch.uploadedAt ?? null;
      this.setSyncState(record, 'pending');
    });
  }

  @writer
  async markUploaded(s3Key: string, uploadedAt = new Date()): Promise<void> {
    await this.update((record) => {
      record.s3Key = s3Key;
      record.uploadedAt = uploadedAt;
      this.setSyncState(record, 'pending');
    });
  }
}
