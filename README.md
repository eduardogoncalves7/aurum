## Aurum Detailing

Site de catálogo/orçamento com fluxo em chat que termina redirecionando o
cliente para o WhatsApp da loja. O banco de dados guarda **apenas
agendamentos** (nome, telefone, veículo, serviços cotados, data/horário) —
não há cadastro de cliente, catálogo ou configuração persistidos no banco.

### Banco de dados

Postgres puro (cliente `pg`, sem ORM), com uma única tabela `agendamentos`
(ver `db/migrations/`). Qualquer Postgres serve — um serviço no mesmo
projeto do Coolify, ou um banco Supabase, por exemplo — basta apontar
`DATABASE_URL`.

Rodar as migrações manualmente (o Dockerfile já faz isso automaticamente no
start do container):

```bash
DATABASE_URL=postgres://... npm run db:migrate
```

### Variáveis de ambiente

Copie `.env.example` para `.env.local` (dev) e configure as mesmas
variáveis no deploy. Detalhes de cada uma estão comentados no arquivo.
Importante: as variáveis `NEXT_PUBLIC_*` precisam estar presentes já no
`docker build` (não só em runtime), pois vão para o bundle do cliente —
passe-as como `--build-arg` ou como "Build variables" no Coolify.

### Painel /admin

Protegido por HTTP Basic Auth (`proxy.ts`), usando `ADMIN_USER` e
`ADMIN_PASSWORD`. Sem essas variáveis definidas, o painel fica bloqueado por
padrão. Serviços e promoções criados por lá somam ao catálogo estático
(`lib/data/services.ts`), nunca o substituem.

### Fotos de serviços/promoções (volume persistente)

As fotos enviadas pelo `/admin` são salvas em `public/uploads` dentro do
container. **No Coolify, monte um volume persistente exatamente nesse
caminho** (`/app/public/uploads`, já que o Dockerfile copia tudo pra `/app`)
— sem isso, toda foto enviada some no próximo deploy. Não há backup
automático desse volume; se um dia migrar de servidor, copie essa pasta
manualmente pro servidor novo.

---



## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
