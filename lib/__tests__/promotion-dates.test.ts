import { describe, expect, it } from "vitest";
import { brazilianDateToIso, isoDateToBrazilian, promotionDateError, todayInSaoPaulo } from "@/lib/promotion-dates";

describe("promotion calendar dates", () => {
  it("keeps October 5 as October 5 through saving and reopening", () => {
    expect(brazilianDateToIso("05/10/2026")).toBe("2026-10-05");
    expect(isoDateToBrazilian("2026-10-05")).toBe("05/10/2026");
    expect(brazilianDateToIso("07/10/2026")).toBe("2026-10-07");
    expect(promotionDateError("2026-10-05", "2026-10-07")).toBeNull();
  });
  it.each(["31/04/2026", "29/02/2026", "05/13/2026", "5/10/2026", "2026-10-05", "", "01/01/0000"])("rejects invalid or ambiguous input %s", (value) => {
    expect(brazilianDateToIso(value)).toBeNull();
  });
  it("accepts leap days only in leap years", () => {
    expect(brazilianDateToIso("29/02/2028")).toBe("2028-02-29");
  });
  it("rejects reversed, missing and nonexistent dates, accepts one-day promotions", () => {
    expect(promotionDateError("2026-10-07", "2026-10-05")).toContain("antes do início");
    expect(promotionDateError("", "2026-10-07")).not.toBeNull();
    expect(promotionDateError("2026-02-30", "2026-03-01")).not.toBeNull();
    expect(promotionDateError("2026-10-05", "2026-10-05")).toBeNull();
  });
  it("does not end a promotion early at UTC midnight", () => {
    expect(todayInSaoPaulo(new Date("2026-10-08T01:00:00Z"))).toBe("2026-10-07");
    expect(todayInSaoPaulo(new Date("2026-10-08T03:00:00Z"))).toBe("2026-10-08");
  });
});
