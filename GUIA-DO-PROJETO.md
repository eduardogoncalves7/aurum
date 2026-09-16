# Guia do Projeto Aurum Detailing — para quem está começando

Este documento explica, do zero, como o site funciona: a stack escolhida,
como ele roda no navegador e no celular, o que ainda falta implementar, e um
passeio por cada arquivo do código.

---

## 1. A stack escolhida (e por quê)

| Peça | O que é | Por que essa escolha |
|---|---|---|
| **Next.js** | Framework em cima do React que organiza páginas, rotas e o processo de build | É o jeito mais padrão hoje de fazer um site em React "pronto pra produção" — já resolve roteamento, otimização de imagens, geração de HTML, etc. |
| **React** | Biblioteca pra construir interface em "componentes" reutilizáveis | Você descreve como a tela deve se comportar, e o React cuida de atualizar a tela quando os dados mudam |
| **TypeScript** | JavaScript com tipos (ex: "isso aqui é sempre um texto", "isso aqui é sempre um número") | Pega muitos erros bobos antes mesmo de rodar o código (ex: usar um campo que não existe) |
| **Tailwind CSS** | Biblioteca de estilo — em vez de escrever CSS separado, você usa classes prontas direto no HTML (`bg-black`, `rounded-xl`, etc.) | Deixa o visual consistente (a paleta preto/dourado) sem precisar caçar arquivos `.css` espalhados |
| **lucide-react** | Pacote de ícones (o "X" de fechar, o ícone de calendário, etc.) | Ícones prontos, leves, sem precisar desenhar SVG na mão |
| **localStorage** (não é bem uma "stack", mas é a base de dados hoje) | Um espacinho de armazenamento dentro do próprio navegador do visitante | Não existe backend/banco de dados ainda — é a forma mais simples de guardar orçamentos e agendamentos sem precisar de servidor. Ver seção 3. |
| **Docker** | Empacota o site inteiro (código + tudo que ele precisa pra rodar) numa "caixinha" padronizada | É o que o Coolify usa pra saber como construir e rodar o site no seu servidor |

Não tem: banco de dados de verdade, login com senha, API própria, pagamento
online. Tudo isso ainda não existe (detalhado na seção 3).

---

## 2. Como ele roda no navegador e no celular

**Importante entender isso primeiro:** este é um **site web comum**, não um
aplicativo de celular (não está na App Store nem na Play Store). A "versão
mobile" é o mesmo site, só que desenhado pra caber bem numa tela de celular
— chamamos isso de **design "mobile-first"**.

### O que acontece quando alguém abre o link

1. O celular ou computador da pessoa manda um pedido pro servidor (onde o
   Docker está rodando, no Coolify).
2. O servidor (Next.js rodando dentro do container Docker) monta a página
   em HTML e manda de volta.
3. O navegador (Chrome, Safari, etc.) mostra essa página. A partir daí, o
   JavaScript do React assume — é ele que faz os botões responderem ao
   toque, os cliques trocarem de tela, etc.

Isso é igual tanto no celular quanto no computador — é o **mesmo código**,
o **mesmo servidor**, a única diferença é o CSS (via Tailwind) que ajusta o
tamanho e o layout dependendo da largura da tela.

### Por que parece "um aplicativo"

O fluxo de orçamento (`/orcamento`) foi desenhado de propósito pra parecer
uma conversa de chat, tela por tela, com botões grandes — daí a sensação de
app. Mas por trás, é só HTML/CSS/JavaScript normal, entregue pelo servidor.

### Onde os dados de cada pessoa ficam

Cada visitante tem seu **próprio `localStorage`** — é tipo uma gaveta que
existe só dentro do navegador dele. Isso significa:

- Se a pessoa limpar os dados do navegador, ela "esquece" quem é (perde a
  sessão e o histórico de agendamentos).
- Os dados de um visitante **não aparecem automaticamente** pro dono da
  loja em algum painel central — é por isso que o painel `/admin` só mostra
  dados de quem acessou usando aquele mesmo navegador (isso está na lista
  de coisas que faltam, seção 3).

---

