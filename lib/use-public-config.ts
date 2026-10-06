"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getPublicConfig, type PublicConfig } from "@/lib/config";

export function usePublicConfig(): PublicConfig {
  const [config, setConfig] = useState(getPublicConfig);
  const pathname = usePathname();

  useEffect(() => {
    let active = true;
    let pending: AbortController | undefined;
    async function refresh() {
      pending?.abort();
      const controller = new AbortController();
      pending = controller;
      try {
        const response = await fetch("/api/config", { cache: "no-store", signal: controller.signal });
        if (!response.ok) return;
        const value: PublicConfig = await response.json();
        if (active && !controller.signal.aborted) setConfig(value);
      } catch {
        // Mantém a última configuração disponível se a conexão falhar.
      }
    }
    function visible() {
      if (document.visibilityState === "visible") void refresh();
    }
    void refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", visible);
    return () => {
      active = false;
      pending?.abort();
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [pathname]);

  return config;
}
