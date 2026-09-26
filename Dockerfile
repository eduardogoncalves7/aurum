# syntax=docker.io/docker/dockerfile:1

# ---------------------------------------------------------------------------
# 1) deps — instala as dependências isoladamente para aproveitar cache
# ---------------------------------------------------------------------------
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# ---------------------------------------------------------------------------
# 2) builder — compila a aplicação (output: "standalone")
# ---------------------------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variáveis NEXT_PUBLIC_* precisam existir no momento do build (não só em
# runtime) porque o Next as inlina no bundle do cliente. Passe-as como
# --build-arg no `docker build`, ou defina como "Build variables" no Coolify.
ARG NEXT_PUBLIC_WHATSAPP_NUMBER
ARG NEXT_PUBLIC_ADDRESS
ARG NEXT_PUBLIC_INSTAGRAM
ARG NEXT_PUBLIC_PHONE
ARG NEXT_PUBLIC_HOURS
ENV NEXT_PUBLIC_WHATSAPP_NUMBER=$NEXT_PUBLIC_WHATSAPP_NUMBER
ENV NEXT_PUBLIC_ADDRESS=$NEXT_PUBLIC_ADDRESS
ENV NEXT_PUBLIC_INSTAGRAM=$NEXT_PUBLIC_INSTAGRAM
ENV NEXT_PUBLIC_PHONE=$NEXT_PUBLIC_PHONE
ENV NEXT_PUBLIC_HOURS=$NEXT_PUBLIC_HOURS

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---------------------------------------------------------------------------
# 3) runner — imagem final, mínima, roda como usuário não-root
# ---------------------------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Saída standalone já inclui um server.js mínimo + node_modules necessários
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=builder --chown=nextjs:nodejs /app/db ./db

USER nextjs

EXPOSE 3000

# Roda as migrações pendentes e sobe o servidor de qualquer forma — mesmo
# que a migração falhe (ex: Postgres do Coolify ainda subindo no primeiro
# deploy, ou DATABASE_URL momentaneamente errada), o site continua no ar em
# modo degradado (o resto do código já trata ausência de banco graciosamente
# nas páginas públicas). Preferível a derrubar o site inteiro por causa de um
# problema só na parte de agendamentos/catálogo administrável.
CMD ["sh", "-c", "node scripts/migrate.js; node server.js"]
