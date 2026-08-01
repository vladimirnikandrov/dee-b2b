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

/* ═══════════════════════════════════════════
   CUSTOMER RESOLUTION
   Every order has to land on the right customer card in Dorte's ledger. This
   used to be a name search on every single order — `filter=name$eq:<whatever
   the buyer typed>` — so "Dee Store", "DEE STORE" and "Dee Store " were three
   separate customers, each with a slice of the same company's invoice history.

   Now the resolved customerNumber is stored on the buyer's profile
   (migration 007), so the lookup happens once per buyer account ever and every
   later order goes straight to the card regardless of how the name is typed.
   The one-time lookup itself prefers the VAT number, which is a real business
   identifier rather than free text.
   ═══════════════════════════════════════════ */

// Names are compared case- and punctuation-insensitively, because "Dee Store"
// and "DEE STORE ApS." are the same company to a human — the point here is only
// to catch a match that is obviously somebody else.
export function normaliseName(v) {
  return String(v || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

// e-conomic's filter syntax has its own escape scheme, documented at
// restdocs.e-conomic.com/#filtering — `$` introduces both operators and escape
// sequences, so an unescaped `$` or bracket in a company name doesn't just
// fail to match, it corrupts the expression into a different query.
export function escapeFilterValue(value) {
  return String(value).replace(/[$()*,[\]]/g, (c) => "$" + c);
}

async function searchCustomers(headers, field, value) {
  const url = `${ECONOMIC_API}/customers?filter=${field}$eq:${encodeURIComponent(escapeFilterValue(value))}`;
  const res = await economicFetch(url, { method: "GET", headers });
  // A failed search used to fall straight through to the create branch: no
  // `collection` on an error body means `?.length > 0` is falsy, so a 401 or a
  // transient 500 silently produced a SECOND customer card for a company that
  // already had one, in Dorte's live ledger. Refuse instead — the caller
  // records a sync failure and the admin can retry.
  if (!res.ok) {
    throw new Error(`e-conomic customer lookup by ${field} failed (${res.status}) — not creating a duplicate`);
  }
  const data = await res.json();
  return data.collection || [];
}

async function loadStoredCustomerNumber(userId) {
  if (!userId) return null;
  const [row] = await sql`select economic_customer_number from buyer_profiles where user_id = ${userId}`;
  return row?.economic_customer_number ?? null;
}

async function storeCustomerNumber(userId, customerNumber) {
  if (!userId || !customerNumber) return;
  try {
    await sql`update buyer_profiles set economic_customer_number = ${customerNumber} where user_id = ${userId}`;
  } catch (e) {
    // Non-fatal: the invoice still goes to the right card this time, we just
    // have to look it up again next time.
    console.error("e-conomic: failed to remember customer number for", userId, e);
  }
}

async function getOrCreateCustomer(order, headers, refs) {
  const remembered = await loadStoredCustomerNumber(order.userId);
  if (remembered) return remembered;

  // A VAT number identifies a company; a typed name identifies a spelling.
  // Try the former first, and only fall back to the name when there isn't one.
  const vat = (order.buyerVat || "").trim();
  let found = vat ? await searchCustomers(headers, "vatNumber", vat) : [];
  if (found.length === 0 && vat) found = await searchCustomers(headers, "corporateIdentificationNumber", vat);

  const company = (order.buyerCompany || "").trim();
  if (found.length === 0 && company) found = await searchCustomers(headers, "name", company);

  // Require the name to agree too, not just the identifier. `buyer_vat` is
  // free text a buyer types at checkout: entering a competitor's VAT number
  // would otherwise bind their portal account permanently to that competitor's
  // customer card in Dorte's real ledger, and every invoice from then on would
  // be filed against the wrong company. Matching on both means a wrong number
  // just falls through to creating a card, which is recoverable.
  const wanted = normaliseName(company);
  if (found.length > 0 && wanted && !found.some((c) => normaliseName(c.name) === wanted)) {
    console.warn(
      `e-conomic: identifier for "${company}" matched customer "${found[0].name}" — names disagree, not binding to it`
    );
    found = [];
  }

  if (found.length > 0) {
    const exact = found.find((c) => normaliseName(c.name) === wanted) || found[0];
    const customerNumber = exact.customerNumber;
    // Deliberately NOT updating the card's vatZone/country/address here. Dorte
    // maintains those by hand for her existing wholesale customers, and the
    // invoice's own VAT treatment comes from the draft's `recipient` block
    // regardless — so overwriting her records from checkout form data would
    // risk destroying real information to fix nothing.
    await storeCustomerNumber(order.userId, customerNumber);
    return customerNumber;
  }

  const custRes = await economicFetch(`${ECONOMIC_API}/customers`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: (order.buyerCompany || "").trim(),
      address: order.buyerAddress || "",
      city: order.buyerCity || "",
      zipCode: order.buyerZip || "",
      country: order.buyerCountry || "",
      email: order.buyerEmail || "",
      // Stored on the card so the next lookup can match on a real identifier
      // instead of the company name, and so Dorte can see it in e-conomic.
      ...(vat ? { vatNumber: vat } : {}),
      currency: "EUR",
      vatZone: { vatZoneNumber: refs.vatZoneNumber },
      customerGroup: { customerGroupNumber: refs.customerGroupNumber },
      paymentTerms: { paymentTermsNumber: refs.paymentTermsNumber },
      layout: { layoutNumber: refs.layoutNumber },
    }),
  });
  const custData = await custRes.json();
  if (!custRes.ok) throw new Error(`e-conomic customer create failed: ${JSON.stringify(custData)}`);
  await storeCustomerNumber(order.userId, custData.customerNumber);
  return custData.customerNumber;
}

