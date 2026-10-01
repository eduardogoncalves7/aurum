#!/usr/bin/env node
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { Pool } = require("pg");
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

async function transaction(client, work) {
  await client.query("BEGIN");
  try {
    // Historical files remain immutable; unqualified DDL is scoped here.
    await client.query("SET LOCAL search_path TO detailing, pg_catalog");
    await client.query("SET LOCAL lock_timeout = '5s'");
    await client.query("SET LOCAL statement_timeout = '20s'");
    await work();
    await client.query("COMMIT");
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch { /* Broken connection is destroyed. */ }
    throw error;
  }
}

async function migrate(pool, { adoptPublic = false, migrationsDir = path.join(__dirname, "..", "db", "migrations") } = {}) {
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith(".sql")).sort();
  const client = await pool.connect();
  try {
    // Dedicated connection and a nonblocking session lock across all files.
    const { rows: lock } = await client.query("SELECT pg_try_advisory_lock(16777241, 41004) AS acquired");
    if (!lock[0]?.acquired) throw new Error("AURUM_MIGRATION_BUSY");
    const { rows: ownership } = await client.query("SELECT obj_description(to_regclass('detailing._migrations'), 'pg_class') AS marker");
    if (ownership[0]?.marker !== OWNER_MARK) {
      await transaction(client, async () => {
        await client.query("SELECT set_config('detailing.adopt_public', $1, true)", [adoptPublic ? "on" : "off"]);
        await client.query(fs.readFileSync(path.join(migrationsDir, BOOTSTRAP), "utf8"));
        await client.query("INSERT INTO detailing._migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING", [BOOTSTRAP]);
      });
    }
    for (const file of files) {
      const { rows } = await client.query("SELECT 1 FROM detailing._migrations WHERE name = $1", [file]);
      if (rows.length) { console.log(`(ok) ${file} já aplicada`); continue; }
      console.log(`Aplicando ${file}...`);
      await transaction(client, async () => {
        await client.query(fs.readFileSync(path.join(migrationsDir, file), "utf8"));
        await client.query("INSERT INTO detailing._migrations (name) VALUES ($1)", [file]);
      });
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
  if (args.some(arg => arg !== "--adopt-public")) throw new Error("AURUM_INVALID_ARGUMENT");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 3000,
    statement_timeout: 20000, query_timeout: 25000, max: 1, options: "-c search_path=detailing,pg_catalog" });
  // Bound startup even if socket shutdown or a migration hangs. Docker retains
  // '; node server.js', so a nonzero migration exit never prevents server start.
  const deadline = setTimeout(() => {
    console.error("Migração excedeu 120s; o servidor continuará a inicialização.");
    process.exit(1);
  }, 120000);
  deadline.unref();
  try { await connectWithRetry(pool); await migrate(pool, { adoptPublic: args.includes("--adopt-public") }); }
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
