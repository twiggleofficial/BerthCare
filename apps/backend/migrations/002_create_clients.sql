-- 002_create_clients.sql
-- Creates the clients table supporting core client management features.

BEGIN;

CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  date_of_birth DATE NOT NULL,
  address TEXT NOT NULL,
  latitude NUMERIC(9,6) CHECK (latitude BETWEEN -90 AND 90),
  longitude NUMERIC(9,6) CHECK (longitude BETWEEN -180 AND 180),
  phone VARCHAR(25),
  emergency_contact_name VARCHAR(150),
  emergency_contact_phone VARCHAR(25),
  emergency_contact_relationship VARCHAR(100),
  zone_id UUID REFERENCES zones(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clients_zone_id ON clients(zone_id);
CREATE INDEX IF NOT EXISTS idx_clients_last_name_first_name ON clients(last_name, first_name);

CREATE OR REPLACE FUNCTION set_clients_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_clients_set_updated_at'
      AND tgrelid = 'clients'::regclass
  ) THEN
    EXECUTE 'CREATE TRIGGER trg_clients_set_updated_at
      BEFORE UPDATE ON clients
      FOR EACH ROW
      EXECUTE FUNCTION set_clients_updated_at_timestamp()';
  END IF;
END;
$$;

COMMIT;
