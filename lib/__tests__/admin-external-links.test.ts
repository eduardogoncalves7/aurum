import { describe, expect, it } from "vitest";
import { getAdminExternalLinks } from "../admin-external-links";

describe("admin external links", () => {
  it("builds the services spreadsheet URL from the Google ID and GID", () => {
    expect(getAdminExternalLinks({
      GOOGLE_SERVICES_SHEET_ID: "sheet-id",
      GOOGLE_SERVICES_SHEET_GID: "12345",
    }).spreadsheetUrl).toBe("https://docs.google.com/spreadsheets/d/sheet-id/edit?gid=12345");
  });

  it("hides links when their environment values are missing", () => {
    expect(getAdminExternalLinks({})).toEqual({
      spreadsheetUrl: undefined,
      financeiroUrl: undefined,
    });
  });

  it("only exposes a valid HTTPS finance URL", () => {
    expect(getAdminExternalLinks({ FINANCEIRO_URL: "http://finance.example" }).financeiroUrl).toBeUndefined();
    expect(getAdminExternalLinks({ FINANCEIRO_URL: "not-a-url" }).financeiroUrl).toBeUndefined();
    expect(getAdminExternalLinks({ FINANCEIRO_URL: "https://finance.example/agenda" }).financeiroUrl)
      .toBe("https://finance.example/agenda");
  });
});
