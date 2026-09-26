// ---------------------------------------------------------------------------
// Sessão local do cliente no navegador (localStorage).
//
// IMPORTANTE: isto é só uma conveniência de UX — evita pedir nome/telefone
// de novo numa próxima visita do MESMO navegador. NÃO é autenticação:
// - não prova quem a pessoa é (qualquer um com acesso ao navegador vê/edita);
// - não deve ser usado como controle de acesso a nada sensível;
// - não implementar aqui nenhuma verificação que pareça um "login seguro"
//   (ex: bloquear rotas com base nisso) — daria uma falsa sensação de
//   segurança. Autenticação de verdade, se algum dia for necessária, precisa
//   de servidor + credenciais reais, não de um valor lido do localStorage.
//
// Todo o resto que antes vivia aqui (clientes, veículos, orçamentos,
// agendamentos, config do site, overrides de serviço) foi movido:
// - agendamentos -> Postgres, via lib/agendamentos.ts + app/api/agendamentos
// - config pública (WhatsApp, endereço...) -> variáveis de ambiente, em
//   lib/config.ts
// - edição visual de serviços -> removida (catálogo é só lib/data/services.ts)
// ---------------------------------------------------------------------------

const SESSION_KEY = "aurum_session";

export interface ClientSession {
  name: string;
  phone: string;
}

function isBrowser() {
  return typeof window !== "undefined";
}

export function getSession(): ClientSession | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as ClientSession) : null;
  } catch {
    return null;
  }
}

export function setSession(name: string, phone: string) {
  if (!isBrowser()) return;
  window.localStorage.setItem(SESSION_KEY, JSON.stringify({ name, phone }));
}

export function clearSession() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(SESSION_KEY);
}
