import { NextRequest, NextResponse } from "next/server";
import { OrcamentoStatus, updateOrcamentoStatus } from "@/lib/orcamentos";
import { readJsonBody, RequestBodyTooLargeError } from "@/lib/request-security";

const statuses = new Set<OrcamentoStatus>(["pending", "confirmed", "cancelled", "completed"]);

async function setStatus(id: string, status: OrcamentoStatus) {
  const orcamento = await updateOrcamentoStatus(id, status);
  return orcamento
    ? NextResponse.json({ orcamento })
    : NextResponse.json({ error: "Orçamento não encontrado." }, { status: 404 });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const body = await readJsonBody(request);
    const status = body && typeof body === "object" && "status" in body ? body.status : null;
    if (typeof status !== "string" || !statuses.has(status as OrcamentoStatus)) {
      return NextResponse.json({ error: "Status inválido." }, { status: 400 });
    }
    return await setStatus(id, status as OrcamentoStatus);
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
