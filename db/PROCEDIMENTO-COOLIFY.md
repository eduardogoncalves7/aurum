# Deploy atual — PostgreSQL 16 dedicado, schema public

O banco é exclusivo do Aurum. Não há motivo para transferir as quatro tabelas
existentes, criar outra conta ou interromper as escritas para esta atualização.
O deploy normal cria somente `public.catalog_snapshot` e registra a migração 0005
no histórico existente; não executa a transferência 0004.

## Configuração no Coolify

1. Mantenha a `DATABASE_URL` atual como variável de runtime.
2. Deixe `DB_SCHEMA` ausente (padrão `public`) ou configure explicitamente:

   ```dotenv
   DB_SCHEMA=public
   ```

3. Confirme que essa conta tem acesso às quatro tabelas, pode inserir em
   `public._migrations` e tem CREATE no schema public. Não é necessário criar
   `detailing_app`; ela é uma opção futura, não uma condição para publicar.
4. Mantenha o start do Dockerfile:

   ```text
   node scripts/migrate.js; node server.js
   ```

Não coloque `--adopt-public` no comando de start. Essa opção é exclusiva da
transferência futura para `detailing` e só é aceita com `DB_SCHEMA=detailing`.

## Backup recomendado, sem parar o site

Execute em ambiente administrativo com clientes PostgreSQL 16, acesso ao banco e
destino persistente protegido. Os exemplos são Bash/Linux. O perfil libpq
`aurum_maintenance` deve ser configurado pelo administrador para o banco atual;
senhas ficam em `.pgpass`/cofre, nunca no repositório ou no comando.

```bash
set -euo pipefail
umask 077
BACKUP_ROOT='/CAMINHO/PERSISTENTE/backup-aurum'
test -d "$BACKUP_ROOT"
RUN_DIR="$BACKUP_ROOT/$(date -u +%Y%m%dT%H%M%SZ)"
mkdir "$RUN_DIR"
pg_dump --dbname='service=aurum_maintenance' --format=custom \
  --file="$RUN_DIR/aurum.dump"
pg_restore --list "$RUN_DIR/aurum.dump" > "$RUN_DIR/aurum.list"
(cd "$RUN_DIR" && sha256sum aurum.dump > aurum.dump.sha256)
```

O dump completo é apropriado aqui porque o banco é dedicado. É consistente sem
pausar escritas, mas não inclui alterações posteriores ao snapshot do dump.
Copie para armazenamento externo e confira o checksum. Faça também backup do
volume de uploads. Não use `/tmp` como única cópia persistente.

Teste o restore num banco **vazio e descartável**, nunca por cima da produção:

```bash
pg_restore --dbname='service=aurum_restore_test' --exit-on-error \
  --single-transaction --no-owner --no-acl "$RUN_DIR/aurum.dump"
```

O perfil de teste deve apontar a outro banco, com as dependências necessárias.
Confira tabelas, histórico e amostras dos registros restaurados. Como produção
continua recebendo escritas, contagens ao vivo podem diferir do backup sem indicar
perda de dados. Não use `--clean` para contornar conflitos de restauração.

## Publicar e validar

Publique a versão nova pelo fluxo normal do Coolify. O runner:

- Reutiliza `public._migrations` e as quatro tabelas, sem ALTER TABLE SET SCHEMA.
- Pula 0004 sem registrá-la como uma transferência realizada.
- Aplica 0005 em transação, junto com seu registro no histórico.
- Mantém dez tentativas de conexão e limite total de 120s. Uma falha não impede
  `node server.js`, graças ao `;`, mas deve ser investigada nos logs.

Opcionalmente, com a mesma `DATABASE_URL` carregada no ambiente de manutenção:

```bash
DB_SCHEMA=public node scripts/migrate.js
```

Após o deploy, confira:

```sql
SELECT name, applied_at FROM public._migrations ORDER BY name;
SELECT to_regclass('public.catalog_snapshot');
SELECT count(*) FROM public.catalog_snapshot;
SELECT to_regclass('public.agendamentos'), to_regclass('public.catalog_items'),
       to_regclass('public.site_settings');
```

Em um banco com apenas 0001–0003 antes do deploy, o histórico terá quatro entradas:
0001, 0002, 0003 e 0005. Se 0004 já constava de uma operação anterior, seu registro
é preservado. Snapshots existentes nunca são limpos ao reaplicar 0005.

Valide catálogo, configurações, admin e leitura de agendamentos. O módulo de
snapshot ainda não é alimentado automaticamente; criar a tabela não conecta o
catálogo à planilha por si só.

## Falha ou retorno de versão

- Permissão negada: conceda os privilégios necessários à conta de migração ou rode
  0005 com uma conta de manutenção; não há obrigação de criar `detailing_app`.
- Falha durante 0005: a transação reverte tabela/índice e registro desse arquivo;
  corrija a causa e repita. As quatro tabelas existentes permanecem em public.
- Para retornar à versão anterior que já usava public, mantenha `DB_SCHEMA=public`
  e restaure a release anterior compatível. Não é necessário apagar o snapshot
  nem reverter namespaces. Não retorne à release intermediária que exigia detailing.
- Nunca restaure o dump por cima de dados atuais sem planejar como preservar as
  escritas posteriores ao backup.

## Usar detailing futuramente

**Trocar a variável não move dados.** Use o [roteiro de transferência opcional](PROCEDIMENTO-DETAILING-FUTURO.md):
backup, pausa coordenada das escritas, `DB_SCHEMA=detailing node scripts/migrate.js
--adopt-public`, verificações e configuração `DB_SCHEMA=detailing` no app. A
transferência leva também `catalog_snapshot` se ela já existir em public. A conta
restrita continua opcional. Sem essa transferência, selecionar outro schema pode
apontar para tabelas inexistentes; o runner recusa a adoção implícita do legado.

`DB_SCHEMA` aceita apenas identificadores ASCII minúsculos (`a-z`, `0-9`, `_`),
até 63 caracteres, iniciando com letra ou `_`, sem prefixo `pg_` nem
`information_schema`. Valor vazio/inválido causa erro, não fallback silencioso.
Configure-o igualmente no runtime e no ambiente que executa as migrações e
reinicie a aplicação após mudar a variável.

Referências: [pg_dump](https://www.postgresql.org/docs/16/app-pgdump.html) e
[pg_restore](https://www.postgresql.org/docs/16/app-pgrestore.html).
