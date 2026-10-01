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
