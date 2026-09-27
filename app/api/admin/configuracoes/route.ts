import { NextRequest, NextResponse } from "next/server";
import { readSiteSettings, writeSiteSettings } from "@/lib/site-settings";

export async function GET() { return NextResponse.json(await readSiteSettings()); }

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    for (const key of ["whatsappDestination", "address", "instagram", "phone", "hours"]) {
      if (typeof body[key] !== "string" || !body[key].trim()) return NextResponse.json({ error: `Campo inválido: ${key}` }, { status: 400 });
    }
    const settings = await writeSiteSettings(body);
    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Erro ao salvar configurações:", error);
    return NextResponse.json({ error: "Não foi possível salvar as configurações." }, { status: 500 });
  }
}
