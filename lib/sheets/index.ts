import { z } from "zod";
import { createTransport, type TransportOptions } from "./transport";
import { serviceRowSchema, SheetsError, type RowError, type RowInput, type ServiceRow } from "./schema";
export { SheetsError, serviceRowSchema } from "./schema";
export type { ServiceRow, RowInput, RowError } from "./schema";

type Cell = string | number | boolean;
const valuesSchema = z.object({ values: z.array(z.array(z.union([z.string(), z.number(), z.boolean(), z.null()]))).optional().default([]) });
const quote = (name: string) => `'${name.replace(/'/g, "''")}'`;
export function columnName(index: number): string {
  let result = "";
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) result = String.fromCharCode(65 + (n - 1) % 26) + result;
  return result;
}
function headers(row: unknown[], required: string[]) {
  const names = row.map(value => String(value ?? "").trim());
  const present = names.filter(Boolean);
  if (new Set(present).size !== present.length || required.some(key => !names.includes(key))) throw new SheetsError("SCHEMA");
  return names;
}
function record(names: string[], row: unknown[]) {
  return Object.fromEntries(names.filter(Boolean).map(name => [name, row[names.indexOf(name)] ?? ""]));
}
export interface LogEntry { data?: string; origem: string; acao: string; id: string; resultado: string }
export interface WriteOptions { updatedBy?: string }