## 3. O que ainda não está implantado

Isso é importante pra você não achar que o site "trapaceia" ou tem menos
funcionalidade do que aparenta — é um protótipo funcional, mas com limites
claros:

### 3.1 Banco de dados de verdade
Hoje: tudo (clientes, orçamentos, agendamentos) vive no `localStorage` do
navegador de cada pessoa. Isso quer dizer que **o dono da loja não vê, num
lugar só, todos os agendamentos de todos os clientes** — só veria os que
foram feitos no mesmo navegador/computador que ele está usando pra abrir o
`/admin`.

O que precisaria: escolher um banco (ex: Supabase/PostgreSQL, já cogitado
antes), criar as tabelas, e trocar as funções de `lib/storage.ts` pra
conversar com esse banco em vez do `localStorage`. A boa notícia: como toda
leitura/escrita já passa por funções isoladas nesse arquivo, o resto do
código não precisa mudar quase nada.

### 3.2 Autenticação/login do painel admin
Hoje, `/admin` é uma URL pública — qualquer pessoa que souber o endereço
consegue abrir e ver clientes/orçamentos. Falta uma senha ou login pra
proteger essa área.

### 3.3 Envio real de WhatsApp automático
O site **redireciona** a pessoa pro WhatsApp com uma mensagem pronta — mas
quem efetivamente "envia" é o próprio cliente, manualmente, dando o toque
final de enviar no WhatsApp dele. Não existe integração com a API oficial
do WhatsApp Business que mandaria mensagens automáticas sem essa etapa
manual.

### 3.4 Pagamento online
Não existe come Pix, cartão ou qualquer cobrança dentro do site — é tudo
combinado depois, fora do site.

### 3.5 Serviço "PPF em Carros"
O catálogo só tem "PPF em Motos". Você recebeu fotos de PPF em carro
(Ram preta) mas não pediu pra criar esse serviço ainda — perguntei antes e
ficou em aberto.

### 3.6 Escolha de variante do Revestimento Cerâmico
Bug conhecido: no fluxo de orçamento atual, ao escolher "Revestimento
Cerâmico" não aparece a opção de escolher entre os pacotes de 1/2/3/4 anos
— o sistema sempre trata como "a avaliar". Precisa de um componente
parecido com o card de "Limpeza" (que já resolve esse tipo de escolha) pra
esse caso.

### 3.7 Testes automatizados
Não existe nenhum teste automatizado (ex: Jest, Playwright) — toda
verificação até aqui foi manual (rodar o build, checar visualmente).

### 3.8 Analytics / métricas
Não há Google Analytics nem nada que meça quantas pessoas visitam o site,
de onde vêm, etc.

---

## 4. Passeio pelo código inteiro

A estrutura de pastas segue o padrão do Next.js ("App Router"): cada pasta
dentro de `app/` normalmente vira uma URL do site.

```
aurum-detailing/
├── app/              ← as páginas/rotas do site
├── components/       ← pedaços de interface reutilizáveis
├── lib/               ← lógica pura (cálculos, dados, helpers) sem interface
├── types/             ← as "formas" dos dados (Customer, Service, Quote...)
├── public/            ← arquivos estáticos (imagens)
├── Dockerfile          ← receita pra empacotar o site
└── next.config.ts      ← configurações do Next.js
```

### 4.1 `types/index.ts` — o dicionário de dados

Antes de mais nada, vale entender esse arquivo, porque ele define o
"vocabulário" que o resto do código usa. Cada `interface`/`type` descreve a
forma de uma informação:

- `Customer` — nome, telefone, quando foi criado
- `Vehicle` — carro ou moto, e a escolha (hatch/sedan/suv/pickup/outro)
- `Service` — cada item do catálogo (nome, preço, categoria, se tem
  variantes, etc.)
- `Quote` — um orçamento: quais serviços, total estimado, status
- `Appointment` — data, horário, e como o veículo vai chegar até a loja

Pensa nisso como as "fichas" que todo o resto do sistema preenche e lê.

### 4.2 `lib/` — a lógica, sem tela nenhuma

