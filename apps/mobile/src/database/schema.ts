import { appSchema, tableSchema } from '@nozbe/watermelondb/Schema';

// Mirrors the Local Database Schema (WatermelonDB) described in
// project-documentation/architecture-output.md to keep parity with the server.
export const schema = appSchema({
  version: 4,
  tables: [
    tableSchema({
      name: 'clients',
      columns: [
        { name: 'first_name', type: 'string' },
        { name: 'last_name', type: 'string' },
        { name: 'date_of_birth', type: 'string' },
        { name: 'address', type: 'string' },
        { name: 'latitude', type: 'number', isOptional: true },
        { name: 'longitude', type: 'number', isOptional: true },
        { name: 'phone', type: 'string', isOptional: true },
        { name: 'zone_id', type: 'string', isIndexed: true },
        { name: 'care_plan_summary', type: 'string', isOptional: true },
        { name: 'allergies', type: 'string', isOptional: true },
        { name: 'special_instructions', type: 'string', isOptional: true },
        { name: 'is_active', type: 'boolean' },
        { name: 'sync_status', type: 'string', isIndexed: true },
        { name: 'last_synced_at', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'visits',
      columns: [
        { name: 'client_id', type: 'string', isIndexed: true },
        { name: 'staff_id', type: 'string', isOptional: true },
        { name: 'scheduled_start_time', type: 'number' },
        { name: 'check_in_time', type: 'number', isOptional: true },
        { name: 'check_in_latitude', type: 'number', isOptional: true },
        { name: 'check_in_longitude', type: 'number', isOptional: true },
        { name: 'check_out_time', type: 'number', isOptional: true },
        { name: 'check_out_latitude', type: 'number', isOptional: true },
        { name: 'check_out_longitude', type: 'number', isOptional: true },
        { name: 'duration_minutes', type: 'number', isOptional: true },
        { name: 'status', type: 'string', isIndexed: true },
        { name: 'copied_from_visit_id', type: 'string', isOptional: true },
        { name: 'is_active', type: 'boolean' },
        { name: 'local_id', type: 'string' },
        { name: 'sync_status', type: 'string', isIndexed: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'visit_documentation',
      columns: [
        { name: 'visit_id', type: 'string', isIndexed: true },
        { name: 'vital_signs', type: 'string', isOptional: true },
        { name: 'activities', type: 'string', isOptional: true },
        { name: 'observations', type: 'string', isOptional: true },
        { name: 'concerns', type: 'string', isOptional: true },
        { name: 'signature_url', type: 'string', isOptional: true },
        { name: 'is_active', type: 'boolean' },
        { name: 'sync_status', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'medications',
      columns: [
        { name: 'client_id', type: 'string', isIndexed: true },
        { name: 'name', type: 'string' },
        { name: 'dosage', type: 'string', isOptional: true },
        { name: 'frequency', type: 'string', isOptional: true },
        { name: 'instructions', type: 'string', isOptional: true },
        { name: 'is_active', type: 'boolean' },
        { name: 'sync_status', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'photos',
      columns: [
        { name: 'visit_id', type: 'string', isIndexed: true },
        { name: 's3_key', type: 'string' },
        { name: 'file_name', type: 'string', isOptional: true },
        { name: 'file_size', type: 'number', isOptional: true },
        { name: 'mime_type', type: 'string', isOptional: true },
        { name: 'uploaded_at', type: 'number' },
        { name: 'is_active', type: 'boolean' },
        { name: 'sync_status', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
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
  ],
});

export type Schema = typeof schema;
export default schema;
