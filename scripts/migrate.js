#!/usr/bin/env node
// Roda todas as migrações de db/migrations em ordem, uma única vez cada
// (registradas na tabela _migrations). Pensado pra rodar no start do
// container, antes do `node server.js` — ver Dockerfile.
"use strict";

const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

async function connectWithRetry(pool, attempts = 10, delayMs = 3000) {
  for (let i = 1; i <= attempts; i++) {
    try {
      await pool.query("SELECT 1");
      return;
    } catch (err) {
      if (i === attempts) throw err;
      console.log(
        `Postgres ainda não respondeu (tentativa ${i}/${attempts}) — tentando de novo em ${delayMs / 1000}s...`
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error(
      "DATABASE_URL não definida — configure a connection string do Postgres antes de rodar as migrações."
    );
    process.exit(1);
  }

  const pool = new Pool({ connectionString });
  const migrationsDir = path.join(__dirname, "..", "db", "migrations");
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  try {
    // No primeiro deploy, é comum o container do app subir antes do banco
    // do Coolify terminar de inicializar — sem isso, a migração falhava de
    // cara com ECONNREFUSED mesmo com DATABASE_URL certa.
    await connectWithRetry(pool);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    for (const file of files) {
      const { rows } = await pool.query(
        "SELECT 1 FROM _migrations WHERE name = $1",
        [file]
      );
      if (rows.length > 0) {
        console.log(`(ok) ${file} já aplicada`);
        continue;
      }

      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
      console.log(`Aplicando ${file}...`);
      await pool.query(sql);
      await pool.query("INSERT INTO _migrations (name) VALUES ($1)", [file]);
    }

    console.log("Migrações concluídas.");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Falha ao rodar migrações:", err);
  process.exit(1);
});
