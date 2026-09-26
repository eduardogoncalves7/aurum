import { Pool } from "pg";

// Server-only: este módulo nunca deve ser importado por um componente
// "use client" — só por Route Handlers / código de servidor (ver
// lib/agendamentos.ts). Um Pool por processo, reaproveitado entre chamadas.

declare global {
  var __aurumPgPool: Pool | undefined;
}

export function getPool(): Pool {
  if (!global.__aurumPgPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        "DATABASE_URL não configurada — defina a connection string do Postgres nas variáveis de ambiente."
      );
    }
    global.__aurumPgPool = new Pool({ connectionString });
  }
  return global.__aurumPgPool;
}
