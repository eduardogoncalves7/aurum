-- Browser capability: legacy records deliberately receive no public access.
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS acesso_hash text;
CREATE INDEX IF NOT EXISTS idx_agendamentos_acesso_hash
  ON agendamentos (acesso_hash) WHERE acesso_hash IS NOT NULL;
