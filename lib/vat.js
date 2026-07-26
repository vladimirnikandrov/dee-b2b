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
//
// Country matching moved to lib/countries.js on 2026-07-26. It used to be a
// hardcoded array of English EU country names compared with `===`, plus a
// regex special-case for Denmark — so "Deutschland" or "Belgique" matched
// nothing and fell silently through to the 0% export branch. The
// classification below is unchanged; only the "is this string that country"
// question got a real answer.
import { countryCode, EU_CODES, isDenmark, isEuCountry } from "@/lib/countries";

/** @typedef {{ rate: number, label: string, note: string }} VatInfo */

export { isDenmark, isEuCountry };
export const DK_VAT_RATE = 0.25;

/**
 * @param {string | null | undefined} country  canonical name, local-language
 *   name, or ISO alpha-2 code — anything lib/countries.js can resolve
 * @param {string | null | undefined} vatNumber
 * @returns {VatInfo}
 */
export function getVatInfo(country, vatNumber) {
  const code = countryCode(country);
  const isDK = code === "DK";
  const isEU = code !== null && EU_CODES.has(code);
  const hasVat = (vatNumber || "").trim().length >= 5;
  if (isDK) return { rate: DK_VAT_RATE, label: "Danish VAT 25%", note: "Incl. 25% moms" };
  if (isEU && hasVat) return { rate: 0, label: "EU Reverse Charge", note: "VAT 0% — Reverse charge, Art. 196 Council Directive 2006/112/EC" };
  if (isEU && !hasVat) return { rate: DK_VAT_RATE, label: "EU (no VAT ID) — Danish VAT 25%", note: "No valid EU VAT number provided — Danish 25% VAT applies" };
  // Genuine non-EU export — and, unchanged from before, any country string we
  // can't resolve at all. New orders can no longer land here by accident:
  // POST /api/orders rejects an unresolvable country outright, so an
  // unrecognized string reaching this branch means an old row being
  // re-rendered, not someone being invoiced on a typo today.
  return { rate: 0, label: "Export (0% VAT)", note: "VAT exempt — export outside EU" };
}
