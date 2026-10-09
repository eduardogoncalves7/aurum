-- Bootstrap: executed before consulting legacy migrations, in a transaction.
DO $migration$
DECLARE
  tables text[] := ARRAY['_migrations', 'agendamentos', 'catalog_items', 'site_settings'];
  relation_name text;
  existing_public integer := 0;
  existing_target integer := 0;
  actual_columns text[];
  expected_columns text[];
  actual_history text[];
  before_count bigint;
  after_count bigint;
BEGIN
  IF pg_catalog.obj_description(pg_catalog.to_regclass('detailing._migrations'), 'pg_class')
      = 'aurum-detailing:migrations:v1' THEN
    RETURN;
  END IF;
  FOREACH relation_name IN ARRAY tables LOOP
    IF pg_catalog.to_regclass('public.' || relation_name) IS NOT NULL THEN
      existing_public := existing_public + 1;
    END IF;
    IF pg_catalog.to_regclass('detailing.' || relation_name) IS NOT NULL THEN
      existing_target := existing_target + 1;
    END IF;
  END LOOP;
  IF existing_target > 0 THEN
    RAISE EXCEPTION 'AURUM_TARGET_CONFLICT: detailing contains unverified tables';
  END IF;
  IF existing_public > 0 THEN
    IF pg_catalog.current_setting('detailing.adopt_public', true) IS DISTINCT FROM 'on' THEN
      RAISE EXCEPTION 'AURUM_ADOPTION_REQUIRED: backup and run migrate.js --adopt-public';
    END IF;
    IF existing_public <> 4 THEN
      RAISE EXCEPTION 'AURUM_SOURCE_INCOMPLETE: expected all four legacy tables';
    END IF;
    -- Match columns/types and history, not just table names. Lock the four
    -- tables to keep shape/data stable throughout validation and transfer.
    FOREACH relation_name IN ARRAY tables LOOP
      IF NOT EXISTS (
        SELECT 1 FROM pg_catalog.pg_class c
        JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = relation_name AND c.relkind = 'r'
      ) THEN
        RAISE EXCEPTION 'AURUM_SOURCE_SHAPE: ordinary tables required';
      END IF;
      EXECUTE pg_catalog.format('LOCK TABLE public.%I IN ACCESS EXCLUSIVE MODE', relation_name);
      SELECT array_agg(a.attname || ':' || pg_catalog.format_type(a.atttypid, a.atttypmod) ORDER BY a.attname)
        INTO actual_columns FROM pg_catalog.pg_attribute a
        WHERE a.attrelid = pg_catalog.to_regclass('public.' || relation_name)
          AND a.attnum > 0 AND NOT a.attisdropped;
      expected_columns := CASE relation_name
        WHEN '_migrations' THEN ARRAY['name:text','applied_at:timestamp with time zone']
        WHEN 'agendamentos' THEN ARRAY['id:uuid','telefone:text','nome:text','veiculo_tipo:text','veiculo_detalhe:text','servicos:jsonb','valor_estimado:numeric(10,2)','data:text','horario:text','forma_entrega:text','status:text','criado_em:timestamp with time zone']
        WHEN 'catalog_items' THEN ARRAY['id:uuid','nome:text','descricao_curta:text','descricao:text','categoria:text','subcategoria:text','veiculo_tipo:text','precos:jsonb','includes:text[]','foto:text','promocao_inicio:text','promocao_fim:text','ativo:boolean','criado_em:timestamp with time zone','atualizado_em:timestamp with time zone','source_id:text','service_data:jsonb','variantes:jsonb','opcoes_preco:jsonb']
        WHEN 'site_settings' THEN ARRAY['chave:text','valor:text','atualizado_em:timestamp with time zone']
      END;
      SELECT array_agg(value ORDER BY value) INTO expected_columns FROM unnest(expected_columns) AS value;
      IF actual_columns IS DISTINCT FROM expected_columns THEN
        IF relation_name = 'agendamentos' THEN
          expected_columns := expected_columns || ARRAY['acesso_hash:text'];
          SELECT array_agg(value ORDER BY value) INTO expected_columns FROM unnest(expected_columns) AS value;
        END IF;
        IF relation_name = 'catalog_items' THEN
          expected_columns := expected_columns || ARRAY[
            'slug:text','tipo_preco:text','beneficios:text[]','brinde:text[]','fotos:text[]',
            'visivel_catalogo:boolean','destaque:boolean','ordem:integer','precos_promocionais:jsonb'
          ];
          SELECT array_agg(value ORDER BY value) INTO expected_columns FROM unnest(expected_columns) AS value;
          IF actual_columns IS DISTINCT FROM expected_columns THEN
            expected_columns := expected_columns || ARRAY['promocao_sem_data:boolean'];
            SELECT array_agg(value ORDER BY value) INTO expected_columns FROM unnest(expected_columns) AS value;
          END IF;
        END IF;
        IF actual_columns IS DISTINCT FROM expected_columns THEN
          RAISE EXCEPTION 'AURUM_SOURCE_SHAPE: legacy columns do not match this project';
        END IF;
      END IF;
    END LOOP;
    SELECT array_agg(name ORDER BY name) INTO actual_history FROM public._migrations
      WHERE name NOT IN ('0004_move_to_detailing.sql');
    IF actual_history IS DISTINCT FROM ARRAY['0001_create_agendamentos.sql','0002_create_catalog_items.sql','0003_expand_catalog.sql']
      AND actual_history IS DISTINCT FROM ARRAY['0001_create_agendamentos.sql','0002_create_catalog_items.sql','0003_expand_catalog.sql','0005_create_catalog_snapshot.sql']
      AND actual_history IS DISTINCT FROM ARRAY['0001_create_agendamentos.sql','0002_create_catalog_items.sql','0003_expand_catalog.sql','0005_create_catalog_snapshot.sql','0006_canonical_catalog.sql']
      AND actual_history IS DISTINCT FROM ARRAY['0001_create_agendamentos.sql','0002_create_catalog_items.sql','0003_expand_catalog.sql','0005_create_catalog_snapshot.sql','0006_canonical_catalog.sql','0007_private_booking_history.sql']
      AND actual_history IS DISTINCT FROM ARRAY['0001_create_agendamentos.sql','0002_create_catalog_items.sql','0003_expand_catalog.sql','0005_create_catalog_snapshot.sql','0006_canonical_catalog.sql','0007_private_booking_history.sql','0008_whatsapp_quotes.sql'] THEN
      RAISE EXCEPTION 'AURUM_SOURCE_HISTORY: legacy history does not match this project';
    END IF;
    IF pg_catalog.to_regclass('public.catalog_categories') IS NOT NULL THEN
      IF pg_catalog.to_regclass('detailing.catalog_categories') IS NOT NULL THEN
        RAISE EXCEPTION 'AURUM_TARGET_CONFLICT: catalog_categories exists in both schemas';
      END IF;
      LOCK TABLE public.catalog_categories IN ACCESS EXCLUSIVE MODE;
      tables := array_append(tables, 'catalog_categories');
    END IF;
    IF pg_catalog.to_regclass('public.orcamentos') IS NOT NULL THEN
      IF pg_catalog.to_regclass('detailing.orcamentos') IS NOT NULL THEN
        RAISE EXCEPTION 'AURUM_TARGET_CONFLICT: orcamentos exists in both schemas';
      END IF;
      LOCK TABLE public.orcamentos IN ACCESS EXCLUSIVE MODE;
      tables := array_append(tables, 'orcamentos');
    END IF;
    IF pg_catalog.to_regclass('public.catalog_item_history') IS NOT NULL THEN
      IF pg_catalog.to_regclass('detailing.catalog_item_history') IS NOT NULL THEN
        RAISE EXCEPTION 'AURUM_TARGET_CONFLICT: catalog_item_history exists in both schemas';
      END IF;
      LOCK TABLE public.catalog_item_history IN ACCESS EXCLUSIVE MODE;
      tables := array_append(tables, 'catalog_item_history');
    END IF;
  END IF;
  -- A later optional transfer must also carry snapshots created in public.
  IF existing_public = 4 AND pg_catalog.to_regclass('public.catalog_snapshot') IS NOT NULL THEN
    IF pg_catalog.to_regclass('detailing.catalog_snapshot') IS NOT NULL THEN
      RAISE EXCEPTION 'AURUM_TARGET_CONFLICT: snapshot exists in both schemas';
    END IF;
    tables := array_append(tables, 'catalog_snapshot');
    LOCK TABLE public.catalog_snapshot IN ACCESS EXCLUSIVE MODE;
  END IF;
  CREATE SCHEMA IF NOT EXISTS detailing;
  IF existing_public = 4 THEN
    FOREACH relation_name IN ARRAY tables LOOP
      EXECUTE pg_catalog.format('SELECT count(*) FROM public.%I', relation_name) INTO before_count;
      EXECUTE pg_catalog.format('ALTER TABLE public.%I SET SCHEMA detailing', relation_name);
      EXECUTE pg_catalog.format('SELECT count(*) FROM detailing.%I', relation_name) INTO after_count;
      IF before_count <> after_count THEN RAISE EXCEPTION 'AURUM_COUNT_MISMATCH'; END IF;
    END LOOP;
  ELSE
    CREATE TABLE detailing._migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
  END IF;
  COMMENT ON TABLE detailing._migrations IS 'aurum-detailing:migrations:v1';
END
$migration$;
