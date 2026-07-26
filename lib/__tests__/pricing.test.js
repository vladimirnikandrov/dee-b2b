import { describe, it, expect } from "vitest";
import { computeOrderPricing } from "@/lib/pricing";
import { SHIPPING_FLAT } from "@/lib/products";

// Real SKUs from lib/products.js (DEE 01): 2ML=DEP100701 (wsp 2), 20ML=DEP100300
// (wsp 25), 50ML=DEP100100 (wsp 55), 100ML=DEP100200 (wsp 75). Using the real
// catalog rather than a mock keeps these tests honest about the actual data
// shape order routes rely on.

describe("computeOrderPricing", () => {
  it("computes a single-line non-EU (export) order with no VAT and flat shipping", () => {
    const result = computeOrderPricing({
      items: [{ sku: "DEP100200", qty: 2 }], // 100ML x2 @ 75 = 150
      buyerCountry: "United States",
      buyerVat: "",
    });
    expect(result.totalWSP).toBe(150);
    expect(result.vatAmount).toBe(0);
    expect(result.shippingAmount).toBe(SHIPPING_FLAT);
    expect(result.totalWithVat).toBe(150 + SHIPPING_FLAT);
  });

  it("applies Danish 25% VAT and includes it in totalWithVat but not shipping", () => {
    const result = computeOrderPricing({
      items: [{ sku: "DEP100200", qty: 1 }], // 75
      buyerCountry: "Denmark",
      buyerVat: "",
    });
    expect(result.totalWSP).toBe(75);
    expect(result.vatAmount).toBe(75 * 0.25);
    expect(result.totalWithVat).toBe(75 + 75 * 0.25 + SHIPPING_FLAT);
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

  it("keeps depositAmount (shipping-only) and balanceAmount (goods+VAT) as documented invariants — no 30/70 split", () => {
    const result = computeOrderPricing({
      items: [{ sku: "DEP100200", qty: 1 }],
      buyerCountry: "Denmark",
      buyerVat: "",
    });
    expect(result.depositAmount).toBe(result.shippingAmount);
    expect(result.balanceAmount).toBe(result.totalWSP + result.vatAmount);
    expect(result.depositAmount + result.balanceAmount).toBe(result.totalWithVat);
  });
});
