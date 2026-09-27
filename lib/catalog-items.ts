import { getPool } from "@/lib/db";
import { Service, ServiceCategoryId, VehicleType } from "@/types";
import { services as factoryServices } from "@/lib/data/services";

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
let factoryCatalogSeeded = false;

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
  variantes?: NonNullable<Service["variants"]>;
  detalhes?: Partial<Service>;
}

export interface CatalogItem extends CatalogItemInput {
  id: string;
  criadoEm: string;
  atualizadoEm: string;
}

/** Importa o catálogo que antes existia apenas no código. IDs estáveis mantêm
 * os links e as seleções dos orçamentos funcionando após a migração. */
async function ensureFactoryCatalog(): Promise<void> {
  if (factoryCatalogSeeded) return;
  const pool = getPool();
  for (const service of factoryServices) {
    const vehicleType = service.vehicleTypes?.[0] ?? "car";
    const prices = service.prices ?? (service.fixedPrice !== undefined
      ? { fixed: service.fixedPrice }
      : { starting_at: service.startingPrice ?? 0 });
    await pool.query(
      `INSERT INTO catalog_items
       (source_id, nome, descricao_curta, descricao, categoria, subcategoria, veiculo_tipo, precos, includes, foto, ativo, service_data, variantes, opcoes_preco)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true,$11,$12,$13)
       ON CONFLICT (source_id) DO NOTHING`,
      [service.id, service.name, service.shortDescription || service.name, service.description ?? null,
        service.category, service.subcategory ?? null, vehicleType, JSON.stringify(prices),
        service.includes ?? [], service.image ?? null, JSON.stringify(service),
        JSON.stringify(service.variants ?? []), JSON.stringify(service.priceBreakdown ?? [])]
    );
  }
  factoryCatalogSeeded = true;
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

  const precos: Record<string, number> = {};
  for (const [key, rawValue] of Object.entries(input.precos ?? {})) {
    const value = Number(rawValue);
    if (key && Number.isFinite(value) && value >= 0) precos[key] = value;
  }
  if (!Object.keys(precos).length && !input.variantes?.length) {
    throw new ValidationError("Informe ao menos um preço ou uma variante com preço.");
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
    for (const date of [promocaoInicio, promocaoFim]) {
      const parsed = new Date(`${date}T00:00:00.000Z`);
      if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== date) {
        throw new ValidationError("Informe datas validas no formato dd/mm/aaaa.");
      }
    }
    if (promocaoFim < promocaoInicio) {
      throw new ValidationError("A data final da promoção não pode ser antes do início.");
    }
  }

  const includes = Array.isArray(input.includes)
    ? input.includes.map((i) => String(i).trim()).filter(Boolean).slice(0, 20)
    : [];

  for (const variant of input.variantes ?? []) {
    if (!variant.id?.trim() || !variant.label?.trim() || !variant.prices || !Object.values(variant.prices).some((price) => Number.isFinite(Number(price)) && Number(price) >= 0)) {
      throw new ValidationError("Cada opcao precisa de um nome e pelo menos um preco valido.");
    }
  }
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
    variantes: input.variantes ?? [],
    detalhes: input.detalhes ?? {},
  };
}

export async function createCatalogItem(raw: CatalogItemInput): Promise<CatalogItem> {
  const input = validate(raw);
  const pool = getPool();
  const result = await pool.query(
    `INSERT INTO catalog_items
      (nome, descricao_curta, descricao, categoria, subcategoria, veiculo_tipo, precos, includes, foto, promocao_inicio, promocao_fim, ativo, service_data, variantes, opcoes_preco)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
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
      JSON.stringify(input.detalhes ?? {}),
      JSON.stringify(input.variantes ?? []),
      JSON.stringify(input.detalhes?.priceBreakdown ?? []),
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
      service_data = $14, variantes = $15, opcoes_preco = $16,
      atualizado_em = now()
     WHERE COALESCE(source_id, id::text) = $1
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
      JSON.stringify(input.detalhes ?? {}),
      JSON.stringify(input.variantes ?? []),
      JSON.stringify(input.detalhes?.priceBreakdown ?? []),
    ]
  );
  if (result.rows.length === 0) throw new ValidationError("Item não encontrado.");
  return mapRow(result.rows[0]);
}

export async function deleteCatalogItem(id: string): Promise<void> {
  const pool = getPool();
  const result = await pool.query(
    `UPDATE catalog_items SET ativo = false, atualizado_em = now() WHERE source_id = $1`,
    [id]
  );
  if (!result.rowCount) {
    await pool.query(`DELETE FROM catalog_items WHERE id::text = $1`, [id]);
  }
}

/** Tudo, inclusive inativos/expirados — só pro /admin. */
export async function listAllCatalogItems(): Promise<CatalogItem[]> {
  await ensureFactoryCatalog();
  const pool = getPool();
  const result = await pool.query(`SELECT * FROM catalog_items ORDER BY criado_em DESC`);
  return result.rows.map(mapRow);
}

/** Só o que deve aparecer no site: ativo, e (sem datas de promoção OU
 * dentro da janela de datas). Promoção fora da janela some sozinha. */
export async function listPublicCatalogItems(): Promise<CatalogItem[]> {
  await ensureFactoryCatalog();
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

export async function listManagedCatalogIds(): Promise<string[]> {
  await ensureFactoryCatalog();
  const { rows } = await getPool().query(`SELECT COALESCE(source_id, id::text) AS id FROM catalog_items`);
  return rows.map((row: { id: string }) => row.id);
}

export function isPromotion(item: CatalogItem): boolean {
  return !!(item.promocaoInicio && item.promocaoFim);
}

/** Converte um CatalogItem (banco) pro formato Service que o resto do site
 * já sabe renderizar (ServiceCard, ServiceListItem, calculateQuoteTotal...). */
export function catalogItemToService(item: CatalogItem): Service {
  if (item.detalhes && Object.keys(item.detalhes).length) {
    return {
      ...item.detalhes,
      id: item.id,
      category: item.categoria,
      subcategory: item.subcategoria ?? undefined,
      name: item.nome,
      shortDescription: item.descricaoCurta,
      description: item.descricao ?? undefined,
      image: item.foto ?? item.detalhes.image,
      prices: item.precos,
      variants: item.variantes?.length ? item.variantes : item.detalhes.variants,
      priceBreakdown: item.detalhes.priceBreakdown,
      vehicleTypes: [item.veiculoTipo],
      includes: item.includes,
    } as Service;
  }
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
    variants: item.variantes,
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
  source_id: string | null;
  service_data: Partial<Service>;
  variantes: NonNullable<Service["variants"]>;
}

function mapRow(row: CatalogItemRow): CatalogItem {
  return {
    id: row.source_id ?? row.id,
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
    detalhes: row.service_data,
    variantes: row.variantes,
    criadoEm: row.criado_em instanceof Date ? row.criado_em.toISOString() : row.criado_em,
    atualizadoEm:
      row.atualizado_em instanceof Date ? row.atualizado_em.toISOString() : row.atualizado_em,
  };
}

export { ValidationError };
