"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://gsojazybzodouvdmqkvg.supabase.co",
  "sb_publishable_oItKAbWre9gQpxJZ38k50Q_aPJrn0b5"
);

/* ═══════════════════════════════════════════
   LOGO SVG
   ═══════════════════════════════════════════ */

function Logo({ color = "#000", style = {} }) {
  return (
    <svg viewBox="0 0 409.25 119.91" style={{ height: 28, ...style }} fill={color}>
      <defs><clipPath id="da-clip"><rect x="0" width="409.25" height="56.69" fill="none"/></clipPath></defs>
      <g><g clipPath="url(#da-clip)"><path d="M369.14,0h12.41v46.27h27.7v10.42h-40.11V0ZM347.4,56.69h12.41V0h-12.41v56.69ZM292,0h30.58c8.84-.1,16.58,6.06,16.58,15.69,0,6.16-2.08,11.42-8.94,14.2v.2c5.76,1.59,7.74,6.45,8.24,13.2.2,3.57.3,10.62,2.38,13.4h-12.41c-1.49-3.97-1.59-10.62-1.99-13.5-.99-6.06-3.38-8.64-9.53-8.64h-12.41v22.14h-12.51V0ZM304.51,25.72h13.6c5.66,0,8.64-2.48,8.64-8.14s-3.08-7.84-8.64-7.84h-13.6v15.98ZM241.26,0h25.52c11.22-.1,19.66,6.25,19.66,18.17.1,8.44-4.96,18.27-19.66,18.27h-13.11v20.25h-12.41V0ZM253.67,26.71h9.73c5.36,0,10.92-1.09,10.92-8.54s-5.56-8.44-10.92-8.44h-9.73v16.98ZM200.75,0h12.81l21.15,56.69h-12.91l-4.27-12.61h-21.25l-4.47,12.61h-12.51L200.75,0ZM199.56,34.85h14.69l-7.15-20.85h-.2l-7.35,20.85ZM109.01,0h42.39v10.52h-29.88v12.11h27.4v9.73h-27.4v13.9h30.58v10.42h-43.09V0ZM57.78,0h42.39v10.52h-29.88v12.11h27.5v9.73h-27.5v13.9h30.58v10.42h-43.09V0ZM0,0h24.52C40.11,0,50.24,10.53,50.24,28.1s-9.04,28.59-25.71,28.59H0V0ZM12.51,46.27h11.12c8.34,0,14.1-5.86,14.1-16.98s-4.07-18.76-16.28-18.76h-8.94v35.74Z"/></g>
      <path d="M118.98,90.72c1.79,0,3.31.26,4.56.78,1.25.52,2.27,1.21,3.06,2.06s1.36,1.83,1.72,2.92c.36,1.09.54,2.23.54,3.4s-.18,2.27-.54,3.38c-.36,1.11-.93,2.09-1.72,2.94s-1.81,1.54-3.06,2.06c-1.25.52-2.77.78-4.56.78h-6.6v10.24h-6.28v-28.56h12.88ZM117.26,104.15c.72,0,1.41-.05,2.08-.16.67-.11,1.25-.31,1.76-.62.51-.31.91-.74,1.22-1.3.31-.56.46-1.29.46-2.2s-.15-1.64-.46-2.2c-.31-.56-.71-.99-1.22-1.3-.51-.31-1.09-.51-1.76-.62-.67-.11-1.36-.16-2.08-.16h-4.88v8.56h4.88Z"/>
      <path d="M145.32,90.72l10.68,28.56h-6.52l-2.16-6.36h-10.68l-2.24,6.36h-6.32l10.8-28.56h6.44ZM145.68,108.23l-3.6-10.48h-.08l-3.72,10.48h7.4Z"/>
      <path d="M175.22,90.72c1.28,0,2.43.21,3.46.62s1.91.98,2.64,1.7c.73.72,1.29,1.55,1.68,2.5.39.95.58,1.97.58,3.06,0,1.68-.35,3.13-1.06,4.36-.71,1.23-1.86,2.16-3.46,2.8v.08c.77.21,1.41.54,1.92.98.51.44.92.96,1.24,1.56.32.6.55,1.26.7,1.98s.25,1.44.3,2.16c.03.45.05.99.08,1.6.03.61.07,1.24.14,1.88.07.64.17,1.25.32,1.82.15.57.37,1.06.66,1.46h-6.28c-.35-.91-.56-1.99-.64-3.24-.08-1.25-.2-2.45-.36-3.6-.21-1.49-.67-2.59-1.36-3.28-.69-.69-1.83-1.04-3.4-1.04h-6.28v11.16h-6.28v-28.56h15.4ZM172.98,103.64c1.44,0,2.52-.32,3.24-.96.72-.64,1.08-1.68,1.08-3.12s-.36-2.39-1.08-3.02c-.72-.63-1.8-.94-3.24-.94h-6.88v8.04h6.88Z"/>
      <path d="M208.35,90.72v5.28h-13.8v6.6h11.96v4.88h-11.96v11.8h-6.28v-28.56h20.08Z"/>
      <path d="M234.51,117.1c-2.16,1.88-5.15,2.82-8.96,2.82s-6.86-.93-8.98-2.8c-2.12-1.87-3.18-4.75-3.18-8.64v-17.76h6.28v17.76c0,.77.07,1.53.2,2.28.13.75.41,1.41.84,1.98.43.57,1.02,1.04,1.78,1.4.76.36,1.78.54,3.06.54,2.24,0,3.79-.5,4.64-1.5.85-1,1.28-2.57,1.28-4.7v-17.76h6.28v17.76c0,3.87-1.08,6.74-3.24,8.62Z"/>
      <path d="M252.81,90.72l6.68,19.64h.08l6.32-19.64h8.84v28.56h-5.88v-20.24h-.08l-7,20.24h-4.84l-7-20.04h-.08v20.04h-5.88v-28.56h8.84Z"/>
      <path d="M285.71,112.22c.35.67.81,1.21,1.38,1.62.57.41,1.25.72,2.02.92s1.57.3,2.4.3c.56,0,1.16-.05,1.8-.14.64-.09,1.24-.27,1.8-.54s1.03-.63,1.4-1.1c.37-.47.56-1.06.56-1.78,0-.77-.25-1.4-.74-1.88s-1.14-.88-1.94-1.2c-.8-.32-1.71-.6-2.72-.84-1.01-.24-2.04-.51-3.08-.8-1.07-.27-2.11-.59-3.12-.98-1.01-.39-1.92-.89-2.72-1.5-.8-.61-1.45-1.38-1.94-2.3-.49-.92-.74-2.03-.74-3.34,0-1.47.31-2.74.94-3.82.63-1.08,1.45-1.98,2.46-2.7,1.01-.72,2.16-1.25,3.44-1.6,1.28-.35,2.56-.52,3.84-.52,1.49,0,2.93.17,4.3.5,1.37.33,2.59.87,3.66,1.62,1.07.75,1.91,1.7,2.54,2.86.63,1.16.94,2.57.94,4.22h-6.08c-.05-.85-.23-1.56-.54-2.12s-.71-1-1.22-1.32c-.51-.32-1.09-.55-1.74-.68-.65-.13-1.37-.2-2.14-.2-.51,0-1.01.05-1.52.16-.51.11-.97.29-1.38.56-.41.27-.75.6-1.02,1-.27.4-.4.91-.4,1.52,0,.56.11,1.01.32,1.36.21.35.63.67,1.26.96.63.29,1.49.59,2.6.88,1.11.29,2.55.67,4.34,1.12.53.11,1.27.3,2.22.58.95.28,1.89.73,2.82,1.34.93.61,1.74,1.43,2.42,2.46.68,1.03,1.02,2.34,1.02,3.94,0,1.31-.25,2.52-.76,3.64-.51,1.12-1.26,2.09-2.26,2.9-1,.81-2.24,1.45-3.72,1.9-1.48.45-3.19.68-5.14.68-1.57,0-3.1-.19-4.58-.58-1.48-.39-2.79-.99-3.92-1.82-1.13-.83-2.03-1.88-2.7-3.16-.67-1.28-.99-2.8-.96-4.56h6.08c0,.96.17,1.77.52,2.44Z"/></g>
    </svg>
  );
}

/* ═══════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════ */

const PRODUCTS = [
  { name: "Parfum", collection: "Chapter I", variants: [
    { size: "100 ML", sku: "DEP100200", ean: "0788364060525", wsp: 75, rrp: 200 },
    { size: "50 ML", sku: "DEP100100", ean: "0792649468432", wsp: 55, rrp: 145 },
    { size: "20 ML", sku: "DEP100300", ean: "0788364060594", wsp: 25, rrp: 65 },
    { size: "2 ML", sku: "DEP100701", ean: null, wsp: 2, rrp: null, label: "Tester" },
  ]},
  { name: "Parfum I", collection: "Chapter I", variants: [
    { size: "100 ML", sku: "DEP100201", ean: "0788364060532", wsp: 75, rrp: 200 },
    { size: "50 ML", sku: "DEP100101", ean: "0788364060501", wsp: 55, rrp: 145 },
    { size: "20 ML", sku: "DEP100301", ean: "0788364060563", wsp: 25, rrp: 65 },
    { size: "2 ML", sku: "DEP100702", ean: null, wsp: 2, rrp: null, label: "Tester" },
  ]},
  { name: "Parfum II", collection: "Chapter I", variants: [
    { size: "100 ML", sku: "DEP100202", ean: "0788364060549", wsp: 75, rrp: 200 },
    { size: "50 ML", sku: "DEP100102", ean: "0788364060518", wsp: 55, rrp: 145 },
    { size: "20 ML", sku: "DEP100302", ean: "0788364060570", wsp: 25, rrp: 65 },
    { size: "2 ML", sku: "DEP100703", ean: null, wsp: 2, rrp: null, label: "Tester" },
  ]},
  { name: "Tester / Parfum", collection: "Testers", variants: [
    { size: "100 ML", sku: "TEST100200", ean: null, wsp: 65, rrp: null, label: "Tester" },
    { size: "50 ML", sku: "TEST100100", ean: null, wsp: 45, rrp: null, label: "Tester" },
    { size: "20 ML", sku: "TEST100300", ean: null, wsp: 15, rrp: null, label: "Tester" },
  ]},
  { name: "Tester / Parfum I", collection: "Testers", variants: [
    { size: "100 ML", sku: "TEST100201", ean: null, wsp: 65, rrp: null, label: "Tester" },
    { size: "50 ML", sku: "TEST100101", ean: null, wsp: 45, rrp: null, label: "Tester" },
    { size: "20 ML", sku: "TEST100301", ean: null, wsp: 15, rrp: null, label: "Tester" },
  ]},
  { name: "Tester / Parfum II", collection: "Testers", variants: [
    { size: "100 ML", sku: "TEST100202", ean: null, wsp: 65, rrp: null, label: "Tester" },
    { size: "50 ML", sku: "TEST100102", ean: null, wsp: 45, rrp: null, label: "Tester" },
    { size: "20 ML", sku: "TEST100302", ean: null, wsp: 15, rrp: null, label: "Tester" },
  ]},
  { name: "Discovery Kit", collection: "Discovery", variants: [
    { size: "KIT", sku: "DEP100800", ean: null, wsp: 8, rrp: null, label: "Discovery Kit" },
  ]},
];

