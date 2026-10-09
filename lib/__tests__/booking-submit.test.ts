import { afterEach, describe, expect, it, vi } from "vitest";
import { submitBooking, clearBookingAccess, submitQuote } from "../booking-submit";
import type { AgendamentoInput } from "../agendamentos";

const input = { nome: "Cliente", telefone: "31987654321", veiculoTipo: "car", servicos: [{ id: "polimento", nome: "Polimento", preco: 100 }], valorEstimado: 100, data: "2026-11-10", horario: "10:00", formaEntrega: "dropoff" } as AgendamentoInput;
afterEach(() => vi.unstubAllGlobals());

describe("booking persistence confirmation", () => {
  it("returns only an acknowledged persisted booking", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ agendamento: { id: "saved", status: "pending" } }, { status: 201 })));
    expect(await submitBooking(input)).toEqual({ id: "saved", status: "pending" });
  });
  it.each([400, 500])("rejects HTTP %s instead of confirming", async (status) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ error: "failed" }, { status })));
    await expect(submitBooking(input)).rejects.toThrow();
  });
  it("rejects a successful response without an acknowledged record", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({})));
    await expect(submitBooking(input)).rejects.toThrow("Confira seu histórico");
  });
  it("rejects network failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(submitBooking(input)).rejects.toThrow("offline");
  });
  it("requires the API creation status even if a response contains an ID", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ agendamento: { id: "saved" } }, { status: 200 })));
    await expect(submitBooking(input)).rejects.toThrow("Confira seu histórico");
  });
  it("does not report logout success when revocation fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({}, { status: 500 })));
    await expect(clearBookingAccess()).rejects.toThrow("encerrar");
  });
  it("records a quote through the quote API instead of scheduling it", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ orcamento: { id: "quote" } }, { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await submitQuote(input)).toEqual({ id: "quote" });
    expect(fetchMock.mock.calls[0][0]).toBe("/api/orcamentos");
  });
  it("does not proceed from quote submission on server failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ error: "failed" }, { status: 500 })));
    await expect(submitQuote(input)).rejects.toThrow("registrar");
  });
});
