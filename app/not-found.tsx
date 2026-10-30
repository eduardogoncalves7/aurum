import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.25em] text-gold">Aurum Detailing</p>
      <h1 className="text-4xl font-black tracking-tight">Página não encontrada</h1>
      <p className="max-w-md text-muted-foreground">O endereço acessado não existe ou foi movido.</p>
      <Link href="/servicos" className="rounded-md bg-gold px-5 py-3 text-sm font-semibold text-black">
        Ver serviços
      </Link>
    </main>
  );
}
