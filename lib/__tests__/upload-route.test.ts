import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import sharp from "sharp";

vi.mock("fs/promises", () => ({ mkdir: vi.fn(), writeFile: vi.fn() }));
import { mkdir, writeFile } from "fs/promises";
import { POST } from "../../app/api/admin/uploads/route";

function request(file?: File) {
  const body = new FormData();
  if (file) body.append("file", file);
  return new NextRequest("http://localhost/api/admin/uploads", { method: "POST", body });
}

describe("admin upload route", () => {
  beforeEach(() => vi.clearAllMocks());

  it("stores an optimized WebP and returns the existing path contract", async () => {
    const input = await sharp({ create: { width: 2000, height: 1000, channels: 3, background: "gold" } }).jpeg().toBuffer();
    const response = await POST(request(new File([new Uint8Array(input)], "photo.jpg", { type: "image/jpeg" })));
    expect(response.status).toBe(201);
    expect((await response.json()).path).toMatch(/^\/uploads\/[a-f0-9-]{36}\.webp$/);
    const saved = vi.mocked(writeFile).mock.calls[0][1] as Buffer;
    const metadata = await sharp(saved).metadata();
    expect(metadata.format).toBe("webp");
    expect(metadata.width).toBe(1920);
  });

  it.each([
    undefined,
    new File(["invalid"], "fake.jpg", { type: "image/jpeg" }),
    new File(["invalid"], "image.svg", { type: "image/svg+xml" }),
    new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.jpg", { type: "image/jpeg" }),
  ])("rejects invalid uploads before writing files", async (file) => {
    expect((await POST(request(file))).status).toBe(400);
    expect(mkdir).not.toHaveBeenCalled();
    expect(writeFile).not.toHaveBeenCalled();
  });
});
