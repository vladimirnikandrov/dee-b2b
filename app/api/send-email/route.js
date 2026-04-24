// DEE APRIL B2B — Email Notification API Route
// Sends transactional emails via Resend
// Set RESEND_API_KEY in Vercel Environment Variables

import { NextResponse } from "next/server";

const RESEND_API = "https://api.resend.com/emails";
// Use custom domain when verified, otherwise Resend's test domain
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "Dee April Parfums <onboarding@resend.dev>";
const ADMIN_EMAIL = "order@deeapril.com";
const PORTAL_URL = "https://order.deeapril.com";

const LOGO_WHITE = "https://gsojazybzodouvdmqkvg.supabase.co/storage/v1/object/public/DA%20Assets/parfums-white%201.png";
const LOGO_BLACK = "https://gsojazybzodouvdmqkvg.supabase.co/storage/v1/object/public/DA%20Assets/parfums-black%201.png";

// ═══════════════════════════════════════════
// EMAIL TEMPLATES
// ═══════════════════════════════════════════

function formatEUR(n) {
  return new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(n);
}

function baseLayout(content, preheader = "") {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<meta http-equiv="X-UA-Compatible" content="IE=edge"/>
<title>Dee April Parfums</title>

</head>
<body style="margin:0;padding:0;background-color:#000000;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#ffffff;-webkit-font-smoothing:antialiased;">
${preheader ? `<span style="display:none;font-size:1px;color:#000000;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}</span>` : ""}
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#000000;">
<tr><td align="center" style="padding:48px 24px;">
<table role="presentation" cellpadding="0" cellspacing="0" width="560" style="max-width:560px;width:100%;">

<!-- Logo -->
<tr><td align="center" style="padding-bottom:40px;">
<img src="${LOGO_WHITE}" alt="Dee April Parfums" width="100" style="display:block;margin:0 auto;height:auto;"/>
</td></tr>

<!-- Content Card -->
<tr><td style="background:#111111;border-radius:16px;padding:48px 40px;border:1px solid #333;">
${content}
</td></tr>

<!-- Footer -->
<tr><td style="padding:32px 0;text-align:center;">
<p style="margin:0 0 8px;font-size:11px;color:#666;letter-spacing:0.06em;">DA DESIGN APS · CVR 45305481 · Piniehøj 17, 2960 Rungsted Kyst, Denmark</p>
<p style="margin:0;font-size:11px;color:#666;letter-spacing:0.06em;">order@deeapril.com · +45 25 68 88 99</p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

function ctaButton(text, url = PORTAL_URL) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:32px;">
<tr><td align="center">
<a href="${url}" target="_blank" style="display:inline-block;background:#fff;color:#000;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">${text}</a>
</td></tr>
</table>`;
}

function statusBadge(label, color = "#fff") {
  const textColor = (color === "#fff" || color === "#ffffff") ? "#000" : "#fff";
  return `<div style="text-align:center;"><span style="display:inline-block;background:${color};color:${textColor};padding:4px 12px;border-radius:6px;font-size:10px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;">${label}</span></div>`;
}

function orderSummaryBlock(order) {
  const lines = (order.lines || []).map(l =>
    `<tr>
      <td style="padding:8px 0;font-size:12px;color:#eee;border-bottom:1px solid #333;">${l.product} — ${l.size}</td>
      <td style="padding:8px 0;font-size:12px;color:#ccc;text-align:center;border-bottom:1px solid #333;">×${l.qty}</td>
      <td style="padding:8px 0;font-size:12px;color:#eee;text-align:right;border-bottom:1px solid #333;">${formatEUR(l.total || l.qty * l.unitPrice)}</td>
    </tr>`
  ).join("");

  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:24px 0;">
<tr>
  <td style="padding:8px 0;font-size:9px;color:#777;letter-spacing:0.1em;text-transform:uppercase;border-bottom:1px solid #2a2a2a;">Item</td>
  <td style="padding:8px 0;font-size:9px;color:#777;letter-spacing:0.1em;text-transform:uppercase;text-align:center;border-bottom:1px solid #2a2a2a;">Qty</td>
  <td style="padding:8px 0;font-size:9px;color:#777;letter-spacing:0.1em;text-transform:uppercase;text-align:right;border-bottom:1px solid #2a2a2a;">Amount</td>
</tr>
${lines}
<tr>
  <td colspan="2" style="padding:12px 0 4px;font-size:11px;color:#777;">Subtotal (WSP)</td>
  <td style="padding:12px 0 4px;font-size:12px;text-align:right;font-weight:600;color:#fff;">${formatEUR(order.totalWSP || 0)}</td>
</tr>
${order.vatAmount ? `<tr>
  <td colspan="2" style="padding:4px 0;font-size:11px;color:#777;">VAT ${order.vatLabel || ""}</td>
  <td style="padding:4px 0;font-size:12px;text-align:right;color:#fff;">${formatEUR(order.vatAmount)}</td>
</tr>` : ""}
${order.shipping ? `<tr>
  <td colspan="2" style="padding:4px 0;font-size:11px;color:#777;">Shipping</td>
  <td style="padding:4px 0;font-size:12px;text-align:right;color:#fff;">${formatEUR(order.shipping)}</td>
</tr>` : ""}
<tr>
  <td colspan="2" style="padding:12px 0 0;font-size:13px;font-weight:700;border-top:2px solid #fff;color:#fff;">Total</td>
  <td style="padding:12px 0 0;font-size:13px;font-weight:700;text-align:right;border-top:2px solid #fff;color:#fff;">${formatEUR(order.totalWithVat || 0)}</td>
</tr>
</table>`;
}

