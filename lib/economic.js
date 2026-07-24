// e-conomic invoice sync — server-side only. Stays a no-op until
// ECONOMIC_APP_SECRET_TOKEN / ECONOMIC_AGREEMENT_GRANT_TOKEN are set in
// Railway env vars (see app/api/economic/callback/route.js for how the
// grant token is obtained).
//
// Fires one invoice draft per real invoicing event — shipping (at order
// creation, since that's when the shipping-invoice PDF/email actually goes
// out and matches orders.status_deposit_invoiced defaulting to true) and the
// full order amount (when admin toggles balance_invoiced) — instead of a
// single draft for the full order value at creation time, which didn't
// match what buyers are actually invoiced for. No more 30/70 deposit split —
// see lib/pricing.js.
import { getVatInfo, EU_COUNTRIES, DK_VAT_RATE } from "@/lib/vat";

const ECONOMIC_API = "https://restapi.e-conomic.com";

// Every SKU in lib/products.js's live/orderable DEE 01-03 range maps
// 1:1 to an existing product in Dorte's e-conomic catalog (verified
// 2026-07-17 against agreement 1797386) — using these instead of a lump
// description line gives her real per-product sales reporting, matching
// how her ~15 existing wholesale customers are already invoiced. The
// Testers/Discovery Kit entries in lib/products.js aren't rendered/
// orderable anywhere in the live catalog UI, so they're deliberately not
// mapped here — there's no real order traffic that would need them.
const SKU_TO_ECONOMIC_PRODUCT = {
  DEP100200: "DEP100200", DEP100100: "DEP100100", DEP100300: "DEP100300", DEP100701: "DEP100701",
  DEP100201: "DEP100201", DEP100101: "DEP100101", DEP100301: "DEP100301", DEP100702: "DEP100702",
  DEP100202: "DEP100202", DEP100102: "DEP100102", DEP100302: "DEP100302", DEP100703: "DEP100703",
};
const SHIPPING_PRODUCT_NUMBER = "1001"; // "TRANSPORT" in her product catalog

function isDenmark(country) {
  const c = (country || "").trim();
  return /^denmark$/i.test(c) || /^dk$/i.test(c) || /^danmark$/i.test(c);
}

// customerGroup/vatZone/paymentTerms/layout — verified 2026-07 against
// Dorte's live e-conomic account, not guessed:
// - customerGroup 1 = "DANSKE KUNDER", 2 = "UDENLANDSKE KUNDER"
// - vatZone 1 = Domestic, 2 = EU, 3 = Abroad — matches this app's own
//   lib/vat.js classification (rate === DK_VAT_RATE implies the domestic
//   zone even for EU-without-VAT-ID orders, since that's the rate actually
//   charged)
// - paymentTerms 4 ("Net 14 days") and layout 22 ("DEE APRIL Sort layout
//   engelsk") are the pattern already used on ~15 of her existing EU
//   wholesale customers (e.g. Ingredients Store, Dover Street Parfums
//   Market, Perfume Lounge) — not the account's bare default.
function economicRefsFor(order) {
  const dk = isDenmark(order.buyerCountry);
  const vatInfo = getVatInfo(order.buyerCountry, order.buyerVat);
  const isEU = EU_COUNTRIES.some((eu) => eu.toLowerCase() === (order.buyerCountry || "").trim().toLowerCase());

  const customerGroupNumber = dk ? 1 : 2;
  const vatZoneNumber = vatInfo.rate === DK_VAT_RATE ? 1 : isEU ? 2 : 3;

  return { customerGroupNumber, vatZoneNumber, paymentTermsNumber: 4, layoutNumber: 22 };
}

