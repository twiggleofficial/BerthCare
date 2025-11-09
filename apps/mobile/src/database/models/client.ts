import type Query from '@nozbe/watermelondb/Query';
import { children, date, field, json, writer } from '@nozbe/watermelondb/decorators';

import type { Medication } from './medication';
import { SyncableModel } from './syncable-model';
import type { Visit } from './visit';
import { sanitizeAllergies } from '../sanitizers';
import { model } from '../decorators';
import type { SyncStatus } from '../types';

type ClientProfilePatch = {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  address?: string;
  phone?: string | null;
  zoneId?: string;
  carePlanSummary?: string | null;
  allergies?: string[];
  specialInstructions?: string | null;
  location?: {
    latitude?: number | null;
    longitude?: number | null;
  };
};

/**
 * Mirrors the WatermelonDB Client model described in
 * project-documentation/architecture-output.md (Local Database Schema).
 * Offline edits mark the record as pending so sync remains invisible.
 */
@model('clients')
export class Client extends SyncableModel {
  @field('first_name') firstName!: string;
  @field('last_name') lastName!: string;
  @field('date_of_birth') dateOfBirth!: string;
  @field('address') address!: string;
  @field('latitude') latitude?: number | null;
  @field('longitude') longitude?: number | null;
  @field('phone') phone?: string | null;
  @field('zone_id') zoneId!: string;
  @field('care_plan_summary') carePlanSummary?: string | null;
  @json('allergies', sanitizeAllergies) allergies!: string[];
  @field('special_instructions') specialInstructions?: string | null;
  @field('is_active') isActive!: boolean;
  @field('sync_status') syncState!: SyncStatus;
  @date('last_synced_at') lastSyncedAt?: Date | null;
  @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  @children('visits') visits!: Query<Visit>;
  @children('medications') medications!: Query<Medication>;

  get fullName(): string {
    return [this.firstName, this.lastName].filter(Boolean).join(' ').trim();
  }

  get initials(): string {
    return `${(this.firstName[0] ?? '').toUpperCase()}${(this.lastName[0] ?? '').toUpperCase()}`.trim();
  }

  @writer
  async updateProfile(patch: ClientProfilePatch): Promise<void> {
    await this.update((record) => {
      if (patch.firstName !== undefined) record.firstName = patch.firstName;
      if (patch.lastName !== undefined) record.lastName = patch.lastName;
      if (patch.dateOfBirth !== undefined) record.dateOfBirth = patch.dateOfBirth;
      if (patch.address !== undefined) record.address = patch.address;
      if (patch.phone !== undefined) record.phone = patch.phone ?? null;
      if (patch.zoneId !== undefined) record.zoneId = patch.zoneId;
      if (patch.carePlanSummary !== undefined) record.carePlanSummary = patch.carePlanSummary ?? null;
      if (patch.allergies !== undefined) record.allergies = patch.allergies;
      if (patch.specialInstructions !== undefined) {
        record.specialInstructions = patch.specialInstructions ?? null;
      }
      if (patch.location) {
        record.latitude = patch.location.latitude ?? null;
        record.longitude = patch.location.longitude ?? null;
      }
      this.setSyncState(record, 'pending');
    });
  }

  @writer
  async setActiveState(isActive: boolean): Promise<void> {
    if (this.isActive === isActive) {
      return;
    }

    await this.update((record) => {
      record.isActive = isActive;
      this.setSyncState(record, 'pending');
    });
  }
}
