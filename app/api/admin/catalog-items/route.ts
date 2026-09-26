import { NextRequest, NextResponse } from "next/server";
import {
  CatalogItemInput,
  ValidationError,
  createCatalogItem,
  listAllCatalogItems,
} from "@/lib/catalog-items";

// Protegida pelo proxy.ts (matcher /api/admin/:path*).
export async function GET() {
  try {
    const items = await listAllCatalogItems();
    return NextResponse.json({ items });
  } catch (error) {
    console.error("Erro ao listar itens de catálogo (admin):", error);
    return NextResponse.json({ error: "Não foi possível carregar os itens." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let body: CatalogItemInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  try {
    const item = await createCatalogItem(body);
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Erro ao criar item de catálogo:", error);
    return NextResponse.json({ error: "Não foi possível salvar o item." }, { status: 500 });
  }
}
