import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { getPublicConfig } from "@/lib/config";

const settings = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn() }));
vi.mock("@/lib/site-settings", () => ({ readSiteSettings: settings.read, writeSiteSettings: settings.write }));
import { GET } from "@/app/api/config/route";
import { PUT } from "@/app/api/admin/configuracoes/route";

describe("saved public settings", () => {
  beforeEach(() => vi.resetAllMocks());
  it("returns the latest saved Instagram and disables response caching", async () => {
    settings.read.mockResolvedValue({ ...getPublicConfig(), instagram: "@novo_perfil" });
    const response = await GET();
    expect((await response.json()).instagram).toBe("@novo_perfil");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
  it("saves a valid updated profile", async () => {
    const value = { ...getPublicConfig(), instagram: "@novo_perfil" };
    settings.write.mockResolvedValue(value);
    const response = await PUT(new NextRequest("http://localhost/api/admin/configuracoes", { method: "PUT", body: JSON.stringify(value) }));
    expect(response.status).toBe(200);
    expect(settings.write).toHaveBeenCalledWith(value);
    expect((await response.json()).settings.instagram).toBe("@novo_perfil");
  });
  it("rejects invalid profiles before changing settings", async () => {
    const response = await PUT(new NextRequest("http://localhost/api/admin/configuracoes", { method: "PUT", body: JSON.stringify({ ...getPublicConfig(), instagram: "https://example.com/profile" }) }));
    expect(response.status).toBe(400);
    expect(settings.write).not.toHaveBeenCalled();
  });
});
