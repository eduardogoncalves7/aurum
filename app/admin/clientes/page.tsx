"use client";

import { useEffect, useState } from "react";
import { Customer } from "@/types";
import { getCustomers, getQuotes, getVehicles } from "@/lib/storage";
import { vehicleSummaryLabel } from "@/lib/vehicle";
import { formatDatePtBr } from "@/lib/formatters";

interface Row {
  customer: Customer;
  quoteCount: number;
  lastQuoteAt: string | null;
  vehicleLabel: string;
}

export default function AdminCustomersPage() {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    const customers = getCustomers();
    const quotes = getQuotes();
    const vehicles = getVehicles();

    const data = customers.map((customer) => {
      const customerQuotes = quotes
        .filter((q) => q.customerId === customer.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

      const lastQuote = customerQuotes[0];
      const vehicle = lastQuote
        ? vehicles.find((v) => v.id === lastQuote.vehicleId)
        : undefined;

      return {
        customer,
        quoteCount: customerQuotes.length,
        lastQuoteAt: lastQuote?.createdAt ?? null,
        vehicleLabel: vehicleSummaryLabel(vehicle ?? null),
      };
    });

    // eslint-disable-next-line react-hooks/set-state-in-effect -- lê localStorage; precisa rodar após a hidratação para não gerar mismatch SSR/cliente
    setRows(data.sort((a, b) => b.customer.updatedAt.localeCompare(a.customer.updatedAt)));
  }, []);

  return (
    <div className="p-6 sm:p-8">
      <h1 className="font-display text-2xl font-extrabold text-foreground">
        Clientes
      </h1>
      <p className="mt-1 text-sm text-muted">
        Clientes identificados pelo telefone — sem cadastro tradicional.
      </p>

      <div className="mt-6 overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-border bg-background-secondary text-left text-xs uppercase tracking-wide text-muted-dark">
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Telefone</th>
              <th className="px-4 py-3 font-medium">Último atendimento</th>
              <th className="px-4 py-3 font-medium">Veículo</th>
              <th className="px-4 py-3 font-medium">Orçamentos</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-dark">
                  Nenhum cliente registrado ainda. Os cadastros aparecem aqui
                  assim que um orçamento é montado no site.
                </td>
              </tr>
            )}
            {rows.map(({ customer, quoteCount, lastQuoteAt, vehicleLabel }) => (
              <tr key={customer.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium text-foreground">
                  {customer.name}
                </td>
                <td className="px-4 py-3 text-muted">{customer.phone}</td>
                <td className="px-4 py-3 text-muted">
                  {lastQuoteAt ? formatDatePtBr(lastQuoteAt.slice(0, 10)) : "—"}
                </td>
                <td className="px-4 py-3 text-muted">{vehicleLabel}</td>
                <td className="px-4 py-3 text-muted">{quoteCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
