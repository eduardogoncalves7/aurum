export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export function validateUpload(file: File): void {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("Arquivo maior que 5MB. Reduza o tamanho da foto antes de enviar.");
  }
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Formato não suportado — envie JPG, PNG ou WEBP.");
  }
}

export async function readUploadResponse(response: Response): Promise<string> {
  // Proxies can return HTML errors before the request reaches our JSON route.
  const body = await response.text();
  let data: unknown;
  try {
    data = JSON.parse(body);
  } catch {
    data = null;
  }
  if (!response.ok) {
    if (response.status === 413) {
      throw new Error("O servidor recusou o tamanho da foto. Reduza a imagem ou verifique o limite de upload no proxy da hospedagem.");
    }
    if (response.status === 401 || response.status === 403) {
      throw new Error("Acesso ao upload negado. Entre novamente no painel e tente enviar a foto.");
    }
    if (data && typeof data === "object" && "error" in data && typeof data.error === "string") {
      throw new Error(data.error);
    }
    throw new Error(`Falha no upload (HTTP ${response.status}). Verifique os logs da aplicação e do proxy no Coolify.`);
  }
  if (!data || typeof data !== "object" || !("path" in data) || typeof data.path !== "string" || !/^\/uploads\/[a-f0-9-]+\.webp$/.test(data.path)) {
    throw new Error("O servidor retornou uma resposta inválida ao enviar a foto. Verifique a rota de upload na hospedagem.");
  }
  return data.path;
}
