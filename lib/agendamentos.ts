import { getPool } from "@/lib/db";
import { normalizePhone } from "@/lib/formatters";
import { VehicleType, VehicleChatChoice, DeliveryMethod } from "@/types";

// Server-only: código aqui roda só em Route Handlers (app/api/**), nunca no
// navegador. É a substituição das funções de agendamento/orçamento/cliente
// que existiam em lib/storage.ts (localStorage) — agora persistidas de
// verdade no Postgres. lib/storage.ts continua existindo só para a "sessão"
// local do cliente (nome/telefone lembrados no navegador), que não é
// autenticação — ver comentário lá.

const MAX_NAME_LENGTH = 80;

export interface AgendamentoServiceSnapshot {
  id: string;
  nome: string;
  preco: number;
}

export interface AgendamentoInput {
  nome: string;
  telefone: string;
  veiculoTipo: VehicleType;
  veiculoDetalhe?: VehicleChatChoice | "moto" | null;
  servicos: AgendamentoServiceSnapshot[];
  valorEstimado: number;
  data: string; // 'YYYY-MM-DD'
  horario: string; // 'HH:mm'
  formaEntrega: DeliveryMethod;
}

export type AgendamentoStatus = "pending" | "confirmed" | "cancelled" | "completed";

export interface Agendamento extends AgendamentoInput {
  id: string;
  status: AgendamentoStatus;
  criadoEm: string;
}

class ValidationError extends Error {}

function validateAndNormalize(input: AgendamentoInput): AgendamentoInput {
  const telefone = normalizePhone(input.telefone);
  if (telefone.length !== 10 && telefone.length !== 11) {
    throw new ValidationError("Telefone inválido.");
  }

  const nome = input.nome.trim().slice(0, MAX_NAME_LENGTH);
  if (!nome) {
    throw new ValidationError("Nome é obrigatório.");
  }

  if (input.veiculoTipo !== "car" && input.veiculoTipo !== "motorcycle") {
    throw new ValidationError("Tipo de veículo inválido.");
  }

  if (!Array.isArray(input.servicos) || input.servicos.length === 0) {
    throw new ValidationError("Selecione ao menos um serviço.");
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.data)) {
    throw new ValidationError("Data inválida.");
  }

  if (!/^\d{2}:\d{2}$/.test(input.horario)) {
    throw new ValidationError("Horário inválido.");
  }

  if (input.formaEntrega !== "dropoff" && input.formaEntrega !== "pickup") {
    throw new ValidationError("Forma de entrega inválida.");
  }

  const valorEstimado = Number(input.valorEstimado);
  if (!Number.isFinite(valorEstimado) || valorEstimado < 0) {
    throw new ValidationError("Valor estimado inválido.");
  }

  return { ...input, telefone, nome, valorEstimado };
}

export async function createAgendamento(
  rawInput: AgendamentoInput
): Promise<Agendamento> {
  const input = validateAndNormalize(rawInput);
  const pool = getPool();

  const result = await pool.query(
    `INSERT INTO agendamentos
      (telefone, nome, veiculo_tipo, veiculo_detalhe, servicos, valor_estimado, data, horario, forma_entrega, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
     RETURNING *`,
    [
      input.telefone,
      input.nome,
      input.veiculoTipo,
      input.veiculoDetalhe ?? null,
      JSON.stringify(input.servicos),
      input.valorEstimado,
      input.data,
      input.horario,
      input.formaEntrega,
    ]
  );

  return mapRow(result.rows[0]);
}

export async function listAgendamentosByTelefone(
  telefoneRaw: string
): Promise<Agendamento[]> {
  const telefone = normalizePhone(telefoneRaw);
  const pool = getPool();
  const result = await pool.query(
    `SELECT * FROM agendamentos WHERE telefone = $1 ORDER BY data DESC, horario DESC`,
    [telefone]
  );
  return result.rows.map(mapRow);
}

/** Horários já ocupados numa data (qualquer cliente) — usado pelo
 * TimeSelector pra não deixar marcar dois agendamentos no mesmo horário.
 * Cancelados não contam como ocupados. */
export async function listHorariosOcupados(data: string): Promise<string[]> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return [];
  const pool = getPool();
  const result = await pool.query(
    `SELECT horario FROM agendamentos WHERE data = $1 AND status <> 'cancelled'`,
    [data]
  );
  return result.rows.map((r: { horario: string }) => r.horario);
}

/** Usado só pelo /admin (rota protegida por Basic Auth no middleware). */
export async function listAllAgendamentos(): Promise<Agendamento[]> {
  const pool = getPool();
  const result = await pool.query(`SELECT * FROM agendamentos ORDER BY criado_em DESC`);
  return result.rows.map(mapRow);
}

interface AgendamentoRow {
  id: string;
  telefone: string;
  nome: string;
  veiculo_tipo: VehicleType;
  veiculo_detalhe: string | null;
  servicos: AgendamentoServiceSnapshot[];
  valor_estimado: string;
  data: string;
  horario: string;
  forma_entrega: DeliveryMethod;
  status: AgendamentoStatus;
  criado_em: string | Date;
}

function mapRow(row: AgendamentoRow): Agendamento {
  return {
    id: row.id,
    telefone: row.telefone,
    nome: row.nome,
    veiculoTipo: row.veiculo_tipo,
    veiculoDetalhe: row.veiculo_detalhe as VehicleChatChoice | "moto" | null,
    servicos: row.servicos,
    valorEstimado: Number(row.valor_estimado),
    data: row.data,
    horario: row.horario,
    formaEntrega: row.forma_entrega,
    status: row.status,
    criadoEm:
      row.criado_em instanceof Date ? row.criado_em.toISOString() : row.criado_em,
  };
}

export { ValidationError };
