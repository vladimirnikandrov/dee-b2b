import { describe, it, expect } from "vitest";
import { computeOrderPricing, splitShipping } from "@/lib/pricing";
import { SHIPPING_RATES_GROSS, shippingRateFor } from "@/lib/products";

const DK_SHIP = SHIPPING_RATES_GROSS.DK;       // 9.25 gross
const STD_SHIP = SHIPPING_RATES_GROSS.DEFAULT; // 35.00 gross

// Real SKUs from lib/products.js (DEE 01): 2ML=DEP100701 (wsp 2), 20ML=DEP100300
// (wsp 25), 50ML=DEP100100 (wsp 55), 100ML=DEP100200 (wsp 75). Using the real
// catalog rather than a mock keeps these tests honest about the actual data
// shape order routes rely on.

describe("computeOrderPricing", () => {
  it("computes a single-line non-EU (export) order with no VAT — shipping has no VAT to split out", () => {
    const result = computeOrderPricing({
      items: [{ sku: "DEP100200", qty: 2 }], // 100ML x2 @ 75 = 150
      buyerCountry: "United States",
      buyerVat: "",
    });
    expect(result.totalWSP).toBe(150);
    expect(result.vatAmount).toBe(0);
    // 0% VAT, so net === gross === the quoted rate
    expect(result.shippingAmount).toBe(STD_SHIP);
    expect(result.shippingVatAmount).toBe(0);
    expect(result.depositAmount).toBe(STD_SHIP);
    expect(result.totalWithVat).toBe(150 + STD_SHIP);
  });

  it("applies Danish 25% VAT to goods AND to the VAT hiding inside the shipping charge", () => {
    const result = computeOrderPricing({
      items: [{ sku: "DEP100200", qty: 1 }], // 75
      buyerCountry: "Denmark",
      buyerVat: "",
    });
    expect(result.totalWSP).toBe(75);
    // 9.25 gross = 7.40 net + 1.85 VAT
    expect(result.shippingAmount).toBe(7.4);
    expect(result.shippingVatAmount).toBe(1.85);
    expect(result.depositAmount).toBe(DK_SHIP);
    expect(result.goodsVatAmount).toBe(18.75);
    // the invoice's VAT total is goods VAT + shipping VAT
    expect(result.vatAmount).toBe(18.75 + 1.85);
    expect(result.totalWithVat).toBe(75 + 18.75 + DK_SHIP);
  });

  // Dorte's instruction, 2026-07-26: "the stated shipping price always remains
  // the final price and no VAT is added on top for the customer."
  it("never charges the buyer more than the quoted shipping rate, whatever the VAT treatment", () => {
    const cases = [
      { country: "Denmark", vat: "", expected: DK_SHIP },
      { country: "Germany", vat: "", expected: STD_SHIP },            // EU, no VAT ID -> 25%
      { country: "Germany", vat: "DE123456789", expected: STD_SHIP }, // EU reverse charge -> 0%
      { country: "United States", vat: "", expected: STD_SHIP },      // export -> 0%
    ];
    for (const c of cases) {
      const r = computeOrderPricing({ items: [{ sku: "DEP100200", qty: 1 }], buyerCountry: c.country, buyerVat: c.vat });
      expect(r.depositAmount, `${c.country} gross shipping`).toBe(c.expected);
      expect(r.shippingAmount + r.shippingVatAmount, `${c.country} net+vat must equal gross`).toBe(c.expected);
    }
  });

  it("charges the domestic rate for Denmark and the standard rate for everyone else", () => {
    expect(shippingRateFor("Denmark")).toBe(DK_SHIP);
    expect(shippingRateFor("Danmark")).toBe(DK_SHIP);
    expect(shippingRateFor("DK")).toBe(DK_SHIP);
    expect(shippingRateFor("Germany")).toBe(STD_SHIP);
    expect(shippingRateFor("United States")).toBe(STD_SHIP);
    expect(shippingRateFor("Greenland")).toBe(STD_SHIP); // Danish territory, not a domestic parcel
    expect(shippingRateFor("")).toBe(STD_SHIP);
  });

  it("sums multiple lines across different SKUs correctly", () => {
    const result = computeOrderPricing({
      items: [
        { sku: "DEP100200", qty: 1 }, // 75
        { sku: "DEP100100", qty: 2 }, // 55 * 2 = 110
      ],
      buyerCountry: "United States",
      buyerVat: "",
    });
    expect(result.lines).toHaveLength(2);
    expect(result.totalWSP).toBe(75 + 110);
  });

  it("ignores unknown SKUs rather than trusting client-submitted product data", () => {
    const result = computeOrderPricing({
      items: [
        { sku: "DEP100200", qty: 1 }, // 75 — real
        { sku: "NOT-A-REAL-SKU", qty: 100 }, // ignored
      ],
      buyerCountry: "United States",
      buyerVat: "",
    });
    expect(result.lines).toHaveLength(1);
    expect(result.totalWSP).toBe(75);
  });

  it("ignores zero and negative quantities", () => {
    const result = computeOrderPricing({
      items: [
        { sku: "DEP100200", qty: 0 },
        { sku: "DEP100100", qty: -5 },
      ],
      buyerCountry: "United States",
      buyerVat: "",
    });
    expect(result.lines).toHaveLength(0);
    expect(result.totalWSP).toBe(0);
    expect(result.shippingAmount).toBe(0); // no items -> no shipping charge either
  });

  it("overrides unit price from a fixed_prices promo code, by size", () => {
    const promo = { discount_type: "fixed_prices", prices: { "100 ML": 48 } };
    const result = computeOrderPricing({
      items: [{ sku: "DEP100200", qty: 2 }], // would be 75 each, promo says 48
      buyerCountry: "United States",
      buyerVat: "",
      promo,
    });
    expect(result.lines[0].unitPrice).toBe(48);
    expect(result.totalWSP).toBe(96);
  });

  it("falls back to catalog price for a size the promo doesn't cover", () => {
    const promo = { discount_type: "fixed_prices", prices: { "2 ML": 1 } }; // doesn't mention 100 ML
    const result = computeOrderPricing({
      items: [{ sku: "DEP100200", qty: 1 }],
      buyerCountry: "United States",
      buyerVat: "",
      promo,
    });
    expect(result.lines[0].unitPrice).toBe(75); // catalog WSP, not the promo's other-size price
  });

  // The admin promo form stores prices as strings, so a cleared field arrives
  // as "" and Number("") is 0 — that used to sell the size for free.
  it("ignores an empty-string promo price and charges the catalog price", () => {
    const promo = { discount_type: "fixed_prices", prices: { "100 ML": "" } };
    const result = computeOrderPricing({
      items: [{ sku: "DEP100200", qty: 1 }],
      buyerCountry: "United States",
      buyerVat: "",
      promo,
    });
    expect(result.lines[0].unitPrice).toBe(75);
  });

  it("ignores a zero/negative promo price rather than selling the item for nothing", () => {
    for (const bad of [0, -5, null, "abc"]) {
      const result = computeOrderPricing({
        items: [{ sku: "DEP100200", qty: 1 }],
        buyerCountry: "United States",
        buyerVat: "",
        promo: { discount_type: "fixed_prices", prices: { "100 ML": bad } },
      });
      expect(result.lines[0].unitPrice).toBe(75);
    }
  });

  it("accepts a numeric-string promo price (the admin form's native format)", () => {
    const result = computeOrderPricing({
      items: [{ sku: "DEP100200", qty: 2 }],
      buyerCountry: "United States",
      buyerVat: "",
      promo: { discount_type: "fixed_prices", prices: { "100 ML": "48" } },
    });
    expect(result.lines[0].unitPrice).toBe(48);
    expect(result.totalWSP).toBe(96);
  });

  it("keeps depositAmount (gross shipping) and balanceAmount (goods + goods VAT) as documented invariants — no 30/70 split", () => {
    const result = computeOrderPricing({
      items: [{ sku: "DEP100200", qty: 1 }],
      buyerCountry: "Denmark",
      buyerVat: "",
    });
    expect(result.depositAmount).toBe(result.shippingAmount + result.shippingVatAmount);
    // balanceAmount is goods only — it must NOT pick up the shipping VAT that
    // vatAmount now carries, or the two invoices would double-count it.
    expect(result.balanceAmount).toBe(result.totalWSP + result.goodsVatAmount);
    expect(result.depositAmount + result.balanceAmount).toBe(result.totalWithVat);
  });

  it("the two invoices always add up to the order total, across every VAT case", () => {
    for (const c of [["Denmark", ""], ["Germany", ""], ["Germany", "DE123456789"], ["United States", ""], ["Norway", ""]]) {
      const r = computeOrderPricing({ items: [{ sku: "DEP100200", qty: 3 }, { sku: "DEP100701", qty: 7 }], buyerCountry: c[0], buyerVat: c[1] });
      expect(r.depositAmount + r.balanceAmount, `${c[0]} ${c[1]}`).toBe(r.totalWithVat);
      expect(r.vatAmount, `${c[0]} ${c[1]} vat total`).toBe(r.goodsVatAmount + r.shippingVatAmount);
    }
  });
});

