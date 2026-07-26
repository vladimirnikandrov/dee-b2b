// Not @ts-check'd like the other money-shape modules — jsPDF's type defs
// require exact-length tuples for setFillColor(...)/setTextColor(...) etc.,
// which this file calls with plain RGB arrays throughout; fixing that is
// churn against a third-party lib's types, not a real bug. The order/pricing
// shape this file consumes is already typed at the source (orders.js).
// PDF invoice generator (deposit/balance). Extracted from the old
// generate-invoice API route so order-mutating routes can call it directly
// (function import) when attaching a PDF to an email, without a self-fetch.
import { jsPDF } from "jspdf";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { SELLER } from "@/lib/seller";
import { formatEUR, SIZE_LABELS } from "@/lib/format";

// jsPDF's built-in Helvetica has broken glyph metrics for "€" — it renders
// flush against the following digit with no kerning space. formatEUR()
// itself is fine (used as-is in HTML emails/web UI); this PDF-only wrapper
// adds breathing room so the symbol doesn't look glued to the number.
const fmtMoney = (n) => formatEUR(n).replace("€", "€ ");

// Read straight from the local public/images/ copy — no external fetch,
// so PDF generation has zero dependency on Supabase Storage (or anything else).
let logoBase64Cache = null;
async function getLogoBase64() {
  if (logoBase64Cache) return logoBase64Cache;
  try {
    const filePath = path.join(process.cwd(), "public", "images", "logo-white.png");
    const buf = await readFile(filePath);
    logoBase64Cache = buf.toString("base64");
    return logoBase64Cache;
  } catch (e) {
    console.error("Failed to read logo:", e);
    return null;
  }
}

