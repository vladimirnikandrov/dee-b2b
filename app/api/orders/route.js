import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { computeOrderPricing } from "@/lib/pricing";
import { toEnrichedOrder, toFlatOrderData } from "@/lib/orders";
import { sendTransactionalEmail } from "@/lib/email";
import { generateInvoicePDF } from "@/lib/invoice-pdf";
import { syncInvoiceToEconomic } from "@/lib/economic";
import { recordSyncFailure } from "@/lib/sync-failures";
import { normalizeCountry } from "@/lib/countries";

// Buyers see only their own orders; admins see everyone's — same rule the
// old client-side loadOrders()/allOrders filtering enforced, now actually
// impossible to bypass since there's no direct DB access from the browser.
export async function GET() {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows =
    session.role === "admin"
      ? await sql`select * from orders order by created_at desc`
      : await sql`select * from orders where user_id = ${session.id} order by created_at desc`;

  const isAdmin = session.role === "admin";
  const orderIds = rows.map((r) => r.id);
  const notes = isAdmin && orderIds.length
    ? await sql`select * from order_notes where order_id in ${sql(orderIds)} order by created_at asc`
    : [];
  // Notes are DEE's own annotations on an order — Dorte writes them in the
  // admin panel with no indication they travel anywhere. They were being
  // serialised into the buyer's response even though no buyer view renders
  // them, so anyone could read them out of their own Network tab.
  return NextResponse.json({
    orders: rows.map((r) => toEnrichedOrder(r, notes, { includeInternal: isAdmin })),
  });
}

