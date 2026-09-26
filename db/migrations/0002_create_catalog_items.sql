-- Itens de catálogo criados pelo /admin (serviços novos e promoções).
-- O catálogo "de fábrica" continua em lib/data/services.ts — esta tabela só
-- ADICIONA itens por cima, nunca substitui os que já existem em código.
--
-- Uma promoção é só um item com promocao_inicio/promocao_fim preenchidos;
-- um serviço permanente criado pelo admin tem os dois nulos. Isso evita ter
-- duas tabelas quase idênticas.
--
-- Simplificação combinada com o Eduardo: cada item é OU pra carro OU pra
-- moto, nunca os dois ao mesmo tempo (mesma regra que o catálogo estático
-- já segue) — evita ter que misturar duas formas de preço num item só.
CREATE TABLE IF NOT EXISTS catalog_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  nome TEXT NOT NULL,
  descricao_curta TEXT NOT NULL,
  descricao TEXT,

  categoria TEXT NOT NULL,       -- um dos ServiceCategoryId (types/index.ts)
  subcategoria TEXT,             -- texto livre, opcional

  veiculo_tipo TEXT NOT NULL CHECK (veiculo_tipo IN ('car', 'motorcycle')),

  -- Preços por categoria de veículo. Pra carro: {hatch_sedan, suv, pickup}.
  -- Pra moto: {motorcycle}. Mesmas chaves que o tipo Service já usa em
  -- lib/data/services.ts, pra não precisar converter nada na leitura.
  precos JSONB NOT NULL DEFAULT '{}'::jsonb,

  includes TEXT[] NOT NULL DEFAULT '{}', -- itens inclusos, texto livre

  -- Caminho relativo dentro de /public (ex: '/uploads/xxxxx.webp').
  -- As fotos ficam num volume persistente montado em public/uploads no
  -- deploy — ver README.
  foto TEXT,

  -- NULL nos dois = item permanente. Preenchidos os dois = promoção, some
  -- sozinha da vitrine fora dessa janela de datas. TEXT 'YYYY-MM-DD' de
  -- propósito (mesmo motivo do campo `data` em agendamentos): evita que o
  -- driver do Postgres converta pra Date e introduza fuso horário.
  promocao_inicio TEXT CHECK (promocao_inicio IS NULL OR promocao_inicio ~ '^\d{4}-\d{2}-\d{2}$'),
  promocao_fim TEXT CHECK (promocao_fim IS NULL OR promocao_fim ~ '^\d{4}-\d{2}-\d{2}$'),

  ativo BOOLEAN NOT NULL DEFAULT true, -- desligar manualmente sem apagar

  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),

  CHECK (
    (promocao_inicio IS NULL AND promocao_fim IS NULL)
    OR (promocao_inicio IS NOT NULL AND promocao_fim IS NOT NULL AND promocao_fim >= promocao_inicio)
  )
);

CREATE INDEX IF NOT EXISTS idx_catalog_items_categoria ON catalog_items (categoria);
CREATE INDEX IF NOT EXISTS idx_catalog_items_ativo ON catalog_items (ativo);
CREATE INDEX IF NOT EXISTS idx_catalog_items_promocao ON catalog_items (promocao_inicio, promocao_fim);
