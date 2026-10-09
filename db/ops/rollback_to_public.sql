-- MANUAL ONLY: stop Aurum writes and take a new backup first.
-- Reverse the namespace move; never drop tables, schemas, or snapshot data.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
DO $rollback$
DECLARE
  relation_name text;
  tables text[] := ARRAY['_migrations','agendamentos','catalog_items','site_settings'];
BEGIN
  IF obj_description(to_regclass('detailing._migrations'), 'pg_class')
      IS DISTINCT FROM 'aurum-detailing:migrations:v1' THEN
    RAISE EXCEPTION 'AURUM_SCHEMA_NOT_VERIFIED';
  END IF;
  IF to_regclass('detailing.catalog_snapshot') IS NOT NULL THEN
    tables := array_append(tables, 'catalog_snapshot');
  END IF;
  IF to_regclass('detailing.orcamentos') IS NOT NULL THEN
    tables := array_append(tables, 'orcamentos');
  END IF;
  FOREACH relation_name IN ARRAY tables LOOP
    IF to_regclass('public.' || relation_name) IS NOT NULL THEN
      RAISE EXCEPTION 'AURUM_ROLLBACK_CONFLICT: public destination is occupied';
    END IF;
    IF to_regclass('detailing.' || relation_name) IS NULL THEN
      RAISE EXCEPTION 'AURUM_ROLLBACK_INCOMPLETE';
    END IF;
  END LOOP;
  FOREACH relation_name IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE detailing.%I SET SCHEMA public', relation_name);
  END LOOP;
  -- Keep the history of the move. The corrected runner below handles re-adoption.
  COMMENT ON TABLE public._migrations IS 'aurum-detailing:migrations:v1';
END
$rollback$;
COMMIT;