function divider() {
  return `<hr style="border:none;border-top:1px solid #333;margin:24px 0;"/>`;
}

// ═══════════════════════════════════════════
// NOTIFICATION TYPES
// ═══════════════════════════════════════════

const TEMPLATES = {

  // ── BUYER: Order Placed ──
  order_placed_buyer: (data) => ({
    to: data.buyerEmail,
    subject: `Order ${data.orderId} — Confirmed`,
    html: baseLayout(`
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:600;letter-spacing:0.04em;text-align:center;color:#fff;">Order Confirmed</h1>
      <p style="margin:0 0 24px;font-size:13px;color:#ccc;text-align:center;">Thank you for your order, ${data.buyerContact || data.buyerCompany}.</p>
      ${statusBadge("Confirmed")}
      ${divider()}
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr><td style="font-size:11px;color:#777;padding:4px 0;">Order</td><td style="font-size:12px;font-weight:600;text-align:right;padding:4px 0;color:#fff;">${data.orderId}</td></tr>
        <tr><td style="font-size:11px;color:#777;padding:4px 0;">Company</td><td style="font-size:12px;text-align:right;padding:4px 0;color:#fff;">${data.buyerCompany}</td></tr>
        <tr><td style="font-size:11px;color:#777;padding:4px 0;">Date</td><td style="font-size:12px;text-align:right;padding:4px 0;color:#fff;">${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</td></tr>
      </table>
      ${orderSummaryBlock(data)}
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#1a1a1a;border-radius:10px;padding:16px;margin-top:16px;">
        <tr><td style="padding:12px 16px;">
          <p style="margin:0 0 4px;font-size:10px;color:#777;letter-spacing:0.1em;text-transform:uppercase;">Next Step</p>
          <p style="margin:0;font-size:12px;color:#ccc;">Your 30% deposit invoice of <strong>${formatEUR(data.depositAmount || 0)}</strong> is attached to this email as a PDF. You can also view it anytime in your account.</p>
        </td></tr>
      </table>
      ${ctaButton("View Order", `${PORTAL_URL}?order=${data.orderId}`)}
    `, `Order ${data.orderId} confirmed — ${formatEUR(data.totalWithVat)} total`)
  }),

  // ── ADMIN: New Order ──
  order_placed_admin: (data) => ({
    to: ADMIN_EMAIL,
    subject: `New Order ${data.orderId} — ${data.buyerCompany}`,
    html: baseLayout(`
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:600;letter-spacing:0.04em;text-align:center;color:#fff;">New Order Received</h1>
      <p style="margin:0 0 24px;font-size:13px;color:#ccc;text-align:center;">A new wholesale order has been placed.</p>
      ${statusBadge("New Order", "#16a34a")}
      ${divider()}
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr><td style="font-size:11px;color:#777;padding:4px 0;">Order</td><td style="font-size:12px;font-weight:600;text-align:right;padding:4px 0;color:#fff;">${data.orderId}</td></tr>
        <tr><td style="font-size:11px;color:#777;padding:4px 0;">Company</td><td style="font-size:12px;text-align:right;padding:4px 0;color:#fff;">${data.buyerCompany}</td></tr>
        <tr><td style="font-size:11px;color:#777;padding:4px 0;">Contact</td><td style="font-size:12px;text-align:right;padding:4px 0;color:#fff;">${data.buyerContact || "—"}</td></tr>
        <tr><td style="font-size:11px;color:#777;padding:4px 0;">Email</td><td style="font-size:12px;text-align:right;padding:4px 0;color:#fff;">${data.buyerEmail}</td></tr>
        <tr><td style="font-size:11px;color:#777;padding:4px 0;">Country</td><td style="font-size:12px;text-align:right;padding:4px 0;color:#fff;">${data.buyerCountry || "—"}</td></tr>
        ${data.buyerVat ? `<tr><td style="font-size:11px;color:#777;padding:4px 0;">VAT</td><td style="font-size:12px;text-align:right;padding:4px 0;color:#fff;">${data.buyerVat}</td></tr>` : ""}
      </table>
      ${orderSummaryBlock(data)}
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#0a1a0a;border-radius:10px;margin-top:16px;">
        <tr><td style="padding:12px 16px;">
          <p style="margin:0;font-size:12px;color:#4ade80;">30% deposit: <strong>${formatEUR(data.depositAmount || 0)}</strong> · Balance: <strong>${formatEUR(data.balanceAmount || 0)}</strong></p>
        </td></tr>
      </table>
      ${ctaButton("Open Admin Panel")}
    `, `New order from ${data.buyerCompany} — ${formatEUR(data.totalWithVat)}`)
  }),

  // ── BUYER: Deposit Invoiced ──
  deposit_invoiced: (data) => ({
    to: data.buyerEmail,
    subject: `Order ${data.orderId} — Deposit Invoice`,
    html: baseLayout(`
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:600;letter-spacing:0.04em;text-align:center;color:#fff;">Deposit Invoice</h1>
      <p style="margin:0 0 24px;font-size:13px;color:#ccc;text-align:center;">Your 30% deposit invoice for order ${data.orderId} is ready.</p>
      ${statusBadge("30% Deposit Due", "#d97706")}
      ${divider()}
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr><td style="font-size:11px;color:#777;padding:4px 0;">Order</td><td style="font-size:12px;font-weight:600;text-align:right;padding:4px 0;color:#fff;">${data.orderId}</td></tr>
        <tr><td style="font-size:11px;color:#777;padding:4px 0;">Deposit Amount</td><td style="font-size:14px;font-weight:700;text-align:right;padding:4px 0;color:#fff;">${formatEUR(data.depositAmount || 0)}</td></tr>
      </table>
      ${divider()}
      <p style="font-size:12px;color:#ccc;margin:0;text-align:center;">Your deposit invoice is attached as a PDF. Please complete the payment to confirm your order — bank details are in the invoice.</p>
      ${ctaButton("View Invoice", `${PORTAL_URL}?order=${data.orderId}`)}
    `, `Deposit invoice for order ${data.orderId}`)
  }),

  // ── BUYER: Deposit Paid ──
  deposit_paid: (data) => ({
    to: data.buyerEmail,
    subject: `Order ${data.orderId} — Deposit Received`,
    html: baseLayout(`
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:600;letter-spacing:0.04em;text-align:center;color:#fff;">Deposit Received</h1>
      <p style="margin:0 0 24px;font-size:13px;color:#ccc;text-align:center;">We've received your 30% deposit for order ${data.orderId}.</p>
      ${statusBadge("Deposit Paid", "#16a34a")}
      ${divider()}
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr><td style="font-size:11px;color:#777;padding:4px 0;">Order</td><td style="font-size:12px;font-weight:600;text-align:right;padding:4px 0;color:#fff;">${data.orderId}</td></tr>
        <tr><td style="font-size:11px;color:#777;padding:4px 0;">Deposit Amount</td><td style="font-size:12px;text-align:right;padding:4px 0;color:#fff;">${formatEUR(data.depositAmount || 0)}</td></tr>
        <tr><td style="font-size:11px;color:#777;padding:4px 0;">Remaining Balance</td><td style="font-size:12px;text-align:right;padding:4px 0;color:#fff;">${formatEUR(data.balanceAmount || 0)}</td></tr>
      </table>
      ${divider()}
      <p style="font-size:12px;color:#ccc;margin:0;text-align:center;">Your order is now being prepared. We'll notify you when it's packed and ready.</p>
      ${ctaButton("Track Order", `${PORTAL_URL}?order=${data.orderId}`)}
    `, `Deposit received for order ${data.orderId}`)
  }),

  // ── BUYER: Packed ──
  packed: (data) => ({
    to: data.buyerEmail,
    subject: `Order ${data.orderId} — Packed & Ready`,
    html: baseLayout(`
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:600;letter-spacing:0.04em;text-align:center;color:#fff;">Order Packed</h1>
      <p style="margin:0 0 24px;font-size:13px;color:#ccc;text-align:center;">Your order ${data.orderId} has been packed and is ready for the next step.</p>
      ${statusBadge("Packed")}
      ${divider()}
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#1a1a1a;border-radius:10px;">
        <tr><td style="padding:12px 16px;">
          <p style="margin:0 0 4px;font-size:10px;color:#777;letter-spacing:0.1em;text-transform:uppercase;">Next Step</p>
          <p style="margin:0;font-size:12px;color:#ccc;">The remaining 70% balance invoice of <strong>${formatEUR(data.balanceAmount || 0)}</strong> will be sent shortly. Once paid, we'll ship your order.</p>
        </td></tr>
      </table>
      ${ctaButton("View Order", `${PORTAL_URL}?order=${data.orderId}`)}
    `, `Order ${data.orderId} is packed`)
  }),

  // ── BUYER: Balance Invoiced ──
  balance_invoiced: (data) => ({
    to: data.buyerEmail,
    subject: `Order ${data.orderId} — Balance Invoice`,
    html: baseLayout(`
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:600;letter-spacing:0.04em;text-align:center;color:#fff;">Balance Invoice</h1>
      <p style="margin:0 0 24px;font-size:13px;color:#ccc;text-align:center;">The remaining balance for order ${data.orderId} is now due.</p>
      ${statusBadge("70% Balance Due", "#d97706")}
      ${divider()}
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr><td style="font-size:11px;color:#777;padding:4px 0;">Order</td><td style="font-size:12px;font-weight:600;text-align:right;padding:4px 0;color:#fff;">${data.orderId}</td></tr>
        <tr><td style="font-size:11px;color:#777;padding:4px 0;">Balance Due</td><td style="font-size:14px;font-weight:700;text-align:right;padding:4px 0;color:#fff;">${formatEUR(data.balanceAmount || 0)}</td></tr>
      </table>
      ${divider()}
      <p style="font-size:12px;color:#ccc;margin:0;text-align:center;">Your 70% balance invoice is attached to this email as a PDF. Please complete the payment to proceed with shipping — bank details are in the invoice.</p>
      ${ctaButton("View Invoice", `${PORTAL_URL}?order=${data.orderId}`)}
    `, `Balance of ${formatEUR(data.balanceAmount || 0)} due for order ${data.orderId}`)
  }),

  // ── BUYER: Balance Paid ──
  balance_paid: (data) => ({
    to: data.buyerEmail,
    subject: `Order ${data.orderId} — Fully Paid`,
    html: baseLayout(`
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:600;letter-spacing:0.04em;text-align:center;color:#fff;">Payment Complete</h1>
      <p style="margin:0 0 24px;font-size:13px;color:#ccc;text-align:center;">Full payment received for order ${data.orderId}. Thank you!</p>
      ${statusBadge("Fully Paid", "#16a34a")}
      ${divider()}
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr><td style="font-size:11px;color:#777;padding:4px 0;">Order</td><td style="font-size:12px;font-weight:600;text-align:right;padding:4px 0;color:#fff;">${data.orderId}</td></tr>
        <tr><td style="font-size:11px;color:#777;padding:4px 0;">Total Paid</td><td style="font-size:12px;text-align:right;padding:4px 0;color:#fff;">${formatEUR(data.totalWithVat || 0)}</td></tr>
      </table>
      ${divider()}
      <p style="font-size:12px;color:#ccc;margin:0;text-align:center;">Your order will be shipped shortly. You'll receive a notification with tracking details.</p>
      ${ctaButton("Track Order", `${PORTAL_URL}?order=${data.orderId}`)}
    `, `Order ${data.orderId} fully paid`)
  }),

  // ── BUYER: Shipped ──
  shipped: (data) => ({
    to: data.buyerEmail,
    subject: `Order ${data.orderId} — Shipped`,
    html: baseLayout(`
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:600;letter-spacing:0.04em;text-align:center;color:#fff;">Order Shipped</h1>
      <p style="margin:0 0 24px;font-size:13px;color:#ccc;text-align:center;">Your order ${data.orderId} is on its way.</p>
      ${statusBadge("Shipped", "#2563eb")}
      ${divider()}
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr><td style="font-size:11px;color:#777;padding:4px 0;">Order</td><td style="font-size:12px;font-weight:600;text-align:right;padding:4px 0;color:#fff;">${data.orderId}</td></tr>
        <tr><td style="font-size:11px;color:#777;padding:4px 0;">Shipping To</td><td style="font-size:12px;text-align:right;padding:4px 0;color:#fff;">${data.buyerCity || ""}, ${data.buyerCountry || ""}</td></tr>
      </table>
      ${divider()}
      <p style="font-size:12px;color:#ccc;margin:0;text-align:center;">Please confirm receipt once your order arrives.</p>
      ${ctaButton("Confirm Receipt", `${PORTAL_URL}?order=${data.orderId}`)}
    `, `Order ${data.orderId} has been shipped`)
  }),

  // ── BUYER: Received ──
  received: (data) => ({
    to: data.buyerEmail,
    subject: `Order ${data.orderId} — Delivered`,
    html: baseLayout(`
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:600;letter-spacing:0.04em;text-align:center;color:#fff;">Order Delivered</h1>
      <p style="margin:0 0 24px;font-size:13px;color:#ccc;text-align:center;">Order ${data.orderId} has been marked as received.</p>
      ${statusBadge("Delivered", "#16a34a")}
      ${divider()}
      <p style="font-size:12px;color:#ccc;margin:0 0 16px;text-align:center;">Thank you for your order. We hope you enjoy the collection.</p>
      <p style="font-size:12px;color:#ccc;margin:0;text-align:center;">If you have any questions or need to reorder, visit your account.</p>
      ${ctaButton("Browse Collection")}
    `, `Order ${data.orderId} delivered`)
  }),

  // ── BUYER: Cancelled ──
  order_cancelled_buyer: (data) => ({
    to: data.buyerEmail,
    subject: `Order ${data.orderId} — Cancelled`,
    html: baseLayout(`
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:600;letter-spacing:0.04em;text-align:center;color:#fff;">Order Cancelled</h1>
      <p style="margin:0 0 24px;font-size:13px;color:#ccc;text-align:center;">Order ${data.orderId} has been cancelled.</p>
      ${statusBadge("Cancelled", "#dc2626")}
      ${divider()}
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr><td style="font-size:11px;color:#777;padding:4px 0;">Order</td><td style="font-size:12px;font-weight:600;text-align:right;padding:4px 0;color:#fff;">${data.orderId}</td></tr>
        <tr><td style="font-size:11px;color:#777;padding:4px 0;">Company</td><td style="font-size:12px;text-align:right;padding:4px 0;color:#fff;">${data.buyerCompany}</td></tr>
      </table>
      ${divider()}
      <p style="font-size:12px;color:#ccc;margin:0;text-align:center;">If this was a mistake or you'd like to place a new order, please visit your account or contact us at order@deeapril.com.</p>
      ${ctaButton("Place New Order")}
    `, `Order ${data.orderId} has been cancelled`)
  }),

  // ── ADMIN: Order Cancelled ──
  order_cancelled_admin: (data) => ({
    to: ADMIN_EMAIL,
    subject: `Order ${data.orderId} Cancelled — ${data.buyerCompany}`,
    html: baseLayout(`
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:600;letter-spacing:0.04em;text-align:center;color:#fff;">Order Cancelled</h1>
      <p style="margin:0 0 24px;font-size:13px;color:#ccc;text-align:center;">A buyer has cancelled their order.</p>
      ${statusBadge("Cancelled", "#dc2626")}
      ${divider()}
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr><td style="font-size:11px;color:#777;padding:4px 0;">Order</td><td style="font-size:12px;font-weight:600;text-align:right;padding:4px 0;color:#fff;">${data.orderId}</td></tr>
        <tr><td style="font-size:11px;color:#777;padding:4px 0;">Company</td><td style="font-size:12px;text-align:right;padding:4px 0;color:#fff;">${data.buyerCompany}</td></tr>
        <tr><td style="font-size:11px;color:#777;padding:4px 0;">Contact</td><td style="font-size:12px;text-align:right;padding:4px 0;color:#fff;">${data.buyerEmail}</td></tr>
        <tr><td style="font-size:11px;color:#777;padding:4px 0;">Total Was</td><td style="font-size:12px;text-align:right;padding:4px 0;color:#fff;">${formatEUR(data.totalWithVat || 0)}</td></tr>
      </table>
      ${ctaButton("Open Admin Panel")}
    `, `${data.buyerCompany} cancelled order ${data.orderId}`)
  }),
};

