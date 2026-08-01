// Transactional emails via Resend. Called directly (function import) from
// server-side order routes that already hold trusted, DB-derived order data —
// there is no public HTTP endpoint for triggering these anymore, which is
// what actually closes the "anyone can email arbitrary order data" hole
// (an auth check alone wouldn't have — the old /api/send-email route also
// trusted whatever `data` object the caller posted).
import { formatEUR } from "@/lib/format";
import { LOGO_WHITE } from "@/lib/assets";
import { recordSyncFailure } from "@/lib/sync-failures";

const RESEND_API = "https://api.resend.com/emails";
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "DEE <onboarding@resend.dev>";
const ADMIN_EMAIL = "order@maison-dee.com";
// SITE_URL lets CTA links/logo point at a Railway temp domain during testing
// before DNS cutover; defaults to production once it's live.
const PORTAL_URL = process.env.SITE_URL || "https://order.maison-dee.com";
const LOGO_WHITE_ABSOLUTE = `${PORTAL_URL}${LOGO_WHITE}`;

/* ═══════════════════════════════════════════
   DEV SEND GUARD — read this before touching it

   Between 3 and 26 July 2026, real retailers received real emails containing
   `http://localhost:3000` logos and dead "View Order" links. The cause was not
   a bad deploy and not a missing fallback: it was a developer machine running
   `npm run dev` with `SITE_URL=http://localhost:3000` **and the production
   Resend key**, against a local database seeded from the real Supabase export
   — so the seed rows carry real customer addresses, and a local test order
   emailed the actual client.

   No amount of care fixes that, because the failure mode is "someone runs the
   app locally", which is the normal thing to do. So the guard is here, at the
   one place every message passes through: if the environment is not
   recognisably production, nothing leaves the building unless an explicit
   allowlist says this exact recipient is safe.
   ═══════════════════════════════════════════ */

// Hosts that mean "this really is production". Keep deeapril.com until the
// domain is retired — it still serves the portal.
const PRODUCTION_PORTAL_HOSTS = new Set(["order.maison-dee.com", "order.deeapril.com"]);

function portalHost() {
  try {
    return new URL(PORTAL_URL).host.toLowerCase();
  } catch {
    return "";
  }
}

const IS_PRODUCTION_PORTAL = PRODUCTION_PORTAL_HOSTS.has(portalHost());

// Comma-separated addresses allowed to receive mail from a non-production
// environment, e.g. DEV_EMAIL_ALLOWLIST="me@example.com".
const DEV_ALLOWLIST = new Set(
  (process.env.DEV_EMAIL_ALLOWLIST || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
);

// Anything that must never appear in a URL we emit. The `http://` check is
// deliberate: every real portal URL is https, so a plain http:// link is itself
// evidence the base URL came from somewhere wrong.
const FORBIDDEN_IN_URL = /localhost|127\.0\.0\.1|\.railway\.app|\.vercel\.app|^http:\/\//i;

// Only the URLs WE generate are checked, never the message text. Buyer company
// and contact names are free text (a retailer legitimately called
// "Anna (http://annashop.dk)" is not a deployment problem), and escapeHtml
// leaves `:` and `/` alone, so scanning the whole rendered body would have let
// one buyer's punctuation silently suppress their own order confirmation, the
// admin's copy, and the invoice PDF — with nothing written to sync_failures to
// show for it. Buyer text cannot reach an attribute value: every template
// interpolates it as escaped element text.
function offendingUrl(html) {
  for (const m of html.matchAll(/(?:href|src)\s*=\s*"([^"]*)"/gi)) {
    if (FORBIDDEN_IN_URL.test(m[1])) return m[1];
  }
  return null;
}

