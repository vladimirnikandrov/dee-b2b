"use client";
// Shared primitives used across every view: constants, small presentational
// components, and the page-chrome (Header/UserNav) that closes over live
// app state via explicit props rather than the parent's closures.
import { useEffect, useId, useRef, useState } from "react";
import { LOGO_WHITE, LOGO_BLACK } from "@/lib/assets";
import { COUNTRIES } from "@/lib/countries";

export const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";

/* ═══════════════════════════════════════════
   TOKENS

   DEE's own values, collected in one place. The point isn't the numbers, it's
   that there is now exactly one of each per role — the portal was carrying
   eight border radii (4/5/6/8/10/12/16/20, with 8, 10 and 12 in a dead heat)
   and fourteen font sizes whose two most common were 9 and 10px on black.
   "Almost the same" is what makes an interface feel unfinished.

   These are plain constants rather than CSS custom properties because the app
   is inline-styled. When the Tailwind v4 migration lands, this block is the
   `@theme` — which is the other reason to write it down now.
   ═══════════════════════════════════════════ */

export const RADIUS = {
  control: 10,  // buttons, inputs, cards, chips — everything in the flow
  floating: 16, // dialogs, the invoice sheet, the cart bar: surfaces that sit above
  pill: 999,    // badges and dots only
};

export const TEXT = {
  eyebrow: 10,  // uppercase label above a field or section. The only 10px left.
  caption: 11,  // secondary line under something, hints, metadata
  body: 12,     // dense UI: table cells, list rows, summaries
  bodyLg: 13,   // prose the buyer reads, dialog copy
  input: 16,    // every text field — below this iOS Safari zooms on focus
  section: 14,  // heading inside a page
  page: 17,     // page title
  amount: 20,   // the one number a screen is about
};

export const SPACE = { xs: 4, sm: 8, md: 12, base: 16, lg: 24, xl: 32, xxl: 48 };

// A surface ladder, which the portal did not have: the page was #000 and so was
// every card on it, so a card was nothing but a thin outline drawn on the void —
// and at full width that reads as an empty rectangle with some text in one
// corner. Each step up is a real, if quiet, lift. Borders are hairlines; the
// shadow belongs to the floating layer only.
export const SURFACE = {
  page: "#000",
  card: "#0d0d0d",     // anything sitting in the flow
  inset: "#141414",    // a well inside a card: inputs, item lists, sub-panels
  raised: "#161616",   // dialogs and popovers — the only layer above the page
  line: "#1f1f1f",     // hairline between rows
  lineStrong: "#2b2b2b", // the edge of a card
};

// One measure for the whole portal. Rows used to run the full width of the
// window — 1770px on a 1920 screen, with the content in the left sixth and a
// price stranded at the far right, which is most of why these screens read as
// "strange". 1120 is wide enough for the admin's seven-stage order rows and
// narrow enough that the eye connects the two ends of a line.
export const PAGE = { maxWidth: 1120, gutter: 32 };

// Text on #000. Every value here clears 4.5:1 — the portal used #666 (3.66:1)
// as its label colour and #dc2626 (3.4:1) for errors.
export const INK = {
  primary: "#fff",
  strong: "#eee",
  body: "#bbb",
  muted: "#9a9a9a",
  faint: "#8a8a8a",
  danger: "#f87171",
  warn: "#eab308",
  ok: "#4ade80",
};
export const base = { fontFamily: FONT, color: INK.primary, background: "#000", minHeight: "100vh", margin: 0, padding: 0 };
// `outline: "none"` used to live here, and an inline style beats a stylesheet
// rule — so the app's own :focus-visible ring never appeared on a single text
// field. 16px because anything smaller makes iOS Safari zoom the viewport on
// focus and never zoom back out.
export const inputStyle = { width: "100%", padding: `${SPACE.md}px ${SPACE.base}px`, border: "1px solid #333", fontSize: TEXT.input, fontFamily: FONT, borderRadius: RADIUS.control, background: "#1a1a1a", color: INK.strong, transition: "border-color 0.2s", boxSizing: "border-box" };
// #666 on #000 is 3.66:1 — under AA, and this is the label on every field in
// the portal. #8a8a8a is 5.9:1.
export const labelStyle = { fontSize: TEXT.eyebrow, textTransform: "uppercase", letterSpacing: "0.12em", color: INK.faint, marginBottom: SPACE.xs + 2, display: "block" };