// e-conomic requires a `product` reference on any line that sets
// quantity/unitNetPrice ("When quantity is set product must also be set")
// — a bare description-only line with a manual amount isn't a valid
// combination per its schema, confirmed 2026-07-17 against the live API.
//
// `references.other` carries our order id. Until 2026-07-26 a draft in Dorte's
// agreement had nothing on it identifying which order produced it — the
// balance draft's lines don't even have descriptions — so reconciling her books
// against this app meant matching on amounts and dates. Verified against the
// live schema (restapi.e-conomic.com/schema/invoices.drafts.post.schema.json):
// `references.other` is a free string, max 250 chars, and it's `filterable`,
// so a draft can also be found by order id through the API later. Chosen over
// putting the id in each line's `description` because that would change the
// text printed on the invoices she sends to customers; this doesn't.
const ORDER_REFERENCE_MAX = 250;

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
      references: { other: String(order.orderId || "").slice(0, ORDER_REFERENCE_MAX) },
      lines,
    }),
  });
  const body = await invRes.json().catch(() => null);
  if (!invRes.ok) throw new Error(`e-conomic invoice draft create failed: ${JSON.stringify(body)}`);
  // e-conomic returns the created draft; `draftInvoiceNumber` is its own id and
  // what Dorte sees in her books. Confirmed against the live schema
  // (restapi.e-conomic.com/schema/invoices.drafts.get.schema.json). Still read
  // defensively — a number we can't parse means "number unknown", never a
  // failed draft, because the document exists either way.
  const n = Number(body?.draftInvoiceNumber);
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
            // NET, not the gross the buyer pays. e-conomic applies the
            // customer's VAT zone to unitNetPrice itself, so sending the gross
            // made a 35.00 shipping charge land as 43.75 in Dorte's books
            // against a 35.00 invoice. Her accountant settled it on 2026-07-26:
            // quote gross, book net, and let e-conomic add the VAT back so the
            // draft comes out exactly on the quoted figure.
            //
            // Rows written before migration 008 hold the whole charge in
            // shipping_amount with no VAT split, so they are sent as-is — which
            // is exactly what the old code did, i.e. unchanged, not fixed. Only
            // relevant to pre-existing rows; production had none when this
            // shipped.
            unitNetPrice: order.shipping || 0,
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
