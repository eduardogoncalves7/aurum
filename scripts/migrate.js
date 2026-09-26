#!/usr/bin/env node
// Roda todas as migrações de db/migrations em ordem, uma única vez cada
// (registradas na tabela _migrations). Pensado pra rodar no start do
// container, antes do `node server.js` — ver Dockerfile.
"use strict";

const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

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
