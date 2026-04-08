// DEE APRIL B2B — PDF Invoice Generator
// Generates deposit (30%) and balance (70%) invoices as PDF
// Returns base64-encoded PDF for email attachment + direct download

import { NextResponse } from "next/server";
import { jsPDF } from "jspdf";

const SELLER = {
  legalName: "DA DESIGN APS",
  brandName: "Dee April Parfums",
  address: "Piniehøj 17, 2960 Rungsted Kyst, Denmark",
  email: "order@deeapril.com",
  phone: "+45 25 68 88 99",
  bank: "NORDEA, Grønjordsvej 10, 2300 København S, Denmark",
  reg: "2150",
  account: "9039315170",
  iban: "DK80 2000 9039 3151 70",
  swift: "NDEADKKK",
  cvr: "45305481",
};

const LOGO_WHITE_URL = "https://gsojazybzodouvdmqkvg.supabase.co/storage/v1/object/public/DA%20Assets/parfums-white%201.png";

// Cache logo base64 to avoid re-fetching every request
let logoBase64Cache = null;
async function getLogoBase64() {
  if (logoBase64Cache) return logoBase64Cache;
  try {
    const res = await fetch(LOGO_WHITE_URL);
    const buf = await res.arrayBuffer();
    logoBase64Cache = Buffer.from(buf).toString("base64");
    return logoBase64Cache;
  } catch (e) {
    console.error("Failed to fetch logo:", e);
    return null;
  }
}

const SIZE_LABELS = { "100 ML": "100ml", "50 ML": "50ml", "20 ML": "20ml Travel", "2 ML": "2ml Tester", "KIT": "Discovery Kit" };