export async function POST(request) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { items, buyer, promoCode, expectedTotal } = await request.json();
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }
    if (!buyer?.company || !buyer?.address || !buyer?.city || !buyer?.country || !buyer?.email) {
      return NextResponse.json({ error: "Missing required buyer details" }, { status: 400 });
    }

    // Pin the address to the signed-in account. It used to be taken from the
    // request body, so a buyer could put anyone's address on an order and have
    // the portal deliver a confirmation, an invoice PDF and every later status
    // email to them, from the verified sending domain — the same domain the
    // login codes depend on, so the deliverability damage would have locked
    // real buyers out. It also meant a typo silently diverted someone's own
    // invoices with nothing to notice.
    const buyerEmail = session.email;

    // The country string decides the VAT treatment of the whole order, so it
    // has to resolve to a real country before anything is priced. Before the
    // picker shipped (2026-07-26) this was free text: "Deutschland" matched no
    // branch in lib/vat.js and the order was invoiced as a 0% export. Refusing
    // here means the value stored on an order is always canonical, whatever
    // the client sent. (During the minutes a Railway deploy overlaps, the
    // previous release is still serving this route without the check — so
    // "nothing unresolvable can ever be written again" is true from the moment
    // the rollout completes, not from the moment it starts.)
    const country = normalizeCountry(buyer.country);
    if (!country) {
      return NextResponse.json({ error: "Please select your country from the list" }, { status: 400 });
    }

    // Save/refresh buyer profile (replaces the old client-side saveProfile() call).
    await sql`
      insert into buyer_profiles (user_id, company, contact, address, city, country, zip, vat, email, updated_at)
      values (${session.id}, ${buyer.company}, ${buyer.contact || null}, ${buyer.address}, ${buyer.city}, ${country}, ${buyer.zip || null}, ${buyer.vat || null}, ${buyerEmail}, now())
      on conflict (user_id) do update set
        company = excluded.company, contact = excluded.contact, address = excluded.address,
        city = excluded.city, country = excluded.country, zip = excluded.zip,
        vat = excluded.vat, email = excluded.email, updated_at = now()
    `;

    let promo = null;
    if (promoCode) {
      [promo] = await sql`select * from promo_codes where code = ${promoCode.toUpperCase()}`;
      // Refuse rather than silently pricing at full WSP: the buyer just
      // confirmed a discounted total in the checkout dialog, so quietly
      // dropping the promo would invoice them more than they agreed to.
      if (!promo) {
        return NextResponse.json({ error: "That promo code is no longer valid — remove it and try again" }, { status: 400 });
      }
    }

    const pricing = computeOrderPricing({ items, buyerCountry: country, buyerVat: buyer.vat, promo });
    if (pricing.lines.length === 0) {
      return NextResponse.json({ error: "No valid items in cart" }, { status: 400 });
    }

    // Refuse if the buyer confirmed a different total to the one we just
    // computed. Everything here is server-derived and would otherwise silently
    // win, so a promo edited mid-checkout, a catalogue price change, or a page
    // left open overnight would invoice an amount nobody agreed to. Compared
    // with a cent of tolerance because both sides round independently.
    if (expectedTotal !== undefined && expectedTotal !== null) {
      const diff = Math.abs(Number(expectedTotal) - pricing.totalWithVat);
      if (!Number.isFinite(diff) || diff > 0.01) {
        return NextResponse.json(
          {
            error: `Prices changed while you were checking out — this order now comes to €${pricing.totalWithVat.toFixed(2)}, not €${Number(expectedTotal).toFixed(2)}. Please review and try again.`,
            priceChanged: true,
            total: pricing.totalWithVat,
          },
          { status: 409 }
        );
      }
    }

    // Pre-check stock for a clear error message, then re-check atomically
    // inside the transaction below (belt-and-suspenders against a race
    // between this check and the actual decrement).
    //
    // A SKU with NO row in `inventory` counts as zero, not as unlimited. Both
    // checks here used to skip `stockBySku[sku] === undefined`, so a product
    // added to lib/products.js without its inventory row was orderable in any
    // quantity and decremented nothing — the catalogue showed it without a
    // stock badge and the order sailed through into e-conomic.
    const stockRows = await sql`select sku, stock from inventory where sku in ${sql(pricing.lines.map((l) => l.sku))}`;
    const stockBySku = Object.fromEntries(stockRows.map((r) => [r.sku, r.stock]));
    const stockFor = (sku) => (stockBySku[sku] === undefined || stockBySku[sku] === null ? 0 : stockBySku[sku]);
    const stockIssues = pricing.lines
      .filter((l) => l.qty > stockFor(l.sku))
      .map((l) => `${l.product} ${l.size}: requested ${l.qty}, available ${stockFor(l.sku)}`);
    if (stockIssues.length > 0) {
      return NextResponse.json({ error: "Insufficient stock: " + stockIssues[0] }, { status: 409 });
    }

    const order = await sql.begin(async (tx) => {
      const [row] = await tx`
        insert into orders (
          user_id, buyer_company, buyer_contact, buyer_address, buyer_city, buyer_country, buyer_zip, buyer_vat, buyer_email,
          lines, total_wsp, vat_rate, vat_label, vat_note, vat_amount, shipping_amount, shipping_vat_amount, total_with_vat, deposit_amount, balance_amount,
          promo_code, promo_label
        ) values (
          ${session.id}, ${buyer.company}, ${buyer.contact || null}, ${buyer.address}, ${buyer.city}, ${country}, ${buyer.zip || null}, ${buyer.vat || null}, ${buyerEmail},
          ${sql.json(pricing.lines)}, ${pricing.totalWSP}, ${pricing.vatInfo.rate}, ${pricing.vatInfo.label}, ${pricing.vatInfo.note}, ${pricing.vatAmount}, ${pricing.shippingAmount}, ${pricing.shippingVatAmount}, ${pricing.totalWithVat}, ${pricing.depositAmount}, ${pricing.balanceAmount},
          ${promo?.code || null}, ${promo?.label || null}
        )
        returning *
      `;

      for (const line of pricing.lines) {
        const [updated] = await tx`
          update inventory set stock = stock - ${line.qty}, updated_at = now()
          where sku = ${line.sku} and stock >= ${line.qty}
          returning stock
        `;
        // No row updated means either the row is missing entirely (not a
        // stocked product) or the atomic decrement lost a race with a
        // concurrent order. Both abort the order — see the note above.
        if (!updated) {
          throw new Error(`Insufficient stock for ${line.product} ${line.size} — try again`);
        }
      }

      return row;
    });

    // Fire-and-forget side effects — order is already committed, so a
    // failure here shouldn't fail the request, but it does get logged
    // (not silently swallowed).
    const flatOrder = toFlatOrderData(order);
    generateInvoicePDF(flatOrder, "deposit")
      .then((buf) => {
        const pdfAttachment = { filename: `${order.id}-deposit-invoice.pdf`, base64: Buffer.from(buf).toString("base64") };
        return sendTransactionalEmail("order_placed_buyer", { ...flatOrder, pdfAttachment });
      })
      // A PDF failure used to mean the buyer got no confirmation at all, with
      // nothing surfacing in the admin panel. Degrade to sending the email
      // without the attachment (the template already tells them they can view
      // it in their account) and record the failure either way.
      .catch(async (e) => {
        console.error("order_placed_buyer email failed:", e);
        recordSyncFailure({ type: "email", orderId: order.id, context: "order_placed_buyer_pdf", error: e.message || String(e) });
        try {
          await sendTransactionalEmail("order_placed_buyer", flatOrder);
        } catch (e2) {
          console.error("order_placed_buyer fallback (no PDF) also failed:", e2);
        }
      });
    sendTransactionalEmail("order_placed_admin", flatOrder).catch((e) => console.error("order_placed_admin email failed:", e));
    syncInvoiceToEconomic(flatOrder, "deposit").catch((e) => console.error("e-conomic deposit sync failed:", e));

    return NextResponse.json({ order: toEnrichedOrder(order, []) });
  } catch (err) {
    console.error("Order creation error:", err);
    return NextResponse.json({ error: err.message || "Failed to place order" }, { status: 500 });
  }
}
