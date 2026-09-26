"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getServiceById, higienizacaoServiceIds, isServiceAvailableForVehicleType, limpezaAddonServiceIds, limpezaTierServiceIds, catalogOnlyServiceIds, ppfCarroCompletoServiceIds, ppfCarroKitServiceIds, revestimentoTierServiceIds, services } from "@/lib/data/services";
import { calculateQuoteTotal } from "@/lib/pricing";
import { vehicleOptions, vehicleSummaryLabel } from "@/lib/vehicle";
import { buildAppointmentWhatsAppMessage, buildCancelWhatsAppMessage, buildWhatsAppLink, buildWhatsAppMessage } from "@/lib/whatsapp";
import { clearSession, getSession, setSession } from "@/lib/storage";
import { getPublicConfig } from "@/lib/config";
import { Vehicle, VehicleChatChoice, DeliveryMethod, Service } from "@/types";
import { formatCurrency, formatDatePtBr, isValidPhone, maskPhone } from "@/lib/formatters";

import { ChatMessage, UserAnswerBubble } from "@/components/booking-chat/ChatMessage";
import { StepContainer } from "@/components/booking-chat/StepContainer";
import { SelectionCard } from "@/components/booking-chat/SelectionCard";
import { ServiceListItem } from "@/components/booking-chat/ServiceListItem";
import { DateSelector } from "@/components/booking-chat/DateSelector";
import { TimeSelector } from "@/components/booking-chat/TimeSelector";
import { EstimateSummary } from "@/components/booking-chat/EstimateSummary";
import { DeliveryMethodSelector } from "@/components/booking-chat/DeliveryMethodSelector";
import { LimpezaGroupCard } from "@/components/booking-chat/LimpezaGroupCard";
import { HigienizacaoGroupCard } from "@/components/booking-chat/HigienizacaoGroupCard";
import { RevestimentoGroupCard } from "@/components/booking-chat/RevestimentoGroupCard";
import { PpfCarroGroupCard } from "@/components/booking-chat/PpfCarroGroupCard";
import { WhatsAppRedirect } from "@/components/booking-chat/WhatsAppRedirect";
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
  | "location"
  | "confirmation";

const STEP_ORDER: Step[] = [
  "name",
  "phone",
  "vehicle",
  "service",
  "quote",
  "date",
  "time",
  "location",
  "confirmation",
];