describe("splitShipping", () => {
  it("splits a 25% gross charge so net + VAT lands exactly on the quote", () => {
    expect(splitShipping(35, 0.25)).toEqual({ net: 28, vat: 7, gross: 35 });
    expect(splitShipping(9.25, 0.25)).toEqual({ net: 7.4, vat: 1.85, gross: 9.25 });
  });

  it("leaves a 0% charge untouched", () => {
    expect(splitShipping(35, 0)).toEqual({ net: 35, vat: 0, gross: 35 });
  });

  it("returns zeroes for no shipping", () => {
    expect(splitShipping(0, 0.25)).toEqual({ net: 0, vat: 0, gross: 0 });
  });

  // VAT is derived by subtraction precisely so this can never drift: an
  // independently-rounded VAT would leave invoices that fail to foot by a cent.
  it("net + VAT reconstitutes the gross exactly, for every cent value up to 100", () => {
    for (let cents = 1; cents <= 10000; cents++) {
      const gross = cents / 100;
      const { net, vat } = splitShipping(gross, 0.25);
      expect(Math.round((net + vat) * 100) / 100, `gross ${gross}`).toBe(gross);
    }
  });

  // THE property e-conomic depends on, which is stronger than the one above and
  // does NOT hold for every rate. We send the NET price and e-conomic puts the
  // VAT back on its own, so net x (1 + rate) has to land exactly on the quoted
  // gross — otherwise the draft in Dorte's books is a cent off the invoice the
  // buyer was sent, which is the whole class of bug this work exists to remove.
  // At 25% that requires a gross that is a multiple of 0.05. Both configured
  // rates satisfy it; this test is here to fail loudly if someone sets a rate
  // like 9.99 that does not.
  it("every configured shipping rate survives e-conomic re-grossing exactly", () => {
    for (const [zone, gross] of Object.entries(SHIPPING_RATES_GROSS)) {
      const { net } = splitShipping(gross, 0.25);
      expect(Math.round(net * 1.25 * 100) / 100, `${zone} rate ${gross} must re-gross exactly`).toBe(gross);
    }
  });

  it("shows the constraint is real — not every rate survives the round trip", () => {
    // Guards the test above from being vacuous. A gross of 0.02 splits to a net
    // of 0.02, which e-conomic would re-gross to 0.03 — a cent MORE than
    // quoted, i.e. exactly the books-disagree-with-invoice bug, one cent at a
    // time. Roughly a fifth of all cent values behave this way at 25%, so
    // "our rates happen to work" is a property worth pinning, not a given.
    const { net } = splitShipping(0.02, 0.25);
    expect(net).toBe(0.02);
    expect(Math.round(net * 1.25 * 100) / 100).toBe(0.03);
  });
});
