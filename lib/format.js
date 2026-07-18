// Shared formatting helpers. Used by both client UI and API routes
// to keep currency / size rendering consistent across HTML, email, and PDF.

export function formatEUR(n) {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(n || 0);
}

export const SIZE_LABELS = {
  "100 ML": "100ml",
  "50 ML": "50ml",
  "20 ML": "20ml Travel",
  "2 ML": "2ml Tester",
  KIT: "Discovery Kit",
};
