# Postgres do Aurum: schema detailing

Decisão confirmada: usar **o mesmo banco atual**. Não há ainda usuário restrito.
Este procedimento move as quatro tabelas existentes, sem copiar/apagar registros:
`_migrations`, `agendamentos`, `catalog_items`, `site_settings`. `catalog_items`
continua até a Etapa 9. `catalog_snapshot` guarda snapshots JSONB com identidade,
data UTC, origem e hash; sua alimentação será implementada em outra etapa.

Nada neste repositório executa backup ou administração de roles automaticamente.
O primeiro corte exige uma janela curta sem escritas do Aurum (incluindo jobs e
réplicas antigas). Não pare nem altere o site financeiro.

## Antes de executar em produção

1. Identifique banco/host/versão com o DBA, confira donos e confirme que as quatro
   tabelas em `public` pertencem ao Aurum. Confira se não existem dependências
   externas (views, funções, triggers, FKs ou rotinas do financeiro) nessas tabelas.
   O teste de estrutura/histórico protege contra enganos comuns, não comprova sozinho
   a propriedade do dado. Não force uma adoção rejeitada.
2. Separe uma credencial de manutenção com propriedade das tabelas e `CREATE` no
   banco/schema. A conta de runtime não executará DDL. Não grave senhas no repo,
   em SQL, no histórico do shell ou no output de comandos.
3. Faça o backup abaixo, copie para armazenamento persistente fora do container e
   teste a restauração em **banco descartável vazio**, nunca sobre o financeiro.
   O volume `public/uploads` também precisa de backup separado.
4. Registre contagens e interrompa as escritas do Aurum antes do backup final/corte.
   Contagens feitas durante escritas não são uma comparação confiável.

## Backup e contagens (mesmo banco)

Exemplos POSIX, usando `PGSERVICE=aurum_maintenance` configurado pelo DBA em
`pg_service.conf` e senha via `.pgpass` com permissão 0600. No Windows, use as
variáveis equivalentes do PowerShell e `pgpass.conf` com ACL restrita. Esses
serviços do cliente PostgreSQL são usados nos comandos administrativos; o Node
continua usando **somente DATABASE_URL** para a conexão.

Use `pg_dump` da mesma versão major do servidor ou mais recente compatível:

```sh
export PGSERVICE=aurum_maintenance
pg_dump --format=custom --strict-names \
  --table=public._migrations --table=public.agendamentos \
  --table=public.catalog_items --table=public.site_settings \
  --file=/backup/aurum-before-detailing.dump
pg_restore --list /backup/aurum-before-detailing.dump > /backup/aurum-before-detailing.list
```

Um dump seletivo inclui índices/constraints das tabelas, mas não garante todas as
dependências externas. O DBA deve inventariar extensões, funções e tipos; UUID é
nativo nas versões atuais, mas a migração histórica 0001 também solicita pgcrypto.
Se houver dependências personalizadas, inclua-as no backup/teste isolado. Não use
um restore amplo do banco compartilhado como forma de reverter o Aurum.

Antes:

```sql
SELECT '_migrations' AS tabela, count(*) FROM public._migrations
UNION ALL SELECT 'agendamentos', count(*) FROM public.agendamentos
UNION ALL SELECT 'catalog_items', count(*) FROM public.catalog_items
UNION ALL SELECT 'site_settings', count(*) FROM public.site_settings;
SELECT name, applied_at FROM public._migrations ORDER BY name;
```

Salve o resultado em arquivo protegido. A migração também compara contagens dentro
da transação sob locks; o histórico preserva os registros antigos e ganha 0004/0005.

## Executar o corte

Prepare a imagem/release nova e a antiga para rollback. Execute o runner novo
com a **DATABASE_URL de manutenção**, fornecida por ambiente seguro, após o backup:

```sh
node scripts/migrate.js --adopt-public
```

Esse flag não deve ficar no Dockerfile nem no comando normal de start. A migração
0004 é um bootstrap executado antes de consultar o histórico; valida as quatro
tabelas e o histórico conhecido, move inclusive `_migrations`, marca a tabela
como pertencente ao Aurum e registra a migração na mesma transação. Qualquer
conflito provoca rollback do arquivo inteiro. O destino nunca é mesclado com
tabelas homônimas preexistentes. A execução sem flag recusa adoção de `public`.

As migrações 0001–0003 permanecem imutáveis. Em instalação vazia, rodam com
`SET LOCAL search_path TO detailing, pg_catalog`; não recriam tabelas em `public`.
Numa instalação existente, o histórico transferido evita reaplicá-las.
O runner usa apenas `detailing._migrations`, sem fallback para controle financeiro.
O comentário de propriedade é usado na retomada; não o remova no dump/restauração.

Depois:

```sql
SELECT '_migrations' AS tabela, count(*) FROM detailing._migrations
UNION ALL SELECT 'agendamentos', count(*) FROM detailing.agendamentos
UNION ALL SELECT 'catalog_items', count(*) FROM detailing.catalog_items
UNION ALL SELECT 'site_settings', count(*) FROM detailing.site_settings
UNION ALL SELECT 'catalog_snapshot', count(*) FROM detailing.catalog_snapshot;
SELECT name, applied_at FROM detailing._migrations ORDER BY name;
```

As três tabelas de negócio devem ter exatamente as contagens anteriores. Os três
registros antigos do histórico mantêm `applied_at`; o total passa de 3 para 5.
O snapshot começa vazio. Confira os índices/constraints e leituras da aplicação.

## Criar o usuário restrito

Execute como DBA, depois da migração e da inspeção dos nomes `detailing_owner` e
`detailing_app` (devem ser exclusivos deste projeto):

```sh
psql -X -v ON_ERROR_STOP=1 -f db/ops/provision_roles.sql
```