export const ORDER_STATUSES = [
  { key: "deposit_invoiced", label: "Shipping Invoiced" }, { key: "deposit_paid", label: "Shipping Paid" },
  { key: "packed", label: "Packed" }, { key: "balance_invoiced", label: "Full Invoiced" },
  { key: "balance_paid", label: "Paid in Full" }, { key: "shipped", label: "Shipped" },
  { key: "received", label: "Received" },
];

const CSS = `
  @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
  @keyframes slideUp { from { opacity:0; transform:translateY(40px); } to { opacity:1; transform:translateY(0); } }
  @keyframes slideUpCenter { from { opacity:0; transform:translateX(-50%) translateY(40px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }
  @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
  @keyframes scaleIn { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }
  @keyframes fadeOut { from { opacity:1; } to { opacity:0; } }
  @keyframes scaleOut { from { opacity:1; transform:scale(1); } to { opacity:0; transform:scale(0.96); } }
  /* One keyframe covers the toast's whole life — rise in, hold, fade out —
     so the exit can't desync from the hide timer. Every step repeats the
     translateX(-50%) that centres it: a keyframe animating transform without
     it would override the inline centring and shift the toast half a width
     off-centre for the duration of the animation. */
  @keyframes toastInOut {
    0%   { opacity:0; transform:translateX(-50%) translateY(20px) scale(0.95); }
    8%   { opacity:1; transform:translateX(-50%) translateY(0) scale(1); }
    91%  { opacity:1; transform:translateX(-50%) translateY(0) scale(1); }
    100% { opacity:0; transform:translateX(-50%) translateY(12px) scale(0.97); }
  }
  /* A heading the design doesn't want to draw but a screen reader needs to
     hear — the catalogue's page title is the DEE logo and nothing else. */
  .da-visually-hidden {
    position:absolute; width:1px; height:1px; padding:0; margin:-1px;
    overflow:hidden; clip:rect(0 0 0 0); white-space:nowrap; border:0;
  }
  .da-btn { transition: all 0.25s cubic-bezier(0.23,1,0.32,1); }
  .da-btn:hover { transform:translateY(-1px); box-shadow:0 6px 20px rgba(0,0,0,0.45); }
  .da-btn:active { transform:translateY(0); }
  .da-btn-outline:hover { background:#000 !important; color:#fff !important; border-color:#555 !important; }
  .da-btn-outline-light:hover { background:#fff !important; color:#000 !important; }
  .da-input:focus { border-color:#666 !important; }
  /* A <select>'s dropdown list is drawn by the OS, which defaults its
     options to the system light palette — white-on-white against this
     control's dark background. Both have to be set explicitly. */
  .da-select option { background:#1a1a1a; color:#eee; }
  .da-select option:disabled { color:#666; }
  button:focus-visible, a:focus-visible, input:focus-visible, select:focus-visible, [tabindex]:focus-visible {
    outline: 2px solid #fff; outline-offset: 2px; border-radius: 4px;
  }
  .da-qty-btn:hover { background: #333 !important; }
  .da-qty-btn:active { background: #444 !important; }
  .da-status-step { transition:all 0.2s ease; cursor:pointer; user-select:none; }
  .da-status-step:hover { transform:scale(1.05); }
  /* Skeleton, not a spinner: it repeats the real card's shape so the content
     lands without the page jumping. Static under reduced-motion (below). */
  .da-skeleton { background:#161616; border-radius:4px; animation: daPulse 1.4s ease-in-out infinite; }
  @keyframes daPulse { 0%,100% { opacity:1; } 50% { opacity:0.45; } }
  .da-order-row { transition:background 0.15s ease; }
  .da-order-row:hover { background: #0a0a0a !important; }
  input[type=number]::-webkit-inner-spin-button,
  input[type=number]::-webkit-outer-spin-button { -webkit-appearance:none; margin:0; }
  input[type=number] { -moz-appearance:textfield; }
  ::selection { background: #333; color: #fff; }
  /* Dark scrollbars — the default light ones cut hard against #000 panels. */
  * { scrollbar-color: #333 transparent; scrollbar-width: thin; }
  *::-webkit-scrollbar { width: 10px; height: 10px; }
  *::-webkit-scrollbar-track { background: transparent; }
  *::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 6px; border: 2px solid #000; }
  *::-webkit-scrollbar-thumb:hover { background: #3a3a3a; }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-delay: 0ms !important;
      transition-duration: 0.01ms !important;
    }
  }
  @media (max-width: 768px) {
    .da-pad { padding-left: 20px !important; padding-right: 20px !important; }
    .da-grid-4 { grid-template-columns: 1fr 1fr !important; }
    .da-grid-checkout { grid-template-columns: 1fr !important; }
    .da-grid-admin-row { grid-template-columns: 1fr !important; gap: 8px !important; }
    .da-header-pad { padding-left: 16px !important; padding-right: 16px !important; }
    .da-nav-full { flex-wrap: wrap; gap: 4px 10px !important; }
    /* 44px is the smallest control a thumb hits reliably; these were 12px tall. */
    .da-nav-full button { min-height: 44px; }
    .da-invoice-pad { padding: 28px 20px !important; }
    .da-invoice-grid { grid-template-columns: 1fr !important; }
    .da-invoice-meta { grid-template-columns: 1fr 1fr !important; }
    .da-status-bar { flex-wrap: wrap; }
    .da-admin-details { grid-template-columns: 1fr !important; }
    .da-checkout-summary { border-left: none !important; border-top: 1px solid #222 !important; }
    .da-order-actions { flex-direction: column; align-items: stretch !important; }
    .da-floating-bar { left: 16px !important; right: 16px !important; transform: none !important; max-width: none !important; gap: 12px !important; padding: 14px 16px 14px 20px !important; justify-content: space-between; }
    .da-grid-inv { grid-template-columns: 1fr 1fr !important; }
    .da-grid-promo { grid-template-columns: 1fr 1fr !important; }
    /* The order summary row drops its two least important columns rather than
       squeezing five into 375px. */
    .da-hide-sm { display: none !important; }
    /* The orders header is title / search / export on one line at desktop; on a
       phone it stacked into an indented search box with the button stranded
       under it. Full width, in order. */
    .da-orders-head { flex-direction: column; align-items: stretch !important; gap: 12px !important; }
    .da-orders-head input { width: 100% !important; }
    .da-orders-head .da-btn { width: 100%; }
    .da-order-row { grid-template-columns: auto 1fr auto !important; }
    /* City / ZIP / Country stayed three-across at 375px, so the country —
       the field that decides the VAT treatment — read "Select c". */
    .da-grid-3 { grid-template-columns: 1fr 1fr !important; }
    .da-grid-3 > :last-child { grid-column: 1 / -1; }
    /* A six-column invoice table on a phone is a horizontal scroller with the
       money off-screen. Each line becomes a labelled block instead. */
    .da-invoice-lines table, .da-invoice-lines tbody, .da-invoice-lines tr, .da-invoice-lines td { display: block; width: 100%; min-width: 0 !important; }
    .da-invoice-lines thead { display: none; }
    .da-invoice-lines tr { padding: 10px 0; }
    .da-invoice-lines td { display: flex; justify-content: space-between; gap: 16px; text-align: right !important; padding: 3px 0 !important; }
    .da-invoice-lines td::before { content: attr(data-label); color: #8a8a8a; text-align: left; }
    .da-invoice-lines td:empty { display: none; }
  }
  @media (max-width: 480px) {
    .da-grid-4 { grid-template-columns: 1fr !important; }
    .da-excl-vat { display: none; }
  }
`;

