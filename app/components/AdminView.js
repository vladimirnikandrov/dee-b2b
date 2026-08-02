"use client";
import { PRODUCTS } from "@/lib/products";
import { SIZE_LABELS, formatEUR } from "@/lib/format";
import { base, Header, NoteSection, inputStyle, labelStyle, FONT, ORDER_STATUSES } from "./shared";

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
    <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:10,fontSize:11,letterSpacing:"0.06em",textTransform:"uppercase",color:"#8a8a8a"}}>
      <span style={{alignSelf:"center"}}>e-conomic</span>
      {rows.map((r) => {
        const s = state(r);
        return (
          <span key={r.label} style={{padding:"4px 8px",borderRadius:10,border:`1px solid ${s.bd}`,background:s.bg,color:s.fg}}>
            {r.label}: {s.text}
          </span>
        );
      })}
      {orphaned.length > 0 && (
        <span style={{padding:"4px 8px",borderRadius:10,border:"1px solid #4a1010",background:"#1a0a0a",color:"#f87171"}}>
          Delete in e-conomic: {orphaned.map((n) => `#${n}`).join(", ")}
        </span>
      )}
    </div>
  );
}

// How many orders are drawn before "show more". Nothing here is paginated
// server-side — the whole list is already in memory — this is purely about not
// rendering a 40 000px page.
const PAGE = 25;

// Drafts that exist in Dorte's real accounting and have to be removed there by
// hand: the ones an edit superseded, plus a cancelled order's live drafts.
function orphanCount(order) {
  const e = order.economic;
  if (!e) return 0;
  const superseded = (e.supersededDrafts || []).length;
  const live = order.cancelled ? [e.depositDraftNumber, e.balanceDraftNumber].filter(Boolean).length : 0;
  return superseded + live;
}

