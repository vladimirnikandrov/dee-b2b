// @ts-check
// Server-side order pricing — the authoritative computation. Takes only
// {sku, qty} from the client and re-derives unit price from the product
// catalog (+ promo code, if any) rather than trusting client-submitted
// prices/totals. Mirrors the checkout-preview math the client still runs
// locally for the live cart summary, but this is what actually gets stored.
import { SKU_INDEX, SHIPPING_FLAT } from "@/lib/products";
import { getVatInfo } from "@/lib/vat";

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

    const unitPrice =
      promo?.discount_type === "fixed_prices" && promo.prices?.[variant.size] !== undefined
        ? Number(promo.prices[variant.size])
        : variant.wsp;

    const total = qty * unitPrice;
    lines.push({ product: variant.product, size: variant.size, sku: variant.sku, ean: variant.ean, qty, unitPrice, total });
    totalWSP += total;
  }

  const vatInfo = getVatInfo(buyerCountry, buyerVat);
  const vatAmount = Math.round(totalWSP * vatInfo.rate * 100) / 100;
  const totalItems = lines.reduce((s, l) => s + l.qty, 0);
  const shippingAmount = totalItems > 0 ? SHIPPING_FLAT : 0;
  const totalBeforeShipping = totalWSP + vatAmount;
  const totalWithVat = totalBeforeShipping + shippingAmount;
  // No more 30/70 deposit split — the first invoice is shipping only
  // (deposit_amount reused for this, see lib/orders.js), the second is the
  // full order value (goods + VAT, balance_amount).
  const depositAmount = shippingAmount;
  const balanceAmount = totalBeforeShipping;

  return { lines, totalWSP, vatInfo, vatAmount, shippingAmount, totalWithVat, depositAmount, balanceAmount };
}
