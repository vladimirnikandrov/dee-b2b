// @ts-check
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
import { getVatInfo, DK_VAT_RATE, isDenmark, isEuCountry } from "@/lib/vat";
import { recordSyncFailure } from "@/lib/sync-failures";
import { sql } from "@/lib/db";

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

function headersFor(appSecret, agreementGrant) {
  return {
    "X-AppSecretToken": appSecret,
    "X-AgreementGrantToken": agreementGrant,
    "Content-Type": "application/json",
  };
}

// Every call to e-conomic goes through here so none of them can hang forever.
// These run inside a fire-and-forget path with no watchdog, and one of them
// holds the idempotency claim (see below) while it waits — an unbounded wait
// would leave an order permanently marked as "sync in progress" with no draft
// and nothing to notice it. 20s is generous for this API.
const REQUEST_TIMEOUT_MS = 20000;

async function economicFetch(url, init) {
  return fetch(url, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
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
//
// The zone is derived from the rate the order was ACTUALLY INVOICED AT
// (`orders.vat_rate`, frozen at creation), not from re-running getVatInfo()
// here. That distinction is load-bearing: this function runs whenever a draft
// is pushed, which can be long after the order was placed, so any improvement
// to country matching would otherwise silently re-book historical orders. A
// pre-2026-07-26 order storing "Deutschland" was invoiced at 0% (the old
// English-name-only EU check missed it) — recomputing today resolves it to
// Germany at 25% and would put a domestic-zone draft, 25% above the invoice
// the buyer is holding, into Dorte's live books. The frozen rate keeps the
// draft matching the document. getVatInfo is only the fallback for a row with
// no rate recorded.
export function economicRefsFor(order) {
  const dk = isDenmark(order.buyerCountry);
  const isEU = isEuCountry(order.buyerCountry);
  const frozenRate = Number(order.vatRate);
  const rate = Number.isFinite(frozenRate) ? frozenRate : getVatInfo(order.buyerCountry, order.buyerVat).rate;

  const customerGroupNumber = dk ? 1 : 2;
  const vatZoneNumber = rate === DK_VAT_RATE ? 1 : isEU ? 2 : 3;

  return { customerGroupNumber, vatZoneNumber, paymentTermsNumber: 4, layoutNumber: 22 };
}

async function getOrCreateCustomer(order, headers, refs) {
  const custSearchUrl = `${ECONOMIC_API}/customers?filter=name$eq:${encodeURIComponent(order.buyerCompany)}`;
  const custSearchRes = await economicFetch(custSearchUrl, { method: "GET", headers });
  // A failed search used to fall straight through to the create branch: no
  // `collection` on an error body means `?.length > 0` is falsy, so a 401 or a
  // transient 500 silently produced a SECOND customer card for a company that
  // already had one, in Dorte's live ledger. Refuse instead — the caller
  // records a sync failure and the admin can retry.
  if (!custSearchRes.ok) {
    throw new Error(`e-conomic customer lookup failed (${custSearchRes.status}) for "${order.buyerCompany}" — not creating a duplicate`);
  }
  const custSearchData = await custSearchRes.json();
  if (custSearchData.collection?.length > 0) return custSearchData.collection[0].customerNumber;

  const custRes = await economicFetch(`${ECONOMIC_API}/customers`, {
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
async function createInvoiceDraft(order, { customerId, refs, lines, headers }) {
  const invRes = await economicFetch(`${ECONOMIC_API}/invoices/drafts`, {
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
  const body = await invRes.json().catch(() => null);
  if (!invRes.ok) throw new Error(`e-conomic invoice draft create failed: ${JSON.stringify(body)}`);
  // e-conomic returns the created draft, and its own number is what Dorte sees
  // in her books — worth keeping so an order can be traced to a document.
  // Read defensively: the exact field name has NOT been confirmed against a
  // live response (doing so would post a real draft into her accounting), so
  // treat a miss as "number unknown", never as a failed draft. If the admin
  // panel shows "synced" with no number, this is the thing to check.
  const n = Number(body?.draftInvoiceNumber ?? body?.invoiceNumber);
  return Number.isFinite(n) ? n : null;
}

/* ═══════════════════════════════════════════
   IDEMPOTENCY
   Each order produces exactly two drafts in Dorte's live accounting: shipping
   at creation, and the full order value when an admin flips `balance_invoiced`
   on. But that status is a toggle and nothing recorded that the draft already
   existed, so switching it off and on again posted a second identical draft
   into her real books.

   Two timestamps per invoice (migration 006), because "we started" and "it
   worked" are different states:
     *_claimed_at — an attempt is in flight. This is the lock.
     *_synced_at  — the draft exists in e-conomic.
   Collapsing them into one column would mean a crash between claiming and
   creating marks the order done forever with no invoice in her books, and
   nothing able to tell that apart from success.

   Delivery is at-least-once, not exactly-once, and can't be better without
   e-conomic accepting an idempotency key: if a draft is committed but the
   reply is lost, we can't know. The design biases towards NOT duplicating —
   a claim is only handed back when the draft provably was never created —
   and everything else surfaces as a sync failure for a human to check.
   ═══════════════════════════════════════════ */

// How long an in-flight attempt may hold the lock before another attempt may
// take it over. Only reached if the process died mid-request (an ordinary
// failure releases the claim itself, and every HTTP call is capped at 20s).
const STALE_CLAIM_MINUTES = 15;

/**
 * Atomically claim the right to create this order's draft. Wins only if no
 * draft has been confirmed and no other attempt is live.
 * @returns {Promise<boolean>} false if the draft already exists, or another
 *   call has it in flight
 */
async function claimSync(orderId, invoiceType) {
  const cutoff = new Date(Date.now() - STALE_CLAIM_MINUTES * 60 * 1000);
  const rows =
    invoiceType === "deposit"
      ? await sql`update orders set economic_deposit_claimed_at = now()
                  where id = ${orderId} and economic_deposit_synced_at is null
                    and (economic_deposit_claimed_at is null or economic_deposit_claimed_at < ${cutoff})
                  returning id`
      : await sql`update orders set economic_balance_claimed_at = now()
                  where id = ${orderId} and economic_balance_synced_at is null
                    and (economic_balance_claimed_at is null or economic_balance_claimed_at < ${cutoff})
                  returning id`;
  return rows.length > 0;
}

// The draft exists. Record it, and the number if e-conomic gave us one.
async function confirmSync(orderId, invoiceType, draftNumber) {
  if (invoiceType === "deposit") {
    await sql`update orders set economic_deposit_synced_at = now(), economic_deposit_draft_number = ${draftNumber} where id = ${orderId}`;
  } else {
    await sql`update orders set economic_balance_synced_at = now(), economic_balance_draft_number = ${draftNumber} where id = ${orderId}`;
  }
}

// Hand the lock back so a retry can run. Called ONLY when the draft provably
// was never created — see the catch block for which failures qualify.
// Deliberately not called when a status is toggled back OFF: the draft still
// exists in e-conomic whatever our own flag says.
async function releaseSync(orderId, invoiceType) {
  try {
    if (invoiceType === "deposit") await sql`update orders set economic_deposit_claimed_at = null where id = ${orderId}`;
    else await sql`update orders set economic_balance_claimed_at = null where id = ${orderId}`;
  } catch (e) {
    console.error("e-conomic: failed to release sync claim for", orderId, e);
  }
}

export async function syncInvoiceToEconomic(order, invoiceType) {
  const appSecret = process.env.ECONOMIC_APP_SECRET_TOKEN;
  const agreementGrant = process.env.ECONOMIC_AGREEMENT_GRANT_TOKEN;
  if (!appSecret || !agreementGrant) return; // not configured yet — claim nothing

  if (invoiceType !== "deposit" && invoiceType !== "balance") {
    console.error("e-conomic: unknown invoice type", invoiceType);
    return;
  }

  let claimed = false;
  // Flips the moment the create request leaves — everything before it is
  // provably pre-commit, everything after it might have reached e-conomic.
  let postDispatched = false;

  try {
    claimed = await claimSync(order.orderId, invoiceType);
    if (!claimed) {
      // Not a failure: the expected outcome of re-toggling a status whose
      // invoice has already been booked.
      console.log(`e-conomic: ${invoiceType} draft for order ${order.orderId} already created or in flight — skipping`);
      return;
    }

    const refs = economicRefsFor(order);
    const headers = headersFor(appSecret, agreementGrant);
    const customerId = await getOrCreateCustomer(order, headers, refs);

    const lines =
      invoiceType === "deposit"
        ? [{
            product: { productNumber: SHIPPING_PRODUCT_NUMBER },
            description: `Shipping — Order ${order.orderId}`,
            quantity: 1,
            unitNetPrice: order.depositInvoiceTotal ?? order.depositAmount ?? 0,
          }]
        : (order.lines || []).map((l) => {
            const productNumber = SKU_TO_ECONOMIC_PRODUCT[l.sku];
            if (!productNumber) throw new Error(`No e-conomic product mapping for SKU ${l.sku}`);
            return { product: { productNumber }, quantity: l.qty, unitNetPrice: l.unitPrice };
          });
    if (lines.length === 0) throw new Error("Order has no lines to invoice");

    postDispatched = true;
    const draftNumber = await createInvoiceDraft(order, { customerId, refs, lines, headers });
    await confirmSync(order.orderId, invoiceType, draftNumber);
  } catch (err) {
    console.error(`e-conomic ${invoiceType} sync failed for order`, order.orderId, err);

    if (claimed && !postDispatched) {
      // Nothing was sent — a bad customer lookup, an unmapped SKU, empty
      // lines. Safe to hand the lock straight back so the admin can retry by
      // re-toggling the status.
      await releaseSync(order.orderId, invoiceType);
      recordSyncFailure({ type: "economic", orderId: order.orderId, context: invoiceType, error: err.message || String(err) });
    } else {
      // The create request was already on the wire. It may have been committed
      // before the connection dropped or our 20s timeout fired, so releasing
      // the lock here could book a genuine duplicate into her live accounting.
      // Keep it, and say plainly that a human has to look. The claim goes stale
      // after STALE_CLAIM_MINUTES, so a deliberate retry is still possible once
      // someone has checked.
      recordSyncFailure({
        type: "economic",
        orderId: order.orderId,
        context: invoiceType,
        error: `${err.message || String(err)} — the draft request had already been sent, so it MAY exist in e-conomic. Check the agreement before re-issuing; re-toggling the status will be ignored for ${STALE_CLAIM_MINUTES} minutes.`,
      });
    }
  }
}
