# Aurum Detailing

Aplicação Next.js 16 para catálogo, orçamento via WhatsApp e agendamentos. O painel `/admin` usa HTTP Basic Auth (`ADMIN_USER` e `ADMIN_PASSWORD`) e persiste catálogo, promoções e configurações em PostgreSQL.

## Banco de dados

As tabelas do Aurum usam o schema **`detailing`**. Para converter o banco atual,
faça backup e siga [o procedimento de migração, usuário restrito e rollback](db/README.md)
antes do deploy. A transferência inicial de `public` é explícita (`--adopt-public`).

Configure `DATABASE_URL` para um PostgreSQL acessível pelo container da aplicação. As migrações rodam no start do container. Na primeira leitura do catálogo depois da migração, os serviços existentes são importados automaticamente com seus IDs, preços, descrições, imagens, variantes e dados de orçamento. As alterações seguintes feitas no admin são gravadas no banco.

Para rodar localmente:

```bash
npm run db:migrate
npm run dev
```

## Deploy no Coolify com Docker

- Crie PostgreSQL no Coolify ou use um serviço Postgres externo. Para serviço no mesmo projeto, use o hostname interno do serviço na `DATABASE_URL`, não `localhost`.
- Configure `DATABASE_URL`, `ADMIN_USER` e `ADMIN_PASSWORD` como variáveis de runtime do serviço da aplicação.
- Configure as variáveis `NEXT_PUBLIC_*` como argumentos de build e variáveis de runtime para os valores iniciais/fallback de WhatsApp, telefone, Instagram, endereço e horário. O admin grava os valores atuais no banco; mudanças feitas depois ficam ativas sem rebuild.
- Publique a aplicação na porta 3000. O Dockerfile usa Next standalone, Node 20 Alpine e processo não-root (`nextjs`, UID 1001). As migrações fazem até dez tentativas de conexão e têm limite total de 120 segundos. O servidor inicia mesmo se a migração falhar; confira os logs de inicialização se o banco não conectar.
- Monte um volume persistente em `/app/public/uploads` para fotos enviadas pelo admin. O banco guarda o caminho da foto, não os bytes do arquivo. O diretório é preparado para o usuário `nextjs`; valide leitura e escrita do volume no primeiro deploy.
- As imagens de fábrica ficam em `public/images/services` e fazem parte da imagem Docker. Não precisam ser copiadas para o Postgres. Só os uploads precisam do volume persistente. Faça backup do banco e do volume de uploads.

O armazenamento de upload é local ao container. Se executar mais de uma réplica da aplicação, use um volume compartilhado compatível ou migre os uploads para armazenamento de objetos; um volume local por réplica não compartilha os arquivos.

## Desenvolvimento

```bash
npm ci
npm run dev
```
