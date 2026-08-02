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

// Net shipping for the freight-only line on the shipping document.
const shippingNetForTable = (order) => Number(order.shipping) || 0;

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

const PAGE_W = 210; // A4 width, kept so these still print correctly on A4 paper
const PAGE_H = 297;
const PAGE_MARGIN = 24;
// Anything crossing this y has run off the paper.
const PAGE_BOTTOM = PAGE_H - 18;
const PAGE_TOP = 24;

// Every page is black paper. Overshoot on all sides: filling exactly
// 0,0,W,H left a ~0.004pt uncovered sliver at the right edge from unit
// conversion, which a renderer that snaps to device pixels can turn into a
// hairline of white against an otherwise black document.
function paintPage(doc) {
  doc.setFillColor(0, 0, 0);
  doc.rect(-10, -10, PAGE_W + 20, doc.internal.pageSize.getHeight() + 20, "F");
}

// Draws the whole invoice and returns the y it finished at — used by the
// layout tests to prove nothing ran off the bottom of the paper.
export function drawInvoice(doc, order, type, logoB64) {
  const W = PAGE_W;
  const margin = PAGE_MARGIN;
  const contentW = W - margin * 2;
  let y = 24;

  const darkBg = [0, 0, 0];
  const darkCardBg = [26, 26, 26];
  const darkBorder = [51, 51, 51];
  const white = [255, 255, 255];
  const lightGray = [200, 200, 200];
  const medGray = [136, 136, 136];

  const isDeposit = type === "deposit";
  const titleText = isDeposit ? "Shipping Invoice" : "Order Invoice";
  const subtitleText = isDeposit ? "Shipping Fee" : "Full Payment Due";
  const invoiceNo = isDeposit ? (order.orderId + "-SHIP") : order.orderId;

  paintPage(doc);

  // A continuation sheet has to say which invoice it belongs to — printed and
  // filed, page 2 on its own is an anonymous list of numbers.
  const drawContinuationHeader = () => {
    if (logoB64) {
      try { doc.addImage("data:image/png;base64," + logoB64, "PNG", margin, y - 4, 0, 7); } catch (e) { /* text fallback */ }
    } else {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...white);
      doc.text("DEE", margin, y);
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...medGray);
    doc.text(`${titleText} ${invoiceNo} — continued`, W - margin, y, { align: "right" });
    y += 6;
    doc.setDrawColor(...darkBorder);
    doc.setLineWidth(0.2);
    doc.line(margin, y, margin + contentW, y);
    y += 7;
  };

  // A long order used to run straight off the bottom of the single A4 page:
  // from 19 line items the payment note fell past the edge, and from 21 the
  // IBAN and BIC/SWIFT went with it — the buyer received an invoice with no
  // way to pay it, and no warning that anything was missing. Each block below
  // now asks for the room it needs first and starts a fresh page if the
  // remaining space can't hold it.
  const ensureSpace = (needed, onBreak) => {
    if (y + needed <= PAGE_BOTTOM) return false;
    doc.addPage();
    paintPage(doc);
    y = PAGE_TOP;
    drawContinuationHeader();
    if (onBreak) onBreak();
    return true;
  };

  if (logoB64) {
    try { doc.addImage("data:image/png;base64," + logoB64, "PNG", margin, y - 4, 0, 10); } catch (e) { /* fallback below */ }
  }
  if (!logoB64) {
    // Only reached if public/images/logo-white.png can't be read. It used to
    // print "DEE APRIL / PARFUMS" — the brand was renamed to plain DEE on
    // 2026-07-24, and a fallback nobody looks at is exactly where an old name
    // survives.
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...white);
    doc.text("DEE", margin, y);
  }

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

  // Repeated at the top of every continuation page — a bare column of numbers
  // with no headings isn't readable as an invoice.
  const drawTableHeader = () => {
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
  };
  drawTableHeader();
  // The shipping document lists the freight, not the goods. It used to print
  // the full product table, so it read as an invoice for the entire order that
  // merely asked for 9.25 — and the same table then appeared again on the real
  // invoice.
  const lines = isDeposit
    ? [{ product: "Shipping", sku: "", size: "", qty: 1, unitPrice: shippingNetForTable(order), total: shippingNetForTable(order) }]
    : (order.lines || []);
  lines.forEach(l => {
    ensureSpace(6, drawTableHeader);
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

  // Each document states ONLY the VAT it actually charges. Both used to print
  // the order's whole VAT total: the shipping invoice demanded 9.25 while
  // declaring 20.60 of VAT, then the full invoice declared the same 20.60
  // again — 41.20 of VAT stated across two documents against 20.60 actually
  // charged, and the buyer's bookkeeper reconciling either one against DEE's
  // correctly-split e-conomic drafts would find neither matched.
  const shippingNet = Number(order.shipping) || 0;
  const shippingVat = Number(order.shippingVat) || 0;
  const goodsVat = Math.round(((Number(order.vatAmount) || 0) - shippingVat) * 100) / 100;

  // The totals block is meaningless split across a page boundary — "Subtotal"
  // on one sheet and "Amount Due" on the next. Measured, not guessed: two or
  // three 6mm rows, the 7mm rule under them, and the 6mm amount due. A blanket
  // reservation here costs a whole extra sheet whenever it overshoots.
  ensureSpace((2 + ((isDeposit ? shippingVat : goodsVat) ? 1 : 0)) * 6 + 13);

  if (isDeposit) {
    // Shipping only. The goods are invoiced separately and are not due here.
    addTotalLine("Shipping (excl. VAT)", shippingNet);
    if (shippingVat) addTotalLine(order.vatLabel || "VAT", shippingVat);
    if (order.vatLabel && !shippingVat) {
      doc.setFontSize(7);
      doc.setTextColor(...lightGray);
      doc.text("VAT: " + order.vatLabel, totX, y - 1);
      y += 3;
    }
    addTotalLine("Total incl. VAT", order.depositInvoiceTotal ?? order.depositAmount ?? 0);
  } else {
    // Goods only — the shipping fee was invoiced on its own document, so
    // repeating it here would double-count it in the buyer's books.
    addTotalLine("Subtotal (excl. VAT)", order.totalWSP || 0);
    if (goodsVat) addTotalLine(order.vatLabel || "VAT", goodsVat);
    if (order.vatLabel && !goodsVat) {
      doc.setFontSize(7);
      doc.setTextColor(...lightGray);
      doc.text("VAT: " + order.vatLabel, totX, y - 1);
      y += 3;
    }
    addTotalLine("Total incl. VAT", order.balanceAmount || 0);
  }

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
    // Measure what it actually wraps to. A flat `y += 8` assumed one line,
    // so a reverse-charge note that wrapped printed the payment separator
    // through it.
    const vatNoteLines = doc.splitTextToSize(order.vatNote, contentW);
    ensureSpace(vatNoteLines.length * 3.2 + 5);
    doc.text(vatNoteLines, margin, y);
    y += vatNoteLines.length * 3.2 + 4.8;
    doc.setFont("helvetica", "normal");
  }

  // How to pay and what for belong together and belong on the same page as
  // each other — measured, not guessed: separator (10) + heading (5) + the
  // five bank rows (20) + the gap before the note box (6).
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  let noteText;
  if (isDeposit) {
    noteText = `Order will be confirmed upon receipt of the shipping fee (${fmtMoney(order.depositInvoiceTotal ?? order.depositAmount ?? 0)}). The full order amount (${fmtMoney(order.balanceAmount)}) is invoiced separately and due prior to shipment.`;
  } else {
    noteText = `This is the full invoice for order ${order.orderId}. Please transfer the amount to the bank account above. Shipment will proceed upon receipt of payment.`;
  }
  const noteLines = doc.splitTextToSize(noteText, contentW - 12);
  const noteBoxH = noteLines.length * 3.5 + 8;
  // Its own divider is redundant when the continuation header just drew one.
  if (!ensureSpace(41 + noteBoxH)) {
    y += 4;
    doc.setDrawColor(...darkBorder);
    doc.setLineWidth(0.2);
    doc.line(margin, y, margin + contentW, y);
    y += 6;
  }

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

  doc.setFillColor(...darkCardBg);
  doc.roundedRect(margin, y, contentW, noteBoxH, 2, 2, "F");
  doc.text(noteLines, margin + 6, y + 5.5);

  return y + noteBoxH;
}

// Plain A4, like any other invoice. Trimming the page to its content was tried
// on 2026-07-27 and reverted the same day: it looked better as an email
// attachment, but these are accounting documents and a non-standard page size
// is a worse trade than some empty space at the bottom.
export async function generateInvoicePDF(order, type = "deposit") {
  const logoB64 = await getLogoBase64();
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  drawInvoice(doc, order, type, logoB64);

  // Only once the document is finished is "of N" knowable. Single-page
  // invoices stay unstamped — "Page 1 of 1" is noise.
  const pages = doc.getNumberOfPages();
  if (pages > 1) {
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(136, 136, 136);
      doc.text(`Page ${i} of ${pages}`, PAGE_W - PAGE_MARGIN, PAGE_H - 10, { align: "right" });
    }
  }
  return doc.output("arraybuffer");
}
