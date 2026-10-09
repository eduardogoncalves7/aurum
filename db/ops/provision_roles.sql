-- MANUAL, DBA only, AFTER migration + backup. Never called at container startup.
-- Inspect existing roles first; these names must be exclusive to Aurum.
BEGIN;
DO $roles$
BEGIN
  IF obj_description(to_regclass('detailing._migrations'), 'pg_class')
      IS DISTINCT FROM 'aurum-detailing:migrations:v1' THEN
    RAISE EXCEPTION 'AURUM_SCHEMA_NOT_VERIFIED';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'detailing_owner') THEN
    CREATE ROLE detailing_owner NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'detailing_app') THEN
    CREATE ROLE detailing_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname IN ('detailing_app', 'detailing_owner')
      AND (rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls))
      OR EXISTS (SELECT 1 FROM pg_auth_members m JOIN pg_roles r ON r.oid = m.member
                 WHERE r.rolname = 'detailing_app') THEN
    RAISE EXCEPTION 'AURUM_ROLE_CONFLICT: inspect pre-existing roles';
  END IF;
END
$roles$;

ALTER SCHEMA detailing OWNER TO detailing_owner;
ALTER TABLE detailing._migrations OWNER TO detailing_owner;
ALTER TABLE detailing.agendamentos OWNER TO detailing_owner;
ALTER TABLE detailing.orcamentos OWNER TO detailing_owner;
ALTER TABLE detailing.catalog_items OWNER TO detailing_owner;
ALTER TABLE detailing.site_settings OWNER TO detailing_owner;
ALTER TABLE detailing.catalog_snapshot OWNER TO detailing_owner;

REVOKE ALL ON SCHEMA detailing FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA detailing FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA detailing FROM PUBLIC;
REVOKE ALL ON SCHEMA detailing FROM detailing_app;
REVOKE ALL ON ALL TABLES IN SCHEMA detailing FROM detailing_app;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA detailing FROM detailing_app;
GRANT USAGE ON SCHEMA detailing TO detailing_app;
GRANT SELECT ON detailing._migrations TO detailing_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON detailing.agendamentos,
  detailing.orcamentos, detailing.catalog_items, detailing.site_settings, detailing.catalog_snapshot TO detailing_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA detailing TO detailing_app;

-- No database-wide REVOKE and no changes to public/financial grants.
DO $connect$
BEGIN
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO detailing_app', current_database());
  EXECUTE format('ALTER ROLE detailing_app IN DATABASE %I SET search_path TO detailing, pg_catalog', current_database());
END
$connect$;
-- Run future migrations with the maintenance/DBA credential, not detailing_app.
-- Transfer new objects to detailing_owner and grant reviewed runtime access.
COMMIT;
-- Set the password interactively with psql: \password detailing_app
