import { Suspense } from "react";
import { pageMetadata } from "@/lib/page-metadata";
import { BookingChat } from "@/components/booking-chat/BookingChat";

export const metadata = pageMetadata(
  "Orçamento e agendamento online",
  "Monte seu orçamento de estética automotiva na Aurum Detailing. Escolha os serviços para seu veículo e solicite um agendamento em Coronel Fabriciano, MG.",
  "/orcamento"
);

export default function OrcamentoPage() {
  return (
    <>
      <h1 className="sr-only">Orçamento e agendamento na Aurum Detailing</h1>
      <Suspense fallback={null}>
        <BookingChat />
      </Suspense>
    </>
  );
}
