// @ts-check
// Server-side order pricing — the authoritative computation. Takes only
// {sku, qty} from the client and re-derives unit price from the product
// catalog (+ promo code, if any) rather than trusting client-submitted
// prices/totals. Mirrors the checkout-preview math the client still runs
// locally for the live cart summary, but this is what actually gets stored.
import { SKU_INDEX, shippingRateFor } from "@/lib/products";
import { getVatInfo } from "@/lib/vat";

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * Split a VAT-inclusive shipping charge into the net amount that goes on the
 * invoice line and the VAT that goes in the invoice's VAT total.
 *
 * Shipping is quoted gross (see lib/products.js) — 35.00 means the buyer pays
 * 35.00, full stop. Danish rules put freight in the same VAT bracket as the
 * goods it carries, so for a 25% order that 35.00 is 28.00 + 7.00 VAT; for a
 * 0% order (EU reverse charge, or export) it is simply 35.00 with no VAT.
 *
 * VAT is derived by subtraction rather than computed independently, so net and
 * VAT always add back to exactly the quoted gross — no half-cent drift that
 * would make an invoice fail to foot.
 *
 * @param {number} gross
 * @param {number} rate
 * @returns {{ net: number, vat: number, gross: number }}
 */
export function splitShipping(gross, rate) {
  if (!gross) return { net: 0, vat: 0, gross: 0 };
  const net = round2(gross / (1 + rate));
  return { net, vat: round2(gross - net), gross: round2(gross) };
}

/** @typedef {{ sku: string, qty: number|string }} OrderItemInput */
/** @typedef {{ discount_type?: string, prices?: Record<string, number|string> }} Promo */
/** @typedef {{ product: string, size: string, sku: string, ean: string|null, qty: number, unitPrice: number, total: number }} PricedLine */

/**
 * @param {{ items: OrderItemInput[], buyerCountry: string, buyerVat: string, promo?: Promo }} args
 */
export function computeOrderPricing({ items, buyerCountry, buyerVat, promo }) {
  /** @type {PricedLine[]} */
  const lines = [];
  let totalWSP = 0;

  for (const item of items || []) {
    const variant = SKU_INDEX[item.sku];
    if (!variant) continue; // unknown SKU — ignore rather than trust client-supplied product data
    const qty = Math.max(0, Math.floor(Number(item.qty) || 0));
    if (qty <= 0) continue;

    // A promo price only overrides the catalog price when it's a real,
    // positive number. `!== undefined` alone let a legacy empty-string value
    // (the admin form stores prices as strings) or a literal 0 through, which
    // Number()'d to 0 and sold that size for free.
    const promoPrice = promo?.discount_type === "fixed_prices" ? Number(promo.prices?.[variant.size]) : NaN;
    const unitPrice = Number.isFinite(promoPrice) && promoPrice > 0 ? promoPrice : variant.wsp;

    const total = qty * unitPrice;
    lines.push({ product: variant.product, size: variant.size, sku: variant.sku, ean: variant.ean, qty, unitPrice, total });
    totalWSP += total;
  }

  const vatInfo = getVatInfo(buyerCountry, buyerVat);
  const goodsVatAmount = round2(totalWSP * vatInfo.rate);
  const totalItems = lines.reduce((s, l) => s + l.qty, 0);

  // Shipping is quoted VAT-inclusive and the rate depends on destination
  // (Denmark is a domestic parcel, everything else is cross-border).
  const shipping = totalItems > 0 ? splitShipping(shippingRateFor(buyerCountry), vatInfo.rate) : splitShipping(0, 0);

  // `vatAmount` is the VAT total that appears on the invoice, so it has to
  // include the VAT sitting inside the shipping charge — otherwise the
  // document under-declares what was actually collected.
  const vatAmount = round2(goodsVatAmount + shipping.vat);

  // No more 30/70 deposit split — the first invoice is shipping only, the
  // second is the full order value (goods + their VAT). `depositAmount` is the
  // GROSS shipping charge because that is what the buyer is actually asked to
  // pay; `shippingAmount` is its net half, which is what goes on an invoice
  // line and what e-conomic is given as unitNetPrice.
  const depositAmount = shipping.gross;
  const balanceAmount = round2(totalWSP + goodsVatAmount);
  const totalWithVat = round2(balanceAmount + depositAmount);

  return {
    lines,
    totalWSP,
    vatInfo,
    vatAmount,
    goodsVatAmount,
    shippingAmount: shipping.net,
    shippingVatAmount: shipping.vat,
    shippingGross: shipping.gross,
    totalWithVat,
    depositAmount,
    balanceAmount,
  };
}
