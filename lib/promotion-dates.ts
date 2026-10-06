/** Dates are calendar days, not timestamps. Never parse a locale-dependent string. */
export function isIsoCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000")) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

export function brazilianDateToIso(value: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const iso = `${match[3]}-${match[2]}-${match[1]}`;
  return isIsoCalendarDate(iso) ? iso : null;
}

export function isoDateToBrazilian(value: string): string {
  if (!isIsoCalendarDate(value)) return "";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

export function promotionDateError(start: string, end: string): string | null {
  if (!isIsoCalendarDate(start) || !isIsoCalendarDate(end)) {
    return "Informe datas válidas de início e fim no formato dia/mês/ano (dd/mm/aaaa).";
  }
  if (end < start) return "A data final da promoção não pode ser antes do início.";
  return null;
}

export function todayInSaoPaulo(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
