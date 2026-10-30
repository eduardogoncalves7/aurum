import type { NextRequest } from "next/server";

export const MAX_JSON_BODY_BYTES = 64 * 1024;
export const ADMIN_AUTH_WINDOW_SECONDS = 15 * 60;
export const ADMIN_AUTH_FAILURE_LIMIT = 10;
export const PUBLIC_WRITE_WINDOW_SECONDS = 60;
export const PUBLIC_WRITE_LIMIT = 20;

export class RequestBodyTooLargeError extends Error {
  constructor() {
    super("AURUM_REQUEST_BODY_TOO_LARGE");
    this.name = "RequestBodyTooLargeError";
  }
}

type RateLimitBucket = { timestamps: number[] };

declare global {
  // Keep the limiter available across Next.js dev reloads. Production still
  // gets the edge rule as a second boundary when it is configured.
  var __aurumRateLimitBuckets: Map<string, RateLimitBucket> | undefined;
  var __aurumRateLimitLastCleanup: number | undefined;
}

const buckets: Map<string, RateLimitBucket> = globalThis.__aurumRateLimitBuckets ??= new Map<string, RateLimitBucket>();

function cleanupBuckets(now: number) {
  if (now - (globalThis.__aurumRateLimitLastCleanup ?? 0) < 60_000) return;
  globalThis.__aurumRateLimitLastCleanup = now;
  for (const [key, bucket] of buckets) {
    bucket.timestamps = bucket.timestamps.filter((timestamp) => now - timestamp < 15 * 60_000);
    if (bucket.timestamps.length === 0) buckets.delete(key);
  }
}

export function getClientIp(request: NextRequest): string {
  const cloudflareIp = request.headers.get("cf-connecting-ip")?.trim();
  if (cloudflareIp) return cloudflareIp;

  const forwarded = request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim();
  if (forwarded) return forwarded;

  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export function consumeRateLimit(
  keyPrefix: string,
  request: NextRequest,
  limit: number,
  windowSeconds: number,
): { limited: boolean; retryAfter: number } {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const key = `${keyPrefix}:${getClientIp(request)}`;
  const bucket = buckets.get(key) ?? { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((timestamp) => now - timestamp < windowMs);

  const oldest = bucket.timestamps[0] ?? now;
  const retryAfter = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
  if (bucket.timestamps.length >= limit) {
    buckets.set(key, bucket);
    cleanupBuckets(now);
    return { limited: true, retryAfter };
  }

  bucket.timestamps.push(now);
  buckets.set(key, bucket);
  cleanupBuckets(now);
  return { limited: false, retryAfter };
}

export function resetRateLimit(keyPrefix: string, request: NextRequest): void {
  buckets.delete(`${keyPrefix}:${getClientIp(request)}`);
}

export async function readJsonBody(request: NextRequest): Promise<unknown> {
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_JSON_BODY_BYTES) {
    throw new RequestBodyTooLargeError();
  }

  if (!request.body) {
    return JSON.parse(await request.text());
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_JSON_BODY_BYTES) throw new RequestBodyTooLargeError();
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(body));
}

