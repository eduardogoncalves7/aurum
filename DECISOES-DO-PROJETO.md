# Aurum Detailing — atualização do contexto em 02/10/2026

Complemento ao contexto de 30/09/2026. As decisões abaixo substituem as orientações
anteriores conflitantes dos itens 7 e 8. Este documento registra requisitos;
não significa que os recursos descritos já estejam implementados.

## Item 7 — acrescentar às decisões fechadas

- Decisão de 02/10/2026: o `/admin` mantém formulários para alterar serviços,
  criar promoções e criar combos, gravando na planilha, e ganha atalhos para a
  planilha de serviços e para o site financeiro (`FINANCEIRO_URL`). Quem edita
  preços no dia a dia é o dono do negócio, um usuário leigo: a interface deve
  ser em português simples, com validações e confirmações.
- Sem Apps Script, sem endpoint de sincronização com segredo e sem painel de status.

## Item 8 — substituir a orientação de edição manual

- Edição direta na planilha: o site relê a cada ~120s (cache com tag `catalog`);
  o admin tem o botão **Atualizar site agora**, uma server action protegida pelo
  login que chama `revalidateTag("catalog")`. Gravações feitas pelo admin
  invalidam o cache imediatamente.

O intervalo de ~120s substitui também a referência anterior a cache de ~5 minutos
na linha de leitura do item 8. O fluxo anterior com `POST /api/sync`, segredo em
header e Apps Script opcional deixa de fazer parte da arquitetura decidida.
