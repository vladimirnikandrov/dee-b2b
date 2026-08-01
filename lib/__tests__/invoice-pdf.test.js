import { describe, it, expect } from "vitest";
import { jsPDF } from "jspdf";
import { drawInvoice } from "../invoice-pdf.js";

// A4 in mm. Anything drawn past this is off the paper — invisible on screen
// and gone on print, with nothing to signal it was ever there.
const PAGE_H = 297;

function orderWith(lineCount) {
  const lines = Array.from({ length: lineCount }, (_, i) => ({
    product: `Test Perfume ${i + 1}`,
    sku: `DA-TEST-${String(i + 1).padStart(3, "0")}`,
    size: "100 ML",
    qty: 2,
    unitPrice: 75,
    total: 150,
  }));
  const totalWSP = lines.reduce((a, l) => a + l.total, 0);
  return {
    orderId: "DA-2608-0001",
    date: "2026-08-01T10:00:00Z",
    buyerCompany: "Test Buyer ApS",
    buyerContact: "Test Person",
    buyerAddress: "Testvej 1",
    buyerCity: "Copenhagen",
    buyerCountry: "Denmark",
    buyerZip: "1000",
    buyerVat: "DK12345678",
    buyerEmail: "buyer@example.com",
    lines,
    totalWSP,
    vatRate: 0.25,
    vatLabel: "Danish VAT 25%",
    vatNote: "",
    vatAmount: Math.round(totalWSP * 25) / 100,
    shipping: 7.4,
    shippingVat: 1.85,
    totalWithVat: totalWSP * 1.25 + 9.25,
    depositAmount: 9.25,
    depositInvoiceTotal: 9.25,
    balanceAmount: totalWSP * 1.25,
  };
}

function render(order, type) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const endY = drawInvoice(doc, order, type, null);
  return { pages: doc.getNumberOfPages(), endY };
}

describe("invoice PDF layout", () => {
  it("fits a small order on one page", () => {
    const { pages, endY } = render(orderWith(3), "balance");
    expect(pages).toBe(1);
    expect(endY).toBeLessThan(PAGE_H);
  });

  it("keeps the shipping document to one page whatever the order size", () => {
    // It prints a single synthetic freight line, not the goods.
    const { pages } = render(orderWith(40), "deposit");
    expect(pages).toBe(1);
  });

  // The bug: at 19 items the payment note fell off the bottom, at 21 the IBAN
  // and BIC went with it. Nothing broke visibly — the buyer just got an
  // invoice they couldn't pay from.
  for (const n of [19, 21, 30, 60]) {
    it(`never runs off the page with ${n} line items`, () => {
      const { pages, endY } = render(orderWith(n), "balance");
      expect(pages).toBeGreaterThan(1);
      expect(endY).toBeLessThan(PAGE_H);
    });
  }

  it("does not push the vat note off the page when it wraps", () => {
    const order = orderWith(17);
    order.vatNote =
      "Reverse charge — VAT to be accounted for by the recipient under Article 196 of Council Directive 2006/112/EC. " +
      "The buyer is responsible for reporting the acquisition in their own member state.";
    const { endY } = render(order, "balance");
    expect(endY).toBeLessThan(PAGE_H);
  });
});
