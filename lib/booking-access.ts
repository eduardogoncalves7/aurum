import { createHash, randomBytes } from "node:crypto";
import type { NextRequest } from "next/server";
import { getSiteUrl } from "@/lib/site-url";

export function sameBookingOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  return (!origin || origin === request.nextUrl.origin || origin === getSiteUrl()) && request.headers.get("sec-fetch-site") !== "cross-site";
}

export const BOOKING_ACCESS_COOKIE = process.env.NODE_ENV === "production"
  ? "__Host-aurum_booking_access"
  : "aurum_booking_access";
export const BOOKING_ACCESS_MAX_AGE = 90 * 24 * 60 * 60;

export function validBookingToken(value: string | undefined): value is string {
  return !!value && /^[a-f0-9]{64}$/.test(value);
}

export function createBookingToken(): string {
  return randomBytes(32).toString("hex");
}

export function bookingTokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export const bookingCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
  maxAge: BOOKING_ACCESS_MAX_AGE,
};
