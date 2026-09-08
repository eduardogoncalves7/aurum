"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getServiceById, isServiceAvailableForVehicleType, services } from "@/lib/data/services";
import { calculateQuoteTotal } from "@/lib/pricing";
import { vehicleOptions, vehicleSummaryLabel } from "@/lib/vehicle";
import { buildAppointmentWhatsAppMessage, buildWhatsAppLink, buildWhatsAppMessage } from "@/lib/whatsapp";
import {
  getAppointments,
  getConfig,
  saveAppointment,
  saveQuote,
  saveVehicle,
  updateQuoteStatus,
  upsertCustomer,
} from "@/lib/storage";
import { Quote, Vehicle, VehicleChatChoice } from "@/types";
import { formatCurrency, formatDatePtBr, isValidPhone, maskPhone } from "@/lib/formatters";

import { ChatMessage, UserAnswerBubble } from "@/components/booking-chat/ChatMessage";
import { StepContainer } from "@/components/booking-chat/StepContainer";
import { SelectionCard } from "@/components/booking-chat/SelectionCard";
import { ServiceListItem } from "@/components/booking-chat/ServiceListItem";
import { DateSelector } from "@/components/booking-chat/DateSelector";
import { TimeSelector } from "@/components/booking-chat/TimeSelector";
import { EstimateSummary } from "@/components/booking-chat/EstimateSummary";
import { WhatsAppMessagePreview } from "@/components/booking-chat/WhatsAppMessagePreview";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { CalendarCheck } from "lucide-react";

type Step =
  | "name"
  | "phone"
  | "vehicle"
  | "service"
  | "quote"
  | "date"
  | "time"
  | "confirmation";

const STEP_ORDER: Step[] = [
  "name",
  "phone",
  "vehicle",
  "service",
  "quote",
  "date",
  "time",
  "confirmation",
];

