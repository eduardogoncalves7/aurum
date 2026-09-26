"use client";

import { getPublicConfig } from "@/lib/config";

// Configurações passaram a vir de variáveis de ambiente definidas no deploy
// (ver .env.example), não mais de localStorage editável aqui. Isso porque
// o banco deste projeto guarda só agendamentos — não há tabela de config.
// Pra mudar algo, ajuste as variáveis de ambiente e refaça o build/deploy
// (elas são NEXT_PUBLIC_*, ou seja, precisam estar presentes já no build).
export default function AdminSettingsPage() {
  const config = getPublicConfig();

  const fields: { label: string; value: string; envVar: string }[] = [
    {
      label: "WhatsApp comercial",
      value: config.whatsappDestination,
      envVar: "NEXT_PUBLIC_WHATSAPP_NUMBER",
    },
    { label: "Telefone exibido no site", value: config.phone, envVar: "NEXT_PUBLIC_PHONE" },
    { label: "Instagram", value: config.instagram, envVar: "NEXT_PUBLIC_INSTAGRAM" },
    { label: "Endereço", value: config.address, envVar: "NEXT_PUBLIC_ADDRESS" },
    { label: "Horário de funcionamento", value: config.hours, envVar: "NEXT_PUBLIC_HOURS" },
  ];

  return (
    <div className="p-6 sm:p-8">
      <h1 className="font-display text-2xl font-extrabold text-foreground">
        Configurações
      </h1>
      <p className="mt-1 max-w-lg text-sm text-muted">
        Somente leitura: esses valores vêm de variáveis de ambiente do
        deploy, não são mais editáveis por aqui.
      </p>

      <div className="mt-6 flex max-w-md flex-col gap-3">
        {fields.map((field) => (
          <div key={field.envVar} className="rounded-lg border border-border bg-background-secondary p-3">
            <p className="text-xs uppercase tracking-wide text-muted-dark">{field.label}</p>
            <p className="mt-1 font-medium text-foreground">{field.value}</p>
            <p className="mt-1 text-[11px] text-muted-dark">env: {field.envVar}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
