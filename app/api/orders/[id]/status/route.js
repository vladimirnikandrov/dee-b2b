import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { toFlatOrderData } from "@/lib/orders";
import { sendTransactionalEmail } from "@/lib/email";
import { generateInvoicePDF } from "@/lib/invoice-pdf";
import { syncInvoiceToEconomic } from "@/lib/economic";

const STATUS_KEYS = ["deposit_invoiced", "deposit_paid", "packed", "balance_invoiced", "balance_paid", "shipped", "received"];

export async function PATCH(request, { params }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const { key } = await request.json();
  if (!STATUS_KEYS.includes(key)) return NextResponse.json({ error: "Invalid status key" }, { status: 400 });

  const dbKey = `status_${key}`;
  const [existing] = await sql`select * from orders where id = ${id}`;
  if (!existing) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const newValue = !existing[dbKey];
  const [row] = await sql`update orders set ${sql({ [dbKey]: newValue })} where id = ${id} returning *`;

  // Send the matching buyer notification only when the status is toggled ON.
  if (newValue) {
    const flatOrder = toFlatOrderData(row);
    if (key === "deposit_invoiced" || key === "balance_invoiced") {
      const invoiceType = key === "deposit_invoiced" ? "deposit" : "balance";
      generateInvoicePDF(flatOrder, invoiceType)
        .then((buf) => {
          const pdfAttachment = { filename: `${row.id}-${invoiceType}-invoice.pdf`, base64: Buffer.from(buf).toString("base64") };
          return sendTransactionalEmail(key, { ...flatOrder, pdfAttachment });
        })
        .catch((e) => console.error(`${key} email failed:`, e));
      // Deposit already synced to e-conomic at order creation (see
      // app/api/orders/route.js) — only balance is a genuinely new
      // invoicing event triggered here.
      if (key === "balance_invoiced") {
        syncInvoiceToEconomic(flatOrder, "balance").catch((e) => console.error("e-conomic balance sync failed:", e));
      }
    } else {
      sendTransactionalEmail(key, flatOrder).catch((e) => console.error(`${key} email failed:`, e));
    }
  }

  return NextResponse.json({ success: true, statuses: STATUS_KEYS.reduce((acc, k) => ({ ...acc, [k]: row[`status_${k}`] }), {}) });
}
