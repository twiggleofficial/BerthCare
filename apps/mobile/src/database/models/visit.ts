import type Query from '@nozbe/watermelondb/Query';
import type Relation from '@nozbe/watermelondb/Relation';
import { children, date, field, relation, writer } from '@nozbe/watermelondb/decorators';

import type { Client } from './client';
import type { Photo } from './photo';
import { SyncableModel } from './syncable-model';
import type { VisitDocumentation } from './visit-documentation';
import { model } from '../decorators';
import { createLogger } from '../../services/logger';
import type { SyncStatus, VisitStatus } from '../types';

type VisitCheckInUpdate = {
  timestamp?: Date;
  latitude?: number | null;
  longitude?: number | null;
};

type VisitCheckOutUpdate = {
  timestamp?: Date;
  latitude?: number | null;
  longitude?: number | null;
  durationMinutes?: number | null;
};

/**
 * Visit model implementation based on project-documentation/architecture-output.md.
 * Methods encapsulate check-in/out flows so sync state tracking stays consistent.
 */
@model('visits')
export class Visit extends SyncableModel {
  private static readonly logger = createLogger('visit-model');
  @field('client_id') clientId!: string;
  @field('staff_id') staffId?: string | null;
  @date('scheduled_start_time') scheduledStartTime!: Date;
  @date('check_in_time') checkInTime?: Date | null;
  @field('check_in_latitude') checkInLatitude?: number | null;
  @field('check_in_longitude') checkInLongitude?: number | null;
  @date('check_out_time') checkOutTime?: Date | null;
  @field('check_out_latitude') checkOutLatitude?: number | null;
  @field('check_out_longitude') checkOutLongitude?: number | null;
  @field('duration_minutes') durationMinutes?: number | null;
  @field('status') status!: VisitStatus;
  @field('copied_from_visit_id') copiedFromVisitId?: string | null;
  @field('is_active') isActive!: boolean;
  @field('local_id') localId!: string; // Client-generated ID for optimistic inserts; WatermelonDB id stays internal
  @field('sync_status') syncState!: SyncStatus;
  @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  @relation('clients', 'client_id') client!: Relation<Client>;
  @children('visit_documentation') documentation!: Query<VisitDocumentation>;
  @children('photos') photos!: Query<Photo>;

  get isInProgress(): boolean {
    return this.status === 'in_progress';
  }

  get isCompleted(): boolean {
    return this.status === 'completed';
  }

  get isReadyForCheckout(): boolean {
    return this.isInProgress && !!this.checkInTime;
  }

  @writer
  async recordCheckIn(update: VisitCheckInUpdate): Promise<void> {
    await this.update((record) => {
      const nextTimestamp = update.timestamp ?? record.checkInTime ?? new Date();
      record.checkInTime = nextTimestamp;
      if (update.latitude !== undefined) {
        record.checkInLatitude = update.latitude;
      }
      if (update.longitude !== undefined) {
        record.checkInLongitude = update.longitude;
      }
      record.status = 'in_progress';
      this.setSyncState(record, 'pending');
    });
  }

  @writer
  async recordCheckOut(update: VisitCheckOutUpdate = {}): Promise<void> {
    await this.update((record) => {
      const timestamp = update.timestamp ?? record.checkOutTime ?? new Date();
      record.checkOutTime = timestamp;
      if (update.latitude !== undefined) {
        record.checkOutLatitude = update.latitude;
      }
      if (update.longitude !== undefined) {
        record.checkOutLongitude = update.longitude;
      }
      let nextStatus: VisitStatus = 'completed';
      let computedDuration: number | null = null;

      if (update.durationMinutes !== undefined) {
        const providedDuration = update.durationMinutes ?? null;
        if (providedDuration !== null && providedDuration <= 0) {
          Visit.logger.warn('Non-positive duration provided; marking as invalid', {
            visitId: record.id,
            durationMinutes: providedDuration,
          });
          computedDuration = null;
          nextStatus = 'invalid_timing';
        } else {
          computedDuration = providedDuration;
        }
      } else if (record.checkInTime) {
        const diffMinutes = Math.floor((timestamp.getTime() - record.checkInTime.getTime()) / 60000);
        if (diffMinutes <= 0) {
          Visit.logger.warn('Checkout timestamp precedes check-in; marking as invalid', {
            visitId: record.id,
            checkIn: record.checkInTime.toISOString(),
            checkOut: timestamp.toISOString(),
          });
          computedDuration = null;
          nextStatus = 'invalid_timing';
        } else {
          computedDuration = diffMinutes;
        }
      } else {
        Visit.logger.warn('Checkout attempted without check-in', {
          visitId: record.id,
          checkOut: timestamp.toISOString(),
        });
        nextStatus = 'invalid_timing';
      }

      record.durationMinutes = computedDuration ?? null;
      record.status = nextStatus;
      this.setSyncState(record, 'pending');
    });
  }

  @writer
  async applyStatus(status: VisitStatus): Promise<void> {
    if (this.status === status) {
      return;
    }

    await this.update((record) => {
      record.status = status;
      this.setSyncState(record, 'pending');
    });
  }
}