O script é transacional, reutiliza roles sem privilégios administrativos e rejeita
membership preexistente no runtime. Define dono NOLOGIN, runtime sem superuser,
sem CREATE de schema/tabelas e sem membership no dono. O runtime recebe USAGE em
detailing, DML nas quatro tabelas de negócio/snapshot e apenas SELECT no histórico.
DELETE é mantido para compatibilidade com as operações atuais; este procedimento
não executa DELETE. Se houver roles preexistentes, o DBA também deve conferir
grants e ownership externos antes de reutilizá-las.

Defina a senha com `\password detailing_app` numa sessão psql interativa. Troque
somente a `DATABASE_URL` de runtime do Aurum no Coolify para essa credencial.
Não dê a senha de manutenção ao container de runtime. Migrações futuras pendentes
devem ser aplicadas pelo DBA antes do deploy, com concessões explícitas para novas
tabelas; não conceda DDL ao app só para eliminar mensagens de migração.

Execute `db/ops/audit_runtime_access.sql` conectado como `detailing_app`. A consulta
de relações fora de detailing deve retornar **zero linhas**. Roles herdam grants
dados a PUBLIC: um novo usuário sozinho não garante isolamento se o financeiro
concedeu acesso a PUBLIC. Confira também funções SECURITY DEFINER, ownership,
membership e permissões CREATE/TEMP no banco. O script não revoga permissões em
`public`, em outros schemas ou no banco inteiro, pois isso poderia afetar o
financeiro. Se a auditoria falhar, o DBA deve coordenar as correções antes de
considerar o isolamento concluído. Apenas `search_path` não é controle de acesso.

## Startup e falhas

O Dockerfile mantém exatamente `node scripts/migrate.js; node server.js`.
São dez tentativas de conexão, timeout de 3s por conexão e intervalo de 3s;
locks têm limite de 5s, SQL de 20s, e o processo de migração tem limite total de
120s. Se falhar, o processo termina com erro e o shell inicia o servidor. Um lock
consultivo impede migrações simultâneas; cada arquivo e seu registro são atômicos
na mesma conexão. Não há chamada de migração no build.

Falha da migração permite subir o servidor, mas não garante funcionamento de
agendamentos/admin sem tabelas acessíveis. As queries novas usam schema explícito;
nunca tentam cair em tabelas de outro projeto. Não faça rollout antes de preparar
o schema se precisar evitar esse período degradado.

## Rollback sem apagar dados

1. Se um arquivo falhar, o runner faz ROLLBACK desse arquivo; migrações anteriores
   já confirmadas permanecem e a execução seguinte retoma pelo histórico.
2. Para voltar a versão antiga do app após o corte, pause escritas do Aurum e faça
   **novo backup** do schema detailing (preserva alterações após o primeiro backup).
3. Como DBA, rode `psql -X -v ON_ERROR_STOP=1 -f db/ops/rollback_to_public.sql`.
   Ele recusa qualquer destino ocupado, move as quatro tabelas de volta numa
   transação e mantém snapshot, schema e histórico. Não há DROP nem remoção de
   registros. Se houver colisão, aborte e investigue; nunca sobrescreva a tabela.
4. Volte a release anterior e sua credencial de conexão válida. Se trocou o dono
   para detailing_owner, ajuste **somente os grants das quatro tabelas do Aurum**
   para o usuário da release antiga. Não altere permissões compartilhadas.
5. Compare contagens e valide leituras/escritas antes de reabrir o tráfego. A
   reaplicação com `--adopt-public` reconhece também os registros 0004/0005
   preservados no rollback e não recria/limpa o snapshot existente.

Se for necessário recuperar o backup, restaure primeiro em banco descartável
vazio com `pg_restore --exit-on-error --single-transaction --no-owner --no-acl`.
Verifique os dados e planeje a recuperação seletiva; não use `--clean`, não
restaure por cima de tabelas atuais e não apague dados sem backup verificado.

## Se o destino mudar para outro banco futuramente

Não é o caminho escolhido agora. Use uma cópia de staging para converter um dump
legado para detailing; não importe tabelas `public.*` no banco do financeiro.

1. Pare escritas do Aurum, registre contagens e faça o dump seletivo acima.
2. Restaure em staging **vazio e isolado**, previamente preparado com dependências:
   `PGSERVICE=aurum_staging pg_restore --exit-on-error --single-transaction --no-owner --no-acl --dbname=service=aurum_staging /backup/aurum-before-detailing.dump`.
3. Aponte a DATABASE_URL de manutenção para staging e execute
   `node scripts/migrate.js --adopt-public`. Compare as contagens de negócio.
4. Exporte só o schema convertido:
   `PGSERVICE=aurum_staging pg_dump --format=custom --schema=detailing --file=/backup/aurum-detailing.dump`.
5. No destino, confirme ausência de schema detailing/objetos conflitantes e
   prepare dependências externas necessárias. Restaure somente esse arquivo:
   `pg_restore --exit-on-error --single-transaction --no-owner --no-acl --dbname=service=aurum_destination /backup/aurum-detailing.dump`.
6. Compare contagens, IDs e histórico entre origem/staging/destino, teste o app,
   crie/audite o usuário restrito e só então altere DATABASE_URL no Coolify.
   Mantenha origem e backups intactos até validar o corte. Não misture escritas
   simultâneas nos dois bancos; rollback após novas escritas exige reconciliação.

Referências: [ALTER TABLE / SET SCHEMA](https://www.postgresql.org/docs/current/sql-altertable.html),
[pg_dump](https://www.postgresql.org/docs/current/app-pgdump.html),
[pg_restore](https://www.postgresql.org/docs/current/app-pgrestore.html),
[schemas e privilégios](https://www.postgresql.org/docs/current/ddl-schemas.html).
