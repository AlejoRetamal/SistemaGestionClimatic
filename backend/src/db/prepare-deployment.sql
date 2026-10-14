-- Explicit preparation for multiple backend instances. No business data changes.
BEGIN;
SELECT pg_advisory_xact_lock(783241903);
CREATE TABLE IF NOT EXISTS public.login_attempts (
  key_hash TEXT PRIMARY KEY CHECK (key_hash ~ '^[a-f0-9]{64}$'),
  attempts INTEGER NOT NULL CHECK (attempts BETWEEN 1 AND 11),
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS login_attempts_expiry_idx ON public.login_attempts(expires_at);
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.login_attempts FROM PUBLIC;
DO $$ DECLARE role_name TEXT; BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon','authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname=role_name) THEN
      EXECUTE format('REVOKE ALL ON public.login_attempts FROM %I',role_name);
    END IF;
  END LOOP;
END $$;
COMMIT;
