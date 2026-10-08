import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { optimizeUploadImage } from "../upload-image";

describe("upload image optimization", () => {
  it("reduces large photos to WebP while preserving aspect ratio", async () => {
    const input = await sharp({ create: { width: 3000, height: 1500, channels: 3, background: "gold" } }).jpeg().toBuffer();
    const output = await optimizeUploadImage(input);
    const metadata = await sharp(output).metadata();
    expect(metadata.format).toBe("webp");
    expect([metadata.width, metadata.height]).toEqual([1920, 960]);
    expect(output.length).toBeLessThan(input.length);
  });

  it("preserves transparency without enlarging small images", async () => {
    const input = await sharp({ create: { width: 80, height: 40, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer();
    const metadata = await sharp(await optimizeUploadImage(input)).metadata();
    expect([metadata.width, metadata.height]).toEqual([80, 40]);
    expect(metadata.hasAlpha).toBe(true);
  });

  it("applies EXIF orientation and strips metadata", async () => {
    const input = await sharp({ create: { width: 100, height: 50, channels: 3, background: "gold" } }).jpeg().withMetadata({ orientation: 6 }).toBuffer();
    const metadata = await sharp(await optimizeUploadImage(input)).metadata();
    expect([metadata.width, metadata.height]).toEqual([50, 100]);
    expect(metadata.exif).toBeUndefined();
  });

  it("rejects corrupt images and disguised SVG", async () => {
    await expect(optimizeUploadImage(Buffer.from("not an image"))).rejects.toThrow();
    await expect(optimizeUploadImage(Buffer.from('<svg width="10" height="10"><rect width="10" height="10"/></svg>'))).rejects.toThrow();
  });

  it("limits decoded pixels", async () => {
    const input = await sharp({ create: { width: 6500, height: 6500, channels: 3, background: "gold" } }).png().toBuffer();
    await expect(optimizeUploadImage(input)).rejects.toThrow();
  });
});
