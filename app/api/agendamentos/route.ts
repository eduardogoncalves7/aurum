import { NextRequest, NextResponse } from "next/server";
import {
  AgendamentoInput,
  ValidationError,
  createAgendamento,
  listAgendamentosByAccessHash,
  listHorariosOcupados,
  revokeBookingAccess,
} from "@/lib/agendamentos";
import { BOOKING_ACCESS_COOKIE, bookingCookieOptions, bookingTokenHash, createBookingToken, validBookingToken, sameBookingOrigin } from "@/lib/booking-access";

const privateHeaders = { "Cache-Control": "private, no-store", Vary: "Cookie" };


// GET /api/agendamentos -> only bookings authorized by this browser cookie.
// GET /api/agendamentos?data=YYYY-MM-DD -> só os horários já ocupados nesse
// dia (não expõe nome/telefone de outros clientes).
// Phone numbers and localStorage never authorize history access.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const telefone = searchParams.get("telefone");
  const data = searchParams.get("data");

  if (telefone) {
    return NextResponse.json({ error: "Consulta por telefone indisponível." }, { status: 403, headers: privateHeaders });
  }

  try {
    if (data) {
      const horariosOcupados = await listHorariosOcupados(data);
      return NextResponse.json({ horariosOcupados });
    }
    const token = request.cookies.get(BOOKING_ACCESS_COOKIE)?.value;
    if (!validBookingToken(token)) {
      return NextResponse.json({ error: "Histórico indisponível neste navegador." }, { status: 401, headers: privateHeaders });
    }
    const agendamentos = await listAgendamentosByAccessHash(bookingTokenHash(token));
    return NextResponse.json({ agendamentos }, { headers: privateHeaders });
  } catch (error) {
    console.error("Erro ao consultar agendamentos:", error);
    return NextResponse.json(
      { error: "Não foi possível consultar os agendamentos agora." },
      { status: 500, headers: privateHeaders }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!sameBookingOrigin(request)) return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
  let body: AgendamentoInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  try {
    const existing = request.cookies.get(BOOKING_ACCESS_COOKIE)?.value;
    const token = validBookingToken(existing) ? existing : createBookingToken();
    const agendamento = await createAgendamento(body, bookingTokenHash(token));
    const response = NextResponse.json({ agendamento }, { status: 201, headers: privateHeaders });
    response.cookies.set(BOOKING_ACCESS_COOKIE, token, bookingCookieOptions);
    return response;
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Erro ao criar agendamento:", error);
    return NextResponse.json(
      { error: "Não foi possível salvar o agendamento agora." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  if (!sameBookingOrigin(request)) return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
  const token = request.cookies.get(BOOKING_ACCESS_COOKIE)?.value;
  try {
    if (validBookingToken(token)) await revokeBookingAccess(bookingTokenHash(token));
  } catch {
    return NextResponse.json({ error: "Não foi possível encerrar o acesso ao histórico." }, { status: 500, headers: privateHeaders });
  }
  const response = NextResponse.json({ ok: true }, { headers: privateHeaders });
  response.cookies.set(BOOKING_ACCESS_COOKIE, "", { ...bookingCookieOptions, maxAge: 0 });
  return response;
}
