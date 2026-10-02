# Procedimento operacional — backup e migração do Aurum

**N?o executar no deploy normal.** O banco atual ? dedicado e usa `DB_SCHEMA=public`. Este roteiro se aplica somente ? decis?o futura de mover os dados para `detailing`.

**Destino:** o mesmo banco usado hoje. **Mudança:** mover somente as
quatro tabelas do Aurum de `public` para `detailing`, criar `catalog_snapshot` e
opcionalmente usar uma conta de runtime restrita. Se j? existir `public.catalog_snapshot`, ela tamb?m ser? transferida.

Este arquivo é um roteiro para execução pelo responsável pelo servidor/DBA.
Sua criação não realizou backup, migração, criação de usuário nem deploy.
O código da migração está no commit `a7db768`; a release anterior conhecida no
repositório é `e76eabc`. Confira no Coolify qual commit realmente está em produção
e registre-o como release de retorno, em vez de presumir que seja esse.

**Antes de reutilizar os comandos abaixo:** se `public.catalog_snapshot` existir, acrescente
`--table=public.catalog_snapshot` ao dump seletivo, registre/restaure/compare sua contagem e
seus dados, e inclua o registro 0005 na compara??o do hist?rico. A etapa de usu?rio
restrito ? opcional: se n?o for executada, mantenha a credencial existente com acesso
ao destino e pule os comandos do perfil `aurum_runtime`. O rollback move tamb?m o
snapshot para public e exige que seu destino esteja livre.

## 1. Preparar o ambiente e impedir deploy antecipado

- [ ] No serviço **do Aurum** no Coolify, desative **Auto Deploy** antes de enviar
  a nova versão ao GitHub. Pause também workflows/webhooks externos que iniciem
  deploy e confira que não existe deploy em andamento. Não altere o financeiro.
- [ ] Registre commit/imagem atual, conexão anterior em cofre de segredos,
  volume de uploads e forma de restaurar a release anterior.
- [ ] Tenha o código novo num checkout de manutenção com `node_modules` instalado,
  sem publicar ainda a aplicação nova. Pode ser uma máquina administrativa que
  alcance o Postgres pela rede privada/VPN ou um ambiente de manutenção na mesma
  rede Docker. Não exponha a porta do banco à internet para executar este roteiro.
- [ ] Prepare um banco **vazio e descartável**, distinto da produção, para testar
  a restauração. Prepare também as dependências externas necessárias (extensões,
  tipos e funções usados pelas tabelas). Não use o banco financeiro como teste.
- [ ] Confirme um destino persistente para backups e uma segunda cópia fora do
  servidor/container. `/tmp` e o filesystem efêmero do container não são backup.

