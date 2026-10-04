# Aurum Detailing — decisões e requisitos da integração com a planilha

Atualizado em 04/10/2026. Este documento registra decisões para a integração do catálogo com Google Sheets; a presença de um requisito aqui não significa que ele já esteja implementado.

## Item 5 — acesso seguro à planilha durante desenvolvimento e testes

Não existe cópia de teste da planilha (decisão do dono). Portanto:

- O desenvolvimento lê a planilha real somente em modo leitura.
- Toda gravação fica atrás de `SHEETS_WRITE_ENABLED`; o padrão é desligado.
- Testes automatizados usam `fetch` simulado e nunca chamam o Google.
- O primeiro teste real de gravação é feito pelo dono, com uma linha de teste claramente marcada (`atualizado_por = "teste"`), que ele apaga à mão depois.

## Item 7 — decisões fechadas para o admin

- O `/admin` mantém formulários para alterar serviços, criar promoções e criar combos, gravando na planilha quando a fonte `sheet` estiver habilitada. Também pode oferecer atalhos para a planilha de serviços e para o site financeiro (`FINANCEIRO_URL`).
- Quem edita preços no dia a dia é o dono do negócio, um usuário leigo: a interface deve ser em português simples, com validações e confirmações.
- Sem Apps Script, sem endpoint de sincronização com segredo e sem painel de status.

## Item 8 — interruptor da fonte do catálogo

- `CATALOG_SOURCE` seleciona a origem: `legacy` (padrão) mantém o comportamento atual com `catalog_items` e `lib/data/services.ts`; `sheet` usa a planilha.
- O código novo é publicado inicialmente com `CATALOG_SOURCE=legacy`. Só muda para `sheet` depois de validado.
- Até a Etapa 9, o admin antigo e o novo convivem; o interruptor escolhe qual fica ativo.
- A edição direta na planilha é refletida no site em aproximadamente 120 segundos (cache com tag `catalog`). O admin tem **Atualizar site agora**, uma server action protegida pelo login que chama `revalidateTag("catalog")`. Gravações feitas pelo admin invalidam o cache imediatamente.
- O intervalo de aproximadamente 120 segundos substitui a referência anterior de cache de aproximadamente 5 minutos. O fluxo com `POST /api/sync`, segredo em header e Apps Script opcional não faz parte da arquitetura.

## Item 9 — variáveis de ambiente

Acrescentar às variáveis do deploy:

- `CATALOG_SOURCE` — `legacy` por padrão; `sheet` somente após validação.
- `SHEETS_WRITE_ENABLED` — desligado por padrão; só habilita escrita quando definido explicitamente como `true`.

As credenciais de Google necessárias à leitura da planilha devem permanecer em variáveis secretas de runtime, nunca no cliente nem em valores versionados no repositório.

## Item 12 — proteção obrigatória contra escrita

Nenhuma função grava na planilha se `SHEETS_WRITE_ENABLED` não for exatamente `"true"`. O desenvolvimento nunca grava na planilha real sem aprovação explícita. Os testes automatizados devem manter `fetch` simulado para impedir chamadas ao Google.
