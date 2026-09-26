"use client";

import { useEffect, useState } from "react";
import { CalendarClock, FileText, TrendingUp, Users } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/formatters";
import { Agendamento } from "@/lib/agendamentos";

function isToday(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<{
    agendamentosHoje: number;
    agendamentos: number;
    clientes: number;
    averageTicket: number;
  } | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    fetch("/api/admin/agendamentos")
      .then((res) => {
        if (!res.ok) throw new Error("Falha ao carregar");
        return res.json();
      })
      .then((data: { agendamentos: Agendamento[] }) => {
        const agendamentos = data.agendamentos ?? [];
        const agendamentosHoje = agendamentos.filter((a) => isToday(a.criadoEm)).length;
        const clientesUnicos = new Set(agendamentos.map((a) => a.telefone)).size;
        const averageTicket = agendamentos.length
          ? agendamentos.reduce((sum, a) => sum + a.valorEstimado, 0) / agendamentos.length
          : 0;

        setStats({
          agendamentosHoje,
          agendamentos: agendamentos.length,
          clientes: clientesUnicos,
          averageTicket,
        });
      })
      .catch(() => setLoadError(true));
  }, []);

  const cards = [
    {
      label: "Agendamentos hoje",
      value: stats?.agendamentosHoje ?? 0,
      icon: FileText,
    },
    {
      label: "Agendamentos (total)",
      value: stats?.agendamentos ?? 0,
      icon: CalendarClock,
    },
    {
      label: "Clientes (telefones distintos)",
      value: stats?.clientes ?? 0,
      icon: Users,
    },
    {
      label: "Ticket médio estimado",
      value: formatCurrency(stats?.averageTicket ?? 0),
      icon: TrendingUp,
    },
  ];

  return (
    <div className="p-6 sm:p-8">
      <h1 className="font-display text-2xl font-extrabold text-foreground">
        Dashboard
      </h1>
      <p className="mt-1 text-sm text-muted">
        Visão geral dos agendamentos.
      </p>

      {loadError && (
        <p className="mt-6 text-sm text-red-400">
          Não foi possível carregar os dados agora. Tente novamente em
          instantes.
        </p>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="p-5">
            <Icon size={20} className="text-gold" />
            <p className="mt-3 font-display text-2xl font-extrabold text-foreground">
              {value}
            </p>
            <p className="mt-1 text-sm text-muted">{label}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
