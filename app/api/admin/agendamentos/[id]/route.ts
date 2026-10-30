import { NextRequest, NextResponse } from "next/server";
import { AgendamentoStatus, updateAgendamentoStatus } from "@/lib/agendamentos";
import { readJsonBody, RequestBodyTooLargeError } from "@/lib/request-security";

const statuses = new Set<AgendamentoStatus>(["pending", "confirmed", "cancelled", "completed"]);

async function setStatus(id: string, status: AgendamentoStatus) {
  const agendamento = await updateAgendamentoStatus(id, status);
  return agendamento
    ? NextResponse.json({ agendamento })
    : NextResponse.json({ error: "Agendamento não encontrado." }, { status: 404 });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const body = await readJsonBody(request);
    const status = body && typeof body === "object" && "status" in body ? body.status : null;
    if (typeof status !== "string" || !statuses.has(status as AgendamentoStatus)) {
      return NextResponse.json({ error: "Status inválido." }, { status: 400 });
    }
    return await setStatus(id, status as AgendamentoStatus);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: "O envio excede o limite de 64 KB." }, { status: 413 });
    }
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return setStatus((await params).id, "cancelled");
}