async function getOrCreateCustomer(order, headers, refs) {
  const custSearchUrl = `${ECONOMIC_API}/customers?filter=name$eq:${encodeURIComponent(order.buyerCompany)}`;
  const custSearchRes = await fetch(custSearchUrl, { method: "GET", headers });
  const custSearchData = await custSearchRes.json();
  if (custSearchData.collection?.length > 0) return custSearchData.collection[0].customerNumber;

  const custRes = await fetch(`${ECONOMIC_API}/customers`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: order.buyerCompany,
      address: order.buyerAddress || "",
      city: order.buyerCity || "",
      zipCode: order.buyerZip || "",
      country: order.buyerCountry || "",
      email: order.buyerEmail || "",
      currency: "EUR",
      vatZone: { vatZoneNumber: refs.vatZoneNumber },
      customerGroup: { customerGroupNumber: refs.customerGroupNumber },
      paymentTerms: { paymentTermsNumber: refs.paymentTermsNumber },
      layout: { layoutNumber: refs.layoutNumber },
    }),
  });
  const custData = await custRes.json();
  if (!custRes.ok) throw new Error(`e-conomic customer create failed: ${JSON.stringify(custData)}`);
  return custData.customerNumber;
}

// e-conomic requires a `product` reference on any line that sets
// quantity/unitNetPrice ("When quantity is set product must also be set")
// — a bare description-only line with a manual amount isn't a valid
// combination per its schema, confirmed 2026-07-17 against the live API.
async function createInvoiceDraft(order, { customerId, refs, lines }) {
  const appSecret = process.env.ECONOMIC_APP_SECRET_TOKEN;
  const agreementGrant = process.env.ECONOMIC_AGREEMENT_GRANT_TOKEN;
  const headers = {
    "X-AppSecretToken": appSecret,
    "X-AgreementGrantToken": agreementGrant,
    "Content-Type": "application/json",
  };

  const invRes = await fetch(`${ECONOMIC_API}/invoices/drafts`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      customer: { customerNumber: customerId },
      date: new Date().toISOString().split("T")[0],
      currency: "EUR",
      paymentTerms: { paymentTermsNumber: refs.paymentTermsNumber },
      layout: { layoutNumber: refs.layoutNumber },
      recipient: {
        name: order.buyerCompany,
        address: order.buyerAddress || "",
        city: order.buyerCity || "",
        zip: order.buyerZip || "",
        country: order.buyerCountry || "",
        email: order.buyerEmail || "",
        vatZone: { vatZoneNumber: refs.vatZoneNumber },
      },
      lines,
    }),
  });
  if (!invRes.ok) throw new Error(`e-conomic invoice draft create failed: ${JSON.stringify(await invRes.json())}`);
}

export async function syncInvoiceToEconomic(order, invoiceType) {
  const appSecret = process.env.ECONOMIC_APP_SECRET_TOKEN;
  const agreementGrant = process.env.ECONOMIC_AGREEMENT_GRANT_TOKEN;
  if (!appSecret || !agreementGrant) return; // not configured yet

  const headers = {
    "X-AppSecretToken": appSecret,
    "X-AgreementGrantToken": agreementGrant,
    "Content-Type": "application/json",
  };

  try {
    const refs = economicRefsFor(order);
    const customerId = await getOrCreateCustomer(order, headers, refs);

    if (invoiceType === "deposit") {
      const amount = order.depositInvoiceTotal ?? order.depositAmount ?? 0;
      await createInvoiceDraft(order, {
        customerId,
        refs,
        lines: [{
          product: { productNumber: SHIPPING_PRODUCT_NUMBER },
          description: `Shipping — Order ${order.orderId}`,
          quantity: 1,
          unitNetPrice: amount,
        }],
      });
    } else if (invoiceType === "balance") {
      const lines = (order.lines || []).map((l) => {
        const productNumber = SKU_TO_ECONOMIC_PRODUCT[l.sku];
        if (!productNumber) throw new Error(`No e-conomic product mapping for SKU ${l.sku}`);
        return { product: { productNumber }, quantity: l.qty, unitNetPrice: l.unitPrice };
      });
      if (lines.length === 0) throw new Error("Order has no lines to invoice");
      await createInvoiceDraft(order, { customerId, refs, lines });
    }
  } catch (err) {
    console.error(`e-conomic ${invoiceType} sync failed for order`, order.orderId, err);
    // Don't block order flow / status updates on e-conomic errors.
  }
}
