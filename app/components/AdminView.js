"use client";
import { PRODUCTS } from "@/lib/products";
import { SIZE_LABELS, formatEUR } from "@/lib/format";
import { base, ConfirmModal, Header, NoteSection, inputStyle, labelStyle, FONT, ORDER_STATUSES } from "./shared";

// Whether each of an order's two invoices actually reached e-conomic. Until
// now the only signal was a sync-failure row, so a draft that silently never
// got created looked identical to one that did — and Dorte's books were short
// an invoice with nothing on screen to say so.
//
// Four states, because "not sent" alone would be read as a failure in three of
// them: green = the draft exists and re-toggling won't create a second; grey =
// an attempt is in flight (the sync is fire-and-forget, so it's normal for a
// second or two after toggling); blue = superseded, meaning the order was
// edited after this draft was posted and the old document is still sitting in
// her accounting waiting to be deleted by hand; amber = genuinely nothing sent.
function EconomicSync({ economic, statuses, cancelled }) {
  if (!economic) return null; // buyer view, or a row from before migration 006
  const rows = [
    { label: "Shipping", claimed: economic.depositClaimedAt, synced: economic.depositSyncedAt, num: economic.depositDraftNumber, expected: statuses.deposit_invoiced },
    { label: "Full", claimed: economic.balanceClaimedAt, synced: economic.balanceSyncedAt, num: economic.balanceDraftNumber, expected: statuses.balance_invoiced },
  ].filter((r) => r.expected);

  // Every draft that must be removed from e-conomic by hand: the ones an edit
  // replaced, plus — for a cancelled order — the live drafts themselves, since
  // cancelling here cannot retract a document already in her accounting.
  const orphaned = [
    ...(economic.supersededDrafts || []),
    ...(cancelled ? rows.filter((r) => r.synced && r.num).map((r) => r.num) : []),
  ];

  if (rows.length === 0 && orphaned.length === 0) return null;

  const state = (r) => {
    if (r.synced) return { text: r.num ? `draft #${r.num}` : "sent", fg: "#4ade80", bg: "#0c1a12", bd: "#1f3d2b" };
    if (r.claimed) return { text: "sending…", fg: "#9ca3af", bg: "#111", bd: "#333" };
    // A draft number with no claim and no sync means the order was edited
    // after that draft was created — see app/api/orders/[id]/route.js.
    if (r.num) return { text: `#${r.num} superseded — delete it in e-conomic`, fg: "#7dd3fc", bg: "#0a1620", bd: "#1e3a4a" };
    return { text: "not sent", fg: "#eab308", bg: "#1a1408", bd: "#4a3a10" };
  };

  return (
    <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:10,fontSize:9,letterSpacing:"0.06em",textTransform:"uppercase",color:"#666"}}>
      <span style={{alignSelf:"center"}}>e-conomic</span>
      {rows.map((r) => {
        const s = state(r);
        return (
          <span key={r.label} style={{padding:"4px 9px",borderRadius:6,border:`1px solid ${s.bd}`,background:s.bg,color:s.fg}}>
            {r.label}: {s.text}
          </span>
        );
      })}
      {orphaned.length > 0 && (
        <span style={{padding:"4px 9px",borderRadius:6,border:"1px solid #4a1010",background:"#1a0a0a",color:"#f87171"}}>
          Delete in e-conomic: {orphaned.map((n) => `#${n}`).join(", ")}
        </span>
      )}
    </div>
  );
}

