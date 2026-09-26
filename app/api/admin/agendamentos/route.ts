import { NextResponse } from "next/server";
import { listAllAgendamentos } from "@/lib/agendamentos";

// Retorna todos os agendamentos (com nome/telefone) — só deve ser alcançável
// depois do Basic Auth aplicado pelo middleware.ts em /api/admin/*. Não
// duplicar essa checagem aqui evita esquecer de manter as duas em sincronia;
// se o matcher do middleware mudar, revisar esta rota também.
export async function GET() {
  try {
    const agendamentos = await listAllAgendamentos();
    return NextResponse.json({ agendamentos });
  } catch (error) {
    console.error("Erro ao listar agendamentos (admin):", error);
    return NextResponse.json(
      { error: "Não foi possível carregar os agendamentos agora." },
      { status: 500 }
    );
  }
}
