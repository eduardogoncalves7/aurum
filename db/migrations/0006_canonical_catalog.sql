-- Additive canonical catalog fields. Legacy columns and JSON remain intact.
ALTER TABLE catalog_items
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS tipo_preco text,
  ADD COLUMN IF NOT EXISTS beneficios text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS brinde text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS fotos text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS visivel_catalogo boolean,
  ADD COLUMN IF NOT EXISTS destaque boolean,
  ADD COLUMN IF NOT EXISTS ordem integer,
  ADD COLUMN IF NOT EXISTS precos_promocionais jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS promocao_sem_data boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS catalog_categories (
  id text PRIMARY KEY,
  nome text NOT NULL,
  ordem integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS catalog_item_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  catalog_item_id uuid,
  source_id text,
  quem text NOT NULL,
  quando timestamptz NOT NULL DEFAULT now(),
  antes jsonb,
  depois jsonb
);

DO $migration$
DECLARE
  count_before bigint;
  count_after bigint;
  canonical_missing_before bigint;
  canonical_missing_after bigint;
  test_promotions_disabled bigint;
BEGIN
  SELECT count(*) INTO count_before FROM catalog_items;
  SELECT count(*) INTO canonical_missing_before FROM catalog_items
    WHERE slug IS NULL OR tipo_preco IS NULL OR visivel_catalogo IS NULL
      OR destaque IS NULL OR ordem IS NULL;

  WITH ranked AS (
    SELECT id, (row_number() OVER (ORDER BY criado_em, id) - 1)::integer AS display_order
    FROM catalog_items
  )
  UPDATE catalog_items AS item SET
    slug = COALESCE(NULLIF(item.slug, ''),
      regexp_replace(translate(lower(COALESCE(NULLIF(item.source_id, ''), item.nome)), 'áàãâäéêëíïóôõöúüçñ', 'aaaaaeeeiioooouucn'), '[^a-z0-9]+', '-', 'g')
      || '-' || left(item.id::text, 8)),
    tipo_preco = COALESCE(item.tipo_preco, CASE
      WHEN item.service_data->>'pricingType' = 'starting_at' THEN 'starting_at'
      ELSE 'fixed'
    END),
    precos = CASE
      WHEN item.precos <> '{}'::jsonb THEN item.precos
      WHEN jsonb_typeof(item.service_data->'prices') = 'object' THEN item.service_data->'prices'
      WHEN item.service_data ? 'fixedPrice' THEN jsonb_build_object('fixed', item.service_data->'fixedPrice')
      WHEN item.service_data ? 'startingPrice' THEN jsonb_build_object('starting_at', item.service_data->'startingPrice')
      ELSE item.precos
    END,
    variantes = CASE
      WHEN jsonb_array_length(item.variantes) > 0 THEN item.variantes
      WHEN jsonb_typeof(item.service_data->'variants') = 'array' THEN item.service_data->'variants'
      ELSE item.variantes
    END,
    opcoes_preco = CASE
      WHEN jsonb_array_length(item.opcoes_preco) > 0 THEN item.opcoes_preco
      WHEN jsonb_typeof(item.service_data->'priceBreakdown') = 'array' THEN item.service_data->'priceBreakdown'
      ELSE item.opcoes_preco
    END,
    includes = CASE
      WHEN cardinality(item.includes) > 0 THEN item.includes
      WHEN jsonb_typeof(item.service_data->'includes') = 'array'
        THEN ARRAY(SELECT jsonb_array_elements_text(item.service_data->'includes'))
      ELSE item.includes
    END,
    beneficios = CASE
      WHEN cardinality(item.beneficios) > 0 THEN item.beneficios
      WHEN jsonb_typeof(item.service_data->'benefits') = 'array'
        THEN ARRAY(SELECT jsonb_array_elements_text(item.service_data->'benefits'))
      ELSE item.beneficios
    END,
    brinde = CASE
      WHEN cardinality(item.brinde) > 0 THEN item.brinde
      WHEN jsonb_typeof(item.service_data->'gift') = 'array'
        THEN ARRAY(SELECT jsonb_array_elements_text(item.service_data->'gift'))
      ELSE item.brinde
    END,
    fotos = CASE
      WHEN cardinality(item.fotos) > 0 THEN item.fotos
      WHEN jsonb_typeof(item.service_data->'photos') = 'array'
        THEN ARRAY(SELECT jsonb_array_elements_text(item.service_data->'photos'))
      ELSE array_remove(ARRAY[item.foto, item.service_data->>'image'], NULL)
    END,
    visivel_catalogo = COALESCE(item.visivel_catalogo, NOT COALESCE((item.service_data->>'hiddenFromCatalog')::boolean, false)),
    destaque = COALESCE(item.destaque, COALESCE((item.service_data->>'featured')::boolean, false)),
    ordem = COALESCE(item.ordem, ranked.display_order, 0),
    precos_promocionais = CASE
      WHEN item.precos_promocionais <> '{}'::jsonb THEN item.precos_promocionais
      WHEN jsonb_typeof(item.service_data->'promotionalPrices') = 'object' THEN item.service_data->'promotionalPrices'
      WHEN jsonb_typeof(item.service_data->'precosPromocionais') = 'object' THEN item.service_data->'precosPromocionais'
      ELSE item.precos_promocionais
    END
  FROM ranked
  WHERE item.id = ranked.id
    AND (item.slug IS NULL OR item.tipo_preco IS NULL OR item.visivel_catalogo IS NULL
      OR item.destaque IS NULL OR item.ordem IS NULL);

  -- Owner-approved corrections from the prior price review (item 5).
  UPDATE catalog_items SET
    precos = jsonb_set(precos, '{fixed}', '120'::jsonb, true),
    service_data = jsonb_set(service_data, '{fixedPrice}', '120'::jsonb, true)
  WHERE source_id = 'higienizacao-teto'
    AND (precos->'fixed' IS DISTINCT FROM '120'::jsonb OR service_data->'fixedPrice' IS DISTINCT FROM '120'::jsonb);
  UPDATE catalog_items SET
    precos = jsonb_set(precos, '{fixed}', '300'::jsonb, true),
    service_data = jsonb_set(service_data, '{fixedPrice}', '300'::jsonb, true)
  WHERE source_id = 'higienizacao-bancos'
    AND (precos->'fixed' IS DISTINCT FROM '300'::jsonb OR service_data->'fixedPrice' IS DISTINCT FROM '300'::jsonb);
  UPDATE catalog_items SET
    precos = jsonb_set(precos, '{starting_at}', '250'::jsonb, true),
    service_data = jsonb_set(service_data, '{startingPrice}', '250'::jsonb, true)
  WHERE source_id = 'limpeza-moto-premium'
    AND (precos->'starting_at' IS DISTINCT FROM '250'::jsonb OR service_data->'startingPrice' IS DISTINCT FROM '250'::jsonb);

  ALTER TABLE catalog_items
    ALTER COLUMN slug SET NOT NULL,
    ALTER COLUMN tipo_preco SET NOT NULL,
    ALTER COLUMN visivel_catalogo SET DEFAULT true,
    ALTER COLUMN visivel_catalogo SET NOT NULL,
    ALTER COLUMN destaque SET DEFAULT false,
    ALTER COLUMN destaque SET NOT NULL,
    ALTER COLUMN ordem SET DEFAULT 0,
    ALTER COLUMN ordem SET NOT NULL;

  CREATE UNIQUE INDEX IF NOT EXISTS idx_catalog_items_slug ON catalog_items (slug);
  CREATE INDEX IF NOT EXISTS idx_catalog_items_visible_order ON catalog_items (visivel_catalogo, ordem);

  IF NOT EXISTS (SELECT 1 FROM pg_constraint
    WHERE conrelid = 'catalog_items'::regclass AND conname = 'catalog_items_tipo_preco_check') THEN
    ALTER TABLE catalog_items ADD CONSTRAINT catalog_items_tipo_preco_check
      CHECK (tipo_preco IN ('fixed', 'starting_at'));
  END IF;

  INSERT INTO catalog_categories (id, nome, ordem) VALUES
    ('combos', 'Combos', 10),
    ('protecao', 'Proteções', 20),
    ('polimento', 'Polimento', 30),
    ('limpeza_carro', 'Limpezas', 40),
    ('higienizacao', 'Higienização', 50),
    ('limpeza_moto', 'Limpeza de Motos', 60),
    ('especiais', 'Serviços Especiais', 70),
    ('cristalizacao', 'Cristalização de Vidros', 80)
  ON CONFLICT (id) DO NOTHING;

  -- Disable only rows clearly marked as a test promotion; never delete them.
  UPDATE catalog_items SET ativo = false, atualizado_em = now()
  WHERE ativo = true
    AND promocao_inicio IS NOT NULL
    AND (lower(COALESCE(source_id, '')) LIKE '%teste%'
      OR lower(COALESCE(nome, '')) LIKE '%teste%'
      OR lower(COALESCE(source_id, '')) LIKE '%test%'
      OR lower(COALESCE(nome, '')) LIKE '%test%'
      OR lower(COALESCE(source_id, '')) LIKE '%test-promo%'
      OR lower(COALESCE(nome, '')) LIKE '%test promotion%');
  GET DIAGNOSTICS test_promotions_disabled = ROW_COUNT;

  SELECT count(*) INTO count_after FROM catalog_items;
  SELECT count(*) INTO canonical_missing_after FROM catalog_items
    WHERE slug IS NULL OR tipo_preco IS NULL OR visivel_catalogo IS NULL
      OR destaque IS NULL OR ordem IS NULL;
  IF count_before <> count_after OR canonical_missing_after <> 0 THEN
    RAISE EXCEPTION 'AURUM_CATALOG_BACKFILL_COUNT_MISMATCH before=% after=% canonical_before=% canonical_after=%',
      count_before, count_after, canonical_missing_before, canonical_missing_after;
  END IF;
  RAISE NOTICE 'AURUM_CATALOG_BACKFILL before=% after=% canonical_missing_before=% canonical_missing_after=% test_promotions_disabled=%',
    count_before, count_after, canonical_missing_before, canonical_missing_after, test_promotions_disabled;