function fmtDate(d) {
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export async function generateInvoicePDF(order, type = "deposit") {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const margin = 24;
  const contentW = W - margin * 2;
  let y = 24;

  const darkBg = [0, 0, 0];
  const darkCardBg = [26, 26, 26];
  const darkBorder = [51, 51, 51];
  const white = [255, 255, 255];
  const lightGray = [200, 200, 200];
  const medGray = [136, 136, 136];

  doc.setFillColor(...darkBg);
  doc.rect(0, 0, W, 297, "F");

  const logoB64 = await getLogoBase64();
  if (logoB64) {
    try { doc.addImage("data:image/png;base64," + logoB64, "PNG", margin, y - 4, 0, 10); } catch (e) { /* fallback below */ }
  }
  if (!logoB64) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...white);
    doc.text("DEE APRIL", margin, y);
    doc.setFontSize(7);
    doc.setTextColor(...lightGray);
    doc.text("PARFUMS", margin, y + 4.5);
  }

  const isDeposit = type === "deposit";
  const titleText = isDeposit ? "Shipping Invoice" : "Order Invoice";
  const subtitleText = isDeposit ? "Shipping Fee" : "Full Payment Due";

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...white);
  doc.text(titleText, W - margin, y, { align: "right" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...medGray);
  doc.text(subtitleText, W - margin, y + 5, { align: "right" });

  y += 18;

  const colW = contentW / 2;

  doc.setFontSize(7);
  doc.setTextColor(...lightGray);
  doc.text("FROM", margin, y);
  doc.text("BILL TO", margin + colW + 8, y);
  y += 5;

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...white);
  doc.text(SELLER.legalName, margin, y);
  doc.text(order.buyerCompany || "", margin + colW + 8, y);
  y += 4;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...lightGray);

  const fromLines = [SELLER.address, `CVR: ${SELLER.cvr}`, SELLER.email, SELLER.phone];
  const toLines = [];
  if (order.buyerContact) toLines.push(order.buyerContact);
  if (order.buyerAddress) toLines.push(order.buyerAddress);
  const cityLine = [order.buyerZip, order.buyerCity, order.buyerCountry].filter(Boolean).join(", ");
  if (cityLine) toLines.push(cityLine);
  if (order.buyerVat) toLines.push("VAT: " + order.buyerVat);
  if (order.buyerEmail) toLines.push(order.buyerEmail);

  const maxLines = Math.max(fromLines.length, toLines.length);
  for (let i = 0; i < maxLines; i++) {
    if (fromLines[i]) doc.text(fromLines[i], margin, y);
    if (toLines[i]) doc.text(toLines[i], margin + colW + 8, y);
    y += 3.8;
  }

  y += 6;

  doc.setFillColor(...darkCardBg);
  doc.roundedRect(margin, y, contentW, 12, 2, 2, "F");

  const invDate = order.date ? new Date(order.date) : new Date();
  const dueDate = new Date(invDate);
  dueDate.setDate(dueDate.getDate() + 7);

  const invoiceNo = isDeposit ? (order.orderId + "-SHIP") : order.orderId;

  doc.setFontSize(6.5);
  doc.setTextColor(...medGray);
  doc.text("INVOICE NO.", margin + 4, y + 4);
  doc.text("DATE", margin + 50, y + 4);
  doc.text("DUE DATE", margin + 96, y + 4);

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...white);
  doc.text(invoiceNo, margin + 4, y + 8.5);
  doc.setFont("helvetica", "normal");
  doc.text(fmtDate(invDate), margin + 50, y + 8.5);
  doc.text(fmtDate(dueDate), margin + 96, y + 8.5);

  y += 18;

  const cols = [
    { label: "PRODUCT", x: margin, w: 42, align: "left" },
    { label: "SKU", x: margin + 42, w: 28, align: "left" },
    { label: "SIZE", x: margin + 70, w: 26, align: "left" },
    { label: "QTY", x: margin + 96, w: 16, align: "right" },
    { label: "UNIT PRICE", x: margin + 112, w: 24, align: "right" },
    { label: "TOTAL", x: margin + 136, w: 26, align: "right" },
  ];

  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...medGray);
  cols.forEach(c => {
    const tx = c.align === "right" ? c.x + c.w : c.x;
    doc.text(c.label, tx, y, { align: c.align });
  });
  y += 2;
  doc.setDrawColor(...darkBorder);
  doc.setLineWidth(0.5);
  doc.line(margin, y, margin + contentW, y);
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const lines = order.lines || [];
  lines.forEach(l => {
    doc.setTextColor(...white);
    doc.text(l.product || "", cols[0].x, y);
    doc.setTextColor(...lightGray);
    doc.setFontSize(7);
    doc.text(l.sku || "", cols[1].x, y);
    doc.setFontSize(8);
    doc.setTextColor(...white);
    doc.text(SIZE_LABELS[l.size] || l.size || "", cols[2].x, y);
    doc.text(String(l.qty), cols[3].x + cols[3].w, y, { align: "right" });
    doc.setTextColor(...lightGray);
    doc.text(fmtMoney(l.unitPrice), cols[4].x + cols[4].w, y, { align: "right" });
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...white);
    doc.text(fmtMoney(l.total || l.qty * l.unitPrice), cols[5].x + cols[5].w, y, { align: "right" });
    doc.setFont("helvetica", "normal");

    y += 1.5;
    doc.setDrawColor(...darkBorder);
    doc.setLineWidth(0.2);
    doc.line(margin, y, margin + contentW, y);
    y += 4.5;
  });

  y += 4;

  const totX = margin + contentW - 80;
  const totValX = margin + contentW;

  const addTotalLine = (label, value, bold = false, big = false) => {
    doc.setFontSize(big ? 11 : 8);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setTextColor(...(bold ? white : lightGray));
    doc.text(label, totX, y);
    doc.setTextColor(...white);
    const displayVal = typeof value === "string" ? value : fmtMoney(value);
    doc.text(displayVal, totValX, y, { align: "right" });
    if (!big && typeof value !== "string") {
      y += 1.5;
      doc.setDrawColor(...darkBorder);
      doc.setLineWidth(0.2);
      doc.line(totX, y, totValX, y);
    }
    y += big ? 6 : 4.5;
  };

  addTotalLine("Subtotal (excl. VAT)", order.totalWSP || 0);
  // Shipping before VAT, because shipping is quoted VAT-inclusive and its VAT
  // is inside the VAT total below — see lib/pricing.js splitShipping(). Listed
  // after the VAT line it would read as if the VAT covered only the goods.
  if (order.shipping) addTotalLine("Shipping (excl. VAT)", order.shipping);
  if (order.vatAmount) addTotalLine(order.vatLabel || "VAT", order.vatAmount);
  if (order.vatLabel && !order.vatAmount) {
    doc.setFontSize(7);
    doc.setTextColor(...lightGray);
    doc.text("VAT: " + order.vatLabel, totX, y - 1);
    y += 3;
  }
  addTotalLine("Total incl. VAT & Shipping", order.totalWithVat || 0);

  y += 2;
  doc.setDrawColor(...white);
  doc.setLineWidth(0.5);
  doc.line(totX, y, totValX, y);
  y += 5;
  if (isDeposit) {
    addTotalLine("Amount Due (Shipping)", order.depositInvoiceTotal ?? order.depositAmount ?? 0, true, true);
  } else {
    addTotalLine("Amount Due", order.balanceAmount || 0, true, true);
  }

  if (order.vatNote) {
    doc.setFontSize(7);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...lightGray);
    doc.text(order.vatNote, margin, y, { maxWidth: contentW });
    y += 8;
  }

  y += 4;
  doc.setDrawColor(...darkBorder);
  doc.setLineWidth(0.2);
  doc.line(margin, y, margin + contentW, y);
  y += 6;

  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...lightGray);
  doc.text("PAYMENT DETAILS", margin, y);
  y += 5;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...lightGray);

  const bankDetails = [
    ["Bank", SELLER.bank],
    ["REG", SELLER.reg],
    ["Account", SELLER.account],
    ["IBAN", SELLER.iban],
    ["BIC/SWIFT", SELLER.swift],
  ];

  bankDetails.forEach(([label, value]) => {
    doc.setTextColor(...medGray);
    doc.text(label, margin, y);
    doc.setTextColor(...white);
    if (label === "IBAN") doc.setFont("helvetica", "bold");
    doc.text(value, margin + 24, y);
    doc.setFont("helvetica", "normal");
    y += 4;
  });

  y += 6;

  doc.setFontSize(7);
  doc.setTextColor(...lightGray);

  let noteText;
  if (isDeposit) {
    noteText = `Order will be confirmed upon receipt of the shipping fee (${fmtMoney(order.depositInvoiceTotal ?? order.depositAmount ?? 0)}). The full order amount (${fmtMoney(order.balanceAmount)}) is invoiced separately and due prior to shipment.`;
  } else {
    noteText = `This is the full invoice for order ${order.orderId}. Please transfer the amount to the bank account above. Shipment will proceed upon receipt of payment.`;
  }

  const noteLines = doc.splitTextToSize(noteText, contentW - 12);
  const noteBoxH = noteLines.length * 3.5 + 8;
  doc.setFillColor(...darkCardBg);
  doc.roundedRect(margin, y, contentW, noteBoxH, 2, 2, "F");
  doc.text(noteLines, margin + 6, y + 5.5);

  return doc.output("arraybuffer");
}
