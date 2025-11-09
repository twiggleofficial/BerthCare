import type Relation from '@nozbe/watermelondb/Relation';
import { date, field, relation, writer } from '@nozbe/watermelondb/decorators';

import { SyncableModel } from './syncable-model';
import type { Client } from './client';
import { model } from '../decorators';
import type { SyncStatus } from '../types';

type MedicationDetailsPatch = {
  name?: string;
  dosage?: string | null;
  frequency?: string | null;
  instructions?: string | null;
};

/**
 * Medication metadata stored locally per project-documentation/architecture-output.md.
 * Methods wrap updates so sync state changes remain transparent.
 */
@model('medications')
export class Medication extends SyncableModel {
  @field('client_id') clientId!: string;
  @field('name') name!: string;
  @field('dosage') dosage?: string | null;
  @field('frequency') frequency?: string | null;
  @field('instructions') instructions?: string | null;
  @field('is_active') isActive!: boolean;
  @field('sync_status') syncState!: SyncStatus;
  @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  @relation('clients', 'client_id') client!: Relation<Client>;

  get label(): string {
    return [this.name, this.dosage].filter(Boolean).join(' • ');
  }

  @writer
  async updateDetails(patch: MedicationDetailsPatch): Promise<void> {
    await this.update((record) => {
      if (patch.name !== undefined) {
        if (typeof patch.name !== 'string') {
          throw new Error('Medication name must be a string');
        }
        const trimmedName = patch.name.trim();
        if (!trimmedName.length) {
          throw new Error('Medication name cannot be empty');
        }
        record.name = trimmedName;
      }
      if (patch.dosage !== undefined) {
        if (patch.dosage === null) {
          record.dosage = null;
        } else if (typeof patch.dosage === 'string') {
          const trimmedDosage = patch.dosage.trim();
          record.dosage = trimmedDosage.length ? trimmedDosage : null;
        }
      }
      if (patch.frequency !== undefined) {
        if (patch.frequency === null) {
          record.frequency = null;
        } else if (typeof patch.frequency === 'string') {
          const trimmedFrequency = patch.frequency.trim();
          record.frequency = trimmedFrequency.length ? trimmedFrequency : null;
        }
      }
      if (patch.instructions !== undefined) {
        if (patch.instructions === null) {
          record.instructions = null;
        } else if (typeof patch.instructions === 'string') {
          const trimmedInstructions = patch.instructions.trim();
          record.instructions = trimmedInstructions.length ? trimmedInstructions : null;
        }
      }
      this.setSyncState(record, 'pending');
    });
  }

  @writer
  async deactivate(): Promise<void> {
    if (!this.isActive) {
      return;
    }

    await this.update((record) => {
      record.isActive = false;
      this.setSyncState(record, 'pending');
    });
  }
}
