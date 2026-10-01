CREATE TABLE IF NOT EXISTS detailing.catalog_snapshot (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  gerado_em timestamptz NOT NULL DEFAULT now(),
  origem text NOT NULL,
  hash text NOT NULL,
  conteudo jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_catalog_snapshot_gerado_em
  ON detailing.catalog_snapshot (gerado_em DESC, id DESC);
