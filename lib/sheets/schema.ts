import { z } from "zod";

const blank = (v: unknown) => v === "" || v === null || v === undefined;
const number = z.preprocess((v) => {
  if (blank(v)) return undefined;
  if (typeof v !== "string") return v;
  const text = v.trim().replace(/^R\$\s*/, "");
  return Number(text.includes(",") ? text.replace(/\./g, "").replace(",", ".") : text);
}, z.number().finite().nonnegative().optional());
const boolean = z.preprocess((v) => {
  if (blank(v)) return false;
  if (typeof v === "string" && /^(true|false)$/i.test(v.trim())) return v.trim().toLowerCase() === "true";
  return v;
}, z.boolean());
const list = z.preprocess((v) => blank(v) ? [] : typeof v === "string" ? v.split(";").map(s => s.trim()).filter(Boolean) : v, z.array(z.string()));
const text = z.string().default("");

export const serviceRowSchema = z.object({
  id: z.string().trim().min(1), servico: z.string().trim().min(1),
  compatibilidade: z.enum(["Carro", "Moto"]),
  classificacao: z.enum(["Hatch / Sedan", "SUV", "Caminhonete", "Carro Pequeno", "Carro Médio", "Carro Grande", "Automóvel", "Moto"]),
  tipo_preco: z.enum(["Fixo", "A partir de", "Sob consulta"]),
  preco: number, preco_promocional: number, ordem: number,
  tipo_item: z.enum(["principal", "adicional", "combo", "kit", "vitrine", "promocao"]),
  ativo: boolean, visivel_catalogo: boolean, destaque: boolean,
  inclusos: list, beneficios: list, brinde: list,
  categoria: text, observacao: text, servico_id: text, descricao: text,
  grupo_orcamento: text, imagem_url: text, promo_inicio: text, promo_fim: text,
  atualizado_em: text, atualizado_por: text, legacy_id: text, descricao_curta: text,
});

export type ServiceRow = z.infer<typeof serviceRowSchema>;
export type RowInput = { id: string } & Partial<Record<keyof ServiceRow, unknown>>;
export interface RowError { row: number; fields: string[]; code: "INVALID_ROW" }
export type ErrorCode = "CONFIG" | "AUTH" | "HTTP" | "TIMEOUT" | "NETWORK" | "RESPONSE" | "SCHEMA" | "NOT_FOUND" | "CONFLICT";
export class SheetsError extends Error {
  constructor(public readonly code: ErrorCode, public readonly status?: number) {
    super(`Sheets: ${code}${status ? ` (${status})` : ""}`);
    this.name = "SheetsError";
  }
}
