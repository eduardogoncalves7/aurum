#!/usr/bin/env node
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { Pool } = require("pg");
const { getDbSchema, quotedDbSchema } = require("../db/schema");
const BOOTSTRAP = "0004_move_to_detailing.sql";
const OWNER_MARK = "aurum-detailing:migrations:v1";

async function connectWithRetry(pool, attempts = 10, delayMs = 3000, sleep = ms => new Promise(resolve => setTimeout(resolve, ms))) {
  for (let i = 1; i <= attempts; i++) {
    try { await pool.query("SELECT 1"); return; }
    catch (err) {
      if (i === attempts) throw err;
      console.log(`Postgres indisponível (tentativa ${i}/${attempts}); nova tentativa em ${delayMs / 1000}s.`);
      await sleep(delayMs);
    }
  }
}

async function transaction(client, work, schema = getDbSchema()) {
  await client.query("BEGIN");
  try {
    // Historical files remain immutable; unqualified DDL is scoped here.
    await client.query(`SET LOCAL search_path TO ${quotedDbSchema(schema)}, pg_catalog`);
    await client.query("SET LOCAL lock_timeout = '5s'");
    await client.query("SET LOCAL statement_timeout = '20s'");
    await work();
    await client.query("COMMIT");
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch { /* Broken connection is destroyed. */ }
    throw error;
  }
}

async function migrate(pool, { adoptPublic = false, schema = getDbSchema(), migrationsDir = path.join(__dirname, "..", "db", "migrations") } = {}) {
  schema = getDbSchema(schema);
  const qualified = quotedDbSchema(schema);
  if (adoptPublic && schema !== "detailing") throw new Error("AURUM_ADOPTION_REQUIRES_DETAILING");
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith(".sql")).sort();
  const client = await pool.connect();
  try {
    // Dedicated connection and a nonblocking session lock across all files.
    const { rows: lock } = await client.query("SELECT pg_try_advisory_lock(16777241, 41004) AS acquired");
    if (!lock[0]?.acquired) throw new Error("AURUM_MIGRATION_BUSY");
    const { rows: ownership } = await client.query("SELECT to_regclass($1) AS history, obj_description(to_regclass($1), 'pg_class') AS marker", [`${qualified}._migrations`]);
    if (schema === "detailing" && ownership[0]?.marker !== OWNER_MARK) {
      await transaction(client, async () => {
        await client.query("SELECT set_config('detailing.adopt_public', $1, true)", [adoptPublic ? "on" : "off"]);
        await client.query(fs.readFileSync(path.join(migrationsDir, BOOTSTRAP), "utf8"));
        await client.query(`INSERT INTO ${qualified}._migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`, [BOOTSTRAP]);
      }, schema);
    } else if (!ownership[0]?.history) {
      await transaction(client, async () => {
        // Refuse to hide an existing catalog by accidentally selecting a new schema.
        if (schema !== "public") {
          const { rows } = await client.query("SELECT to_regclass('public.agendamentos') AS legacy");
          if (rows[0]?.legacy) throw new Error("AURUM_SCHEMA_SWITCH_REQUIRES_TRANSFER");
        } else {
          const { rows } = await client.query("SELECT to_regclass('detailing.agendamentos') AS legacy");
          if (rows[0]?.legacy) throw new Error("AURUM_SCHEMA_SWITCH_REQUIRES_TRANSFER");
        }
        const { rows } = await client.query("SELECT to_regnamespace($1) AS namespace", [schema]);
        if (!rows[0]?.namespace) await client.query(`CREATE SCHEMA IF NOT EXISTS ${qualified}`);
        await client.query(`CREATE TABLE ${qualified}._migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);
      }, schema);
    }
    for (const file of files) {
      // 0004 is a manual transfer, never a normal startup migration in public.
      if (file === BOOTSTRAP) continue;
      const { rows } = await client.query(`SELECT 1 FROM ${qualified}._migrations WHERE name = $1`, [file]);
      if (rows.length) { console.log(`(ok) ${file} já aplicada`); continue; }
      console.log(`Aplicando ${file}...`);
      await transaction(client, async () => {
        await client.query(fs.readFileSync(path.join(migrationsDir, file), "utf8"));
        await client.query(`INSERT INTO ${qualified}._migrations (name) VALUES ($1)`, [file]);
      }, schema);
    }
    console.log("Migrações concluídas.");
  } finally {
    // Closing also releases the advisory lock, including on errors.
    client.release(true);
  }
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("AURUM_DATABASE_URL_MISSING");
  const args = process.argv.slice(2);
  const schema = getDbSchema();
  if (args.some(arg => arg !== "--adopt-public")) throw new Error("AURUM_INVALID_ARGUMENT");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 3000,
    statement_timeout: 20000, query_timeout: 25000, max: 1, options: `-c search_path=${schema},pg_catalog` });
  // Bound startup even if socket shutdown or a migration hangs. Docker retains
  // '; node server.js', so a nonzero migration exit never prevents server start.
  const deadline = setTimeout(() => {
    console.error("Migração excedeu 120s; o servidor continuará a inicialização.");
    process.exit(1);
  }, 120000);
  deadline.unref();
  try { await connectWithRetry(pool); await migrate(pool, { schema, adoptPublic: args.includes("--adopt-public") }); }
  finally { await pool.end(); clearTimeout(deadline); }
}
if (require.main === module) {
  main().catch(error => {
    // No URLs, arbitrary SQL error detail, credentials or row values in logs.
    const reason = String(error.message ?? "").match(/AURUM_[A-Z_]+/)?.[0];
    const code = typeof error.code === "string" && /^[A-Z0-9]{5}$/.test(error.code) ? error.code : "UNKNOWN";
    console.error(`Falha na migração (${reason ?? code}); consulte db/README.md. O servidor continuará a inicialização.`);
    process.exitCode = 1;
  });
}
module.exports = { migrate, connectWithRetry, transaction };
