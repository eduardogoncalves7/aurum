import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { optimizeUploadImage } from "@/lib/upload-image";

export const runtime = "nodejs";

// Protegida pelo proxy.ts (matcher /api/admin/:path*). Salva em
// public/uploads — em produção, esse caminho deve ser o ponto de montagem
// do volume persistente do Coolify (ver README), senão as fotos somem no
// próximo deploy.
//
// Nunca confiar no nome de arquivo que o navegador manda: geramos um nome
// aleatório. O conteúdo é validado e convertido para WebP antes de salvar.
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export async function POST(request: NextRequest) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Envio inválido." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
  }

  const extension = ALLOWED_TYPES[file.type];
  if (!extension) {
    return NextResponse.json(
      { error: "Formato não suportado — envie JPG, PNG ou WEBP." },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "Arquivo maior que 5MB." }, { status: 400 });
  }

  let buffer: Buffer;
  try {
    buffer = await optimizeUploadImage(Buffer.from(await file.arrayBuffer()));
  } catch {
    return NextResponse.json(
      { error: "Imagem inválida. Envie JPG, PNG ou WEBP sem animação e com até 40 megapixels." },
      { status: 400 }
    );
  }

  const filename = `${randomUUID()}.webp`;
  const uploadsDir = path.join(process.cwd(), "public", "uploads");

  try {
    await mkdir(uploadsDir, { recursive: true });
    await writeFile(path.join(uploadsDir, filename), buffer);
  } catch (error) {
    console.error("Erro ao salvar upload:", error);
    return NextResponse.json({ error: "Não foi possível salvar o arquivo." }, { status: 500 });
  }

  return NextResponse.json({ path: `/uploads/${filename}` }, { status: 201 });
}