Esses arquivos não desenham nada na tela — só calculam, guardam ou buscam
informação. São a "cozinha" por trás do restaurante.

- **`lib/data/services.ts`** — o catálogo inteiro, os 18 serviços, escrito
  à mão como uma lista. Também tem as listas `limpezaTierServiceIds` e
  `limpezaAddonServiceIds`, que dizem quais serviços fazem parte do grupo
  "Limpeza" no fluxo de orçamento.
- **`lib/data/categories.ts`** — os nomes das categorias (Proteções,
  Polimento, etc.) usados pra agrupar o catálogo na página `/servicos`.
- **`lib/pricing.ts`** — o "cérebro" que calcula preço. Recebe um serviço +
  um veículo e devolve o valor certo (ou diz que precisa de avaliação
  presencial).
- **`lib/vehicle.ts`** — sabe transformar a escolha do cliente ("SUV") na
  categoria de preço interna certa (porte pequeno/médio/grande, ou
  carroceria hatch/suv/pickup).
- **`lib/formatters.ts`** — funções pequenas de formatação: `R$ 1.234,56`,
  máscara de telefone `(31) 99999-9999`, data `08/09/2026`.
- **`lib/whatsapp.ts`** — monta o texto da mensagem que vai pro WhatsApp
  (orçamento, confirmação de agendamento, cancelamento) e monta o link
  `wa.me/...`.
- **`lib/maps.ts`** — monta o link do Google Maps a partir do endereço da
  loja.
- **`lib/storage.ts`** — **o arquivo mais importante pra entender o "banco
  de dados" de hoje.** Todo `localStorage.getItem`/`setItem` do site passa
  só por aqui. Guarda: clientes, veículos, orçamentos, agendamentos,
  configurações da loja, e a "sessão" (quem está logado no navegador).
- **`lib/utils.ts`** — uma função pequena (`cn`) que ajuda a combinar
  classes do Tailwind condicionalmente.

### 4.3 `components/ui/` — os tijolinhos visuais genéricos

Botão, Card, Badge (aquela etiquetinha "Mais procurado"), Input de texto.
Não sabem nada sobre "serviço" ou "orçamento" — só sabem desenhar um botão
bonito, por exemplo. Reutilizados em todo o site.

### 4.4 `components/brand/Logo.tsx`
O logotipo em texto "Aurum Detailing" estilizado — usado no cabeçalho e no
topo do fluxo de orçamento.

### 4.5 `components/layout/Header.tsx`
O cabeçalho fixo no topo do site público. Tem um detalhe interessante: ele
verifica se existe uma "sessão" salva (`getSession()`) pra decidir se
mostra o link "Meus agendamentos" ou não.

### 4.6 `components/home/`
Usados na página pública de navegação (`/servicos`), não no fluxo de chat:

- **`ServiceCard.tsx`** — o card retangular com imagem, nome e preço,
  usado na listagem de serviços.
- **`ServiceCategories.tsx`** — agrupa os `ServiceCard` por categoria.
- **`ServiceImage.tsx`** — componente esperto que tenta carregar a foto do
  serviço e, se o arquivo não existir, mostra um fundo dourado no lugar
  (nunca quebra o layout).

### 4.7 `components/booking-chat/` — o coração do fluxo de orçamento

Isso é usado só dentro de `/orcamento`. Cada arquivo é uma "etapa" ou peça
visual da conversa:

- **`BookingChat.tsx`** — o "maestro". Guarda todo o estado da conversa
  (nome, telefone, veículo, serviços escolhidos, data, horário...) e
  decide qual etapa mostrar na tela. É o arquivo mais longo do projeto.
- **`ChatMessage.tsx`** — a bolha dourada (mensagem da "Aurum") e a bolha
  cinza (resposta do cliente).
- **`StepContainer.tsx`** — a moldura de cada tela: largura máxima de
  430px, botão de voltar.
- **`SelectionCard.tsx`** — um cartão clicável genérico (usado pra
  escolher o veículo, por exemplo).
- **`ServiceListItem.tsx`** — a linha de cada serviço na lista (com
  miniatura da foto, nome, preço).
