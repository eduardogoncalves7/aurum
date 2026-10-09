import type { AgendamentoInput } from "@/lib/agendamentos";
import type { OrcamentoInput } from "@/lib/orcamentos";

export async function submitQuote(input: OrcamentoInput) {
  const response = await fetch("/api/orcamentos", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input),
  });
  const result = await response.json().catch(() => null);
  if (response.status !== 201 || typeof result?.orcamento?.id !== "string" || !result.orcamento.id) {
    throw new Error("Não foi possível registrar o orçamento. Tente novamente.");
  }
  return result.orcamento;
}

export async function submitBooking(input: AgendamentoInput) {
  const response = await fetch("/api/agendamentos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const result = await response.json().catch(() => null);
  if (response.status !== 201 || typeof result?.agendamento?.id !== "string" || !result.agendamento.id) {
    throw new Error(response.ok
      ? "Não foi possível confirmar o registro. Confira seu histórico antes de tentar novamente."
      : "Não foi possível salvar o agendamento. Tente novamente ou fale com a Aurum pelo WhatsApp.");
  }
  return result.agendamento;
}

export async function clearBookingAccess() {
  const response = await fetch("/api/agendamentos", { method: "DELETE" });
  if (!response.ok) throw new Error("Não foi possível encerrar o acesso ao histórico. Tente novamente.");
}
