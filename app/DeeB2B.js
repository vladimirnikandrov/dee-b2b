"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { SELLER } from "@/lib/seller";
import { formatEUR, SIZE_LABELS } from "@/lib/format";
import { LOGO_WHITE, LOGO_BLACK, HERO_COVER, PRODUCT_IMAGES } from "@/lib/assets";
import { PRODUCTS, SHIPPING_FLAT } from "@/lib/products";
import { getVatInfo } from "@/lib/vat";

/* ═══════════════════════════════════════════
   LOGO
   ═══════════════════════════════════════════ */

function Logo({ color = "#fff", style = {} }) {
  const src = color === "#000" ? LOGO_BLACK : LOGO_WHITE;
  return <img src={src} alt="DEE" style={{ height: 28, objectFit: "contain", ...style }} />;
}

/* ═══════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════ */

const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";
const base = { fontFamily: FONT, color: "#fff", background: "#000", minHeight: "100vh", margin: 0, padding: 0 };
const inputStyle = { width: "100%", padding: "12px 16px", border: "1px solid #333", fontSize: 13, fontFamily: FONT, outline: "none", borderRadius: 10, background: "#1a1a1a", color: "#ccc", transition: "border-color 0.2s", boxSizing: "border-box" };
const labelStyle = { fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "#666", marginBottom: 6, display: "block" };

