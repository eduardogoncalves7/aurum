import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { createOrcamento } from "@/lib/orcamentos";
import { sameBookingOrigin } from "@/lib/booking-access";
import {
  PUBLIC_WRITE_LIMIT,
  PUBLIC_WRITE_WINDOW_SECONDS,
  RequestBodyTooLargeError,
  consumeRateLimit,
  readJsonBody,
} from "@/lib/request-security";

export async function POST(request: NextRequest) {
  if (!sameBookingOrigin(request)) return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
  const rateLimit = consumeRateLimit("public-write:orcamentos", request, PUBLIC_WRITE_LIMIT, PUBLIC_WRITE_WINDOW_SECONDS);
  if (rateLimit.limited) {
    return NextResponse.json(
      { error: "Muitas solicitações. Tente novamente em instantes." },
      { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": String(rateLimit.retryAfter) } },
    );
  }

  let body: unknown;
  try { body = await readJsonBody(request); }
  catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: "O envio excede o limite de 64 KB." }, { status: 413 });
    }
    return NextResponse.json({ error: "Envio inválido." }, { status: 400 });
  }
  try {
    const orcamento = await createOrcamento(body);
    return NextResponse.json({ orcamento }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof ZodError ? "Confira os dados do orçamento." : "Não foi possível registrar o orçamento agora." }, { status: error instanceof ZodError ? 400 : 500 });
  }
}