const PRODUCT_IMAGES = {
  "100 ML": "https://gsojazybzodouvdmqkvg.supabase.co/storage/v1/object/sign/DA%20Assets/100ml.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV80ZTU5ZWYwMS1lNDhiLTQ2ZTAtYjVmOS0yMTU4NDRhM2EzZGEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJEQSBBc3NldHMvMTAwbWwucG5nIiwiaWF0IjoxNzc0NTcxNzc5LCJleHAiOjE4MDYxMDc3Nzl9.fMQvtJyRf-kKZc6WvL5FA3IMSuaPrvMpuONQ0acExuQ",
  "50 ML": "https://gsojazybzodouvdmqkvg.supabase.co/storage/v1/object/sign/DA%20Assets/50ml.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV80ZTU5ZWYwMS1lNDhiLTQ2ZTAtYjVmOS0yMTU4NDRhM2EzZGEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJEQSBBc3NldHMvNTBtbC5wbmciLCJpYXQiOjE3NzQ1NzE3NjcsImV4cCI6MTgwNjEwNzc2N30.XT_CMqnkZmO-HVcAnRHfQcxLZ0_rCXdSnsQIYkrZMo4",
  "20 ML": "https://gsojazybzodouvdmqkvg.supabase.co/storage/v1/object/sign/DA%20Assets/20ml.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV80ZTU5ZWYwMS1lNDhiLTQ2ZTAtYjVmOS0yMTU4NDRhM2EzZGEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJEQSBBc3NldHMvMjBtbC5wbmciLCJpYXQiOjE3NzQ1NzE3NTksImV4cCI6MTgwNjEwNzc1OX0.NSLG3CClybM4zPaiHRcyOk8hjvr5XN2xehI9_8mGNYE",
  "2 ML": "https://gsojazybzodouvdmqkvg.supabase.co/storage/v1/object/sign/DA%20Assets/2ml.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV80ZTU5ZWYwMS1lNDhiLTQ2ZTAtYjVmOS0yMTU4NDRhM2EzZGEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJEQSBBc3NldHMvMm1sLnBuZyIsImlhdCI6MTc3NDU3MTczMSwiZXhwIjoxODA2MTA3NzMxfQ.umtxR16GP3dApJRYQkdAVeSyPyfKSOehqhq83vbJKnw",
};
const SIZE_LABELS = { "100 ML": "100ml", "50 ML": "50ml", "20 ML": "20ml Travel", "2 ML": "2ml Tester", "KIT": "Discovery Kit" };

const SELLER = {
  legalName: "DA DESIGN APS", brandName: "Dee April Parfums",
  address: "Piniehøj 17, 2960 Rungsted Kyst, Denmark",
  email: "da@deeapril.com", phone: "+45 25 68 88 99",
  bank: "NORDEA, Grønjordsvej 10, 2300 København S, Denmark",
  reg: "2150", account: "9039315170",
  iban: "DK80 2000 9039 3151 70", swift: "NDEADKKK",
};

const SHIPPING_FLAT = 35;

const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";
const base = { fontFamily: FONT, color: "#000", background: "#fafafa", minHeight: "100vh", margin: 0, padding: 0 };
const inputStyle = { width: "100%", padding: "12px 16px", border: "1px solid #e5e5e5", fontSize: 13, fontFamily: FONT, outline: "none", borderRadius: 10, background: "#fff", transition: "border-color 0.2s", boxSizing: "border-box" };
const labelStyle = { fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "#999", marginBottom: 6, display: "block" };

const EU_COUNTRIES = ["Austria","Belgium","Bulgaria","Croatia","Cyprus","Czech Republic","Czechia","Denmark","Estonia","Finland","France","Germany","Greece","Hungary","Ireland","Italy","Latvia","Lithuania","Luxembourg","Malta","Netherlands","Poland","Portugal","Romania","Slovakia","Slovenia","Spain","Sweden"];
const DK_VAT_RATE = 0.25;

function getVatInfo(country, vatNumber) {
  const c = (country || "").trim();
  const isDK = /^denmark$/i.test(c) || /^dk$/i.test(c) || /^danmark$/i.test(c);
  const isEU = EU_COUNTRIES.some((eu) => eu.toLowerCase() === c.toLowerCase());
  const hasVat = (vatNumber || "").trim().length >= 5;
  if (isDK) return { rate: DK_VAT_RATE, label: "Danish VAT 25%", note: "Incl. 25% moms" };
  if (isEU && hasVat) return { rate: 0, label: "EU Reverse Charge", note: "VAT 0% — Reverse charge, Art. 196 Council Directive 2006/112/EC" };
  if (isEU && !hasVat) return { rate: DK_VAT_RATE, label: "EU (no VAT ID) — Danish VAT 25%", note: "No valid EU VAT number provided — Danish 25% VAT applies" };
  return { rate: 0, label: "Export (0% VAT)", note: "VAT exempt — export outside EU" };
}

const ORDER_STATUSES = [
  { key: "deposit_invoiced", label: "30% Invoiced" }, { key: "deposit_paid", label: "Deposit Paid" },
  { key: "packed", label: "Packed" }, { key: "balance_invoiced", label: "70% Invoiced" },
  { key: "balance_paid", label: "Balance Paid" }, { key: "shipped", label: "Shipped" },
  { key: "received", label: "Received" },
];

const ADMIN_PASSWORD = "1804lovesyou";

const PROMO_CODES_DEFAULT = [
  { code: "MOODSCENTBAR", label: "B2VIP", discount_type: "fixed_prices", prices: { "100 ML": 48, "50 ML": 35, "20 ML": 16, "2 ML": 2, "KIT": 8 } }
];

/* ═══════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════ */

const CSS = `
  @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
  @keyframes slideUp { from { opacity:0; transform:translateY(40px); } to { opacity:1; transform:translateY(0); } }
  @keyframes slideUpCenter { from { opacity:0; transform:translateX(-50%) translateY(40px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }
  @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
  @keyframes scaleIn { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }
  @keyframes toastIn { from { opacity:0; transform:translateY(20px) scale(0.95); } to { opacity:1; transform:translateY(0) scale(1); } }
  @keyframes toastOut { from { opacity:1; transform:translateY(0); } to { opacity:0; transform:translateY(20px); } }
  .da-btn { transition: all 0.25s cubic-bezier(0.23,1,0.32,1); }
  .da-btn:hover { transform:translateY(-1px); box-shadow:0 4px 16px rgba(0,0,0,0.12); }
  .da-btn-outline:hover { background:#000 !important; color:#fff !important; }
  .da-btn-outline-light:hover { background:#fff !important; color:#000 !important; }
  .da-input:focus { border-color:#000 !important; }
  .da-qty-btn:hover { background:#f0f0f0 !important; }
  .da-qty-btn:active { background:#e0e0e0 !important; }
  .da-status-step { transition:all 0.2s ease; cursor:pointer; user-select:none; }
  .da-status-step:hover { transform:scale(1.05); }
  .da-order-row { transition:background 0.15s ease; }
  .da-order-row:hover { background:#fafafa !important; }
  input[type=number]::-webkit-inner-spin-button,
  input[type=number]::-webkit-outer-spin-button { -webkit-appearance:none; margin:0; }
  input[type=number] { -moz-appearance:textfield; }
  ::selection { background:#000; color:#fff; }
  @media (max-width: 768px) {
    .da-pad { padding-left: 20px !important; padding-right: 20px !important; }
    .da-grid-4 { grid-template-columns: 1fr 1fr !important; }
    .da-grid-checkout { grid-template-columns: 1fr !important; }
    .da-grid-admin-row { grid-template-columns: 1fr !important; gap: 8px !important; }
    .da-header-pad { padding-left: 16px !important; padding-right: 16px !important; }
    .da-nav-full { flex-wrap: wrap; gap: 8px !important; }
    .da-invoice-pad { padding: 28px 20px !important; }
    .da-invoice-grid { grid-template-columns: 1fr !important; }
    .da-invoice-meta { grid-template-columns: 1fr 1fr !important; }
    .da-status-bar { flex-wrap: wrap; }
    .da-admin-details { grid-template-columns: 1fr !important; }
    .da-checkout-summary { border-left: none !important; border-top: 1px solid #f0f0f0 !important; }
    .da-order-actions { flex-direction: column; align-items: stretch !important; }
    .da-floating-bar { left: 16px !important; right: 16px !important; transform: none !important; max-width: none !important; }
  }
  @media (max-width: 480px) {
    .da-grid-4 { grid-template-columns: 1fr !important; }
  }
`;

function useStyleInjection() {
  useEffect(() => {
    const id = "da-b2b-styles";
    if (!document.getElementById(id)) {
      const s = document.createElement("style"); s.id = id; s.textContent = CSS;
      document.head.appendChild(s);
    }
  }, []);
}

/* ═══════════════════════════════════════════
   SMALL COMPONENTS
   ═══════════════════════════════════════════ */

