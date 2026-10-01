import { generateKeyPairSync, createVerify } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { createSheetsClient } from "../index";
import { normalizePrivateKey } from "../transport";
import { asRow, fixture, header, sample } from "./fixture";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
const env = { GOOGLE_SERVICE_ACCOUNT_EMAIL: "test@example.invalid", GOOGLE_PRIVATE_KEY: `"${pem.replace(/\n/g, "\\\\n")}"`, GOOGLE_SERVICES_SHEET_ID: "test", GOOGLE_SERVICES_SHEET_GID: "1761841708" };
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });
function setup(table: unknown[][] = fixture()) {
  let title = "servicos_aurum.csv";
  const mock = vi.fn(async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const path = decodeURIComponent(String(url));
    if (path.includes("oauth2")) return json({ access_token: "fake-token", expires_in: 3600 });
    if (path.includes("fields=")) return json({ sheets: [{ properties: { sheetId: 1761841708, title } }] });
    if (init?.method === "PUT" || init?.method === "POST") return json({});
    if (path.includes("A1:ZZ1")) return json({ values: [table[0]] });
    if (/![A-Z]+2:[A-Z]+\?/.test(path)) return json({ values: table.slice(1).map(row => [row[(table[0] as string[]).indexOf("id")] ?? ""]) });
    return json({ values: table });
  });
  const sleep = vi.fn(async (ms: number) => { void ms; });
  const client = createSheetsClient({ env, fetch: mock as typeof fetch, sleep });
  return { client, mock, sleep, rename: (name: string) => { title = name; } };
}

