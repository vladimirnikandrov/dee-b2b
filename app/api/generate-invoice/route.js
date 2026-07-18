// DEE APRIL B2B — PDF Invoice Generator (HTTP endpoint)
// Only reachable by an authenticated buyer for their OWN order, or an admin
// for any order. Takes just {orderId, type} and re-fetches the order from
// the DB itself — never trusts a client-submitted order/buyer payload (the
// old version did, which meant anyone could generate a PDF with arbitrary
// invented buyer/amount data).
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { generateInvoicePDF } from "@/lib/invoice-pdf";
import { toFlatOrderData } from "@/lib/orders";

export async function POST(request) {
  try {
    const session = await requireAuth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { orderId, type = "deposit", format = "base64" } = await request.json();
    if (!orderId) return NextResponse.json({ error: "Missing orderId" }, { status: 400 });

    const [row] = await sql`select * from orders where id = ${orderId}`;
    if (!row) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (session.role !== "admin" && row.user_id !== session.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const order = toFlatOrderData(row);
    const pdfBuffer = await generateInvoicePDF(order, type);
    const uint8 = new Uint8Array(pdfBuffer);

    if (format === "download") {
      return new NextResponse(uint8, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${order.orderId}-${type}-invoice.pdf"`,
        },
      });
    }

    const base64 = Buffer.from(uint8).toString("base64");
    return NextResponse.json({ success: true, filename: `${order.orderId}-${type}-invoice.pdf`, base64 });
  } catch (err) {
    console.error("PDF generation error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
