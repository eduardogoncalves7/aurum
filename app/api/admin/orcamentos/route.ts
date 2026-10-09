import { NextResponse } from "next/server";
import { listOrcamentos } from "@/lib/orcamentos";

// Protected by proxy.ts, like the other /api/admin routes.
export async function GET() {
  try {
    return NextResponse.json({ orcamentos: await listOrcamentos() }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Não foi possível carregar os orçamentos." }, { status: 500 });
  }
}
