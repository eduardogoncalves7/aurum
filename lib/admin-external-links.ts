export interface AdminExternalLinks {
  spreadsheetUrl?: string;
  financeiroUrl?: string;
}

/** Deve ser chamado pelo layout Server Component do admin. */
export function getAdminExternalLinks(
  env: Record<string, string | undefined> = process.env
): AdminExternalLinks {
  const sheetId = env.GOOGLE_SERVICES_SHEET_ID?.trim();
  const sheetGid = env.GOOGLE_SERVICES_SHEET_GID?.trim();
  const spreadsheetUrl = sheetId && sheetGid
    ? `https://docs.google.com/spreadsheets/d/${encodeURIComponent(sheetId)}/edit?gid=${encodeURIComponent(sheetGid)}`
    : undefined;

  const configuredFinanceUrl = env.FINANCEIRO_URL?.trim();
  let financeiroUrl: string | undefined;
  if (configuredFinanceUrl?.startsWith("https://")) {
    try {
      const parsed = new URL(configuredFinanceUrl);
      if (parsed.protocol === "https:") financeiroUrl = parsed.toString();
    } catch {
      // URL ausente ou inválida: o atalho simplesmente não aparece.
    }
  }

  return { spreadsheetUrl, financeiroUrl };
}
