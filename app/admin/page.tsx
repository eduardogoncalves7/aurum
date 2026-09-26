"use client";

import { useEffect, useState } from "react";
import { CalendarClock, FileText, TrendingUp, Users } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/formatters";
import { getAppointments, getCustomers, getQuotes } from "@/lib/storage";

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
    quotesToday: number;
    appointments: number;
    customers: number;
    averageTicket: number;
  } | null>(null);

  useEffect(() => {
    const quotes = getQuotes();
    const customers = getCustomers();
    const appointments = getAppointments();
    const quotesToday = quotes.filter((q) => isToday(q.createdAt)).length;
    const averageTicket = quotes.length
      ? quotes.reduce((sum, q) => sum + q.estimatedTotal, 0) / quotes.length
      : 0;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- lê localStorage; precisa rodar após a hidratação para não gerar mismatch SSR/cliente
    setStats({
      quotesToday,
      appointments: appointments.length,
      customers: customers.length,
      averageTicket,
    });
  }, []);

  const cards = [
    {
      label: "Orçamentos hoje",
      value: stats?.quotesToday ?? 0,
      icon: FileText,
    },
    {
      label: "Agendamentos",
      value: stats?.appointments ?? 0,
      icon: CalendarClock,
    },
    {
      label: "Clientes",
      value: stats?.customers ?? 0,
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
        Visão geral dos orçamentos e clientes do protótipo.
      </p>

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

      <p className="mt-8 text-xs text-muted-dark">
        Dados armazenados localmente neste navegador (localStorage). Ao
        integrar com Supabase, este painel passa a refletir o banco real.
      </p>
    </div>
  );
}
