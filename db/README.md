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
