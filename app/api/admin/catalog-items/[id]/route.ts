import { NextRequest, NextResponse } from "next/server";
import {
  CatalogItemInput,
  ValidationError,
  deleteCatalogItem,
  updateCatalogItem,
} from "@/lib/catalog-items";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let body: CatalogItemInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  try {
    const item = await updateCatalogItem(id, body);
    return NextResponse.json({ item });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Erro ao atualizar item de catálogo:", error);
    return NextResponse.json({ error: "Não foi possível atualizar o item." }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await deleteCatalogItem(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erro ao apagar item de catálogo:", error);
    return NextResponse.json({ error: "Não foi possível apagar o item." }, { status: 500 });
  }
}