describe("Sheets", () => {
  it("reads 51 synthetic services and ignores 950 checkbox rows", async () => {
    const { rows, errors } = await setup().client.readServiceRows();
    expect(rows).toHaveLength(51); expect(errors).toEqual([]);
    expect(rows[0].inclusos).toEqual(["A", "B"]);
  });
  it("handles reordered columns, short rows and localized prices", async () => {
    const names = [...header].reverse(), table = fixture(names);
    table[1] = asRow({ ...sample(), preco: "R$ 1.234,56" }, names);
    expect((await setup(table).client.readServiceRows()).rows[0].preco).toBe(1234.56);
    const result = await setup([header, asRow(sample()).slice(0, 17)]).client.readServiceRows();
    expect(result.rows[0].beneficios).toEqual([]); expect(result.rows[0].destaque).toBe(false);
  });
  it("discards missing ids/names and reports invalid rows without values", async () => {
    const table = [header, asRow({ ...sample(), id: "" }), asRow({ ...sample(), servico: "" }), asRow({ ...sample(), preco: "secret-invalid" }), asRow({ ...sample(2), classificacao: "unknown" }), asRow(sample(3))];
    const result = await setup(table).client.readServiceRows();
    expect(result.rows).toHaveLength(1); expect(result.errors).toHaveLength(2);
    expect(JSON.stringify(result.errors)).not.toContain("secret-invalid");
  });
  it("resolves renamed tabs on every read and caches tokens", async () => {
    const { client, mock, rename } = setup();
    await client.readServiceRows(); rename("D'ouro.csv"); await client.readServiceRows();
    expect(decodeURIComponent(String(mock.mock.calls.at(-1)?.[0]))).toContain("'D''ouro.csv'!A1:ZZ");
    expect(mock.mock.calls.filter(([url]) => String(url).includes("fields="))).toHaveLength(2);
    expect(mock.mock.calls.filter(([url]) => String(url).includes("oauth2"))).toHaveLength(1);
  });
  it("signs RS256 and normalizes double escaped newlines", async () => {
    const { client, mock } = setup(); await client.resolveSheetName(1761841708);
    const jwt = new URLSearchParams(String(mock.mock.calls[0][1]?.body)).get("assertion")!;
    const [head, body, signature] = jwt.split(".");
    expect(JSON.parse(Buffer.from(head, "base64url").toString()).alg).toBe("RS256");
    expect(createVerify("RSA-SHA256").update(`${head}.${body}`).verify(publicKey, signature, "base64url")).toBe(true);
    expect(normalizePrivateKey(env.GOOGLE_PRIVATE_KEY)).toBe(pem);
  });
  it("retries 429 and 503 with exponential backoff", async () => {
    const { client, mock, sleep } = setup();
    mock.mockResolvedValueOnce(json({}, 429)).mockResolvedValueOnce(json({}, 503));
    await client.readServiceRows(); expect(sleep.mock.calls).toEqual([[250], [500]]);
  });
  it("updates only supplied cells and inserts at row 53 with PUT", async () => {
    const { client, mock } = setup(fixture([...header].reverse()));
    await client.upsertRows([{ id: sample().id, preco: 123 }, sample(52)], { updatedBy: "tester" });
    const batch = mock.mock.calls.find(([url]) => String(url).includes("batchUpdate"))!;
    const data = JSON.parse(String(batch[1]?.body)).data;
    expect(data).toHaveLength(4);
    expect(data.map((cell: { values: unknown[][] }) => cell.values[0][0])).toContain("tester");
    const insert = mock.mock.calls.find(([, init]) => init?.method === "PUT")!;
    expect(decodeURIComponent(String(insert[0]))).toContain("!A53:AA53");
    expect(mock.mock.calls.some(([url]) => String(url).includes(":append"))).toBe(false);
  });
  it("allocates after last id including gaps and orphan ids", async () => {
    const { client, mock } = setup([header, asRow(sample()), [], asRow({ id: "orphan" }), ...fixture().slice(52)]);
    await client.upsertRows([sample(60), sample(61)]);
    const paths = mock.mock.calls.filter(([, init]) => init?.method === "PUT").map(([url]) => decodeURIComponent(String(url)));
    expect(paths[0]).toContain("!A5:AA5"); expect(paths[1]).toContain("!A6:AA6");
  });
  it("setActive cannot accidentally insert a missing id", async () => {
    const { client, mock } = setup();
    await expect(client.setActive("missing", false)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await client.setActive(sample().id, false);
    const call = mock.mock.calls.find(([url]) => String(url).includes("batchUpdate"))!;
    expect(JSON.parse(String(call[1]?.body)).data.some((cell: { values: unknown[][] }) => cell.values[0][0] === false)).toBe(true);
  });
  it("reads auxiliary tabs with a per-row error report", async () => {
    const { client } = setup([["valor", "chave"], ["SUV", "porte_outro_equivale"], ["invalid", ""]]);
    const result = await client.readAuxTab("Config");
    expect(result.rows).toEqual([{ chave: "porte_outro_equivale", valor: "SUV" }]); expect(result.errors).toHaveLength(1);
  });
  it("swallows log failures and writes logs with values.update", async () => {
    const { client, mock } = setup([["data", "origem", "acao", "id", "resultado"]]);
    const entry = { origem: "admin", acao: "upsert", id: "x", resultado: "ok" };
    await client.appendLog(entry);
    expect(mock.mock.calls.some(([, init]) => init?.method === "PUT")).toBe(true);
    mock.mockRejectedValueOnce(new Error("secret")); await expect(client.appendLog(entry)).resolves.toBeUndefined();
  });
  it("sanitizes errors and does not retry HTTP 400", async () => {
    const { client, mock, sleep } = setup();
    mock.mockRejectedValueOnce(new Error("private-key"));
    await expect(client.readServiceRows()).rejects.toMatchObject({ code: "NETWORK", message: "Sheets: NETWORK" });
    mock.mockResolvedValueOnce(json({ secret: "private-key" }, 400));
    await expect(client.readServiceRows()).rejects.toMatchObject({ code: "HTTP", status: 400 });
    expect(sleep).not.toHaveBeenCalled();
  });
  it("times out stalled requests", async () => {
    const slow = vi.fn((_url: unknown, init?: RequestInit) => new Promise<Response>((_, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
    }));
    const client = createSheetsClient({ env, fetch: slow as typeof fetch, timeoutMs: 5 });
    await expect(client.readServiceRows()).rejects.toMatchObject({ code: "TIMEOUT" });
  });
  it("refreshes tokens near expiration and shares pending authentication", async () => {
    const { mock } = setup(); let time = 0;
    const client = createSheetsClient({ env, fetch: mock as typeof fetch, now: () => time });
    await Promise.all([client.readServiceRows(), client.readServiceRows()]);
    time = 3540_000; await client.readServiceRows();
    expect(mock.mock.calls.filter(([url]) => String(url).includes("oauth2"))).toHaveLength(2);
  });
  it("starts at row 2 when there are only checkboxes", async () => {
    const { client, mock } = setup([header, ...fixture().slice(52)]);
    await client.upsertRows([sample()]);
    const call = mock.mock.calls.find(([, init]) => init?.method === "PUT")!;
    expect(decodeURIComponent(String(call[0]))).toContain("!A2:AA2");
  });
  it("rejects ambiguous headers and duplicate ids before writing", async () => {
    await expect(setup([["id", "id", "servico"]]).client.readServiceRows()).rejects.toMatchObject({ code: "SCHEMA" });
    const { client, mock } = setup([header, asRow(sample()), asRow(sample())]);
    await expect(client.upsertRows([{ id: sample().id, preco: 50 }])).rejects.toMatchObject({ code: "CONFLICT" });
    expect(mock.mock.calls.some(([, init]) => init?.method === "PUT")).toBe(false);
  });
  it("limits retries on Sheets 429 responses", async () => {
    const { client, mock, sleep } = setup();
    await client.resolveSheetName(1761841708);
    mock.mockImplementation(async () => json({}, 429));
    await expect(client.readServiceRows()).rejects.toMatchObject({ code: "HTTP", status: 429 });
    expect(sleep.mock.calls).toEqual([[250], [500], [1000]]);
  });
});