O caminho de Auto Deploy varia com a versão do Coolify; a documentação atual o
localiza em Configuration → Advanced → Deployment & Git.
[Referência do Coolify](https://coolify.io/docs/applications/deployments/automatic-deployments).

### Onde executar os comandos

Os blocos abaixo usam **Bash em Linux**, no ambiente de manutenção, com o checkout
novo como diretório atual. Não cole esses comandos no PowerShell do Windows.
O container final do app tem Node, mas não necessariamente `psql`/`pg_dump`.
Use um ambiente administrativo que tenha Node, as dependências do projeto e os
clientes PostgreSQL da versão do servidor (ou versão compatível mais recente).

Configure previamente três perfis de conexão em `pg_service.conf`, com senha em
`.pgpass` protegido por modo `0600` ou mecanismo equivalente do DBA:

| Perfil usado nos comandos | Destino e usuário |
| --- | --- |
| `aurum_maintenance` | Banco atual, conta de manutenção/DBA |
| `aurum_restore_test` | Banco descartável vazio, nunca produção |
| `aurum_runtime` | Banco atual, usuário `detailing_app` criado na etapa 7 |

Esses nomes são perfis administrativos a configurar; não são serviços que já
existem no Coolify. Não coloque senhas no documento ou na linha de comando.
A conta de manutenção precisa mover as tabelas, criar schema e administrar roles.
O Node usa `DATABASE_URL`; os perfis libpq acima não substituem essa variável.

Na sessão Bash:

```bash
set -euo pipefail
umask 077
psql --version
pg_dump --version
pg_restore --version
node --version
test -f db/migrations/0004_move_to_detailing.sql
test -f db/migrations/0005_create_catalog_snapshot.sql
test -d node_modules/pg

# Substitua por um diretório persistente, existente e protegido do seu servidor.
BACKUP_ROOT='/CAMINHO/PERSISTENTE/backup-aurum'
test -d "$BACKUP_ROOT"
RUN_DIR="$BACKUP_ROOT/$(date -u +%Y%m%dT%H%M%SZ)"
mkdir "$RUN_DIR"
```

Execute por etapas e confira cada resultado. Se um comando falhar, **pare**;
não continue só porque a sessão interativa permaneceu aberta.

## 2. Identificar banco, tabelas e histórico

```bash
psql 'service=aurum_maintenance' -X -v ON_ERROR_STOP=1 <<'SQL'
SELECT current_database(), current_user, version();
SELECT n.nspname AS schema, c.relname, pg_get_userbyid(c.relowner) AS dono
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname IN ('public','detailing')
  AND c.relname IN ('_migrations','agendamentos','catalog_items','site_settings','catalog_snapshot')
ORDER BY n.nspname, c.relname;
SELECT name, applied_at FROM public._migrations ORDER BY name;
SQL

psql 'service=aurum_restore_test' -X -v ON_ERROR_STOP=1 <<'SQL'
SELECT current_database(), current_user, version();
SELECT n.nspname, c.relname FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind IN ('r','p') AND n.nspname NOT IN ('pg_catalog','information_schema')
  AND n.nspname NOT LIKE 'pg_toast%';
SQL
```

Confirme os dois destinos nos perfis, inclusive host/porta, sem publicar suas
credenciais. O banco de teste não pode ser o mesmo banco de produção, ainda que
os nomes dos perfis sejam diferentes.

Para o primeiro corte, o esperado é:

- As quatro tabelas em `public` pertencem ao Aurum; isso deve ser confirmado pelo
  responsável pelos dados, não apenas pelo nome das tabelas.
- O histórico contém `0001_create_agendamentos.sql`,
  `0002_create_catalog_items.sql` e `0003_expand_catalog.sql`, al?m de
  `0005_create_catalog_snapshot.sql` se o snapshot j? foi criado em public.
- Não há tabelas conflitantes em `detailing`. Se já houve migração/rollback,
  investigue o estado antes de reutilizar este roteiro de primeiro corte.
- O DBA conferiu dependências externas e identificou quais precisam entrar no
  teste de restauração. `pg_dump --table` não inclui automaticamente tudo de que
  uma tabela depende. [Referência do PostgreSQL](https://www.postgresql.org/docs/current/app-pgdump.html).

**Pare se o histórico parecer ser do financeiro, se o destino estiver ocupado
ou se a propriedade das tabelas não puder ser confirmada.**

## 3. Pausar escritas e registrar a situação anterior

Pause **somente o Aurum**, incluindo réplicas, rotinas de sincronização e outros
processos que escrevam nas quatro tabelas. O modo mais simples é uma janela de
manutenção com a aplicação parada. A pausa é planejada para o corte; não é uma
dependência permanente do servidor em relação à migração.

Com as escritas pausadas:

```bash
psql 'service=aurum_maintenance' -X -v ON_ERROR_STOP=1 --csv \
  -c "SELECT 'agendamentos' AS tabela,count(*) AS linhas FROM public.agendamentos
      UNION ALL SELECT 'catalog_items',count(*) FROM public.catalog_items
      UNION ALL SELECT 'site_settings',count(*) FROM public.site_settings ORDER BY 1" \
  > "$RUN_DIR/contagens-antes.csv"

psql 'service=aurum_maintenance' -X -v ON_ERROR_STOP=1 --csv \
  -c 'SELECT name,applied_at FROM public._migrations ORDER BY name' \
  > "$RUN_DIR/historico-antes.csv"

psql 'service=aurum_maintenance' -X -v ON_ERROR_STOP=1 --csv \
  -c "SELECT c.relname,c.oid,pg_get_userbyid(c.relowner) AS dono
      FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname IN
      ('_migrations','agendamentos','catalog_items','site_settings') ORDER BY 1" \
  > "$RUN_DIR/tabelas-antes.csv"
```

Guarde os donos para o rollback. Contagens não substituem backup e podem coincidir
mesmo com conteúdos diferentes; elas são uma das verificações do procedimento.

## 4. Fazer o backup e guardar uma cópia externa

```bash
pg_dump --dbname='service=aurum_maintenance' --format=custom --strict-names \
  --table=public._migrations --table=public.agendamentos \
  --table=public.catalog_items --table=public.site_settings \
  --file="$RUN_DIR/aurum-antes.dump"

test -s "$RUN_DIR/aurum-antes.dump"
pg_restore --list "$RUN_DIR/aurum-antes.dump" > "$RUN_DIR/aurum-antes.list"
(
  cd "$RUN_DIR"
  sha256sum aurum-antes.dump > aurum-antes.dump.sha256
  sha256sum -c aurum-antes.dump.sha256
)
```

Faça também backup do **volume de uploads**. No host que tem acesso ao volume,
use seu caminho real, conferido no Coolify:

```bash
UPLOADS_DIR='/CAMINHO/REAL/DO/VOLUME/uploads'
test -d "$UPLOADS_DIR"
tar -czf "$RUN_DIR/uploads-antes.tar.gz" -C "$UPLOADS_DIR" .
tar -tzf "$RUN_DIR/uploads-antes.tar.gz" > "$RUN_DIR/uploads-antes.list"
```

Se o volume só puder ser acessado por outro ambiente, faça o arquivo ali e copie
para a pasta da operação. Não adivinhe o caminho do volume Docker.

- [ ] Copie a pasta da operação para o armazenamento externo aprovado.
- [ ] Confira novamente o SHA-256 do dump na segunda cópia.
- [ ] Proteja os arquivos: o dump contém nomes, telefones e agendamentos.
- [ ] Não prossiga apenas com a cópia dentro do container.

## 5. Testar a restauração antes de alterar produção

O perfil abaixo deve apontar ao banco descartável vazio verificado na etapa 2.
Se uma tentativa anterior deixou objetos nele, prepare outro banco vazio;
não use `--clean` e não sobrescreva objetos para fazer o teste passar.

```bash
pg_restore --dbname='service=aurum_restore_test' \
  --exit-on-error --single-transaction --no-owner --no-acl \
  "$RUN_DIR/aurum-antes.dump"

psql 'service=aurum_restore_test' -X -v ON_ERROR_STOP=1 --csv \
  -c "SELECT 'agendamentos' AS tabela,count(*) AS linhas FROM public.agendamentos
      UNION ALL SELECT 'catalog_items',count(*) FROM public.catalog_items
      UNION ALL SELECT 'site_settings',count(*) FROM public.site_settings ORDER BY 1" \
  > "$RUN_DIR/contagens-restauradas.csv"

diff -u "$RUN_DIR/contagens-antes.csv" "$RUN_DIR/contagens-restauradas.csv"
```

O restore precisa sair com código zero e o `diff` não pode mostrar diferenças.
Confira também histórico, índices, constraints e uma amostra dos registros por
ID. `--no-owner --no-acl` simplifica o teste, mas não comprova que os grants
originais foram reproduzidos; registre-os separadamente se forem necessários.
O restore em transação interrompe a operação ao encontrar erro.
[Referência do PostgreSQL](https://www.postgresql.org/docs/current/app-pgrestore.html).

Se faltar função/tipo/extensão, resolva a dependência e repita o teste em outro
banco vazio antes do corte. **Backup não restaurado com sucesso não libera a migração.**

## 6. Executar a migração no banco atual

Confirme novamente: escritas do Aurum pausadas, backup externo conferido, restore
testado, release anterior disponível e checkout novo presente nesta sessão.

O bloco solicita a **URL de manutenção do banco atual** sem exibi-la. Cole a URL
completa válida, com senha codificada para URI quando necessário. Não use a futura
credencial `detailing_app` para esta etapa. O ambiente de manutenção deve ser
confiável: variáveis de processo também podem ser acessadas por administradores.

```bash
read -r -s -p 'DATABASE_URL de manutenção do banco atual: ' DATABASE_URL
printf '\n'
export DATABASE_URL

if DB_SCHEMA=detailing node scripts/migrate.js --adopt-public > "$RUN_DIR/migracao.log" 2>&1; then
  unset DATABASE_URL
  cat "$RUN_DIR/migracao.log"
else
  unset DATABASE_URL
  cat "$RUN_DIR/migracao.log"
  printf 'PARE: migração falhou. Não publique a versão nova.\n' >&2
  exit 1
fi
```

Resultado esperado: histórico antigo reconhecido, 0004 registrada e 0005 aplicada,
terminando com `Migrações concluídas.`. A transferência usa `ALTER TABLE ... SET
SCHEMA`, preservando os objetos e dados; índices e constraints acompanham a tabela.
[Referência do PostgreSQL](https://www.postgresql.org/docs/current/sql-altertable.html).

O runner executa cada arquivo com seu registro numa transação. Se 0005 falhar,
0004 pode já estar confirmada. Nesse caso mantenha a pausa e use a seção de falhas;
não suponha que a versão antiga ainda consegue acessar `public.*`.

## 7. Conferir os dados e preparar a conta de runtime

Antes de iniciar qualquer versão do app:

```bash
psql 'service=aurum_maintenance' -X -v ON_ERROR_STOP=1 --csv \
  -c "SELECT 'agendamentos' AS tabela,count(*) AS linhas FROM detailing.agendamentos
      UNION ALL SELECT 'catalog_items',count(*) FROM detailing.catalog_items
      UNION ALL SELECT 'site_settings',count(*) FROM detailing.site_settings ORDER BY 1" \
  > "$RUN_DIR/contagens-depois.csv"
diff -u "$RUN_DIR/contagens-antes.csv" "$RUN_DIR/contagens-depois.csv"

psql 'service=aurum_maintenance' -X -v ON_ERROR_STOP=1 --csv \
  -c "SELECT name,applied_at FROM detailing._migrations
      WHERE name IN ('0001_create_agendamentos.sql','0002_create_catalog_items.sql',
      '0003_expand_catalog.sql','0005_create_catalog_snapshot.sql') ORDER BY name" > "$RUN_DIR/historico-preservado.csv"
diff -u "$RUN_DIR/historico-antes.csv" "$RUN_DIR/historico-preservado.csv"

psql 'service=aurum_maintenance' -X -v ON_ERROR_STOP=1 --csv \
  -c "SELECT c.relname,c.oid,pg_get_userbyid(c.relowner) AS dono
      FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='detailing' AND c.relname IN
      ('_migrations','agendamentos','catalog_items','site_settings') ORDER BY 1" \
  > "$RUN_DIR/tabelas-depois.csv"
diff -u "$RUN_DIR/tabelas-antes.csv" "$RUN_DIR/tabelas-depois.csv"

psql 'service=aurum_maintenance' -X -v ON_ERROR_STOP=1 \
  -c 'SELECT name,applied_at FROM detailing._migrations ORDER BY name' \
  -c 'SELECT count(*) AS snapshots FROM detailing.catalog_snapshot'
```

Esperado: três `diff`s sem diferenças, cinco migrações e zero snapshots no primeiro
corte. A identidade/OID é comparada **antes** da transferência de ownership abaixo.
Não publique se essas verificações falharem.

**Opcional:** prossiga com os comandos de cria??o de conta apenas se decidiu adotar
`detailing_app`; caso contr?rio, mantenha a conta existente com os grants necess?rios.

O DBA deve conferir que `detailing_owner` e `detailing_app` não pertencem a outro
projeto. Então execute:

```bash
psql 'service=aurum_maintenance' -X -v ON_ERROR_STOP=1 -f db/ops/provision_roles.sql
psql 'service=aurum_maintenance' -X
```

Na sessão interativa do `psql`, defina a senha e saia:

```text
\password detailing_app
\q
```

Guarde a senha no cofre; configure o perfil `aurum_runtime` para o banco atual
com essa conta. Valide a conexão real, não somente `SET ROLE` numa sessão de DBA:

```bash
psql 'service=aurum_runtime' -X -v ON_ERROR_STOP=1 -f db/ops/audit_runtime_access.sql
psql 'service=aurum_runtime' -X -v ON_ERROR_STOP=1 <<'SQL'
SELECT count(*) FROM detailing.agendamentos;
SELECT count(*) FROM detailing.catalog_items;
SELECT count(*) FROM detailing.site_settings;
SELECT name FROM detailing._migrations ORDER BY name;
BEGIN;
INSERT INTO detailing.catalog_snapshot(origem,hash,conteudo)
VALUES ('validacao-migracao','teste-rollback','{}'::jsonb);
ROLLBACK;
SQL
```

O teste de INSERT não deixa snapshot, mas pode consumir um valor da sequência;
lacunas em IDs são normais. A auditoria de acesso a relações fora de detailing
deve retornar **zero linhas**. Confira também grants herdados via PUBLIC, funções
SECURITY DEFINER e membership. Se houver acesso ao financeiro, pare e peça ao DBA
para corrigir de forma coordenada; não revogue permissões compartilhadas às cegas.

## 8. Publicar e validar no Coolify

1. Disponibilize o commit novo no GitHub com Auto Deploy ainda desativado.
2. Na aplicação **Aurum**, substitua `DATABASE_URL` de runtime pela conexão do
   mesmo banco usando `detailing_app`. Preserve host, porta, nome do banco e
   parâmetros TLS apropriados; não copie a URL de teste. Senha em URL exige
   percent-encoding dos caracteres especiais. Não use variável `NEXT_PUBLIC_*`.
3. Confirme o volume de uploads e o Dockerfile. Mantenha:
   `node scripts/migrate.js; node server.js`. Não adicione `--adopt-public` ao start.
4. Faça o deploy manual do commit novo. A conta runtime deve encontrar todas as
   migrações já aplicadas; não precisa receber DDL. Confirme o commit nos logs.
5. Com tráfego ainda controlado, valide home, `/servicos`, uma página de detalhe,
   imagens dos combos, `/admin`, configurações e consulta de agendamentos.
6. Faça um agendamento de teste identificado e confira sua persistência. Cancele-o
   pelo fluxo autorizado se disponível; não apague registros por SQL para limpar
   o teste. Confira também uma operação administrativa reversível e desfaça-a.
7. Reabra o tráfego do Aurum. Confirme que o financeiro segue operando sem alterações.
8. Registre horário, commit, responsável, backup/checksum e resultado; reative Auto
   Deploy apenas depois de concluir as validações.

O servidor sobe mesmo se o runner falhar (dez tentativas de conexão e teto de
120s, com `;` no Dockerfile), mas isso não garante que as funcionalidades de banco
estejam disponíveis. Log de falha na migração não é critério de sucesso do corte.

## 9. Falhas e rollback

| Momento/falha | Ação |
| --- | --- |
| Backup ou restauração de teste falhou | Não migre. Corrija o backup; a versão antiga continua compatível com `public`. |
| `AURUM_SOURCE_*` / `AURUM_TARGET_CONFLICT` | Pare e confira banco, histórico e objetos com o DBA. Não remova tabelas nem registros de controle. |
| `AURUM_MIGRATION_BUSY` / lock timeout | Verifique outra migração ou transação ativa. Não mate sessões do financeiro. Retome após resolver a concorrência. |
| 0004 confirmou, 0005 falhou | Mantenha o Aurum pausado; corrija e rode o runner novamente com manutenção, ou reverta os namespaces abaixo. |
| Contagens/histórico/OIDs divergiram | Não publique; preserve os arquivos da operação e investigue com o DBA. |
| Permissões ou deploy falharam após o corte | Corrija mantendo a pausa ou execute o rollback completo de schema **e** release. |

### Retornar à versão anterior sem apagar os dados atuais

Pare novamente as escritas/réplicas do Aurum. Se ele já recebeu dados novos,
prefira a reversão de namespace abaixo: restaurar o backup antigo por cima faria
perder essas escritas. Primeiro faça **outro backup**, incluindo os snapshots:

```bash
ROLLBACK_DIR="$BACKUP_ROOT/rollback-$(date -u +%Y%m%dT%H%M%SZ)"
mkdir "$ROLLBACK_DIR"
pg_dump --dbname='service=aurum_maintenance' --format=custom --schema=detailing \
  --file="$ROLLBACK_DIR/aurum-antes-rollback.dump"
test -s "$ROLLBACK_DIR/aurum-antes-rollback.dump"
pg_restore --list "$ROLLBACK_DIR/aurum-antes-rollback.dump" \
  > "$ROLLBACK_DIR/aurum-antes-rollback.list"
```

Copie e confira esse backup externamente antes de prosseguir. Registre novamente
as contagens atuais. Em seguida:

```bash
psql 'service=aurum_maintenance' -X -v ON_ERROR_STOP=1 \
  -f db/ops/rollback_to_public.sql
```

O script recusa destinos ocupados, move as quatro tabelas de volta a `public` e
mantém schema, snapshot e histórico. Se falhar, **não use DROP para liberar nomes**.
Como o owner pode ter mudado, o DBA deve restaurar ownership ou grants adequados
para a conta da release antiga, somente nos quatro objetos do Aurum, usando os
donos registrados em `tabelas-antes.csv`. A conta de runtime nova não deve receber
permissões administrativas como atalho.

Volte a release registrada na etapa 1 e sua conexão válida; confira contagens
atuais, leituras e escrita antes de reabrir tráfego. Não basta voltar só a imagem
se o banco ainda estiver em `detailing`, pois o código antigo usa `public`.

Se a reversão de namespace não for possível, restaure o dump em outro banco vazio,
valide os dados e planeje recuperação seletiva com o DBA. Não rode restore amplo
no banco compartilhado, não use `--clean` e não sobrescreva o financeiro.

## Registro de conclusão

| Evidência | Preencher na execução |
| --- | --- |
| Data/hora e responsável | |
| Banco confirmado e perfil de manutenção | |
| Release anterior e nova | |
| Backup local e cópia externa | |
| SHA-256 conferido | |
| Restauração testada e contagens iguais | |
| Histórico, OIDs e contagens pós-migração conferidos | |
| Conta runtime e auditoria de acesso verificadas | |
| Testes no site e financeiro concluídos | |
| Auto Deploy reativado / mantido desativado | |

Detalhes de implementação e cenário futuro de outro banco: [db/README.md](README.md).
