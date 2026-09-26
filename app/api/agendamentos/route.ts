import { NextRequest, NextResponse } from "next/server";
import {
  AgendamentoInput,
  ValidationError,
  createAgendamento,
  listAgendamentosByTelefone,
  listHorariosOcupados,
} from "@/lib/agendamentos";

// GET /api/agendamentos?telefone=...  -> agendamentos daquele telefone
// GET /api/agendamentos?data=YYYY-MM-DD -> só os horários já ocupados nesse
// dia (não expõe nome/telefone de outros clientes).
// Exige um dos dois parâmetros — não existe "listar tudo" nesta rota pública.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const telefone = searchParams.get("telefone");
  const data = searchParams.get("data");

  try {
    if (telefone) {
      const agendamentos = await listAgendamentosByTelefone(telefone);
      return NextResponse.json({ agendamentos });
    }
    if (data) {
      const horariosOcupados = await listHorariosOcupados(data);
      return NextResponse.json({ horariosOcupados });
    }
    return NextResponse.json(
      { error: "Informe o parâmetro telefone ou data." },
      { status: 400 }
    );
  } catch (error) {
    console.error("Erro ao consultar agendamentos:", error);
    return NextResponse.json(
      { error: "Não foi possível consultar os agendamentos agora." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  let body: AgendamentoInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  try {
    const agendamento = await createAgendamento(body);
    return NextResponse.json({ agendamento }, { status: 201 });
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
