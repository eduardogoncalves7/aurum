-- Run as detailing_app. No customer data is returned.
SELECT current_user, current_database(), current_setting('search_path');
SELECT n.nspname AS schema, c.relname AS relation
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname NOT IN ('detailing', 'pg_catalog', 'information_schema')
  AND n.nspname NOT LIKE 'pg_toast%' AND n.nspname NOT LIKE 'pg_temp%'
  AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
  AND has_schema_privilege(current_user, n.oid, 'USAGE')
  AND (has_table_privilege(current_user, c.oid, 'SELECT')
    OR has_table_privilege(current_user, c.oid, 'INSERT')
    OR has_table_privilege(current_user, c.oid, 'UPDATE')
    OR has_table_privilege(current_user, c.oid, 'DELETE'));
-- The second result must be empty. PUBLIC grants are inherited by every role;
-- do not revoke shared grants automatically. DBA must coordinate any correction.
