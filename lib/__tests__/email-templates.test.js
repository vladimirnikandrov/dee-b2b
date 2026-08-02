import { describe, it, expect } from "vitest";
import { renderTransactionalEmail, EMAIL_TEMPLATE_NAMES } from "@/lib/email";

// A representative payload for every template — none of them are picky, they
// interpolate whatever they are given.
const DATA = {
  orderId: "DA-2608-1000", email: "buyer@example.com", code: "123456",
  buyerCompany: "Test ApS", buyerContact: "A B", buyerEmail: "buyer@example.com",
  lines: [{ product: "DEE 01", size: "100 ML", sku: "DEP100200", qty: 2, unitPrice: 75, total: 150 }],
  totalWSP: 150, vatAmount: 39.35, vatLabel: "Danish VAT 25%", vatNote: "Includes 25% Danish VAT",
  shipping: 7.4, shippingVat: 1.85, totalWithVat: 196.85, depositAmount: 9.25,
  depositInvoiceTotal: 9.25, balanceAmount: 187.5, date: "2026-08-02T10:00:00Z",
  buyerAddress: "Vej 1", buyerCity: "København", buyerCountry: "Denmark", buyerZip: "2200",
};

describe("email templates", () => {
  it("has templates to render", () => {
    expect(EMAIL_TEMPLATE_NAMES.length).toBeGreaterThan(5);
  });

  // The DEE wordmark used to be an <img> pointing at the portal. Two failure
  // modes, both seen in a real inbox: a client with remote images off drew an
  // empty broken-image box where the brand should be, and a client with them
  // on served whatever it had cached under that URL — which is how buyers were
  // still getting the pre-rebrand "DEE APRIL / PARFUMS" logo a week after the
  // rename. Email is rendered on someone else's machine; nothing in it should
  // need a network fetch to look right.
  for (const name of EMAIL_TEMPLATE_NAMES) {
    it(`${name} renders with no remote images`, () => {
      const email = renderTransactionalEmail(name, DATA);
      expect(email).toBeTruthy();
      expect(email.html).not.toMatch(/<img\b/i);
      expect(email.html).not.toMatch(/background-image\s*:/i);
      expect(email.subject).toBeTruthy();
      // and the brand is present as text, so it renders whatever the client allows
      expect(email.html).toContain(">DEE<");
    });
  }
});
