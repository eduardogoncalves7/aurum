import sharp from "sharp";

const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp"]);

// Limit decoded pixels as well as file size: compressed images can be enormous.
export async function optimizeUploadImage(input: Buffer): Promise<Buffer> {
  const image = sharp(input, { limitInputPixels: 40_000_000, failOn: "warning" });
  const metadata = await image.metadata();
  if (!metadata.format || !ALLOWED_FORMATS.has(metadata.format)) {
    throw new Error("Formato de imagem inválido.");
  }
  if ((metadata.pages ?? 1) > 1) {
    throw new Error("Envie uma imagem sem animação.");
  }

  // Auto-orient before resizing; omit EXIF (including location) from the output.
  return image
    .rotate()
    .resize({ width: 1920, height: 1920, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
}