const ORDER_STATUSES = [
  { key: "deposit_invoiced", label: "Shipping Invoiced" }, { key: "deposit_paid", label: "Shipping Paid" },
  { key: "packed", label: "Packed" }, { key: "balance_invoiced", label: "Full Invoiced" },
  { key: "balance_paid", label: "Paid in Full" }, { key: "shipped", label: "Shipped" },
  { key: "received", label: "Received" },
];

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
  .da-input:focus { border-color:#666 !important; }
  .da-qty-btn:hover { background: #333 !important; }
  .da-qty-btn:active { background: #444 !important; }
  .da-status-step { transition:all 0.2s ease; cursor:pointer; user-select:none; }
  .da-status-step:hover { transform:scale(1.05); }
  .da-order-row { transition:background 0.15s ease; }
  .da-order-row:hover { background: #0a0a0a !important; }
  input[type=number]::-webkit-inner-spin-button,
  input[type=number]::-webkit-outer-spin-button { -webkit-appearance:none; margin:0; }
  input[type=number] { -moz-appearance:textfield; }
  ::selection { background: #333; color: #fff; }
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
    .da-checkout-summary { border-left: none !important; border-top: 1px solid #222 !important; }
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

function QtyInput({ value, onChange, max }) {
  const atMax = max !== undefined && max !== null && value >= max;
  const s = {width:32,height:32,border:"none",background:"transparent",cursor:"pointer",fontSize:14,color:"#aaa",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:FONT,padding:0};
  const clamp = (v) => { let n = Math.max(0, v); if (max !== undefined && max !== null) n = Math.min(n, max); return n; };
  return (<div style={{display:"inline-flex",alignItems:"center",borderRadius:8,border:`1px solid ${atMax?"#eab308":"#444"}`,overflow:"hidden",background: "#000"}}><button className="da-qty-btn" onClick={()=>onChange(Math.max(0,value-1))} style={s}>−</button><input type="number" min="0" max={max} value={value} onChange={(e)=>onChange(clamp(parseInt(e.target.value)||0))} style={{width:36,height:32,border:"none",borderLeft: "1px solid #333",borderRight: "1px solid #333",textAlign:"center",fontSize:12,fontWeight:500,fontFamily:FONT,outline:"none",background:"transparent",padding:0,color:"#fff"}}/><button className="da-qty-btn" onClick={()=>onChange(clamp(value+1))} style={{...s,opacity:atMax?0.3:1,cursor:atMax?"default":"pointer"}}>+</button></div>);
}

function FadeIn({ children, delay = 0, style = {} }) {
  return <div style={{animation:`fadeUp 0.6s cubic-bezier(0.23,1,0.32,1) ${delay}s both`,...style}}>{children}</div>;
}

function generateOrderNumber() { const d=new Date(); return `DA-${d.getFullYear().toString().slice(-2)}${String(d.getMonth()+1).padStart(2,"0")}-${Math.floor(Math.random()*9000)+1000}`; }

/* ═══════════════════════════════════════════
   TOAST
   ═══════════════════════════════════════════ */

function Toast({ message, visible, onHide }) {
  useEffect(() => { if (visible) { const t = setTimeout(onHide, 2800); return () => clearTimeout(t); } }, [visible, onHide]);
  if (!visible) return null;
  return (
    <div style={{position:"fixed",bottom:28,left:"50%",transform:"translateX(-50%)",background:"#fff",color:"#000",padding:"14px 28px",borderRadius:14,fontSize:12,fontWeight:500,letterSpacing:"0.04em",fontFamily:FONT,zIndex:100,boxShadow:"0 8px 32px rgba(0,0,0,0.5)",animation:"toastIn 0.3s ease",pointerEvents:"none",whiteSpace:"nowrap"}}>{message}</div>
  );
}

/* ═══════════════════════════════════════════
   CONFIRM MODAL
   ═══════════════════════════════════════════ */

function ConfirmModal({ open, title, message, confirmLabel, cancelLabel, onConfirm, onCancel, danger }) {
  if (!open) return null;
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,backdropFilter:"blur(4px)",animation:"fadeIn 0.15s ease"}} onClick={onCancel}>
      <div onClick={e=>e.stopPropagation()} style={{background: "#111",borderRadius:20,padding:"36px 32px 28px",maxWidth:380,width:"90%",boxShadow:"0 20px 60px rgba(0,0,0,0.15)",animation:"scaleIn 0.2s ease"}}>
        <div style={{fontSize:15,fontWeight:600,marginBottom:8,fontFamily:FONT}}>{title}</div>
        <div style={{fontSize:13,color: "#888",lineHeight:1.7,marginBottom:28,fontFamily:FONT}}>{message}</div>
        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <button onClick={onCancel} style={{background:"transparent",border: "1px solid #2a2a2a",padding:"10px 20px",borderRadius:10,fontSize:11,letterSpacing:"0.08em",textTransform:"uppercase",cursor:"pointer",fontFamily:FONT,color: "#888"}}>{cancelLabel||"Cancel"}</button>
          <button onClick={onConfirm} style={{background:danger?"#b91c1c":"#000",color:"#fff",border:"none",padding:"10px 24px",borderRadius:10,fontSize:11,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",cursor:"pointer",fontFamily:FONT}}>{confirmLabel||"Confirm"}</button>
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
      <div style={{fontSize:10,textTransform:"uppercase",letterSpacing:"0.12em",color: "#666",marginBottom:10}}>Notes</div>
      {(notes||[]).map((n,i) => (
        <div key={i} style={{padding:"10px 14px",background:n.isAdmin?"#1a1a1a":"#0a0a0a",borderRadius:8,marginBottom:6,borderLeft:n.isAdmin?"3px solid #666":"3px solid #333"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
            <span style={{fontSize:10,fontWeight:600,color: "#eee"}}>{n.author}</span>
            <span style={{fontSize:9,color: "#999"}}>{new Date(n.date).toLocaleDateString("en-GB",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}</span>
          </div>
          <div style={{fontSize:12,color:"#999",lineHeight:1.6}}>{n.text}</div>
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
    <div style={{...base,background: "#000",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh"}}>
      <div style={{width:"100%",maxWidth:380,padding:"0 24px",boxSizing:"border-box"}}>
        <div style={{animation:"scaleIn 0.6s cubic-bezier(0.23,1,0.32,1) 0s both",textAlign:"center",marginBottom:48}}>
          <div style={{display:"flex",justifyContent:"center"}}><Logo style={{ height: 22 }} /></div>
          <div style={{fontSize:9,letterSpacing:"0.3em",textTransform:"uppercase",color: "#666",marginTop:20}}>{title}</div>
        </div>
        {authError && <div style={{background:"#2a0a0a",border:"1px solid #8b4545",borderRadius:10,padding:"10px 16px",fontSize:12,color:"#dc2626",marginBottom:20,animation:"fadeUp 0.3s ease"}}>{authError}</div>}
        {adminError && <div style={{background:"#2a0a0a",border:"1px solid #8b4545",borderRadius:10,padding:"10px 16px",fontSize:12,color:"#dc2626",marginBottom:20,animation:"fadeUp 0.3s ease"}}>{adminError}</div>}
        <FadeIn delay={0.15}>
          <div style={{display:"flex",flexDirection:"column",gap:16}}>{fields}</div>
        </FadeIn>
        <FadeIn delay={0.3}>
          <button className="da-btn" onClick={onSubmit} style={{width:"100%",background:"#000",color:"#fff",border:"none",padding:"16px",borderRadius:12,fontSize:11,fontWeight:600,letterSpacing:"0.15em",textTransform:"uppercase",cursor:"pointer",fontFamily:FONT,marginTop:24}}>{submitLabel}</button>
          {altText && <div style={{textAlign:"center",marginTop:20}}><button onClick={altAction} style={{background:"none",border:"none",fontSize:12,color: "#666",cursor:"pointer",fontFamily:FONT}}>{altText} <span style={{color: "#fff",fontWeight:500}}>{altLabel}</span></button></div>}
          <div style={{textAlign:"center",marginTop:12}}><button onClick={onBack} style={{background:"none",border:"none",fontSize:11,color: "#999",cursor:"pointer",fontFamily:FONT}}>← Back</button></div>
        </FadeIn>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════════ */

export default function DeeB2B() {
  useStyleInjection();

  const [session, setSession] = useState(null); // { id, email, role } | null
  const [loading, setLoading] = useState(true);
  const [authForm, setAuthForm] = useState({ company:"", email:"" });
  const [authError, setAuthError] = useState("");
  const [otpEmail, setOtpEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [admins, setAdmins] = useState([]);
  const [adminManageForm, setAdminManageForm] = useState({ email: "", company: "" });
  const [buyers, setBuyers] = useState([]);
  const [syncFailures, setSyncFailures] = useState([]);
  const [buyerManageForm, setBuyerManageForm] = useState({ email: "", company: "" });
  const [adminExpanded, setAdminExpanded] = useState(null);
  const [adminCompanyFilter, setAdminCompanyFilter] = useState(null);
  const [adminStatusFilter, setAdminStatusFilter] = useState("all");
  const [allOrders, setAllOrders] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [view, setView] = useState("landing");
  const [buyer, setBuyer] = useState({ company:"",address:"",city:"",country:"",zip:"",vat:"",email:"",contact:"" });
  const [orderNumber, setOrderNumber] = useState(generateOrderNumber);
  const [viewingOrderId, setViewingOrderId] = useState(null);
  const pendingDeepOrder = useRef(null);
  const viewRef = useRef(view);
  const [invoiceSource, setInvoiceSource] = useState(null);
  const [invoiceViewType, setInvoiceViewType] = useState("deposit"); // "deposit" or "balance"
  const invoiceRef = useRef(null);

  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [promoCodes, setPromoCodes] = useState(PROMO_CODES_DEFAULT);
  const [promoError, setPromoError] = useState("");
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [adminPromoForm, setAdminPromoForm] = useState({ code: "", label: "", prices: { "100 ML": "", "50 ML": "", "20 ML": "", "2 ML": "", "KIT": "" } });

  // company comes from the buyer profile (loaded separately), not the
  // session — the session only carries { id, email, role }.
  const currentUser = session ? { company: buyer.company || "", email: session.email } : null;

  const [toast, setToast] = useState({ visible: false, message: "" });
  const showToast = useCallback((msg) => setToast({ visible: true, message: msg }), []);
  const hideToast = useCallback(() => setToast(t => ({ ...t, visible: false })), []);

  const [confirm, setConfirm] = useState({ open: false, title: "", message: "", onConfirm: null, danger: false, confirmLabel: "" });
  const askConfirm = (opts) => setConfirm({ open: true, ...opts });
  const closeConfirm = () => setConfirm(c => ({ ...c, open: false }));

  const [noteInputs, setNoteInputs] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // ── Error Log (visible in admin panel) ──
  const [errorLog, setErrorLog] = useState([]);
  const logError = useCallback((source, detail) => {
    const entry = { ts: new Date().toISOString(), source, detail: typeof detail === "string" ? detail : JSON.stringify(detail) };
    setErrorLog(prev => [entry, ...prev].slice(0, 50));
    console.error(`[${source}]`, detail);
  }, []);

  // Feature 2: Order Editing
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [editQtys, setEditQtys] = useState({});

  // Feature 3: Inventory Management
  const [inventory, setInventory] = useState({});

  const getQty = (sku) => quantities[sku] || 0;
  const getStock = (sku) => { const s = inventory[sku]; return (s !== undefined && s !== null) ? s : null; };
  const setQty = (sku, val) => {
    const stock = getStock(sku);
    const clamped = stock !== null ? Math.min(Math.max(0, val), stock) : Math.max(0, val);
    setQuantities((q) => ({ ...q, [sku]: clamped }));
  };

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
  // No 30/70 split — first invoice is shipping only, second is the full order value.
  const depositAmount = shippingAmount;
  const depositInvoiceTotal = depositAmount;

  useEffect(() => { viewRef.current = view; }, [view]);

  useEffect(() => {
    // Check URL params for deep linking from emails.
    const params = new URLSearchParams(window.location.search);
    const deepOrder = params.get("order");
    if (deepOrder) pendingDeepOrder.current = deepOrder;

    fetch("/api/auth/session")
      .then((r) => r.json())
      .then(({ session: s }) => {
        setSession(s);
        setLoading(false);
        if (s) {
          loadProfile();
          loadOrders();
          if (pendingDeepOrder.current) { setViewingOrderId(pendingDeepOrder.current); setInvoiceSource("myorders"); setView("invoice"); pendingDeepOrder.current = null; }
          else if (viewRef.current === "landing" || viewRef.current === "login") setView(s.role === "admin" ? "admin" : "catalog");
        }
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadPromoCodes();
    loadInventory();
  }, []);

  const loadPromoCodes = async () => {
    try {
      const res = await fetch("/api/promo-codes");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { promoCodes: data } = await res.json();
      setPromoCodes(data && data.length > 0 ? data : PROMO_CODES_DEFAULT);
    } catch (e) {
      logError("loadPromoCodes", e.message || e);
      setPromoCodes(PROMO_CODES_DEFAULT);
    }
  };

  // Feature 3: Load and save inventory
  const loadInventory = async () => {
    try {
      const res = await fetch("/api/inventory");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { inventory: rows } = await res.json();
      const inv = {};
      (rows || []).forEach((row) => { inv[row.sku] = row.stock; });
      setInventory(inv);
    } catch (e) {
      logError("loadInventory", e.message || e);
      setInventory({});
    }
  };

  const saveInventory = async () => {
    try {
      const records = [];
      PRODUCTS.forEach(p => {
        p.variants.forEach(v => {
          records.push({ sku: v.sku, product_name: p.name, size: v.size, stock: inventory[v.sku] || 0 });
        });
      });
      const res = await fetch("/api/inventory", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ records }) });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || `HTTP ${res.status}`); }
      showToast("Inventory saved");
    } catch (e) {
      logError("saveInventory", e.message || e); showToast("Error saving inventory: " + e.message);
    }
  };

  // Returns the loaded profile so callers (e.g. handleVerifyOtp) can use it
  // immediately without waiting on a second render for `buyer` state to update.
  const loadProfile = async () => {
    try {
      const res = await fetch("/api/profile");
      if (!res.ok) return null;
      const { profile: data } = await res.json();
      if (!data) return null;
      const mapped = { company: data.company||"", contact: data.contact||"", address: data.address||"", city: data.city||"", country: data.country||"", zip: data.zip||"", vat: data.vat||"", email: data.email||"" };
      setBuyer(mapped);
      return mapped;
    } catch (e) {
      logError("loadProfile", e.message || e);
      return null;
    }
  };

  const loadOrders = async () => {
    try {
      const res = await fetch("/api/orders");
      if (!res.ok) return;
      const { orders } = await res.json();
      setAllOrders(orders || []);
    } catch (e) {
      logError("loadOrders", e.message || e);
    }
  };

  const saveProfile = async () => {
    if (!session) return;
    try {
      const res = await fetch("/api/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(buyer) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      logError("saveProfile", e.message || e);
    }
  };

  // Buyers are passwordless: register/sign-in both end at the same "enter
  // the code we emailed you" screen.
  const handleRegister = async () => {
    setAuthError("");
    if (!authForm.company || !authForm.email) { setAuthError("Company name and email are required"); return; }
    try {
      const res = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: authForm.email, company: authForm.company }) });
      const data = await res.json();
      if (!res.ok) { logError("handleRegister", data.error); setAuthError(data.error || "Registration failed"); return; }
      setBuyer(b => ({...b, company: authForm.company, email: authForm.email}));
      setOtpEmail(data.email);
      setView("otp");
      showToast("Code sent — check your email");
    } catch (e) {
      logError("handleRegister", e.message || e);
      setAuthError("Registration failed");
    }
  };

  const handleRequestOtp = async () => {
    setAuthError("");
    if (!authForm.email) { setAuthError("Enter your email address"); return; }
    try {
      const res = await fetch("/api/auth/request-otp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: authForm.email }) });
      const data = await res.json();
      if (!res.ok) { setAuthError(data.error || "Something went wrong"); return; }
      setOtpEmail(data.email);
      setView("otp");
      showToast("Code sent — check your email");
    } catch (e) {
      setAuthError("Something went wrong");
    }
  };

  const handleVerifyOtp = async () => {
    setAuthError("");
    if (!otpCode || otpCode.trim().length !== 6) { setAuthError("Enter the 6-digit code"); return; }
    try {
      const res = await fetch("/api/auth/verify-otp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: otpEmail, code: otpCode.trim() }) });
      const data = await res.json();
      if (!res.ok) { setAuthError(data.error || "Verification failed"); return; }
      setSession({ id: data.id, email: data.email, role: data.role });
      setOtpCode(""); setOtpEmail(""); setAuthForm({company:"",email:""});
      const profile = await loadProfile();
      await loadOrders();
      setView(data.role === "admin" ? "admin" : "catalog");
      showToast("Welcome" + (profile?.company ? ", " + profile.company : ""));
    } catch (e) {
      setAuthError("Verification failed");
    }
  };

  const handleLogout = async () => {
    await saveProfile();
    try { await fetch("/api/auth/logout", { method: "POST" }); } catch (e) {}
    setSession(null); setQuantities({}); setView("landing");
    setBuyer({company:"",address:"",city:"",country:"",zip:"",vat:"",email:"",contact:""});
    setOrderNumber(generateOrderNumber());
    setPromoCode(""); setAppliedPromo(null);
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
    if (submitting) return;
    setSubmitting(true);
    try {
      const items = orderLines.map(l => ({ sku: l.sku, qty: l.qty }));
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, buyer, promoCode: appliedPromo?.code || null }),
      });
      const data = await res.json();
      if (!res.ok) { logError("handleSubmitOrder", data.error); showToast(data.error || "Failed to place order"); return; }

      await loadOrders();
      await loadInventory();
      const placedOrderId = data.order.id;
      setViewingOrderId(placedOrderId);
      setInvoiceSource("buyer");
      setView("invoice");
      showToast("Order placed — " + placedOrderId);
      setQuantities({});
      setAppliedPromo(null);
      setPromoCode("");
      setOrderNumber(generateOrderNumber());
    } catch (e) {
      logError("handleSubmitOrder", e.message || e);
      showToast("Failed to place order");
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewInvoice = (orderId, source, invType = "deposit") => { setViewingOrderId(orderId); setInvoiceSource(source); setInvoiceViewType(invType); setView("invoice"); };

  // Status toggling, email dispatch, and PDF generation are all handled
  // server-side now (app/api/orders/[id]/status/route.js) — this just
  // reflects the confirmed new statuses back into local state.
  const toggleOrderStatus = async (orderId, key) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key }) });
      const data = await res.json();
      if (!res.ok) { logError("toggleOrderStatus:" + key, data.error); showToast("Failed to update status — " + (data.error || "")); return; }
      setAllOrders(prev => prev.map(o => o.id === orderId ? {...o, statuses: data.statuses} : o));
    } catch (e) {
      logError("toggleOrderStatus:" + key, e.message || e);
      showToast("Failed to update status");
    }
  };

  const restoreOrder = async (orderId) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/restore`, { method: "PATCH" });
      const data = await res.json();
      if (!res.ok) { logError("restoreOrder", data.error); showToast("Failed to restore — " + (data.error || "")); return; }
      setAllOrders(prev => prev.map(o => o.id === orderId ? {...o, cancelled:false} : o));
      await loadInventory();
      showToast("Order " + orderId + " restored");
    } catch (e) {
      logError("restoreOrder", e.message || e);
      showToast("Failed to restore order");
    }
  };

  const deleteOrder = (orderId) => {
    askConfirm({
      title: "Delete Order Permanently",
      message: `This will permanently delete order ${orderId}. This cannot be undone.`,
      confirmLabel: "Delete",
      danger: true,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/orders/${orderId}`, { method: "DELETE" });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) { logError("deleteOrder", data.error); showToast("Failed to delete — " + (data.error || "")); closeConfirm(); return; }
          setAllOrders(prev => prev.filter(o => o.id !== orderId));
          closeConfirm();
          showToast("Order " + orderId + " deleted");
        } catch (e) {
          logError("deleteOrder", e.message || e);
          showToast("Failed to delete order");
          closeConfirm();
        }
      }
    });
  };

  // Cancel now refunds inventory server-side (app/api/orders/[id]/cancel/route.js)
  // and sends the buyer/admin emails itself — nothing left to do here but
  // reflect the confirmed result into local state.
  const cancelOrder = (orderId, fromAdmin) => {
    askConfirm({
      title: "Cancel Order",
      message: fromAdmin
        ? `Cancel order ${orderId}? You can restore it later.`
        : `Cancel order ${orderId}? Contact us if you need to reinstate it.`,
      confirmLabel: "Cancel Order",
      danger: true,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/orders/${orderId}/cancel`, { method: "PATCH" });
          const data = await res.json();
          if (!res.ok) { logError("cancelOrder", data.error); showToast("Failed to cancel — " + (data.error || "")); closeConfirm(); return; }
          setAllOrders(prev => prev.map(o => o.id === orderId ? {...o, cancelled:true} : o));
          await loadInventory();
          closeConfirm();
          showToast("Order " + orderId + " cancelled");
        } catch (e) {
          logError("cancelOrder", e.message || e);
          showToast("Failed to cancel order");
          closeConfirm();
        }
      }
    });
  };

  const canClientCancel = (order) => {
    if (order.cancelled) return false;
    const s = order.statuses;
    return !s.deposit_paid && !s.packed && !s.balance_invoiced && !s.balance_paid && !s.shipped && !s.received;
  };

  // Feature 2: Handle order updates — stock validation, price re-derivation,
  // and the stock delta adjustment all happen server-side now
  // (app/api/orders/[id]/route.js PATCH).
  const handleUpdateOrder = async (orderId) => {
    const totalQty = Object.values(editQtys).reduce((sum, q) => sum + (q || 0), 0);
    if (totalQty === 0) {
      showToast("At least one item must have quantity > 0");
      return;
    }
    try {
      const res = await fetch(`/api/orders/${orderId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ qtyUpdates: editQtys }) });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || "Error updating order"); return; }
      setEditingOrderId(null);
      setEditQtys({});
      await loadOrders();
      await loadInventory();
      showToast("Order updated");
    } catch (e) {
      logError("handleUpdateOrder", e.message || e);
      showToast("Error updating order");
    }
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

  // isAdminView is no longer trusted for authorship — the server derives it
  // from the verified session role — the param is kept only so existing
  // call sites (NoteSection) don't need to change.
  const addNote = async (orderId) => {
    const text = (noteInputs[orderId] || "").trim();
    if (!text) return;
    try {
      const res = await fetch(`/api/orders/${orderId}/notes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || "Failed to add note"); return; }
      setAllOrders(prev => prev.map(o => o.id === orderId ? {...o, notes: [...(o.notes||[]), data.note]} : o));
      setNoteInputs(n => ({...n, [orderId]: ""}));
      showToast("Note added");
    } catch (e) {
      logError("addNote", e.message || e);
      showToast("Failed to add note");
    }
  };

  const exportCSV = () => {
    const rows = [["Order ID","Date","Company","Email","Country","VAT Number","Items","Subtotal","VAT","Shipping","Total","Shipping Invoice","Status","Promo Code","Cancelled"]];
    allOrders.forEach(o => {
      const items = o.lines.map(l => `${l.product} ${l.size} x${l.qty}`).join("; ");
      const statusStr = ORDER_STATUSES.filter(s => o.statuses[s.key]).map(s => s.label).join(", ");
      rows.push([o.id, new Date(o.date).toLocaleDateString("en-GB"), o.buyer.company, o.buyer.email, o.buyer.country, o.buyer.vat||"", items, o.totalWSP.toFixed(2), o.vatAmount.toFixed(2), o.shipping.toFixed(2), o.totalWithVat.toFixed(2), o.depositAmount.toFixed(2), statusStr, o.promoCode||"", o.cancelled?"Yes":"No"]);
    });
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], {type:"text/csv"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `dee-b2b-orders-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    showToast("CSV exported");
  };

  // Sends just the orderId — the server re-fetches the order and derives
  // every field itself, rather than trusting a client-built payload.
  const handlePrint = async () => {
    const invType = invoiceViewType || "deposit";
    const orderId = viewingOrderId || orderNumber;
    try {
      const res = await fetch("/api/generate-invoice", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId, type: invType, format: "download" }) });
      if (!res.ok) { logError("handlePrint", `HTTP ${res.status}`); showToast("PDF generation failed"); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${orderId}-${invType}-invoice.pdf`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch (e) { logError("handlePrint", e.message || e); showToast("Failed to generate PDF"); }
  };

  const savePromoCode = async () => {
    if (!adminPromoForm.code.trim()) { showToast("Code required"); return; }
    if (!adminPromoForm.label.trim()) { showToast("Label required"); return; }
    try {
      const res = await fetch("/api/promo-codes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: adminPromoForm.code, label: adminPromoForm.label, prices: adminPromoForm.prices }) });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || "Failed to save promo code"); return; }
      setAdminPromoForm({ code: "", label: "", prices: { "100 ML": "", "50 ML": "", "20 ML": "", "2 ML": "", "KIT": "" } });
      await loadPromoCodes();
      showToast("Promo code saved");
    } catch (e) {
      logError("savePromoCode", e.message || e);
      showToast("Failed to save promo code");
    }
  };

  const deletePromoCode = async (code) => {
    try {
      const res = await fetch(`/api/promo-codes?code=${encodeURIComponent(code)}`, { method: "DELETE" });
      if (!res.ok) { const data = await res.json().catch(() => ({})); showToast(data.error || "Failed to delete promo code"); return; }
      setPromoCodes(prev => prev.filter(p => p.code !== code));
      showToast("Promo code deleted");
    } catch (e) {
      logError("deletePromoCode", e.message || e);
      showToast("Failed to delete promo code");
    }
  };

  const loadSyncFailures = async () => {
    try {
      const res = await fetch("/api/admin/sync-failures");
      if (!res.ok) return;
      const { failures } = await res.json();
      setSyncFailures(failures || []);
    } catch (e) {
      logError("loadSyncFailures", e.message || e);
    }
  };

  const resolveSyncFailure = async (id) => {
    try {
      const res = await fetch("/api/admin/sync-failures", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      if (!res.ok) { showToast("Failed to dismiss"); return; }
      setSyncFailures(prev => prev.map(f => f.id === id ? { ...f, resolved: true } : f));
    } catch (e) {
      logError("resolveSyncFailure", e.message || e);
      showToast("Failed to dismiss");
    }
  };

  const loadBuyers = async () => {
    try {
      const res = await fetch("/api/admin/buyers");
      if (!res.ok) return;
      const { buyers: list } = await res.json();
      setBuyers(list || []);
    } catch (e) {
      logError("loadBuyers", e.message || e);
    }
  };

  const inviteBuyer = async () => {
    if (!buyerManageForm.email.trim()) { showToast("Email required"); return; }
    try {
      const res = await fetch("/api/admin/buyers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(buyerManageForm) });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || "Failed to invite buyer"); return; }
      setBuyerManageForm({ email: "", company: "" });
      await loadBuyers();
      showToast("Buyer invited — welcome email sent");
    } catch (e) {
      logError("inviteBuyer", e.message || e);
      showToast("Failed to invite buyer");
    }
  };

  const loadAdmins = async () => {
    try {
      const res = await fetch("/api/admin/admins");
      if (!res.ok) return;
      const { admins: list } = await res.json();
      setAdmins(list || []);
    } catch (e) {
      logError("loadAdmins", e.message || e);
    }
  };

  const addAdmin = async () => {
    if (!adminManageForm.email.trim()) { showToast("Email required"); return; }
    try {
      const res = await fetch("/api/admin/admins", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(adminManageForm) });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || "Failed to add admin"); return; }
      setAdminManageForm({ email: "", company: "" });
      await loadAdmins();
      showToast("Admin added — welcome email sent");
    } catch (e) {
      logError("addAdmin", e.message || e);
      showToast("Failed to add admin");
    }
  };

  const removeAdmin = (id) => {
    askConfirm({
      title: "Remove Admin Access",
      message: "This account will lose admin access and become a regular buyer account.",
      confirmLabel: "Remove",
      danger: true,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/admins/${id}`, { method: "DELETE" });
          const data = await res.json();
          if (!res.ok) { showToast(data.error || "Failed to remove admin"); closeConfirm(); return; }
          setAdmins(prev => prev.filter(a => a.id !== id));
          closeConfirm();
          showToast("Admin access removed");
        } catch (e) {
          logError("removeAdmin", e.message || e);
          showToast("Failed to remove admin");
          closeConfirm();
        }
      }
    });
  };

  useEffect(() => {
    if (view === "admin" || view === "myorders") loadOrders();
    if (view === "admin") loadAdmins();
    if (view === "admin") loadBuyers();
    if (view === "admin") loadSyncFailures();
    if (view === "catalog") loadInventory();
  }, [view]);

  const Header = ({ right }) => (
    <div className="da-header-pad" style={{background: "#000",padding:"20px 48px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom: "1px solid #333",position:"sticky",top:0,zIndex:20,backdropFilter:"blur(12px)",flexWrap:"wrap",gap:12}}>
      <div style={{cursor:"pointer"}} onClick={() => currentUser ? setView("catalog") : setView("landing")}>
        <Logo style={{ height: 22 }} />
      </div>
      {right}
    </div>
  );

  const UserNav = () => (
    <div className="da-nav-full" style={{display:"flex",alignItems:"center",gap:16}}>
      <button onClick={()=>setView("catalog")} style={{background:"none",border:"none",fontSize:11,color: "#888",cursor:"pointer",fontFamily:FONT,letterSpacing:"0.06em",textDecoration:view==="catalog"?"underline":"none",textUnderlineOffset:3}}>Catalog</button>
      <span style={{fontSize:10,color: "#999"}}>|</span>
      <button onClick={()=>setView("myorders")} style={{background:"none",border:"none",fontSize:11,color: "#888",cursor:"pointer",fontFamily:FONT,letterSpacing:"0.06em",textDecoration:view==="myorders"?"underline":"none",textUnderlineOffset:3}}>My Orders</button>
      <span style={{fontSize:10,color: "#999"}}>|</span>
      <button onClick={()=>setView("profile")} style={{background:"none",border:"none",fontSize:11,color: "#888",cursor:"pointer",fontFamily:FONT,letterSpacing:"0.06em",textDecoration:view==="profile"?"underline":"none",textUnderlineOffset:3}}>Profile</button>
      {session?.role === "admin" && <>
        <span style={{fontSize:10,color: "#999"}}>|</span>
        <button onClick={()=>setView("admin")} style={{background:"none",border:"none",fontSize:11,color: "#888",cursor:"pointer",fontFamily:FONT,letterSpacing:"0.06em"}}>Admin Panel</button>
      </>}
      <span style={{fontSize:10,color: "#999"}}>|</span>
      <span style={{fontSize:11,color: "#888"}}>{currentUser?.company}</span>
      <button onClick={handleLogout} style={{background:"none",border: "1px solid #2a2a2a",padding:"6px 14px",borderRadius:8,fontSize:10,color: "#666",cursor:"pointer",fontFamily:FONT,letterSpacing:"0.08em",textTransform:"uppercase"}}>Sign Out</button>
    </div>
  );

  if (loading) return (
    <div style={{...base,display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh"}}>
      <div style={{textAlign:"center"}}>
        <Logo style={{ height: 28, opacity: 0.3 }} />
        <div style={{fontSize:11,color: "#999",marginTop:16,letterSpacing:"0.1em",textTransform:"uppercase"}}>Loading...</div>
      </div>
    </div>
  );

  if (view === "landing") return (
    <div style={{...base,background:"#000",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh",padding:"40px 20px"}}>
      <div style={{textAlign:"center",maxWidth:520,width:"100%"}}>
        <div style={{animation:"scaleIn 0.8s cubic-bezier(0.23,1,0.32,1) 0s both",display:"flex",justifyContent:"center"}}>
          <Logo color="#fff" style={{ height: 36 }} />
        </div>
        <FadeIn delay={0.5} style={{textAlign:"center"}}>
          <div style={{fontSize:14,color:"rgba(255,255,255,0.7)",lineHeight:1.8,marginBottom:48,marginTop:40}}>
            <div style={{fontWeight:600,color:"#fff",marginBottom:12,fontSize:15,letterSpacing:"0.04em"}}>B2B Wholesale Portal</div>
            <div style={{marginBottom:16,maxWidth:420,margin:"0 auto 16px"}}>Browse the collection, place orders, and receive invoices — all in one place.</div>
            <div style={{fontSize:12,color:"rgba(255,255,255,0.4)",lineHeight:1.8,maxWidth:420,margin:"0 auto"}}>
              <span style={{fontWeight:500,color:"rgba(255,255,255,0.6)"}}>How it works:</span> Create an account, browse the range at wholesale prices, select quantities and place your order — a shipping invoice is generated first, with the full order invoiced before dispatch.
            </div>
          </div>
        </FadeIn>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <button className="da-btn" onClick={()=>setView("register")} style={{width:"100%",background: "#fff",color: "#000",border:"none",padding:"16px",borderRadius:12,fontSize:11,fontWeight:600,letterSpacing:"0.15em",textTransform:"uppercase",cursor:"pointer",fontFamily:FONT,animation:"slideUp 0.6s cubic-bezier(0.23,1,0.32,1) 0.2s both"}}>Create Account</button>
          <button className="da-btn" onClick={()=>setView("login")} style={{width:"100%",background:"transparent",color:"#fff",border:"1px solid rgba(255,255,255,0.3)",padding:"16px",borderRadius:12,fontSize:11,fontWeight:600,letterSpacing:"0.15em",textTransform:"uppercase",cursor:"pointer",fontFamily:FONT,animation:"slideUp 0.6s cubic-bezier(0.23,1,0.32,1) 0.3s both"}}>Sign In</button>
          <button className="da-btn" onClick={()=>setView("adminlogin")} style={{width:"100%",background:"transparent",color:"rgba(255,255,255,0.5)",border:"none",padding:"16px",borderRadius:12,fontSize:10,letterSpacing:"0.15em",textTransform:"uppercase",cursor:"pointer",fontFamily:FONT,animation:"slideUp 0.6s cubic-bezier(0.23,1,0.32,1) 0.4s both"}}>Admin</button>
        </div>
        <div style={{marginTop:40,display:"flex",justifyContent:"center",gap:20}}>
          <a href="/privacy-policy" style={{fontSize:10,color:"rgba(255,255,255,0.3)",textDecoration:"none",letterSpacing:"0.06em"}}>Privacy Policy</a>
          <a href="/eula" style={{fontSize:10,color:"rgba(255,255,255,0.3)",textDecoration:"none",letterSpacing:"0.06em"}}>Terms of Use</a>
          <a href="/dpa" style={{fontSize:10,color:"rgba(255,255,255,0.3)",textDecoration:"none",letterSpacing:"0.06em"}}>DPA</a>
        </div>
      </div>
    </div>
  );

  if (view === "register") return <AuthScreen title="New Account" fields={[<div key="co"><label style={labelStyle}>Company Name *</label><input className="da-input" style={inputStyle} value={authForm.company} onChange={e=>setAuthForm({...authForm,company:e.target.value})} placeholder="Your company"/></div>,<div key="em"><label style={labelStyle}>Email *</label><input className="da-input" style={inputStyle} type="email" value={authForm.email} onChange={e=>setAuthForm({...authForm,email:e.target.value})} placeholder="name@company.com"/></div>]} onSubmit={handleRegister} submitLabel="Create Account" altText="Already have an account?" altAction={()=>setView("login")} altLabel="Sign In" authError={authError} onBack={()=>setView("landing")} />;

  if (view === "login") return <AuthScreen title="Sign In" fields={[<div key="em"><label style={labelStyle}>Email *</label><input className="da-input" style={inputStyle} type="email" value={authForm.email} onChange={e=>setAuthForm({...authForm,email:e.target.value})} placeholder="name@company.com"/></div>,<div key="msg" style={{fontSize:11,color: "#666",lineHeight:1.6}}>We'll email you a 6-digit code — no password needed.</div>]} onSubmit={handleRequestOtp} submitLabel="Send Code" altText="Need an account?" altAction={()=>setView("register")} altLabel="Create one" authError={authError} onBack={()=>setView("landing")} />;

  if (view === "otp") return <AuthScreen title="Enter Your Code" fields={[<div key="msg" style={{fontSize:12,color: "#888",textAlign:"center",lineHeight:1.7,marginBottom:4}}>We sent a 6-digit code to<br/><span style={{color:"#fff",fontWeight:500}}>{otpEmail}</span></div>,<div key="code"><label style={labelStyle}>Code *</label><input className="da-input" style={{...inputStyle,fontSize:22,letterSpacing:"0.3em",textAlign:"center"}} inputMode="numeric" maxLength={6} value={otpCode} onChange={e=>setOtpCode(e.target.value.replace(/\D/g,"").slice(0,6))} placeholder="000000"/></div>,<div key="resend" style={{textAlign:"center"}}><button onClick={handleRequestOtp} style={{background:"none",border:"none",fontSize:11,color: "#666",cursor:"pointer",fontFamily:FONT}}>Resend code</button></div>]} onSubmit={handleVerifyOtp} submitLabel="Verify & Sign In" authError={authError} onBack={()=>setView("landing")} />;

  if (view === "adminlogin") return <AuthScreen title="Admin Access" fields={[<div key="em"><label style={labelStyle}>Email *</label><input className="da-input" style={inputStyle} type="email" value={authForm.email} onChange={e=>setAuthForm({...authForm,email:e.target.value})} placeholder="name@company.com"/></div>,<div key="msg" style={{fontSize:11,color: "#666",lineHeight:1.6}}>We'll email you a 6-digit code — no password needed.</div>]} onSubmit={handleRequestOtp} submitLabel="Send Code" authError={authError} onBack={()=>setView("landing")} />;



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
          <div><label style={labelStyle}>Email</label><input className="da-input" style={{...inputStyle,background: "#0a0a0a"}} disabled value={buyer.email}/></div>
        </div>
        <div style={{display:"flex",gap:10}}>
          <button className="da-btn" onClick={()=>{saveProfile();showToast("Profile updated");}} style={{background:"#fff",color:"#000",border:"none",padding:"15px 28px",borderRadius:12,fontSize:11,fontWeight:600,letterSpacing:"0.15em",textTransform:"uppercase",cursor:"pointer",fontFamily:FONT}}>Save Changes</button>
          <button className="da-btn da-btn-outline" onClick={()=>setView("catalog")} style={{background:"transparent",border: "1px solid #222",padding:"15px 28px",borderRadius:12,fontSize:11,letterSpacing:"0.1em",textTransform:"uppercase",cursor:"pointer",fontFamily:FONT,color: "#eee",transition:"all 0.25s"}}>Back</button>
        </div>
      </div></FadeIn>
      <Toast message={toast.message} visible={toast.visible} onHide={hideToast} />
    </div>
  );

  if (view === "catalog") return (
    <div style={base}>
      <Header right={<UserNav />} />
      <FadeIn delay={0.1}><div className="da-pad" style={{margin:"24px 48px 0",padding:"14px 24px",background: "#000",borderRadius:12,fontSize:11,color:"#888",display:"flex",justifyContent:"space-between",alignItems:"center",border: "1px solid #222",flexWrap:"wrap",gap:8}}><span>All prices wholesale (WSP), excl. VAT · VAT applied at checkout based on location</span><span style={{fontWeight:500,color: "#888"}}>EUR</span></div></FadeIn>
      <div className="da-pad" style={{padding:"32px 48px 120px"}}>
        {PRODUCTS.map((product,pi) => {
          const isSingleVariant = product.variants.length === 1;
          return (
          <FadeIn key={pi} delay={0.15+pi*0.1} style={{marginBottom:pi<PRODUCTS.length-1?56:0}}>
            <div style={{display:"flex",alignItems:"baseline",gap:12,marginBottom:24,flexWrap:"wrap"}}>
              <span style={{fontSize:17,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase"}}>{product.name}</span>
            </div>
            <div className="da-grid-4" style={{display:"grid",gridTemplateColumns:"repeat(4, 1fr)",gap:24}}>
              {product.variants.map((v,vi) => {
                const qty = getQty(v.sku);
                return (
                  <div key={vi} style={{display:"flex",flexDirection:"column"}}>
                    <div style={{background: "#1a1a1a",aspectRatio:"1/1",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:20,overflow:"hidden"}}>
                      {PRODUCT_IMAGES[v.size] ? <img src={PRODUCT_IMAGES[v.size]} alt={v.size} style={{width:"100%",height:"100%",objectFit:"cover"}} /> : <BottleSVG size={v.size} uniqueId={`${pi}_${vi}`} />}
                    </div>
                    <div style={{fontSize:12,lineHeight:1.9,color: "#eee",flex:1}}>
                      <div><span style={{fontWeight:700}}>SIZE</span> {v.size} {(() => {
                        const stock = inventory[v.sku];
                        if (stock === undefined || stock === null) return null;
                        if (stock > 10) return <span style={{marginLeft:8,display:"inline-flex",alignItems:"center",gap:4}}><span style={{width:8,height:8,background:"#16a34a",borderRadius:"50%",display:"inline-block"}}></span><span style={{fontSize:10,color:"#16a34a"}}>In Stock</span></span>;
                        if (stock > 0) return <span style={{marginLeft:8,display:"inline-flex",alignItems:"center",gap:4}}><span style={{width:8,height:8,background:"#eab308",borderRadius:"50%",display:"inline-block"}}></span><span style={{fontSize:10,color:"#b45309"}}>Few Left</span></span>;
                        return <span style={{marginLeft:8,display:"inline-flex",alignItems:"center",gap:4}}><span style={{width:8,height:8,background:"#dc2626",borderRadius:"50%",display:"inline-block"}}></span><span style={{fontSize:10,color:"#dc2626"}}>Out of Stock</span></span>;
                      })()}</div>
                      <div><span style={{fontWeight:700}}>SKU</span> {v.sku}</div>
                      {v.ean ? <div><span style={{fontWeight:700}}>EAN</span> {v.ean}</div> : null}
                      {v.rrp ? <div><span style={{fontWeight:700}}>RRP</span> EUR {v.rrp}</div> : <div style={{fontWeight:700,fontSize:11,color: "#666",fontStyle:"italic"}}>NOT FOR RETAIL SALE</div>}
                      <div><span style={{fontWeight:700}}>WSP</span> EUR {v.wsp}</div>
                    </div>
                    <div style={{marginTop:12,minHeight:52}}>
                      {getStock(v.sku) === 0 ? (
                        <div style={{fontSize:11,color:"#dc2626",fontWeight:500,lineHeight:"32px"}}>Out of Stock</div>
                      ) : (
                        <>
                          <QtyInput value={qty} onChange={val => setQty(v.sku, val)} max={getStock(v.sku)} />
                          <div style={{fontSize:10,color:"#b45309",marginTop:4,height:14,lineHeight:"14px"}}>{getStock(v.sku) !== null && qty >= getStock(v.sku) && qty > 0 ? `Max available: ${getStock(v.sku)}` : "\u00A0"}</div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </FadeIn>
        );
        })}
      </div>
      {totalItems > 0 && (
        <div className="da-floating-bar" style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",background:"#fff",color:"#000",borderRadius:20,padding:"16px 20px 16px 28px",display:"flex",alignItems:"center",gap:24,boxShadow:"0 8px 40px rgba(0,0,0,0.5)",animation:"slideUpCenter 0.4s cubic-bezier(0.23,1,0.32,1)",zIndex:30,maxWidth:520}}>
          <div style={{display:"flex",alignItems:"baseline",gap:10,whiteSpace:"nowrap"}}>
            <span style={{fontSize:12,opacity:0.5}}>{totalItems} item{totalItems!==1?"s":""}</span>
            <span style={{fontSize:18,fontWeight:600,letterSpacing:"0.02em"}}>{formatEUR(totalWSP)}</span>
            <span style={{fontSize:10,opacity:0.35}}>excl. VAT</span>
          </div>
          <button className="da-btn" onClick={()=>setView("checkout")} style={{background: "#000",color: "#fff",border:"none",padding:"11px 28px",borderRadius:12,fontSize:11,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",cursor:"pointer",fontFamily:FONT,whiteSpace:"nowrap"}}>Proceed</button>
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
        <div style={{maxWidth:1060,margin:"0 auto",padding:"0 24px"}}>
          <div className="da-grid-checkout" style={{display:"grid",gridTemplateColumns:"1.1fr 1fr",gap:48,paddingTop:40,paddingBottom:60}}>
            <FadeIn delay={0.1}><div>
              <div style={{fontSize:13,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:28}}>Buyer Details</div>
              <div style={{display:"grid",gap:16}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                  <div><label style={labelStyle}>Company Name *</label><input className="da-input" style={inputStyle} value={buyer.company} onChange={e=>setBuyer({...buyer,company:e.target.value})} placeholder="Company Ltd."/></div>
                  <div><label style={labelStyle}>Contact Person</label><input className="da-input" style={inputStyle} value={buyer.contact} onChange={e=>setBuyer({...buyer,contact:e.target.value})} placeholder="Full name"/></div>
                </div>
                <div><label style={labelStyle}>Address *</label><input className="da-input" style={inputStyle} value={buyer.address} onChange={e=>setBuyer({...buyer,address:e.target.value})} placeholder="Street address"/></div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14}}>
                  <div><label style={labelStyle}>City *</label><input className="da-input" style={inputStyle} value={buyer.city} onChange={e=>setBuyer({...buyer,city:e.target.value})}/></div>
                  <div><label style={labelStyle}>ZIP</label><input className="da-input" style={inputStyle} value={buyer.zip} onChange={e=>setBuyer({...buyer,zip:e.target.value})}/></div>
                  <div><label style={labelStyle}>Country *</label><input className="da-input" style={inputStyle} value={buyer.country} onChange={e=>setBuyer({...buyer,country:e.target.value})} placeholder="e.g. France"/></div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                  <div><label style={labelStyle}>VAT Number</label><input className="da-input" style={inputStyle} value={buyer.vat} onChange={e=>setBuyer({...buyer,vat:e.target.value})} placeholder="e.g. DK12345678"/></div>
                  <div><label style={labelStyle}>Email *</label><input className="da-input" style={inputStyle} type="email" value={buyer.email} onChange={e=>setBuyer({...buyer,email:e.target.value})}/></div>
                </div>
                {buyer.vat && <div style={{fontSize:10,color: "#666",lineHeight:1.5,marginTop:-8}}>EU buyers: provide valid VAT number for reverse charge (0% VAT)</div>}
              </div>
              {buyer.country && <div style={{padding:"12px 16px",background: "#111",borderRadius:10,border: "1px solid #222",fontSize:11,lineHeight:1.6,marginTop:20}}><span style={{fontWeight:600,color:"#fff"}}>{vatInfo.label}</span><span style={{color:"#888",marginLeft:8}}>{vatInfo.note}</span></div>}
              <div style={{marginTop:28,padding:"20px",background: "#111",borderRadius:12,border: "1px solid #222"}}>
                <div style={{fontSize:10,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color: "#666",marginBottom:10}}>Promo Code</div>
                <div style={{display:"flex",gap:8}}>
                  <input className="da-input" style={{...inputStyle,flex:1,fontSize:12}} placeholder="Enter code" value={promoCodeInput} onChange={e=>setPromoCodeInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&applyPromoCode()} />
                  <button onClick={applyPromoCode} style={{background:"#fff",color:"#000",border:"none",padding:"10px 18px",borderRadius:10,fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:FONT,whiteSpace:"nowrap",letterSpacing:"0.06em",textTransform:"uppercase"}}>Apply</button>
                </div>
                {appliedPromo && <div style={{marginTop:10,fontSize:11,color:"#4ade80",fontWeight:500}}>✓ {appliedPromo.label} pricing applied</div>}
                {promoError && <div style={{marginTop:10,fontSize:11,color:"#dc2626"}}>{promoError}</div>}
              </div>
            </div></FadeIn>
            <FadeIn delay={0.2}><div>
              <div className="da-checkout-summary" style={{background: "#000",border: "1px solid #333",borderRadius:16,padding:"28px 24px",position:"sticky",top:100}}>
                <div style={{fontSize:11,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:16,color: "#888"}}>Order Summary</div>
                <div style={{marginBottom:16}}>{orderLines.map((line,i)=>(<div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",padding:"10px 0",borderBottom: "1px solid #222",fontSize:12}}><div><div style={{fontWeight:500}}>{line.product}</div><div style={{color: "#999",fontSize:10,marginTop:2}}>{SIZE_LABELS[line.size]}</div></div><div style={{textAlign:"right",whiteSpace:"nowrap"}}><div style={{color:"#888",fontSize:11}}>{line.qty} × {formatEUR(line.unitPrice)}</div><div style={{fontWeight:600,marginTop:1}}>{formatEUR(line.total)}</div></div></div>))}</div>
                <div style={{paddingTop:12,borderTop: "1px solid #333"}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:6,color: "#888"}}><span>Subtotal</span><span style={{fontWeight:500,color: "#eee"}}>{formatEUR(totalWSP)}</span></div>
                  {vatAmount>0&&<div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:6,color: "#888"}}><span>{vatInfo.label}</span><span style={{fontWeight:500,color: "#eee"}}>{formatEUR(vatAmount)}</span></div>}
                  {vatInfo.rate===0&&buyer.country&&<div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:6,color: "#666"}}><span>VAT</span><span>{vatInfo.label}</span></div>}
                  {shippingAmount>0&&<div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:6,color: "#888"}}><span>Shipping</span><span style={{fontWeight:500,color: "#eee"}}>{formatEUR(shippingAmount)}</span></div>}
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:13,fontWeight:600,paddingTop:8,borderTop: "1px solid #333"}}><span>Total</span><span>{formatEUR(totalWithVat)}</span></div>
                </div>
                <div style={{marginTop:12,padding:"14px 0 0",borderTop:"2px solid #000"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}><div><div style={{fontSize:10,textTransform:"uppercase",letterSpacing:"0.1em",color: "#666"}}>Shipping Invoice</div><div style={{fontSize:10,color: "#999",marginTop:2}}>Due now — full order invoiced separately</div></div><span style={{fontSize:20,fontWeight:600}}>{formatEUR(depositInvoiceTotal)}</span></div>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:10,marginTop:20}}>
                  <button className="da-btn" onClick={()=>{if(canSubmit&&!submitting){askConfirm({title:"Confirm Order",message:`Place order ${orderNumber} for ${formatEUR(totalWithVat)}? A shipping invoice of ${formatEUR(depositInvoiceTotal)} will be generated now.`,confirmLabel:"Place Order",danger:false,onConfirm:async ()=>{closeConfirm();await handleSubmitOrder();}});}}} disabled={!canSubmit||submitting} style={{width:"100%",background:canSubmit&&!submitting?"#fff":"#333",color:canSubmit&&!submitting?"#000":"#666",border:"none",padding:"14px",borderRadius:12,fontSize:11,fontWeight:600,letterSpacing:"0.15em",textTransform:"uppercase",cursor:canSubmit&&!submitting?"pointer":"default",fontFamily:FONT}}>{submitting?"Placing Order...":"Place Order"}</button>
                  <button className="da-btn da-btn-outline" onClick={()=>setView("catalog")} style={{width:"100%",background:"transparent",border: "1px solid #222",padding:"12px",borderRadius:12,fontSize:11,letterSpacing:"0.1em",textTransform:"uppercase",cursor:"pointer",fontFamily:FONT,color: "#eee",transition:"all 0.25s"}}>Back to Catalog</button>
                </div>
              </div>
            </div></FadeIn>
          </div>
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
        {allOrders.filter(o => o.userId === session?.id).length === 0 ? (
          <div style={{padding:"40px",textAlign:"center",color: "#666"}}>No orders yet. <button onClick={()=>setView("catalog")} style={{background:"none",border:"none",color: "#fff",textDecoration:"underline",cursor:"pointer",fontFamily:FONT}}>Start shopping</button></div>
        ) : (
          <div style={{display:"grid",gap:24}}>
            {allOrders.filter(o => o.userId === session?.id).map(order => (
              <div key={order.id} style={{background: "#000",borderRadius:12,border: "1px solid #2a2a2a",padding:"24px"}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:16,alignItems:"start",marginBottom:16}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:600,marginBottom:6}}>{order.id}</div>
                    <div style={{fontSize:11,color: "#888"}}>{new Date(order.date).toLocaleDateString("en-GB")}</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:13,fontWeight:600}}>{formatEUR(order.totalWithVat)}</div>
                    <div style={{fontSize:10,color: "#666"}}>incl. shipping &amp; VAT</div>
                  </div>
                </div>
                {editingOrderId === order.id ? (
                  <div style={{marginBottom:12,paddingBottom:12,borderBottom: "1px solid #222"}}>
                    <div style={{fontSize:10,color: "#666",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8,fontWeight:600}}>Edit Items</div>
                    <div style={{display:"grid",gap:8}}>
                      {order.lines.map((l,i) => {
                        const stock = getStock(l.sku);
                        const maxVal = stock !== null ? stock : undefined;
                        return (
                        <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,fontSize:11,padding:"6px 0",borderBottom:"1px solid #222"}}>
                          <span style={{flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.product} — {SIZE_LABELS[l.size]} @ {formatEUR(l.unitPrice)}</span>
                          <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                            <input type="number" min="0" max={maxVal} style={{...inputStyle,width:56,padding:"6px 8px",fontSize:11,textAlign:"center"}} value={editQtys[l.sku]!==undefined?editQtys[l.sku]:l.qty} onChange={e=>{const raw=e.target.value;if(raw===""){setEditQtys({...editQtys,[l.sku]:0});return;}let v=parseInt(raw,10)||0;if(stock!==null)v=Math.min(v,stock);setEditQtys({...editQtys,[l.sku]:Math.max(0,v)});}} />
                            {stock !== null && <span style={{fontSize:9,color: "#666",whiteSpace:"nowrap"}}>(max {stock})</span>}
                          </div>
                        </div>
                        );
                      })}
                    </div>
                    <div style={{display:"flex",gap:8,marginTop:12}}>
                      <button onClick={()=>handleUpdateOrder(order.id)} style={{background:"#fff",color:"#000",border:"none",padding:"8px 16px",borderRadius:8,fontSize:10,cursor:"pointer",fontFamily:FONT,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.08em"}}>Save</button>
                      <button onClick={()=>{setEditingOrderId(null);setEditQtys({});}} style={{background:"transparent",border: "1px solid #333",color: "#eee",padding:"8px 16px",borderRadius:8,fontSize:10,cursor:"pointer",fontFamily:FONT,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.08em"}}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div style={{fontSize:12,color: "#888",marginBottom:12,paddingBottom:12,borderBottom: "1px solid #222"}}>
                    {order.lines.map((l,i) => <div key={i}>{l.product} — {SIZE_LABELS[l.size]} x{l.qty}</div>)}
                  </div>
                )}
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  <button className="da-btn da-btn-outline" onClick={()=>handleViewInvoice(order.id,"myorders","deposit")} style={{background:"transparent",border: "1px solid #222",padding:"9px 20px",borderRadius:10,fontSize:10,color: "#eee",cursor:"pointer",fontFamily:FONT,letterSpacing:"0.08em",textTransform:"uppercase",transition:"all 0.25s"}}>Shipping Invoice</button>
                  {order.statuses.balance_invoiced && <button className="da-btn da-btn-outline" onClick={()=>handleViewInvoice(order.id,"myorders","balance")} style={{background:"transparent",border: "1px solid #222",padding:"9px 20px",borderRadius:10,fontSize:10,color: "#eee",cursor:"pointer",fontFamily:FONT,letterSpacing:"0.08em",textTransform:"uppercase",transition:"all 0.25s"}}>Full Invoice</button>}
                  {editingOrderId === order.id ? null : (
                    <>
                      {!order.cancelled && !order.statuses.balance_paid && <button className="da-btn da-btn-outline" onClick={()=>{setEditingOrderId(order.id);setEditQtys(Object.fromEntries(order.lines.map(l=>[l.sku,l.qty])));}} style={{background:"transparent",border: "1px solid #222",padding:"9px 20px",borderRadius:10,fontSize:10,color: "#eee",cursor:"pointer",fontFamily:FONT,letterSpacing:"0.08em",textTransform:"uppercase",transition:"all 0.25s"}}>Edit</button>}
                      <button className="da-btn da-btn-outline" onClick={()=>repeatOrder(order)} style={{background:"transparent",border: "1px solid #222",padding:"9px 20px",borderRadius:10,fontSize:10,color: "#eee",cursor:"pointer",fontFamily:FONT,letterSpacing:"0.08em",textTransform:"uppercase",transition:"all 0.25s"}}>Repeat Order</button>
                      {order.statuses.shipped && !order.statuses.received && !order.cancelled && <button className="da-btn da-btn-outline" onClick={()=>toggleOrderStatus(order.id,"received")} style={{background:"#fff",border:"none",padding:"9px 20px",borderRadius:10,fontSize:10,color:"#000",cursor:"pointer",fontFamily:FONT,fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase",transition:"all 0.25s"}}>Confirm Receipt</button>}
                      {canClientCancel(order) && <button className="da-btn da-btn-outline" onClick={()=>cancelOrder(order.id,false)} style={{background:"transparent",border:"1px solid #b91c1c",padding:"9px 20px",borderRadius:10,fontSize:10,color:"#b91c1c",cursor:"pointer",fontFamily:FONT,letterSpacing:"0.08em",textTransform:"uppercase",transition:"all 0.25s"}}>Cancel</button>}
                    </>
                  )}
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
      <Header right={<div style={{display:"flex",gap:10,alignItems:"center"}}><button onClick={()=>setView("catalog")} style={{background:"none",border: "1px solid #2a2a2a",padding:"6px 14px",borderRadius:8,fontSize:10,color: "#888",cursor:"pointer",fontFamily:FONT,letterSpacing:"0.08em",textTransform:"uppercase"}}>View Portal</button><button onClick={handleLogout} style={{background:"none",border: "1px solid #2a2a2a",padding:"6px 14px",borderRadius:8,fontSize:10,color: "#666",cursor:"pointer",fontFamily:FONT,letterSpacing:"0.08em",textTransform:"uppercase"}}>Sign Out</button></div>} />
      <div className="da-pad" style={{padding:"48px 48px"}}>
        <div style={{fontSize:17,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:32}}>Admin Panel</div>

        <div style={{background: "#000",borderRadius:12,border: "1px solid #2a2a2a",marginBottom:32}}>
          <button onClick={()=>setAdminExpanded(adminExpanded==="promos"?null:"promos")} style={{width:"100%",padding:"16px 20px",background:"none",border:"none",textAlign:"left",cursor:"pointer",fontSize:13,fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase",display:"flex",justifyContent:"space-between",alignItems:"center",fontFamily:FONT,color:"#fff"}}>
            Promo Codes
            <span style={{fontSize:16,color:"#888"}}>{adminExpanded==="promos"?"−":"+"}</span>
          </button>
          {adminExpanded==="promos" && (
            <div style={{borderTop: "1px solid #222",padding:"20px"}}>
              <div style={{marginBottom:24}}>
                {promoCodes.map((p,i) => (
                  <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px",background: "#1a1a1a",borderRadius:8,marginBottom:8,fontSize:11}}>
                    <div>
                      <div style={{fontWeight:600}}>{p.code}</div>
                      <div style={{color: "#888",fontSize:10,marginTop:2}}>{p.label} — {p.prices["2 ML"]}/{p.prices["20 ML"]}/{p.prices["50 ML"]}/{p.prices["100 ML"]}</div>
                    </div>
                    <button onClick={()=>deletePromoCode(p.code)} style={{background:"#b91c1c",color:"#fff",border:"none",padding:"6px 12px",borderRadius:6,fontSize:10,cursor:"pointer",fontFamily:FONT,fontWeight:500}}>Delete</button>
                  </div>
                ))}
              </div>
              <div style={{background: "#0a0a0a",padding:"16px",borderRadius:8}}>
                <div style={{fontSize:11,fontWeight:600,marginBottom:12,letterSpacing:"0.08em",textTransform:"uppercase",color: "#888"}}>Add New Code</div>
                <div style={{display:"grid",gap:12,marginBottom:12}}>
                  <input className="da-input" style={{...inputStyle,fontSize:11}} placeholder="Code (e.g. MOODSCENTBAR)" value={adminPromoForm.code} onChange={e=>setAdminPromoForm({...adminPromoForm,code:e.target.value})} />
                  <input className="da-input" style={{...inputStyle,fontSize:11}} placeholder="Label (e.g. B2VIP)" value={adminPromoForm.label} onChange={e=>setAdminPromoForm({...adminPromoForm,label:e.target.value})} />
                  <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8}}>
                    {["2 ML","20 ML","50 ML","100 ML","KIT"].map(size => {
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
                <button onClick={savePromoCode} style={{width:"100%",background:"#fff",color:"#000",border:"none",padding:"12px",borderRadius:8,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:FONT,letterSpacing:"0.08em",textTransform:"uppercase"}}>Save Code</button>
              </div>
            </div>
          )}
        </div>

        <div style={{background: "#000",borderRadius:12,border: "1px solid #2a2a2a",marginBottom:32}}>
          <button onClick={()=>setAdminExpanded(adminExpanded==="inventory"?null:"inventory")} style={{width:"100%",padding:"16px 20px",background:"none",border:"none",textAlign:"left",cursor:"pointer",fontSize:13,fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase",display:"flex",justifyContent:"space-between",alignItems:"center",fontFamily:FONT,color:"#fff"}}>
            Inventory
            <span style={{fontSize:16,color:"#888"}}>{adminExpanded==="inventory"?"−":"+"}</span>
          </button>
          {adminExpanded==="inventory" && (
            <div style={{borderTop: "1px solid #222",padding:"20px"}}>
              <div style={{fontSize:10,color: "#666",marginBottom:16,letterSpacing:"0.08em",textTransform:"uppercase",fontWeight:600}}>Current Stock</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:16,maxHeight:"400px",overflowY:"auto"}}>
                {PRODUCTS.map((p,pi) => p.variants.map((v,vi) => (
                  <div key={`${pi}-${vi}`} style={{padding:"12px",background: "#1a1a1a",borderRadius:8,border: "1px solid #222"}}>
                    <div style={{fontSize:10,fontWeight:600,color: "#eee",marginBottom:4}}>{p.name}</div>
                    <div style={{fontSize:9,color: "#666",marginBottom:8}}>{v.size}</div>
                    <input type="number" className="da-input" style={{...inputStyle,fontSize:11,padding:"8px 12px"}} value={inventory[v.sku]!==undefined?inventory[v.sku]:""} onChange={e=>{const raw=e.target.value;if(raw===""){setInventory({...inventory,[v.sku]:0});return;}const n=parseInt(raw,10);setInventory({...inventory,[v.sku]:isNaN(n)?0:Math.max(0,n)});}} placeholder="0"/>
                  </div>
                )))}
              </div>
              <button onClick={saveInventory} style={{width:"100%",background:"#fff",color:"#000",border:"none",padding:"12px",borderRadius:8,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:FONT,letterSpacing:"0.08em",textTransform:"uppercase"}}>Save All</button>
            </div>
          )}
        </div>

        <div style={{background: "#000",borderRadius:12,border: "1px solid #2a2a2a",marginBottom:32}}>
          <button onClick={()=>setAdminExpanded(adminExpanded==="buyers"?null:"buyers")} style={{width:"100%",padding:"16px 20px",background:"none",border:"none",textAlign:"left",cursor:"pointer",fontSize:13,fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase",display:"flex",justifyContent:"space-between",alignItems:"center",fontFamily:FONT,color:"#fff"}}>
            Buyers ({buyers.length})
            <span style={{fontSize:16,color:"#888"}}>{adminExpanded==="buyers"?"−":"+"}</span>
          </button>
          {adminExpanded==="buyers" && (
            <div style={{borderTop: "1px solid #222",padding:"20px"}}>
              <div style={{marginBottom:24,maxHeight:300,overflowY:"auto"}}>
                {buyers.map((b) => (
                  <div key={b.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px",background: "#1a1a1a",borderRadius:8,marginBottom:8,fontSize:11}}>
                    <div>
                      <div style={{fontWeight:600}}>{b.email}</div>
                      {b.company && <div style={{color: "#888",fontSize:10,marginTop:2}}>{b.company}</div>}
                    </div>
                  </div>
                ))}
                {buyers.length === 0 && <div style={{color: "#666",fontSize:11}}>No invited buyers yet.</div>}
              </div>
              <div style={{background: "#0a0a0a",padding:"16px",borderRadius:8}}>
                <div style={{fontSize:11,fontWeight:600,marginBottom:12,letterSpacing:"0.08em",textTransform:"uppercase",color: "#888"}}>Invite New Buyer</div>
                <div style={{display:"grid",gap:12,marginBottom:12}}>
                  <input className="da-input" style={{...inputStyle,fontSize:11}} type="email" placeholder="Email" value={buyerManageForm.email} onChange={e=>setBuyerManageForm({...buyerManageForm,email:e.target.value})} />
                  <input className="da-input" style={{...inputStyle,fontSize:11}} placeholder="Name / company (optional)" value={buyerManageForm.company} onChange={e=>setBuyerManageForm({...buyerManageForm,company:e.target.value})} />
                </div>
                <button onClick={inviteBuyer} style={{width:"100%",background:"#fff",color:"#000",border:"none",padding:"12px",borderRadius:8,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:FONT,letterSpacing:"0.08em",textTransform:"uppercase"}}>Invite Buyer</button>
                <div style={{fontSize:10,color: "#666",marginTop:10,lineHeight:1.5}}>They'll get a welcome email explaining how the platform works — no password to set, they just sign in with a code.</div>
              </div>
            </div>
          )}
        </div>

        <div style={{background: "#000",borderRadius:12,border: "1px solid #2a2a2a",marginBottom:32}}>
          <button onClick={()=>setAdminExpanded(adminExpanded==="admins"?null:"admins")} style={{width:"100%",padding:"16px 20px",background:"none",border:"none",textAlign:"left",cursor:"pointer",fontSize:13,fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase",display:"flex",justifyContent:"space-between",alignItems:"center",fontFamily:FONT,color:"#fff"}}>
            Admins ({admins.length})
            <span style={{fontSize:16,color:"#888"}}>{adminExpanded==="admins"?"−":"+"}</span>
          </button>
          {adminExpanded==="admins" && (
            <div style={{borderTop: "1px solid #222",padding:"20px"}}>
              <div style={{marginBottom:24}}>
                {admins.map((a) => (
                  <div key={a.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px",background: "#1a1a1a",borderRadius:8,marginBottom:8,fontSize:11}}>
                    <div>
                      <div style={{fontWeight:600}}>{a.email}{a.id===session?.id && <span style={{marginLeft:8,color:"#666",fontWeight:400,fontSize:10}}>(you)</span>}</div>
                      {a.company && <div style={{color: "#888",fontSize:10,marginTop:2}}>{a.company}</div>}
                    </div>
                    {a.id !== session?.id && <button onClick={()=>removeAdmin(a.id)} style={{background:"#b91c1c",color:"#fff",border:"none",padding:"6px 12px",borderRadius:6,fontSize:10,cursor:"pointer",fontFamily:FONT,fontWeight:500}}>Remove</button>}
                  </div>
                ))}
              </div>
              <div style={{background: "#0a0a0a",padding:"16px",borderRadius:8}}>
                <div style={{fontSize:11,fontWeight:600,marginBottom:12,letterSpacing:"0.08em",textTransform:"uppercase",color: "#888"}}>Add New Admin</div>
                <div style={{display:"grid",gap:12,marginBottom:12}}>
                  <input className="da-input" style={{...inputStyle,fontSize:11}} type="email" placeholder="Email" value={adminManageForm.email} onChange={e=>setAdminManageForm({...adminManageForm,email:e.target.value})} />
                  <input className="da-input" style={{...inputStyle,fontSize:11}} placeholder="Name / company (optional)" value={adminManageForm.company} onChange={e=>setAdminManageForm({...adminManageForm,company:e.target.value})} />
                </div>
                <button onClick={addAdmin} style={{width:"100%",background:"#fff",color:"#000",border:"none",padding:"12px",borderRadius:8,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:FONT,letterSpacing:"0.08em",textTransform:"uppercase"}}>Add Admin</button>
                <div style={{fontSize:10,color: "#666",marginTop:10,lineHeight:1.5}}>They'll get a welcome email — no password to set, they just sign in with a code at the Admin entry point.</div>
              </div>
            </div>
          )}
        </div>

        {/* ── Sync Failures (failed emails / e-conomic syncs) ── */}
        {syncFailures.filter(f => !f.resolved).length > 0 && (
        <div style={{background: "#000",borderRadius:12,border: "1px solid #7c2d12",marginBottom:32}}>
          <button onClick={()=>setAdminExpanded(adminExpanded==="syncFailures"?null:"syncFailures")} style={{width:"100%",padding:"16px 20px",background:"none",border:"none",textAlign:"left",cursor:"pointer",fontSize:13,fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase",display:"flex",justifyContent:"space-between",alignItems:"center",fontFamily:FONT,color:"#f97316"}}>
            Sync Failures ({syncFailures.filter(f => !f.resolved).length})
            <span style={{fontSize:16,color:"#888"}}>{adminExpanded==="syncFailures"?"−":"+"}</span>
          </button>
          {adminExpanded==="syncFailures" && (
            <div style={{borderTop: "1px solid #222",padding:"20px"}}>
              <div style={{fontSize:10,color: "#888",marginBottom:16,lineHeight:1.5}}>An order's shipping/full invoice email or e-conomic sync failed and needs a look — check the order directly, then dismiss once handled.</div>
              <div style={{display:"grid",gap:8}}>
                {syncFailures.filter(f => !f.resolved).map((f) => (
                  <div key={f.id} style={{padding:"12px",background: "#1a1a1a",borderRadius:8,border:"1px solid #7c2d12",fontSize:11}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                      <div>
                        <div style={{fontWeight:600,color:"#f97316"}}>{f.type === "email" ? "Email" : "e-conomic"} — {f.context}{f.order_id && <span style={{color:"#888",fontWeight:400}}> · order {f.order_id}</span>}</div>
                        <div style={{color:"#999",fontSize:10,marginTop:4,fontFamily:"monospace",wordBreak:"break-all"}}>{f.error}</div>
                        <div style={{color:"#666",fontSize:9,marginTop:4}}>{new Date(f.created_at).toLocaleString("en-GB")}</div>
                      </div>
                      <button onClick={()=>resolveSyncFailure(f.id)} style={{background:"transparent",border:"1px solid #444",color:"#888",padding:"6px 12px",borderRadius:6,fontSize:10,cursor:"pointer",fontFamily:FONT,fontWeight:500,whiteSpace:"nowrap"}}>Dismiss</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        )}

        {/* ── Error Log ── */}
        {errorLog.length > 0 && (
        <div style={{background: "#000",borderRadius:12,border: "1px solid #2a2a2a",marginBottom:32}}>
          <button onClick={()=>setAdminExpanded(adminExpanded==="errors"?null:"errors")} style={{width:"100%",padding:"16px 20px",background:"none",border:"none",textAlign:"left",cursor:"pointer",fontSize:13,fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase",display:"flex",justifyContent:"space-between",alignItems:"center",fontFamily:FONT,color:"#b91c1c"}}>
            Error Log ({errorLog.length})
            <span style={{fontSize:16,color:"#888"}}>{adminExpanded==="errors"?"−":"+"}</span>
          </button>
          {adminExpanded==="errors" && (
            <div style={{borderTop: "1px solid #222",padding:"20px"}}>
              <div style={{display:"flex",gap:8,marginBottom:16}}>
                <button onClick={()=>{navigator.clipboard.writeText(errorLog.map(e=>`[${e.ts}] ${e.source}: ${e.detail}`).join("\n"));showToast("Copied to clipboard");}} style={{background:"#fff",color:"#000",border:"none",padding:"8px 16px",borderRadius:8,fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:FONT,letterSpacing:"0.08em",textTransform:"uppercase"}}>Copy All</button>
                <button onClick={()=>setErrorLog([])} style={{background:"transparent",border:"1px solid #444",color:"#888",padding:"8px 16px",borderRadius:8,fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:FONT,letterSpacing:"0.08em",textTransform:"uppercase"}}>Clear</button>
              </div>
              <div style={{maxHeight:300,overflowY:"auto",display:"grid",gap:6}}>
                {errorLog.map((e,i) => (
                  <div key={i} style={{padding:"10px 12px",background:"#1a1a1a",borderRadius:8,border:"1px solid #222",fontSize:10,fontFamily:"monospace",lineHeight:1.5}}>
                    <div style={{color:"#666",marginBottom:2}}>{new Date(e.ts).toLocaleTimeString("en-GB")} · <span style={{color:"#b91c1c",fontWeight:600}}>{e.source}</span></div>
                    <div style={{color:"#ccc",wordBreak:"break-all"}}>{e.detail}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        )}

        {/* ── Company Cards ── */}
        {(() => {
          const companies = [...new Set(allOrders.map(o => o.buyer.company).filter(Boolean))].sort();
          const companyStats = companies.map(c => {
            const orders = allOrders.filter(o => o.buyer.company === c);
            const total = orders.reduce((s, o) => s + (o.totalWithVat || 0), 0);
            const active = orders.filter(o => !o.cancelled).length;
            return { name: c, count: orders.length, active, total };
          });
          return companies.length > 0 && (
            <div style={{marginBottom:32}}>
              <div style={{fontSize:15,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:16}}>Companies ({companies.length})</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:12}}>
                <button onClick={()=>setAdminCompanyFilter(null)} style={{padding:"16px",borderRadius:10,border:adminCompanyFilter===null?"2px solid #fff":"1px solid #333",background:adminCompanyFilter===null?"#000":"transparent",color:adminCompanyFilter===null?"#fff":"#ccc",cursor:"pointer",fontFamily:FONT,textAlign:"left",transition:"all 0.2s"}}>
                  <div style={{fontSize:11,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase"}}>All Companies</div>
                  <div style={{fontSize:20,fontWeight:600,marginTop:8}}>{allOrders.length}</div>
                  <div style={{fontSize:9,color:adminCompanyFilter===null?"rgba(255,255,255,0.6)":"#999",marginTop:2,letterSpacing:"0.06em",textTransform:"uppercase"}}>{formatEUR(allOrders.reduce((s,o)=>s+(o.totalWithVat||0),0))} total</div>
                </button>
                {companyStats.map(c => (
                  <button key={c.name} onClick={()=>setAdminCompanyFilter(c.name)} style={{padding:"16px",borderRadius:10,border:adminCompanyFilter===c.name?"2px solid #fff":"1px solid #333",background:adminCompanyFilter===c.name?"#000":"transparent",color:adminCompanyFilter===c.name?"#fff":"#ccc",cursor:"pointer",fontFamily:FONT,textAlign:"left",transition:"all 0.2s"}}>
                    <div style={{fontSize:11,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</div>
                    <div style={{fontSize:20,fontWeight:600,marginTop:8}}>{c.count}</div>
                    <div style={{fontSize:9,color:adminCompanyFilter===c.name?"rgba(255,255,255,0.6)":"#999",marginTop:2,letterSpacing:"0.06em",textTransform:"uppercase"}}>{c.active} active · {formatEUR(c.total)}</div>
                  </button>
                ))}
              </div>
            </div>
          );
        })()}

        {/* ── Orders Header + Filters ── */}
        {(() => {
          const statusFilters = [
            { key: "all", label: "All" },
            { key: "active", label: "Active" },
            { key: "cancelled", label: "Cancelled" },
            ...ORDER_STATUSES.map(s => ({ key: s.key, label: s.label }))
          ];
          const filtered = allOrders.filter(o => {
            if (adminCompanyFilter && o.buyer.company !== adminCompanyFilter) return false;
            if (adminStatusFilter === "all") return true;
            if (adminStatusFilter === "active") return !o.cancelled;
            if (adminStatusFilter === "cancelled") return o.cancelled;
            return o.statuses[adminStatusFilter] === true;
          });
          return (<>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:12}}>
          <div style={{fontSize:15,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase"}}>Orders ({filtered.length}{adminCompanyFilter || adminStatusFilter !== "all" ? ` / ${allOrders.length}` : ""})</div>
          <button className="da-btn" onClick={exportCSV} style={{background:"#000",color:"#fff",border:"none",padding:"11px 20px",borderRadius:10,fontSize:10,fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase",cursor:"pointer",fontFamily:FONT}}>Export CSV</button>
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:24}}>
          {statusFilters.map(f => (
            <button key={f.key} onClick={()=>setAdminStatusFilter(f.key)} style={{padding:"7px 14px",borderRadius:8,fontSize:10,fontWeight:adminStatusFilter===f.key?600:400,border:adminStatusFilter===f.key?"2px solid #fff":"1px solid #444",background:adminStatusFilter===f.key?"#000":"transparent",color:adminStatusFilter===f.key?"#fff":"#999",cursor:"pointer",fontFamily:FONT,textTransform:"uppercase",letterSpacing:"0.08em",transition:"all 0.2s"}}>{f.label}</button>
          ))}
        </div>
        {filtered.length === 0 ? (
          <div style={{padding:"40px",textAlign:"center",color: "#666",background: "#1a1a1a",borderRadius:12}}>No orders match filters</div>
        ) : (
          <div style={{display:"grid",gap:24}}>
            {filtered.map(order => (
              <div key={order.id} style={{background: "#000",borderRadius:12,border: "1px solid #2a2a2a",padding:"24px"}}>
                <div className="da-admin-details" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:20,marginBottom:20}}>
                  <div>
                    <div style={{fontSize:10,color: "#666",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:4}}>Order</div>
                    <div style={{fontSize:12,fontWeight:600}}>{order.id}</div>
                  </div>
                  <div>
                    <div style={{fontSize:10,color: "#666",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:4}}>Company</div>
                    <div style={{fontSize:12}}>
                      {order.buyer.company}
                      {order.promoLabel && <span style={{marginLeft:8,padding:"2px 8px",background:"#14532d",color:"#4ade80",borderRadius:4,fontSize:9,fontWeight:600,display:"inline-block"}}>{order.promoLabel}</span>}
                    </div>
                  </div>
                  <div>
                    <div style={{fontSize:10,color: "#666",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:4}}>Total</div>
                    <div style={{fontSize:12,fontWeight:600}}>{formatEUR(order.totalWithVat)}</div>
                  </div>
                  <div>
                    <div style={{fontSize:10,color: "#666",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:4}}>Date</div>
                    <div style={{fontSize:12}}>{new Date(order.date).toLocaleDateString("en-GB")}</div>
                  </div>
                </div>
                {editingOrderId === order.id ? (
                  <div style={{paddingBottom:20,borderBottom: "1px solid #222"}}>
                    <div style={{fontSize:10,color: "#666",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8,fontWeight:600}}>Edit Items</div>
                    <div style={{display:"grid",gap:8,marginBottom:12}}>
                      {order.lines.map((l,i) => {
                        const stock = getStock(l.sku);
                        const maxVal = stock !== null ? stock : undefined;
                        return (
                        <div key={i} style={{display:"grid",gridTemplateColumns:"1fr auto auto",gap:8,alignItems:"center",fontSize:11}}>
                          <span>{l.product} — {SIZE_LABELS[l.size]} @ {formatEUR(l.unitPrice)}</span>
                          <input type="number" min="0" max={maxVal} style={{...inputStyle,width:60,padding:"6px 8px",fontSize:11}} value={editQtys[l.sku]!==undefined?editQtys[l.sku]:l.qty} onChange={e=>{const raw=e.target.value;if(raw===""){setEditQtys({...editQtys,[l.sku]:0});return;}let v=parseInt(raw,10)||0;if(stock!==null)v=Math.min(v,stock);setEditQtys({...editQtys,[l.sku]:Math.max(0,v)});}} />
                          {stock !== null && <span style={{fontSize:9,color: "#666"}}>(max {stock})</span>}
                        </div>
                        );
                      })}
                    </div>
                    <div style={{display:"flex",gap:8}}>
                      <button onClick={()=>handleUpdateOrder(order.id)} style={{background:"#000",color:"#fff",border:"none",padding:"8px 16px",borderRadius:8,fontSize:10,cursor:"pointer",fontFamily:FONT,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.08em"}}>Save</button>
                      <button onClick={()=>{setEditingOrderId(null);setEditQtys({});}} style={{background:"transparent",border: "1px solid #222",color: "#eee",padding:"8px 16px",borderRadius:8,fontSize:10,cursor:"pointer",fontFamily:FONT,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.08em"}}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div style={{paddingBottom:20,borderBottom: "1px solid #222"}}>
                    <div style={{fontSize:10,color: "#666",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>Items</div>
                    <div style={{display:"grid",gap:4}}>
                      {order.lines.map((l,i) => <div key={i} style={{fontSize:11,color: "#888"}}>{l.product} {SIZE_LABELS[l.size]} × {l.qty} @ {formatEUR(l.unitPrice)}</div>)}
                    </div>
                  </div>
                )}
                <div style={{paddingTop:16,marginBottom:16}}>
                  <div style={{fontSize:10,color: "#666",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>Status</div>
                  <div className="da-status-bar" style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    {ORDER_STATUSES.map(s => (
                      <button key={s.key} onClick={()=>toggleOrderStatus(order.id,s.key)} className="da-status-step" style={{padding:"8px 14px",borderRadius:8,fontSize:10,fontWeight:order.statuses[s.key]?600:400,border:`2px solid ${order.statuses[s.key]?"#fff":"#444"}`,background:order.statuses[s.key]?"#000":"transparent",color:order.statuses[s.key]?"#fff":"#999",cursor:"pointer",fontFamily:FONT,textTransform:"uppercase",letterSpacing:"0.08em",transition:"all 0.2s"}}>{s.label}</button>
                    ))}
                  </div>
                </div>
                <div className="da-order-actions" style={{display:"flex",gap:8}}>
                  <button className="da-btn da-btn-outline" onClick={()=>handleViewInvoice(order.id,"admin","deposit")} style={{background:"transparent",border: "1px solid #222",padding:"9px 18px",borderRadius:10,fontSize:10,color: "#eee",cursor:"pointer",fontFamily:FONT,letterSpacing:"0.08em",textTransform:"uppercase",transition:"all 0.25s"}}>Shipping Invoice</button>
                  {order.statuses.balance_invoiced && <button className="da-btn da-btn-outline" onClick={()=>handleViewInvoice(order.id,"admin","balance")} style={{background:"transparent",border: "1px solid #222",padding:"9px 18px",borderRadius:10,fontSize:10,color: "#eee",cursor:"pointer",fontFamily:FONT,letterSpacing:"0.08em",textTransform:"uppercase",transition:"all 0.25s"}}>Full Invoice</button>}
                  {editingOrderId === order.id ? null : (
                    <>
                      {!order.cancelled && !order.statuses.balance_paid && <button className="da-btn da-btn-outline" onClick={()=>{setEditingOrderId(order.id);setEditQtys(Object.fromEntries(order.lines.map(l=>[l.sku,l.qty])));}} style={{background:"transparent",border: "1px solid #222",padding:"9px 18px",borderRadius:10,fontSize:10,color: "#eee",cursor:"pointer",fontFamily:FONT,letterSpacing:"0.08em",textTransform:"uppercase",transition:"all 0.25s"}}>Edit</button>}
                      {!order.cancelled && <button className="da-btn da-btn-outline" onClick={()=>cancelOrder(order.id,true)} style={{background:"transparent",border:"1px solid #b91c1c",padding:"9px 18px",borderRadius:10,fontSize:10,color:"#b91c1c",cursor:"pointer",fontFamily:FONT,letterSpacing:"0.08em",textTransform:"uppercase",transition:"all 0.25s"}}>Cancel</button>}
                      {order.cancelled && <button className="da-btn da-btn-outline" onClick={()=>restoreOrder(order.id)} style={{background:"transparent",border:"1px solid #fff",padding:"9px 18px",borderRadius:10,fontSize:10,color:"#fff",cursor:"pointer",fontFamily:FONT,letterSpacing:"0.08em",textTransform:"uppercase",transition:"all 0.25s"}}>Restore</button>}
                      {order.cancelled && <button className="da-btn da-btn-outline" onClick={()=>deleteOrder(order.id)} style={{background:"transparent",border:"1px solid #b91c1c",padding:"9px 18px",borderRadius:10,fontSize:10,color:"#b91c1c",cursor:"pointer",fontFamily:FONT,letterSpacing:"0.08em",textTransform:"uppercase",transition:"all 0.25s"}}>Delete</button>}
                    </>
                  )}
                </div>
                <NoteSection orderId={order.id} notes={order.notes} isAdminView={true} noteInputs={noteInputs} setNoteInputs={setNoteInputs} addNote={addNote} />
              </div>
            ))}
          </div>
        )}
          </>);
        })()}
      </div>
      <Toast message={toast.message} visible={toast.visible} onHide={hideToast} />
      <ConfirmModal {...confirm} onCancel={closeConfirm} />
    </div>
  );

  if (view === "invoice") {
    const displayId = viewingOrderId || orderNumber;
    const cur = allOrders.find(o => o.id === displayId);
    const curDepositTotal = cur ? cur.depositAmount : depositInvoiceTotal;
    const curBalance = cur ? cur.balanceAmount : totalBeforeShipping;
    const inv = cur || {buyer,totalWSP,vatInfo,vatAmount,shipping:shippingAmount,totalWithVat,depositAmount,depositInvoiceTotal,balanceAmount:curBalance,lines:orderLines,cancelled:false};
    if (cur && !cur.depositInvoiceTotal) inv.depositInvoiceTotal = curDepositTotal;
    const invDate = cur ? new Date(cur.date) : new Date();
    const due = new Date(invDate); due.setDate(due.getDate()+7);
    const fmtDate = d => d.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"});
    const handleBack = () => {
      if (invoiceSource==="admin") { setViewingOrderId(null);setInvoiceSource(null);setView("admin"); }
      else if (invoiceSource==="myorders") { setViewingOrderId(null);setInvoiceSource(null);setView("myorders"); }
      else { setQuantities({});setOrderNumber(generateOrderNumber());setViewingOrderId(null);setInvoiceSource(null);setPromoCode("");setAppliedPromo(null);setView("catalog"); }
    };

    return (
      <div style={{...base,background: "#0a0a0a"}}>
        <div className="da-header-pad" style={{padding:"20px 48px",background: "#000",borderBottom: "1px solid #333",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            <button className="da-btn da-btn-outline" onClick={handleBack} style={{background:"transparent",border: "1px solid #222",padding:"9px 24px",borderRadius:10,fontSize:11,letterSpacing:"0.1em",textTransform:"uppercase",cursor:"pointer",fontFamily:FONT,color: "#eee",transition:"all 0.25s"}}>{invoiceSource?"← Back":"New Order"}</button>
            {<button className="da-btn da-btn-outline" onClick={()=>setView("myorders")} style={{background:"transparent",border: "1px solid #222",padding:"9px 24px",borderRadius:10,fontSize:11,letterSpacing:"0.1em",textTransform:"uppercase",cursor:"pointer",fontFamily:FONT,color: "#eee",transition:"all 0.25s"}}>My Orders</button>}
          </div>
          <button className="da-btn" onClick={handlePrint} style={{background:"#000",color:"#fff",border:"none",padding:"11px 28px",borderRadius:12,fontSize:11,fontWeight:600,letterSpacing:"0.15em",textTransform:"uppercase",cursor:"pointer",fontFamily:FONT}}>Save PDF</button>
        </div>
        <FadeIn delay={0.1}><div className="da-invoice-pad" style={{maxWidth:760,margin:"32px auto",background: "#000",borderRadius:20,padding:"56px 52px",boxShadow:"0 4px 24px rgba(0,0,0,0.06)",position:"relative"}}>
          {inv.cancelled && <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%) rotate(-30deg)",fontSize:60,fontWeight:900,color:"rgba(220,38,38,0.08)",letterSpacing:"0.1em",pointerEvents:"none",whiteSpace:"nowrap"}}>CANCELLED</div>}
          <div ref={invoiceRef}>
            {/* Invoice type toggle — only show if balance is available */}
            {cur && cur.statuses?.balance_invoiced && (
              <div style={{display:"flex",gap:8,marginBottom:20}}>
                <button onClick={()=>setInvoiceViewType("deposit")} style={{padding:"8px 16px",borderRadius:8,fontSize:10,fontWeight:invoiceViewType==="deposit"?600:400,border:invoiceViewType==="deposit"?"2px solid #fff":"1px solid #444",background:invoiceViewType==="deposit"?"#000":"transparent",color:invoiceViewType==="deposit"?"#fff":"#999",cursor:"pointer",fontFamily:FONT,textTransform:"uppercase",letterSpacing:"0.08em",transition:"all 0.2s"}}>Shipping</button>
                <button onClick={()=>setInvoiceViewType("balance")} style={{padding:"8px 16px",borderRadius:8,fontSize:10,fontWeight:invoiceViewType==="balance"?600:400,border:invoiceViewType==="balance"?"2px solid #fff":"1px solid #444",background:invoiceViewType==="balance"?"#000":"transparent",color:invoiceViewType==="balance"?"#fff":"#999",cursor:"pointer",fontFamily:FONT,textTransform:"uppercase",letterSpacing:"0.08em",transition:"all 0.2s"}}>Full Invoice</button>
              </div>
            )}
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:28,flexWrap:"wrap",gap:12}}>
              <Logo style={{ height: 18 }} />
              <div style={{textAlign:"right"}}><div style={{fontSize:15,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase"}}>{invoiceViewType==="balance"?"Order Invoice":"Shipping Invoice"}</div><div style={{fontSize:10,color: "#666",marginTop:3}}>{invoiceViewType==="balance"?"Full Payment Due":"Shipping Fee"}</div></div>
            </div>
            <div className="da-invoice-grid" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24,marginBottom:20,fontSize:11,lineHeight:1.7}}>
              <div><div style={{fontSize:9,textTransform:"uppercase",letterSpacing:"0.14em",color: "#999",marginBottom:6}}>From</div><div style={{fontWeight:600}}>{SELLER.legalName}</div><div style={{color: "#888"}}>{SELLER.address}</div><div style={{color: "#888"}}>CVR: {SELLER.cvr}</div><div style={{color: "#888"}}>{SELLER.email}</div><div style={{color: "#888"}}>{SELLER.phone}</div></div>
              <div><div style={{fontSize:9,textTransform:"uppercase",letterSpacing:"0.14em",color: "#999",marginBottom:6}}>Bill To</div><div style={{fontWeight:600}}>{inv.buyer.company}</div>{inv.buyer.contact&&<div style={{color: "#888"}}>{inv.buyer.contact}</div>}<div style={{color: "#888"}}>{inv.buyer.address}</div><div style={{color: "#888"}}>{inv.buyer.zip} {inv.buyer.city}, {inv.buyer.country}</div>{inv.buyer.vat&&<div style={{color: "#888"}}>VAT: {inv.buyer.vat}</div>}<div style={{color: "#888"}}>{inv.buyer.email}</div></div>
            </div>
            <div className="da-invoice-meta" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16,marginBottom:20,fontSize:11,padding:"12px 16px",background: "#1a1a1a",borderRadius:10}}>
              <div><div style={{fontSize:9,textTransform:"uppercase",letterSpacing:"0.14em",color: "#999",marginBottom:3}}>Invoice No.</div><div style={{fontWeight:600}}>{invoiceViewType==="balance"?displayId:displayId+"-SHIP"}</div></div>
              <div><div style={{fontSize:9,textTransform:"uppercase",letterSpacing:"0.14em",color: "#999",marginBottom:3}}>Date</div><div>{fmtDate(invDate)}</div></div>
              <div><div style={{fontSize:9,textTransform:"uppercase",letterSpacing:"0.14em",color: "#999",marginBottom:3}}>Due Date</div><div>{fmtDate(due)}</div></div>
            </div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,marginBottom:16,minWidth:500}}><thead><tr style={{borderBottom:"2px solid #000"}}>{["Product","SKU","Size","Qty","Unit Price","Total"].map((h,i)=>(<th key={i} style={{padding:"7px 6px",textAlign:i>=3?"right":"left",fontSize:9,textTransform:"uppercase",letterSpacing:"0.12em",fontWeight:600,color: "#888",whiteSpace:"nowrap"}}>{h}</th>))}</tr></thead><tbody>{(inv.lines||orderLines).map((l,i)=>(<tr key={i} style={{borderBottom: "1px solid #222"}}><td style={{padding:"8px 6px",fontWeight:500}}>{l.product}</td><td style={{padding:"8px 6px",color: "#666",fontSize:10}}>{l.sku}</td><td style={{padding:"8px 6px"}}>{SIZE_LABELS[l.size]}</td><td style={{padding:"8px 6px",textAlign:"right"}}>{l.qty}</td><td style={{padding:"8px 6px",textAlign:"right",color: "#888"}}>{formatEUR(l.unitPrice)}</td><td style={{padding:"8px 6px",textAlign:"right",fontWeight:600}}>{formatEUR(l.total)}</td></tr>))}</tbody></table>
            </div>
            <div style={{display:"flex",justifyContent:"flex-end"}}><div style={{width:"100%",maxWidth:300}}>
              <div style={{display:"flex",justifyContent:"space-between",padding:"6px 0",fontSize:11,color: "#888",borderBottom: "1px solid #222"}}><span>Subtotal (excl. VAT)</span><span>{formatEUR(inv.totalWSP)}</span></div>
              {inv.vatAmount>0&&<div style={{display:"flex",justifyContent:"space-between",padding:"6px 0",fontSize:11,color: "#888",borderBottom: "1px solid #222"}}><span>{inv.vatInfo.label}</span><span>{formatEUR(inv.vatAmount)}</span></div>}
              {inv.vatInfo.rate===0&&inv.buyer?.country&&<div style={{display:"flex",justifyContent:"space-between",padding:"6px 0",fontSize:10,color: "#666",borderBottom: "1px solid #222"}}><span>VAT</span><span>{inv.vatInfo.label}</span></div>}
              {inv.shipping>0&&<div style={{display:"flex",justifyContent:"space-between",padding:"6px 0",fontSize:11,color: "#888",borderBottom: "1px solid #222"}}><span>Shipping</span><span>{formatEUR(inv.shipping)}</span></div>}
              <div style={{display:"flex",justifyContent:"space-between",padding:"6px 0",fontSize:11,color: "#888",borderBottom: "1px solid #222"}}><span>Total incl. VAT &amp; Shipping</span><span style={{fontWeight:500}}>{formatEUR(inv.totalWithVat)}</span></div>
              {invoiceViewType==="balance" ? (
                <div style={{display:"flex",justifyContent:"space-between",padding:"10px 0 0",fontSize:16,fontWeight:700,borderTop:"2px solid #000",marginTop:6}}><span>Amount Due</span><span>{formatEUR(inv.balanceAmount || 0)}</span></div>
              ) : (
                <div style={{display:"flex",justifyContent:"space-between",padding:"10px 0 0",fontSize:16,fontWeight:700,borderTop:"2px solid #000",marginTop:6}}><span>Amount Due (Shipping)</span><span>{formatEUR(inv.depositInvoiceTotal || inv.depositAmount)}</span></div>
              )}
            </div></div>
            {inv.vatInfo&&<div style={{marginTop:14,fontSize:10,color: "#666",fontStyle:"italic"}}>{inv.vatInfo.note}</div>}
            <div style={{marginTop:20,paddingTop:16,borderTop: "1px solid #333",fontSize:10,color: "#888",lineHeight:1.7}}>
              <div style={{fontSize:9,textTransform:"uppercase",letterSpacing:"0.14em",color: "#999",marginBottom:8}}>Payment Details</div>
              <div style={{display:"grid",gridTemplateColumns:"auto 1fr",gap:"3px 14px"}}><span style={{color: "#666"}}>Bank</span><span>{SELLER.bank}</span><span style={{color: "#666"}}>REG</span><span>{SELLER.reg}</span><span style={{color: "#666"}}>Account</span><span>{SELLER.account}</span><span style={{color: "#666"}}>IBAN</span><span style={{fontWeight:500,letterSpacing:"0.03em"}}>{SELLER.iban}</span><span style={{color: "#666"}}>BIC/SWIFT</span><span>{SELLER.swift}</span></div>
              <div style={{marginTop:14,padding:"12px 16px",background: "#1a1a1a",borderRadius:8,color:"#888",fontSize:10,lineHeight:1.6}}>{invoiceViewType==="balance"
                ? `This is the full invoice for order ${displayId}. Please transfer ${formatEUR(inv.balanceAmount || 0)} to the bank account above. Shipment will proceed upon receipt of payment.`
                : `Order will be confirmed upon receipt of the shipping fee (${formatEUR(inv.depositInvoiceTotal || inv.depositAmount)}). The full order amount (${formatEUR(inv.balanceAmount || 0)}) is invoiced separately and due prior to shipment.`
              }</div>
            </div>
          </div>
        </div></FadeIn>
      </div>
    );
  }

  return null;
}
