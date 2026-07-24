// Static assets, served locally from public/images/ (moved off Supabase
// Storage — no external dependency, no expiring signed URLs).
//
// These are relative paths, correct for the React client and for the PDF
// generator (which reads the file straight off disk). HTML emails need an
// *absolute* URL instead (email clients can't resolve relative paths) —
// send-email/route.js combines these with its own PORTAL_URL constant.

export const LOGO_WHITE = "/images/logo-white.png";
export const LOGO_BLACK = "/images/logo-black.png";
export const HERO_COVER = "/images/hero-cover.png";

export const PRODUCT_IMAGES = {
  "100 ML": "/images/bottle-100ml.png",
  "50 ML": "/images/bottle-50ml.png",
  "20 ML": "/images/bottle-20ml.png",
  "2 ML": "/images/bottle-2ml.png",
  KIT: "/images/discover-me.png",
};
