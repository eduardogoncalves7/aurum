"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarX, LogOut } from "lucide-react";
import {
  AppointmentWithDetails,
  clearSession,
  getAppointmentsForPhone,
  getConfig,
  getSession,
} from "@/lib/storage";
import { getServiceById } from "@/lib/data/services";
import { vehicleSummaryLabel } from "@/lib/vehicle";
import { formatCurrency, formatDatePtBr } from "@/lib/formatters";
import { buildCancelWhatsAppMessage, buildWhatsAppLink } from "@/lib/whatsapp";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Quote } from "@/types";

const statusLabel: Record<Quote["status"], string> = {
  draft: "Rascunho",
  sent: "Enviado",
  scheduled: "Agendado",
  completed: "Concluído",
  cancelled: "Cancelado",
};

const statusTone: Record<Quote["status"], "neutral" | "gold" | "success" | "warning"> = {
  draft: "neutral",
  sent: "gold",
  scheduled: "warning",
  completed: "success",
  cancelled: "neutral",
};

export default function AgendamentosPage() {
  const [checked, setChecked] = useState(false);
  const [session, setSessionState] = useState<{ name: string; phone: string } | null>(null);
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([]);

  useEffect(() => {
    const s = getSession();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lê localStorage; precisa rodar após a hidratação para não gerar mismatch SSR/cliente
    setSessionState(s);
    if (s) {
      setAppointments(getAppointmentsForPhone(s.phone));
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
        </div>
        <button
          type="button"
          onClick={() => {
            clearSession();
            setSessionState(null);
            setAppointments([]);
          }}
          className="flex items-center gap-1.5 text-xs text-muted-dark hover:text-foreground"
        >
          <LogOut size={14} />
          Sair
        </button>
      </div>

      {appointments.length === 0 ? (
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
          {appointments.map(({ appointment, quote, vehicle }) => {
            const serviceNames = quote.serviceIds
              .map((id) => getServiceById(id)?.name)
              .filter((n): n is string => !!n);
            const cancellable = quote.status !== "cancelled" && quote.status !== "completed";

            return (
              <div
                key={appointment.id}
                className="rounded-xl border border-border bg-background-secondary p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-display font-bold text-foreground">
                    {formatDatePtBr(appointment.date)} · {appointment.time}
                  </p>
                  <Badge tone={statusTone[quote.status]}>
                    {statusLabel[quote.status]}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted">
                  {vehicleSummaryLabel(vehicle)} · {serviceNames.join(", ")}
                </p>
                <p className="mt-1 text-xs text-muted-dark">
                  {appointment.deliveryMethod === "dropoff"
                    ? "Leva até a loja"
                    : "Busca em casa (a combinar)"}
                </p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="font-display font-bold text-gold-light">
                    {formatCurrency(quote.estimatedTotal)}
                  </p>
                  {cancellable && (
                    <a
                      href={buildWhatsAppLink(
                        getConfig().whatsappDestination,
                        buildCancelWhatsAppMessage({
                          serviceNames,
                          dateLabel: formatDatePtBr(appointment.date),
                          time: appointment.time,
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