export function useStyleInjection() {
  useEffect(() => {
    const id = "da-b2b-styles";
    if (!document.getElementById(id)) {
      const s = document.createElement("style"); s.id = id; s.textContent = CSS;
      document.head.appendChild(s);
    }
  }, []);
}

/* ═══════════════════════════════════════════
   LOGO
   ═══════════════════════════════════════════ */

export function Logo({ color = "#fff", style = {} }) {
  const src = color === "#000" ? LOGO_BLACK : LOGO_WHITE;
  return <img src={src} alt="DEE" style={{ height: 28, objectFit: "contain", ...style }} />;
}

// The header logo goes home when clicked, so it is a button — it used to be a
// div with onClick: not focusable, not announced, not reachable by keyboard.
export function LogoButton({ onClick, style = {} }) {
  return (
    <button type="button" onClick={onClick} aria-label="DEE — go to the catalogue" style={{background:"none",border:"none",padding:0,cursor:"pointer",display:"flex",alignItems:"center",lineHeight:0,borderRadius:10}}>
      <Logo style={style} />
    </button>
  );
}

/* ═══════════════════════════════════════════
   SMALL COMPONENTS
   ═══════════════════════════════════════════ */

export function BottleSVG({ size, uniqueId }) {
  const gid = (n) => `${n}_${uniqueId}`;
  if (size === "KIT") return (<svg viewBox="0 0 100 100" style={{width:"100%",height:"100%",maxHeight:100}}><defs><linearGradient id={gid("kit")} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#ffd700"/><stop offset="100%" stopColor="#ffa500"/></linearGradient><filter id={gid("ks")} x="-20%" y="-10%" width="140%" height="130%"><feDropShadow dx="2" dy="4" stdDeviation="3" floodOpacity="0.15"/></filter></defs><g filter={`url(#${gid("ks")})`}><rect x="25" y="20" width="50" height="50" rx="4" fill={`url(#${gid("kit")})`}/><path d="M 40 25 L 35 35 L 40 35 L 35 50 L 65 50 L 60 35 L 65 35 L 60 25" fill="#d4af37" opacity="0.7"/></g></svg>);
  if (size === "2 ML") return (<svg viewBox="0 0 80 200" style={{width:"100%",height:"100%",maxHeight:160}}><defs><linearGradient id={gid("v")} x1="0" y1="0" x2="1" y2="0.3"><stop offset="0%" stopColor="#3a3a3a"/><stop offset="30%" stopColor="#222"/><stop offset="70%" stopColor="#111"/><stop offset="100%" stopColor="#1a1a1a"/></linearGradient><filter id={gid("s")} x="-20%" y="-10%" width="140%" height="130%"><feDropShadow dx="2" dy="4" stdDeviation="3" floodOpacity="0.15"/></filter></defs><g filter={`url(#${gid("s")})`}><rect x="34" y="22" width="12" height="10" rx="1.5" fill="#1a1a1a"/><rect x="36.5" y="12" width="7" height="12" rx="2" fill="#444"/><circle cx="40" cy="12" r="3" fill="#555"/><rect x="30" y="32" width="20" height="100" rx="3" fill={`url(#${gid("v")})`}/><rect x="32" y="34" width="6" height="80" rx="2" fill="rgba(255,255,255,0.07)"/></g></svg>);
  if (size === "20 ML") return (<svg viewBox="0 0 80 200" style={{width:"100%",height:"100%",maxHeight:160}}><defs><linearGradient id={gid("t")} x1="0" y1="0" x2="1" y2="0.2"><stop offset="0%" stopColor="#333"/><stop offset="35%" stopColor="#181818"/><stop offset="100%" stopColor="#111"/></linearGradient><filter id={gid("s")} x="-20%" y="-10%" width="140%" height="130%"><feDropShadow dx="2" dy="4" stdDeviation="4" floodOpacity="0.15"/></filter></defs><g filter={`url(#${gid("s")})`}><rect x="25" y="30" width="30" height="14" rx="3" fill="#1a1a1a"/><rect x="31" y="20" width="18" height="12" rx="4" fill="#282828"/><rect x="21" y="44" width="38" height="105" rx="5" fill={`url(#${gid("t")})`}/><rect x="24" y="47" width="10" height="85" rx="3" fill="rgba(255,255,255,0.05)"/></g></svg>);
  const h = size === "100 ML" ? 120 : 105; const y = size === "100 ML" ? 50 : 58;
  return (<svg viewBox="0 0 100 200" style={{width:"100%",height:"100%",maxHeight:160}}><defs><linearGradient id={gid("b")} x1="0" y1="0" x2="1" y2="0.15"><stop offset="0%" stopColor="#333"/><stop offset="30%" stopColor="#1a1a1a"/><stop offset="70%" stopColor="#0f0f0f"/><stop offset="100%" stopColor="#181818"/></linearGradient><filter id={gid("s")} x="-20%" y="-10%" width="140%" height="130%"><feDropShadow dx="3" dy="5" stdDeviation="5" floodOpacity="0.18"/></filter></defs><g filter={`url(#${gid("s")})`}><rect x="32" y={y-18} width="36" height="18" rx="4" fill="#1a1a1a"/><rect x="39" y={y-30} width="22" height="14" rx="5" fill="#252525"/><rect x="24" y={y} width="52" height={h} rx="6" fill={`url(#${gid("b")})`}/><rect x="28" y={y+4} width="14" height={h-18} rx="4" fill="rgba(255,255,255,0.05)"/></g></svg>);
}

// `label` names the product this stepper belongs to, so the three controls
// aren't announced as "minus / spinbutton / plus" twenty-one times over.
// 44px tall because that is the smallest thing a thumb reliably hits, and the
// input is 16px because anything smaller makes iOS Safari zoom the page on
// focus and never zoom back.
export function QtyInput({ value, onChange, max, label = "item" }) {
  const atMax = max !== undefined && max !== null && value >= max;
  const s = {width:44,height:44,border:"none",background:"transparent",cursor:"pointer",fontSize:16,color:"#bbb",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:FONT,padding:0};
  const clamp = (v) => { let n = Math.max(0, v); if (max !== undefined && max !== null) n = Math.min(n, max); return n; };
  return (
    <div style={{display:"inline-flex",alignItems:"center",borderRadius:10,border:`1px solid ${atMax?"#eab308":"#444"}`,overflow:"hidden",background: "#000"}}>
      <button type="button" className="da-qty-btn" aria-label={`Remove one ${label}`} onClick={()=>onChange(Math.max(0,value-1))} style={s}>−</button>
      <input type="number" inputMode="numeric" min="0" max={max} aria-label={`Quantity, ${label}`} value={value} onFocus={(e)=>e.target.select()} onChange={(e)=>onChange(clamp(parseInt(e.target.value)||0))} style={{width:48,height:44,border:"none",borderLeft: "1px solid #333",borderRight: "1px solid #333",textAlign:"center",fontSize:16,fontWeight:500,fontFamily:FONT,background:"transparent",padding:0,color:"#fff"}}/>
      <button type="button" className="da-qty-btn" aria-label={`Add one ${label}`} onClick={()=>onChange(clamp(value+1))} style={{...s,opacity:atMax?0.35:1,cursor:atMax?"default":"pointer"}}>+</button>
    </div>
  );
}

export function FadeIn({ children, delay = 0, style = {} }) {
  return <div style={{animation:`fadeUp 0.6s cubic-bezier(0.23,1,0.32,1) ${delay}s both`,...style}}>{children}</div>;
}

// Country picker — replaced the free-text <input> on 2026-07-26. A typed
// country was the input to the VAT decision (lib/vat.js), so "Deutschland" or
// a typo quietly produced a 0%-VAT export invoice for an EU buyer. A closed
// list makes that unrepresentable.
//
// `value` is expected to already be a canonical name from lib/countries.js —
// callers normalize when loading a profile or repeating an order. Anything
// else still gets shown as its own option rather than silently reading as
// blank: a buyer whose old profile says something we can't resolve should see
// their data and be asked to reselect, not find the field mysteriously empty.
export function CountrySelect({ value, onChange, id, style = {} }) {
  const known = !!value && COUNTRIES.some((c) => c.name === value);
  const legacy = value && !known ? value : null;
  return (
    <div style={{ position: "relative" }}>
      <select
        id={id}
        className="da-input da-select"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...inputStyle, appearance: "none", WebkitAppearance: "none", MozAppearance: "none", cursor: "pointer", paddingRight: 36, color: value ? "#ccc" : "#8a8a8a", ...style }}
      >
        <option value="" disabled>Select country…</option>
        {/* Shown so the buyer sees what's actually stored, but `disabled` —
            it stays displayed as the current selection while being impossible
            to re-choose. Selectable, it would look like the right answer and
            leave them stuck on "Select your country from the list" after
            picking exactly the value they were just shown. */}
        {legacy && <option value={legacy} disabled>{legacy} — not recognized, please reselect</option>}
        {COUNTRIES.map((c) => <option key={c.code} value={c.name}>{c.name}</option>)}
      </select>
      <span aria-hidden="true" style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#8a8a8a", fontSize:11 }}>▼</span>
    </div>
  );
}