function formatEUR(n) {
  return "€" + Number(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function fmtDate(d) {
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

async function generateInvoicePDF(order, type = "deposit") {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const margin = 24;
  const contentW = W - margin * 2;
  let y = 24;

  // Dark mode color palette
  const darkBg = [0, 0, 0];           // Full black background
  const darkCardBg = [26, 26, 26];    // #1a1a1a - Dark card bg
  const darkBorder = [51, 51, 51];    // #333 - Dark borders
  const white = [255, 255, 255];      // Primary text (white)
  const lightGray = [200, 200, 200];  // Secondary text (light gray)
  const medGray = [136, 136, 136];    // Medium gray for tertiary text

  // Add full-page black background
  doc.setFillColor(...darkBg);
  doc.rect(0, 0, W, 297, 'F');

  // ── Header: Logo image ──
  const logoB64 = await getLogoBase64();
  if (logoB64) {
    try { doc.addImage("data:image/png;base64," + logoB64, "PNG", margin, y - 4, 45, 0); } catch (e) { /* fallback below */ }
  }
  // Fallback text if image fails
  if (!logoB64) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...white);
    doc.text("DEE APRIL", margin, y);
    doc.setFontSize(7);
    doc.setTextColor(...lightGray);
    doc.text("PARFUMS", margin, y + 4.5);
  }

  // Invoice type label
  const isDeposit = type === "deposit";
  const titleText = isDeposit ? "Deposit Invoice" : "Balance Invoice";
  const subtitleText = isDeposit ? "30% Advance Payment" : "70% Remaining Balance";

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...white);
  doc.text(titleText, W - margin, y, { align: "right" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...medGray);
  doc.text(subtitleText, W - margin, y + 5, { align: "right" });

  y += 18;

  // ── From / Bill To ──
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

  // ── Invoice meta bar ──
  doc.setFillColor(...darkCardBg);
  doc.roundedRect(margin, y, contentW, 12, 2, 2, "F");

  const invDate = order.date ? new Date(order.date) : new Date();
  const dueDate = new Date(invDate);
  dueDate.setDate(dueDate.getDate() + 7);

  const invoiceNo = isDeposit ? order.orderId : (order.orderId + "-BAL");

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

  // ── Line items table ──
  const cols = [
    { label: "PRODUCT", x: margin, w: 42, align: "left" },
    { label: "SKU", x: margin + 42, w: 28, align: "left" },
    { label: "SIZE", x: margin + 70, w: 26, align: "left" },
    { label: "QTY", x: margin + 96, w: 16, align: "right" },
    { label: "UNIT PRICE", x: margin + 112, w: 24, align: "right" },
    { label: "TOTAL", x: margin + 136, w: 26, align: "right" },
  ];

  // Header
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

  // Rows
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
    doc.text(formatEUR(l.unitPrice), cols[4].x + cols[4].w, y, { align: "right" });
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...white);
    doc.text(formatEUR(l.total || l.qty * l.unitPrice), cols[5].x + cols[5].w, y, { align: "right" });
    doc.setFont("helvetica", "normal");

    y += 1.5;
    doc.setDrawColor(...darkBorder);
    doc.setLineWidth(0.2);
    doc.line(margin, y, margin + contentW, y);
    y += 4.5;
  });

  y += 4;

  // ── Totals ──
  const totX = margin + contentW - 80;
  const totValX = margin + contentW;

  const addTotalLine = (label, value, bold = false, big = false) => {
    doc.setFontSize(big ? 11 : 8);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setTextColor(...(bold ? white : lightGray));
    doc.text(label, totX, y);
    doc.setTextColor(...white);
    doc.text(formatEUR(value), totValX, y, { align: "right" });
    if (!big) {
      y += 1.5;
      doc.setDrawColor(...darkBorder);
      doc.setLineWidth(0.2);
      doc.line(totX, y, totValX, y);
    }
    y += big ? 6 : 4.5;
  };

  addTotalLine("Subtotal (excl. VAT)", order.totalWSP || 0);
  if (order.vatAmount) addTotalLine(order.vatLabel || "VAT", order.vatAmount);
  if (order.vatLabel && !order.vatAmount) {
    doc.setFontSize(7);
    doc.setTextColor(...lightGray);
    doc.text("VAT: " + order.vatLabel, totX, y - 1);
    y += 3;
  }
  if (order.shipping) addTotalLine("Shipping", order.shipping);
  addTotalLine("Total incl. VAT & Shipping", order.totalWithVat || 0);

  if (isDeposit) {
    addTotalLine("Deposit Rate", "30%", false, false);
    // Override the value for deposit rate line (it's text not number)
    // Actually let's just do the amount due
    y += 2;
    doc.setDrawColor(...white);
    doc.setLineWidth(0.5);
    doc.line(totX, y, totValX, y);
    y += 5;
    const depositTotal = order.depositInvoiceTotal || (order.depositAmount + (order.shipping || 0));
    addTotalLine("Amount Due", depositTotal, true, true);
  } else {
    y += 2;
    doc.setDrawColor(...white);
    doc.setLineWidth(0.5);
    doc.line(totX, y, totValX, y);
    y += 5;
    addTotalLine("Amount Due", order.balanceAmount || 0, true, true);
  }

  // ── VAT note ──
  if (order.vatNote) {
    doc.setFontSize(7);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...lightGray);
    doc.text(order.vatNote, margin, y, { maxWidth: contentW });
    y += 8;
  }

  // ── Payment details ──
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
    if (label === "IBAN") {
      doc.setFont("helvetica", "bold");
    }
    doc.text(value, margin + 24, y);
    doc.setFont("helvetica", "normal");
    y += 4;
  });

  y += 6;

  // ── Footer note ──
  doc.setFillColor(...darkCardBg);
  doc.roundedRect(margin, y, contentW, 18, 2, 2, "F");
  doc.setFontSize(7);
  doc.setTextColor(...lightGray);

  if (isDeposit) {
    const noteText = `Order will be confirmed upon receipt of the 30% deposit (${formatEUR(order.depositAmount)}) plus shipping (${formatEUR(order.shipping || 0)}) = ${formatEUR(order.depositInvoiceTotal || (order.depositAmount + (order.shipping || 0)))}. Remaining 70% (${formatEUR(order.balanceAmount)}) is due prior to shipment.`;
    doc.text(noteText, margin + 4, y + 5, { maxWidth: contentW - 8 });
  } else {
    const noteText = `This is the remaining 70% balance for order ${order.orderId}. Please transfer the amount to the bank account above. Shipment will proceed upon receipt of payment.`;
    doc.text(noteText, margin + 4, y + 5, { maxWidth: contentW - 8 });
  }

  return doc.output("arraybuffer");
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { order, type = "deposit", format = "base64" } = body;

    if (!order || !order.orderId) {
      return NextResponse.json({ error: "Missing order data" }, { status: 400 });
    }

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

    // Return base64 for email attachment
    const base64 = Buffer.from(uint8).toString("base64");
    return NextResponse.json({
      success: true,
      filename: `${order.orderId}-${type}-invoice.pdf`,
      base64,
    });
  } catch (err) {
    console.error("PDF generation error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
