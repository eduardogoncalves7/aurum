import { Suspense } from "react";
import { BookingChat } from "@/components/booking-chat/BookingChat";

export default function OrcamentoPage() {
  return (
    <Suspense fallback={null}>
      <BookingChat />
    </Suspense>
  );
}
