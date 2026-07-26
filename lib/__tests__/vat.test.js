import { describe, it, expect } from "vitest";
import { getVatInfo, DK_VAT_RATE } from "@/lib/vat";

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

  it("EU matching is case-insensitive", () => {
    expect(getVatInfo("france", "FR12345678901").rate).toBe(0);
    expect(getVatInfo("FRANCE", "FR12345678901").rate).toBe(0);
  });

  it("treats a blank/missing country as non-EU export", () => {
    expect(getVatInfo("", "").rate).toBe(0);
    expect(getVatInfo(undefined, undefined).rate).toBe(0);
  });

  // Regression: until 2026-07-26 the EU check was a `===` against English
  // names only, so an EU buyer who wrote their country in their own language
  // was classified as a non-EU export and invoiced 0% VAT on goods they owed
  // 25% on. See lib/countries.js.
  it("classifies an EU buyer correctly when the country is written in their own language", () => {
    for (const spelling of ["Deutschland", "Belgique", "België", "España", "Italia", "Nederland", "Sverige", "Suomi", "Polska", "Österreich"]) {
      expect(getVatInfo(spelling, "").rate, `${spelling} without VAT ID`).toBe(DK_VAT_RATE);
      expect(getVatInfo(spelling, "DE123456789").label, `${spelling} with VAT ID`).toBe("EU Reverse Charge");
    }
  });

  it("accepts ISO alpha-2 codes as well as names", () => {
    expect(getVatInfo("DE", "DE123456789").label).toBe("EU Reverse Charge");
    expect(getVatInfo("NO", "NO123456789").label).toBe("Export (0% VAT)");
  });

  // Danish territories outside the EU VAT area — shipping there is an export,
  // not a domestic 25% sale.
  it("treats Greenland and the Faroe Islands as export, not Denmark", () => {
    expect(getVatInfo("Greenland", "").label).toBe("Export (0% VAT)");
    expect(getVatInfo("Faroe Islands", "").label).toBe("Export (0% VAT)");
  });

  it("still treats an unresolvable country as export (unchanged fallback)", () => {
    expect(getVatInfo("Narnia", "").rate).toBe(0);
    expect(getVatInfo("Germny", "").label).toBe("Export (0% VAT)");
  });
});
