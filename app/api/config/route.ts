import { NextResponse } from "next/server";
import { readSiteSettings } from "@/lib/site-settings";

export async function GET() {
  try {
    return NextResponse.json(await readSiteSettings(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Erro ao carregar configurações públicas:", error);
    return NextResponse.json(
      { error: "Não foi possível carregar as configurações agora." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
