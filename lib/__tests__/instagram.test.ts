import { describe, expect, it } from "vitest";
import { getInstagramUrl } from "@/lib/instagram";

describe("Instagram configuration", () => {
  it.each(["@nova_loja", "nova_loja", " https://www.instagram.com/nova_loja/ ", "https://instagram.com/nova_loja/?igsh=123"])("uses the saved profile %s", (value) => {
    expect(getInstagramUrl(value)).toBe("https://www.instagram.com/nova_loja/");
  });
  it.each(["", "@", "nome com espaço", "https://example.com/perfil", "javascript:alert(1)", "https://instagram.com.evil.com/perfil", "https://instagram.com/p/post/", "https://user@instagram.com/perfil", "nome..perfil"])("rejects invalid profile %s", (value) => {
    expect(getInstagramUrl(value)).toBeNull();
  });
});
