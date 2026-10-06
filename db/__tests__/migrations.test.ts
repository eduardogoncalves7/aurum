import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { migrate: runMigrations, connectWithRetry, transaction } = require("../../scripts/migrate.js");
const { getDbSchema, quotedDbSchema } = require("../schema.js");
const migrate = (pool: unknown, options: Record<string, unknown> = {}) => runMigrations(pool, { schema: "detailing", ...options });
const read = (name: string) => readFileSync(resolve("db", name), "utf8");
const legacy = ["0001_create_agendamentos.sql", "0002_create_catalog_items.sql", "0003_expand_catalog.sql"];
const databases: PGlite[] = [];
const open = () => { const db = new PGlite({ extensions: { pgcrypto } }); databases.push(db); return db; };
beforeEach(() => { vi.spyOn(console, "log").mockImplementation(() => {}); });
afterEach(async () => { vi.restoreAllMocks(); await Promise.all(databases.splice(0).map(db => db.close())); });

function poolFor(db: PGlite) {
  const query = vi.fn(async (sql: string, values?: unknown[]) => {
    if (values?.length) return db.query(sql, values);
    const results = await db.exec(sql);
    return results.at(-1) ?? { rows: [] };
  });
  const release = vi.fn();
  return { query, release, connect: async () => ({ query, release }) };
}

async function seedLegacy(db: PGlite) {
  await db.exec("CREATE TABLE public._migrations(name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())");
  for (const name of legacy) {
    await db.exec(read(`migrations/${name}`));
    await db.query("INSERT INTO public._migrations(name) VALUES ($1)", [name]);
  }
  await db.exec(`
    INSERT INTO public.agendamentos(telefone,nome,veiculo_tipo,servicos,data,horario,forma_entrega)
      VALUES ('00000000000','Fixture','car','[]','2026-10-01','10:00','dropoff');
    INSERT INTO public.catalog_items(nome,descricao_curta,categoria,veiculo_tipo,source_id)
      VALUES ('Fixture','Fixture','combos','car','fixture');
    INSERT INTO public.site_settings(chave,valor) VALUES ('fixture','preserved');
    CREATE SCHEMA financeiro;
    CREATE TABLE financeiro._migrations(name text PRIMARY KEY);
    INSERT INTO financeiro._migrations VALUES ('finance-only');
    CREATE TABLE financeiro.agendamentos(id integer PRIMARY KEY, note text);
    INSERT INTO financeiro.agendamentos VALUES (7,'untouched');
  `);
}

async function snapshot(db: PGlite, schema: "public" | "detailing") {
  const data: Record<string, unknown> = {};
  for (const table of ["_migrations", "agendamentos", "catalog_items", "site_settings"]) {
    const { rows } = await db.query(`SELECT ${table === "catalog_items"
      ? "to_jsonb(t) - ARRAY['slug','tipo_preco','beneficios','brinde','fotos','visivel_catalogo','destaque','ordem','precos_promocionais','promocao_sem_data']"
      : "to_jsonb(t)"} AS data FROM ${schema}.${table} t ORDER BY to_jsonb(t)::text`);
    data[table] = rows;
  }
  return data;
}