/* ═══════════════════════════════════════════
   TOAST
   ═══════════════════════════════════════════ */

// The visible toast lives in its own component so hiding it unmounts the
// timer with it, and its entrance/exit is a single CSS animation sized to the
// same duration as the hide timer — the two can't drift apart, and there's no
// lingering "closing" flag to leak into the next toast.
function ToastBody({ message, onHide, bottom }) {
  // Longer messages get more reading time (errors are the long ones).
  const total = Math.min(6000, 2200 + String(message || "").length * 45);
  useEffect(() => {
    const done = setTimeout(onHide, total);
    return () => clearTimeout(done);
  }, [total, onHide]);
  return (
    // role="status" + aria-live: this is the app's entire confirmation
    // channel ("Order placed", "Inventory saved"), and a screen reader was
    // told none of it.
    <div aria-hidden="true" style={{position:"fixed",bottom,left:"50%",transform:"translateX(-50%)",background:"#fff",color:"#000",padding:"12px 28px",borderRadius:10,fontSize:13,fontWeight:500,letterSpacing:"0.04em",lineHeight:1.5,fontFamily:FONT,zIndex:100,boxShadow:"0 8px 32px rgba(0,0,0,0.5)",animation:`toastInOut ${total}ms ease forwards`,pointerEvents:"none",maxWidth:"min(520px, calc(100vw - 40px))",boxSizing:"border-box",textAlign:"center"}}>{message}</div>
  );
}

