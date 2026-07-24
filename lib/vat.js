// @ts-check
// VAT rules — shared by client (checkout preview) and server (POST /api/orders,
// the authoritative computation the DB row actually gets).
//
// Type-checked (not converted to TypeScript — see CLAUDE.md Style section for
// why this codebase stays plain JS/JSX). This file and the other money-shape
// modules (pricing.js, orders.js, products.js, economic.js, invoice-pdf.js)
// opt into checking via this pragma so a shape mismatch (e.g. the vatInfo
// drift the 2026-05 audit flagged) is a build-time error instead of a
// silent runtime bug. Run `npm run typecheck`.

/** @typedef {{ rate: number, label: string, note: string }} VatInfo */

export const EU_COUNTRIES = ["Austria","Belgium","Bulgaria","Croatia","Cyprus","Czech Republic","Czechia","Denmark","Estonia","Finland","France","Germany","Greece","Hungary","Ireland","Italy","Latvia","Lithuania","Luxembourg","Malta","Netherlands","Poland","Portugal","Romania","Slovakia","Slovenia","Spain","Sweden"];
export const DK_VAT_RATE = 0.25;

/**
 * @param {string | null | undefined} country
 * @param {string | null | undefined} vatNumber
 * @returns {VatInfo}
 */
export function getVatInfo(country, vatNumber) {
  const c = (country || "").trim();
  const isDK = /^denmark$/i.test(c) || /^dk$/i.test(c) || /^danmark$/i.test(c);
  const isEU = EU_COUNTRIES.some((eu) => eu.toLowerCase() === c.toLowerCase());
  const hasVat = (vatNumber || "").trim().length >= 5;
  if (isDK) return { rate: DK_VAT_RATE, label: "Danish VAT 25%", note: "Incl. 25% moms" };
  if (isEU && hasVat) return { rate: 0, label: "EU Reverse Charge", note: "VAT 0% — Reverse charge, Art. 196 Council Directive 2006/112/EC" };
  if (isEU && !hasVat) return { rate: DK_VAT_RATE, label: "EU (no VAT ID) — Danish VAT 25%", note: "No valid EU VAT number provided — Danish 25% VAT applies" };
  return { rate: 0, label: "Export (0% VAT)", note: "VAT exempt — export outside EU" };
}
