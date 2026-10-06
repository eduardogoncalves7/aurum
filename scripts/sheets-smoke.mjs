import { createSheetsClient } from "../lib/sheets/index.ts";

const { sheetName, header, rows, errors, ignored } = await createSheetsClient().readServiceRows();
console.log(`Aba: ${sheetName}`);
console.log(`Serviços válidos: ${rows.length}`);
console.log(`Linhas ignoradas: ${ignored} (${errors.length} inválidas)`);
console.log(`Cabeçalho: ${header.join(", ")}`);
