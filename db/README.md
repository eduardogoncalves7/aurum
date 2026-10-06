# Banco de dados do Aurum

O destino atual ? um PostgreSQL 16 dedicado, com as quatro tabelas em `public`.
`DB_SCHEMA` ? configur?vel e assume `public` quando ausente. N?o h? transfer?ncia
autom?tica de tabelas no deploy.

- [Backup e deploy atual no Coolify](PROCEDIMENTO-COOLIFY.md).
- [Transfer?ncia opcional futura para detailing, com backup e rollback](PROCEDIMENTO-DETAILING-FUTURO.md).

As migra??es 0001?0003 permanecem imut?veis. A 0004 ? executada somente no
bootstrap de detailing ou na transfer?ncia expl?cita com `--adopt-public`;
o fluxo normal de public a ignora. A 0005 usa o search_path transacional
configurado pelo runner e cria o snapshot no schema escolhido. O hist?rico
tamb?m ? lido/escrito nesse schema.

`catalog_items` permanece at? a Etapa 9. Os scripts em `ops/` s?o opera??es
manuais para o cen?rio opcional detailing; n?o s?o executados no startup e
n?o s?o requisito para usar public. `detailing_app` n?o ? obrigat?rio.

Testes: `npm test`, com PostgreSQL WASM isolado, sem DATABASE_URL real.
O Dockerfile mant?m `node scripts/migrate.js; node server.js`, reconex?o e
limites de tempo, permitindo subir o servidor mesmo se a migra??o falhar.

## Canonical catalog model (migration 0006)

`0006_canonical_catalog.sql` only adds columns and two small tables. It keeps
`service_data`, `precos`, `variantes`, and `opcoes_preco`; the backfill fills
new fields once, compares total row counts before and after, and aborts if a
required canonical field is missing. The TypeScript/Zod schema is
`lib/catalog-schema.ts`. Editable categories use `catalog_categories`; item
changes are recorded by a trigger in `catalog_item_history` (session actor
`aurum.actor`, or the database user when unset).

Before production, create and verify a restorable backup following
`PROCEDIMENTO-COOLIFY.md`. The migration only deactivates, without deleting,
active promotions clearly marked with `teste` or `test` in their name/ID. Check
the `AURUM_CATALOG_BACKFILL` log notice for before/after row counts and the
number of deactivated promotions. It does not rename services or overwrite
prices already present in `precos`. The read-only name comparison against the
partner CSV is in `db/ops/catalog_name_differences.sql`; run it with the catalog
schema selected.

Rollback: back up the current state first and confirm the previous application
version is ready. If the new columns/tables have not received edits, remove the
triggers `catalog_item_history_capture_trigger` and
`catalog_item_canonical_defaults_trigger`, functions
`catalog_item_history_capture()` and `catalog_item_canonical_defaults()`, indexes `idx_catalog_items_slug` and
`idx_catalog_items_visible_order`, tables `catalog_item_history` and
`catalog_categories`, constraint `catalog_items_tipo_preco_check`, and added
columns `slug`, `tipo_preco`, `beneficios`, `brinde`, `fotos`,
`visivel_catalogo`, `destaque`, `ordem`, and `precos_promocionais` in the
configured schema (`DB_SCHEMA`). Then remove `0006_canonical_catalog.sql` from
`_migrations` so it can run again. Do not drop the new fields if they contain
edits; export those values and plan the reverse migration first.

Migration tests run on isolated PGlite and never connect to Coolify:
`npm test -- db/__tests__/catalog-canonical.test.ts`.
