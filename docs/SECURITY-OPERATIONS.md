# Operação segura — Aurum Detailing

## Limites aplicados

- `POST /api/orcamentos` e `POST /api/agendamentos`: 20 requisições por minuto por IP no processo da aplicação; acima disso, `429` com `Retry-After`.
- JSON público: 64 KiB; acima disso, `413`.
- Upload administrativo: JPG, PNG ou WebP, tipo informado compatível com os magic bytes, no máximo 5 MiB e 40 megapixels; o nome salvo é sempre um UUID `.webp`.
- `/admin*` e `/api/admin*`: 10 falhas de autenticação por IP em 15 minutos; acima disso, `429` com `Retry-After`. A janela é zerada após um login válido.

O limite na aplicação é deliberadamente local ao processo para manter a resposta JSON e o cabeçalho `Retry-After`. O domínio também está atrás do Cloudflare; se o plano passar a permitir uma regra de WAF com janela de 15 minutos, ela pode ser adicionada como segunda camada sem remover a proteção da origem.

## Cloudflare aplicado

Na zona `melhornegocio.shop`, o host `aurum.melhornegocio.shop` usa:

- Always Use HTTPS ativado, redirecionando HTTP para HTTPS;
- HSTS com `max-age=31536000`, sem `includeSubDomains` e sem preload;
- regra de Response Header Transform no host Aurum com CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` e remoção de `x-powered-by`;
- o redirect permanece no Cloudflare para evitar loop com o proxy do Coolify.

A CSP mantém `'unsafe-inline'` em scripts porque o App Router do Next emite bootstrap/RSC inline. O restante da política restringe origens, frames, formulários, base URL e objetos.

O Aurum passa pelo túnel `Coolify` existente. Não trocar a entrada wildcard nem o túnel por tentativa: primeiro confirmar conectores saudáveis, a rota do host no Coolify/Traefik e o serviço local da aplicação.

## Monitoramento externo

Cadastrar em UptimeRobot, Better Stack ou serviço equivalente, com alertas por e-mail:

1. `https://aurum.melhornegocio.shop/api/config` — HTTPS GET, esperado `200`, intervalo de 5 minutos, timeout de 20 segundos.
2. Uma URL de arquivo em `https://aurum.melhornegocio.shop/_next/static/chunks/` — usar um chunk existente da build publicada; esperado `200`, intervalo de 5 minutos, timeout de 20 segundos.

Após cada deploy, conferir no HTML de `/servicos` se o chunk monitorado ainda existe e atualizá-lo no monitor quando o hash mudar. O endpoint `/api/config` é o teste funcional estável; o chunk confirma a entrega dos assets estáticos.

## Recuperação de erro de origem

1. Confirmar `GET /api/config`, um chunk estático e uma rota inexistente com timeout máximo de 20 segundos.
2. No Cloudflare, confirmar que o túnel `Coolify` está `healthy` e que há conectores ativos.
3. No Coolify, conferir o proxy/Traefik e o serviço Aurum na porta publicada. A rota wildcard atual chega ao proxy em `http://localhost`; o serviço Next permanece na porta 3000 atrás desse proxy.
4. Conferir logs do container para `DATABASE_URL`, migrações e pool do Postgres. A aplicação tem timeouts de conexão e statement; não publique uma versão que volte a consultar banco sem limite.
5. Recriar somente o deployment do Aurum depois de salvar o diagnóstico. Não apagar o volume `/app/public/uploads` nem alterar registros DNS de e-mail.
6. Validar novamente `/api/config`, `/servicos`, `/orcamento`, POST inválido de orçamento/agendamento, upload administrativo e as rotas de status do admin.

## Reforço futuro do admin

O Basic Auth foi mantido para não interromper o uso atual do dono, agora protegido por HTTPS, rate limit e respostas genéricas. Cloudflare Access ou uma página de login com sessão curta só deve ser adotado junto com uma identidade/allowlist confirmada; colocar Access sem esse cadastro bloquearia o painel existente.