END
$migration$;

CREATE OR REPLACE FUNCTION catalog_item_history_capture() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $history$
BEGIN
  IF TG_OP = 'DELETE' THEN
    EXECUTE pg_catalog.format('INSERT INTO %I.catalog_item_history (catalog_item_id, source_id, quem, antes, depois) VALUES ($1,$2,$3,$4,NULL)', TG_TABLE_SCHEMA)
      USING OLD.id, OLD.source_id, COALESCE(NULLIF(current_setting('aurum.actor', true), ''), session_user), to_jsonb(OLD);
    RETURN OLD;
  END IF;
  EXECUTE pg_catalog.format('INSERT INTO %I.catalog_item_history (catalog_item_id, source_id, quem, antes, depois) VALUES ($1,$2,$3,$4,$5)', TG_TABLE_SCHEMA)
    USING NEW.id, NEW.source_id,
      COALESCE(NULLIF(current_setting('aurum.actor', true), ''), session_user),
      CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END, to_jsonb(NEW);
  RETURN NEW;
END
$history$;

CREATE OR REPLACE FUNCTION catalog_item_canonical_defaults() RETURNS trigger
LANGUAGE plpgsql AS $canonical$
DECLARE
  legacy_details_changed boolean;
BEGIN
  legacy_details_changed := TG_OP = 'INSERT';
  IF TG_OP = 'UPDATE' THEN
    legacy_details_changed := NEW.service_data IS DISTINCT FROM OLD.service_data;
  END IF;

  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := regexp_replace(translate(lower(COALESCE(NULLIF(NEW.source_id, ''), NEW.nome)),
      'áàãâäéêëíïóôõöúüçñ', 'aaaaaeeeiioooouucn'), '[^a-z0-9]+', '-', 'g')
      || '-' || left(NEW.id::text, 8);
  END IF;
  IF NEW.tipo_preco IS NULL OR legacy_details_changed THEN
    NEW.tipo_preco := CASE WHEN NEW.service_data->>'pricingType' = 'starting_at'
      THEN 'starting_at' ELSE 'fixed' END;
  END IF;
  IF legacy_details_changed THEN
    IF jsonb_typeof(NEW.service_data->'benefits') = 'array' THEN
      NEW.beneficios := ARRAY(SELECT jsonb_array_elements_text(NEW.service_data->'benefits'));
    END IF;
    IF jsonb_typeof(NEW.service_data->'gift') = 'array' THEN
      NEW.brinde := ARRAY(SELECT jsonb_array_elements_text(NEW.service_data->'gift'));
    END IF;
    IF jsonb_typeof(NEW.service_data->'photos') = 'array' THEN
      NEW.fotos := ARRAY(SELECT jsonb_array_elements_text(NEW.service_data->'photos'));
    ELSIF NEW.foto IS NOT NULL THEN
      NEW.fotos := ARRAY[NEW.foto];
    END IF;
    IF NEW.service_data ? 'hiddenFromCatalog' THEN
      NEW.visivel_catalogo := NOT COALESCE((NEW.service_data->>'hiddenFromCatalog')::boolean, false);
    END IF;
    IF NEW.service_data ? 'featured' THEN
      NEW.destaque := COALESCE((NEW.service_data->>'featured')::boolean, false);
    END IF;
    IF jsonb_typeof(NEW.service_data->'promotionalPrices') = 'object' THEN
      NEW.precos_promocionais := NEW.service_data->'promotionalPrices';
    ELSIF jsonb_typeof(NEW.service_data->'precosPromocionais') = 'object' THEN
      NEW.precos_promocionais := NEW.service_data->'precosPromocionais';
    END IF;
    IF NEW.variantes = '[]'::jsonb AND jsonb_typeof(NEW.service_data->'variants') = 'array' THEN
      NEW.variantes := NEW.service_data->'variants';
    END IF;
    IF NEW.opcoes_preco = '[]'::jsonb AND jsonb_typeof(NEW.service_data->'priceBreakdown') = 'array' THEN
      NEW.opcoes_preco := NEW.service_data->'priceBreakdown';
    END IF;
  END IF;
  RETURN NEW;
END
$canonical$;

DROP TRIGGER IF EXISTS catalog_item_canonical_defaults_trigger ON catalog_items;
CREATE TRIGGER catalog_item_canonical_defaults_trigger
BEFORE INSERT OR UPDATE ON catalog_items
FOR EACH ROW EXECUTE FUNCTION catalog_item_canonical_defaults();

DROP TRIGGER IF EXISTS catalog_item_history_capture_trigger ON catalog_items;
CREATE TRIGGER catalog_item_history_capture_trigger
AFTER INSERT OR UPDATE OR DELETE ON catalog_items
FOR EACH ROW EXECUTE FUNCTION catalog_item_history_capture();