function BottleSVG({ size, uniqueId }) {
  const gid = (n) => `${n}_${uniqueId}`;
  if (size === "KIT") return (<svg viewBox="0 0 100 100" style={{width:"100%",height:"100%",maxHeight:100}}><defs><linearGradient id={gid("kit")} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#ffd700"/><stop offset="100%" stopColor="#ffa500"/></linearGradient><filter id={gid("ks")} x="-20%" y="-10%" width="140%" height="130%"><feDropShadow dx="2" dy="4" stdDeviation="3" floodOpacity="0.15"/></filter></defs><g filter={`url(#${gid("ks")})`}><rect x="25" y="20" width="50" height="50" rx="4" fill={`url(#${gid("kit")})`}/><path d="M 40 25 L 35 35 L 40 35 L 35 50 L 65 50 L 60 35 L 65 35 L 60 25" fill="#d4af37" opacity="0.7"/></g></svg>);
  if (size === "2 ML") return (<svg viewBox="0 0 80 200" style={{width:"100%",height:"100%",maxHeight:160}}><defs><linearGradient id={gid("v")} x1="0" y1="0" x2="1" y2="0.3"><stop offset="0%" stopColor="#3a3a3a"/><stop offset="30%" stopColor="#222"/><stop offset="70%" stopColor="#111"/><stop offset="100%" stopColor="#1a1a1a"/></linearGradient><filter id={gid("s")} x="-20%" y="-10%" width="140%" height="130%"><feDropShadow dx="2" dy="4" stdDeviation="3" floodOpacity="0.15"/></filter></defs><g filter={`url(#${gid("s")})`}><rect x="34" y="22" width="12" height="10" rx="1.5" fill="#1a1a1a"/><rect x="36.5" y="12" width="7" height="12" rx="2" fill="#444"/><circle cx="40" cy="12" r="3" fill="#555"/><rect x="30" y="32" width="20" height="100" rx="3" fill={`url(#${gid("v")})`}/><rect x="32" y="34" width="6" height="80" rx="2" fill="rgba(255,255,255,0.07)"/></g></svg>);
  if (size === "20 ML") return (<svg viewBox="0 0 80 200" style={{width:"100%",height:"100%",maxHeight:160}}><defs><linearGradient id={gid("t")} x1="0" y1="0" x2="1" y2="0.2"><stop offset="0%" stopColor="#333"/><stop offset="35%" stopColor="#181818"/><stop offset="100%" stopColor="#111"/></linearGradient><filter id={gid("s")} x="-20%" y="-10%" width="140%" height="130%"><feDropShadow dx="2" dy="4" stdDeviation="4" floodOpacity="0.15"/></filter></defs><g filter={`url(#${gid("s")})`}><rect x="25" y="30" width="30" height="14" rx="3" fill="#1a1a1a"/><rect x="31" y="20" width="18" height="12" rx="4" fill="#282828"/><rect x="21" y="44" width="38" height="105" rx="5" fill={`url(#${gid("t")})`}/><rect x="24" y="47" width="10" height="85" rx="3" fill="rgba(255,255,255,0.05)"/></g></svg>);
  const h = size === "100 ML" ? 120 : 105; const y = size === "100 ML" ? 50 : 58;
  return (<svg viewBox="0 0 100 200" style={{width:"100%",height:"100%",maxHeight:160}}><defs><linearGradient id={gid("b")} x1="0" y1="0" x2="1" y2="0.15"><stop offset="0%" stopColor="#333"/><stop offset="30%" stopColor="#1a1a1a"/><stop offset="70%" stopColor="#0f0f0f"/><stop offset="100%" stopColor="#181818"/></linearGradient><filter id={gid("s")} x="-20%" y="-10%" width="140%" height="130%"><feDropShadow dx="3" dy="5" stdDeviation="5" floodOpacity="0.18"/></filter></defs><g filter={`url(#${gid("s")})`}><rect x="32" y={y-18} width="36" height="18" rx="4" fill="#1a1a1a"/><rect x="39" y={y-30} width="22" height="14" rx="5" fill="#252525"/><rect x="24" y={y} width="52" height={h} rx="6" fill={`url(#${gid("b")})`}/><rect x="28" y={y+4} width="14" height={h-18} rx="4" fill="rgba(255,255,255,0.05)"/></g></svg>);
}

function QtyInput({ value, onChange }) {
  const s = {width:32,height:32,border:"none",background:"transparent",cursor:"pointer",fontSize:14,color:"#888",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:FONT,padding:0};
  return (<div style={{display:"inline-flex",alignItems:"center",borderRadius:8,border:"1px solid #e0e0e0",overflow:"hidden",background:"#fff"}}><button className="da-qty-btn" onClick={()=>onChange(Math.max(0,value-1))} style={s}>−</button><input type="number" min="0" value={value} onChange={(e)=>onChange(Math.max(0,parseInt(e.target.value)||0))} style={{width:36,height:32,border:"none",borderLeft:"1px solid #eee",borderRight:"1px solid #eee",textAlign:"center",fontSize:12,fontWeight:500,fontFamily:FONT,outline:"none",background:"transparent",padding:0}}/><button className="da-qty-btn" onClick={()=>onChange(value+1)} style={s}>+</button></div>);
}

function FadeIn({ children, delay = 0, style = {} }) {
  return <div style={{animation:`fadeUp 0.6s cubic-bezier(0.23,1,0.32,1) ${delay}s both`,...style}}>{children}</div>;
}

function formatEUR(n) { return new Intl.NumberFormat("en-IE",{style:"currency",currency:"EUR",minimumFractionDigits:2}).format(n); }
function generateOrderNumber() { const d=new Date(); return `DA-${d.getFullYear().toString().slice(-2)}${String(d.getMonth()+1).padStart(2,"0")}-${Math.floor(Math.random()*9000)+1000}`; }

/* ═══════════════════════════════════════════
   TOAST
   ═══════════════════════════════════════════ */

function Toast({ message, visible, onHide }) {
  useEffect(() => { if (visible) { const t = setTimeout(onHide, 2800); return () => clearTimeout(t); } }, [visible, onHide]);
  if (!visible) return null;
  return (
    <div style={{position:"fixed",bottom:28,left:"50%",transform:"translateX(-50%)",background:"#000",color:"#fff",padding:"14px 28px",borderRadius:14,fontSize:12,fontWeight:500,letterSpacing:"0.04em",fontFamily:FONT,zIndex:100,boxShadow:"0 8px 32px rgba(0,0,0,0.3)",animation:"toastIn 0.3s ease",pointerEvents:"none",whiteSpace:"nowrap"}}>{message}</div>
  );
}

/* ═══════════════════════════════════════════
   CONFIRM MODAL
   ═══════════════════════════════════════════ */

function ConfirmModal({ open, title, message, confirmLabel, cancelLabel, onConfirm, onCancel, danger }) {
  if (!open) return null;
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,backdropFilter:"blur(4px)",animation:"fadeIn 0.15s ease"}} onClick={onCancel}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:20,padding:"36px 32px 28px",maxWidth:380,width:"90%",boxShadow:"0 20px 60px rgba(0,0,0,0.15)",animation:"scaleIn 0.2s ease"}}>
        <div style={{fontSize:15,fontWeight:600,marginBottom:8,fontFamily:FONT}}>{title}</div>
        <div style={{fontSize:13,color:"#666",lineHeight:1.7,marginBottom:28,fontFamily:FONT}}>{message}</div>
        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <button onClick={onCancel} style={{background:"transparent",border:"1px solid #e0e0e0",padding:"10px 20px",borderRadius:10,fontSize:11,letterSpacing:"0.08em",textTransform:"uppercase",cursor:"pointer",fontFamily:FONT,color:"#666"}}>{cancelLabel||"Cancel"}</button>
          <button onClick={onConfirm} style={{background:danger?"#dc2626":"#000",color:"#fff",border:"none",padding:"10px 24px",borderRadius:10,fontSize:11,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",cursor:"pointer",fontFamily:FONT}}>{confirmLabel||"Confirm"}</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   NOTE SECTION
   ═══════════════════════════════════════════ */

function NoteSection({ orderId, notes, isAdminView, noteInputs, setNoteInputs, addNote }) {
  return (
    <div style={{marginTop:20}}>
      <div style={{fontSize:10,textTransform:"uppercase",letterSpacing:"0.12em",color:"#999",marginBottom:10}}>Notes</div>
      {(notes||[]).map((n,i) => (
        <div key={i} style={{padding:"10px 14px",background:n.isAdmin?"#f8f8f8":"#fafafa",borderRadius:8,marginBottom:6,borderLeft:n.isAdmin?"3px solid #000":"3px solid #e0e0e0"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
            <span style={{fontSize:10,fontWeight:600,color:"#333"}}>{n.author}</span>
            <span style={{fontSize:9,color:"#bbb"}}>{new Date(n.date).toLocaleDateString("en-GB",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}</span>
          </div>
          <div style={{fontSize:12,color:"#555",lineHeight:1.6}}>{n.text}</div>
        </div>
      ))}
      <div style={{display:"flex",gap:8,marginTop:8}}>
        <input className="da-input" style={{...inputStyle,flex:1,padding:"10px 14px",fontSize:12}} placeholder="Add a note..." value={noteInputs[orderId]||""} onChange={e=>setNoteInputs(n=>({...n,[orderId]:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&addNote(orderId,isAdminView)} />
        <button onClick={()=>addNote(orderId,isAdminView)} style={{background:"#000",color:"#fff",border:"none",padding:"10px 18px",borderRadius:10,fontSize:10,fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase",cursor:"pointer",fontFamily:FONT,whiteSpace:"nowrap"}}>Add</button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   AUTH SCREEN
   ═══════════════════════════════════════════ */

function AuthScreen({ title, fields, onSubmit, submitLabel, altText, altAction, altLabel, authError, adminError, onBack }) {
  return (
    <div style={{...base,background:"#fff",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh"}}>
      <div style={{width:"100%",maxWidth:380,padding:"0 24px",boxSizing:"border-box"}}>
        <div style={{animation:"scaleIn 0.6s cubic-bezier(0.23,1,0.32,1) 0s both",textAlign:"center",marginBottom:48}}>
          <div style={{display:"flex",justifyContent:"center"}}><Logo style={{ height: 22 }} /></div>
          <div style={{fontSize:9,letterSpacing:"0.3em",textTransform:"uppercase",color:"#999",marginTop:20}}>{title}</div>
        </div>
        {authError && <div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:10,padding:"10px 16px",fontSize:12,color:"#dc2626",marginBottom:20,animation:"fadeUp 0.3s ease"}}>{authError}</div>}
        {adminError && <div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:10,padding:"10px 16px",fontSize:12,color:"#dc2626",marginBottom:20,animation:"fadeUp 0.3s ease"}}>{adminError}</div>}
        <FadeIn delay={0.15}>
          <div style={{display:"flex",flexDirection:"column",gap:16}}>{fields}</div>
        </FadeIn>
        <FadeIn delay={0.3}>
          <button className="da-btn" onClick={onSubmit} style={{width:"100%",background:"#000",color:"#fff",border:"none",padding:"16px",borderRadius:12,fontSize:11,fontWeight:600,letterSpacing:"0.15em",textTransform:"uppercase",cursor:"pointer",fontFamily:FONT,marginTop:24}}>{submitLabel}</button>
          {altText && <div style={{textAlign:"center",marginTop:20}}><button onClick={altAction} style={{background:"none",border:"none",fontSize:12,color:"#999",cursor:"pointer",fontFamily:FONT}}>{altText} <span style={{color:"#000",fontWeight:500}}>{altLabel}</span></button></div>}
          <div style={{textAlign:"center",marginTop:12}}><button onClick={onBack} style={{background:"none",border:"none",fontSize:11,color:"#ccc",cursor:"pointer",fontFamily:FONT}}>← Back</button></div>
        </FadeIn>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════════ */

export default function DeeAprilB2B() {
  useStyleInjection();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authForm, setAuthForm] = useState({ company:"", email:"", password:"" });
  const [authError, setAuthError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPw, setAdminPw] = useState("");
  const [adminError, setAdminError] = useState("");
  const [adminExpanded, setAdminExpanded] = useState(null);
  const [allOrders, setAllOrders] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [view, setView] = useState("landing");
  const [buyer, setBuyer] = useState({ company:"",address:"",city:"",country:"",zip:"",vat:"",email:"",contact:"" });
  const [orderNumber, setOrderNumber] = useState(generateOrderNumber);
  const [viewingOrderId, setViewingOrderId] = useState(null);
  const [invoiceSource, setInvoiceSource] = useState(null);
  const invoiceRef = useRef(null);

  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [promoCodes, setPromoCodes] = useState(PROMO_CODES_DEFAULT);
  const [promoError, setPromoError] = useState("");
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [adminPromoForm, setAdminPromoForm] = useState({ code: "", label: "", prices: { "100 ML": "", "50 ML": "", "20 ML": "", "2 ML": "", "KIT": "" } });

  const currentUser = session?.user ? {
    company: session.user.user_metadata?.company || "",
    email: session.user.email
  } : null;

  const [toast, setToast] = useState({ visible: false, message: "" });
  const showToast = useCallback((msg) => setToast({ visible: true, message: msg }), []);
  const hideToast = useCallback(() => setToast(t => ({ ...t, visible: false })), []);

  const [confirm, setConfirm] = useState({ open: false, title: "", message: "", onConfirm: null, danger: false, confirmLabel: "" });
  const askConfirm = (opts) => setConfirm({ open: true, ...opts });
  const closeConfirm = () => setConfirm(c => ({ ...c, open: false }));

  const [noteInputs, setNoteInputs] = useState({});

  const getQty = (sku) => quantities[sku] || 0;
  const setQty = (sku, val) => setQuantities((q) => ({ ...q, [sku]: val }));

  const orderLines = [];
  let totalWSP = 0;
  PRODUCTS.forEach((p) => p.variants.forEach((v) => {
    const qty = getQty(v.sku);
    if (qty > 0) {
      const unitPrice = appliedPromo?.discount_type === "fixed_prices" && appliedPromo.prices[v.size] !== undefined
        ? appliedPromo.prices[v.size]
        : v.wsp;
      orderLines.push({product:p.name,size:v.size,sku:v.sku,ean:v.ean,qty,unitPrice,total:qty*unitPrice});
      totalWSP += qty*unitPrice;
    }
  }));

  const vatInfo = getVatInfo(buyer.country, buyer.vat);
  const vatAmount = Math.round(totalWSP * vatInfo.rate * 100) / 100;
  const totalItems = orderLines.reduce((s,l) => s+l.qty, 0);
  const shippingAmount = totalItems > 0 ? SHIPPING_FLAT : 0;
  const totalBeforeShipping = totalWSP + vatAmount;
  const totalWithVat = totalBeforeShipping + shippingAmount;
  const depositAmount = Math.round(totalBeforeShipping * 0.3 * 100) / 100;
  const depositInvoiceTotal = depositAmount + shippingAmount;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setLoading(false);
      if (s) { loadProfile(s.user.id); loadOrders(); }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s) { loadProfile(s.user.id); loadOrders(); }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    loadPromoCodes();
  }, []);

  const loadPromoCodes = async () => {
    try {
      const { data, error } = await supabase.from("promo_codes").select("*");
      if (error) {
        setPromoCodes(PROMO_CODES_DEFAULT);
      } else if (data && data.length > 0) {
        setPromoCodes(data);
      } else {
        setPromoCodes(PROMO_CODES_DEFAULT);
      }
    } catch (e) {
      setPromoCodes(PROMO_CODES_DEFAULT);
    }
  };

  const loadProfile = async (userId) => {
    const { data } = await supabase.from("buyer_profiles").select("*").eq("user_id", userId).single();
    if (data) setBuyer({ company: data.company||"", contact: data.contact||"", address: data.address||"", city: data.city||"", country: data.country||"", zip: data.zip||"", vat: data.vat||"", email: data.email||"" });
  };

  const loadOrders = async () => {
    const { data: orders } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
    if (!orders) return;
    const { data: notes } = await supabase.from("order_notes").select("*").order("created_at", { ascending: true });
    const enriched = orders.map(o => ({
      id: o.id,
      date: o.created_at,
      buyer: { company: o.buyer_company, contact: o.buyer_contact, address: o.buyer_address, city: o.buyer_city, country: o.buyer_country, zip: o.buyer_zip, vat: o.buyer_vat, email: o.buyer_email },
      lines: o.lines || [],
      totalWSP: Number(o.total_wsp),
      vatInfo: { rate: Number(o.vat_rate), label: o.vat_label, note: o.vat_note },
      vatAmount: Number(o.vat_amount),
      shipping: Number(o.shipping_amount || o.shipping || 0),
      totalWithVat: Number(o.total_with_vat),
      depositAmount: Number(o.deposit_amount),
      balanceAmount: Number(o.balance_amount),
      statuses: {
        deposit_invoiced: o.status_deposit_invoiced,
        deposit_paid: o.status_deposit_paid,
        packed: o.status_packed,
        balance_invoiced: o.status_balance_invoiced,
        balance_paid: o.status_balance_paid,
        shipped: o.status_shipped,
        received: o.status_received,
      },
      userEmail: o.buyer_email,
      userId: o.user_id,
      cancelled: o.cancelled,
      promoCode: o.promo_code || null,
      promoLabel: o.promo_label || null,
      notes: (notes || []).filter(n => n.order_id === o.id).map(n => ({ text: n.text, author: n.author, date: n.created_at, isAdmin: n.is_admin })),
    }));
    setAllOrders(enriched);
  };

  const saveProfile = async () => {
    if (!session?.user) return;
    await supabase.from("buyer_profiles").upsert({
      user_id: session.user.id,
      company: buyer.company, contact: buyer.contact, address: buyer.address,
      city: buyer.city, country: buyer.country, zip: buyer.zip, vat: buyer.vat, email: buyer.email,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
  };

  const handleRegister = async () => {
    setAuthError("");
    if (!authForm.company || !authForm.email || !authForm.password) { setAuthError("All fields are required"); return; }
    if (authForm.password.length < 6) { setAuthError("Password must be at least 6 characters"); return; }
    const { data, error } = await supabase.auth.signUp({
      email: authForm.email,
      password: authForm.password,
      options: { data: { company: authForm.company } }
    });
    if (error) { setAuthError(error.message); return; }
    if (data.user) {
      await supabase.from("buyer_profiles").upsert({ user_id: data.user.id, company: authForm.company, email: authForm.email });
      setBuyer(b => ({...b, company: authForm.company, email: authForm.email}));
    }
    setAuthForm({company:"",email:"",password:""}); setView("catalog");
    showToast("Account created successfully");
  };

  const handleLogin = async () => {
    setAuthError("");
    if (!authForm.email || !authForm.password) { setAuthError("Email and password required"); return; }
    const { data, error } = await supabase.auth.signInWithPassword({
      email: authForm.email,
      password: authForm.password,
    });
    if (error) { setAuthError(error.message); return; }
    setAuthForm({company:"",email:"",password:""}); setView("catalog");
    showToast("Welcome back, " + (data.user?.user_metadata?.company || ""));
  };

  const handleLogout = async () => {
    await saveProfile();
    await supabase.auth.signOut();
    setSession(null); setIsAdmin(false); setQuantities({}); setView("landing");
    setBuyer({company:"",address:"",city:"",country:"",zip:"",vat:"",email:"",contact:""});
    setOrderNumber(generateOrderNumber());
    setPromoCode(""); setAppliedPromo(null);
  };

  const handleResetPassword = async () => {
    setAuthError("");
    if (!authForm.email) { setAuthError("Enter your email address"); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(authForm.email, {
      redirectTo: window.location.origin,
    });
    if (error) { setAuthError(error.message); return; }
    setView("reset_sent");
  };

  const handleAdminLogin = () => {
    if (adminPw === ADMIN_PASSWORD) { setIsAdmin(true); setAdminError(""); setView("admin"); loadOrders(); }
    else setAdminError("Incorrect password");
  };

  const applyPromoCode = () => {
    setPromoError("");
    const code = promoCodeInput.trim().toUpperCase();
    if (!code) { setPromoError("Enter a promo code"); return; }
    const found = promoCodes.find(p => p.code.toUpperCase() === code);
    if (!found) { setPromoError("Invalid code"); return; }
    setAppliedPromo(found);
    setPromoCode(code);
    showToast(`✓ ${found.label} pricing applied`);
    setPromoCodeInput("");
  };

  const handleSubmitOrder = async () => {
    await saveProfile();
    const { error } = await supabase.from("orders").insert({
      id: orderNumber,
      user_id: session?.user?.id,
      buyer_company: buyer.company, buyer_contact: buyer.contact, buyer_address: buyer.address,
      buyer_city: buyer.city, buyer_country: buyer.country, buyer_zip: buyer.zip,
      buyer_vat: buyer.vat, buyer_email: buyer.email,
      lines: orderLines,
      total_wsp: totalWSP, vat_rate: vatInfo.rate, vat_label: vatInfo.label, vat_note: vatInfo.note,
      vat_amount: vatAmount, shipping_amount: shippingAmount, total_with_vat: totalWithVat,
      deposit_amount: depositAmount, balance_amount: Math.round((totalBeforeShipping - depositAmount) * 100) / 100,
      promo_code: appliedPromo?.code || null,
      promo_label: appliedPromo?.label || null,
    });
    if (error) { showToast("Error: " + error.message); return; }

    // TODO: Email notification to sales@deeapril.com
    // Option A: Supabase Database Webhook → sends POST to an email service (e.g., Resend, SendGrid)
    // Option B: Supabase Edge Function triggered by INSERT on orders table
    // Option C: Simple fetch to an email API endpoint after order insert
    // Uncomment and configure when email endpoint is ready:
    // fetch("https://YOUR_EMAIL_ENDPOINT", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ to: "sales@deeapril.com", subject: `New Order ${orderNumber}`, orderNumber, buyer: buyer, total: totalWithVat }) });

    await loadOrders();
    setView("invoice");
    showToast("Order placed — " + orderNumber);
  };

  const handleViewInvoice = (orderId, source) => { setViewingOrderId(orderId); setInvoiceSource(source); setView("invoice"); };

  const toggleOrderStatus = async (orderId, key) => {
    const order = allOrders.find(o => o.id === orderId);
    if (!order) return;
    const dbKey = "status_" + key;
    await supabase.from("orders").update({ [dbKey]: !order.statuses[key] }).eq("id", orderId);
    setAllOrders(prev => prev.map(o => o.id === orderId ? {...o, statuses:{...o.statuses,[key]:!o.statuses[key]}} : o));
  };

  const restoreOrder = async (orderId) => {
    await supabase.from("orders").update({ cancelled: false }).eq("id", orderId);
    setAllOrders(prev => prev.map(o => o.id === orderId ? {...o, cancelled:false} : o));
    showToast("Order " + orderId + " restored");
  };

  const deleteOrder = (orderId) => {
    askConfirm({
      title: "Delete Order Permanently",
      message: `This will permanently delete order ${orderId}. This cannot be undone.`,
      confirmLabel: "Delete",
      danger: true,
      onConfirm: async () => {
        await supabase.from("orders").delete().eq("id", orderId);
        setAllOrders(prev => prev.filter(o => o.id !== orderId));
        closeConfirm();
        showToast("Order " + orderId + " deleted");
      }
    });
  };

    const cancelOrder = (orderId) => {
    askConfirm({
      title: "Cancel Order",
      message: `Are you sure you want to cancel order ${orderId}? This action cannot be undone.`,
      confirmLabel: "Cancel Order",
      danger: true,
      onConfirm: async () => {
        await supabase.from("orders").update({ cancelled: true }).eq("id", orderId);
        setAllOrders(prev => prev.map(o => o.id === orderId ? {...o, cancelled:true} : o));
        closeConfirm();
        showToast("Order " + orderId + " cancelled");
      }
    });
  };

  const canClientCancel = (order) => {
    if (order.cancelled) return false;
    const s = order.statuses;
    return s.deposit_invoiced && !s.deposit_paid && !s.packed && !s.balance_invoiced && !s.balance_paid && !s.shipped && !s.received;
  };

  const repeatOrder = (order) => {
    const newQtys = {};
    order.lines.forEach(l => { newQtys[l.sku] = l.qty; });
    setQuantities(newQtys);
    setBuyer({...order.buyer});
    setOrderNumber(generateOrderNumber());
    if (order.promoCode) {
      const promo = promoCodes.find(p => p.code === order.promoCode);
      if (promo) { setAppliedPromo(promo); setPromoCode(order.promoCode); }
    }
    setView("checkout");
    showToast("Order duplicated — review and confirm");
  };

  const addNote = async (orderId, isAdminView) => {
    const text = (noteInputs[orderId] || "").trim();
    if (!text) return;
    const author = isAdminView ? "Admin" : (currentUser?.company || "Buyer");
    await supabase.from("order_notes").insert({ order_id: orderId, text, author, is_admin: isAdminView });
    setAllOrders(prev => prev.map(o => o.id === orderId ? {...o, notes: [...(o.notes||[]), { text, author, date: new Date().toISOString(), isAdmin: isAdminView }]} : o));
    setNoteInputs(n => ({...n, [orderId]: ""}));
    showToast("Note added");
  };

  const exportCSV = () => {
    const rows = [["Order ID","Date","Company","Email","Country","VAT Number","Items","Subtotal","VAT","Shipping","Total","Deposit","Status","Promo Code","Cancelled"]];
    allOrders.forEach(o => {
      const items = o.lines.map(l => `${l.product} ${l.size} x${l.qty}`).join("; ");
      const statusStr = ORDER_STATUSES.filter(s => o.statuses[s.key]).map(s => s.label).join(", ");
      rows.push([o.id, new Date(o.date).toLocaleDateString("en-GB"), o.buyer.company, o.buyer.email, o.buyer.country, o.buyer.vat||"", items, o.totalWSP.toFixed(2), o.vatAmount.toFixed(2), o.shipping.toFixed(2), o.totalWithVat.toFixed(2), o.depositAmount.toFixed(2), statusStr, o.promoCode||"", o.cancelled?"Yes":"No"]);
    });
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], {type:"text/csv"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `dee-april-orders-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    showToast("CSV exported");
  };

  const handlePrint = () => {
    const c = invoiceRef.current; if (!c) return;
    const w = window.open("","_blank","width=800,height=1100");
    w.document.write(`<!DOCTYPE html><html><head><title>Invoice — Dee April</title><style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#000;padding:28px 32px;font-size:11px;line-height:1.5;}
table{border-collapse:collapse;width:100%;}
@page{margin:14mm 16mm;size:A4;}
@media print{body{padding:0;font-size:10.5px;line-height:1.4;}}
</style></head><body>${c.innerHTML}</body></html>`);
    w.document.close(); setTimeout(() => w.print(), 400);
  };

  const savePromoCode = async () => {
    if (!adminPromoForm.code.trim()) { showToast("Code required"); return; }
    if (!adminPromoForm.label.trim()) { showToast("Label required"); return; }
    const prices = {};
    let allFilled = true;
    ["100 ML", "50 ML", "20 ML", "2 ML", "KIT"].forEach(size => {
      const p = parseFloat(adminPromoForm.prices[size]);
      if (isNaN(p) || p < 0) allFilled = false;
      else prices[size] = p;
    });
    if (!allFilled) { showToast("All prices must be valid numbers"); return; }
    const newPromo = { code: adminPromoForm.code.toUpperCase(), label: adminPromoForm.label, discount_type: "fixed_prices", prices };
    try {
      await supabase.from("promo_codes").insert(newPromo);
    } catch (e) {
      setPromoCodes(prev => [...prev, newPromo]);
    }
    setAdminPromoForm({ code: "", label: "", prices: { "100 ML": "", "50 ML": "", "20 ML": "", "2 ML": "", "KIT": "" } });
    await loadPromoCodes();
    showToast("Promo code saved");
  };

  const deletePromoCode = async (code) => {
    try {
      await supabase.from("promo_codes").delete().eq("code", code);
    } catch (e) {}
    setPromoCodes(prev => prev.filter(p => p.code !== code));
    showToast("Promo code deleted");
  };

  useEffect(() => { if (view === "admin" || view === "myorders") loadOrders(); }, [view]);

  const Header = ({ right }) => (
    <div className="da-header-pad" style={{background:"#fff",padding:"20px 48px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid #eee",position:"sticky",top:0,zIndex:20,backdropFilter:"blur(12px)",flexWrap:"wrap",gap:12}}>
      <div style={{cursor:"pointer"}} onClick={() => currentUser ? setView("catalog") : setView("landing")}>
        <Logo style={{ height: 22 }} />
      </div>
      {right}
    </div>
  );

  const UserNav = () => (
    <div className="da-nav-full" style={{display:"flex",alignItems:"center",gap:16}}>
      <button onClick={()=>setView("catalog")} style={{background:"none",border:"none",fontSize:11,color:"#666",cursor:"pointer",fontFamily:FONT,letterSpacing:"0.06em",textDecoration:view==="catalog"?"underline":"none",textUnderlineOffset:3}}>Catalog</button>
      <span style={{fontSize:10,color:"#ccc"}}>|</span>
      <button onClick={()=>setView("myorders")} style={{background:"none",border:"none",fontSize:11,color:"#666",cursor:"pointer",fontFamily:FONT,letterSpacing:"0.06em",textDecoration:view==="myorders"?"underline":"none",textUnderlineOffset:3}}>My Orders</button>
      <span style={{fontSize:10,color:"#ccc"}}>|</span>
      <button onClick={()=>setView("profile")} style={{background:"none",border:"none",fontSize:11,color:"#666",cursor:"pointer",fontFamily:FONT,letterSpacing:"0.06em",textDecoration:view==="profile"?"underline":"none",textUnderlineOffset:3}}>Profile</button>
      <span style={{fontSize:10,color:"#ccc"}}>|</span>
      <span style={{fontSize:11,color:"#666"}}>{currentUser?.company}</span>
      <button onClick={handleLogout} style={{background:"none",border:"1px solid #e0e0e0",padding:"6px 14px",borderRadius:8,fontSize:10,color:"#999",cursor:"pointer",fontFamily:FONT,letterSpacing:"0.08em",textTransform:"uppercase"}}>Sign Out</button>
    </div>
  );

  if (loading) return (
    <div style={{...base,display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh"}}>
      <div style={{textAlign:"center"}}>
        <Logo style={{ height: 28, opacity: 0.3 }} />
        <div style={{fontSize:11,color:"#ccc",marginTop:16,letterSpacing:"0.1em",textTransform:"uppercase"}}>Loading...</div>
      </div>
    </div>
  );

  if (view === "landing") return (
    <div style={{...base,background:"linear-gradient(180deg,rgba(0,0,0,0.75) 0%,rgba(0,0,0,0.6) 50%,rgba(0,0,0,0.8) 100%)",backgroundImage:`linear-gradient(180deg,rgba(0,0,0,0.75) 0%,rgba(0,0,0,0.6) 50%,rgba(0,0,0,0.8) 100%), url("https://gsojazybzodouvdmqkvg.supabase.co/storage/v1/object/sign/DA%20Assets/cover.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV80ZTU5ZWYwMS1lNDhiLTQ2ZTAtYjVmOS0yMTU4NDRhM2EzZGEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJEQSBBc3NldHMvY292ZXIucG5nIiwiaWF0IjoxNzc0NTcxNzg4LCJleHAiOjE4MDYxMDc3ODh9.ErG-m6CDQLcINabcW3oOIle3uPWr6JFqWeHsv6wVNxw")`,backgroundSize:"cover",backgroundPosition:"center top",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh",padding:"40px 20px"}}>
      <div style={{textAlign:"center",maxWidth:520,width:"100%"}}>
        <div style={{animation:"scaleIn 0.8s cubic-bezier(0.23,1,0.32,1) 0s both",display:"flex",justifyContent:"center"}}>
          <Logo color="#fff" style={{ height: 36 }} />
        </div>
        <FadeIn delay={0.5} style={{textAlign:"center"}}>
          <div style={{fontSize:14,color:"rgba(255,255,255,0.7)",lineHeight:1.8,marginBottom:48,marginTop:40}}>
            <div style={{fontWeight:600,color:"#fff",marginBottom:12,fontSize:15,letterSpacing:"0.04em"}}>B2B Wholesale Portal</div>
            <div style={{marginBottom:16}}>Browse the collection, place orders, and receive deposit invoices — all in one place.</div>
            <div style={{fontSize:12,color:"rgba(255,255,255,0.4)",lineHeight:1.8}}>
              <span style={{fontWeight:500,color:"rgba(255,255,255,0.6)"}}>How it works:</span> Create an account, browse Chapter I at wholesale prices, select quantities and generate a 30% deposit invoice. Once confirmed, we ship with the remaining 70% invoiced before dispatch.
            </div>
          </div>
        </FadeIn>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <button className="da-btn" onClick={()=>setView("register")} style={{width:"100%",background:"#fff",color:"#000",border:"none",padding:"16px",borderRadius:12,fontSize:11,fontWeight:600,letterSpacing:"0.15em",textTransform:"uppercase",cursor:"pointer",fontFamily:FONT,animation:"slideUp 0.6s cubic-bezier(0.23,1,0.32,1) 0.2s both"}}>Create Account</button>
          <button className="da-btn" onClick={()=>setView("login")} style={{width:"100%",background:"transparent",color:"#fff",border:"1px solid rgba(255,255,255,0.3)",padding:"16px",borderRadius:12,fontSize:11,fontWeight:600,letterSpacing:"0.15em",textTransform:"uppercase",cursor:"pointer",fontFamily:FONT,animation:"slideUp 0.6s cubic-bezier(0.23,1,0.32,1) 0.3s both"}}>Sign In</button>
          <button className="da-btn" onClick={()=>setView("adminlogin")} style={{width:"100%",background:"transparent",color:"rgba(255,255,255,0.5)",border:"none",padding:"16px",borderRadius:12,fontSize:10,letterSpacing:"0.15em",textTransform:"uppercase",cursor:"pointer",fontFamily:FONT,animation:"slideUp 0.6s cubic-bezier(0.23,1,0.32,1) 0.4s both"}}>Admin</button>
        </div>
      </div>
    </div>
  );

  if (view === "register") return <AuthScreen title="New Account" fields={[<div key="co"><label style={labelStyle}>Company Name *</label><input className="da-input" style={inputStyle} value={authForm.company} onChange={e=>setAuthForm({...authForm,company:e.target.value})} placeholder="Your company"/></div>,<div key="em"><label style={labelStyle}>Email *</label><input className="da-input" style={inputStyle} type="email" value={authForm.email} onChange={e=>setAuthForm({...authForm,email:e.target.value})} placeholder="name@company.com"/></div>,<div key="pw"><label style={labelStyle}>Password *</label><input className="da-input" style={inputStyle} type="password" value={authForm.password} onChange={e=>setAuthForm({...authForm,password:e.target.value})} placeholder="Min. 6 characters"/></div>]} onSubmit={handleRegister} submitLabel="Create Account" altText="Already have an account?" altAction={()=>setView("login")} altLabel="Sign In" authError={authError} onBack={()=>setView("landing")} />;

  if (view === "login") return <AuthScreen title="Sign In" fields={[<div key="em"><label style={labelStyle}>Email *</label><input className="da-input" style={inputStyle} type="email" value={authForm.email} onChange={e=>setAuthForm({...authForm,email:e.target.value})} placeholder="name@company.com"/></div>,<div key="pw"><label style={labelStyle}>Password *</label><input className="da-input" style={inputStyle} type="password" value={authForm.password} onChange={e=>setAuthForm({...authForm,password:e.target.value})} placeholder="Password"/></div>]} onSubmit={handleLogin} submitLabel="Sign In" altText="Need an account?" altAction={()=>setView("register")} altLabel="Create one" authError={authError} onBack={()=>setView("landing")} />;

  if (view === "adminlogin") return <AuthScreen title="Admin Access" fields={[<div key="pw"><label style={labelStyle}>Admin Password</label><input className="da-input" style={inputStyle} type="password" value={adminPw} onChange={e=>setAdminPw(e.target.value)} placeholder="Password"/></div>]} onSubmit={handleAdminLogin} submitLabel="Enter Admin" adminError={adminError} onBack={()=>setView("landing")} />;

  if (view === "reset_sent") return <AuthScreen title="Password Reset Sent" fields={[<div key="msg" style={{fontSize:12,color:"#666",textAlign:"center",lineHeight:1.8}}>Check your email for a password reset link. You can safely close this window.</div>]} submitLabel="Back to Login" onSubmit={()=>setView("login")} onBack={()=>setView("landing")} />;

  if (view === "profile") return (
    <div style={base}>
      <Header right={<UserNav />} />
      <FadeIn delay={0.1}><div className="da-pad" style={{maxWidth:600,margin:"0 auto",padding:"48px 48px"}}>
        <div style={{fontSize:17,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:32}}>My Profile</div>
        <div style={{display:"grid",gap:18,marginBottom:32}}>
          <div><label style={labelStyle}>Company Name</label><input className="da-input" style={inputStyle} value={buyer.company} onChange={e=>setBuyer({...buyer,company:e.target.value})}/></div>
          <div><label style={labelStyle}>Contact Person</label><input className="da-input" style={inputStyle} value={buyer.contact} onChange={e=>setBuyer({...buyer,contact:e.target.value})}/></div>
          <div><label style={labelStyle}>Address</label><input className="da-input" style={inputStyle} value={buyer.address} onChange={e=>setBuyer({...buyer,address:e.target.value})}/></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <div><label style={labelStyle}>City</label><input className="da-input" style={inputStyle} value={buyer.city} onChange={e=>setBuyer({...buyer,city:e.target.value})}/></div>
            <div><label style={labelStyle}>ZIP / Postal Code</label><input className="da-input" style={inputStyle} value={buyer.zip} onChange={e=>setBuyer({...buyer,zip:e.target.value})}/></div>
          </div>
          <div><label style={labelStyle}>Country</label><input className="da-input" style={inputStyle} value={buyer.country} onChange={e=>setBuyer({...buyer,country:e.target.value})}/></div>
          <div><label style={labelStyle}>VAT Number</label><input className="da-input" style={inputStyle} value={buyer.vat} onChange={e=>setBuyer({...buyer,vat:e.target.value})}/></div>
          <div><label style={labelStyle}>Email</label><input className="da-input" style={{...inputStyle,background:"#f5f5f5"}} disabled value={buyer.email}/></div>
        </div>
        <div style={{display:"flex",gap:10}}>
          <button className="da-btn" onClick={()=>{saveProfile();showToast("Profile updated");}} style={{background:"#000",color:"#fff",border:"none",padding:"15px 28px",borderRadius:12,fontSize:11,fontWeight:600,letterSpacing:"0.15em",textTransform:"uppercase",cursor:"pointer",fontFamily:FONT}}>Save Changes</button>
          <button className="da-btn da-btn-outline" onClick={()=>setView("catalog")} style={{background:"transparent",border:"1px solid #ddd",padding:"15px 28px",borderRadius:12,fontSize:11,letterSpacing:"0.1em",textTransform:"uppercase",cursor:"pointer",fontFamily:FONT,color:"#333",transition:"all 0.25s"}}>Back</button>
        </div>
      </div></FadeIn>
      <Toast message={toast.message} visible={toast.visible} onHide={hideToast} />
    </div>
  );

  if (view === "catalog") return (
    <div style={base}>
      <Header right={<UserNav />} />
      <FadeIn delay={0.1}><div className="da-pad" style={{margin:"24px 48px 0",padding:"14px 24px",background:"#fff",borderRadius:12,fontSize:11,color:"#888",display:"flex",justifyContent:"space-between",alignItems:"center",border:"1px solid #f0f0f0",flexWrap:"wrap",gap:8}}><span>All prices wholesale (WSP), excl. VAT · VAT applied at checkout based on location</span><span style={{fontWeight:500,color:"#666"}}>EUR</span></div></FadeIn>
      <div className="da-pad" style={{padding:"32px 48px 120px"}}>
        {PRODUCTS.map((product,pi) => {
          const isSingleVariant = product.variants.length === 1;
          return (
          <FadeIn key={pi} delay={0.15+pi*0.1} style={{marginBottom:pi<PRODUCTS.length-1?56:0}}>
            <div style={{display:"flex",alignItems:"baseline",gap:12,marginBottom:24,flexWrap:"wrap"}}>
              <span style={{fontSize:17,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase"}}>{product.name}</span>
              <span style={{fontSize:10,letterSpacing:"0.15em",textTransform:"uppercase",color:"#bbb"}}>{product.collection}</span>
            </div>
            <div className="da-grid-4" style={{display:"grid",gridTemplateColumns:"repeat(4, 1fr)",gap:24}}>
              {product.variants.map((v,vi) => {
                const qty = getQty(v.sku);
                return (
                  <div key={vi} style={{display:"flex",flexDirection:"column"}}>
                    <div style={{background:"#f0f0f0",aspectRatio:"1/1",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:20,overflow:"hidden"}}>
                      {PRODUCT_IMAGES[v.size] ? <img src={PRODUCT_IMAGES[v.size]} alt={v.size} style={{width:"100%",height:"100%",objectFit:"cover"}} /> : <BottleSVG size={v.size} uniqueId={`${pi}_${vi}`} />}
                    </div>
                    <div style={{fontSize:12,lineHeight:1.9,color:"#333",flex:1}}>
                      <div><span style={{fontWeight:700}}>SIZE</span> {v.size}</div>
                      <div><span style={{fontWeight:700}}>SKU</span> {v.sku}</div>
                      {v.ean ? <div><span style={{fontWeight:700}}>EAN</span> {v.ean}</div> : null}
                      {v.rrp ? <div><span style={{fontWeight:700}}>RRP</span> EUR {v.rrp}</div> : <div style={{fontWeight:700,fontSize:11,color:"#999",fontStyle:"italic"}}>NOT FOR RETAIL SALE</div>}
                      <div><span style={{fontWeight:700}}>WSP</span> EUR {v.wsp}</div>
                    </div>
                    <div style={{marginTop:12}}><QtyInput value={qty} onChange={val => setQty(v.sku, val)} /></div>
                  </div>
                );
              })}
            </div>
          </FadeIn>
        );
        })}
      </div>
      {totalItems > 0 && (
        <div className="da-floating-bar" style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",background:"#000",color:"#fff",borderRadius:20,padding:"16px 20px 16px 28px",display:"flex",alignItems:"center",gap:24,boxShadow:"0 8px 40px rgba(0,0,0,0.25)",animation:"slideUpCenter 0.4s cubic-bezier(0.23,1,0.32,1)",zIndex:30,maxWidth:520}}>
          <div style={{display:"flex",alignItems:"baseline",gap:10,whiteSpace:"nowrap"}}>
            <span style={{fontSize:12,opacity:0.6}}>{totalItems} item{totalItems!==1?"s":""}</span>
            <span style={{fontSize:18,fontWeight:600,letterSpacing:"0.02em"}}>{formatEUR(totalWSP)}</span>
            <span style={{fontSize:10,opacity:0.4}}>excl. VAT</span>
          </div>
          <button className="da-btn" onClick={()=>setView("checkout")} style={{background:"#fff",color:"#000",border:"none",padding:"11px 28px",borderRadius:12,fontSize:11,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",cursor:"pointer",fontFamily:FONT,whiteSpace:"nowrap"}}>Proceed</button>
        </div>
      )}
      <Toast message={toast.message} visible={toast.visible} onHide={hideToast} />
    </div>
  );

  if (view === "checkout") {
    const canSubmit = buyer.company && buyer.address && buyer.city && buyer.country && buyer.email;
    return (
      <div style={base}>
        <Header right={<UserNav />} />
        <div className="da-grid-checkout" style={{display:"grid",gridTemplateColumns:"1fr 380px",gap:0,minHeight:"calc(100vh - 80px)"}}>
          <FadeIn delay={0.1}><div className="da-pad" style={{padding:"40px 48px"}}>
            <div style={{fontSize:13,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:6}}>Promo Code</div>
            <div style={{display:"flex",gap:8,marginBottom:28}}>
              <input className="da-input" style={{...inputStyle,flex:1}} placeholder="MOODSCENTBAR" value={promoCodeInput} onChange={e=>setPromoCodeInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&applyPromoCode()} />
              <button onClick={applyPromoCode} style={{background:"#000",color:"#fff",border:"none",padding:"12px 20px",borderRadius:10,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:FONT,whiteSpace:"nowrap"}}>Apply</button>
            </div>
            {appliedPromo && <div style={{padding:"10px 14px",background:"#f0f8f0",border:"1px solid #d0e0d0",borderRadius:10,fontSize:11,color:"#2d6a2d",marginBottom:20,fontWeight:500}}>✓ {appliedPromo.label} pricing applied</div>}
            {promoError && <div style={{padding:"10px 14px",background:"#fef2f2",border:"1px solid #fecaca",borderRadius:10,fontSize:11,color:"#dc2626",marginBottom:20}}>{promoError}</div>}
            <div style={{fontSize:13,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:6}}>Buyer Details</div>
            <div style={{fontSize:11,color:"#aaa",marginBottom:24}}>Company details for deposit invoice generation</div>
            <div style={{display:"grid",gap:18,maxWidth:500}}>
              <div><label style={labelStyle}>Company Name *</label><input className="da-input" style={inputStyle} value={buyer.company} onChange={e=>setBuyer({...buyer,company:e.target.value})} placeholder="Company Ltd."/></div>
              <div><label style={labelStyle}>Contact Person</label><input className="da-input" style={inputStyle} value={buyer.contact} onChange={e=>setBuyer({...buyer,contact:e.target.value})} placeholder="Full name"/></div>
              <div><label style={labelStyle}>Address *</label><input className="da-input" style={inputStyle} value={buyer.address} onChange={e=>setBuyer({...buyer,address:e.target.value})} placeholder="Street address"/></div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                <div><label style={labelStyle}>City *</label><input className="da-input" style={inputStyle} value={buyer.city} onChange={e=>setBuyer({...buyer,city:e.target.value})}/></div>
                <div><label style={labelStyle}>ZIP / Postal Code</label><input className="da-input" style={inputStyle} value={buyer.zip} onChange={e=>setBuyer({...buyer,zip:e.target.value})}/></div>
              </div>
              <div><label style={labelStyle}>Country *</label><input className="da-input" style={inputStyle} value={buyer.country} onChange={e=>setBuyer({...buyer,country:e.target.value})} placeholder="e.g. France, Denmark, USA"/></div>
              <div><label style={labelStyle}>VAT Number</label><input className="da-input" style={inputStyle} value={buyer.vat} onChange={e=>setBuyer({...buyer,vat:e.target.value})} placeholder="e.g. DK12345678"/><div style={{fontSize:10,color:"#bbb",marginTop:6,lineHeight:1.5}}>EU buyers: provide valid VAT number for reverse charge (0% VAT)</div></div>
              <div><label style={labelStyle}>Email *</label><input className="da-input" style={inputStyle} type="email" value={buyer.email} onChange={e=>setBuyer({...buyer,email:e.target.value})}/></div>
            </div>
            {buyer.country && <FadeIn delay={0} style={{marginTop:24}}><div style={{padding:"14px 18px",background:"#f8f8f8",borderRadius:10,border:"1px solid #f0f0f0",fontSize:11,lineHeight:1.6}}><div style={{fontWeight:600,color:"#000",marginBottom:4}}>{vatInfo.label}</div><div style={{color:"#888"}}>{vatInfo.note}</div></div></FadeIn>}
          </div></FadeIn>
          <FadeIn delay={0.2}><div className="da-checkout-summary da-pad" style={{padding:"32px 28px",background:"#fafafa",borderLeft:"1px solid #f0f0f0",minHeight:"100%"}}>
            <div style={{fontSize:11,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:20,color:"#666"}}>Order Summary</div>
            <div style={{marginBottom:20}}>{orderLines.map((line,i)=>(<div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",padding:"10px 0",borderBottom:"1px solid #eee",fontSize:12}}><div><div style={{fontWeight:500}}>{line.product}</div><div style={{color:"#bbb",fontSize:10,marginTop:2}}>{SIZE_LABELS[line.size]}</div></div><div style={{textAlign:"right"}}><div style={{color:"#888",fontSize:11}}>{line.qty} × {formatEUR(line.unitPrice)}</div><div style={{fontWeight:600,marginTop:1}}>{formatEUR(line.total)}</div></div></div>))}</div>
            <div style={{paddingTop:16,borderTop:"1px solid #eee"}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:8,color:"#666"}}><span>Subtotal (excl. VAT)</span><span style={{fontWeight:500,color:"#333"}}>{formatEUR(totalWSP)}</span></div>
              {vatAmount>0&&<div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:8,color:"#666"}}><span>{vatInfo.label}</span><span style={{fontWeight:500,color:"#333"}}>{formatEUR(vatAmount)}</span></div>}
              {vatInfo.rate===0&&buyer.country&&<div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:8,color:"#999"}}><span>VAT</span><span>{vatInfo.label}</span></div>}
              {shippingAmount>0&&<div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:8,color:"#666"}}><span>Shipping</span><span style={{fontWeight:500,color:"#333"}}>{formatEUR(shippingAmount)}</span></div>}
              <div style={{display:"flex",justifyContent:"space-between",fontSize:13,fontWeight:600,paddingTop:8,borderTop:"1px solid #eee"}}><span>Total</span><span>{formatEUR(totalWithVat)}</span></div>
            </div>
            <div style={{marginTop:14,padding:"16px 0 0",borderTop:"2px solid #000"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}><div><div style={{fontSize:10,textTransform:"uppercase",letterSpacing:"0.1em",color:"#999"}}>Deposit Invoice</div><div style={{fontSize:10,color:"#bbb",marginTop:2}}>30% advance + shipping</div></div><span style={{fontSize:20,fontWeight:600}}>{formatEUR(depositInvoiceTotal)}</span></div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10,marginTop:24}}>
              <button className="da-btn" onClick={()=>{if(canSubmit){askConfirm({title:"Confirm Order",message:`You are about to place order ${orderNumber} for ${formatEUR(totalWithVat)}. A 30% deposit invoice (${formatEUR(depositAmount)}) will be generated.`,confirmLabel:"Place Order",danger:false,onConfirm:async ()=>{closeConfirm();await handleSubmitOrder();}});}}} disabled={!canSubmit} style={{width:"100%",background:canSubmit?"#000":"#e0e0e0",color:canSubmit?"#fff":"#999",border:"none",padding:"14px",borderRadius:12,fontSize:11,fontWeight:600,letterSpacing:"0.15em",textTransform:"uppercase",cursor:canSubmit?"pointer":"default",fontFamily:FONT}}>Place Order & Generate Invoice</button>
              <button className="da-btn da-btn-outline" onClick={()=>setView("catalog")} style={{width:"100%",background:"transparent",border:"1px solid #ddd",padding:"12px",borderRadius:12,fontSize:11,letterSpacing:"0.1em",textTransform:"uppercase",cursor:"pointer",fontFamily:FONT,color:"#333",transition:"all 0.25s"}}>Back to Catalog</button>
            </div>
          </div></FadeIn>
        </div>
        <Toast message={toast.message} visible={toast.visible} onHide={hideToast} />
        <ConfirmModal {...confirm} onCancel={closeConfirm} />
      </div>
    );
  }

  if (view === "myorders") return (
    <div style={base}>
      <Header right={<UserNav />} />
      <FadeIn delay={0.1}><div className="da-pad" style={{padding:"48px 48px"}}>
        <div style={{fontSize:17,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:32}}>My Orders</div>
        {allOrders.filter(o => o.userId === session?.user?.id).length === 0 ? (
          <div style={{padding:"40px",textAlign:"center",color:"#999"}}>No orders yet. <button onClick={()=>setView("catalog")} style={{background:"none",border:"none",color:"#000",textDecoration:"underline",cursor:"pointer",fontFamily:FONT}}>Start shopping</button></div>
        ) : (
          <div style={{display:"grid",gap:24}}>
            {allOrders.filter(o => o.userId === session?.user?.id).map(order => (
              <div key={order.id} style={{background:"#fff",borderRadius:12,border:"1px solid #e0e0e0",padding:"24px"}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:16,alignItems:"start",marginBottom:16}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:600,marginBottom:6}}>{order.id}</div>
                    <div style={{fontSize:11,color:"#666"}}>{new Date(order.date).toLocaleDateString("en-GB")}</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:13,fontWeight:600}}>{formatEUR(order.totalWithVat)}</div>
                    <div style={{fontSize:10,color:"#999"}}>incl. shipping &amp; VAT</div>
                  </div>
                </div>
                <div style={{fontSize:12,color:"#666",marginBottom:12,paddingBottom:12,borderBottom:"1px solid #f0f0f0"}}>
                  {order.lines.map((l,i) => <div key={i}>{l.product} — {SIZE_LABELS[l.size]} x{l.qty}</div>)}
                </div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  <button className="da-btn da-btn-outline" onClick={()=>handleViewInvoice(order.id,"myorders")} style={{background:"transparent",border:"1px solid #ddd",padding:"9px 20px",borderRadius:10,fontSize:10,color:"#333",cursor:"pointer",fontFamily:FONT,letterSpacing:"0.08em",textTransform:"uppercase",transition:"all 0.25s"}}>View Invoice</button>
                  <button className="da-btn da-btn-outline" onClick={()=>repeatOrder(order)} style={{background:"transparent",border:"1px solid #ddd",padding:"9px 20px",borderRadius:10,fontSize:10,color:"#333",cursor:"pointer",fontFamily:FONT,letterSpacing:"0.08em",textTransform:"uppercase",transition:"all 0.25s"}}>Repeat Order</button>
                  {canClientCancel(order) && <button className="da-btn da-btn-outline" onClick={()=>cancelOrder(order.id)} style={{background:"transparent",border:"1px solid #dc2626",padding:"9px 20px",borderRadius:10,fontSize:10,color:"#dc2626",cursor:"pointer",fontFamily:FONT,letterSpacing:"0.08em",textTransform:"uppercase",transition:"all 0.25s"}}>Cancel</button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div></FadeIn>
      <Toast message={toast.message} visible={toast.visible} onHide={hideToast} />
      <ConfirmModal {...confirm} onCancel={closeConfirm} />
    </div>
  );

  if (view === "admin") return (
    <div style={base}>
      <Header right={<button onClick={()=>{setIsAdmin(false);setView("landing");}} style={{background:"none",border:"1px solid #e0e0e0",padding:"6px 14px",borderRadius:8,fontSize:10,color:"#999",cursor:"pointer",fontFamily:FONT,letterSpacing:"0.08em",textTransform:"uppercase"}}>Sign Out</button>} />
      <div className="da-pad" style={{padding:"48px 48px"}}>
        <div style={{fontSize:17,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:32}}>Admin Panel</div>

        <div style={{background:"#fff",borderRadius:12,border:"1px solid #e0e0e0",marginBottom:32}}>
          <button onClick={()=>setAdminExpanded(adminExpanded==="promos"?null:"promos")} style={{width:"100%",padding:"16px 20px",background:"none",border:"none",textAlign:"left",cursor:"pointer",fontSize:13,fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase",display:"flex",justifyContent:"space-between",alignItems:"center",fontFamily:FONT}}>
            Promo Codes
            <span style={{fontSize:16}}>{adminExpanded==="promos"?"−":"+"}</span>
          </button>
          {adminExpanded==="promos" && (
            <div style={{borderTop:"1px solid #f0f0f0",padding:"20px"}}>
              <div style={{marginBottom:24}}>
                {promoCodes.map((p,i) => (
                  <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px",background:"#f9f9f9",borderRadius:8,marginBottom:8,fontSize:11}}>
                    <div>
                      <div style={{fontWeight:600}}>{p.code}</div>
                      <div style={{color:"#666",fontSize:10,marginTop:2}}>{p.label} — {p.prices["100 ML"]}/{p.prices["50 ML"]}/{p.prices["20 ML"]}/{p.prices["2 ML"]}</div>
                    </div>
                    <button onClick={()=>deletePromoCode(p.code)} style={{background:"#dc2626",color:"#fff",border:"none",padding:"6px 12px",borderRadius:6,fontSize:10,cursor:"pointer",fontFamily:FONT,fontWeight:500}}>Delete</button>
                  </div>
                ))}
              </div>
              <div style={{background:"#f5f5f5",padding:"16px",borderRadius:8}}>
                <div style={{fontSize:11,fontWeight:600,marginBottom:12,letterSpacing:"0.08em",textTransform:"uppercase",color:"#666"}}>Add New Code</div>
                <div style={{display:"grid",gap:12,marginBottom:12}}>
                  <input className="da-input" style={{...inputStyle,fontSize:11}} placeholder="Code (e.g. MOODSCENTBAR)" value={adminPromoForm.code} onChange={e=>setAdminPromoForm({...adminPromoForm,code:e.target.value})} />
                  <input className="da-input" style={{...inputStyle,fontSize:11}} placeholder="Label (e.g. B2VIP)" value={adminPromoForm.label} onChange={e=>setAdminPromoForm({...adminPromoForm,label:e.target.value})} />
                  <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8}}>
                    {["100 ML","50 ML","20 ML","2 ML","KIT"].map(size => {
                      const placeholderSize = {
                        "100 ML": "€ 100ml",
                        "50 ML": "€ 50ml",
                        "20 ML": "€ 20ml",
                        "2 ML": "€ 2ml",
                        "KIT": "€ Kit"
                      }[size];
                      return (
                        <div key={size}><label style={{...labelStyle,fontSize:9}}>{size}</label><input className="da-input" style={{...inputStyle,fontSize:11}} type="number" placeholder={placeholderSize} value={adminPromoForm.prices[size]} onChange={e=>setAdminPromoForm({...adminPromoForm,prices:{...adminPromoForm.prices,[size]:e.target.value}})} /></div>
                      );
                    })}
                  </div>
                </div>
                <button onClick={savePromoCode} style={{width:"100%",background:"#000",color:"#fff",border:"none",padding:"12px",borderRadius:8,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:FONT,letterSpacing:"0.08em",textTransform:"uppercase"}}>Save Code</button>
              </div>
            </div>
          )}
        </div>

        <div style={{fontSize:15,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:20}}>Orders ({allOrders.length})</div>
        <div style={{display:"flex",gap:10,marginBottom:24}}>
          <button className="da-btn" onClick={exportCSV} style={{background:"#000",color:"#fff",border:"none",padding:"11px 20px",borderRadius:10,fontSize:10,fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase",cursor:"pointer",fontFamily:FONT}}>Export CSV</button>
        </div>
        {allOrders.length === 0 ? (
          <div style={{padding:"40px",textAlign:"center",color:"#999",background:"#f9f9f9",borderRadius:12}}>No orders yet</div>
        ) : (
          <div style={{display:"grid",gap:24}}>
            {allOrders.map(order => (
              <div key={order.id} style={{background:"#fff",borderRadius:12,border:"1px solid #e0e0e0",padding:"24px"}}>
                <div className="da-admin-details" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:20,marginBottom:20}}>
                  <div>
                    <div style={{fontSize:10,color:"#999",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:4}}>Order</div>
                    <div style={{fontSize:12,fontWeight:600}}>{order.id}</div>
                  </div>
                  <div>
                    <div style={{fontSize:10,color:"#999",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:4}}>Company</div>
                    <div style={{fontSize:12}}>
                      {order.buyer.company}
                      {order.promoLabel && <span style={{marginLeft:8,padding:"2px 8px",background:"#e8f5e9",color:"#2e7d32",borderRadius:4,fontSize:9,fontWeight:600,display:"inline-block"}}>{order.promoLabel}</span>}
                    </div>
                  </div>
                  <div>
                    <div style={{fontSize:10,color:"#999",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:4}}>Total</div>
                    <div style={{fontSize:12,fontWeight:600}}>{formatEUR(order.totalWithVat)}</div>
                  </div>
                  <div>
                    <div style={{fontSize:10,color:"#999",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:4}}>Date</div>
                    <div style={{fontSize:12}}>{new Date(order.date).toLocaleDateString("en-GB")}</div>
                  </div>
                </div>
                <div style={{paddingBottom:20,borderBottom:"1px solid #f0f0f0"}}>
                  <div style={{fontSize:10,color:"#999",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>Items</div>
                  <div style={{display:"grid",gap:4}}>
                    {order.lines.map((l,i) => <div key={i} style={{fontSize:11,color:"#666"}}>{l.product} {SIZE_LABELS[l.size]} × {l.qty} @ {formatEUR(l.unitPrice)}</div>)}
                  </div>
                </div>
                <div style={{paddingTop:16,marginBottom:16}}>
                  <div style={{fontSize:10,color:"#999",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>Status</div>
                  <div className="da-status-bar" style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    {ORDER_STATUSES.map(s => (
                      <button key={s.key} onClick={()=>toggleOrderStatus(order.id,s.key)} className="da-status-step" style={{padding:"8px 14px",borderRadius:8,fontSize:10,fontWeight:order.statuses[s.key]?600:400,border:`2px solid ${order.statuses[s.key]?"#000":"#e0e0e0"}`,background:order.statuses[s.key]?"#000":"transparent",color:order.statuses[s.key]?"#fff":"#666",cursor:"pointer",fontFamily:FONT,textTransform:"uppercase",letterSpacing:"0.08em",transition:"all 0.2s"}}>{s.label}</button>
                    ))}
                  </div>
                </div>
                <div className="da-order-actions" style={{display:"flex",gap:8}}>
                  <button className="da-btn da-btn-outline" onClick={()=>handleViewInvoice(order.id,"admin")} style={{background:"transparent",border:"1px solid #ddd",padding:"9px 18px",borderRadius:10,fontSize:10,color:"#333",cursor:"pointer",fontFamily:FONT,letterSpacing:"0.08em",textTransform:"uppercase",transition:"all 0.25s"}}>View Invoice</button>
                  {!order.cancelled && <button className="da-btn da-btn-outline" onClick={()=>cancelOrder(order.id)} style={{background:"transparent",border:"1px solid #dc2626",padding:"9px 18px",borderRadius:10,fontSize:10,color:"#dc2626",cursor:"pointer",fontFamily:FONT,letterSpacing:"0.08em",textTransform:"uppercase",transition:"all 0.25s"}}>Cancel</button>}
                  {order.cancelled && <button className="da-btn da-btn-outline" onClick={()=>restoreOrder(order.id)} style={{background:"transparent",border:"1px solid #2563eb",padding:"9px 18px",borderRadius:10,fontSize:10,color:"#2563eb",cursor:"pointer",fontFamily:FONT,letterSpacing:"0.08em",textTransform:"uppercase",transition:"all 0.25s"}}>Restore</button>}
                  {order.cancelled && <button className="da-btn da-btn-outline" onClick={()=>deleteOrder(order.id)} style={{background:"transparent",border:"1px solid #dc2626",padding:"9px 18px",borderRadius:10,fontSize:10,color:"#dc2626",cursor:"pointer",fontFamily:FONT,letterSpacing:"0.08em",textTransform:"uppercase",transition:"all 0.25s"}}>Delete</button>}
                </div>
                <NoteSection orderId={order.id} notes={order.notes} isAdminView={true} noteInputs={noteInputs} setNoteInputs={setNoteInputs} addNote={addNote} />
              </div>
            ))}
          </div>
        )}
      </div>
      <Toast message={toast.message} visible={toast.visible} onHide={hideToast} />
      <ConfirmModal {...confirm} onCancel={closeConfirm} />
    </div>
  );

  if (view === "invoice") {
    const displayId = viewingOrderId || orderNumber;
    const cur = allOrders.find(o => o.id === displayId);
    const curDepositTotal = cur ? cur.depositAmount + (cur.shipping || 0) : depositInvoiceTotal;
    const curBalance = cur ? cur.balance_amount : Math.round((totalBeforeShipping - depositAmount) * 100) / 100;
    const inv = cur || {buyer,totalWSP,vatInfo,vatAmount,shipping:shippingAmount,totalWithVat,depositAmount,depositInvoiceTotal,balanceAmount:curBalance,lines:orderLines,cancelled:false};
    if (cur && !cur.depositInvoiceTotal) inv.depositInvoiceTotal = curDepositTotal;
    const invDate = cur ? new Date(cur.date) : new Date();
    const due = new Date(invDate); due.setDate(due.getDate()+7);
    const fmtDate = d => d.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"});
    const handleBack = () => {
      if (invoiceSource==="admin") { setViewingOrderId(null);setInvoiceSource(null);setView("admin"); }
      else if (invoiceSource==="myorders") { setViewingOrderId(null);setInvoiceSource(null);setView("myorders"); }
      else { setQuantities({});setOrderNumber(generateOrderNumber());setViewingOrderId(null);setInvoiceSource(null);setBuyer(b=>({...b,address:"",city:"",country:"",zip:"",vat:"",contact:""}));setPromoCode("");setAppliedPromo(null);setView("catalog"); }
    };

    return (
      <div style={{...base,background:"#f5f5f5"}}>
        <div className="da-header-pad" style={{padding:"20px 48px",background:"#fff",borderBottom:"1px solid #eee",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            <button className="da-btn da-btn-outline" onClick={handleBack} style={{background:"transparent",border:"1px solid #ddd",padding:"9px 24px",borderRadius:10,fontSize:11,letterSpacing:"0.1em",textTransform:"uppercase",cursor:"pointer",fontFamily:FONT,color:"#333",transition:"all 0.25s"}}>{invoiceSource?"← Back":"New Order"}</button>
            {!invoiceSource&&<button className="da-btn da-btn-outline" onClick={()=>setView("myorders")} style={{background:"transparent",border:"1px solid #ddd",padding:"9px 24px",borderRadius:10,fontSize:11,letterSpacing:"0.1em",textTransform:"uppercase",cursor:"pointer",fontFamily:FONT,color:"#333",transition:"all 0.25s"}}>My Orders</button>}
          </div>
          <button className="da-btn" onClick={handlePrint} style={{background:"#000",color:"#fff",border:"none",padding:"11px 28px",borderRadius:12,fontSize:11,fontWeight:600,letterSpacing:"0.15em",textTransform:"uppercase",cursor:"pointer",fontFamily:FONT}}>Print / Save PDF</button>
        </div>
        <FadeIn delay={0.1}><div className="da-invoice-pad" style={{maxWidth:760,margin:"32px auto",background:"#fff",borderRadius:20,padding:"56px 52px",boxShadow:"0 4px 24px rgba(0,0,0,0.06)",position:"relative"}}>
          {inv.cancelled && <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%) rotate(-30deg)",fontSize:60,fontWeight:900,color:"rgba(220,38,38,0.08)",letterSpacing:"0.1em",pointerEvents:"none",whiteSpace:"nowrap"}}>CANCELLED</div>}
          <div ref={invoiceRef}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:28,flexWrap:"wrap",gap:12}}>
              <Logo style={{ height: 18 }} />
              <div style={{textAlign:"right"}}><div style={{fontSize:15,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase"}}>Deposit Invoice</div><div style={{fontSize:10,color:"#999",marginTop:3}}>30% Advance Payment</div></div>
            </div>
            <div className="da-invoice-grid" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24,marginBottom:20,fontSize:11,lineHeight:1.7}}>
              <div><div style={{fontSize:9,textTransform:"uppercase",letterSpacing:"0.14em",color:"#bbb",marginBottom:6}}>From</div><div style={{fontWeight:600}}>{SELLER.legalName}</div><div style={{color:"#666"}}>{SELLER.address}</div><div style={{color:"#666"}}>{SELLER.email}</div><div style={{color:"#666"}}>{SELLER.phone}</div></div>
              <div><div style={{fontSize:9,textTransform:"uppercase",letterSpacing:"0.14em",color:"#bbb",marginBottom:6}}>Bill To</div><div style={{fontWeight:600}}>{inv.buyer.company}</div>{inv.buyer.contact&&<div style={{color:"#666"}}>{inv.buyer.contact}</div>}<div style={{color:"#666"}}>{inv.buyer.address}</div><div style={{color:"#666"}}>{inv.buyer.zip} {inv.buyer.city}, {inv.buyer.country}</div>{inv.buyer.vat&&<div style={{color:"#666"}}>VAT: {inv.buyer.vat}</div>}<div style={{color:"#666"}}>{inv.buyer.email}</div></div>
            </div>
            <div className="da-invoice-meta" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16,marginBottom:20,fontSize:11,padding:"12px 16px",background:"#fafafa",borderRadius:10}}>
              <div><div style={{fontSize:9,textTransform:"uppercase",letterSpacing:"0.14em",color:"#bbb",marginBottom:3}}>Invoice No.</div><div style={{fontWeight:600}}>{displayId}</div></div>
              <div><div style={{fontSize:9,textTransform:"uppercase",letterSpacing:"0.14em",color:"#bbb",marginBottom:3}}>Date</div><div>{fmtDate(invDate)}</div></div>
              <div><div style={{fontSize:9,textTransform:"uppercase",letterSpacing:"0.14em",color:"#bbb",marginBottom:3}}>Due Date</div><div>{fmtDate(due)}</div></div>
            </div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,marginBottom:16,minWidth:500}}><thead><tr style={{borderBottom:"2px solid #000"}}>{["Product","SKU","Size","Qty","Unit Price","Total"].map((h,i)=>(<th key={i} style={{padding:"7px 6px",textAlign:i>=3?"right":"left",fontSize:9,textTransform:"uppercase",letterSpacing:"0.12em",fontWeight:600,color:"#666",whiteSpace:"nowrap"}}>{h}</th>))}</tr></thead><tbody>{(inv.lines||orderLines).map((l,i)=>(<tr key={i} style={{borderBottom:"1px solid #f0f0f0"}}><td style={{padding:"8px 6px",fontWeight:500}}>{l.product}</td><td style={{padding:"8px 6px",color:"#999",fontSize:10}}>{l.sku}</td><td style={{padding:"8px 6px"}}>{SIZE_LABELS[l.size]}</td><td style={{padding:"8px 6px",textAlign:"right"}}>{l.qty}</td><td style={{padding:"8px 6px",textAlign:"right",color:"#666"}}>{formatEUR(l.unitPrice)}</td><td style={{padding:"8px 6px",textAlign:"right",fontWeight:600}}>{formatEUR(l.total)}</td></tr>))}</tbody></table>
            </div>
            <div style={{display:"flex",justifyContent:"flex-end"}}><div style={{width:"100%",maxWidth:300}}>
              <div style={{display:"flex",justifyContent:"space-between",padding:"6px 0",fontSize:11,color:"#666",borderBottom:"1px solid #f0f0f0"}}><span>Subtotal (excl. VAT)</span><span>{formatEUR(inv.totalWSP)}</span></div>
              {inv.vatAmount>0&&<div style={{display:"flex",justifyContent:"space-between",padding:"6px 0",fontSize:11,color:"#666",borderBottom:"1px solid #f0f0f0"}}><span>{inv.vatInfo.label}</span><span>{formatEUR(inv.vatAmount)}</span></div>}
              {inv.vatInfo.rate===0&&inv.buyer?.country&&<div style={{display:"flex",justifyContent:"space-between",padding:"6px 0",fontSize:10,color:"#999",borderBottom:"1px solid #f0f0f0"}}><span>VAT</span><span>{inv.vatInfo.label}</span></div>}
              {inv.shipping>0&&<div style={{display:"flex",justifyContent:"space-between",padding:"6px 0",fontSize:11,color:"#666",borderBottom:"1px solid #f0f0f0"}}><span>Shipping</span><span>{formatEUR(inv.shipping)}</span></div>}
              <div style={{display:"flex",justifyContent:"space-between",padding:"6px 0",fontSize:11,color:"#666",borderBottom:"1px solid #f0f0f0"}}><span>Total incl. VAT &amp; Shipping</span><span style={{fontWeight:500}}>{formatEUR(inv.totalWithVat)}</span></div>
              <div style={{display:"flex",justifyContent:"space-between",padding:"6px 0",fontSize:11,color:"#666",borderBottom:"1px solid #f0f0f0"}}><span>Deposit Rate</span><span>30%</span></div>
              <div style={{display:"flex",justifyContent:"space-between",padding:"10px 0 0",fontSize:16,fontWeight:700,borderTop:"2px solid #000",marginTop:6}}><span>Amount Due</span><span>{formatEUR(inv.depositInvoiceTotal || inv.depositAmount)}</span></div>
            </div></div>
            {inv.vatInfo&&<div style={{marginTop:14,fontSize:10,color:"#999",fontStyle:"italic"}}>{inv.vatInfo.note}</div>}
            <div style={{marginTop:20,paddingTop:16,borderTop:"1px solid #eee",fontSize:10,color:"#666",lineHeight:1.7}}>
              <div style={{fontSize:9,textTransform:"uppercase",letterSpacing:"0.14em",color:"#bbb",marginBottom:8}}>Payment Details</div>
              <div style={{display:"grid",gridTemplateColumns:"auto 1fr",gap:"3px 14px"}}><span style={{color:"#999"}}>Bank</span><span>{SELLER.bank}</span><span style={{color:"#999"}}>REG</span><span>{SELLER.reg}</span><span style={{color:"#999"}}>Account</span><span>{SELLER.account}</span><span style={{color:"#999"}}>IBAN</span><span style={{fontWeight:500,letterSpacing:"0.03em"}}>{SELLER.iban}</span><span style={{color:"#999"}}>BIC/SWIFT</span><span>{SELLER.swift}</span></div>
              <div style={{marginTop:14,padding:"10px 14px",background:"#fafafa",borderRadius:8,color:"#888",fontSize:10,lineHeight:1.6}}>Order will be confirmed upon receipt of the 30% deposit ({formatEUR(inv.depositAmount)}) plus shipping ({formatEUR(inv.shipping||0)}) = {formatEUR(inv.depositInvoiceTotal || (inv.depositAmount + (inv.shipping || 0)))}. Remaining 70% ({formatEUR(inv.balanceAmount||(inv.totalBeforeShipping-inv.depositAmount))}) is due prior to shipment. Shipping included in deposit invoice.</div>
            </div>
          </div>
        </div></FadeIn>
      </div>
    );
  }

  return null;
}
