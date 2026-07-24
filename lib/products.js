// Product catalog — single source of truth, shared by the client UI and the
// server-side pricing logic (POST /api/orders re-derives prices from here
// rather than trusting client-submitted unit prices).
//
// No more named collections (2026-07) — every fragrance is just "DEE 0X".
// Variants are ordered smallest to largest (2/20/50/100 ML) — this drives
// the display order in the catalog grid, so keep new variants in that order.
// DEE 04, DEE 05, and DISCOVER ME don't have real EAN codes yet (not in
// production) and ship with zero stock (see db/schema.sql inventory rows) —
// they render with an "Out of Stock" badge and can't be added to cart until
// real stock/pricing is set. DEE 04/05 pricing below is a placeholder,
// copied from DEE 01-03 — confirm real WSP/RRP before they go live.

export const PRODUCTS = [
  { name: "DEE 01", variants: [
    { size: "2 ML", sku: "DEP100701", ean: null, wsp: 2, rrp: null, label: "Tester" },
    { size: "20 ML", sku: "DEP100300", ean: "0788364060594", wsp: 25, rrp: 65 },
    { size: "50 ML", sku: "DEP100100", ean: "0792649468432", wsp: 55, rrp: 145 },
    { size: "100 ML", sku: "DEP100200", ean: "0788364060525", wsp: 75, rrp: 200 },
  ]},
  { name: "DEE 02", variants: [
    { size: "2 ML", sku: "DEP100702", ean: null, wsp: 2, rrp: null, label: "Tester" },
    { size: "20 ML", sku: "DEP100301", ean: "0788364060563", wsp: 25, rrp: 65 },
    { size: "50 ML", sku: "DEP100101", ean: "0788364060501", wsp: 55, rrp: 145 },
    { size: "100 ML", sku: "DEP100201", ean: "0788364060532", wsp: 75, rrp: 200 },
  ]},
  { name: "DEE 03", variants: [
    { size: "2 ML", sku: "DEP100703", ean: null, wsp: 2, rrp: null, label: "Tester" },
    { size: "20 ML", sku: "DEP100302", ean: "0788364060570", wsp: 25, rrp: 65 },
    { size: "50 ML", sku: "DEP100102", ean: "0788364060518", wsp: 55, rrp: 145 },
    { size: "100 ML", sku: "DEP100202", ean: "0788364060549", wsp: 75, rrp: 200 },
  ]},
  { name: "DEE 04", variants: [
    { size: "2 ML", sku: "DEP100704", ean: null, wsp: 2, rrp: null, label: "Tester" },
    { size: "20 ML", sku: "DEP100303", ean: null, wsp: 25, rrp: 65 },
    { size: "50 ML", sku: "DEP100103", ean: null, wsp: 55, rrp: 145 },
    { size: "100 ML", sku: "DEP100203", ean: null, wsp: 75, rrp: 200 },
  ]},
  { name: "DEE 05", variants: [
    { size: "2 ML", sku: "DEP100705", ean: null, wsp: 2, rrp: null, label: "Tester" },
    { size: "20 ML", sku: "DEP100304", ean: null, wsp: 25, rrp: 65 },
    { size: "50 ML", sku: "DEP100104", ean: null, wsp: 55, rrp: 145 },
    { size: "100 ML", sku: "DEP100204", ean: null, wsp: 75, rrp: 200 },
  ]},
  { name: "DISCOVER ME", variants: [
    { size: "KIT", sku: "DEP100800", ean: null, wsp: 8, rrp: null, label: "Discovery Set" },
  ]},
];

export const SHIPPING_FLAT = 35;

// Flat SKU -> variant (+ product name) lookup, used server-side to price orders.
export const SKU_INDEX = (() => {
  const index = {};
  PRODUCTS.forEach((p) => {
    p.variants.forEach((v) => {
      index[v.sku] = { ...v, product: p.name };
    });
  });
  return index;
})();
