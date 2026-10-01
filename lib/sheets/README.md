# Google Sheets (runtime Node)

Módulo isolado: não faz chamadas no import/build/start e não integra ainda o catálogo,
snapshot Postgres, revalidação Next ou endpoints. Configure as quatro variáveis
`GOOGLE_*` do `.env.example`; nunca use este módulo em componentes de cliente/Edge.

```ts
import { readServiceRows, upsertRows, setActive } from "@/lib/sheets";

const { rows, errors } = await readServiceRows();
await upsertRows([{ id: "id-estavel", preco: 150 }], { updatedBy: "admin" });
await setActive("id-estavel", false, { updatedBy: "admin" });
```

- Leitura resolve o nome pelo gid a cada operação, usa UNFORMATTED_VALUE e retorna
  linhas normalizadas e relatório `{ row, code, fields }`, sem conteúdo das células.
  Linhas sem id/serviço são descartadas; duplicatas e classificações desconhecidas
  vão para o relatório. Falhas de transporte/cabeçalho lançam `SheetsError`.
- Listas usam `;`; números aceitam números nativos, texto decimal e moeda brasileira.
  Campos numéricos vazios viram `undefined`; listas vazias viram `[]`.
- Escritas validam todo o lote antes de enviar. Atualizações usam values.batchUpdate
  só nas células fornecidas; inserções usam values.update depois do último id.
  `undefined` preserva a célula; `""` limpa campos opcionais. Auditoria sempre recebe
  ISO UTC e autor (padrão `admin`). Não é permitido inserir com setActive.
- Operações de escrita são serializadas por cliente/processo. Não há transação
  entre atualizações e inserções, lock distribuído ou comparação otimista de
  atualizado_em. Edições simultâneas externas exigem coordenação na integração.
- `readAuxTab("Portes" | "Categorias" | "Config")` também retorna `{ rows, errors }`.
- `appendLog({ origem, acao, id, resultado })` é explícito, usa values.update e
  nunca propaga falhas. Envie apenas mensagens operacionais sem segredos; não passe
  credenciais, corpos HTTP ou objetos Error como conteúdo do log.
- JWT RS256 e token compartilhado por cliente, renovado 60 s antes da expiração.
  Cada tentativa tem timeout de 10 s; 429/5xx têm até três retries (250/500/1000 ms).
  Erros não incluem respostas Google, URLs, chave ou token. Não há console logging.

Execute `npm test`. A fixture de 51 serviços + 950 linhas de checkboxes é **sintética**:
o contexto fornecido não contém as 51 linhas reais completas. É necessário obter o
CSV/JSON real para cumprir a verificação com dados de produção. Os testes não
acessam o Google nem leem credenciais reais.

## Mapper

`rowsToServices(rows, portes, config, { now? })` retorna `{ services, groups, errors }`.
Recebe os arrays `rows` das leituras, e Config pode ser array de `{ chave, valor }`
ou objeto. A função não acessa rede nem escreve logs: `errors` é o relatório seguro
de linhas descartadas (linha do array + 2; 0 para conflitos entre grupos/config).
O chamador pode encaminhar os códigos a `appendLog` sem enviar dados de células.

`services` preserva os serviços reais usados pelo orçamento e os IDs legados.
`groups` contém Limpeza (seleção única + adicionais), Higienização (múltipla),
Revestimento (única), Kits (múltipla) e PPF Completos (única). Não cria um quarto
serviço fictício de Limpeza: o único card do grupo usa os três serviços reais,
como o componente atual. Vitrines cerâmica/PPF recebem variantes/tabelas derivadas.
As telas ainda não consomem esse resultado; a integração de catálogo continua pendente.

`pricesForVehicle` resolve os preços segundo Portes, inclusive Sedan e Outro.
O pequeno suporte em `calculateServicePrice` aplica essa tabela somente aos serviços
mapeados. Isso corrige a divergência do código antigo que associava Sedan a médio:
com o mapeamento fornecido, Hatch/Sedan usa Carro Pequeno. `priceOnRequest` identifica
Sob consulta e impede incluí-lo no total como preço fixo zero. As telas podem usar
`originalPrice`/`originalPrices` (também nas variantes e itens de tabela) para riscar
o preço original; o mapper não altera componentes visuais.

Datas ISO com fuso são aceitas. Datas sem horário cobrem o dia inteiro em UTC-3
(São Paulo); início/fim são inclusivos e ambos são obrigatórios para promoções.
Promoção com janela inválida gera erro por linha. Valores originais ficam preservados.

`serviceToRows(service, portes)` retorna linhas normalizadas para `upsertRows`.
Os metadados `sheetSource` são serializáveis e devem ser mantidos no fluxo de edição:
sem eles não há como reconstruir auditoria, promoções e demais campos exclusivos
da planilha. Editar nome preserva os IDs; editar preço durante promoção altera o
promocional vigente, preservando o preço-base. Os metadados não são credenciais.
Linhas inativas/descartadas não compõem o resultado e não são apagadas da planilha.

Para serviços novos, a primeira conversão atribui `service.id` e `sheetSource` ao
objeto recebido, usando slug + UUID; `legacy_id` fica vazio. Persista esse objeto/ID
para que retries e edições mantenham a identidade. O mesmo nome pode ser criado
em duas entidades distintas sem colisão. Serviços novos precisam indicar um tipo
de veículo e preços compatíveis com a dimensão e a aba Portes.

Edição de tabelas/variantes de uma vitrine é feita nos serviços filhos reais.
Alterações na dimensão, compatibilidade ou nas projeções derivadas são rejeitadas
com `SheetsError(SCHEMA)`, evitando perda silenciosa de dados. Após gravar, releia
para atualizar os metadados. A auditoria de escrita é preenchida por `upsertRows`.

A fixture `catalog-fixture.ts` reconstrói 51 linhas a partir do catálogo versionado
e aplica as três correções documentadas (120, 300 e 250). Valida ida e volta das 27
colunas, agrupamentos e preços, mas **não substitui o export real** da planilha,
necessário para certificar todos os nomes e conteúdos de produção.
