"use client";

import { useEffect, useState } from "react";
import { Customer, Quote, Vehicle } from "@/types";
import { getCustomers, getQuotes, getVehicles } from "@/lib/storage";
import { vehicleSummaryLabel } from "@/lib/vehicle";
import { formatCurrency, formatDatePtBr } from "@/lib/formatters";
import { Badge } from "@/components/ui/Badge";

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

export default function AdminQuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lê localStorage; precisa rodar após a hidratação para não gerar mismatch SSR/cliente
    setQuotes(getQuotes().sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    setCustomers(getCustomers());
    setVehicles(getVehicles());
  }, []);

  return (
    <div className="p-6 sm:p-8">
      <h1 className="font-display text-2xl font-extrabold text-foreground">
        Orçamentos
      </h1>
      <p className="mt-1 text-sm text-muted">
        Todos os orçamentos montados pelo site, do rascunho ao agendamento.
      </p>

      <div className="mt-6 overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border bg-background-secondary text-left text-xs uppercase tracking-wide text-muted-dark">
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Veículo</th>
              <th className="px-4 py-3 font-medium">Serviços</th>
              <th className="px-4 py-3 font-medium">Valor estimado</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Data</th>
            </tr>
          </thead>
          <tbody>
            {quotes.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-dark">
                  Nenhum orçamento ainda.
                </td>
              </tr>
            )}
            {quotes.map((quote) => {
              const customer = customers.find((c) => c.id === quote.customerId);
              const vehicle = vehicles.find((v) => v.id === quote.vehicleId);
              return (
                <tr key={quote.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-foreground">
                    {customer?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {vehicleSummaryLabel(vehicle ?? null)}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {quote.lineItems.length}{" "}
                    {quote.lineItems.length === 1 ? "serviço" : "serviços"}
                  </td>
                  <td className="px-4 py-3 font-medium text-gold-light">
                    {formatCurrency(quote.estimatedTotal)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={statusTone[quote.status]}>
                      {statusLabel[quote.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {formatDatePtBr(quote.createdAt.slice(0, 10))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
