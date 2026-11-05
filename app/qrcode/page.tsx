import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "QR Code | Aurum Detailing",
  description: "QR Code oficial da Aurum Detailing.",
  robots: { index: false, follow: false },
};

const destination = "https://aurumcardetaling.com.br";

export default function QrCodePage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
      <section className="w-full max-w-xl rounded-2xl border border-border bg-background-secondary p-6 text-center shadow-2xl sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Aurum Detailing</p>
        <h1 className="mt-3 font-display text-3xl font-extrabold text-foreground sm:text-4xl">
          QR Code oficial
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted">
          Use este código no cartão de visitas para abrir o site oficial da Aurum Detailing.
        </p>

        <div className="mx-auto mt-8 w-fit rounded-xl bg-white p-4">
          <Image
            src="/qr-code-aurumcardetaling.png"
            alt="QR Code para abrir o site aurumcardetaling.com.br"
            width={1312}
            height={1312}
            priority
            className="h-64 w-64 sm:h-80 sm:w-80"
          />
        </div>

        <p className="mt-6 break-all rounded-lg border border-border bg-background px-4 py-3 font-mono text-sm text-gold-light">
          {destination}
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm">
          <a
            href="/qr-code-aurumcardetaling.svg"
            download="qr-code-aurumcardetaling.svg"
            className="rounded-lg border border-border-strong px-4 py-2 font-semibold text-gold-light transition-colors hover:bg-gold/10"
          >
            Baixar SVG para impressão
          </a>
          <a
            href="/qr-code-aurumcardetaling.png"
            download="qr-code-aurumcardetaling.png"
            className="rounded-lg border border-border px-4 py-2 font-semibold text-muted transition-colors hover:bg-white/5 hover:text-foreground"
          >
            Baixar PNG
          </a>
        </div>

        <Link href="/" className="mt-8 inline-block text-sm text-muted underline underline-offset-4 hover:text-foreground">
          Voltar ao site
        </Link>
      </section>
    </main>
  );
}
