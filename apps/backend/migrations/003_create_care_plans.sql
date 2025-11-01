-- 003_create_care_plans.sql
-- Creates the care_plans table and supporting trigger for timestamp maintenance.

BEGIN;

CREATE TABLE IF NOT EXISTS care_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  medications JSONB NOT NULL DEFAULT '[]'::jsonb,
  allergies JSONB NOT NULL DEFAULT '[]'::jsonb,
  special_instructions TEXT,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_care_plans_client_id ON care_plans(client_id);

CREATE OR REPLACE FUNCTION set_care_plans_updated_at_timestamp()
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
    WHERE tgname = 'trg_care_plans_set_updated_at'
      AND tgrelid = 'care_plans'::regclass
  ) THEN
    EXECUTE 'CREATE TRIGGER trg_care_plans_set_updated_at
      BEFORE UPDATE ON care_plans
      FOR EACH ROW
      EXECUTE FUNCTION set_care_plans_updated_at_timestamp()';
  END IF;
END;
$$;

COMMIT;