/** Node runtime only. No network or environment validation occurs at import time. */
export function createSheetsClient(options: TransportOptions & { env?: Record<string, string | undefined>; updatedBy?: string } = {}) {
  const env = options.env ?? process.env;
  const api = createTransport(env, options);
  const now = () => new Date((options.now ?? Date.now)()).toISOString();
  // Serialize mutations in this process to avoid allocating the same new row twice.
  let queue: Promise<unknown> = Promise.resolve();
  function serial<T>(work: () => Promise<T>): Promise<T> {
    const result = queue.then(work);
    queue = result.catch(() => undefined);
    return result;
  }
  async function resolveSheetName(gid: string | number): Promise<string> {
    if (!/^\d+$/.test(String(gid))) throw new SheetsError("CONFIG");
    const result = z.object({ sheets: z.array(z.object({ properties: z.object({ sheetId: z.number(), title: z.string() }) })) }).safeParse(await api("?fields=sheets.properties"));
    if (!result.success) throw new SheetsError("RESPONSE");
    const sheet = result.data.sheets.find(s => s.properties.sheetId === Number(gid));
    if (!sheet) throw new SheetsError("NOT_FOUND");
    return sheet.properties.title;
  }
  async function serviceTab() {
    const gid = env.GOOGLE_SERVICES_SHEET_GID;
    if (!gid) throw new SheetsError("CONFIG");
    return resolveSheetName(gid);
  }
  async function read(name: string, range: string) {
    const parsed = valuesSchema.safeParse(await api(`/values/${encodeURIComponent(`${quote(name)}!${range}`)}?valueRenderOption=UNFORMATTED_VALUE`));
    if (!parsed.success) throw new SheetsError("RESPONSE");
    return parsed.data.values;
  }
  async function update(name: string, range: string, values: Cell[][]) {
    await api(`/values/${encodeURIComponent(`${quote(name)}!${range}`)}?valueInputOption=RAW`, { method: "PUT", body: JSON.stringify({ values }) });
  }
  async function readServiceRows(): Promise<{ rows: ServiceRow[]; errors: RowError[] }> {
    const table = await read(await serviceTab(), "A1:ZZ");
    const names = headers(table[0] ?? [], ["id", "servico"]);
    const rows: ServiceRow[] = [], errors: RowError[] = [];
    const seen = new Set<string>();
    table.slice(1).forEach((row, index) => {
      const value = record(names, row);
      if (!String(value.id).trim() || !String(value.servico).trim()) return;
      const parsed = serviceRowSchema.safeParse(value);
      if (!parsed.success) errors.push({ row: index + 2, code: "INVALID_ROW", fields: [...new Set(parsed.error.issues.map(i => i.path.join(".")))] });
      else if (seen.has(parsed.data.id)) errors.push({ row: index + 2, code: "INVALID_ROW", fields: ["id"] });
      else { rows.push(parsed.data); seen.add(parsed.data.id); }
    });
    return { rows, errors };
  }
  async function writeRows(rows: RowInput[], writeOptions: WriteOptions = {}, mustExist = false) {
    if (!rows.length) return;
    const name = await serviceTab();
    const names = headers((await read(name, "A1:ZZ1"))[0] ?? [], ["id", "servico", "atualizado_em", "atualizado_por"]);
    const idColumn = columnName(names.indexOf("id"));
    const ids = await read(name, `${idColumn}2:${idColumn}`);
    const locations = new Map<string, number>();
    let next = 2;
    ids.forEach((row, i) => {
      const id = String(row[0] ?? "").trim();
      if (id) {
        if (locations.has(id)) throw new SheetsError("CONFLICT");
        locations.set(id, i + 2); next = i + 3;
      }
    });
    const inputs = new Set<string>();
    const data: { range: string; values: Cell[][] }[] = [];
    const inserts: { line: number; values: Cell[] }[] = [];
    for (const row of rows) {
      if (typeof row.id !== "string" || !row.id.trim() || inputs.has(row.id.trim())) throw new SheetsError("SCHEMA");
      const id = row.id.trim(); inputs.add(id);
      if (mustExist && !locations.has(id)) throw new SheetsError("NOT_FOUND");
      const patch = Object.fromEntries(Object.entries(row).filter(([, v]) => v !== undefined));
      patch.id = id;
      patch.atualizado_em = now();
      patch.atualizado_por = writeOptions.updatedBy ?? options.updatedBy ?? "admin";
      if (!String(patch.atualizado_por).trim()) throw new SheetsError("SCHEMA");
      const parsed = serviceRowSchema.partial().strict().safeParse(patch);
      if (!parsed.success || Object.keys(patch).some(key => !names.includes(key))) throw new SheetsError("SCHEMA");
      const existing = locations.get(id);
      if (!existing && !serviceRowSchema.safeParse(patch).success) throw new SheetsError("SCHEMA");
      const line = existing ?? next++;
      locations.set(id, line);
      const newValues: Cell[] = names.map(() => "");
      for (const key of Object.keys(patch)) {
        const value = parsed.data[key as keyof ServiceRow];
        const cell = Array.isArray(value) ? value.join("; ") : value ?? "";
        if (existing) data.push({ range: `${quote(name)}!${columnName(names.indexOf(key))}${line}`, values: [[cell]] });
        else newValues[names.indexOf(key)] = cell;
      }
      if (!existing) inserts.push({ line, values: newValues });
    }
    // Batch the equivalent values.update operations; never infer table bounds with append.
    if (data.length) await api("/values:batchUpdate", { method: "POST", body: JSON.stringify({ valueInputOption: "RAW", data }) });
    for (const insert of inserts) await update(name, `A${insert.line}:${columnName(names.length - 1)}${insert.line}`, [insert.values]);
  }
  function upsertRows(rows: RowInput[], writeOptions?: WriteOptions) { return serial(() => writeRows(rows, writeOptions)); }
  function setActive(id: string, active: boolean, writeOptions?: WriteOptions) { return serial(() => writeRows([{ id, ativo: active }], writeOptions, true)); }
  async function readAuxTab(name: "Portes" | "Categorias" | "Config") {
    const schemas = {
      Portes: z.object({ porte_site: z.string().min(1), classificacao_planilha: z.string().min(1), compatibilidade: z.enum(["Carro", "Moto"]) }),
      Categorias: z.object({ categoria: z.string().min(1), ordem: serviceRowSchema.shape.ordem, compatibilidade: z.enum(["Carro", "Moto"]), ativo: serviceRowSchema.shape.ativo }),
      Config: z.object({ chave: z.string().min(1), valor: z.union([z.string(), z.number(), z.boolean()]) }),
    };
    if (!Object.hasOwn(schemas, name)) throw new SheetsError("SCHEMA");
    const schema = schemas[name];
    const table = await read(name, "A1:ZZ");
    const names = headers(table[0] ?? [], Object.keys(schema.shape));
    const rows: Record<string, unknown>[] = [], errors: RowError[] = [];
    table.slice(1).forEach((row, index) => {
      if (row.every(v => v === "" || v === null || v === false)) return;
      const parsed = schema.safeParse(record(names, row));
      if (parsed.success) rows.push(parsed.data);
      else errors.push({ row: index + 2, code: "INVALID_ROW", fields: parsed.error.issues.map(i => i.path.join(".")) });
    });
    return { rows, errors };
  }
  async function appendLog(entry: LogEntry): Promise<void> {
    try {
      await serial(async () => {
        const table = await read("Log_Sync", "A1:ZZ");
        const names = headers(table[0] ?? [], ["data", "origem", "acao", "id", "resultado"]);
        let line = 2;
        table.slice(1).forEach((row, i) => { if (row.some(v => v !== "" && v !== null)) line = i + 3; });
        const value = { ...entry, data: entry.data ?? now() };
        await update("Log_Sync", `A${line}:${columnName(names.length - 1)}${line}`, [names.map(key => value[key as keyof LogEntry] ?? "")]);
      });
    } catch { /* Logging is best effort; never expose Google bodies or credentials. */ }
  }
  return { resolveSheetName, readServiceRows, upsertRows, setActive, readAuxTab, appendLog };
}

let client: ReturnType<typeof createSheetsClient> | undefined;
const getClient = () => client ??= createSheetsClient();
export const resolveSheetName = (gid: string | number) => getClient().resolveSheetName(gid);
export const readServiceRows = () => getClient().readServiceRows();
export const upsertRows = (rows: RowInput[], options?: WriteOptions) => getClient().upsertRows(rows, options);
export const setActive = (id: string, active: boolean, options?: WriteOptions) => getClient().setActive(id, active, options);
export const readAuxTab = (name: "Portes" | "Categorias" | "Config") => getClient().readAuxTab(name);
export const appendLog = (entry: LogEntry) => getClient().appendLog(entry);
