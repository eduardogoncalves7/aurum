import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { readFileSync } from "node:fs";
import { NextRequest } from "next/server";

const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("@/lib/db", () => ({ getPool: () => ({ query }), quotedDbSchema: () => '"public"' }));
import { GET, POST, DELETE } from "@/app/api/agendamentos/route";
import { POST as POSTQUOTE } from "@/app/api/orcamentos/route";
import { GET as ADMINQUOTES } from "@/app/api/admin/orcamentos/route";
import { BOOKING_ACCESS_COOKIE, bookingTokenHash } from "../booking-access";

const input = { nome: "Cliente", telefone: "31987654321", veiculoTipo: "car", servicos: [{ id: "polimento", nome: "Polimento", preco: 100 }], valorEstimado: 100, data: "2026-11-10", horario: "10:00", formaEntrega: "dropoff" };
let db: PGlite;
function request(method = "GET", token?: string, suffix = "", origin?: string) {
  return new NextRequest(`http://localhost/api/agendamentos${suffix}`, {
    method,
    headers: { ...(token ? { cookie: `${BOOKING_ACCESS_COOKIE}=${token}` } : {}), ...(origin ? { origin } : {}) },
    ...(method === "POST" ? { body: JSON.stringify(input) } : {}),
  });
}

beforeAll(async () => {
  db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(readFileSync("db/migrations/0001_create_agendamentos.sql", "utf8"));
  await db.exec(readFileSync("db/migrations/0007_private_booking_history.sql", "utf8"));
  await db.exec(readFileSync("db/migrations/0008_whatsapp_quotes.sql", "utf8"));
});
beforeEach(async () => {
  query.mockReset().mockImplementation((sql, values) => db.query(sql, values));
  await db.exec("DELETE FROM agendamentos");
  await db.exec("DELETE FROM orcamentos");
});

describe("quotes sent to WhatsApp", () => {
  it("records a quote without creating a booking or occupying a time slot", async () => {
    const response = await POSTQUOTE(request("POST"));
    expect(response.status).toBe(201);
    const { orcamento } = await response.json();
    expect(orcamento).toMatchObject({ nome: input.nome, telefone: input.telefone, valorEstimado: 100 });
    expect(orcamento).not.toHaveProperty("data");
    expect(orcamento).not.toHaveProperty("horario");
    expect((await db.query("SELECT count(*)::int AS count FROM agendamentos")).rows).toEqual([{ count: 0 }]);
    expect(await (await GET(request("GET", undefined, "?data=2026-11-10"))).json()).toEqual({ horariosOcupados: [] });
    expect(await (await ADMINQUOTES()).json()).toEqual({ orcamentos: [orcamento] });
    expect(response.cookies.get(BOOKING_ACCESS_COOKIE)).toBeUndefined();
  });

  it("rejects invalid input without recording a quote", async () => {
    const response = await POSTQUOTE(new NextRequest("http://localhost/api/orcamentos", { method: "POST", body: JSON.stringify({ ...input, telefone: "123", valorEstimado: -1 }) }));
    expect(response.status).toBe(400);
    expect(query).not.toHaveBeenCalled();
  });

  it("does not acknowledge a quote if persistence fails", async () => {
    query.mockRejectedValueOnce(new Error("offline"));
    const response = await POSTQUOTE(request("POST"));
    expect(response.status).toBe(500);
    expect(await response.json()).not.toHaveProperty("orcamento");
  });

  it("rejects cross-origin quote submissions", async () => {
    expect((await POSTQUOTE(request("POST", undefined, "", "https://attacker.example"))).status).toBe(403);
    expect(query).not.toHaveBeenCalled();
  });
});
afterAll(async () => { await db.close(); });

describe("private browser booking history", () => {
  it("denies phone-based lookups, even with a browser cookie", async () => {
    const response = await GET(request("GET", "a".repeat(64), "?telefone=31987654321"));
    expect(response.status).toBe(403);
    expect(query).not.toHaveBeenCalled();
  });

  it.each([undefined, "invalid", "a".repeat(63)])("denies missing or malformed capabilities: %s", async (token) => {
    expect((await GET(request("GET", token))).status).toBe(401);
    expect(query).not.toHaveBeenCalled();
  });

  it("isolates bookings from two browsers using the same phone number", async () => {
    const tokenA = "a".repeat(64), tokenB = "b".repeat(64);
    const a = await POST(request("POST", tokenA));
    const b = await POST(request("POST", tokenB));
    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
    const recordsA = await (await GET(request("GET", tokenA))).json();
    const recordsB = await (await GET(request("GET", tokenB))).json();
    expect(recordsA.agendamentos).toHaveLength(1);
    expect(recordsB.agendamentos).toHaveLength(1);
    expect(recordsA.agendamentos[0].id).not.toBe(recordsB.agendamentos[0].id);
    expect(await (await GET(request("GET", "c".repeat(64)))).json()).toEqual({ agendamentos: [] });
    expect(recordsA.agendamentos[0]).not.toHaveProperty("acesso_hash");
  });

  it("issues a private cookie only after saving and stores only its hash", async () => {
    const response = await POST(request("POST"));
    const token = response.cookies.get(BOOKING_ACCESS_COOKIE)?.value;
    expect(token).toMatch(/^[a-f0-9]{64}$/);
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")).toContain("SameSite=strict");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect((await db.query("SELECT acesso_hash, status FROM agendamentos")).rows).toEqual([{ acesso_hash: bookingTokenHash(token!), status: "pending" }]);
  });

  it("never grants browser access to legacy appointments", async () => {
    await db.query("INSERT INTO agendamentos(telefone,nome,veiculo_tipo,servicos,data,horario,forma_entrega) VALUES ($1,'Antigo','car','[]','2026-11-10','09:00','dropoff')", [input.telefone]);
    await POST(request("POST", "a".repeat(64)));
    const data = await (await GET(request("GET", "a".repeat(64)))).json();
    expect(data.agendamentos).toHaveLength(1);
    expect(data.agendamentos[0].nome).toBe("Cliente");
  });

  it("keeps availability public without returning customer information", async () => {
    await POST(request("POST"));
    expect(await (await GET(request("GET", undefined, "?data=2026-11-10"))).json()).toEqual({ horariosOcupados: ["10:00"] });
  });

  it("revokes access on logout, including a replay of the old cookie", async () => {
    const token = "a".repeat(64);
    await POST(request("POST", token));
    const logout = await DELETE(request("DELETE", token));
    expect(logout.status).toBe(200);
    expect(logout.headers.get("set-cookie")).toContain("Max-Age=0");
    expect(await (await GET(request("GET", token))).json()).toEqual({ agendamentos: [] });
    expect((await db.query("SELECT count(*)::int AS count FROM agendamentos")).rows).toEqual([{ count: 1 }]);
  });

  it("does not return success or issue access when saving fails", async () => {
    query.mockRejectedValueOnce(new Error("database unavailable"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const response = await POST(request("POST"));
      expect(response.status).toBe(500);
      expect(response.cookies.get(BOOKING_ACCESS_COOKIE)).toBeUndefined();
    } finally { log.mockRestore(); }
  });

  it("rejects cross-origin state changes and accepts the configured proxy origin", async () => {
    expect((await POST(request("POST", undefined, "", "https://attacker.example"))).status).toBe(403);
    expect((await DELETE(request("DELETE", undefined, "", "https://attacker.example"))).status).toBe(403);
    expect(query).not.toHaveBeenCalled();
    expect((await POST(request("POST", undefined, "", "https://aurum.melhornegocio.shop"))).status).toBe(201);
  });
});
