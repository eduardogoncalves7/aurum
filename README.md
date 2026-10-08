# Aurum Detailing

Aplicação Next.js 16 para catálogo, orçamento via WhatsApp e agendamentos. O painel `/admin` usa HTTP Basic Auth (`ADMIN_USER` e `ADMIN_PASSWORD`) e persiste catálogo, promoções e configurações em PostgreSQL.

## Banco de dados

O PostgreSQL 16 ? dedicado ao Aurum. `DB_SCHEMA` seleciona o schema e tem padr?o
`public`; mantenha a `DATABASE_URL` atual. O deploy cria `catalog_snapshot` sem
mover tabelas nem exigir conta nova ou janela de manuten??o. Consulte o
[procedimento atual de backup e deploy](db/PROCEDIMENTO-COOLIFY.md).

A transfer?ncia para `detailing` ? [opcional e documentada separadamente](db/PROCEDIMENTO-DETAILING-FUTURO.md).
Trocar `DB_SCHEMA` sozinho n?o transfere dados.

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

### Sitemap e buscadores

A prévia de compartilhamento usa a arte institucional em `public/og-image.png`, com metadados Open Graph e Twitter Card no layout principal. A imagem PNG original tem 1731 × 909 pixels. Após publicar, confira a prévia do link; plataformas de compartilhamento podem manter a imagem anterior em cache. Se alterar `SITE_URL`, faça um novo build para atualizar a origem nos metadados das páginas pré-renderizadas.

`/sitemap.xml` lista a página inicial, `/servicos` e os detalhes dos serviços públicos visíveis. A disponibilidade é consultada a cada pedido, usando o mesmo filtro de itens ativos e datas de promoção das páginas públicas. Se o banco estiver indisponível, usa o catálogo de fábrica; um catálogo vazio não ativa esse fallback. As datas de modificação vêm dos registros, sem inventar datas para as páginas estáticas.

O domínio padrão é `https://aurum.melhornegocio.shop`. Para trocar de domínio, configure `SITE_URL` nas variáveis de runtime do Coolify com a origem oficial, sem caminhos, parâmetros ou credenciais.

`/robots.txt` indica o sitemap e orienta buscadores a não rastrear `/admin` e `/api/`; a autenticação do admin continua sendo a proteção de acesso. Orçamento, agendamento e URLs com parâmetros não entram no sitemap. Após o deploy, confira ambos os endereços e envie `/sitemap.xml` no Google Search Console do domínio oficial. A inclusão no sitemap não garante indexação.

Novas fotos enviadas pelo admin são validadas e convertidas automaticamente para WebP (qualidade 82), com até 1920 pixels em cada dimensão, sem ampliar imagens menores. A proporção, a orientação e a transparência são preservadas; metadados EXIF são removidos. O upload aceita JPG, PNG e WebP de até 5 MB e 40 megapixels, sem animação. Fotos antigas continuam disponíveis no formato original.

## Desenvolvimento

```bash
npm ci
npm run dev
```
