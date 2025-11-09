import type Relation from '@nozbe/watermelondb/Relation';
import { date, field, json, relation, writer } from '@nozbe/watermelondb/decorators';

import { SyncableModel } from './syncable-model';
import type { Visit } from './visit';
import { sanitizeActivities, sanitizeVitalSigns } from '../sanitizers';
import { model } from '../decorators';
import type { SyncStatus, VisitActivities, VitalSigns } from '../types';

const mergeDefinedFields = <T>(target: T, source: Partial<T>): T => ({
  ...target,
  ...Object.fromEntries(
    Object.entries(source).filter(([, value]) => value !== undefined),
  ),
});

type VisitDocumentationPatch = {
  vitalSigns?: Partial<VitalSigns>;
  activities?: Partial<VisitActivities>;
  observations?: string | null;
  concerns?: string | null;
  signatureUrl?: string | null;
};

/**
 * Aligns with the WatermelonDB VisitDocumentation model defined in
 * project-documentation/architecture-output.md for offline sync parity.
 */
@model('visit_documentation')
export class VisitDocumentation extends SyncableModel {
  @field('visit_id') visitId!: string;
  @json('vital_signs', sanitizeVitalSigns) vitalSigns!: VitalSigns;
  @json('activities', sanitizeActivities) activities!: VisitActivities;
  @field('observations') observations?: string | null;
  @field('concerns') concerns?: string | null;
  @field('signature_url') signatureUrl?: string | null;
  @field('is_active') isActive!: boolean;
  @field('sync_status') syncState!: SyncStatus;
  @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  @relation('visits', 'visit_id') visit!: Relation<Visit>;

  get hasSignature(): boolean {
    return Boolean(this.signatureUrl);
  }

  @writer
  async updateDocumentation(patch: VisitDocumentationPatch): Promise<void> {
    await this.update((record) => {
      if (patch.vitalSigns) {
        record.vitalSigns = mergeDefinedFields(record.vitalSigns, patch.vitalSigns);
      }

      if (patch.activities) {
        record.activities = mergeDefinedFields(
          record.activities,
          patch.activities,
        );
      }

      if (patch.observations !== undefined) {
        record.observations = patch.observations ?? null;
      }

      if (patch.concerns !== undefined) {
        record.concerns = patch.concerns ?? null;
      }

      if (patch.signatureUrl !== undefined) {
        record.signatureUrl = patch.signatureUrl ?? null;
      }

      this.setSyncState(record, 'pending');
    });
  }
}