// ═══════════════════════════════════════════
// API HANDLER
// ═══════════════════════════════════════════

export async function POST(request) {
  try {
    // Basic origin check — only allow requests from our own domain
    const origin = request.headers.get("origin") || request.headers.get("referer") || "";
    const allowedOrigins = ["order.deeapril.com", "dee-april-b2b.vercel.app", "localhost"];
    if (!allowedOrigins.some(o => origin.includes(o))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
    }

    const body = await request.json();
    const { type, data } = body;

    if (!type || !data) {
      return NextResponse.json({ error: "Missing type or data" }, { status: 400 });
    }

    const templateFn = TEMPLATES[type];
    if (!templateFn) {
      return NextResponse.json({ error: `Unknown template: ${type}` }, { status: 400 });
    }

    const email = templateFn(data);

    // Build Resend payload
    const payload = {
      from: FROM_EMAIL,
      to: email.to,
      subject: email.subject,
      html: email.html,
    };

    // Attach PDF if provided (base64 content from /api/generate-invoice)
    if (data.pdfAttachment) {
      payload.attachments = [{
        filename: data.pdfAttachment.filename,
        content: data.pdfAttachment.base64,
      }];
    }

    const res = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await res.json();

    if (!res.ok) {
      console.error("Resend error:", result);
      return NextResponse.json({ error: result }, { status: res.status });
    }

    return NextResponse.json({ success: true, id: result.id });
  } catch (err) {
    console.error("Email API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
