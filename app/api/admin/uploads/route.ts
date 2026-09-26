import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

// Protegida pelo proxy.ts (matcher /api/admin/:path*). Salva em
// public/uploads — em produção, esse caminho deve ser o ponto de montagem
// do volume persistente do Coolify (ver README), senão as fotos somem no
// próximo deploy.
//
// Nunca confiar no nome de arquivo que o navegador manda: geramos um nome
// aleatório e escolhemos a extensão a partir do mimetype validado, evitando
// path traversal (ex: "../../server.js") ou upload de algo que não é
// imagem disfarçado de .jpg.
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

  const filename = `${randomUUID()}.${extension}`;
  const uploadsDir = path.join(process.cwd(), "public", "uploads");

  try {
    await mkdir(uploadsDir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(uploadsDir, filename), buffer);
  } catch (error) {
    console.error("Erro ao salvar upload:", error);
    return NextResponse.json({ error: "Não foi possível salvar o arquivo." }, { status: 500 });
  }

  return NextResponse.json({ path: `/uploads/${filename}` }, { status: 201 });
}
