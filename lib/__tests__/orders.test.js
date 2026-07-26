import { describe, it, expect } from "vitest";
import { toFlatOrderData, toEnrichedOrder } from "@/lib/orders";

// A representative raw Postgres `orders` row — snake_case columns, numeric
// amounts as strings (as the `postgres` driver returns numeric columns).
const rawRow = {
  id: "DA-2607-1042",
  created_at: "2026-07-20T10:00:00.000Z",
  buyer_company: "Acme Perfumes ApS",
  buyer_contact: "Jane Buyer",
  buyer_address: "Some Street 1",
  buyer_city: "Copenhagen",
  buyer_country: "Denmark",
  buyer_zip: "1000",
  buyer_vat: "DK12345678",
  buyer_email: "jane@acme.example",
  lines: [{ product: "DEE 01", size: "100 ML", sku: "DEP100200", qty: 1, unitPrice: 75, total: 75 }],
  total_wsp: "75.00",
  vat_rate: "0.25",
  vat_amount: "18.75",
  vat_label: "Danish VAT 25%",
  vat_note: "Incl. 25% moms",
  shipping_amount: "28.00",
  shipping_vat_amount: "7.00",
  total_with_vat: "128.75",
  deposit_amount: "35.00",
  balance_amount: "93.75",
  status_deposit_invoiced: true,
  status_deposit_paid: false,
  status_packed: false,
  status_balance_invoiced: false,
  status_balance_paid: false,
  status_shipped: false,
  status_received: false,
  cancelled: false,
  promo_code: null,
  promo_label: null,
  user_id: "user-uuid-1",
};

describe("toFlatOrderData", () => {
  it("maps snake_case DB columns to the flat camelCase shape used by PDF/email", () => {
    const flat = toFlatOrderData(rawRow);
    expect(flat.orderId).toBe(rawRow.id);
    expect(flat.buyerCompany).toBe(rawRow.buyer_company);
    expect(flat.buyerVat).toBe(rawRow.buyer_vat);
    expect(flat.lines).toBe(rawRow.lines);
  });

  it("coerces numeric string columns to real numbers", () => {
    const flat = toFlatOrderData(rawRow);
    expect(flat.totalWSP).toBe(75);
    expect(flat.vatAmount).toBe(18.75);
    expect(flat.totalWithVat).toBe(128.75);
    expect(typeof flat.totalWSP).toBe("number");
  });

  it("maps the shipping net/VAT split so e-conomic gets the net and the buyer sees the gross", () => {
    const flat = toFlatOrderData(rawRow);
    expect(flat.shipping).toBe(28);        // net -> invoice line + e-conomic unitNetPrice
    expect(flat.shippingVat).toBe(7);      // the VAT inside the quoted charge
    expect(flat.shipping + flat.shippingVat).toBe(flat.depositAmount); // gross the buyer pays
  });

  it("defaults shippingVat to 0 for a row written before migration 008", () => {
    const legacy = { ...rawRow };
    delete legacy.shipping_vat_amount;
    expect(toFlatOrderData(legacy).shippingVat).toBe(0);
    expect(toEnrichedOrder(legacy).shippingVat).toBe(0);
  });

  it("keeps depositAmount and depositInvoiceTotal as aliases of the same shipping-only value (no 30/70 double count)", () => {
    const flat = toFlatOrderData(rawRow);
    expect(flat.depositAmount).toBe(35);
    expect(flat.depositInvoiceTotal).toBe(35);
    expect(flat.depositInvoiceTotal).toBe(flat.depositAmount);
  });
});

describe("toEnrichedOrder", () => {
  it("nests buyer fields under a `buyer` object", () => {
    const enriched = toEnrichedOrder(rawRow, []);
    expect(enriched.buyer.company).toBe(rawRow.buyer_company);
    expect(enriched.buyer.email).toBe(rawRow.buyer_email);
    expect(enriched.buyer.vat).toBe(rawRow.buyer_vat);
  });

  it("maps every status_* column into a flat `statuses` object with the DB-column suffix as key", () => {
    const enriched = toEnrichedOrder(rawRow, []);
    expect(enriched.statuses).toEqual({
      deposit_invoiced: true,
      deposit_paid: false,
      packed: false,
      balance_invoiced: false,
      balance_paid: false,
      shipped: false,
      received: false,
    });
  });

  it("filters notes down to only the ones belonging to this order", () => {
    const notes = [
      { order_id: rawRow.id, text: "Note for this order", author: "Admin", created_at: "2026-07-20", is_admin: true },
      { order_id: "some-other-order", text: "Not this one", author: "Admin", created_at: "2026-07-20", is_admin: true },
    ];
    const enriched = toEnrichedOrder(rawRow, notes);
    expect(enriched.notes).toHaveLength(1);
    expect(enriched.notes[0].text).toBe("Note for this order");
    expect(enriched.notes[0].isAdmin).toBe(true);
  });

  it("defaults promoCode/promoLabel to null rather than empty string when unset", () => {
    const enriched = toEnrichedOrder({ ...rawRow, promo_code: "", promo_label: "" }, []);
    expect(enriched.promoCode).toBeNull();
    expect(enriched.promoLabel).toBeNull();
  });
});
