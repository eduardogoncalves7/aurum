-- Tabela única do projeto: guarda apenas agendamentos, com nome e telefone
-- embutidos em cada linha (o telefone é o identificador do "usuário" — não
-- existe cadastro de cliente separado, o nome pode variar a cada visita).
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS agendamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identidade de quem agendou. telefone é só dígitos (DDD+número, sem DDI),
  -- normalizado pela aplicação antes de gravar — é a chave usada para
  -- "Meus agendamentos" e para agrupar por cliente no /admin.
  telefone TEXT NOT NULL,
  nome TEXT NOT NULL,

  -- Veículo escolhido naquele agendamento (não é uma tabela própria).
  veiculo_tipo TEXT NOT NULL CHECK (veiculo_tipo IN ('car', 'motorcycle')),
  veiculo_detalhe TEXT, -- hatch|sedan|suv|pickup|outro; nulo para moto

  -- Snapshot dos serviços cotados no momento do agendamento (id, nome e
  -- preço), para não depender do catálogo (lib/data/services.ts) não mudar
  -- os preços de agendamentos antigos se o catálogo for atualizado depois.
  servicos JSONB NOT NULL,
  valor_estimado NUMERIC(10,2) NOT NULL DEFAULT 0,

  data TEXT NOT NULL,    -- 'YYYY-MM-DD', guardado como texto de propósito
  horario TEXT NOT NULL, -- 'HH:MM', guardado como texto de propósito
  forma_entrega TEXT NOT NULL CHECK (forma_entrega IN ('dropoff', 'pickup')),

  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),

  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- "Meus agendamentos" filtra por telefone; o admin e o TimeSelector filtram
-- por data (pra saber quais horários já estão ocupados naquele dia).
CREATE INDEX IF NOT EXISTS idx_agendamentos_telefone ON agendamentos (telefone);
CREATE INDEX IF NOT EXISTS idx_agendamentos_data ON agendamentos (data);
