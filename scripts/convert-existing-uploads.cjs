"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const sharp = require("sharp");
const { Pool } = require("pg");
const { getDbSchema, quotedDbSchema } = require("../db/schema");

const TARGET_SIZE_BYTES = 300 * 1024;
const DIMENSIONS = [1920, 1632, 1387, 1280];
const QUALITIES = [82, 74, 66];
const UUID_IMAGE = /^([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\.(jpg|png)$/i;

async function optimize(input) {
  const image = sharp(input, { limitInputPixels: 40_000_000, failOn: "warning" });
  const metadata = await image.metadata();
  if (!new Set(["jpeg", "png"]).has(metadata.format) || (metadata.pages ?? 1) > 1) {
    throw new Error("unsupported image");
  }

  let output = Buffer.alloc(0);
  for (const dimension of DIMENSIONS) {
    for (const quality of QUALITIES) {
      output = await sharp(input, { limitInputPixels: 40_000_000, failOn: "warning" })
        .rotate()
        .resize({ width: dimension, height: dimension, fit: "inside", withoutEnlargement: true })
        .webp({ quality })
        .toBuffer();
      if (output.length <= TARGET_SIZE_BYTES) return output;
    }
  }
  return output;
}

async function run() {
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  let entries;
  try {
    entries = await fs.readdir(uploadsDir, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }

  const legacyFiles = entries
    .filter((entry) => entry.isFile() && UUID_IMAGE.test(entry.name))
    .map((entry) => ({ name: entry.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
  if (legacyFiles.length === 0) return;
  if (!process.env.DATABASE_URL) throw new Error("database unavailable");

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 3000,
    statement_timeout: 20000,
    query_timeout: 25000,
    max: 1,
    options: `-c search_path=${getDbSchema()},pg_catalog`,
  });
  const staged = [];
  let client;
  let transactionOpen = false;
  try {
    client = await pool.connect();
    const { rows } = await client.query("SELECT pg_try_advisory_lock(16777241, 41009) AS acquired");
    if (!rows[0]?.acquired) return;

    for (const entry of entries) {
      if (entry.isFile() && /^\.[a-f0-9-]{36}\.webp\.migrating$/i.test(entry.name)) {
        await fs.rm(path.join(uploadsDir, entry.name), { force: true });
      }
    }

    for (const file of legacyFiles) {
      const stem = file.name.slice(0, 36);
      const target = path.join(uploadsDir, `${stem}.webp`);
      let targetExists = true;
      try {
        await fs.access(target);
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
        targetExists = false;
      }
      if (targetExists) {
        const metadata = await sharp(target).metadata();
        if (metadata.format !== "webp") throw new Error("invalid existing output");
      } else {
        const input = await fs.readFile(path.join(uploadsDir, file.name));
        const output = await optimize(input);
        const temporary = path.join(uploadsDir, `.${stem}.webp.migrating`);
        await fs.writeFile(temporary, output, { flag: "wx" });
        staged.push({ temporary, target });
      }
    }

    await client.query("BEGIN");
    transactionOpen = true;
    const table = `${quotedDbSchema()}.catalog_items`;
    for (const file of legacyFiles) {
      const oldPath = `/uploads/${file.name}`;
      const newPath = `/uploads/${file.name.slice(0, 36)}.webp`;
      await client.query(
        `UPDATE ${table}
         SET fotos = ARRAY(
           SELECT CASE WHEN photo.value = $1 THEN $2 ELSE photo.value END
           FROM unnest(fotos) WITH ORDINALITY AS photo(value, ordinality)
           ORDER BY photo.ordinality
         ), atualizado_em = now()
         WHERE $1 = ANY(fotos)`,
        [oldPath, newPath]
      );
      await client.query(
        `UPDATE ${table}
         SET foto = $2, atualizado_em = now()
         WHERE foto = $1`,
        [oldPath, newPath]
      );
      await client.query(
        `UPDATE ${table}
         SET service_data = jsonb_set(service_data, '{image}', to_jsonb($2::text), true), atualizado_em = now()
         WHERE service_data->>'image' = $1`,
        [oldPath, newPath]
      );
      await client.query(
        `UPDATE ${table}
         SET service_data = jsonb_set(
           service_data,
           '{photos}',
           (SELECT jsonb_agg(CASE WHEN photo.value #>> '{}' = $1 THEN to_jsonb($2::text) ELSE photo.value END ORDER BY photo.ordinality)
            FROM jsonb_array_elements(service_data->'photos') WITH ORDINALITY AS photo(value, ordinality)),
           true
         ), atualizado_em = now()
         WHERE jsonb_typeof(service_data->'photos') = 'array'
           AND EXISTS (
             SELECT 1 FROM jsonb_array_elements(service_data->'photos') AS photo(value)
             WHERE photo.value #>> '{}' = $1
           )`,
        [oldPath, newPath]
      );
    }

    for (const file of staged) await fs.rename(file.temporary, file.target);
    await client.query("COMMIT");
    transactionOpen = false;

    for (const file of legacyFiles) await fs.rm(path.join(uploadsDir, file.name), { force: true });
    console.log(`Imagens antigas do admin convertidas para WebP: ${legacyFiles.length}.`);
  } finally {
    if (transactionOpen) await client.query("ROLLBACK").catch(() => {});
    for (const file of staged) await fs.rm(file.temporary, { force: true }).catch(() => {});
    if (client) {
      await client.query("SELECT pg_advisory_unlock(16777241, 41009)").catch(() => {});
      client.release();
    }
    await pool.end();
  }
}

run().catch((error) => {
  const code = typeof error.code === "string" && /^[A-Z0-9]{5}$/.test(error.code) ? error.code : "UNKNOWN";
  console.error(`Migração das imagens antigas não concluída (${code}); os arquivos originais foram preservados.`);
  process.exitCode = 1;
});
