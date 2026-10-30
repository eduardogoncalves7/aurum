-- Remove permanentemente somente os registros sintéticos identificados pela auditoria.
-- Os filtros completos evitam atingir qualquer cliente real.
DELETE FROM orcamentos
WHERE nome = 'DRAEL TESTE ORC'
  AND telefone = '00000000000'
  AND criado_em::date = DATE '2026-10-30';

DELETE FROM agendamentos
WHERE nome = 'DRAEL TESTE AGEN'
  AND telefone = '00000000000'
  AND data = '2026-12-15'
  AND horario = '14:00'
  AND criado_em::date = DATE '2026-10-30';