export function Toast({ message, visible, onHide, bottom = 28 }) {
  // The live region is always in the document, empty, so a screen reader is
  // already watching it when the text arrives. A region inserted together with
  // its own content is announced unreliably or not at all.
  return (
    <>
      <div role="status" aria-live="polite" className="da-visually-hidden">{visible ? message : ""}</div>
      {/* Keyed on the message so a back-to-back toast remounts and restarts its
          own timer rather than inheriting the previous one's remaining time. */}
      {visible && <ToastBody key={message} message={message} onHide={onHide} bottom={bottom} />}
    </>
  );
}

/* ═══════════════════════════════════════════
   CONFIRM MODAL
   ═══════════════════════════════════════════ */

export function ConfirmModal({ open, title, message, confirmLabel, cancelLabel, onConfirm, onCancel, danger }) {
  // Stay mounted briefly after `open` flips false so the close can animate
  // instead of the dialog vanishing on the same frame.
  const [render, setRender] = useState(open);
  const dialogRef = useRef(null);
  const returnFocusTo = useRef(null);
  const titleId = useId();
  const messageId = useId();

  useEffect(() => {
    if (open) { setRender(true); return; }
    const t = setTimeout(() => setRender(false), 170);
    return () => clearTimeout(t);
  }, [open]);

  // Escape is bound separately from the focus trap so it works from the first
  // frame, whatever the mount timing. onCancelRef keeps this off the prop's
  // identity, which changes on every parent render.
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") onCancelRef.current(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // A dialog you can tab out of is a dialog in name only: the page behind it
  // stays reachable, the confirm button can lose focus to something the
  // overlay is covering, and a keyboard user never gets told anything opened.
  // `render` is in the deps on purpose: `open` flips true one commit BEFORE the
  // dialog is mounted (the first effect is what sets `render`), so on the first
  // open this ran with dialogRef.current === null and the trap silently did
  // nothing at all.
  useEffect(() => {
    if (!open || !render) return;
    if (!returnFocusTo.current) returnFocusTo.current = document.activeElement;
    const node = dialogRef.current;
    if (!node) return;
    const focusable = () => Array.from(node?.querySelectorAll("button:not([disabled])") || []);
    // The dismiss button, not the destructive one — Enter on an unread dialog
    // should not delete an order.
    focusable()[0]?.focus();

    const onKey = (e) => {
      if (e.key !== "Tab") return;
      const items = focusable();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      else if (!node.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, render]);

  // Focus return is its own effect, and deliberately NOT tied to `onCancel`:
  // that prop is a new closure on every parent render, so the cleanup above
  // used to re-run constantly and yank focus out of the dialog the user was
  // still reading. `document.contains` guards the other case — a confirmed
  // action that changes the view leaves the opener detached, and focusing a
  // detached node silently sends focus to <body>.
  useEffect(() => {
    if (open) return undefined;
    const target = returnFocusTo.current;
    returnFocusTo.current = null;
    if (target instanceof HTMLElement && document.contains(target)) target.focus();
    return undefined;
  }, [open]);

  if (!render) return null;
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,backdropFilter:"blur(4px)",animation:open?"fadeIn 0.15s ease":"fadeOut 0.17s ease forwards"}} onClick={onCancel}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        onClick={e=>e.stopPropagation()}
        style={{background: SURFACE.raised,color:INK.primary,borderRadius:16,padding:"32px 32px 24px",maxWidth:420,width:"90%",border:`1px solid ${SURFACE.lineStrong}`,boxShadow:"0 24px 70px rgba(0,0,0,0.65)",animation:open?"scaleIn 0.2s ease":"scaleOut 0.17s ease forwards"}}
      >
        {/* An explicit colour, because this dialog is mounted at the app root
            — outside the view's `base` wrapper — so it inherits the document
            default, which on a #111 panel is black text nobody can read. */}
        <h2 id={titleId} style={{fontSize:16,fontWeight:600,marginBottom:8,fontFamily:FONT,color:INK.primary}}>{title}</h2>
        <div id={messageId} style={{fontSize:13,color: "#9a9a9a",lineHeight:1.7,marginBottom:28,fontFamily:FONT}}>{message}</div>
        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          {/* Both are disabled once `open` flips false: the dialog stays
              mounted for another 170ms to animate out, and a second click in
              that window fired the action twice — which for the invoice
              statuses meant two emails and two accounting drafts. */}
          <button type="button" onClick={onCancel} disabled={!open} style={{background:"transparent",border: "1px solid #2a2a2a",padding:"10px 20px",borderRadius:10,fontSize:11,letterSpacing:"0.08em",textTransform:"uppercase",cursor:open?"pointer":"default",fontFamily:FONT,color: "#9a9a9a"}}>{cancelLabel||"Cancel"}</button>
          {/* Destructive is a red-outlined button, the same shape the Cancel and
              Delete controls use everywhere else — a solid fill next to the
              dismiss reads as "the one you're meant to press", which on a
              delete dialog is the opposite of true. */}
          <button type="button" onClick={onConfirm} disabled={!open} style={{background:danger?"transparent":"#fff",border:danger?"1px solid #f87171":"none",color:danger?"#f87171":"#000",padding:"10px 24px",borderRadius:10,fontSize:11,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",cursor:open?"pointer":"default",fontFamily:FONT}}>{confirmLabel||"Confirm"}</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   NOTE SECTION
   ═══════════════════════════════════════════ */

// Admin-only, and labelled as such: the buyer never receives these (GET
// /api/orders strips them) and cannot write one. Without the label it is far
// too easy to type something here believing the buyer will read it.
export function NoteSection({ orderId, notes, noteInputs, setNoteInputs, addNote }) {
  return (
    <div style={{marginTop:20}}>
      <div style={{display:"flex",alignItems:"baseline",gap:8,marginBottom:10}}>
        <span style={{fontSize:10,textTransform:"uppercase",letterSpacing:"0.12em",color:"#8a8a8a"}}>Internal notes</span>
        <span style={{fontSize:11,color:"#8a8a8a"}}>— only DEE sees these</span>
      </div>
      {(notes||[]).map((n,i) => (
        <div key={i} style={{padding:"10px 14px",background:"#1a1a1a",borderRadius:10,marginBottom:6,borderLeft:"3px solid #666"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
            <span style={{fontSize:11,fontWeight:600,color: "#eee"}}>{n.author}</span>
            <span style={{fontSize:11,color: "#8a8a8a"}}>{new Date(n.date).toLocaleDateString("en-GB",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}</span>
          </div>
          <div style={{fontSize:12,color:"#bbb",lineHeight:1.6}}>{n.text}</div>
        </div>
      ))}
      <div style={{display:"flex",gap:8,marginTop:8}}>
        <input className="da-input" style={{...inputStyle,flex:1,padding:"10px 14px",fontSize:16}} placeholder="Add an internal note…" value={noteInputs[orderId]||""} onChange={e=>setNoteInputs(n=>({...n,[orderId]:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&addNote(orderId)} />
        <button className="da-btn" onClick={()=>addNote(orderId)} style={{background:"#fff",color:"#000",border:"none",padding:"10px 16px",borderRadius:10,fontSize:10,fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase",cursor:"pointer",fontFamily:FONT,whiteSpace:"nowrap"}}>Add</button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   AUTH SCREEN
   ═══════════════════════════════════════════ */

// Wrapped in a real <form> so Enter submits on every auth screen (it's a
// one-field flow on three of them — having to reach for the mouse was pure
// friction). Every other button inside therefore needs type="button", or it
// would submit the form too.
// No `altText`/`altAction`/`altLabel` any more: they existed only for the
// "Need an account? Create one" link, and the portal is invite-only.
export function AuthScreen({ title, fields, onSubmit, submitLabel, authError, onBack, busy }) {
  return (
    <div style={{...base,background: "#000",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh"}}>
      <div style={{width:"100%",maxWidth:380,padding:"0 24px",boxSizing:"border-box"}}>
        <div style={{animation:"scaleIn 0.6s cubic-bezier(0.23,1,0.32,1) 0s both",textAlign:"center",marginBottom:48}}>
          <div style={{display:"flex",justifyContent:"center"}}><Logo style={{ height: 22 }} /></div>
          <div style={{fontSize:11,letterSpacing:"0.3em",textTransform:"uppercase",color: "#8a8a8a",marginTop:20}}>{title}</div>
        </div>
        {authError && <div style={{background:"#2a0a0a",border:"1px solid #8b4545",borderRadius:10,padding:"10px 16px",fontSize:12,color:"#f87171",marginBottom:20,animation:"fadeUp 0.3s ease"}}>{authError}</div>}
        <form onSubmit={(e) => { e.preventDefault(); if (!busy) onSubmit(); }}>
          <FadeIn delay={0.15}>
            <div style={{display:"flex",flexDirection:"column",gap:16}}>{fields}</div>
          </FadeIn>
          <FadeIn delay={0.3}>
            <button type="submit" className="da-btn" disabled={busy} style={{width:"100%",background:"#fff",color:"#000",border:"none",padding:"16px",borderRadius:10,fontSize:11,fontWeight:600,letterSpacing:"0.15em",textTransform:"uppercase",cursor:busy?"default":"pointer",opacity:busy?0.55:1,fontFamily:FONT,marginTop:24,transition:"opacity 0.2s"}}>{busy ? "Please wait…" : submitLabel}</button>
            <div style={{textAlign:"center",marginTop:12}}><button type="button" onClick={onBack} style={{background:"none",border:"none",fontSize:11,color: "#999",cursor:"pointer",fontFamily:FONT}}>← Back</button></div>
          </FadeIn>
        </form>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   PAGE CHROME — Header / UserNav
   ═══════════════════════════════════════════ */

export function Header({ right, currentUser, setView }) {
  return (
    <header className="da-header-pad" style={{background: "#000",padding:"20px 48px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom: "1px solid #333",position:"sticky",top:0,zIndex:20,backdropFilter:"blur(12px)",flexWrap:"wrap",gap:12}}>
      <LogoButton onClick={() => (currentUser ? setView("catalog") : setView("landing"))} style={{ height: 22 }} />
      {right}
    </header>
  );
}

export function UserNav({ view, setView, session, currentUser, handleLogout }) {
  return (
    <nav aria-label="Portal" className="da-nav-full" style={{display:"flex",alignItems:"center",gap:16}}>
      <button onClick={()=>setView("catalog")} style={{background:"none",border:"none",fontSize:11,color: "#888",cursor:"pointer",fontFamily:FONT,letterSpacing:"0.06em",textDecoration:view==="catalog"?"underline":"none",textUnderlineOffset:3}} aria-current={view==="catalog"?"page":undefined}>Catalog</button>
      <span aria-hidden="true" style={{fontSize:11,color: "#666"}}>|</span>
      <button onClick={()=>setView("myorders")} style={{background:"none",border:"none",fontSize:11,color: "#888",cursor:"pointer",fontFamily:FONT,letterSpacing:"0.06em",textDecoration:view==="myorders"?"underline":"none",textUnderlineOffset:3}} aria-current={view==="myorders"?"page":undefined}>My orders</button>
      <span aria-hidden="true" style={{fontSize:11,color: "#666"}}>|</span>
      <button onClick={()=>setView("profile")} style={{background:"none",border:"none",fontSize:11,color: "#888",cursor:"pointer",fontFamily:FONT,letterSpacing:"0.06em",textDecoration:view==="profile"?"underline":"none",textUnderlineOffset:3}} aria-current={view==="profile"?"page":undefined}>Profile</button>
      {session?.role === "admin" && <>
        <span aria-hidden="true" style={{fontSize:11,color: "#666"}}>|</span>
        <button onClick={()=>setView("admin")} style={{background:"none",border:"none",fontSize:11,color: "#888",cursor:"pointer",fontFamily:FONT,letterSpacing:"0.06em"}}>Admin panel</button>
      </>}
      <span aria-hidden="true" style={{fontSize:11,color: "#666"}}>|</span>
      <span style={{fontSize:11,color: "#888"}}>{currentUser?.company}</span>
      <button onClick={handleLogout} style={{background:"none",border: "1px solid #2a2a2a",padding:"8px 14px",borderRadius:10,fontSize:11,color: "#9a9a9a",cursor:"pointer",fontFamily:FONT,letterSpacing:"0.08em",textTransform:"uppercase"}}>Sign out</button>
    </nav>
  );
}
