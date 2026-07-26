// @ts-check
// Maps raw Postgres `orders` rows (snake_case) into the shapes the rest of
// the app expects (camelCase) — used by the orders API routes, the PDF
// generator, and email templates, so there's exactly one place that knows
// the DB column names.

/** @typedef {Record<string, any>} OrderRow raw Postgres row — numeric columns arrive as strings */
/** @typedef {Record<string, any>} NoteRow */

// Flat shape used by the PDF generator and email templates.
/** @param {OrderRow} row */
export function toFlatOrderData(row) {
  return {
    orderId: row.id,
    date: row.created_at,
    buyerCompany: row.buyer_company,
    buyerContact: row.buyer_contact,
    buyerAddress: row.buyer_address,
    buyerCity: row.buyer_city,
    buyerCountry: row.buyer_country,
    buyerZip: row.buyer_zip,
    buyerVat: row.buyer_vat,
    buyerEmail: row.buyer_email,
    lines: row.lines,
    totalWSP: Number(row.total_wsp),
    vatAmount: Number(row.vat_amount),
    // The rate this order was ACTUALLY invoiced at, frozen at creation.
    // lib/economic.js needs it so a draft is booked against what the buyer
    // was charged rather than against a fresh getVatInfo() call, whose answer
    // can move under an old order when the country-matching rules improve.
    vatRate: Number(row.vat_rate),
    vatLabel: row.vat_label,
    vatNote: row.vat_note,
    shipping: Number(row.shipping_amount),
    totalWithVat: Number(row.total_with_vat),
    // deposit_amount now holds the shipping-only first invoice (no more
    // 30/70 split — see lib/pricing.js); it already equals shipping_amount,
    // so depositInvoiceTotal is just an alias, not deposit + shipping.
    depositAmount: Number(row.deposit_amount),
    depositInvoiceTotal: Number(row.deposit_amount),
    balanceAmount: Number(row.balance_amount),
  };
}

// Nested shape used by the orders list (client "My Orders" / admin panel) —
// mirrors what the old client-side loadOrders() built from Supabase rows.
/**
 * @param {OrderRow} row
 * @param {NoteRow[]} [notes]
 * @param {{ includeInternal?: boolean }} [opts] `includeInternal` attaches the
 *   e-conomic sync state — admin-only, since it exposes Dorte's own accounting
 *   document numbers and there's no reason a buyer should see them.
 */
export function toEnrichedOrder(row, notes = [], opts = {}) {
  return {
    id: row.id,
    date: row.created_at,
    buyer: {
      company: row.buyer_company,
      contact: row.buyer_contact,
      address: row.buyer_address,
      city: row.buyer_city,
      country: row.buyer_country,
      zip: row.buyer_zip,
      vat: row.buyer_vat,
      email: row.buyer_email,
    },
    lines: row.lines || [],
    totalWSP: Number(row.total_wsp),
    vatInfo: { rate: Number(row.vat_rate), label: row.vat_label, note: row.vat_note },
    vatAmount: Number(row.vat_amount),
    shipping: Number(row.shipping_amount || 0),
    totalWithVat: Number(row.total_with_vat),
    depositAmount: Number(row.deposit_amount),
    balanceAmount: Number(row.balance_amount),
    statuses: {
      deposit_invoiced: row.status_deposit_invoiced,
      deposit_paid: row.status_deposit_paid,
      packed: row.status_packed,
      balance_invoiced: row.status_balance_invoiced,
      balance_paid: row.status_balance_paid,
      shipped: row.status_shipped,
      received: row.status_received,
    },
    // Deliberately a sibling of `statuses`, not a member of it — `statuses` is
    // iterated against ORDER_STATUSES for the pill row, the admin status
    // filter, and the CSV export, all of which would pick up stray keys.
    ...(opts.includeInternal
      ? {
          economic: {
            depositClaimedAt: row.economic_deposit_claimed_at || null,
            depositSyncedAt: row.economic_deposit_synced_at || null,
            depositDraftNumber: row.economic_deposit_draft_number || null,
            balanceClaimedAt: row.economic_balance_claimed_at || null,
            balanceSyncedAt: row.economic_balance_synced_at || null,
            balanceDraftNumber: row.economic_balance_draft_number || null,
          },
        }
      : {}),
    userEmail: row.buyer_email,
    userId: row.user_id,
    cancelled: row.cancelled,
    promoCode: row.promo_code || null,
    promoLabel: row.promo_label || null,
    notes: notes
      .filter((n) => n.order_id === row.id)
      .map((n) => ({ text: n.text, author: n.author, date: n.created_at, isAdmin: n.is_admin })),
  };
}