export default function AdminView({
  setView, currentUser, handleLogout,
  adminExpanded, setAdminExpanded,
  promoCodes, adminPromoForm, setAdminPromoForm, savePromoCode, deletePromoCode,
  inventory, setInventory, saveInventory, inventoryLoaded, inventoryDirty,
  buyers, buyerManageForm, setBuyerManageForm, inviteBuyer,
  admins, adminManageForm, setAdminManageForm, addAdmin, removeAdmin, session,
  syncFailures, resolveSyncFailure,
  errorLog, setErrorLog, showToast,
  allOrders, adminCompanyFilter, setAdminCompanyFilter, adminStatusFilter, setAdminStatusFilter, adminSearch, setAdminSearch, exportCSV,
  editingOrderId, setEditingOrderId, editQtys, setEditQtys, getStock, handleUpdateOrder,
  toggleOrderStatus, handleViewInvoice, cancelOrder, restoreOrder, deleteOrder,
  noteInputs, setNoteInputs, addNote,
  confirm, closeConfirm,
}) {
  const companies = [...new Set(allOrders.map(o => o.buyer.company).filter(Boolean))].sort();
  const companyStats = companies.map(c => {
    const orders = allOrders.filter(o => o.buyer.company === c);
    // Cancelled orders aren't revenue.
    const total = orders.filter(o => !o.cancelled).reduce((s, o) => s + (o.totalWithVat || 0), 0);
    const active = orders.filter(o => !o.cancelled).length;
    return { name: c, count: orders.length, active, total };
  });

  const statusFilters = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "cancelled", label: "Cancelled" },
    ...ORDER_STATUSES.map(s => ({ key: s.key, label: s.label }))
  ];
  const q = (adminSearch || "").trim().toLowerCase();
  const filtered = allOrders.filter(o => {
    if (q && !(
      o.id.toLowerCase().includes(q) ||
      (o.buyer.email || "").toLowerCase().includes(q) ||
      (o.buyer.company || "").toLowerCase().includes(q)
    )) return false;
    if (adminCompanyFilter && o.buyer.company !== adminCompanyFilter) return false;
    if (adminStatusFilter === "all") return true;
    if (adminStatusFilter === "active") return !o.cancelled;
    if (adminStatusFilter === "cancelled") return o.cancelled;
    return o.statuses[adminStatusFilter] === true;
  });

  return (
    <div style={base}>
      <Header currentUser={currentUser} setView={setView} right={<div style={{display:"flex",gap:10,alignItems:"center"}}><button onClick={()=>setView("catalog")} style={{background:"none",border: "1px solid #2a2a2a",padding:"6px 14px",borderRadius:8,fontSize:10,color: "#888",cursor:"pointer",fontFamily:FONT,letterSpacing:"0.08em",textTransform:"uppercase"}}>View Portal</button><button onClick={handleLogout} style={{background:"none",border: "1px solid #2a2a2a",padding:"6px 14px",borderRadius:8,fontSize:10,color: "#666",cursor:"pointer",fontFamily:FONT,letterSpacing:"0.08em",textTransform:"uppercase"}}>Sign Out</button></div>} />
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
                      <div style={{color: "#888",fontSize:10,marginTop:2}}>{p.label} — {p.prices["2 ML"]}/{p.prices["20 ML"]}/{p.prices["50 ML"]}/{p.prices["100 ML"]} · Kit {p.prices["KIT"]}</div>
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
                  <div className="da-grid-promo" style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8}}>
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
            <span>Inventory{inventoryDirty && <span style={{fontSize:9,color:"#eab308",letterSpacing:"0.08em",marginLeft:10,fontWeight:400}}>UNSAVED</span>}</span>
            <span style={{fontSize:16,color:"#888"}}>{adminExpanded==="inventory"?"−":"+"}</span>
          </button>
          {adminExpanded==="inventory" && (
            <div style={{borderTop: "1px solid #222",padding:"20px"}}>
              <div style={{fontSize:10,color: "#666",marginBottom:16,letterSpacing:"0.08em",textTransform:"uppercase",fontWeight:600}}>Current Stock</div>
              <div className="da-grid-inv" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:16,maxHeight:"400px",overflowY:"auto"}}>
                {PRODUCTS.map((p,pi) => p.variants.map((v,vi) => (
                  <div key={`${pi}-${vi}`} style={{padding:"12px",background: "#1a1a1a",borderRadius:8,border: "1px solid #222"}}>
                    <div style={{fontSize:10,fontWeight:600,color: "#eee",marginBottom:4}}>{p.name}</div>
                    <div style={{fontSize:9,color: "#666",marginBottom:8}}>{v.size}</div>
                    <input type="number" className="da-input" style={{...inputStyle,fontSize:11,padding:"8px 12px"}} value={inventory[v.sku]!==undefined?inventory[v.sku]:""} onChange={e=>{const raw=e.target.value;if(raw===""){setInventory({...inventory,[v.sku]:0});return;}const n=parseInt(raw,10);setInventory({...inventory,[v.sku]:isNaN(n)?0:Math.max(0,n)});}} placeholder="0"/>
                  </div>
                )))}
              </div>
              <button onClick={saveInventory} disabled={!inventoryLoaded} style={{width:"100%",background:"#fff",color:"#000",border:"none",padding:"12px",borderRadius:8,fontSize:11,fontWeight:600,cursor:inventoryLoaded?"pointer":"default",opacity:inventoryLoaded?1:0.4,fontFamily:FONT,letterSpacing:"0.08em",textTransform:"uppercase"}}>Save All</button>
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
                        <div style={{fontWeight:600,color:"#f97316"}}>{f.type === "email" ? "Email" : "e-conomic"} — {f.context}{f.order_id && <> · <button onClick={()=>{setAdminCompanyFilter(null);setAdminStatusFilter("all");setAdminSearch(f.order_id);setAdminExpanded(null);}} style={{background:"none",border:"none",padding:0,color:"#eee",fontSize:11,fontFamily:FONT,cursor:"pointer",textDecoration:"underline",textUnderlineOffset:2}}>order {f.order_id}</button></>}</div>
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
        {companies.length > 0 && (
          <div style={{marginBottom:32}}>
            <div style={{fontSize:15,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:16}}>Companies ({companies.length})</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:12}}>
              <button onClick={()=>setAdminCompanyFilter(null)} style={{padding:"16px",borderRadius:10,border:adminCompanyFilter===null?"2px solid #fff":"1px solid #333",background:adminCompanyFilter===null?"#000":"transparent",color:adminCompanyFilter===null?"#fff":"#ccc",cursor:"pointer",fontFamily:FONT,textAlign:"left",transition:"all 0.2s"}}>
                <div style={{fontSize:11,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase"}}>All Companies</div>
                <div style={{fontSize:20,fontWeight:600,marginTop:8}}>{allOrders.length}</div>
                <div style={{fontSize:9,color:adminCompanyFilter===null?"rgba(255,255,255,0.6)":"#999",marginTop:2,letterSpacing:"0.06em",textTransform:"uppercase"}}>{formatEUR(allOrders.filter(o=>!o.cancelled).reduce((s,o)=>s+(o.totalWithVat||0),0))} total</div>
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
        )}

        {/* ── Orders Header + Filters ── */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:12}}>
          <div style={{fontSize:15,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase"}}>Orders ({filtered.length}{adminCompanyFilter || adminStatusFilter !== "all" || q ? ` / ${allOrders.length}` : ""})</div>
          <input className="da-input" placeholder="Search order #, email or company" value={adminSearch} onChange={e=>setAdminSearch(e.target.value)} style={{...inputStyle,width:260,padding:"9px 14px",fontSize:11,marginLeft:"auto",marginRight:10}} />
          <button className="da-btn" onClick={()=>exportCSV(filtered)} style={{background:"#000",color:"#fff",border:"none",padding:"11px 20px",borderRadius:10,fontSize:10,fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase",cursor:"pointer",fontFamily:FONT}}>Export CSV</button>
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
                        // Original qty + remaining free stock (the order's own
                        // units aren't back in the pool while it's open).
                        const maxVal = stock !== null ? l.qty + stock : undefined;
                        return (
                        <div key={i} style={{display:"grid",gridTemplateColumns:"1fr auto auto",gap:8,alignItems:"center",fontSize:11}}>
                          <span>{l.product} — {SIZE_LABELS[l.size]} @ {formatEUR(l.unitPrice)}</span>
                          <input type="number" min="0" max={maxVal} style={{...inputStyle,width:60,padding:"6px 8px",fontSize:11}} value={editQtys[l.sku]!==undefined?editQtys[l.sku]:l.qty} onChange={e=>{const raw=e.target.value;if(raw===""){setEditQtys({...editQtys,[l.sku]:0});return;}let v=parseInt(raw,10)||0;if(stock!==null)v=Math.min(v,l.qty+stock);setEditQtys({...editQtys,[l.sku]:Math.max(0,v)});}} onFocus={e=>e.target.select()} />
                          {stock !== null && <span style={{fontSize:9,color: "#666"}}>(max {l.qty + stock})</span>}
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
                  <EconomicSync economic={order.economic} statuses={order.statuses} cancelled={order.cancelled} />
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
      </div>
      <ConfirmModal {...confirm} onCancel={closeConfirm} />
    </div>
  );
}
