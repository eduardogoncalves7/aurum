"use client";

import { useEffect, useState } from "react";
import { Agendamento } from "@/lib/agendamentos";
import { vehicleLabelFromAgendamento } from "@/lib/vehicle";
import { formatDatePtBr } from "@/lib/formatters";

interface Row {
  telefone: string;
  nome: string; // nome do agendamento mais recente
  agendamentosCount: number;
  ultimoAgendamentoEm: string;
  vehicleLabel: string;
}

export default function AdminCustomersPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    fetch("/api/admin/agendamentos")
      .then((res) => {
        if (!res.ok) throw new Error("Falha ao carregar");
        return res.json();
      })
      .then((data: { agendamentos: Agendamento[] }) => {
        const byPhone = new Map<string, Agendamento[]>();
        for (const agendamento of data.agendamentos ?? []) {
          const list = byPhone.get(agendamento.telefone) ?? [];
          list.push(agendamento);
          byPhone.set(agendamento.telefone, list);
        }

        const result: Row[] = Array.from(byPhone.entries()).map(([telefone, lista]) => {
          const ordenada = [...lista].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
          const maisRecente = ordenada[0];
          return {
            telefone,
            nome: maisRecente.nome,
            agendamentosCount: lista.length,
            ultimoAgendamentoEm: maisRecente.criadoEm,
            vehicleLabel: vehicleLabelFromAgendamento(
              maisRecente.veiculoTipo,
              maisRecente.veiculoDetalhe
            ),
          };
        });

        result.sort((a, b) => b.ultimoAgendamentoEm.localeCompare(a.ultimoAgendamentoEm));
        setRows(result);
      })
      .catch(() => setLoadError(true));
  }, []);

  return (
    <div className="p-6 sm:p-8">
      <h1 className="font-display text-2xl font-extrabold text-foreground">
        Clientes
      </h1>
      <p className="mt-1 text-sm text-muted">
        Clientes identificados pelo telefone — sem cadastro tradicional. O
        nome exibido é o informado no agendamento mais recente.
      </p>

      {loadError && (
        <p className="mt-6 text-sm text-red-400">
          Não foi possível carregar os clientes agora.
        </p>
      )}

      <div className="mt-6 overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-border bg-background-secondary text-left text-xs uppercase tracking-wide text-muted-dark">
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Telefone</th>
              <th className="px-4 py-3 font-medium">Último atendimento</th>
              <th className="px-4 py-3 font-medium">Veículo</th>
              <th className="px-4 py-3 font-medium">Agendamentos</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-dark">
                  Nenhum cliente registrado ainda. Os registros aparecem aqui
                  assim que um agendamento é confirmado no site.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.telefone} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium text-foreground">{row.nome}</td>
                <td className="px-4 py-3 text-muted">{row.telefone}</td>
                <td className="px-4 py-3 text-muted">
                  {formatDatePtBr(row.ultimoAgendamentoEm.slice(0, 10))}
                </td>
                <td className="px-4 py-3 text-muted">{row.vehicleLabel}</td>
                <td className="px-4 py-3 text-muted">{row.agendamentosCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
