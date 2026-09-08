export function ChatMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex">
      <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-gold/12 px-4 py-3 text-[15px] leading-relaxed text-foreground">
        {children}
      </div>
    </div>
  );
}

/** Recapitulação da resposta anterior do cliente, alinhada à direita. */
export function UserAnswerBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-background-elevated px-4 py-2.5 text-sm text-muted">
        {children}
      </div>
    </div>
  );
}