export function BookingChat() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const preselectedServiceId = searchParams.get("service");

  const [step, setStep] = useState<Step>("name");
  const [sessionChecked, setSessionChecked] = useState(false);
  const [isReturning, setIsReturning] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicleChoice, setVehicleChoice] = useState<{
    id: VehicleChatChoice | "moto";
  } | null>(null);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(() => {
    const staticPreselected = preselectedServiceId ? getServiceById(preselectedServiceId) : undefined;
    return staticPreselected ? [staticPreselected.id] : [];
  });
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod | null>(null);
  const [bookedSlotsForDate, setBookedSlotsForDate] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dbServices, setDbServices] = useState<Service[]>([]);

  const config = useMemo(() => getPublicConfig(), []);

  // Itens de catálogo criados no /admin (serviços novos + promoções em
  // vigor) — somam ao catálogo estático em todo o fluxo abaixo.
  useEffect(() => {
    fetch("/api/catalog-items")
      .then((res) => (res.ok ? res.json() : { services: [] }))
      .then((data) => setDbServices(data.services ?? []))
      .catch(() => setDbServices([]));
  }, []);

  // Se o link veio com ?service=<id> de um item que só existe no banco (não
  // no catálogo estático), ele só é resolvido depois que dbServices chega —
  // pré-seleciona nesse momento, mas só se nada mais já foi escolhido.
  useEffect(() => {
    if (!preselectedServiceId || selectedServiceIds.length > 0) return;
    const found = getServiceById(preselectedServiceId, dbServices);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- só roda quando dbServices chega da API; não há como "assinar" isso de outra forma
    if (found) setSelectedServiceIds([found.id]);
  }, [dbServices, preselectedServiceId, selectedServiceIds.length]);

  // Reconhece o cliente que já "logou" antes (nome + telefone salvos no
  // navegador) e pula direto pra escolha de veículo.
  useEffect(() => {
    const session = getSession();
    /* eslint-disable react-hooks/set-state-in-effect -- lê localStorage; precisa rodar após a hidratação para não gerar mismatch SSR/cliente */
    if (session) {
      setName(session.name);
      setPhone(session.phone);
      setIsReturning(true);
      setStep("vehicle");
    }
    setSessionChecked(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // Consulta horários já ocupados naquela data assim que ela é escolhida
  // (antes era um filtro síncrono em localStorage; agora é uma chamada à
  // API, então roda num efeito e alimenta o TimeSelector via estado).
  useEffect(() => {
    if (!date) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- limpa o estado quando a data é desmarcada (voltar no fluxo); não há como "assinar" isso de outra forma
      setBookedSlotsForDate([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/agendamentos?data=${encodeURIComponent(date)}`)
      .then((res) => (res.ok ? res.json() : { horariosOcupados: [] }))
      .then((data) => {
        if (!cancelled) setBookedSlotsForDate(data.horariosOcupados ?? []);
      })
      .catch(() => {
        if (!cancelled) setBookedSlotsForDate([]);
      });
    return () => {
      cancelled = true;
    };
  }, [date]);

  function handleSwitchAccount() {
    clearSession();
    setName("");
    setPhone("");
    setIsReturning(false);
    setStep("name");
  }

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

  const availableServices = useMemo(() => {
    const combined = [...services, ...dbServices];
    return vehicle
      ? combined.filter((s) => isServiceAvailableForVehicleType(s, vehicle.type))
      : combined;
  }, [vehicle, dbServices]);

  function toggleService(serviceId: string) {
    setSelectedServiceIds((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId]
    );
  }

  /** Escolha de tipo de Limpeza é exclusiva (só um tipo por vez). Ao trocar
   * ou desmarcar o tipo, os adicionais (undercar/higienização) somem junto
   * — eles só existem atrelados a uma Limpeza. */
  function selectLimpezaTier(tierId: string) {
    setSelectedServiceIds((prev) => {
      const isCurrentlySelected = prev.includes(tierId);
      let next = prev.filter((id) => !limpezaTierServiceIds.includes(id));
      if (isCurrentlySelected) {
        next = next.filter((id) => !limpezaAddonServiceIds.includes(id));
      } else {
        next = [...next, tierId];
      }
      return next;
    });
  }

  /** Escolha de duração do Revestimento Cerâmico é exclusiva (só uma opção
   * por vez, sem adicionais atrelados). */
  function selectRevestimentoTier(tierId: string) {
    setSelectedServiceIds((prev) => {
      const isCurrentlySelected = prev.includes(tierId);
      const next = prev.filter((id) => !revestimentoTierServiceIds.includes(id));
      return isCurrentlySelected ? next : [...next, tierId];
    });
  }

  /** Escolha de pacote completo de PPF é exclusiva (Frontal/Híbrida/Full se
   * substituem); os kits avulsos continuam independentes. */
  function selectPpfCompleto(completoId: string) {
    setSelectedServiceIds((prev) => {
      const isCurrentlySelected = prev.includes(completoId);
      const next = prev.filter((id) => !ppfCarroCompletoServiceIds.includes(id));
      return isCurrentlySelected ? next : [...next, completoId];
    });
  }

  const selections = useMemo(
    () => selectedServiceIds.map((id) => ({ serviceId: id })),
    [selectedServiceIds]
  );

  const { lineItems, total } = useMemo(
    () => calculateQuoteTotal(selections, vehicle, dbServices),
    [selections, vehicle, dbServices]
  );

  function goTo(next: Step) {
    setStep(next);
  }

  function back(from: Step) {
    const idx = STEP_ORDER.indexOf(from);
    if (idx > 0) setStep(STEP_ORDER[idx - 1]);
  }

  function handleSendWhatsApp() {
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

  /** Salva o agendamento no banco (nome, telefone, veículo, serviços
   * cotados, data/horário) e só então mostra a tela de confirmação. Se a
   * gravação falhar, o cliente não pode ficar travado — ele sempre termina
   * no WhatsApp de qualquer forma, então seguimos pra confirmação mesmo
   * assim e só registramos o erro no console do navegador. */
  async function handleConfirmBooking() {
    if (!date || !time || !deliveryMethod || !vehicle) return;
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/agendamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: name,
          telefone: phone,
          veiculoTipo: vehicle.type,
          veiculoDetalhe: vehicle.type === "car" ? vehicleChoice?.id ?? null : null,
          servicos: lineItems.map((item) => ({
            id: item.serviceId,
            nome: item.name,
            preco: item.price,
          })),
          valorEstimado: total,
          data: date,
          horario: time,
          formaEntrega: deliveryMethod,
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        console.error("Falha ao salvar agendamento:", body?.error ?? response.status);
      }
    } catch (error) {
      console.error("Falha ao salvar agendamento:", error);
    } finally {
      setIsSubmitting(false);
      setStep("confirmation");
    }
  }

  const selectedServiceNames = selectedServiceIds
    .map((id) => getServiceById(id, dbServices)?.name)
    .filter((n): n is string => !!n);

  if (!sessionChecked) return null;

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
            onClick={() => {
              setSession(name, phone);
              goTo("vehicle");
            }}
          >
            Continuar
          </Button>
        </StepContainer>
      )}

      {step === "vehicle" && (
        <StepContainer onBack={() => back("vehicle")}>
          {isReturning ? (
            <>
              <ChatMessage>
                Oi de novo, {name.split(" ")[0]}! Vamos continuar seu
                orçamento.
              </ChatMessage>
              <button
                type="button"
                onClick={handleSwitchAccount}
                className="self-start text-xs text-muted underline underline-offset-2 hover:text-foreground"
              >
                Não é você? Trocar
              </button>
            </>
          ) : (
            <UserAnswerBubble>{phone}</UserAnswerBubble>
          )}
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
                    const svc = getServiceById(id, dbServices);
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
            {vehicle?.type === "car" && (
              <RevestimentoGroupCard
                vehicle={vehicle}
                selectedServiceIds={selectedServiceIds}
                onSelectTier={selectRevestimentoTier}
              />
            )}
            {vehicle?.type === "car" && (
              <PpfCarroGroupCard
                vehicle={vehicle}
                selectedServiceIds={selectedServiceIds}
                onToggleKit={toggleService}
                onSelectCompleto={selectPpfCompleto}
              />
            )}
            {vehicle?.type === "car" && (
              <LimpezaGroupCard
                vehicle={vehicle}
                selectedServiceIds={selectedServiceIds}
                onSelectTier={selectLimpezaTier}
                onToggleAddon={toggleService}
              />
            )}
            {vehicle?.type === "car" && (
              <HigienizacaoGroupCard
                vehicle={vehicle}
                selectedServiceIds={selectedServiceIds}
                onToggle={toggleService}
              />
            )}
            {availableServices
              .filter(
                (s) =>
                  !revestimentoTierServiceIds.includes(s.id) &&
                  !limpezaTierServiceIds.includes(s.id) &&
                  !limpezaAddonServiceIds.includes(s.id) &&
                  !higienizacaoServiceIds.includes(s.id) &&
                  !ppfCarroKitServiceIds.includes(s.id) &&
                  !ppfCarroCompletoServiceIds.includes(s.id) &&
                  !catalogOnlyServiceIds.includes(s.id)
              )
              .map((s) => (
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
            whatsappDestination={config.whatsappDestination}
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
          <Button size="lg" disabled={!time} onClick={() => goTo("location")}>
            Continuar
          </Button>
        </StepContainer>
      )}

      {step === "location" && (
        <StepContainer onBack={() => back("location")}>
          <UserAnswerBubble>{time}</UserAnswerBubble>
          <ChatMessage>Como prefere levar o veículo até a Aurum?</ChatMessage>
          <DeliveryMethodSelector
            value={deliveryMethod}
            onChange={setDeliveryMethod}
            address={config.address}
          />
          <Button
            size="lg"
            disabled={!deliveryMethod || isSubmitting}
            onClick={handleConfirmBooking}
          >
            {isSubmitting ? "Confirmando..." : "Confirmar agendamento"}
          </Button>
        </StepContainer>
      )}

      {step === "confirmation" && date && time && deliveryMethod && (
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
            <Field
              label="Veículo vai"
              value={
                deliveryMethod === "dropoff"
                  ? "Até a loja"
                  : "Busca em casa (a combinar)"
              }
            />
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

          <WhatsAppRedirect
            whatsappLink={buildWhatsAppLink(
              config.whatsappDestination,
              buildAppointmentWhatsAppMessage({
                name,
                phone,
                vehicleLabel: vehicleSummaryLabel(vehicle),
                lineItems,
                total,
                dateLabel: formatDatePtBr(date),
                time,
                deliveryMethod,
                address: config.address,
              })
            )}
          />

          <Button
            size="lg"
            variant="ghost"
            onClick={() => router.push("/")}
          >
            Voltar à tela inicial
          </Button>

          <a
            href={buildWhatsAppLink(
              config.whatsappDestination,
              buildCancelWhatsAppMessage({
                serviceNames: selectedServiceNames,
                dateLabel: formatDatePtBr(date),
                time,
              })
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="text-center text-xs text-muted-dark underline underline-offset-2 hover:text-foreground"
          >
            Cancelar este agendamento
          </a>
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