/**
 * Decide whether this message may actually be dispatched.
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
function checkSendable(to, html) {
  const recipient = String(to || "").toLowerCase();

  // Outside production, the only question is WHO. A developer testing against
  // localhost obviously renders localhost URLs — that is the point — so the
  // content check would make local email testing impossible for no safety gain.
  // What must never happen is that message reaching anyone but the developer.
  if (!IS_PRODUCTION_PORTAL) {
    if (DEV_ALLOWLIST.has(recipient)) return { ok: true };
    return {
      ok: false,
      reason:
        `refusing to send from a non-production environment (SITE_URL=${PORTAL_URL}) to ${to}. ` +
        `Add the address to DEV_EMAIL_ALLOWLIST if this send is intentional.`,
    };
  }

  // In production the question is WHAT. Everyone is a legitimate recipient, but
  // no link or image we emit may point at localhost or a preview host — that
  // would mean the deployed SITE_URL is wrong, or a stray absolute URL crept
  // into a template.
  const bad = offendingUrl(html);
  if (bad) {
    return { ok: false, reason: `a link in the message points at a non-production URL (${bad}) — not sending to ${to}` };
  }

  return { ok: true };
}

// User-controlled fields (buyer company/contact/etc, set at registration or
// checkout) get interpolated into HTML emails — escape them so a buyer can't
// inject markup/links into a message sent from the verified domain.
function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ═══════════════════════════════════════════
// EMAIL TEMPLATES
// ═══════════════════════════════════════════

function baseLayout(content, preheader = "") {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<meta http-equiv="X-UA-Compatible" content="IE=edge"/>
<meta name="format-detection" content="telephone=no, date=no, address=no, email=no"/>
<title>DEE</title>

</head>
<body style="margin:0;padding:0;background-color:#000000;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#ffffff;-webkit-font-smoothing:antialiased;">
${preheader ? `<span style="display:none;font-size:1px;color:#000000;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(preheader)}</span>` : ""}
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#000000;">
<tr><td align="center" style="padding:48px 24px;">
<table role="presentation" cellpadding="0" cellspacing="0" width="560" style="max-width:560px;width:100%;">

<!-- Logo -->
<tr><td align="center" style="padding-bottom:40px;">
<img src="${LOGO_WHITE_ABSOLUTE}" alt="DEE" width="50" style="display:block;margin:0 auto;height:auto;width:50px;max-width:50px;"/>
</td></tr>

<!-- Content Card -->
<tr><td style="background:#111111;border-radius:16px;padding:48px 40px;border:1px solid #333;">
${content}
</td></tr>

<!-- Footer -->
<tr><td style="padding:32px 0;text-align:center;">
<p style="margin:0 0 8px;font-size:11px;color:#666;letter-spacing:0.06em;">DA DESIGN APS · CVR 45305481 · Piniehøj 17, 2960 Rungsted Kyst, Denmark</p>
<p style="margin:0;font-size:11px;color:#666;letter-spacing:0.06em;">order@maison-dee.com · +45 25 68 88 99</p>
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
      <td style="padding:8px 0;font-size:12px;color:#eee;border-bottom:1px solid #333;">${escapeHtml(l.product)} — ${escapeHtml(l.size)}</td>
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
${order.shipping ? `<tr>
  <td colspan="2" style="padding:4px 0;font-size:11px;color:#777;">Shipping (excl. VAT)</td>
  <td style="padding:4px 0;font-size:12px;text-align:right;color:#fff;">${formatEUR(order.shipping)}</td>
</tr>` : ""}
${order.vatAmount ? `<tr>
  <td colspan="2" style="padding:4px 0;font-size:11px;color:#777;">VAT ${escapeHtml(order.vatLabel || "")}</td>
  <td style="padding:4px 0;font-size:12px;text-align:right;color:#fff;">${formatEUR(order.vatAmount)}</td>
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
      <p style="margin:0 0 24px;font-size:13px;color:#ccc;text-align:center;">Thank you for your order, ${escapeHtml(data.buyerContact || data.buyerCompany)}.</p>
      ${statusBadge("Confirmed")}
      ${divider()}
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr><td style="font-size:11px;color:#777;padding:4px 0;">Order</td><td style="font-size:12px;font-weight:600;text-align:right;padding:4px 0;color:#fff;">${data.orderId}</td></tr>
        <tr><td style="font-size:11px;color:#777;padding:4px 0;">Company</td><td style="font-size:12px;text-align:right;padding:4px 0;color:#fff;">${escapeHtml(data.buyerCompany)}</td></tr>
        <tr><td style="font-size:11px;color:#777;padding:4px 0;">Date</td><td style="font-size:12px;text-align:right;padding:4px 0;color:#fff;">${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</td></tr>
      </table>
      ${orderSummaryBlock(data)}
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" bgcolor="#1a1a1a" style="background:#1a1a1a;border-radius:10px;margin-top:16px;">
        <tr><td bgcolor="#1a1a1a" style="background:#1a1a1a;border-radius:10px;padding:12px 16px;">
          <p style="margin:0 0 4px;font-size:10px;color:#777;letter-spacing:0.1em;text-transform:uppercase;">Next Step</p>
          <p style="margin:0;font-size:12px;color:#ccc;">Your shipping invoice of <strong>${formatEUR(data.depositAmount || 0)}</strong> is attached to this email as a PDF. You can also view it anytime in your account.</p>
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
        <tr><td style="font-size:11px;color:#777;padding:4px 0;">Company</td><td style="font-size:12px;text-align:right;padding:4px 0;color:#fff;">${escapeHtml(data.buyerCompany)}</td></tr>
        <tr><td style="font-size:11px;color:#777;padding:4px 0;">Contact</td><td style="font-size:12px;text-align:right;padding:4px 0;color:#fff;">${escapeHtml(data.buyerContact) || "—"}</td></tr>
        <tr><td style="font-size:11px;color:#777;padding:4px 0;">Email</td><td style="font-size:12px;text-align:right;padding:4px 0;color:#fff;">${escapeHtml(data.buyerEmail)}</td></tr>
        <tr><td style="font-size:11px;color:#777;padding:4px 0;">Country</td><td style="font-size:12px;text-align:right;padding:4px 0;color:#fff;">${escapeHtml(data.buyerCountry) || "—"}</td></tr>
        ${data.buyerVat ? `<tr><td style="font-size:11px;color:#777;padding:4px 0;">VAT</td><td style="font-size:12px;text-align:right;padding:4px 0;color:#fff;">${escapeHtml(data.buyerVat)}</td></tr>` : ""}
      </table>
      ${orderSummaryBlock(data)}
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#0a1a0a;border-radius:10px;margin-top:16px;">
        <tr><td style="padding:12px 16px;">
          <p style="margin:0;font-size:12px;color:#4ade80;">Shipping invoice: <strong>${formatEUR(data.depositAmount || 0)}</strong> · Full order: <strong>${formatEUR(data.balanceAmount || 0)}</strong></p>
        </td></tr>
      </table>
      ${ctaButton("Open Admin Panel")}
    `, `New order from ${data.buyerCompany} — ${formatEUR(data.totalWithVat)}`)
  }),

  // ── BUYER: Shipping Invoiced ──
  deposit_invoiced: (data) => ({
    to: data.buyerEmail,
    subject: `Order ${data.orderId} — Shipping Invoice`,
    html: baseLayout(`
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:600;letter-spacing:0.04em;text-align:center;color:#fff;">Shipping Invoice</h1>
      <p style="margin:0 0 24px;font-size:13px;color:#ccc;text-align:center;">Your shipping invoice for order ${data.orderId} is ready.</p>
      ${statusBadge("Shipping Fee Due", "#d97706")}
      ${divider()}
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr><td style="font-size:11px;color:#777;padding:4px 0;">Order</td><td style="font-size:12px;font-weight:600;text-align:right;padding:4px 0;color:#fff;">${data.orderId}</td></tr>
        <tr><td style="font-size:11px;color:#777;padding:4px 0;">Shipping Fee</td><td style="font-size:14px;font-weight:700;text-align:right;padding:4px 0;color:#fff;">${formatEUR(data.depositAmount || 0)}</td></tr>
      </table>
      ${divider()}
      <p style="font-size:12px;color:#ccc;margin:0;text-align:center;">Your shipping invoice is attached as a PDF. Please complete the payment to confirm your order — bank details are in the invoice.</p>
      ${ctaButton("View Invoice", `${PORTAL_URL}?order=${data.orderId}`)}
    `, `Shipping invoice for order ${data.orderId}`)
  }),

  // ── BUYER: Shipping Fee Paid ──
  deposit_paid: (data) => ({
    to: data.buyerEmail,
    subject: `Order ${data.orderId} — Shipping Fee Received`,
    html: baseLayout(`
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:600;letter-spacing:0.04em;text-align:center;color:#fff;">Shipping Fee Received</h1>
      <p style="margin:0 0 24px;font-size:13px;color:#ccc;text-align:center;">We've received your shipping fee for order ${data.orderId}.</p>
      ${statusBadge("Shipping Paid", "#16a34a")}
      ${divider()}
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr><td style="font-size:11px;color:#777;padding:4px 0;">Order</td><td style="font-size:12px;font-weight:600;text-align:right;padding:4px 0;color:#fff;">${data.orderId}</td></tr>
        <tr><td style="font-size:11px;color:#777;padding:4px 0;">Shipping Fee</td><td style="font-size:12px;text-align:right;padding:4px 0;color:#fff;">${formatEUR(data.depositAmount || 0)}</td></tr>
        <tr><td style="font-size:11px;color:#777;padding:4px 0;">Full Order Amount</td><td style="font-size:12px;text-align:right;padding:4px 0;color:#fff;">${formatEUR(data.balanceAmount || 0)}</td></tr>
      </table>
      ${divider()}
      <p style="font-size:12px;color:#ccc;margin:0;text-align:center;">Your order is now being prepared. We'll notify you when it's packed and ready.</p>
      ${ctaButton("Track Order", `${PORTAL_URL}?order=${data.orderId}`)}
    `, `Shipping fee received for order ${data.orderId}`)
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
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" bgcolor="#1a1a1a" style="background:#1a1a1a;border-radius:10px;">
        <tr><td bgcolor="#1a1a1a" style="background:#1a1a1a;border-radius:10px;padding:12px 16px;">
          <p style="margin:0 0 4px;font-size:10px;color:#777;letter-spacing:0.1em;text-transform:uppercase;">Next Step</p>
          <p style="margin:0;font-size:12px;color:#ccc;">The full order invoice of <strong>${formatEUR(data.balanceAmount || 0)}</strong> will be sent shortly. Once paid, we'll ship your order.</p>
        </td></tr>
      </table>
      ${ctaButton("View Order", `${PORTAL_URL}?order=${data.orderId}`)}
    `, `Order ${data.orderId} is packed`)
  }),

  // ── BUYER: Order Invoiced (full amount) ──
  balance_invoiced: (data) => ({
    to: data.buyerEmail,
    subject: `Order ${data.orderId} — Order Invoice`,
    html: baseLayout(`
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:600;letter-spacing:0.04em;text-align:center;color:#fff;">Order Invoice</h1>
      <p style="margin:0 0 24px;font-size:13px;color:#ccc;text-align:center;">The full invoice for order ${data.orderId} is now due.</p>
      ${statusBadge("Full Payment Due", "#d97706")}
      ${divider()}
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr><td style="font-size:11px;color:#777;padding:4px 0;">Order</td><td style="font-size:12px;font-weight:600;text-align:right;padding:4px 0;color:#fff;">${data.orderId}</td></tr>
        <tr><td style="font-size:11px;color:#777;padding:4px 0;">Amount Due</td><td style="font-size:14px;font-weight:700;text-align:right;padding:4px 0;color:#fff;">${formatEUR(data.balanceAmount || 0)}</td></tr>
      </table>
      ${divider()}
      <p style="font-size:12px;color:#ccc;margin:0;text-align:center;">Your order invoice is attached to this email as a PDF. Please complete the payment to proceed with shipping — bank details are in the invoice.</p>
      ${ctaButton("View Invoice", `${PORTAL_URL}?order=${data.orderId}`)}
    `, `${formatEUR(data.balanceAmount || 0)} due for order ${data.orderId}`)
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
        <tr><td style="font-size:11px;color:#777;padding:4px 0;">Shipping To</td><td style="font-size:12px;text-align:right;padding:4px 0;color:#fff;">${escapeHtml(data.buyerCity) || ""}, ${escapeHtml(data.buyerCountry) || ""}</td></tr>
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
        <tr><td style="font-size:11px;color:#777;padding:4px 0;">Company</td><td style="font-size:12px;text-align:right;padding:4px 0;color:#fff;">${escapeHtml(data.buyerCompany)}</td></tr>
      </table>
      ${divider()}
      <p style="font-size:12px;color:#ccc;margin:0;text-align:center;">If this was a mistake or you'd like to place a new order, please visit your account or contact us at order@maison-dee.com.</p>
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
        <tr><td style="font-size:11px;color:#777;padding:4px 0;">Company</td><td style="font-size:12px;text-align:right;padding:4px 0;color:#fff;">${escapeHtml(data.buyerCompany)}</td></tr>
        <tr><td style="font-size:11px;color:#777;padding:4px 0;">Contact</td><td style="font-size:12px;text-align:right;padding:4px 0;color:#fff;">${escapeHtml(data.buyerEmail)}</td></tr>
        <tr><td style="font-size:11px;color:#777;padding:4px 0;">Total Was</td><td style="font-size:12px;text-align:right;padding:4px 0;color:#fff;">${formatEUR(data.totalWithVat || 0)}</td></tr>
      </table>
      ${ctaButton("Open Admin Panel")}
    `, `${data.buyerCompany} cancelled order ${data.orderId}`)
  }),

  // ── BUYER/ADMIN: One-time login code ──
  otp_login: (data) => ({
    to: data.email,
    subject: `${data.code} is your DEE login code`,
    html: baseLayout(`
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:600;letter-spacing:0.04em;text-align:center;color:#fff;">Your Login Code</h1>
      <p style="margin:0 0 24px;font-size:13px;color:#ccc;text-align:center;">Enter this code to sign in. It expires in ${data.ttlMinutes} minutes.</p>
      <div style="text-align:center;margin:32px 0;">
        <span style="display:inline-block;background:#1a1a1a;border:1px solid #333;border-radius:12px;padding:18px 32px;font-size:32px;font-weight:700;letter-spacing:0.3em;color:#fff;">${escapeHtml(data.code)}</span>
      </div>
      <p style="font-size:11px;color:#666;margin:0;text-align:center;">Didn't request this? You can safely ignore this email.</p>
    `, `Your login code: ${data.code}`)
  }),

  // ── NEW BUYER: Welcome (invited from the admin panel) ──
  buyer_welcome: (data) => ({
    to: data.email,
    subject: "Welcome to DEE, your wholesale account is ready",
    html: baseLayout(`
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:600;letter-spacing:0.04em;text-align:center;color:#fff;">Welcome to DEE</h1>
      <p style="margin:0 0 24px;font-size:13px;color:#ccc;text-align:center;line-height:1.7;">Working with partners like you is the only way our customers ever get to discover and buy DEE. We don't run our own store, so every single partnership genuinely matters to us, and we've built this platform to make ordering with us as simple and pleasant as possible.</p>
      ${divider()}
      <p style="font-size:13px;color:#ccc;margin:0 0 20px;text-align:center;">You've been added as a wholesale partner on our ordering portal. Here's everything you need to get started.</p>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" bgcolor="#1a1a1a" style="background:#1a1a1a;border-radius:10px;margin-bottom:12px;">
        <tr><td bgcolor="#1a1a1a" style="background:#1a1a1a;border-radius:10px;padding:14px 16px;">
          <p style="margin:0 0 4px;font-size:10px;color:#777;letter-spacing:0.1em;text-transform:uppercase;">How to log in</p>
          <p style="margin:0;font-size:12px;color:#ccc;">No passwords needed. Just enter your email (${escapeHtml(data.email)}) and we'll send you a one time code to sign in, every time you come back.</p>
        </td></tr>
      </table>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" bgcolor="#1a1a1a" style="background:#1a1a1a;border-radius:10px;">
        <tr><td bgcolor="#1a1a1a" style="background:#1a1a1a;border-radius:10px;padding:14px 16px;">
          <p style="margin:0 0 4px;font-size:10px;color:#777;letter-spacing:0.1em;text-transform:uppercase;">How it works</p>
          <p style="margin:0;font-size:12px;color:#ccc;">Browse our range at wholesale prices, add what you need to your cart, and place your order. You'll receive a shipping invoice first. Once that's settled, we pack your order and send the full invoice before dispatch. Every step along the way (packed, invoiced, shipped) comes with an email update, and you can check your order status in the portal any time.</p>
        </td></tr>
      </table>
      ${ctaButton("Sign In")}
      <p style="font-size:12px;color:#ccc;margin:24px 0 0;text-align:center;">Questions any time. Just reply to this email.</p>
      <p style="font-size:12px;color:#ccc;margin:16px 0 0;text-align:center;">Warmly,<br/>The DEE Team</p>
    `, `Your DEE wholesale account is ready`)
  }),

  // ── NEW ADMIN: Welcome ──
  admin_welcome: (data) => ({
    to: data.email,
    subject: "You've been added as an admin — DEE",
    html: baseLayout(`
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:600;letter-spacing:0.04em;text-align:center;color:#fff;">Welcome, Admin</h1>
      <p style="margin:0 0 24px;font-size:13px;color:#ccc;text-align:center;">You've been given admin access to the DEE B2B portal.</p>
      ${divider()}
      <p style="font-size:12px;color:#ccc;margin:0;text-align:center;">No password needed — use the "Admin" entry point and sign in with this email address (${escapeHtml(data.email)}). We'll send you a login code each time.</p>
      ${ctaButton("Sign In to Admin Panel")}
    `, `You've been added as an admin`)
  }),
};

// ═══════════════════════════════════════════
// SEND
// ═══════════════════════════════════════════

// Fire-and-forget from callers is fine for non-critical notifications, but
// this function itself always resolves/reports its own success or failure —
// callers decide whether to await and log, not this function swallowing it.
export async function sendTransactionalEmail(type, data) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY not configured — email not sent:", type);
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  const templateFn = TEMPLATES[type];
  if (!templateFn) {
    console.error(`Unknown email template: ${type}`);
    return { success: false, error: `Unknown template: ${type}` };
  }

  const email = templateFn(data);

  // Last gate before anything leaves. See the DEV SEND GUARD block above.
  const sendable = checkSendable(email.to, email.html);
  if (!sendable.ok) {
    console.warn(`[email] BLOCKED ${type}: ${sendable.reason}`);
    // Deliberately NOT a sync failure: in local development this is the guard
    // working as designed, and filling the admin panel with those would train
    // everyone to ignore it. A blocked send in production is impossible unless
    // SITE_URL is wrong, which is a deploy problem, not an order problem.
    return { success: false, blocked: true, error: sendable.reason };
  }

  const payload = { from: FROM_EMAIL, to: email.to, subject: email.subject, html: email.html };
  if (data.pdfAttachment) {
    payload.attachments = [{ filename: data.pdfAttachment.filename, content: data.pdfAttachment.base64 }];
  }

  try {
    const res = await fetch(RESEND_API, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await res.json();
    if (!res.ok) {
      console.error(`Resend error (${type}):`, result);
      recordSyncFailure({ type: "email", orderId: data.orderId, context: type, error: JSON.stringify(result) });
      return { success: false, error: result };
    }
    return { success: true, id: result.id };
  } catch (err) {
    console.error(`Email send failed (${type}):`, err);
    recordSyncFailure({ type: "email", orderId: data.orderId, context: type, error: err.message });
    return { success: false, error: err.message };
  }
}
