// Maps raw Postgres `orders` rows (snake_case) into the shapes the rest of
// the app expects (camelCase) — used by the orders API routes, the PDF
// generator, and email templates, so there's exactly one place that knows
// the DB column names.

// Flat shape used by the PDF generator and email templates.
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
export function toEnrichedOrder(row, notes = []) {
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
