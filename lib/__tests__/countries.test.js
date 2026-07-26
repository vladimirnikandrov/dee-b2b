import { describe, it, expect } from "vitest";
import { COUNTRIES, EU_CODES, countryCode, normalizeCountry, isEuCountry, isDenmark } from "@/lib/countries";

describe("country list integrity", () => {
  it("has no duplicate ISO codes", () => {
    const codes = COUNTRIES.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("has no duplicate names", () => {
    const names = COUNTRIES.map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("contains all 27 EU member states, and marks exactly those as eu", () => {
    expect(EU_CODES.size).toBe(27);
    const euInList = COUNTRIES.filter((c) => c.eu).map((c) => c.code).sort();
    expect(euInList).toEqual([...EU_CODES].sort());
  });

  it("is sorted alphabetically by name", () => {
    const names = COUNTRIES.map((c) => c.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "en")));
  });

  it("uses two-letter uppercase codes throughout", () => {
    for (const c of COUNTRIES) expect(c.code).toMatch(/^[A-Z]{2}$/);
  });
});

describe("countryCode / normalizeCountry", () => {
  it("resolves canonical English names", () => {
    expect(countryCode("Denmark")).toBe("DK");
    expect(countryCode("Germany")).toBe("DE");
    expect(countryCode("United States")).toBe("US");
  });

  it("resolves ISO alpha-2 codes", () => {
    expect(countryCode("DK")).toBe("DK");
    expect(countryCode("de")).toBe("DE");
  });

  it("is case- and accent-insensitive", () => {
    expect(countryCode("dEnMaRk")).toBe("DK");
    expect(countryCode("TÜRKIYE")).toBe("TR");
    expect(countryCode("turkiye")).toBe("TR");
    expect(countryCode("Cote d'Ivoire")).toBe("CI");
    expect(countryCode("Côte d'Ivoire")).toBe("CI");
    expect(countryCode("Aland Islands")).toBe("AX");
  });

  it("ignores punctuation and extra whitespace", () => {
    expect(countryCode("  U.S.A.  ")).toBe("US");
    expect(countryCode("U.K.")).toBe("GB");
    expect(countryCode("Bosnia   and    Herzegovina")).toBe("BA");
  });

  // This is the whole point of the file — these are the strings that used to
  // fall through every branch of getVatInfo() and get invoiced at 0% VAT.
  it("resolves the local-language names a European buyer actually types", () => {
    const cases = {
      Danmark: "DK", Deutschland: "DE", Belgique: "BE", "België": "BE",
      Nederland: "NL", Holland: "NL", "España": "ES", Italia: "IT",
      Sverige: "SE", Norge: "NO", Suomi: "FI", "Österreich": "AT",
      Schweiz: "CH", Suisse: "CH", Polska: "PL", "Magyarország": "HU",
      Hrvatska: "HR", Eesti: "EE", Latvija: "LV", Lietuva: "LT",
      Slovensko: "SK", Slovenija: "SI", "Česko": "CZ", "Czech Republic": "CZ",
      Hellas: "GR", "Éire": "IE", Luxemburg: "LU", Srbija: "RS",
    };
    for (const [input, code] of Object.entries(cases)) {
      expect(countryCode(input), `${input} should resolve to ${code}`).toBe(code);
    }
  });

  it("resolves the UK and US spellings people actually use", () => {
    for (const s of ["UK", "United Kingdom", "Great Britain", "England", "Scotland", "GB"]) {
      expect(countryCode(s), s).toBe("GB");
    }
    for (const s of ["USA", "US", "United States of America", "America"]) {
      expect(countryCode(s), s).toBe("US");
    }
  });

  it("returns null rather than guessing on unknown input", () => {
    expect(countryCode("Narnia")).toBeNull();
    expect(countryCode("Germny")).toBeNull();
    expect(countryCode("")).toBeNull();
    expect(countryCode(null)).toBeNull();
    expect(countryCode(undefined)).toBeNull();
  });

  it("normalizeCountry returns the canonical name", () => {
    expect(normalizeCountry("Deutschland")).toBe("Germany");
    expect(normalizeCountry("danmark")).toBe("Denmark");
    expect(normalizeCountry("UK")).toBe("United Kingdom");
    expect(normalizeCountry("Narnia")).toBeNull();
  });

  it("normalizeCountry is idempotent — every canonical name maps to itself", () => {
    for (const c of COUNTRIES) expect(normalizeCountry(c.name)).toBe(c.name);
  });
});

describe("isEuCountry / isDenmark", () => {
  it("recognizes Denmark by every accepted spelling", () => {
    for (const s of ["Denmark", "denmark", "DK", "dk", "Danmark", "danmark"]) {
      expect(isDenmark(s), s).toBe(true);
    }
    expect(isDenmark("Sweden")).toBe(false);
    expect(isDenmark("")).toBe(false);
  });

  it("classifies EU membership by code, not by spelling", () => {
    expect(isEuCountry("Deutschland")).toBe(true);
    expect(isEuCountry("Czech Republic")).toBe(true);
    expect(isEuCountry("Czechia")).toBe(true);
    expect(isEuCountry("Norway")).toBe(false);
    expect(isEuCountry("Switzerland")).toBe(false);
    expect(isEuCountry("United Kingdom")).toBe(false); // post-Brexit
    expect(isEuCountry("Narnia")).toBe(false);
  });

  // Politically part of an EU member state, outside the EU VAT area. Pinned
  // because it is what the old hardcoded EU_COUNTRIES array already did (none
  // of these appeared in it) — this asserts continuity, not a tax conclusion.
  it("keeps non-VAT-area territories of EU states outside the EU, as before", () => {
    for (const s of ["Greenland", "Faroe Islands", "Åland Islands", "Martinique", "Réunion", "French Guiana", "Guadeloupe", "Mayotte"]) {
      expect(isEuCountry(s), s).toBe(false);
      expect(isDenmark(s), s).toBe(false);
    }
  });
});
