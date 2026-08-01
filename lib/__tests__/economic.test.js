import { describe, it, expect } from "vitest";
import { economicRefsFor, escapeFilterValue, normaliseName } from "@/lib/economic";
import { toFlatOrderData } from "@/lib/orders";
import { DK_VAT_RATE } from "@/lib/vat";

// Shape of a row as it comes back from Postgres — numerics arrive as strings,
// which is exactly the detail that makes `vat_rate` easy to get wrong.
const row = (over = {}) => ({
  id: "DA-2604-1000",
  buyer_company: "Test Co",
  buyer_country: "France",
  buyer_vat: "FR12345678901",
  buyer_email: "b@example.com",
  lines: [],
  total_wsp: "100.00",
  vat_amount: "0.00",
  vat_rate: "0",
  vat_label: "EU Reverse Charge",
  vat_note: "",
  shipping_amount: "35.00",
  total_with_vat: "135.00",
  deposit_amount: "35.00",
  balance_amount: "100.00",
  created_at: new Date("2026-05-01T10:00:00Z"),
  ...over,
});

describe("economicRefsFor — VAT zone / customer group", () => {
  it("books a Danish order as domestic (zone 1, group 1)", () => {
    const refs = economicRefsFor(toFlatOrderData(row({ buyer_country: "Denmark", buyer_vat: "DK45305481", vat_rate: String(DK_VAT_RATE) })));
    expect(refs).toMatchObject({ vatZoneNumber: 1, customerGroupNumber: 1 });
  });

  it("books an EU order with a VAT ID as EU (zone 2, group 2)", () => {
    const refs = economicRefsFor(toFlatOrderData(row()));
    expect(refs).toMatchObject({ vatZoneNumber: 2, customerGroupNumber: 2 });
  });

  it("books a non-EU order as abroad (zone 3, group 2)", () => {
    const refs = economicRefsFor(toFlatOrderData(row({ buyer_country: "United States", buyer_vat: "", vat_rate: "0" })));
    expect(refs).toMatchObject({ vatZoneNumber: 3, customerGroupNumber: 2 });
  });

  it("books an EU order without a VAT ID as domestic, matching the 25% actually charged", () => {
    const refs = economicRefsFor(toFlatOrderData(row({ buyer_country: "Germany", buyer_vat: "", vat_rate: String(DK_VAT_RATE) })));
    expect(refs.vatZoneNumber).toBe(1);
  });

  // THE regression this file exists for. Before 2026-07-26 lib/vat.js matched
  // EU membership against English names only, so an order stored as
  // "Deutschland" was invoiced at 0% and booked to zone 3. Adding
  // lib/countries.js made getVatInfo() resolve that string — which, if the
  // zone were still recomputed from the country, would re-book an old order as
  // Danish domestic and put a draft 25% above the invoice the buyer holds into
  // Dorte's live accounting. The frozen `vat_rate` is what prevents that.
  it("does not re-book a legacy order whose country only became resolvable later", () => {
    const legacy = toFlatOrderData(row({ buyer_country: "Deutschland", buyer_vat: "", vat_rate: "0", vat_label: "Export (0% VAT)", vat_amount: "0.00" }));
    expect(legacy.vatRate).toBe(0);
    // Not zone 1: the invoice said 0% VAT, so the draft must not attract 25%.
    expect(economicRefsFor(legacy).vatZoneNumber).not.toBe(1);
  });

  it("still classifies correctly when no rate was ever recorded", () => {
    const refs = economicRefsFor({ buyerCountry: "Denmark", buyerVat: "", vatRate: undefined });
    expect(refs.vatZoneNumber).toBe(1);
  });

  it("keeps the reference numbers verified against Dorte's live account", () => {
    // paymentTerms 4 = "Net 14 days", layout 22 = the English black layout.
    // These were reverse-engineered from her real customers, not defaults —
    // pinned so a casual edit shows up as a failing test.
    expect(economicRefsFor(toFlatOrderData(row()))).toMatchObject({ paymentTermsNumber: 4, layoutNumber: 22 });
  });
});

// e-conomic's filter syntax uses `$` for both operators and escaping
// (restdocs.e-conomic.com/#filtering). An unescaped metacharacter in a company
// name doesn't just fail to match — it turns the query into a different one.
describe("escapeFilterValue", () => {
  it("leaves an ordinary company name alone", () => {
    expect(escapeFilterValue("Dee Store")).toBe("Dee Store");
    expect(escapeFilterValue("Maison Dée & Co")).toBe("Maison Dée & Co");
  });

  it("escapes every character e-conomic treats as special", () => {
    expect(escapeFilterValue("$")).toBe("$$");
    expect(escapeFilterValue("(")).toBe("$(");
    expect(escapeFilterValue(")")).toBe("$)");
    expect(escapeFilterValue("*")).toBe("$*");
    expect(escapeFilterValue(",")).toBe("$,");
    expect(escapeFilterValue("[")).toBe("$[");
    expect(escapeFilterValue("]")).toBe("$]");
  });

  it("escapes a realistic company name containing them", () => {
    expect(escapeFilterValue("Scent & Co (Nordics), Ltd")).toBe("Scent & Co $(Nordics$)$, Ltd");
  });

  it("escapes the $ before anything that could read as an operator", () => {
    // Without escaping, this value would inject a second predicate.
    expect(escapeFilterValue("A$eq:B")).toBe("A$$eq:B");
  });

  it("handles non-string input without throwing", () => {
    expect(escapeFilterValue(12345)).toBe("12345");
  });
});

describe("toFlatOrderData", () => {
  it("exposes the frozen VAT rate as a number", () => {
    expect(toFlatOrderData(row({ vat_rate: "0.25" })).vatRate).toBe(0.25);
  });

  it("aliases depositInvoiceTotal to the shipping-only first invoice", () => {
    const flat = toFlatOrderData(row());
    expect(flat.depositInvoiceTotal).toBe(35);
    expect(flat.depositAmount).toBe(35);
  });
});

// A VAT/CVR match alone used to be enough to bind a portal account to an
// e-conomic customer card. A buyer who typed a competitor's VAT number — by
// mistake or otherwise — got their orders permanently filed under that
// competitor in Dorte's real ledger. The name now has to agree too.
describe("normaliseName — customer-card name agreement", () => {
  it("treats the same company written differently as the same name", () => {
    expect(normaliseName("DEE STORE ApS.")).toBe(normaliseName("Dee Store aps"));
    expect(normaliseName("  Perfumeri-Nord  ")).toBe(normaliseName("perfumeri nord"));
    expect(normaliseName("B&B Parfum A/S")).toBe(normaliseName("B B PARFUM AS"));
  });

  it("does not collapse two different companies into one", () => {
    expect(normaliseName("Dee Store")).not.toBe(normaliseName("Dee Storage"));
    expect(normaliseName("Nord Parfum")).not.toBe(normaliseName("Parfum Nord"));
  });

  it("is safe on missing input", () => {
    expect(normaliseName(undefined)).toBe("");
    expect(normaliseName(null)).toBe("");
  });
});
