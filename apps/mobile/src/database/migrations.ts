import {
  createTable,
  schemaMigrations,
  unsafeExecuteSql,
} from '@nozbe/watermelondb/Schema/migrations';

import { CRITICAL_INDEXES, OPTIONAL_INDEXES } from './indexes';

export const migrations = schemaMigrations({
  migrations: [
    {
      toVersion: 2,
      steps: [
        createTable({
          name: 'sync_queue',
          columns: [
            { name: 'table_name', type: 'string' },
            { name: 'record_id', type: 'string' },
            { name: 'operation', type: 'string' },
            { name: 'payload', type: 'string', isOptional: true },
            { name: 'priority', type: 'number' },
            { name: 'created_at', type: 'number' },
          ],
        }),
        unsafeExecuteSql('CREATE INDEX IF NOT EXISTS sync_queue_priority_idx ON sync_queue(priority);'),
        unsafeExecuteSql('CREATE INDEX IF NOT EXISTS sync_queue_created_at_idx ON sync_queue(created_at);'),
        unsafeExecuteSql(
          'CREATE INDEX IF NOT EXISTS sync_queue_table_record_idx ON sync_queue(table_name, record_id);',
        ),
      ],
    },
    {
      toVersion: 3,
      steps: CRITICAL_INDEXES.map((index) => unsafeExecuteSql(`${index.sql};`)),
    },
    {
      toVersion: 4,
      steps: [
        // Drop low-selectivity indexes (mostly boolean filters) that EXPLAIN never used.
        ...OPTIONAL_INDEXES.map((index) =>
          unsafeExecuteSql(`DROP INDEX IF EXISTS ${index.name};`),
        ),
      ],
    },
  ],
});

export default migrations;
