import { createSign } from "node:crypto";
import { SheetsError } from "./schema";

export function normalizePrivateKey(key: string): string {
  return key.trim().replace(/^(['"])([\s\S]*)\1$/, "$2").replace(/\\+n/g, "\n");
}

export interface TransportOptions {
  fetch?: typeof fetch;
  timeoutMs?: number;
  retries?: number;
  backoffMs?: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

export function createTransport(env: Record<string, string | undefined>, options: TransportOptions = {}) {
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? ((ms) => new Promise(resolve => setTimeout(resolve, ms)));
  let cached: { token: string; expires: number } | undefined;
  let pending: Promise<string> | undefined;

  async function request(url: string, init: RequestInit = {}): Promise<unknown> {
    for (let attempt = 0; ; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 10_000);
      let retry = false;
      try {
        const response = await (options.fetch ?? fetch)(url, { ...init, cache: "no-store", signal: controller.signal });
        if (!response.ok) {
          retry = (response.status === 429 || response.status >= 500) && attempt < (options.retries ?? 3);
          await response.body?.cancel();
          if (!retry) throw new SheetsError("HTTP", response.status);
        } else {
          try { return await response.json(); }
          catch { throw new SheetsError(controller.signal.aborted ? "TIMEOUT" : "RESPONSE"); }
        }
      } catch (error) {
        if (error instanceof SheetsError) throw error;
        throw new SheetsError(controller.signal.aborted ? "TIMEOUT" : "NETWORK");
      } finally { clearTimeout(timer); }
      if (retry) await sleep((options.backoffMs ?? 250) * 2 ** attempt);
    }
  }

  async function mint(): Promise<string> {
    const email = env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const key = env.GOOGLE_PRIVATE_KEY;
    if (!email || !key) throw new SheetsError("CONFIG");
    const issued = Math.floor(now() / 1000);
    const encode = (v: unknown) => Buffer.from(JSON.stringify(v)).toString("base64url");
    const unsigned = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({ iss: email, scope: "https://www.googleapis.com/auth/spreadsheets", aud: "https://oauth2.googleapis.com/token", iat: issued, exp: issued + 3600 })}`;
    let signature: string;
    try { signature = createSign("RSA-SHA256").update(unsigned).sign(normalizePrivateKey(key), "base64url"); }
    catch { throw new SheetsError("AUTH"); }
    const data = await request("https://oauth2.googleapis.com/token", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${signature}` }).toString(),
    }) as { access_token?: unknown; expires_in?: unknown };
    if (!data || typeof data.access_token !== "string" || !data.access_token || typeof data.expires_in !== "number" || !Number.isFinite(data.expires_in) || data.expires_in <= 0) throw new SheetsError("AUTH");
    cached = { token: data.access_token, expires: now() + data.expires_in * 1000 - 60_000 };
    return cached.token;
  }

  async function token() {
    if (cached && now() < cached.expires) return cached.token;
    pending ??= mint().finally(() => { pending = undefined; });
    return pending;
  }

  return async (path: string, init: RequestInit = {}) => {
    const id = env.GOOGLE_SERVICES_SHEET_ID;
    if (!id) throw new SheetsError("CONFIG");
    return request(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(id)}${path}`, {
      ...init, headers: { "Content-Type": "application/json", ...init.headers, Authorization: `Bearer ${await token()}` },
    });
  };
}
