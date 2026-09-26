import { getPool } from "@/lib/db";
import { Service, ServiceCategoryId, VehicleType } from "@/types";

// Server-only. Itens criados no /admin (serviços novos e promoções) —
// somam-se ao catálogo estático de lib/data/services.ts, nunca o
// substituem. Ver comentário no topo da migração 0002.

const MAX_NAME_LENGTH = 120;
const MAX_SHORT_DESC_LENGTH = 200;
const VALID_CATEGORIES: ServiceCategoryId[] = [
  "combos",
  "protecao",
  "limpeza_carro",
  "polimento",
  "higienizacao",
  "limpeza_moto",
  "especiais",
  "cristalizacao",
];

class ValidationError extends Error {}

export interface CatalogItemInput {
  nome: string;
  descricaoCurta: string;
  descricao?: string | null;
  categoria: ServiceCategoryId;
  subcategoria?: string | null;
  veiculoTipo: VehicleType;
  precos: Record<string, number>;
  includes?: string[];
  foto?: string | null;
  promocaoInicio?: string | null; // 'YYYY-MM-DD'
  promocaoFim?: string | null;
  ativo?: boolean;
}

export interface CatalogItem extends CatalogItemInput {
  id: string;
  criadoEm: string;
  atualizadoEm: string;
}

function validate(input: CatalogItemInput): CatalogItemInput {
  const nome = input.nome.trim().slice(0, MAX_NAME_LENGTH);
  if (!nome) throw new ValidationError("Nome é obrigatório.");

  const descricaoCurta = input.descricaoCurta.trim().slice(0, MAX_SHORT_DESC_LENGTH);
  if (!descricaoCurta) throw new ValidationError("Descrição curta é obrigatória.");

  if (!VALID_CATEGORIES.includes(input.categoria)) {
    throw new ValidationError("Categoria inválida.");
  }

  if (input.veiculoTipo !== "car" && input.veiculoTipo !== "motorcycle") {
    throw new ValidationError("Tipo de veículo inválido.");
  }

  const expectedKeys =
    input.veiculoTipo === "car" ? ["hatch_sedan", "suv", "pickup"] : ["motorcycle"];
  const precos: Record<string, number> = {};
  for (const key of expectedKeys) {
    const value = Number(input.precos?.[key]);
    if (!Number.isFinite(value) || value < 0) {
      throw new ValidationError(
        `Preço inválido para "${key}" — informe um valor maior ou igual a zero para cada categoria de veículo.`
      );
    }
    precos[key] = value;
  }

  const promocaoInicio = input.promocaoInicio || null;
  const promocaoFim = input.promocaoFim || null;
  if ((promocaoInicio && !promocaoFim) || (!promocaoInicio && promocaoFim)) {
    throw new ValidationError("Informe início e fim da promoção, ou deixe os dois em branco.");
  }
  if (promocaoInicio && promocaoFim) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(promocaoInicio) || !/^\d{4}-\d{2}-\d{2}$/.test(promocaoFim)) {
      throw new ValidationError("Datas de promoção inválidas.");
    }
    if (promocaoFim < promocaoInicio) {
      throw new ValidationError("A data final da promoção não pode ser antes do início.");
    }
  }

  const includes = Array.isArray(input.includes)
    ? input.includes.map((i) => String(i).trim()).filter(Boolean).slice(0, 20)
    : [];

  const foto = input.foto && input.foto.startsWith("/uploads/") ? input.foto : null;

  return {
    nome,
    descricaoCurta,
    descricao: input.descricao?.trim() || null,
    categoria: input.categoria,
    subcategoria: input.subcategoria?.trim().slice(0, 60) || null,
    veiculoTipo: input.veiculoTipo,
    precos,
    includes,
    foto,
    promocaoInicio,
    promocaoFim,
    ativo: input.ativo ?? true,
  };
}

export async function createCatalogItem(raw: CatalogItemInput): Promise<CatalogItem> {
  const input = validate(raw);
  const pool = getPool();
  const result = await pool.query(
    `INSERT INTO catalog_items
      (nome, descricao_curta, descricao, categoria, subcategoria, veiculo_tipo, precos, includes, foto, promocao_inicio, promocao_fim, ativo)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING *`,
    [
      input.nome,
      input.descricaoCurta,
      input.descricao,
      input.categoria,
      input.subcategoria,
      input.veiculoTipo,
      JSON.stringify(input.precos),
      input.includes,
      input.foto,
      input.promocaoInicio,
      input.promocaoFim,
      input.ativo,
    ]
  );
  return mapRow(result.rows[0]);
}