export function BookingChat() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const preselectedServiceId = searchParams.get("service");
  const preselected = preselectedServiceId ? getServiceById(preselectedServiceId) : undefined;

  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicleChoice, setVehicleChoice] = useState<{
    id: VehicleChatChoice | "moto";
  } | null>(null);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(
    preselected ? [preselected.id] : []
  );
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);

  const vehicle: Vehicle | null = useMemo(() => {
    if (!vehicleChoice) return null;
    if (vehicleChoice.id === "moto") {
      return { id: "temp", customerId: "temp", type: "motorcycle", createdAt: "" };
    }
    return {
      id: "temp",
      customerId: "temp",
      type: "car",
      chatChoice: vehicleChoice.id,
      createdAt: "",
    };
  }, [vehicleChoice]);

  const availableServices = useMemo(
    () =>
      vehicle
        ? services.filter((s) => isServiceAvailableForVehicleType(s, vehicle.type))
        : services,
    [vehicle]
  );

  function toggleService(serviceId: string) {
    setSelectedServiceIds((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId]
    );
  }

  const selections = useMemo(
    () => selectedServiceIds.map((id) => ({ serviceId: id })),
    [selectedServiceIds]
  );

  const { lineItems, total } = useMemo(
    () => calculateQuoteTotal(selections, vehicle),
    [selections, vehicle]
  );

  function goTo(next: Step) {
    setStep(next);
  }

  function back(from: Step) {
    const idx = STEP_ORDER.indexOf(from);
    if (idx > 0) setStep(STEP_ORDER[idx - 1]);
  }

  function handleSendWhatsApp() {
    const config = getConfig();
    const message = buildWhatsAppMessage({
      name,
      phone,
      vehicleLabel: vehicleSummaryLabel(vehicle),
      lineItems,
      total,
    });
    const link = buildWhatsAppLink(config.whatsappDestination, message);
    window.open(link, "_blank", "noopener,noreferrer");
  }

  function persistQuote(): Quote {
    const customer = upsertCustomer(name, phone);
    const savedVehicle = saveVehicle({
      customerId: customer.id,
      type: vehicle?.type ?? "car",
      chatChoice: vehicle?.chatChoice,
    });
    const created = saveQuote({
      customerId: customer.id,
      vehicleId: savedVehicle.id,
      serviceIds: selectedServiceIds,
      lineItems,
      estimatedTotal: total,
      status: "draft",
    });
    setQuote(created);
    return created;
  }

  function handleConfirmBooking() {
    if (!date || !time) return;
    const currentQuote = quote ?? persistQuote();
    saveAppointment({
      quoteId: currentQuote.id,
      date,
      time,
      status: "pending",
    });
    updateQuoteStatus(currentQuote.id, "scheduled");
    setStep("confirmation");
  }

  const bookedSlotsForDate = date
    ? getAppointments()
        .filter((a) => a.date === date)
        .map((a) => a.time)
    : [];

  const selectedServiceNames = selectedServiceIds
    .map((id) => getServiceById(id)?.name)
    .filter((n): n is string => !!n);

  return (
    <div className="min-h-[calc(100vh-0px)] bg-background">
      {step === "name" && (
        <StepContainer>
          <ChatMessage>
            Olá! Tudo bem? Sou a assistente virtual da Aurum Detailing. Vou te
            ajudar a montar seu orçamento.
            <br />
            <br />
            Primeiro, qual é o seu nome?
          </ChatMessage>
          <Input
            label="Nome e sobrenome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seu nome completo"
            autoComplete="name"
          />
          <Button
            size="lg"
            disabled={!name.trim()}
            onClick={() => goTo("phone")}
          >
            Continuar
          </Button>
        </StepContainer>
      )}

      {step === "phone" && (
        <StepContainer onBack={() => back("phone")}>
          <UserAnswerBubble>{name}</UserAnswerBubble>
          <ChatMessage>Qual é o seu WhatsApp?</ChatMessage>
          <Input
            label="WhatsApp"
            value={phone}
            onChange={(e) => setPhone(maskPhone(e.target.value))}
            placeholder="(31) 99999-9999"
            inputMode="tel"
            autoComplete="tel"
          />
          <Button
            size="lg"
            disabled={!isValidPhone(phone)}
            onClick={() => goTo("vehicle")}
          >
            Continuar
          </Button>
        </StepContainer>
      )}

      {step === "vehicle" && (
        <StepContainer onBack={() => back("vehicle")}>
          <UserAnswerBubble>{phone}</UserAnswerBubble>
          <ChatMessage>Qual veículo vamos cuidar?</ChatMessage>
          <div className="flex flex-col gap-2.5">
            {vehicleOptions.map((opt) => (
              <SelectionCard
                key={opt.id}
                label={opt.label}
                selected={vehicleChoice?.id === opt.id}
                onClick={() => setVehicleChoice({ id: opt.id })}
              />
            ))}
          </div>
          <Button
            size="lg"
            disabled={!vehicleChoice}
            onClick={() => {
              if (vehicle) {
                setSelectedServiceIds((prev) =>
                  prev.filter((id) => {
                    const svc = getServiceById(id);
                    return svc && isServiceAvailableForVehicleType(svc, vehicle.type);
                  })
                );
              }
              goTo("service");
            }}
          >
            Continuar
          </Button>
        </StepContainer>
      )}

      {step === "service" && (
        <StepContainer onBack={() => back("service")}>
          <UserAnswerBubble>
            {vehicleOptions.find((o) => o.id === vehicleChoice?.id)?.label}
          </UserAnswerBubble>
          <ChatMessage>
            Qual serviço você deseja? Você pode escolher mais de um.
          </ChatMessage>
          <div className="flex flex-col gap-2.5">
            {availableServices.map((s) => (
              <ServiceListItem
                key={s.id}
                service={s}
                selected={selectedServiceIds.includes(s.id)}
                onClick={() => toggleService(s.id)}
              />
            ))}
          </div>
          {selectedServiceIds.length > 0 && (
            <div className="flex items-center justify-between rounded-lg border border-border bg-background-secondary px-4 py-3 text-sm">
              <span className="text-muted">Subtotal</span>
              <span className="font-display font-bold text-gold-light">
                {formatCurrency(total)}
              </span>
            </div>
          )}
          <Button
            size="lg"
            disabled={selectedServiceIds.length === 0}
            onClick={() => goTo("quote")}
          >
            Continuar
          </Button>
        </StepContainer>
      )}

      {step === "quote" && (
        <StepContainer onBack={() => back("quote")}>
          <ChatMessage>Seu orçamento</ChatMessage>
          <EstimateSummary
            name={name}
            phone={phone}
            vehicle={vehicle}
            lineItems={lineItems}
            total={total}
            whatsappDestination={getConfig().whatsappDestination}
            onSendWhatsApp={handleSendWhatsApp}
          />
          <Button size="lg" onClick={() => goTo("date")}>
            Escolher data e horário
          </Button>
        </StepContainer>
      )}

      {step === "date" && (
        <StepContainer onBack={() => back("date")}>
          <ChatMessage>Escolha uma data</ChatMessage>
          <DateSelector value={date} onChange={setDate} />
          <Button size="lg" disabled={!date} onClick={() => goTo("time")}>
            Continuar
          </Button>
        </StepContainer>
      )}

      {step === "time" && (
        <StepContainer onBack={() => back("time")}>
          <UserAnswerBubble>{date && formatDatePtBr(date)}</UserAnswerBubble>
          <ChatMessage>Escolha um horário</ChatMessage>
          <TimeSelector value={time} onChange={setTime} bookedSlots={bookedSlotsForDate} />
          <Button size="lg" disabled={!time} onClick={handleConfirmBooking}>
            Confirmar agendamento
          </Button>
        </StepContainer>
      )}

      {step === "confirmation" && date && time && (
        <StepContainer>
          <div className="flex flex-col items-center gap-1 py-2 text-center">
            <CalendarCheck className="text-gold" size={36} strokeWidth={1.5} />
            <h2 className="mt-2 font-display text-xl font-extrabold text-foreground">
              Agendamento confirmado!
            </h2>
          </div>

          <div className="rounded-2xl border border-border-strong bg-background-secondary p-5">
            <Field label="Serviço" value={selectedServiceNames.join(", ")} />
            <Field label="Veículo" value={vehicleSummaryLabel(vehicle)} />
            <Field label="Data" value={formatDatePtBr(date)} />
            <Field label="Horário" value={time} />
            <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
              <span className="font-display font-bold text-foreground">
                Estimativa
              </span>
              <span className="font-display text-xl font-extrabold text-gold-light">
                {formatCurrency(total)}
              </span>
            </div>
          </div>

          <p className="text-xs text-muted-dark">
            O valor final pode mudar após a avaliação do veículo.
          </p>

          <WhatsAppMessagePreview
            message={buildAppointmentWhatsAppMessage({
              name,
              phone,
              vehicleLabel: vehicleSummaryLabel(vehicle),
              lineItems,
              total,
              dateLabel: formatDatePtBr(date),
              time,
            })}
            whatsappLink={buildWhatsAppLink(
              getConfig().whatsappDestination,
              buildAppointmentWhatsAppMessage({
                name,
                phone,
                vehicleLabel: vehicleSummaryLabel(vehicle),
                lineItems,
                total,
                dateLabel: formatDatePtBr(date),
                time,
              })
            )}
            whatsappDestination={getConfig().whatsappDestination}
          />

          <Button
            size="lg"
            variant="ghost"
            onClick={() => router.push("/servicos")}
          >
            Voltar aos serviços
          </Button>
        </StepContainer>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-2 text-sm last:border-0">
      <span className="text-muted-dark">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
