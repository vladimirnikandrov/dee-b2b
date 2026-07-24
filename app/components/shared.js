"use client";
// Shared primitives used across every view: constants, small presentational
// components, and the page-chrome (Header/UserNav) that closes over live
// app state via explicit props rather than the parent's closures.
import { useEffect } from "react";
import { LOGO_WHITE, LOGO_BLACK } from "@/lib/assets";

export const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";
export const base = { fontFamily: FONT, color: "#fff", background: "#000", minHeight: "100vh", margin: 0, padding: 0 };
export const inputStyle = { width: "100%", padding: "12px 16px", border: "1px solid #333", fontSize: 13, fontFamily: FONT, outline: "none", borderRadius: 10, background: "#1a1a1a", color: "#ccc", transition: "border-color 0.2s", boxSizing: "border-box" };
export const labelStyle = { fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "#666", marginBottom: 6, display: "block" };

export const ORDER_STATUSES = [
  { key: "deposit_invoiced", label: "Shipping Invoiced" }, { key: "deposit_paid", label: "Shipping Paid" },
  { key: "packed", label: "Packed" }, { key: "balance_invoiced", label: "Full Invoiced" },
  { key: "balance_paid", label: "Paid in Full" }, { key: "shipped", label: "Shipped" },
  { key: "received", label: "Received" },
];

export const PROMO_CODES_DEFAULT = [
  { code: "MOODSCENTBAR", label: "B2VIP", discount_type: "fixed_prices", prices: { "100 ML": 48, "50 ML": 35, "20 ML": 16, "2 ML": 2, "KIT": 8 } }
];

export function generateOrderNumber() { const d=new Date(); return `DA-${d.getFullYear().toString().slice(-2)}${String(d.getMonth()+1).padStart(2,"0")}-${Math.floor(Math.random()*9000)+1000}`; }

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

export function QtyInput({ value, onChange, max }) {
  const atMax = max !== undefined && max !== null && value >= max;
  const s = {width:32,height:32,border:"none",background:"transparent",cursor:"pointer",fontSize:14,color:"#aaa",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:FONT,padding:0};
  const clamp = (v) => { let n = Math.max(0, v); if (max !== undefined && max !== null) n = Math.min(n, max); return n; };
  return (<div style={{display:"inline-flex",alignItems:"center",borderRadius:8,border:`1px solid ${atMax?"#eab308":"#444"}`,overflow:"hidden",background: "#000"}}><button className="da-qty-btn" onClick={()=>onChange(Math.max(0,value-1))} style={s}>−</button><input type="number" min="0" max={max} value={value} onChange={(e)=>onChange(clamp(parseInt(e.target.value)||0))} style={{width:36,height:32,border:"none",borderLeft: "1px solid #333",borderRight: "1px solid #333",textAlign:"center",fontSize:12,fontWeight:500,fontFamily:FONT,outline:"none",background:"transparent",padding:0,color:"#fff"}}/><button className="da-qty-btn" onClick={()=>onChange(clamp(value+1))} style={{...s,opacity:atMax?0.3:1,cursor:atMax?"default":"pointer"}}>+</button></div>);
}

export function FadeIn({ children, delay = 0, style = {} }) {
  return <div style={{animation:`fadeUp 0.6s cubic-bezier(0.23,1,0.32,1) ${delay}s both`,...style}}>{children}</div>;
}

/* ═══════════════════════════════════════════
   TOAST
   ═══════════════════════════════════════════ */

export function Toast({ message, visible, onHide }) {
  useEffect(() => { if (visible) { const t = setTimeout(onHide, 2800); return () => clearTimeout(t); } }, [visible, onHide]);
  if (!visible) return null;
  return (
    <div style={{position:"fixed",bottom:28,left:"50%",transform:"translateX(-50%)",background:"#fff",color:"#000",padding:"14px 28px",borderRadius:14,fontSize:12,fontWeight:500,letterSpacing:"0.04em",fontFamily:FONT,zIndex:100,boxShadow:"0 8px 32px rgba(0,0,0,0.5)",animation:"toastIn 0.3s ease",pointerEvents:"none",whiteSpace:"nowrap"}}>{message}</div>
  );
}

/* ═══════════════════════════════════════════
   CONFIRM MODAL
   ═══════════════════════════════════════════ */

export function ConfirmModal({ open, title, message, confirmLabel, cancelLabel, onConfirm, onCancel, danger }) {
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

export function NoteSection({ orderId, notes, isAdminView, noteInputs, setNoteInputs, addNote }) {
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

export function AuthScreen({ title, fields, onSubmit, submitLabel, altText, altAction, altLabel, authError, adminError, onBack }) {
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
   PAGE CHROME — Header / UserNav
   ═══════════════════════════════════════════ */

export function Header({ right, currentUser, setView }) {
  return (
    <div className="da-header-pad" style={{background: "#000",padding:"20px 48px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom: "1px solid #333",position:"sticky",top:0,zIndex:20,backdropFilter:"blur(12px)",flexWrap:"wrap",gap:12}}>
      <div style={{cursor:"pointer"}} onClick={() => currentUser ? setView("catalog") : setView("landing")}>
        <Logo style={{ height: 22 }} />
      </div>
      {right}
    </div>
  );
}

export function UserNav({ view, setView, session, currentUser, handleLogout }) {
  return (
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
}
