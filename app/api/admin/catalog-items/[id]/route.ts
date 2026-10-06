import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
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
    revalidatePath("/servicos");
    revalidatePath(`/servicos/${encodeURIComponent(item.id)}`);
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
    revalidatePath("/servicos");
    revalidatePath(`/servicos/${encodeURIComponent(id)}`);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erro ao apagar item de catálogo:", error);
    return NextResponse.json({ error: "Não foi possível apagar o item." }, { status: 500 });
  }
}
