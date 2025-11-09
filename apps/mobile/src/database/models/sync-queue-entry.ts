import { Model } from '@nozbe/watermelondb';
import { date, field, json } from '@nozbe/watermelondb/decorators';

import { model } from '../decorators';
import { sanitizeQueuePayload } from '../sanitizers';
import type { SyncQueueOperation } from '../types';

/**
 * Persists pending sync operations so they survive app restarts and recover
 * automatically when connectivity returns.
 */
@model('sync_queue')
export class SyncQueueEntry extends Model {
  @field('table_name') tableName!: string;
  @field('record_id') recordId!: string;
  @field('operation') operation!: SyncQueueOperation;
  @field('priority') priority!: number;
  @json('payload', sanitizeQueuePayload) payload!: Record<string, unknown> | null;
  @date('created_at') createdAt!: Date;
}
