import { NextResponse } from "next/server";

export const GET = () => NextResponse.json(
  { error: "Imagem não encontrada." },
  { status: 404, headers: { "Cache-Control": "no-store" } },
);

