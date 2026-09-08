"use client";

import { useEffect, useState } from "react";
import { AurumConfig, getConfig, saveConfig } from "@/lib/storage";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function AdminSettingsPage() {
  const [config, setConfig] = useState<AurumConfig | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lê localStorage; precisa rodar após a hidratação para não gerar mismatch SSR/cliente
    setConfig(getConfig());
  }, []);

  if (!config) return null;

  function handleSave() {
    if (!config) return;
    saveConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="p-6 sm:p-8">
      <h1 className="font-display text-2xl font-extrabold text-foreground">
        Configurações
      </h1>
      <p className="mt-1 max-w-lg text-sm text-muted">
        Dados usados no site e nas mensagens de orçamento enviadas pelo
        WhatsApp.
      </p>

      <div className="mt-6 flex max-w-md flex-col gap-4">
        <Input
          label="WhatsApp comercial (com DDI e DDD, só números)"
          value={config.whatsappDestination}
          onChange={(e) =>
            setConfig({ ...config, whatsappDestination: e.target.value })
          }
          placeholder="5531986506463"
        />
        <Input
          label="Telefone exibido no site"
          value={config.phone}
          onChange={(e) => setConfig({ ...config, phone: e.target.value })}
        />
        <Input
          label="Instagram"
          value={config.instagram}
          onChange={(e) => setConfig({ ...config, instagram: e.target.value })}
        />
        <Input
          label="Endereço"
          value={config.address}
          onChange={(e) => setConfig({ ...config, address: e.target.value })}
        />
        <Input
          label="Horário de funcionamento"
          value={config.hours}
          onChange={(e) => setConfig({ ...config, hours: e.target.value })}
        />

        <Button onClick={handleSave} className="self-start">
          {saved ? "Salvo!" : "Salvar configurações"}
        </Button>
      </div>
    </div>
  );
}
