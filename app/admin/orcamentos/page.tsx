"use client";

import { useEffect, useState } from "react";
import { Agendamento, AgendamentoStatus } from "@/lib/agendamentos";
import { vehicleLabelFromAgendamento } from "@/lib/vehicle";
import { formatCurrency, formatDatePtBr } from "@/lib/formatters";
import { Badge } from "@/components/ui/Badge";

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

export default function AdminAgendamentosPage() {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    fetch("/api/admin/agendamentos")
      .then((res) => {
        if (!res.ok) throw new Error("Falha ao carregar");
        return res.json();
      })
      .then((data: { agendamentos: Agendamento[] }) => {
        setAgendamentos(
          [...(data.agendamentos ?? [])].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
        );
      })
      .catch(() => setLoadError(true));
  }, []);

  return (
    <div className="p-6 sm:p-8">
      <h1 className="font-display text-2xl font-extrabold text-foreground">
        Agendamentos
      </h1>
      <p className="mt-1 text-sm text-muted">
        Todos os agendamentos confirmados pelo site.
      </p>

      {loadError && (
        <p className="mt-6 text-sm text-red-400">
          Não foi possível carregar os agendamentos agora.
        </p>
      )}

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
            {agendamentos.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-dark">
                  Nenhum agendamento ainda.
                </td>
              </tr>
            )}
            {agendamentos.map((agendamento) => (
              <tr key={agendamento.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium text-foreground">
                  {agendamento.nome}
                  <span className="block text-xs font-normal text-muted-dark">
                    {agendamento.telefone}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted">
                  {vehicleLabelFromAgendamento(agendamento.veiculoTipo, agendamento.veiculoDetalhe)}
                </td>
                <td className="px-4 py-3 text-muted">
                  {agendamento.servicos.length}{" "}
                  {agendamento.servicos.length === 1 ? "serviço" : "serviços"}
                </td>
                <td className="px-4 py-3 font-medium text-gold-light">
                  {formatCurrency(agendamento.valorEstimado)}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={statusTone[agendamento.status]}>
                    {statusLabel[agendamento.status]}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-muted">
                  {formatDatePtBr(agendamento.data)} · {agendamento.horario}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
