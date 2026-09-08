import { Appointment, Customer, Quote, Vehicle } from "@/types";
import { normalizePhone } from "@/lib/formatters";

// ---------------------------------------------------------------------------
// Camada de persistência do protótipo. Tudo aqui usa localStorage e chaves
// simples — a ideia é que, ao trocar por Supabase/PostgreSQL, apenas este
// arquivo precise mudar (a UI consome só as funções exportadas abaixo).
// ---------------------------------------------------------------------------

const KEYS = {
  customers: "aurum_customers",
  vehicles: "aurum_vehicles",
  quotes: "aurum_quotes",
  appointments: "aurum_appointments",
  config: "aurum_config",
  serviceOverrides: "aurum_service_overrides",
} as const;

export interface AurumConfig {
  whatsappDestination: string; // apenas dígitos, com DDI
  address: string;
  instagram: string;
  phone: string;
  hours: string;
}

const defaultConfig: AurumConfig = {
  whatsappDestination: "",
  address: "Ipatinga, MG",
  instagram: "@aurumdetailing",
  phone: "(31) 90000-0000",
  hours: "Seg a Sáb, 08h às 18h",
};

function isBrowser() {
  return typeof window !== "undefined";
}

function read<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (!isBrowser()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function generateId(prefix: string): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `${prefix}_${rand}`;
}

// --------------------------------------------------------------- Customers

export function getCustomers(): Customer[] {
  return read<Customer[]>(KEYS.customers, []);
}

export function findCustomerByPhone(phone: string): Customer | undefined {
  const normalized = normalizePhone(phone);
  return getCustomers().find((c) => normalizePhone(c.phone) === normalized);
}

export function upsertCustomer(name: string, phone: string): Customer {
  const customers = getCustomers();
  const existing = findCustomerByPhone(phone);
  const now = new Date().toISOString();

  if (existing) {
    const updated: Customer = { ...existing, name, updatedAt: now };
    write(
      KEYS.customers,
      customers.map((c) => (c.id === existing.id ? updated : c))
    );
    return updated;
  }

  const created: Customer = {
    id: generateId("cust"),
    name,
    phone,
    createdAt: now,
    updatedAt: now,
  };
  write(KEYS.customers, [...customers, created]);
  return created;
}

// ---------------------------------------------------------------- Vehicles

export function getVehicles(): Vehicle[] {
  return read<Vehicle[]>(KEYS.vehicles, []);
}

export function saveVehicle(vehicle: Omit<Vehicle, "id" | "createdAt">): Vehicle {
  const created: Vehicle = {
    ...vehicle,
    id: generateId("veh"),
    createdAt: new Date().toISOString(),
  };
  write(KEYS.vehicles, [...getVehicles(), created]);
  return created;
}

// ------------------------------------------------------------------ Quotes

export function getQuotes(): Quote[] {
  return read<Quote[]>(KEYS.quotes, []);
}

export function saveQuote(quote: Omit<Quote, "id" | "createdAt">): Quote {
  const created: Quote = {
    ...quote,
    id: generateId("quote"),
    createdAt: new Date().toISOString(),
  };
  write(KEYS.quotes, [...getQuotes(), created]);
  return created;
}

export function updateQuoteStatus(quoteId: string, status: Quote["status"]) {
  const quotes = getQuotes().map((q) => (q.id === quoteId ? { ...q, status } : q));
  write(KEYS.quotes, quotes);
}

// ------------------------------------------------------------ Appointments

export function getAppointments(): Appointment[] {
  return read<Appointment[]>(KEYS.appointments, []);
}

export function saveAppointment(
  appointment: Omit<Appointment, "id">
): Appointment {
  const created: Appointment = { ...appointment, id: generateId("appt") };
  write(KEYS.appointments, [...getAppointments(), created]);
  return created;
}

// ------------------------------------------------------- Service overrides
// Edição visual de serviços no /admin. No protótipo, os overrides ficam
// isolados em localStorage e são exibidos apenas dentro do próprio painel —
// ao evoluir para Supabase, a tabela `services` passa a ser a fonte única e
// este arquivo some.

export interface ServiceOverride {
  name?: string;
  shortDescription?: string;
  note?: string;
  fixedPrice?: number;
  startingPrice?: number;
  prices?: Record<string, number>;
}

export function getServiceOverrides(): Record<string, ServiceOverride> {
  return read<Record<string, ServiceOverride>>(KEYS.serviceOverrides, {});
}

export function saveServiceOverride(serviceId: string, override: ServiceOverride) {
  const all = getServiceOverrides();
  write(KEYS.serviceOverrides, { ...all, [serviceId]: override });
}

export function clearServiceOverride(serviceId: string) {
  const all = getServiceOverrides();
  delete all[serviceId];
  write(KEYS.serviceOverrides, all);
}

// ----------------------------------------------------------------- Config

export function getConfig(): AurumConfig {
  return read<AurumConfig>(KEYS.config, defaultConfig);
}

export function saveConfig(config: AurumConfig) {
  write(KEYS.config, config);
}
