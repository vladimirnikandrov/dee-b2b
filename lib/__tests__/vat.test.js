import { describe, it, expect } from "vitest";
import { getVatInfo, DK_VAT_RATE, EU_COUNTRIES } from "@/lib/vat";

describe("getVatInfo", () => {
  it("charges Danish VAT for Denmark regardless of VAT number", () => {
    expect(getVatInfo("Denmark", "").rate).toBe(DK_VAT_RATE);
    expect(getVatInfo("Denmark", "DK12345678").rate).toBe(DK_VAT_RATE);
  });

  it("recognizes Denmark by common spelling variants, case-insensitively", () => {
    for (const spelling of ["denmark", "DENMARK", "DK", "dk", "Danmark", "danmark"]) {
      expect(getVatInfo(spelling, "").rate).toBe(DK_VAT_RATE);
    }
  });

  it("applies EU reverse charge (0%) when an EU buyer provides a VAT number", () => {
    const info = getVatInfo("France", "FR12345678901");
    expect(info.rate).toBe(0);
    expect(info.label).toBe("EU Reverse Charge");
  });

  it("falls back to Danish VAT for an EU buyer without a valid VAT number", () => {
    const info = getVatInfo("France", "");
    expect(info.rate).toBe(DK_VAT_RATE);
    expect(info.label).toContain("no VAT ID");
  });

  it("treats a too-short VAT number as absent (still charges Danish VAT)", () => {
    // hasVat requires length >= 5
    expect(getVatInfo("Germany", "1234").rate).toBe(DK_VAT_RATE);
    expect(getVatInfo("Germany", "12345").rate).toBe(0);
  });

  it("treats non-EU countries as 0% export, VAT number or not", () => {
    expect(getVatInfo("United States", "").rate).toBe(0);
    expect(getVatInfo("United States", "").label).toBe("Export (0% VAT)");
    expect(getVatInfo("United States", "somevatnumber").rate).toBe(0);
  });

  it("EU_COUNTRIES matching is case-insensitive", () => {
    expect(getVatInfo("france", "FR12345678901").rate).toBe(0);
    expect(getVatInfo("FRANCE", "FR12345678901").rate).toBe(0);
  });

  it("treats a blank/missing country as non-EU export", () => {
    expect(getVatInfo("", "").rate).toBe(0);
    expect(getVatInfo(undefined, undefined).rate).toBe(0);
  });
});
