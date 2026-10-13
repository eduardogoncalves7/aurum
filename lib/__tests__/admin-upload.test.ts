import { describe, expect, it } from "vitest";
import { MAX_UPLOAD_BYTES, readUploadResponse, validateUpload } from "../admin-upload";

describe("admin upload responses", () => {
  it.each([413, 502, 504, 401, 403])( "handles HTML errors without exposing a JSON parsing exception (HTTP %s)", async (status) => {
    const response = new Response("<html><h1>Server error</h1></html>", { status });
    await expect(readUploadResponse(response)).rejects.toThrow(status === 413 ? "tamanho" : status === 401 || status === 403 ? "Acesso" : `HTTP ${status}`);
  });
  it("preserves the route's error message", async () => {
    await expect(readUploadResponse(Response.json({ error: "Não foi possível salvar o arquivo." }, { status: 500 }))).rejects.toThrow("Não foi possível salvar o arquivo.");
  });
  it("rejects an HTML success page and malformed success payloads", async () => {
    for (const body of ["<html>Login</html>", "{}", '{"path":42}']) {
      await expect(readUploadResponse(new Response(body))).rejects.toThrow("resposta inválida");
    }
  });
  it("returns the uploaded photo path", async () => {
    await expect(readUploadResponse(Response.json({ path: "/uploads/abc-123.webp" }, { status: 201 }))).resolves.toBe("/uploads/abc-123.webp");
  });
  it("rejects oversized files before sending and accepts the size boundary", () => {
    expect(() => validateUpload(new File([new Uint8Array(MAX_UPLOAD_BYTES + 1)], "photo.jpg", { type: "image/jpeg" }))).toThrow("5MB");
    expect(() => validateUpload(new File([new Uint8Array(MAX_UPLOAD_BYTES)], "photo.jpg", { type: "image/jpeg" }))).not.toThrow();
  });
});
