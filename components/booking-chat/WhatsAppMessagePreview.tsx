"use client";

import { useState } from "react";
import { Copy, Check, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { isWhatsAppConfigured } from "@/lib/whatsapp";

interface Props {
  message: string;
  whatsappLink: string;
  whatsappDestination: string;
}

export function WhatsAppMessagePreview({
  message,
  whatsappLink,
  whatsappDestination,
}: Props) {
  const [copied, setCopied] = useState(false);
  const whatsappReady = isWhatsAppConfigured(whatsappDestination);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard indisponível (ex: contexto não seguro) — sem tratamento
      // adicional necessário no protótipo.
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium text-muted">
        Mensagem pronta para enviar
      </p>
      <pre className="whitespace-pre-wrap rounded-xl border border-border bg-background-secondary p-4 font-sans text-sm leading-relaxed text-foreground">
        {message}
      </pre>

      <div className="flex flex-col gap-2.5 sm:flex-row">
        <Button
          variant="secondary"
          className="flex-1 gap-2"
          onClick={handleCopy}
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? "Copiado!" : "Copiar mensagem"}
        </Button>

        {whatsappReady ? (
          <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="flex-1">
            <Button className="w-full gap-2">
              <MessageCircle size={16} />
              Enviar pelo WhatsApp
            </Button>
          </a>
        ) : (
          <Button
            disabled
            title="Envio pelo WhatsApp ainda não configurado"
            className="flex-1 gap-2"
          >
            <MessageCircle size={16} />
            Enviar pelo WhatsApp
          </Button>
        )}
      </div>
    </div>
  );
}
