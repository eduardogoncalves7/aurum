"use client";

import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface Props {
  whatsappLink: string;
  seconds?: number;
}

export function WhatsAppRedirect({ whatsappLink, seconds = 3 }: Props) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (remaining <= 0) {
      window.location.href = whatsappLink;
      return;
    }
    const timer = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining, whatsappLink]);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-background-secondary p-5 text-center">
      <MessageCircle className="mx-auto text-gold" size={28} />
      <p className="text-sm text-muted">
        Redirecionando para o WhatsApp em{" "}
        <span className="font-display font-bold text-gold-light">{remaining}s</span>
        …
      </p>
      <Button
        size="lg"
        onClick={() => {
          window.location.href = whatsappLink;
        }}
      >
        Ir agora
      </Button>
    </div>
  );
}