describe("Postgres schema migration (isolated WASM Postgres, no DATABASE_URL)", () => {
  it("defaults to public, preserves the four original tables and only creates the snapshot", async () => {
    const db = open(); await seedLegacy(db);
    const before = await snapshot(db, "public");
    const oid = (await db.query("SELECT 'public.agendamentos'::regclass::oid AS oid")).rows;
    await runMigrations(poolFor(db));
    const after = await snapshot(db, "public");
    for (const table of ["agendamentos", "catalog_items", "site_settings"]) expect(after[table]).toEqual(before[table]);
    expect((await db.query("SELECT 'public.agendamentos'::regclass::oid AS oid")).rows).toEqual(oid);
    expect((await db.query("SELECT name FROM public._migrations ORDER BY name")).rows).toEqual([...legacy, "0005_create_catalog_snapshot.sql", "0006_canonical_catalog.sql"].map(name => ({ name })));
    expect((await db.query("SELECT to_regnamespace('detailing') AS target")).rows).toEqual([{ target: null }]);
    await db.exec("INSERT INTO public.catalog_snapshot(origem,hash,conteudo) VALUES ('test','hash','{}')");
    await runMigrations(poolFor(db));
    expect(await snapshot(db, "public")).toEqual(after);
    expect((await db.query("SELECT count(*)::int AS count FROM public.catalog_snapshot")).rows).toEqual([{ count: 1 }]);
  }, 30000);
  it("can later transfer public snapshots and history to detailing without losing data", async () => {
    const db = open(); await seedLegacy(db); await runMigrations(poolFor(db));
    await db.exec("INSERT INTO public.catalog_snapshot(origem,hash,conteudo) VALUES ('test','hash','{\"preserved\":true}')");
    await expect(migrate(poolFor(db))).rejects.toThrow("AURUM_ADOPTION_REQUIRED");
    await migrate(poolFor(db), { adoptPublic: true });
    expect((await db.query("SELECT conteudo FROM detailing.catalog_snapshot")).rows).toEqual([{ conteudo: { preserved: true } }]);
    await expect(runMigrations(poolFor(db))).rejects.toThrow("AURUM_SCHEMA_SWITCH_REQUIRES_TRANSFER");
    expect((await db.query("SELECT to_regclass('public.catalog_snapshot') AS target")).rows).toEqual([{ target: null }]);
    await db.exec("INSERT INTO detailing.catalog_snapshot(origem,hash,conteudo) VALUES ('test','second','{}')");
  }, 30000);
  it("creates fresh catalogs in a configured schema and validates identifiers", async () => {
    const db = open(); await runMigrations(poolFor(db), { schema: "aurum_test" });
    expect((await db.query("SELECT count(*)::int AS count FROM aurum_test._migrations")).rows).toEqual([{ count: 5 }]);
    expect((await db.query("SELECT to_regclass('public.catalog_snapshot') AS target")).rows).toEqual([{ target: null }]);
    expect(getDbSchema()).toBe("public"); expect(quotedDbSchema("detailing")).toBe('"detailing"');
    for (const invalid of ["", "a;DROP SCHEMA public", "public,financeiro", "pg_catalog", "information_schema", "with space", "A".repeat(64)]) {
      expect(() => getDbSchema(invalid)).toThrow("AURUM_INVALID_DB_SCHEMA");
    }
    await expect(runMigrations(poolFor(db), { adoptPublic: true, schema: "public" })).rejects.toThrow("AURUM_ADOPTION_REQUIRES_DETAILING");
  }, 30000);
  it("moves all four tables with identical data/OIDs, preserves financial tables and reruns safely", async () => {
    const db = open(); await seedLegacy(db);
    const before = await snapshot(db, "public");
    const oldOid = (await db.query("SELECT 'public.agendamentos'::regclass::oid AS oid")).rows;
    const pool = poolFor(db);
    await migrate(pool, { adoptPublic: true });
    const after = await snapshot(db, "detailing");
    for (const table of ["agendamentos", "catalog_items", "site_settings"]) expect(after[table]).toEqual(before[table]);
    const history = await db.query<{ name: string }>("SELECT name FROM detailing._migrations ORDER BY name");
    expect(history.rows.map(r => r.name)).toEqual([...legacy, "0004_move_to_detailing.sql", "0005_create_catalog_snapshot.sql", "0006_canonical_catalog.sql"]);
    expect((await db.query("SELECT 'detailing.agendamentos'::regclass::oid AS oid")).rows).toEqual(oldOid);
    expect((await db.query("SELECT * FROM financeiro.agendamentos")).rows).toEqual([{ id: 7, note: "untouched" }]);
    expect((await db.query("SELECT * FROM financeiro._migrations")).rows).toEqual([{ name: "finance-only" }]);
    expect((await db.query("SELECT to_regclass('public.agendamentos') AS source")).rows).toEqual([{ source: null }]);
    await migrate(pool);
    expect(await snapshot(db, "detailing")).toEqual(after);
    await db.exec(read("migrations/0004_move_to_detailing.sql"));
    await db.exec('SET search_path TO detailing, pg_catalog');
    await db.exec(read("migrations/0005_create_catalog_snapshot.sql"));
    expect(await snapshot(db, "detailing")).toEqual(after);
    expect(pool.release).toHaveBeenCalledWith(true);
  }, 30000);

  it("requires explicit adoption and refuses foreign history without any partial move", async () => {
    const db = open(); await seedLegacy(db); const before = await snapshot(db, "public");
    await expect(migrate(poolFor(db))).rejects.toThrow("AURUM_ADOPTION_REQUIRED");
    expect(await snapshot(db, "public")).toEqual(before);
    await db.exec("INSERT INTO public._migrations(name) VALUES ('financial-migration')");
    await expect(migrate(poolFor(db), { adoptPublic: true })).rejects.toThrow("AURUM_SOURCE_HISTORY");
    expect((await db.query("SELECT to_regclass('detailing.agendamentos') AS target")).rows).toEqual([{ target: null }]);
  }, 30000);

  it("rejects destination collisions and mismatched columns without moving source data", async () => {
    const db = open(); await seedLegacy(db);
    await db.exec("CREATE SCHEMA detailing; CREATE TABLE detailing.catalog_items(secret text)");
    await expect(migrate(poolFor(db), { adoptPublic: true })).rejects.toThrow("AURUM_TARGET_CONFLICT");
    expect((await db.query("SELECT count(*)::integer AS count FROM public.catalog_items")).rows).toEqual([{ count: 1 }]);
    const other = open(); await seedLegacy(other);
    await other.exec("ALTER TABLE public.agendamentos ADD COLUMN unrelated text");
    await expect(migrate(poolFor(other), { adoptPublic: true })).rejects.toThrow("AURUM_SOURCE_SHAPE");
    expect((await other.query("SELECT to_regclass('detailing._migrations') AS target")).rows).toEqual([{ target: null }]);
  }, 30000);

  it("creates a fresh installation only in detailing and stores JSON snapshots", async () => {
    const db = open(); await migrate(poolFor(db));
    expect((await db.query("SELECT count(*)::integer AS count FROM detailing._migrations")).rows).toEqual([{ count: 6 }]);
    expect((await db.query("SELECT to_regclass('public.catalog_items') AS target")).rows).toEqual([{ target: null }]);
    const result = await db.query<{ id: number; conteudo: unknown }>("INSERT INTO detailing.catalog_snapshot(origem,hash,conteudo) VALUES ($1,$2,$3) RETURNING id,conteudo", ["test", "hash", JSON.stringify({ rows: [1] })]);
    expect(result.rows[0].conteudo).toEqual({ rows: [1] });
  }, 30000);

  it("provisions least-privilege runtime, supports restarts, blocks finance and DDL", async () => {
    const db = open(); await seedLegacy(db); await migrate(poolFor(db), { adoptPublic: true });
    await db.exec(read("ops/provision_roles.sql"));
    await db.exec(read("ops/provision_roles.sql"));
    await db.exec("SET ROLE detailing_app");
    await expect(db.query("SELECT * FROM detailing.agendamentos")).resolves.toBeDefined();
    await expect(db.query("INSERT INTO detailing.catalog_snapshot(origem,hash,conteudo) VALUES ('test','hash','{}')")).resolves.toBeDefined();
    await expect(db.query("SELECT * FROM financeiro.agendamentos")).rejects.toThrow(/permission denied/);
    await expect(db.query("CREATE TABLE detailing.forbidden(id integer)")).rejects.toThrow(/permission denied/);
    await expect(db.query("INSERT INTO detailing._migrations(name) VALUES ('forbidden')")).rejects.toThrow(/permission denied/);
    await expect(migrate(poolFor(db))).resolves.toBeUndefined();
    await db.exec("RESET ROLE");
  }, 30000);

  it("rolls back namespaces without losing rows or snapshots and can re-adopt", async () => {
    const db = open(); await seedLegacy(db); await migrate(poolFor(db), { adoptPublic: true });
    const before = await snapshot(db, "detailing");
    await db.exec("INSERT INTO detailing.catalog_snapshot(origem,hash,conteudo) VALUES ('test','hash','{}')");
    await db.exec(read("ops/rollback_to_public.sql"));
    expect(await snapshot(db, "public")).toEqual(before);
    expect((await db.query("SELECT count(*)::integer AS count FROM public.catalog_snapshot")).rows).toEqual([{ count: 1 }]);
    await migrate(poolFor(db), { adoptPublic: true });
    expect(await snapshot(db, "detailing")).toEqual(before);
  }, 30000);

  it("rolls back DDL when a migration fails and retries connections ten times", async () => {
    const db = open(); const pool = poolFor(db);
    await expect(transaction(pool, async () => {
      await db.exec("CREATE TABLE public.transaction_probe(id integer)");
      throw new Error("fixture failure");
    })).rejects.toThrow("fixture failure");
    expect((await db.query("SELECT to_regclass('public.transaction_probe') AS target")).rows).toEqual([{ target: null }]);
    const query = vi.fn().mockRejectedValue(new Error("offline")), sleep = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(console, "log").mockImplementation(() => {});
    await expect(connectWithRetry({ query }, 10, 3000, sleep)).rejects.toThrow("offline");
    expect(query).toHaveBeenCalledTimes(10); expect(sleep).toHaveBeenCalledTimes(9);
  }, 30000);

  it("keeps the Docker startup separator even when migrations exit nonzero", () => {
    const docker = readFileSync("Dockerfile", "utf8");
    expect(docker).toContain('CMD ["sh", "-c", "node scripts/migrate.js; node server.js"]');
  });
  it("does not commit DDL when recording its migration fails, then resumes", async () => {
    const db = open(); await seedLegacy(db);
    const pool = poolFor(db), original = pool.query.getMockImplementation()!;
    pool.query.mockImplementation(async (sql: string, values?: unknown[]) => {
      if (sql.startsWith('INSERT INTO "detailing"._migrations') && values?.[0] === "0005_create_catalog_snapshot.sql") throw new Error("stamp failure");
      return original(sql, values);
    });
    await expect(migrate(pool, { adoptPublic: true })).rejects.toThrow("stamp failure");
    expect((await db.query("SELECT to_regclass('detailing.catalog_snapshot') AS target")).rows).toEqual([{ target: null }]);
    expect((await db.query("SELECT count(*)::integer AS count FROM detailing._migrations")).rows).toEqual([{ count: 4 }]);
    await migrate(poolFor(db));
    expect((await db.query("SELECT count(*)::integer AS count FROM detailing._migrations")).rows).toEqual([{ count: 6 }]);
  }, 30000);
  it("refuses a busy migration lock before executing DDL and releases the client", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ acquired: false }] });
    const release = vi.fn();
    await expect(migrate({ connect: async () => ({ query, release }) })).rejects.toThrow("AURUM_MIGRATION_BUSY");
    expect(query).toHaveBeenCalledTimes(1); expect(release).toHaveBeenCalledWith(true);
  });
});
