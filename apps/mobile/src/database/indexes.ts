export type IndexDefinition = {
  name: string;
  sql: string;
  reason: string;
};

/**
 * Index audit (2025-02-14):
 *
 * See docs/index-audit.md for the EXPLAIN QUERY PLAN output that backs these lists.
 * We only keep indexes that showed up in those plans so WatermelonDB writes
 * stay within the <75 ms P95 target.
 */
export const CRITICAL_INDEXES: IndexDefinition[] = [
  {
    name: 'clients_zone_id_idx',
    sql: 'CREATE INDEX IF NOT EXISTS clients_zone_id_idx ON clients(zone_id)',
    reason: 'ClientRepository.getByZone() filters by zone',
  },
  {
    name: 'clients_sync_status_idx',
    sql: 'CREATE INDEX IF NOT EXISTS clients_sync_status_idx ON clients(sync_status)',
    reason: 'SyncEngine fetches pending client changes',
  },
  {
    name: 'visits_client_id_idx',
    sql: 'CREATE INDEX IF NOT EXISTS visits_client_id_idx ON visits(client_id)',
    reason: 'VisitRepository.getByClient() and zone lookups join on client_id',
  },
  {
    name: 'visits_status_idx',
    sql: 'CREATE INDEX IF NOT EXISTS visits_status_idx ON visits(status)',
    reason: 'VisitRepository.getByStatus() filters by status',
  },
  {
    name: 'visits_sync_status_idx',
    sql: 'CREATE INDEX IF NOT EXISTS visits_sync_status_idx ON visits(sync_status)',
    reason: 'SyncEngine fetches pending visit changes',
  },
  {
    name: 'visit_documentation_visit_id_idx',
    sql: 'CREATE INDEX IF NOT EXISTS visit_documentation_visit_id_idx ON visit_documentation(visit_id)',
    reason: 'VisitDocumentationRepository.getByVisit() filters by visit_id',
  },
  {
    name: 'medications_client_id_idx',
    sql: 'CREATE INDEX IF NOT EXISTS medications_client_id_idx ON medications(client_id)',
    reason: 'MedicationRepository.getByClient() filters by client_id',
  },
  {
    name: 'photos_visit_id_idx',
    sql: 'CREATE INDEX IF NOT EXISTS photos_visit_id_idx ON photos(visit_id)',
    reason: 'PhotoRepository.getByVisit() filters by visit_id',
  },
];

/**
 * Optional indexes we stage behind telemetry. Boolean `is_active` filters and the
 * extra sync_status indexes never showed up in EXPLAIN and cost us 9 additional
 * writes per mutation. We keep the definitions around for potential future rollout.
 */
export const OPTIONAL_INDEXES: IndexDefinition[] = [
  {
    name: 'clients_is_active_idx',
    sql: 'CREATE INDEX IF NOT EXISTS clients_is_active_idx ON clients(is_active)',
    reason: 'Mostly redundant today; kept for historical reference.',
  },
  {
    name: 'visits_local_id_idx',
    sql: 'CREATE INDEX IF NOT EXISTS visits_local_id_idx ON visits(local_id)',
    reason: 'Not used by any query yet; reserved for future local-id lookups.',
  },
  {
    name: 'visits_is_active_idx',
    sql: 'CREATE INDEX IF NOT EXISTS visits_is_active_idx ON visits(is_active)',
    reason: 'Boolean filter; planner sticks to client_id/status indexes instead.',
  },
  {
    name: 'visit_documentation_is_active_idx',
    sql: 'CREATE INDEX IF NOT EXISTS visit_documentation_is_active_idx ON visit_documentation(is_active)',
    reason: 'Boolean filter only used alongside visit_id.',
  },
  {
    name: 'visit_documentation_sync_status_idx',
    sql: 'CREATE INDEX IF NOT EXISTS visit_documentation_sync_status_idx ON visit_documentation(sync_status)',
    reason: 'We currently sync documentation via visits so this filter is unused.',
  },
  {
    name: 'medications_is_active_idx',
    sql: 'CREATE INDEX IF NOT EXISTS medications_is_active_idx ON medications(is_active)',
    reason: 'Boolean filter only used with client_id.',
  },
  {
    name: 'medications_sync_status_idx',
    sql: 'CREATE INDEX IF NOT EXISTS medications_sync_status_idx ON medications(sync_status)',
    reason: 'Medications sync piggybacks on visits/clients for now.',
  },
  {
    name: 'photos_is_active_idx',
    sql: 'CREATE INDEX IF NOT EXISTS photos_is_active_idx ON photos(is_active)',
    reason: 'Boolean filter only used with visit_id.',
  },
  {
    name: 'photos_sync_status_idx',
    sql: 'CREATE INDEX IF NOT EXISTS photos_sync_status_idx ON photos(sync_status)',
    reason: 'Photos go through visit sync payloads so this is dormant.',
  },
];
