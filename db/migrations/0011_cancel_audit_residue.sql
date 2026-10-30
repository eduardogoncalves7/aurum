-- Estorna exclusivamente os registros sintéticos criados pela auditoria externa.
-- Os filtros completos evitam atingir qualquer cliente real.
UPDATE orcamentos
SET status = 'cancelled'
WHERE nome = 'DRAEL TESTE ORC'
  AND telefone = '00000000000'
  AND criado_em::date = DATE '2026-10-30';

UPDATE agendamentos
SET status = 'cancelled', acesso_hash = NULL
WHERE nome = 'DRAEL TESTE AGEN'
  AND telefone = '00000000000'
  AND data = '2026-12-15'
  AND horario = '14:00'
  AND criado_em::date = DATE '2026-10-30';
