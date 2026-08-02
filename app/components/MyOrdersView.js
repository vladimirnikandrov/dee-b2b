"use client";
import { SIZE_LABELS, formatEUR } from "@/lib/format";
import { base, FadeIn, Header, UserNav, inputStyle, FONT, ORDER_STATUSES } from "./shared";

// A row of the same shape as a real order card, so the page doesn't jump when
// the data lands.
function Skeleton() {
  return (
    <div style={{display:"grid",gap:24}}>
      {[0,1].map(i => (
        <div key={i} style={{background:"#000",borderRadius:12,border:"1px solid #1a1a1a",padding:"24px"}}>
          <div className="da-skeleton" style={{height:14,width:160,borderRadius:4,marginBottom:10}} />
          <div className="da-skeleton" style={{height:11,width:90,borderRadius:4,marginBottom:18}} />
          <div className="da-skeleton" style={{height:11,width:"60%",borderRadius:4,marginBottom:8}} />
          <div className="da-skeleton" style={{height:11,width:"45%",borderRadius:4}} />
        </div>
      ))}
    </div>
  );
}

export default function MyOrdersView({
  session, view, setView, currentUser, handleLogout,
  allOrders, ordersLoaded, ordersLoading, ordersError, reloadOrders,
  editingOrderId, setEditingOrderId, editQtys, setEditQtys, getStock,
  handleUpdateOrder, handleViewInvoice, repeatOrder, toggleOrderStatus, canClientCancel, cancelOrder,
}) {
  const myOrders = allOrders.filter(o => o.userId === session?.id);
  // Three states that used to render as one. "Nothing here" is only honest
  // once a request has actually succeeded.
  const showSkeleton = ordersLoading && !ordersLoaded;
  // Only take over the screen when there is nothing to show. If a refresh fails
  // while the list is already on screen, keep the list — replacing real orders
  // (and an open edit form) with an error page is its own kind of lying.
  const showError = ordersError && !ordersLoading && !ordersLoaded;
  const staleWarning = ordersError && ordersLoaded;
  return (
    <div style={base}>
      <Header right={<UserNav view={view} setView={setView} session={session} currentUser={currentUser} handleLogout={handleLogout} />} currentUser={currentUser} setView={setView} />
      <FadeIn delay={0.1}><div className="da-pad" style={{padding:"48px 48px"}}>
        <h1 style={{fontSize:17,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:32}}>My orders</h1>
        {showSkeleton ? <Skeleton /> : showError ? (
          <div style={{padding:"40px",textAlign:"center",color:"#f87171",lineHeight:1.7}}>
            <div style={{fontSize:14,fontWeight:500,marginBottom:6,color:"#eee"}}>Couldn&apos;t load your orders</div>
            <div style={{fontSize:12,color:"#9a9a9a",marginBottom:20}}>The connection failed — your orders are safe, this page just couldn&apos;t fetch them.</div>
            <button className="da-btn da-btn-outline" onClick={reloadOrders} style={{background:"transparent",border:"1px solid #333",color:"#eee",padding:"11px 26px",borderRadius:10,fontSize:11,letterSpacing:"0.1em",textTransform:"uppercase",cursor:"pointer",fontFamily:FONT}}>Try again</button>
          </div>
        ) : myOrders.length === 0 && !staleWarning ? (
          <div style={{padding:"40px",textAlign:"center",color: "#9a9a9a",fontSize:14}}>No orders yet. <button onClick={()=>setView("catalog")} style={{background:"none",border:"none",color: "#fff",textDecoration:"underline",textUnderlineOffset:3,cursor:"pointer",fontFamily:FONT,fontSize:14}}>Start shopping</button></div>
        ) : (
          <div style={{display:"grid",gap:24}}>
            {staleWarning && (
              <div style={{padding:"12px 16px",background:"#1a1408",border:"1px solid #4a3a10",borderRadius:10,fontSize:12,color:"#eab308",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
                <span>Couldn&apos;t refresh — showing what was last loaded.</span>
                <button className="da-btn" onClick={reloadOrders} style={{background:"transparent",border:"1px solid #6a5518",color:"#eab308",padding:"7px 16px",borderRadius:8,fontSize:10,letterSpacing:"0.08em",textTransform:"uppercase",cursor:"pointer",fontFamily:FONT}}>Retry</button>
              </div>
            )}
            {myOrders.map(order => (
              <div key={order.id} style={{background: "#000",borderRadius:12,border: order.cancelled ? "1px solid #3f1d1d" : "1px solid #2a2a2a",padding:"24px"}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:16,alignItems:"start",marginBottom:16}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:600,marginBottom:6}}>{order.id}</div>
                    <div style={{fontSize:11,color: "#888"}}>{new Date(order.date).toLocaleDateString("en-GB")}</div>
                    {/* Progress was previously only visible in emails — the
                        portal looked frozen after an order was placed. */}
                    {(() => {
                      const chip = {display:"inline-block",fontSize:9,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",borderRadius:6,padding:"3px 8px"};
                      if (order.cancelled) return <div style={{marginTop:8}}><span style={{...chip,color:"#f87171",border:"1px solid #7f1d1d"}}>Cancelled</span></div>;
                      const done = ORDER_STATUSES.filter(st => order.statuses[st.key]);
                      const current = done[done.length - 1];
                      return (
                        <div style={{display:"flex",alignItems:"center",gap:8,marginTop:8,flexWrap:"wrap"}}>
                          <span style={{...chip,color:"#eee",border:"1px solid #333",background:"#1a1a1a"}}>{current ? current.label : "Order Placed"}</span>
                          <span style={{display:"inline-flex",gap:3}}>
                            {ORDER_STATUSES.map(st => <span key={st.key} style={{width:5,height:5,borderRadius:"50%",background:order.statuses[st.key]?"#fff":"#333"}} />)}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:13,fontWeight:600,textDecoration:order.cancelled?"line-through":"none",color:order.cancelled?"#8a8a8a":"#fff"}}>{formatEUR(order.totalWithVat)}</div>
                    <div style={{fontSize:10,color: "#8a8a8a"}}>incl. shipping &amp; VAT</div>
                  </div>
                </div>
                {editingOrderId === order.id ? (
                  <div style={{marginBottom:12,paddingBottom:12,borderBottom: "1px solid #222"}}>
                    <div style={{fontSize:10,color: "#8a8a8a",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8,fontWeight:600}}>Edit Items</div>
                    <div style={{display:"grid",gap:8}}>
                      {order.lines.map((l,i) => {
                        const stock = getStock(l.sku);
                        // Ceiling = what's on the order already + what's still
                        // free. Clamping to bare `stock` silently shrank orders
                        // (the order's own units aren't back in the pool).
                        const maxVal = stock !== null ? l.qty + stock : undefined;
                        return (
                        <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,fontSize:11,padding:"6px 0",borderBottom:"1px solid #222"}}>
                          <span style={{flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.product} — {SIZE_LABELS[l.size]} @ {formatEUR(l.unitPrice)}</span>
                          <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                            <input type="number" min="0" max={maxVal} style={{...inputStyle,width:64,padding:"6px 8px",fontSize:16,textAlign:"center"}} value={editQtys[l.sku]!==undefined?editQtys[l.sku]:l.qty} onChange={e=>{const raw=e.target.value;if(raw===""){setEditQtys({...editQtys,[l.sku]:0});return;}let v=parseInt(raw,10)||0;if(stock!==null)v=Math.min(v,l.qty+stock);setEditQtys({...editQtys,[l.sku]:Math.max(0,v)});}} onFocus={e=>e.target.select()} />
                            {stock !== null && <span style={{fontSize:9,color: "#8a8a8a",whiteSpace:"nowrap"}}>(max {l.qty + stock})</span>}
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
                  <div style={{fontSize:12,color: "#888",marginBottom:12,paddingBottom:12,borderBottom: "1px solid #222",opacity:order.cancelled?0.5:1}}>
                    {order.lines.map((l,i) => <div key={i}>{l.product} — {SIZE_LABELS[l.size]} x{l.qty}</div>)}
                  </div>
                )}
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  <button className="da-btn da-btn-outline" onClick={()=>handleViewInvoice(order.id,"myorders","deposit")} style={{background:"transparent",border: "1px solid #222",padding:"9px 20px",borderRadius:10,fontSize:10,color: "#eee",cursor:"pointer",fontFamily:FONT,letterSpacing:"0.08em",textTransform:"uppercase",transition:"all 0.25s"}}>Shipping Invoice</button>
                  {order.statuses.balance_invoiced && <button className="da-btn da-btn-outline" onClick={()=>handleViewInvoice(order.id,"myorders","balance")} style={{background:"transparent",border: "1px solid #222",padding:"9px 20px",borderRadius:10,fontSize:10,color: "#eee",cursor:"pointer",fontFamily:FONT,letterSpacing:"0.08em",textTransform:"uppercase",transition:"all 0.25s"}}>Full Invoice</button>}
                  {editingOrderId === order.id ? null : (
                    <>
                      {/* Same predicate the server uses (canEdit in
                          app/api/orders/[id]/route.js) — this used to allow the
                          whole window up to balance_paid, so a buyer could open
                          the editor on an order Dorte had already packed and
                          only find out when Save came back 409. */}
                      {canClientCancel(order) && <button className="da-btn da-btn-outline" onClick={()=>{setEditingOrderId(order.id);setEditQtys(Object.fromEntries(order.lines.map(l=>[l.sku,l.qty])));}} style={{background:"transparent",border: "1px solid #222",padding:"9px 20px",borderRadius:10,fontSize:10,color: "#eee",cursor:"pointer",fontFamily:FONT,letterSpacing:"0.08em",textTransform:"uppercase",transition:"all 0.25s"}}>Edit</button>}
                      <button className="da-btn da-btn-outline" onClick={()=>repeatOrder(order)} style={{background:"transparent",border: "1px solid #222",padding:"9px 20px",borderRadius:10,fontSize:10,color: "#eee",cursor:"pointer",fontFamily:FONT,letterSpacing:"0.08em",textTransform:"uppercase",transition:"all 0.25s"}}>Repeat Order</button>
                      {order.statuses.shipped && !order.statuses.received && !order.cancelled && <button className="da-btn da-btn-outline" onClick={()=>toggleOrderStatus(order.id,"received",{skipConfirm:true})} style={{background:"#fff",border:"none",padding:"9px 20px",borderRadius:10,fontSize:10,color:"#000",cursor:"pointer",fontFamily:FONT,fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase",transition:"all 0.25s"}}>Confirm receipt</button>}
                      {canClientCancel(order) && <button className="da-btn da-btn-outline" onClick={()=>cancelOrder(order.id,false)} style={{background:"transparent",border:"1px solid #f87171",padding:"9px 20px",borderRadius:10,fontSize:10,color:"#f87171",cursor:"pointer",fontFamily:FONT,letterSpacing:"0.08em",textTransform:"uppercase",transition:"all 0.25s"}}>Cancel</button>}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div></FadeIn>
    </div>
  );
}
