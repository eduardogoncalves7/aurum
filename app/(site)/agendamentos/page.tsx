"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarX, LogOut } from "lucide-react";
import { clearSession, getSession } from "@/lib/storage";
import { getPublicConfig } from "@/lib/config";
import { vehicleLabelFromAgendamento } from "@/lib/vehicle";
import { formatCurrency, formatDatePtBr } from "@/lib/formatters";
import { buildCancelWhatsAppMessage, buildWhatsAppLink } from "@/lib/whatsapp";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Agendamento, AgendamentoStatus } from "@/lib/agendamentos";

const statusLabel: Record<AgendamentoStatus, string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  completed: "Concluído",
  cancelled: "Cancelado",
};

const statusTone: Record<AgendamentoStatus, "neutral" | "gold" | "success" | "warning"> = {
  pending: "warning",
  confirmed: "gold",
  completed: "success",
  cancelled: "neutral",
};

export default function AgendamentosPage() {
  const [checked, setChecked] = useState(false);
  const [session, setSessionState] = useState<{ name: string; phone: string } | null>(null);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loadError, setLoadError] = useState(false);
  const config = getPublicConfig();

  useEffect(() => {
    const s = getSession();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lê localStorage; precisa rodar após a hidratação para não gerar mismatch SSR/cliente
    setSessionState(s);
    if (s) {
      fetch(`/api/agendamentos?telefone=${encodeURIComponent(s.phone)}`)
        .then((res) => {
          if (!res.ok) throw new Error("Falha ao carregar agendamentos");
          return res.json();
        })
        .then((data) => setAgendamentos(data.agendamentos ?? []))
        .catch(() => setLoadError(true));
    }
    setChecked(true);
  }, []);

  if (!checked) return null;

  if (!session) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-20 text-center">
        <CalendarX className="text-muted" size={36} strokeWidth={1.5} />
        <h1 className="font-display text-xl font-extrabold text-foreground">
          Nenhum agendamento encontrado
        </h1>
        <p className="text-sm text-muted">
          Você ainda não montou nenhum orçamento neste navegador. Comece um
          agora para ver seu histórico aqui.
        </p>
        <Link href="/orcamento">
          <Button size="lg">Montar orçamento</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-foreground">
            Meus agendamentos
          </h1>
          <p className="mt-1 text-sm text-muted">{session.name} · {session.phone}</p>
          {/* Nota pra quem mexer aqui: a sessão salva no navegador (nome+
              telefone) não é autenticação — qualquer um que informe o mesmo
              telefone no /orcamento acessa o mesmo histórico. Não transformar
              isso num controle de acesso real. */}
        </div>
        <button
          type="button"
          onClick={() => {
            clearSession();
            setSessionState(null);
            setAgendamentos([]);
          }}
          className="flex items-center gap-1.5 text-xs text-muted-dark hover:text-foreground"
        >
          <LogOut size={14} />
          Sair
        </button>
      </div>

      {loadError && (
        <p className="mt-6 text-sm text-red-400">
          Não foi possível carregar seus agendamentos agora. Tente novamente
          em instantes.
        </p>
      )}

      {!loadError && agendamentos.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-4 text-center">
          <CalendarX className="text-muted" size={32} strokeWidth={1.5} />
          <p className="text-sm text-muted">
            Nenhum agendamento ainda. Que tal marcar o primeiro?
          </p>
          <Link href="/orcamento">
            <Button>Montar orçamento</Button>
          </Link>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {agendamentos.map((agendamento) => {
            const serviceNames = agendamento.servicos.map((s) => s.nome);
            const cancellable =
              agendamento.status !== "cancelled" && agendamento.status !== "completed";

            return (
              <div
                key={agendamento.id}
                className="rounded-xl border border-border bg-background-secondary p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-display font-bold text-foreground">
                    {formatDatePtBr(agendamento.data)} · {agendamento.horario}
                  </p>
                  <Badge tone={statusTone[agendamento.status]}>
                    {statusLabel[agendamento.status]}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted">
                  {vehicleLabelFromAgendamento(agendamento.veiculoTipo, agendamento.veiculoDetalhe)}
                  {" · "}
                  {serviceNames.join(", ")}
                </p>
                <p className="mt-1 text-xs text-muted-dark">
                  {agendamento.formaEntrega === "dropoff"
                    ? "Leva até a loja"
                    : "Busca em casa (a combinar)"}
                </p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="font-display font-bold text-gold-light">
                    {formatCurrency(agendamento.valorEstimado)}
                  </p>
                  {cancellable && (
                    <a
                      href={buildWhatsAppLink(
                        config.whatsappDestination,
                        buildCancelWhatsAppMessage({
                          serviceNames,
                          dateLabel: formatDatePtBr(agendamento.data),
                          time: agendamento.horario,
                        })
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-muted-dark underline underline-offset-2 hover:text-foreground"
                    >
                      Cancelar
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Link href="/orcamento" className="mt-8 block">
        <Button size="lg" variant="secondary" className="w-full">
          Novo orçamento
        </Button>
      </Link>
    </div>
  );
}
