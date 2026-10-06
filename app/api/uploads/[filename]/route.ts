import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MIME_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

// Uploads salvos depois do build podem não ser incluídos no servidor de
// arquivos estáticos do Next. Esta rota lê do mesmo volume persistente usado
// pela API de upload e também serve fotos antigas já salvas como /uploads/...
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  const match = /^([a-f0-9-]{36})\.(jpg|png|webp)$/i.exec(filename);
  if (!match) return new NextResponse("Imagem não encontrada.", { status: 404 });

  const extension = match[2].toLowerCase();
  const filePath = path.join(process.cwd(), "public", "uploads", filename);
  try {
    const image = await readFile(filePath);
    return new NextResponse(new Uint8Array(image), {
      headers: {
        "Content-Type": MIME_TYPES[extension],
        "Content-Length": String(image.byteLength),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return new NextResponse("Imagem não encontrada.", { status: 404 });
    }
    console.error("Erro ao ler imagem enviada pelo admin.");
    return new NextResponse("Não foi possível carregar a imagem.", { status: 500 });
  }
}
