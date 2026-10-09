-- Quotes have no appointment date and never occupy a time slot.
CREATE TABLE IF NOT EXISTS orcamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  telefone text NOT NULL,
  veiculo_tipo text NOT NULL CHECK (veiculo_tipo IN ('car', 'motorcycle')),
  veiculo_detalhe text,
  servicos jsonb NOT NULL,
  valor_estimado numeric(10,2) NOT NULL CHECK (valor_estimado >= 0),
  criado_em timestamptz NOT NULL DEFAULT now()
);
