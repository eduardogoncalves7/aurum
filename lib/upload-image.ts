import sharp from "sharp";

const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp"]);
const TARGET_SIZE_BYTES = 300 * 1024;
const MAX_DIMENSION = 1920;
const MIN_DIMENSION = 1280;
const WEBP_QUALITIES = [82, 74, 66];
const SHARP_OPTIONS = { limitInputPixels: 40_000_000, failOn: "warning" as const };

async function inspectUpload(input: Buffer) {
  const image = sharp(input, SHARP_OPTIONS);
  const metadata = await image.metadata();
  if (!metadata.format || !ALLOWED_FORMATS.has(metadata.format)) {
    throw new Error("Formato de imagem inválido.");
  }
  if ((metadata.pages ?? 1) > 1) {
    throw new Error("Envie uma imagem sem animação.");
  }
  return metadata;
}

export async function getUploadFormat(input: Buffer): Promise<string> {
  const metadata = await inspectUpload(input);
  return metadata.format as string;
}

// Limit decoded pixels as well as file size: compressed images can be enormous.
export async function optimizeUploadImage(input: Buffer): Promise<Buffer> {
  await inspectUpload(input);

  // Auto-orient before resizing; omit EXIF (including location) from the output.
  let maxDimension = MAX_DIMENSION;
  let output = Buffer.alloc(0);
  while (true) {
    for (const quality of WEBP_QUALITIES) {
      output = await sharp(input, SHARP_OPTIONS)
        .rotate()
        .resize({ width: maxDimension, height: maxDimension, fit: "inside", withoutEnlargement: true })
        .webp({ quality })
        .toBuffer();

      if (output.length <= TARGET_SIZE_BYTES) return output;
    }

    if (maxDimension <= MIN_DIMENSION) return output;
    maxDimension = Math.max(MIN_DIMENSION, Math.round(maxDimension * 0.85));
  }
}
