import { pageMetadata } from "@/lib/page-metadata";

export const metadata = {
  ...pageMetadata("Meus agendamentos", "Consulte seus agendamentos e acompanhe o atendimento do seu veículo na Aurum Detailing.", "/agendamentos"),
  robots: { index: false, follow: true },
};

export default function AgendamentosLayout({ children }: { children: React.ReactNode }) {
  return children;
}
