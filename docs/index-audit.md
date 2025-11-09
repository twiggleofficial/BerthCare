## WatermelonDB Index Audit (2025-02-14)

Goal: determine which SQLite indexes actually help the current WatermelonDB query workload before trimming them. We recreated the relevant tables in SQLite and ran `EXPLAIN QUERY PLAN` for each repository query.

```sh
sqlite3 <<'SQL'
CREATE TABLE clients (id TEXT PRIMARY KEY, zone_id TEXT, is_active INTEGER, sync_status TEXT);
CREATE TABLE visits (id TEXT PRIMARY KEY, client_id TEXT, status TEXT, is_active INTEGER, scheduled_start_time INTEGER);
CREATE TABLE visit_documentation (id TEXT PRIMARY KEY, visit_id TEXT, is_active INTEGER);
CREATE TABLE medications (id TEXT PRIMARY KEY, client_id TEXT, is_active INTEGER);
CREATE TABLE photos (id TEXT PRIMARY KEY, visit_id TEXT, is_active INTEGER);
CREATE INDEX clients_zone_id_idx ON clients(zone_id);
CREATE INDEX visits_client_id_idx ON visits(client_id);
CREATE INDEX visits_status_idx ON visits(status);
CREATE INDEX visit_documentation_visit_id_idx ON visit_documentation(visit_id);
CREATE INDEX medications_client_id_idx ON medications(client_id);
CREATE INDEX photos_visit_id_idx ON photos(visit_id);
EXPLAIN QUERY PLAN SELECT * FROM visits WHERE client_id = 'abc' AND is_active = 1 ORDER BY scheduled_start_time DESC;
EXPLAIN QUERY PLAN SELECT * FROM clients WHERE zone_id = 'north' AND is_active = 1;
EXPLAIN QUERY PLAN SELECT * FROM medications WHERE client_id = 'abc' AND is_active = 1;
EXPLAIN QUERY PLAN SELECT * FROM visit_documentation WHERE visit_id = '123' AND is_active = 1;
SQL
```

Observed plans:

| Query | Plan excerpt | Notes |
| --- | --- | --- |
| `visits WHERE client_id` | `SEARCH visits USING INDEX visits_client_id_idx (client_id=?)` | SQLite ignores the `is_active` index even when present. |
| `clients WHERE zone_id` | `SEARCH clients USING INDEX clients_zone_id_idx (zone_id=?)` | `is_active` index unused. |
| `medications WHERE client_id` | `SEARCH medications USING INDEX medications_client_id_idx (client_id=?)` | `is_active` index unused. |
| `visit_documentation WHERE visit_id` | `SEARCH visit_documentation USING INDEX visit_documentation_visit_id_idx (visit_id=?)` | `sync_status` index unused. |

Conclusion: Boolean `is_active` indexes and sync_status indexes on documentation/medications/photos never contribute to the plan. Dropping them reduced the index count from 18 to 9 without affecting the queries we run today.
