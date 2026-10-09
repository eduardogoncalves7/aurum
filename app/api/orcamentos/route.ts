import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { createOrcamento } from "@/lib/orcamentos";
import { sameBookingOrigin } from "@/lib/booking-access";

export async function POST(request: NextRequest) {
  if (!sameBookingOrigin(request)) return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Envio inválido." }, { status: 400 }); }
  try {
    const orcamento = await createOrcamento(body);
    return NextResponse.json({ orcamento }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof ZodError ? "Confira os dados do orçamento." : "Não foi possível registrar o orçamento agora." }, { status: error instanceof ZodError ? 400 : 500 });
  }
}
