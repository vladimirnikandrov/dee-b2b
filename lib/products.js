// Product catalog — single source of truth, shared by the client UI and the
// server-side pricing logic (POST /api/orders re-derives prices from here
// rather than trusting client-submitted unit prices).

export const PRODUCTS = [
  { name: "Parfum", collection: "Chapter I", variants: [
    { size: "100 ML", sku: "DEP100200", ean: "0788364060525", wsp: 75, rrp: 200 },
    { size: "50 ML", sku: "DEP100100", ean: "0792649468432", wsp: 55, rrp: 145 },
    { size: "20 ML", sku: "DEP100300", ean: "0788364060594", wsp: 25, rrp: 65 },
    { size: "2 ML", sku: "DEP100701", ean: null, wsp: 2, rrp: null, label: "Tester" },
  ]},
  { name: "Parfum I", collection: "Chapter I", variants: [
    { size: "100 ML", sku: "DEP100201", ean: "0788364060532", wsp: 75, rrp: 200 },
    { size: "50 ML", sku: "DEP100101", ean: "0788364060501", wsp: 55, rrp: 145 },
    { size: "20 ML", sku: "DEP100301", ean: "0788364060563", wsp: 25, rrp: 65 },
    { size: "2 ML", sku: "DEP100702", ean: null, wsp: 2, rrp: null, label: "Tester" },
  ]},
  { name: "Parfum II", collection: "Chapter I", variants: [
    { size: "100 ML", sku: "DEP100202", ean: "0788364060549", wsp: 75, rrp: 200 },
    { size: "50 ML", sku: "DEP100102", ean: "0788364060518", wsp: 55, rrp: 145 },
    { size: "20 ML", sku: "DEP100302", ean: "0788364060570", wsp: 25, rrp: 65 },
    { size: "2 ML", sku: "DEP100703", ean: null, wsp: 2, rrp: null, label: "Tester" },
  ]},
  { name: "Tester / Parfum", collection: "Testers", variants: [
    { size: "100 ML", sku: "TEST100200", ean: null, wsp: 65, rrp: null, label: "Tester" },
    { size: "50 ML", sku: "TEST100100", ean: null, wsp: 45, rrp: null, label: "Tester" },
    { size: "20 ML", sku: "TEST100300", ean: null, wsp: 15, rrp: null, label: "Tester" },
  ]},
  { name: "Tester / Parfum I", collection: "Testers", variants: [
    { size: "100 ML", sku: "TEST100201", ean: null, wsp: 65, rrp: null, label: "Tester" },
    { size: "50 ML", sku: "TEST100101", ean: null, wsp: 45, rrp: null, label: "Tester" },
    { size: "20 ML", sku: "TEST100301", ean: null, wsp: 15, rrp: null, label: "Tester" },
  ]},
  { name: "Tester / Parfum II", collection: "Testers", variants: [
    { size: "100 ML", sku: "TEST100202", ean: null, wsp: 65, rrp: null, label: "Tester" },
    { size: "50 ML", sku: "TEST100102", ean: null, wsp: 45, rrp: null, label: "Tester" },
    { size: "20 ML", sku: "TEST100302", ean: null, wsp: 15, rrp: null, label: "Tester" },
  ]},
  { name: "Discovery Kit", collection: "Discovery", variants: [
    { size: "KIT", sku: "DEP100800", ean: null, wsp: 8, rrp: null, label: "Discovery Kit" },
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