- **`LimpezaGroupCard.tsx`** — o card especial "Limpeza" que expande pra
  escolher o tipo (Manutenção/Técnica/Premium) e depois os adicionais
  (Undercar, Higienizações).
- **`DateSelector.tsx`** — a lista de dias (pula domingo).
- **`TimeSelector.tsx`** — a grade de horários disponíveis.
- **`DeliveryMethodSelector.tsx`** — "levar até a loja" vs "buscar em
  casa".
- **`EstimateSummary.tsx`** — o resumo do orçamento antes de agendar.
- **`WhatsAppRedirect.tsx`** — a contagem regressiva de 3s antes de
  redirecionar pro WhatsApp, na tela de confirmação final.

### 4.8 `app/` — as páginas de verdade

O Next.js usa o nome das pastas como endereço da URL. Uma pasta com
`(parênteses)` (como `(site)`) é só organizacional — não aparece na URL.

- **`app/layout.tsx`** — o "esqueleto" de toda página do site: carrega as
  fontes, define o `<html>` e `<body>`. Todo o resto entra dentro dele.
- **`app/(site)/layout.tsx`** — adiciona o `Header` só nas páginas
  públicas (não aparece em `/admin` nem em `/orcamento`, que têm cabeçalho
  próprio).
- **`app/(site)/page.tsx`** — a URL raiz (`/`). Hoje só redireciona pra
  `/servicos` — não existe mais uma "página inicial" separada.
- **`app/(site)/servicos/page.tsx`** — o catálogo completo, navegável,
  agrupado por categoria.
- **`app/(site)/servicos/[slug]/page.tsx`** — a página de detalhe de UM
  serviço (o `[slug]` quer dizer "qualquer id de serviço encaixa aqui",
  ex: `/servicos/revestimento-ceramico`).
- **`app/(site)/agendamentos/page.tsx`** — "Meus agendamentos": mostra o
  histórico de quem já tem uma sessão salva no navegador.
- **`app/orcamento/layout.tsx`** e **`app/orcamento/page.tsx`** — a tela
  cheia do fluxo de chat (`BookingChat`), com um cabeçalho mínimo (logo +
  botão de fechar).
- **`app/admin/layout.tsx`** — o menu lateral do painel administrativo.
- **`app/admin/page.tsx`** — o dashboard com números gerais.
- **`app/admin/clientes/page.tsx`** — tabela de clientes.
- **`app/admin/orcamentos/page.tsx`** — tabela de orçamentos.
- **`app/admin/servicos/page.tsx`** — edição visual dos preços/textos do
  catálogo (fica só salvo no navegador de quem editou, ver seção 3.1).
- **`app/admin/configuracoes/page.tsx`** — onde se troca o número de
  WhatsApp, endereço, etc.

### 4.9 `public/images/services/`
As 18 fotos usadas no site, nomeadas exatamente igual ao id de cada
serviço (ex: `revestimento-ceramico.jpg`). Trocar a fotos é só substituir o
arquivo — nenhum código precisa mudar.

### 4.10 Arquivos de configuração (raiz do projeto)

- **`next.config.ts`** — liga o modo `output: "standalone"`, que faz o
  Next.js gerar uma versão enxuta do servidor, usada pelo Dockerfile.
- **`Dockerfile`** — a receita de 3 passos (instalar dependências → buildar
  → rodar) que o Coolify usa pra criar e rodar o container.
- **`.dockerignore`** — lista do que NÃO deve entrar no pacote Docker
  (`node_modules`, `.git`, etc.).
- **`package.json`** — a lista de dependências (Next.js, React, etc.) e os
  comandos (`npm run dev`, `npm run build`).

---

## Resumo de uma frase por peça

Se alguém te perguntar "como isso funciona?" essa é a versão de elevador:

> É um site em Next.js/React, com o visual todo em Tailwind, que guarda os
> dados temporariamente no navegador de cada visitante (ainda sem banco de
> dados real), roda dentro de um container Docker no Coolify, e usa o
> WhatsApp como canal final de contato em vez de enviar mensagens sozinho.