export default function AdminView({
  setView, currentUser, handleLogout,
  adminExpanded, setAdminExpanded, expandedOrder, setExpandedOrder, orderLimit, setOrderLimit,
  promoCodes, adminPromoForm, setAdminPromoForm, savePromoCode, deletePromoCode,
  inventory, inventorySaved, setInventory, saveInventory, inventoryLoaded, inventoryDirty,
  buyers, buyerManageForm, setBuyerManageForm, inviteBuyer, removeBuyer, restoreBuyer,
  admins, adminManageForm, setAdminManageForm, addAdmin, removeAdmin, session,
  syncFailures, resolveSyncFailure,
  errorLog, setErrorLog, showToast,
  allOrders, ordersError, reloadOrders, adminCompanyFilter, setAdminCompanyFilter, adminStatusFilter, setAdminStatusFilter, adminSearch, setAdminSearch, exportCSV,
  editingOrderId, setEditingOrderId, editQtys, setEditQtys, getStock, handleUpdateOrder,
  toggleOrderStatus, handleViewInvoice, cancelOrder, restoreOrder, deleteOrder,
  noteInputs, setNoteInputs, addNote,
}) {
  const companies = [...new Set(allOrders.map(o => o.buyer.company).filter(Boolean))].sort();
  const companyStats = companies.map(c => {
    const orders = allOrders.filter(o => o.buyer.company === c);
    // Cancelled orders aren't revenue.
    const total = orders.filter(o => !o.cancelled).reduce((s, o) => s + (o.totalWithVat || 0), 0);
    const active = orders.filter(o => !o.cancelled).length;
    return { name: c, count: orders.length, active, total };
  });

  // Where an order is NOW, not everything it has ever been. The filters used
  // to test `statuses[key] === true`, and the flags are cumulative — so a
  // finished order matched all seven stages at once and "Shipping invoiced"
  // listed every order in the system instead of the ones waiting to be paid.
  const currentStage = (o) => {
    for (let i = ORDER_STATUSES.length - 1; i >= 0; i--) {
      if (o.statuses[ORDER_STATUSES[i].key]) return ORDER_STATUSES[i].key;
    }
    return null;
  };
  // What Dorte is actually looking for when she opens the panel: the orders
  // with a next action on them.
  const needsAction = (o) => !o.cancelled && !o.statuses.received;


  const q = (adminSearch || "").trim().toLowerCase();
  const matchesQuery = (o) => !q || (
    o.id.toLowerCase().includes(q) ||
    (o.buyer.email || "").toLowerCase().includes(q) ||
    (o.buyer.company || "").toLowerCase().includes(q)
  );
  const matchesStage = (o) => {
    if (adminStatusFilter === "all") return true;
    if (adminStatusFilter === "todo") return needsAction(o);
    if (adminStatusFilter === "active") return !o.cancelled;
    if (adminStatusFilter === "cancelled") return o.cancelled;
    return !o.cancelled && currentStage(o) === adminStatusFilter;
  };
  // Searching means "find this order", full stop. The panel now opens on
  // "Needs action", so ANDing the two meant pasting the number of a delivered
  // order returned nothing — the one case where you most need search to work.
  const searching = q.length > 0;
  const scope = allOrders.filter((o) => matchesQuery(o) && (!adminCompanyFilter || o.buyer.company === adminCompanyFilter));
  // The card that is open stays in the list even once it stops matching.
  // Advancing a status from inside an expanded card changes its stage, and with
  // a stage filter active the card Dorte was working in simply vanished
  // mid-task — the row she just clicked, gone, with the next click landing on
  // whatever slid up into its place.
  const filtered = searching ? scope : scope.filter((o) => matchesStage(o) || o.id === expandedOrder);

  // Counts are computed AFTER the company filter and the search, so a chip
  // reading "1" can't sit above an empty list.
  const stageCounts = scope.reduce((acc, o) => {
    const k = o.cancelled ? "cancelled" : currentStage(o) || "new";
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
  const statusFilters = [
    { key: "all", label: "All", count: scope.length },
    { key: "todo", label: "Needs action", count: scope.filter(needsAction).length },
    { key: "active", label: "Active", count: scope.filter(o => !o.cancelled).length },
    { key: "cancelled", label: "Cancelled", count: stageCounts.cancelled || 0 },
    ...ORDER_STATUSES.map(st => ({ key: st.key, label: st.label, count: stageCounts[st.key] || 0 })),
  ];

  const visible = filtered.slice(0, orderLimit);

  return (
    <div style={base}>
      <Header currentUser={currentUser} setView={setView} right={<div style={{display:"flex",gap:10,alignItems:"center"}}><button onClick={()=>setView("catalog")} style={{background:"none",border: "1px solid #2a2a2a",padding:"6px 12px",borderRadius:10,fontSize:10,color: "#888",cursor:"pointer",fontFamily:FONT,letterSpacing:"0.08em",textTransform:"uppercase"}}>View portal</button><button onClick={handleLogout} style={{background:"none",border: "1px solid #2a2a2a",padding:"6px 12px",borderRadius:10,fontSize:10,color: "#8a8a8a",cursor:"pointer",fontFamily:FONT,letterSpacing:"0.08em",textTransform:"uppercase"}}>Sign Out</button></div>} />
      <main className="da-pad" style={{padding:"48px 48px"}}>
        <h1 style={{fontSize:17,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:32}}>Admin panel</h1>

        <div style={{background: "#000",borderRadius:10,border: "1px solid #2a2a2a",marginBottom:32}}>
          <button onClick={()=>setAdminExpanded(adminExpanded==="promos"?null:"promos")} style={{width:"100%",padding:"16px 20px",background:"none",border:"none",textAlign:"left",cursor:"pointer",fontSize:13,fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase",display:"flex",justifyContent:"space-between",alignItems:"center",fontFamily:FONT,color:"#fff"}}>
            Promo Codes
            <span style={{fontSize:16,color:"#888"}}>{adminExpanded==="promos"?"−":"+"}</span>
          </button>
          {adminExpanded==="promos" && (
            <div style={{borderTop: "1px solid #222",padding:"20px"}}>
              <div style={{marginBottom:24}}>
                {promoCodes.map((p,i) => (
                  <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px",background: "#1a1a1a",borderRadius:10,marginBottom:8,fontSize:11}}>
                    <div>
                      <div style={{fontWeight:600}}>{p.code}</div>
                      <div style={{color: "#888",fontSize:11,marginTop:2}}>{p.label} — {p.prices["2 ML"]}/{p.prices["20 ML"]}/{p.prices["50 ML"]}/{p.prices["100 ML"]} · Kit {p.prices["KIT"]}</div>
                    </div>
                    <button onClick={()=>deletePromoCode(p.code)} style={{background:"#f87171",color:"#fff",border:"none",padding:"6px 12px",borderRadius:10,fontSize:11,cursor:"pointer",fontFamily:FONT,fontWeight:500}}>Delete</button>
                  </div>
                ))}
              </div>
              <div style={{background: "#0a0a0a",padding:"16px",borderRadius:10}}>
                <div style={{fontSize:11,fontWeight:600,marginBottom:12,letterSpacing:"0.08em",textTransform:"uppercase",color: "#888"}}>Add New Code</div>
                <div style={{display:"grid",gap:12,marginBottom:12}}>
                  <input className="da-input" style={{...inputStyle,fontSize:16}} placeholder="Code (e.g. MOODSCENTBAR)" value={adminPromoForm.code} onChange={e=>setAdminPromoForm({...adminPromoForm,code:e.target.value})} />
                  <input className="da-input" style={{...inputStyle,fontSize:16}} placeholder="Label (e.g. B2VIP)" value={adminPromoForm.label} onChange={e=>setAdminPromoForm({...adminPromoForm,label:e.target.value})} />
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
                        <div key={size}><label style={{...labelStyle,fontSize:11}}>{size}</label><input className="da-input" style={{...inputStyle,fontSize:16}} type="number" placeholder={placeholderSize} value={adminPromoForm.prices[size]} onChange={e=>setAdminPromoForm({...adminPromoForm,prices:{...adminPromoForm.prices,[size]:e.target.value}})} /></div>
                      );
                    })}
                  </div>
                </div>
                <button onClick={savePromoCode} style={{width:"100%",background:"#fff",color:"#000",border:"none",padding:"12px",borderRadius:10,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:FONT,letterSpacing:"0.08em",textTransform:"uppercase"}}>Save Code</button>
              </div>
            </div>
          )}
        </div>

        <div style={{background: "#000",borderRadius:10,border: "1px solid #2a2a2a",marginBottom:32}}>
          <button onClick={()=>setAdminExpanded(adminExpanded==="inventory"?null:"inventory")} style={{width:"100%",padding:"16px 20px",background:"none",border:"none",textAlign:"left",cursor:"pointer",fontSize:13,fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase",display:"flex",justifyContent:"space-between",alignItems:"center",fontFamily:FONT,color:"#fff"}}>
            <span>Inventory{inventoryDirty && <span style={{fontSize:11,color:"#eab308",letterSpacing:"0.08em",marginLeft:10,fontWeight:400}}>UNSAVED</span>}</span>
            <span style={{fontSize:16,color:"#888"}}>{adminExpanded==="inventory"?"−":"+"}</span>
          </button>
          {adminExpanded==="inventory" && (
            <div style={{borderTop: "1px solid #222",padding:"20px"}}>
              <div style={{fontSize:10,color: "#8a8a8a",marginBottom:16,letterSpacing:"0.08em",textTransform:"uppercase",fontWeight:600}}>Current Stock</div>
              <div className="da-grid-inv" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:16,maxHeight:"400px",overflowY:"auto"}}>
                {PRODUCTS.map((p,pi) => p.variants.map((v,vi) => (
                  <div key={`${pi}-${vi}`} style={{padding:"12px",background: "#1a1a1a",borderRadius:10,border: "1px solid #222"}}>
                    <div style={{fontSize:11,fontWeight:600,color: "#eee",marginBottom:4}}>{p.name}</div>
                    <div style={{fontSize:11,color: "#8a8a8a",marginBottom:8}}>{v.size}</div>
                    {/* An empty field used to commit a 0 the moment it was
                        cleared, so clearing it to retype read as "zero this
                        SKU". It can now be empty while being retyped, and
                        reverts to its last value on blur — leaving it blank and
                        pressing Save must not silently do nothing while the
                        panel reports success. To actually zero a SKU, type 0. */}
                    <input type="number" inputMode="numeric" className="da-input" aria-label={`Stock, ${p.name} ${v.size}`} style={{...inputStyle,fontSize:16,padding:"8px 12px"}} value={inventory[v.sku]!==undefined&&inventory[v.sku]!==null?inventory[v.sku]:""} onFocus={e=>e.target.select()} onBlur={()=>{if(inventory[v.sku]===null||inventory[v.sku]===undefined)setInventory({...inventory,[v.sku]:inventorySaved[v.sku] ?? 0});}} onChange={e=>{const raw=e.target.value;if(raw===""){setInventory({...inventory,[v.sku]:null});return;}const n=parseInt(raw,10);setInventory({...inventory,[v.sku]:isNaN(n)?0:Math.max(0,n)});}} placeholder="0"/>
                  </div>
                )))}
              </div>
              <button className="da-btn" onClick={saveInventory} disabled={!inventoryLoaded} style={{width:"100%",background:"#fff",color:"#000",border:"none",padding:"12px",borderRadius:10,fontSize:11,fontWeight:600,cursor:inventoryLoaded?"pointer":"default",opacity:inventoryLoaded?1:0.4,fontFamily:FONT,letterSpacing:"0.08em",textTransform:"uppercase"}}>{inventoryDirty ? "Save changes" : "Save all"}</button>
              {/* The one sentence explaining the greyed-out button lived in a
                  toast the disabled button could never fire. */}
              {!inventoryLoaded && <div style={{marginTop:8,fontSize:12,color:"#eab308",textAlign:"center",lineHeight:1.6}}>Stock couldn&apos;t be loaded — reload the page before saving, or you&apos;d be writing over figures this page never read.</div>}
              {inventoryLoaded && inventoryDirty && <div style={{marginTop:8,fontSize:12,color:"#9a9a9a",textAlign:"center"}}>Unsaved changes</div>}
            </div>
          )}
        </div>

        <div style={{background: "#000",borderRadius:10,border: "1px solid #2a2a2a",marginBottom:32}}>
          <button onClick={()=>setAdminExpanded(adminExpanded==="buyers"?null:"buyers")} style={{width:"100%",padding:"16px 20px",background:"none",border:"none",textAlign:"left",cursor:"pointer",fontSize:13,fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase",display:"flex",justifyContent:"space-between",alignItems:"center",fontFamily:FONT,color:"#fff"}}>
            Buyers ({buyers.length})
            <span style={{fontSize:16,color:"#888"}}>{adminExpanded==="buyers"?"−":"+"}</span>
          </button>
          {adminExpanded==="buyers" && (
            <div style={{borderTop: "1px solid #222",padding:"20px"}}>
              <div style={{marginBottom:24,maxHeight:300,overflowY:"auto"}}>
                {/* Invite-only means the account is the access control, so it
                    has to be revocable — a shop that closed, a contact who
                    moved on, an address typed wrong. */}
                {buyers.map((b) => (
                  <div key={b.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,padding:"12px",background: "#1a1a1a",borderRadius:10,marginBottom:8,fontSize:11}}>
                    <div style={{minWidth:0}}>
                      <div style={{fontWeight:600,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                        <span style={{opacity:b.deactivated_at?0.6:1}}>{b.email}</span>
                        {b.deactivated_at && <span style={{padding:"2px 7px",border:"1px solid #4a3a10",color:"#eab308",borderRadius:10,fontSize:11,letterSpacing:"0.08em"}}>NO ACCESS</span>}
                      </div>
                      <div style={{color: "#8a8a8a",fontSize:11,marginTop:3}}>
                        {[b.company, `${b.order_count || 0} order${b.order_count === 1 ? "" : "s"}`, b.created_at ? `since ${new Date(b.created_at).toLocaleDateString("en-GB",{month:"short",year:"numeric"})}` : null].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                    {b.deactivated_at
                      ? <button className="da-btn" onClick={()=>restoreBuyer(b)} style={{background:"transparent",border:"1px solid #333",color:"#eee",padding:"8px 12px",borderRadius:10,fontSize:10,cursor:"pointer",fontFamily:FONT,letterSpacing:"0.06em",textTransform:"uppercase",whiteSpace:"nowrap"}}>Restore</button>
                      : <button className="da-btn" onClick={()=>removeBuyer(b)} style={{background:"transparent",border:"1px solid #f87171",color:"#f87171",padding:"8px 12px",borderRadius:10,fontSize:10,cursor:"pointer",fontFamily:FONT,letterSpacing:"0.06em",textTransform:"uppercase",whiteSpace:"nowrap"}}>Remove</button>}
                  </div>
                ))}
                {buyers.length === 0 && <div style={{color: "#8a8a8a",fontSize:11}}>No invited buyers yet.</div>}
              </div>
              <div style={{background: "#0a0a0a",padding:"16px",borderRadius:10}}>
                <div style={{fontSize:11,fontWeight:600,marginBottom:12,letterSpacing:"0.08em",textTransform:"uppercase",color: "#888"}}>Invite a new buyer</div>
                <div style={{display:"grid",gap:12,marginBottom:12}}>
                  <input className="da-input" style={{...inputStyle,fontSize:16}} type="email" placeholder="Email" value={buyerManageForm.email} onChange={e=>setBuyerManageForm({...buyerManageForm,email:e.target.value})} />
                  <input className="da-input" style={{...inputStyle,fontSize:16}} placeholder="Name / company (optional)" value={buyerManageForm.company} onChange={e=>setBuyerManageForm({...buyerManageForm,company:e.target.value})} />
                </div>
                <button onClick={inviteBuyer} style={{width:"100%",background:"#fff",color:"#000",border:"none",padding:"12px",borderRadius:10,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:FONT,letterSpacing:"0.08em",textTransform:"uppercase"}}>Invite buyer</button>
                <div style={{fontSize:11,color: "#8a8a8a",marginTop:10,lineHeight:1.5}}>They'll get a welcome email explaining how the platform works — no password to set, they just sign in with a code.</div>
              </div>
            </div>
          )}
        </div>

        <div style={{background: "#000",borderRadius:10,border: "1px solid #2a2a2a",marginBottom:32}}>
          <button onClick={()=>setAdminExpanded(adminExpanded==="admins"?null:"admins")} style={{width:"100%",padding:"16px 20px",background:"none",border:"none",textAlign:"left",cursor:"pointer",fontSize:13,fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase",display:"flex",justifyContent:"space-between",alignItems:"center",fontFamily:FONT,color:"#fff"}}>
            Admins ({admins.length})
            <span style={{fontSize:16,color:"#888"}}>{adminExpanded==="admins"?"−":"+"}</span>
          </button>
          {adminExpanded==="admins" && (
            <div style={{borderTop: "1px solid #222",padding:"20px"}}>
              <div style={{marginBottom:24}}>
                {admins.map((a) => (
                  <div key={a.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px",background: "#1a1a1a",borderRadius:10,marginBottom:8,fontSize:11}}>
                    <div>
                      <div style={{fontWeight:600}}>{a.email}{a.id===session?.id && <span style={{marginLeft:8,color:"#8a8a8a",fontWeight:400,fontSize:11}}>(you)</span>}</div>
                      {a.company && <div style={{color: "#888",fontSize:11,marginTop:2}}>{a.company}</div>}
                    </div>
                    {a.id !== session?.id && <button onClick={()=>removeAdmin(a.id)} style={{background:"#f87171",color:"#fff",border:"none",padding:"6px 12px",borderRadius:10,fontSize:11,cursor:"pointer",fontFamily:FONT,fontWeight:500}}>Remove</button>}
                  </div>
                ))}
              </div>
              <div style={{background: "#0a0a0a",padding:"16px",borderRadius:10}}>
                <div style={{fontSize:11,fontWeight:600,marginBottom:12,letterSpacing:"0.08em",textTransform:"uppercase",color: "#888"}}>Add a new admin</div>
                <div style={{display:"grid",gap:12,marginBottom:12}}>
                  <input className="da-input" style={{...inputStyle,fontSize:16}} type="email" placeholder="Email" value={adminManageForm.email} onChange={e=>setAdminManageForm({...adminManageForm,email:e.target.value})} />
                  <input className="da-input" style={{...inputStyle,fontSize:16}} placeholder="Name / company (optional)" value={adminManageForm.company} onChange={e=>setAdminManageForm({...adminManageForm,company:e.target.value})} />
                </div>
                <button onClick={addAdmin} style={{width:"100%",background:"#fff",color:"#000",border:"none",padding:"12px",borderRadius:10,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:FONT,letterSpacing:"0.08em",textTransform:"uppercase"}}>Add admin</button>
                <div style={{fontSize:11,color: "#8a8a8a",marginTop:10,lineHeight:1.5}}>They'll get a welcome email — no password to set, they just sign in with a code at the Admin entry point.</div>
              </div>
            </div>
          )}
        </div>

        {/* ── Sync Failures (failed emails / e-conomic syncs) ── */}
        {syncFailures.filter(f => !f.resolved).length > 0 && (
        <div style={{background: "#000",borderRadius:10,border: "1px solid #7c2d12",marginBottom:32}}>
          <button onClick={()=>setAdminExpanded(adminExpanded==="syncFailures"?null:"syncFailures")} style={{width:"100%",padding:"16px 20px",background:"none",border:"none",textAlign:"left",cursor:"pointer",fontSize:13,fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase",display:"flex",justifyContent:"space-between",alignItems:"center",fontFamily:FONT,color:"#f97316"}}>
            Sync Failures ({syncFailures.filter(f => !f.resolved).length})
            <span style={{fontSize:16,color:"#888"}}>{adminExpanded==="syncFailures"?"−":"+"}</span>
          </button>
          {adminExpanded==="syncFailures" && (
            <div style={{borderTop: "1px solid #222",padding:"20px"}}>
              <div style={{fontSize:11,color: "#888",marginBottom:16,lineHeight:1.5}}>An order's shipping/full invoice email or e-conomic sync failed and needs a look — check the order directly, then dismiss once handled.</div>
              <div style={{display:"grid",gap:8}}>
                {syncFailures.filter(f => !f.resolved).map((f) => (
                  <div key={f.id} style={{padding:"12px",background: "#1a1a1a",borderRadius:10,border:"1px solid #7c2d12",fontSize:11}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                      <div>
                        <div style={{fontWeight:600,color:"#f97316"}}>{f.type === "email" ? "Email" : "e-conomic"} — {f.context}{f.order_id && <> · <button onClick={()=>{setAdminCompanyFilter(null);setAdminStatusFilter("all");setAdminSearch(f.order_id);setAdminExpanded(null);}} style={{background:"none",border:"none",padding:0,color:"#eee",fontSize:11,fontFamily:FONT,cursor:"pointer",textDecoration:"underline",textUnderlineOffset:2}}>order {f.order_id}</button></>}</div>
                        <div style={{color:"#999",fontSize:11,marginTop:4,fontFamily:"monospace",wordBreak:"break-all"}}>{f.error}</div>
                        <div style={{color:"#8a8a8a",fontSize:11,marginTop:4}}>{new Date(f.created_at).toLocaleString("en-GB")}</div>
                      </div>
                      <button onClick={()=>resolveSyncFailure(f.id)} style={{background:"transparent",border:"1px solid #444",color:"#888",padding:"6px 12px",borderRadius:10,fontSize:11,cursor:"pointer",fontFamily:FONT,fontWeight:500,whiteSpace:"nowrap"}}>Dismiss</button>
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
        <div style={{background: "#000",borderRadius:10,border: "1px solid #2a2a2a",marginBottom:32}}>
          <button onClick={()=>setAdminExpanded(adminExpanded==="errors"?null:"errors")} style={{width:"100%",padding:"16px 20px",background:"none",border:"none",textAlign:"left",cursor:"pointer",fontSize:13,fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase",display:"flex",justifyContent:"space-between",alignItems:"center",fontFamily:FONT,color:"#f87171"}}>
            Error Log ({errorLog.length})
            <span style={{fontSize:16,color:"#888"}}>{adminExpanded==="errors"?"−":"+"}</span>
          </button>
          {adminExpanded==="errors" && (
            <div style={{borderTop: "1px solid #222",padding:"20px"}}>
              <div style={{display:"flex",gap:8,marginBottom:16}}>
                <button onClick={()=>{navigator.clipboard.writeText(errorLog.map(e=>`[${e.ts}] ${e.source}: ${e.detail}`).join("\n"));showToast("Copied to clipboard");}} style={{background:"#fff",color:"#000",border:"none",padding:"8px 16px",borderRadius:10,fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:FONT,letterSpacing:"0.08em",textTransform:"uppercase"}}>Copy All</button>
                <button onClick={()=>setErrorLog([])} style={{background:"transparent",border:"1px solid #444",color:"#888",padding:"8px 16px",borderRadius:10,fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:FONT,letterSpacing:"0.08em",textTransform:"uppercase"}}>Clear</button>
              </div>
              <div style={{maxHeight:300,overflowY:"auto",display:"grid",gap:6}}>
                {errorLog.map((e,i) => (
                  <div key={i} style={{padding:"10px 12px",background:"#1a1a1a",borderRadius:10,border:"1px solid #222",fontSize:11,fontFamily:"monospace",lineHeight:1.5}}>
                    <div style={{color:"#8a8a8a",marginBottom:2}}>{new Date(e.ts).toLocaleTimeString("en-GB")} · <span style={{color:"#f87171",fontWeight:600}}>{e.source}</span></div>
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
            <div style={{fontSize:14,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:16}}>Companies ({companies.length})</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:12}}>
              <button onClick={()=>setAdminCompanyFilter(null)} style={{padding:"16px",borderRadius:10,border:adminCompanyFilter===null?"2px solid #fff":"1px solid #333",background:adminCompanyFilter===null?"#000":"transparent",color:adminCompanyFilter===null?"#fff":"#ccc",cursor:"pointer",fontFamily:FONT,textAlign:"left",transition:"all 0.2s"}}>
                <div style={{fontSize:11,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase"}}>All Companies</div>
                <div style={{fontSize:20,fontWeight:600,marginTop:8}}>{allOrders.length}</div>
                <div style={{fontSize:11,color:adminCompanyFilter===null?"rgba(255,255,255,0.6)":"#999",marginTop:2,letterSpacing:"0.06em",textTransform:"uppercase"}}>{formatEUR(allOrders.filter(o=>!o.cancelled).reduce((s,o)=>s+(o.totalWithVat||0),0))} total</div>
              </button>
              {companyStats.map(c => (
                <button key={c.name} onClick={()=>setAdminCompanyFilter(c.name)} style={{padding:"16px",borderRadius:10,border:adminCompanyFilter===c.name?"2px solid #fff":"1px solid #333",background:adminCompanyFilter===c.name?"#000":"transparent",color:adminCompanyFilter===c.name?"#fff":"#ccc",cursor:"pointer",fontFamily:FONT,textAlign:"left",transition:"all 0.2s"}}>
                  <div style={{fontSize:11,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</div>
                  <div style={{fontSize:20,fontWeight:600,marginTop:8}}>{c.count}</div>
                  <div style={{fontSize:11,color:adminCompanyFilter===c.name?"rgba(255,255,255,0.6)":"#999",marginTop:2,letterSpacing:"0.06em",textTransform:"uppercase"}}>{c.active} active · {formatEUR(c.total)}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Orders Header + Filters ── */}
        <div className="da-orders-head" style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:12}}>
          <h2 style={{fontSize:14,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase",margin:0}}>Orders ({filtered.length}{adminCompanyFilter || adminStatusFilter !== "all" || q ? ` / ${allOrders.length}` : ""})</h2>
          <input className="da-input" aria-label="Search orders" placeholder="Search order #, email or company" value={adminSearch} onChange={e=>setAdminSearch(e.target.value)} style={{...inputStyle,width:260,padding:"9px 14px",fontSize:11,marginLeft:"auto",marginRight:10}} />
          <button className="da-btn" onClick={()=>exportCSV(filtered)} style={{background:"#fff",color:"#000",border:"none",padding:"11px 20px",borderRadius:10,fontSize:10,fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase",cursor:"pointer",fontFamily:FONT}}>Export CSV ({filtered.length})</button>
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:24}}>
          {statusFilters.map(f => (
            <button key={f.key} onClick={()=>setAdminStatusFilter(f.key)} aria-pressed={adminStatusFilter===f.key} style={{padding:"8px 12px",borderRadius:10,fontSize:11,fontWeight:adminStatusFilter===f.key?600:400,border:adminStatusFilter===f.key?"2px solid #fff":"1px solid #444",background:adminStatusFilter===f.key?"#000":"transparent",color:adminStatusFilter===f.key?"#fff":(f.count?"#bbb":"#666"),cursor:"pointer",fontFamily:FONT,textTransform:"uppercase",letterSpacing:"0.08em",transition:"all 0.2s"}}>
              {f.label} <span style={{opacity:0.65,fontVariantNumeric:"tabular-nums"}}>{f.count}</span>
            </button>
          ))}
        </div>
        {/* "No orders match filters" on a failed fetch told Dorte her own
            filter was hiding orders, while the company tiles above read €0.00 —
            no way to tell a dead backend from a quiet day. */}
        {ordersError ? (
          <div style={{padding:"40px",textAlign:"center",background:"#1a1a1a",borderRadius:10,lineHeight:1.7}}>
            <div style={{fontSize:14,fontWeight:500,color:"#eee",marginBottom:6}}>Couldn&apos;t load orders</div>
            <div style={{fontSize:12,color:"#9a9a9a",marginBottom:20}}>Nothing is missing — this page just failed to fetch them.</div>
            <button className="da-btn da-btn-outline" onClick={reloadOrders} style={{background:"transparent",border:"1px solid #333",color:"#eee",padding:"12px 24px",borderRadius:10,fontSize:11,letterSpacing:"0.1em",textTransform:"uppercase",cursor:"pointer",fontFamily:FONT}}>Try again</button>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{padding:"40px",textAlign:"center",color: "#9a9a9a",background: "#1a1a1a",borderRadius:10,fontSize:13}}>{allOrders.length === 0 ? "No orders yet." : "No orders match these filters."}</div>
        ) : (
          <div style={{display:"grid",gap:24}}>
            {/* A cancelled order used to be identical to a live one apart from
                which buttons were rendered — the buyer's own view has said
                CANCELLED all along. */}
            {visible.map(order => {
              const open = expandedOrder === order.id || editingOrderId === order.id;
              const stage = order.cancelled ? "Cancelled" : (ORDER_STATUSES.find(x => x.key === currentStage(order))?.label || "New");
              return (
              <div key={order.id} style={{background: order.cancelled ? "#0c0606" : "#000",borderRadius:10,border: order.cancelled ? "1px solid #4a1d1d" : "1px solid #2a2a2a",padding: open ? "24px" : "0"}}>
                {/* Collapsed by default. Fully-expanded cards made this one
                    unbounded page — 2 245px for three orders, and Dorte is
                    going to have fifty. The summary row carries everything
                    needed to decide whether to open it. */}
                <button
                  type="button"
                  onClick={()=>{ if (editingOrderId === order.id) { setEditingOrderId(null); setEditQtys({}); } setExpandedOrder(open ? null : order.id); }}
                  aria-expanded={open}
                  className="da-order-row"
                  style={{width:"100%",textAlign:"left",background:"none",border:"none",cursor:"pointer",fontFamily:FONT,color:"#fff",padding: open ? "0 0 20px" : "18px 24px",display:"grid",gridTemplateColumns:"auto 1fr auto auto auto",gap:16,alignItems:"center",borderRadius:10}}
                >
                  <span aria-hidden="true" style={{width:8,height:8,borderRadius:"50%",flexShrink:0,background: order.cancelled ? "#4a1d1d" : needsAction(order) ? "#eab308" : "#22c55e"}} />
                  <span style={{minWidth:0}}>
                    <span style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",fontSize:13,fontWeight:600}}>
                      <span style={{textDecoration:order.cancelled?"line-through":"none",opacity:order.cancelled?0.7:1}}>{order.id}</span>
                      {order.cancelled && <span style={{padding:"2px 8px",border:"1px solid #f87171",color:"#f87171",borderRadius:10,fontSize:11,fontWeight:600,letterSpacing:"0.1em"}}>CANCELLED</span>}
                      {order.promoLabel && <span style={{padding:"2px 8px",background:"#14532d",color:"#4ade80",borderRadius:10,fontSize:11,fontWeight:600}}>{order.promoLabel}</span>}
                    </span>
                    <span style={{display:"block",fontSize:12,color:"#9a9a9a",marginTop:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{order.buyer.company} · {order.buyer.city}, {order.buyer.country}</span>
                  </span>
                  <span className="da-hide-sm" style={{fontSize:12,color: order.cancelled ? "#8a8a8a" : "#bbb",whiteSpace:"nowrap"}}>{stage}</span>
                  <span style={{fontSize:13,fontWeight:600,fontVariantNumeric:"tabular-nums",whiteSpace:"nowrap"}}>{formatEUR(order.totalWithVat)}</span>
                  <span className="da-hide-sm" style={{fontSize:12,color:"#8a8a8a",fontVariantNumeric:"tabular-nums",whiteSpace:"nowrap"}}>{new Date(order.date).toLocaleDateString("en-GB")}</span>
                </button>
                {/* Two things that must not disappear behind the collapse: a
                    draft still sitting in e-conomic that has to be deleted by
                    hand, and the fact that this order has internal notes at
                    all — you can't open a card you don't know to look at. */}
                {!open && (orphanCount(order) > 0 || (order.notes || []).length > 0) && (
                  <div style={{display:"flex",gap:8,flexWrap:"wrap",padding:"0 24px 16px 48px"}}>
                    {orphanCount(order) > 0 && (
                      <span style={{padding:"3px 9px",borderRadius:10,border:"1px solid #4a1010",background:"#1a0a0a",color:"#f87171",fontSize:11,letterSpacing:"0.06em",textTransform:"uppercase"}}>
                        {orphanCount(order)} draft{orphanCount(order) === 1 ? "" : "s"} to delete in e-conomic
                      </span>
                    )}
                    {(order.notes || []).length > 0 && (
                      <span style={{padding:"3px 9px",borderRadius:10,border:"1px solid #333",color:"#9a9a9a",fontSize:11,letterSpacing:"0.06em",textTransform:"uppercase"}}>
                        {order.notes.length} note{order.notes.length === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>
                )}
                {open && (<>
                {editingOrderId === order.id ? (
                  <div style={{paddingBottom:20,borderBottom: "1px solid #222"}}>
                    <div style={{fontSize:10,color: "#8a8a8a",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8,fontWeight:600}}>Edit items</div>
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
                          {stock !== null && <span style={{fontSize:11,color: "#8a8a8a"}}>(max {l.qty + stock})</span>}
                        </div>
                        );
                      })}
                    </div>
                    <div style={{display:"flex",gap:8}}>
                      <button onClick={()=>handleUpdateOrder(order.id)} style={{background:"#fff",color:"#000",border:"none",padding:"8px 16px",borderRadius:10,fontSize:10,cursor:"pointer",fontFamily:FONT,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.08em"}}>Save</button>
                      <button onClick={()=>{setEditingOrderId(null);setEditQtys({});}} style={{background:"transparent",border: "1px solid #222",color: "#eee",padding:"8px 16px",borderRadius:10,fontSize:10,cursor:"pointer",fontFamily:FONT,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.08em"}}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div style={{paddingBottom:20,borderBottom: "1px solid #222"}}>
                    {/* Ship-to and contact details: the card listed what was
                        ordered and never where it goes, so packing an order
                        meant opening the invoice in another view. */}
                    <div className="da-admin-details" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:20}}>
                      <div>
                        <div style={{fontSize:10,color:"#8a8a8a",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>Ordered {new Date(order.date).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})} · ship to</div>
                        <div style={{fontSize:12,lineHeight:1.7,color:"#ddd"}}>
                          <div style={{fontWeight:600,color:"#fff"}}>{order.buyer.company}</div>
                          {order.buyer.contact && <div>{order.buyer.contact}</div>}
                          <div>{order.buyer.address}</div>
                          <div>{order.buyer.zip} {order.buyer.city}, {order.buyer.country}</div>
                        </div>
                      </div>
                      <div>
                        <div style={{fontSize:10,color:"#8a8a8a",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>Contact</div>
                        <div style={{fontSize:12,lineHeight:1.7,color:"#ddd",wordBreak:"break-all"}}>
                          <div>{order.buyer.email}</div>
                          {order.buyer.vat && <div style={{color:"#9a9a9a"}}>VAT {order.buyer.vat}</div>}
                          <div style={{color:"#9a9a9a"}}>{order.vatInfo?.label}</div>
                        </div>
                      </div>
                    </div>
                    <div style={{fontSize:10,color: "#8a8a8a",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>Items</div>
                    <div style={{display:"grid",gap:4}}>
                      {order.lines.map((l,i) => <div key={i} style={{fontSize:11,color: "#888"}}>{l.product} {SIZE_LABELS[l.size]} × {l.qty} @ {formatEUR(l.unitPrice)}</div>)}
                    </div>
                  </div>
                )}
                <div style={{paddingTop:16,marginBottom:16}}>
                  <div style={{fontSize:10,color: "#8a8a8a",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>Status</div>
                  <div className="da-status-bar" style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    {ORDER_STATUSES.map(s => (
                      <button key={s.key} onClick={()=>toggleOrderStatus(order.id,s.key)} className="da-status-step" style={{padding:"8px 14px",borderRadius:10,fontSize:10,fontWeight:order.statuses[s.key]?600:400,border:`2px solid ${order.statuses[s.key]?"#fff":"#444"}`,background:order.statuses[s.key]?"#000":"transparent",color:order.statuses[s.key]?"#fff":"#999",cursor:"pointer",fontFamily:FONT,textTransform:"uppercase",letterSpacing:"0.08em",transition:"all 0.2s"}}>{s.label}</button>
                    ))}
                  </div>
                  <EconomicSync economic={order.economic} statuses={order.statuses} cancelled={order.cancelled} />
                </div>
                <div className="da-order-actions" style={{display:"flex",gap:8}}>
                  <button className="da-btn da-btn-outline" onClick={()=>handleViewInvoice(order.id,"admin","deposit")} style={{background:"transparent",border: "1px solid #222",padding:"10px 16px",borderRadius:10,fontSize:10,color: "#eee",cursor:"pointer",fontFamily:FONT,letterSpacing:"0.08em",textTransform:"uppercase",transition:"all 0.25s"}}>Shipping invoice</button>
                  {order.statuses.balance_invoiced && <button className="da-btn da-btn-outline" onClick={()=>handleViewInvoice(order.id,"admin","balance")} style={{background:"transparent",border: "1px solid #222",padding:"10px 16px",borderRadius:10,fontSize:10,color: "#eee",cursor:"pointer",fontFamily:FONT,letterSpacing:"0.08em",textTransform:"uppercase",transition:"all 0.25s"}}>Full invoice</button>}
                  {editingOrderId === order.id ? null : (
                    <>
                      {!order.cancelled && !order.statuses.balance_paid && <button className="da-btn da-btn-outline" onClick={()=>{setEditingOrderId(order.id);setEditQtys(Object.fromEntries(order.lines.map(l=>[l.sku,l.qty])));}} style={{background:"transparent",border: "1px solid #222",padding:"10px 16px",borderRadius:10,fontSize:10,color: "#eee",cursor:"pointer",fontFamily:FONT,letterSpacing:"0.08em",textTransform:"uppercase",transition:"all 0.25s"}}>Edit</button>}
                      {!order.cancelled && <button className="da-btn da-btn-outline" onClick={()=>cancelOrder(order.id,true)} style={{background:"transparent",border:"1px solid #f87171",padding:"10px 16px",borderRadius:10,fontSize:10,color:"#f87171",cursor:"pointer",fontFamily:FONT,letterSpacing:"0.08em",textTransform:"uppercase",transition:"all 0.25s"}}>Cancel</button>}
                      {order.cancelled && <button className="da-btn da-btn-outline" onClick={()=>restoreOrder(order.id)} style={{background:"transparent",border:"1px solid #fff",padding:"10px 16px",borderRadius:10,fontSize:10,color:"#fff",cursor:"pointer",fontFamily:FONT,letterSpacing:"0.08em",textTransform:"uppercase",transition:"all 0.25s"}}>Restore</button>}
                      {order.cancelled && <button className="da-btn da-btn-outline" onClick={()=>deleteOrder(order.id)} style={{background:"transparent",border:"1px solid #f87171",padding:"10px 16px",borderRadius:10,fontSize:10,color:"#f87171",cursor:"pointer",fontFamily:FONT,letterSpacing:"0.08em",textTransform:"uppercase",transition:"all 0.25s"}}>Delete</button>}
                    </>
                  )}
                </div>
                <NoteSection orderId={order.id} notes={order.notes} noteInputs={noteInputs} setNoteInputs={setNoteInputs} addNote={addNote} />
                </>)}
              </div>
              );
            })}
            {filtered.length > visible.length && (
              <button className="da-btn da-btn-outline" onClick={()=>setOrderLimit(orderLimit + PAGE)} style={{background:"transparent",border:"1px solid #333",color:"#eee",padding:"14px",borderRadius:10,fontSize:11,letterSpacing:"0.1em",textTransform:"uppercase",cursor:"pointer",fontFamily:FONT}}>
                Show {Math.min(PAGE, filtered.length - visible.length)} more — {filtered.length - visible.length} left
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
