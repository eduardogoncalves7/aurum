import { z } from "zod";
import { getPool, quotedDbSchema } from "@/lib/db";
import { normalizePhone } from "@/lib/formatters";

const quoteSchema = z.object({
  nome: z.string().trim().min(1).max(80),
  telefone: z.string().transform(normalizePhone).refine((value) => value.length === 10 || value.length === 11),
  veiculoTipo: z.enum(["car", "motorcycle"]),
  veiculoDetalhe: z.enum(["hatch", "sedan", "suv", "pickup", "outro", "moto"]).nullable().optional(),
  servicos: z.array(z.object({ id: z.string().min(1), nome: z.string().min(1), preco: z.number().finite().nonnegative() })).min(1),
  valorEstimado: z.number().finite().nonnegative(),
});

export type OrcamentoInput = z.infer<typeof quoteSchema>;
export type OrcamentoStatus = "pending" | "confirmed" | "cancelled" | "completed";
export interface Orcamento extends OrcamentoInput { id: string; status: OrcamentoStatus; criadoEm: string }

export async function createOrcamento(raw: unknown): Promise<Orcamento> {
  const input = quoteSchema.parse(raw);
  const { rows } = await getPool().query(
    `INSERT INTO ${quotedDbSchema()}.orcamentos (nome, telefone, veiculo_tipo, veiculo_detalhe, servicos, valor_estimado)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [input.nome, input.telefone, input.veiculoTipo, input.veiculoDetalhe ?? null, JSON.stringify(input.servicos), input.valorEstimado]
  );
  return mapRow(rows[0]);
}

export async function listOrcamentos(): Promise<Orcamento[]> {
  const { rows } = await getPool().query(`SELECT * FROM ${quotedDbSchema()}.orcamentos ORDER BY criado_em DESC`);
  return rows.map(mapRow);
}

export async function updateOrcamentoStatus(
  id: string,
  status: OrcamentoStatus,
): Promise<Orcamento | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { rows } = await getPool().query(
    `UPDATE ${quotedDbSchema()}.orcamentos SET status = $2 WHERE id = $1 RETURNING *`,
    [id, status],
  );
  return rows[0] ? mapRow(rows[0]) : null;
}

function mapRow(row: { id: string; nome: string; telefone: string; veiculo_tipo: OrcamentoInput["veiculoTipo"]; veiculo_detalhe: OrcamentoInput["veiculoDetalhe"]; servicos: OrcamentoInput["servicos"]; valor_estimado: string; status?: OrcamentoStatus; criado_em: Date | string }): Orcamento {
  return { id: row.id, nome: row.nome, telefone: row.telefone, veiculoTipo: row.veiculo_tipo, veiculoDetalhe: row.veiculo_detalhe, servicos: row.servicos, valorEstimado: Number(row.valor_estimado), status: row.status ?? "pending", criadoEm: row.criado_em instanceof Date ? row.criado_em.toISOString() : row.criado_em };
}