export async function updateCatalogItem(
  id: string,
  raw: CatalogItemInput
): Promise<CatalogItem> {
  const input = validate(raw);
  const pool = getPool();
  const result = await pool.query(
    `UPDATE catalog_items SET
      nome = $2, descricao_curta = $3, descricao = $4, categoria = $5,
      subcategoria = $6, veiculo_tipo = $7, precos = $8, includes = $9,
      foto = $10, promocao_inicio = $11, promocao_fim = $12, ativo = $13,
      atualizado_em = now()
     WHERE id = $1
     RETURNING *`,
    [
      id,
      input.nome,
      input.descricaoCurta,
      input.descricao,
      input.categoria,
      input.subcategoria,
      input.veiculoTipo,
      JSON.stringify(input.precos),
      input.includes,
      input.foto,
      input.promocaoInicio,
      input.promocaoFim,
      input.ativo,
    ]
  );
  if (result.rows.length === 0) throw new ValidationError("Item não encontrado.");
  return mapRow(result.rows[0]);
}

export async function deleteCatalogItem(id: string): Promise<void> {
  const pool = getPool();
  await pool.query(`DELETE FROM catalog_items WHERE id = $1`, [id]);
}

/** Tudo, inclusive inativos/expirados — só pro /admin. */
export async function listAllCatalogItems(): Promise<CatalogItem[]> {
  const pool = getPool();
  const result = await pool.query(`SELECT * FROM catalog_items ORDER BY criado_em DESC`);
  return result.rows.map(mapRow);
}

/** Só o que deve aparecer no site: ativo, e (sem datas de promoção OU
 * dentro da janela de datas). Promoção fora da janela some sozinha. */
export async function listPublicCatalogItems(): Promise<CatalogItem[]> {
  const pool = getPool();
  const result = await pool.query(
    `SELECT * FROM catalog_items
     WHERE ativo = true
       AND (
         (promocao_inicio IS NULL AND promocao_fim IS NULL)
         OR (to_char(CURRENT_DATE, 'YYYY-MM-DD') BETWEEN promocao_inicio AND promocao_fim)
       )
     ORDER BY criado_em DESC`
  );
  return result.rows.map(mapRow);
}

export function isPromotion(item: CatalogItem): boolean {
  return !!(item.promocaoInicio && item.promocaoFim);
}

/** Converte um CatalogItem (banco) pro formato Service que o resto do site
 * já sabe renderizar (ServiceCard, ServiceListItem, calculateQuoteTotal...). */
export function catalogItemToService(item: CatalogItem): Service {
  const isCar = item.veiculoTipo === "car";
  return {
    id: item.id,
    category: item.categoria,
    subcategory: item.subcategoria ?? undefined,
    name: item.nome,
    shortDescription: item.descricaoCurta,
    description: item.descricao ?? undefined,
    image: item.foto ?? undefined,
    pricingType: "vehicle_category",
    vehicleDimension: isCar ? "body" : "motorcycle",
    prices: item.precos,
    includes: item.includes && item.includes.length > 0 ? item.includes : undefined,
    vehicleTypes: [item.veiculoTipo],
  };
}

interface CatalogItemRow {
  id: string;
  nome: string;
  descricao_curta: string;
  descricao: string | null;
  categoria: ServiceCategoryId;
  subcategoria: string | null;
  veiculo_tipo: VehicleType;
  precos: Record<string, number>;
  includes: string[];
  foto: string | null;
  promocao_inicio: string | null;
  promocao_fim: string | null;
  ativo: boolean;
  criado_em: string | Date;
  atualizado_em: string | Date;
}

function mapRow(row: CatalogItemRow): CatalogItem {
  return {
    id: row.id,
    nome: row.nome,
    descricaoCurta: row.descricao_curta,
    descricao: row.descricao,
    categoria: row.categoria,
    subcategoria: row.subcategoria,
    veiculoTipo: row.veiculo_tipo,
    precos: row.precos,
    includes: row.includes,
    foto: row.foto,
    promocaoInicio: row.promocao_inicio,
    promocaoFim: row.promocao_fim,
    ativo: row.ativo,
    criadoEm: row.criado_em instanceof Date ? row.criado_em.toISOString() : row.criado_em,
    atualizadoEm:
      row.atualizado_em instanceof Date ? row.atualizado_em.toISOString() : row.atualizado_em,
  };
}

export { ValidationError };
