"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { PublicConfig } from "@/lib/config";

const fields: { key: keyof PublicConfig; label: string }[] = [
  { key: "whatsappDestination", label: "WhatsApp comercial (DDI + DDD + número)" },
  { key: "phone", label: "Telefone exibido no site" },
  { key: "instagram", label: "Instagram" },
  { key: "address", label: "Endereço" },
  { key: "hours", label: "Horário de funcionamento" },
];

export default function AdminSettingsPage() {
  const [values, setValues] = useState<PublicConfig | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => { fetch("/api/admin/configuracoes").then((r) => r.json()).then(setValues).catch(() => setMessage("Não foi possível carregar as configurações.")); }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!values) return;
    setSaving(true); setMessage("");
    try {
      const response = await fetch("/api/admin/configuracoes", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setValues(data.settings); setMessage("Configurações salvas.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Falha ao salvar."); }
    finally { setSaving(false); }
  }

  return <div className="p-6 sm:p-8">
    <h1 className="font-display text-2xl font-extrabold text-foreground">Configurações</h1>
    <p className="mt-1 max-w-lg text-sm text-muted">Edite os dados públicos da loja. As alterações ficam no Postgres e não exigem novo deploy.</p>
    <form onSubmit={save} className="mt-6 flex max-w-xl flex-col gap-4">
      {values && fields.map(({ key, label }) => <Input key={key} label={label} value={values[key]} onChange={(e) => setValues((current) => current ? { ...current, [key]: e.target.value } : current)} required />)}
      <Button type="submit" disabled={!values || saving}>{saving ? "Salvando..." : "Salvar configurações"}</Button>
      {message && <p className="text-sm text-muted">{message}</p>}
    </form>
  </div>;
}
