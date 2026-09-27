ALTER TABLE catalog_items ADD COLUMN IF NOT EXISTS source_id TEXT UNIQUE;
ALTER TABLE catalog_items ADD COLUMN IF NOT EXISTS service_data JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE catalog_items ADD COLUMN IF NOT EXISTS variantes JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE catalog_items ADD COLUMN IF NOT EXISTS opcoes_preco JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS site_settings (
  chave TEXT PRIMARY KEY,
  valor TEXT NOT NULL,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
