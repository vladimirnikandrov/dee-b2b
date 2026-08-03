"use client";
import { SIZE_LABELS, formatEUR } from "@/lib/format";
import { base, FadeIn, Header, UserNav, inputStyle, FONT, ORDER_STATUSES, SURFACE, INK, RADIUS, TEXT } from "./shared";

// This list is one column of order cards, so it gets a reading measure rather
// than the width of the window. At full bleed on a 1920 screen each card was
// 1770px wide with the order number in the left sixth and the price stranded at
// the far right — the two halves of one line, too far apart to read as one.
const MEASURE = 860;

const card = (cancelled) => ({
  background: SURFACE.card,
  border: `1px solid ${cancelled ? "#3a1c1c" : SURFACE.lineStrong}`,
  borderRadius: RADIUS.control,
  padding: 24,
});

const ghostBtn = {
  background: "transparent", border: `1px solid ${SURFACE.lineStrong}`, color: INK.strong,
  padding: "10px 18px", borderRadius: RADIUS.control, fontSize: TEXT.caption, cursor: "pointer",
  fontFamily: FONT, letterSpacing: "0.08em", textTransform: "uppercase", whiteSpace: "nowrap",
};

// Where the order is now, and how far along that is. Seven anonymous dots said
// neither — this says the stage in words and shows the distance travelled.
function Progress({ order }) {
  if (order.cancelled) {
    return <span style={{fontSize:TEXT.caption,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color:INK.danger,border:"1px solid #7f1d1d",borderRadius:RADIUS.control,padding:"4px 10px"}}>Cancelled</span>;
  }
  const doneCount = ORDER_STATUSES.filter((st) => order.statuses[st.key]).length;
  const current = ORDER_STATUSES[doneCount - 1];
  return (
    <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
      <span style={{display:"flex",gap:3}} aria-hidden="true">
        {ORDER_STATUSES.map((st, i) => (
          <span key={st.key} style={{width:22,height:3,borderRadius:RADIUS.pill,background: i < doneCount ? INK.primary : "#2a2a2a"}} />
        ))}
      </span>
      <span style={{fontSize:TEXT.body,color:INK.body}}>
        {current ? current.label : "Order placed"}
        <span style={{color:INK.faint}}> · {doneCount} of {ORDER_STATUSES.length}</span>
      </span>
    </div>
  );
}

// Repeats the real card's shape, so the page doesn't jump when the data lands.
function Skeleton() {
  return (
    <div style={{display:"grid",gap:16}}>
      {[0,1].map((i) => (
        <div key={i} style={card(false)}>
          <div className="da-skeleton" style={{height:14,width:150,marginBottom:10}} />
          <div className="da-skeleton" style={{height:11,width:110,marginBottom:22}} />
          <div className="da-skeleton" style={{height:3,width:180,marginBottom:22}} />
          <div className="da-skeleton" style={{height:52,width:"100%"}} />
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
  const myOrders = allOrders.filter((o) => o.userId === session?.id);
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
      <FadeIn delay={0.1}><main className="da-pad" style={{maxWidth:MEASURE,margin:"0 auto",padding:"48px 32px 96px"}}>
        <h1 style={{fontSize:TEXT.page,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:32}}>My orders</h1>

        {showSkeleton ? <Skeleton /> : showError ? (
          <div style={{...card(false),padding:40,textAlign:"center",lineHeight:1.7}}>
            <div style={{fontSize:TEXT.section,fontWeight:500,marginBottom:6,color:INK.strong}}>Couldn&apos;t load your orders</div>
            <div style={{fontSize:TEXT.body,color:INK.muted,marginBottom:20}}>The connection failed — your orders are safe, this page just couldn&apos;t fetch them.</div>
            <button className="da-btn da-btn-outline" onClick={reloadOrders} style={ghostBtn}>Try again</button>
          </div>
        ) : myOrders.length === 0 && !staleWarning ? (
          <div style={{...card(false),padding:"56px 40px",textAlign:"center"}}>
            <div style={{fontSize:TEXT.section,color:INK.strong,marginBottom:6}}>No orders yet</div>
            <div style={{fontSize:TEXT.body,color:INK.muted,marginBottom:24}}>Your orders and invoices will appear here.</div>
            <button className="da-btn da-btn-outline" onClick={()=>setView("catalog")} style={ghostBtn}>Browse the catalogue</button>
          </div>
        ) : (
          <div style={{display:"grid",gap:16}}>
            {staleWarning && (
              <div style={{padding:"12px 16px",background:"#1a1408",border:"1px solid #4a3a10",borderRadius:RADIUS.control,fontSize:TEXT.body,color:INK.warn,display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
                <span>Couldn&apos;t refresh — showing what was last loaded.</span>
                <button className="da-btn" onClick={reloadOrders} style={{...ghostBtn,borderColor:"#6a5518",color:INK.warn,padding:"8px 14px",fontSize:TEXT.eyebrow}}>Retry</button>
              </div>
            )}

            {myOrders.map((order) => {
              const editing = editingOrderId === order.id;
              const itemCount = order.lines.reduce((n, l) => n + l.qty, 0);
              return (
                <div key={order.id} style={card(order.cancelled)}>
                  {/* Identity and money on one line, at the two ends of a
                      readable measure. */}
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:16,flexWrap:"wrap"}}>
                    <div style={{minWidth:0}}>
                      <div style={{fontSize:TEXT.section,fontWeight:600,letterSpacing:"0.02em",textDecoration:order.cancelled?"line-through":"none",opacity:order.cancelled?0.75:1}}>{order.id}</div>
                      <div style={{fontSize:TEXT.body,color:INK.muted,marginTop:4}}>
                        {new Date(order.date).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})} · {itemCount} item{itemCount===1?"":"s"}
                      </div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:TEXT.page,fontWeight:600,fontVariantNumeric:"tabular-nums",color:order.cancelled?INK.faint:INK.primary,textDecoration:order.cancelled?"line-through":"none"}}>{formatEUR(order.totalWithVat)}</div>
                      <div style={{fontSize:TEXT.caption,color:INK.faint,marginTop:4}}>incl. shipping &amp; VAT</div>
                    </div>
                  </div>

                  <div style={{marginTop:20}}><Progress order={order} /></div>

                  {/* The lines sit in a well rather than loose on the card, so
                      the eye reads them as one block and the quantities can line
                      up on the right instead of trailing the product name. */}
                  <div style={{marginTop:20,background:SURFACE.inset,borderRadius:RADIUS.control,padding:"4px 16px",opacity:order.cancelled?0.6:1}}>
                    {editing ? (
                      order.lines.map((l, i) => {
                        const stock = getStock(l.sku);
                        // Ceiling = what's on the order already + what's still
                        // free. Clamping to bare `stock` silently shrank orders
                        // (the order's own units aren't back in the pool).
                        const maxVal = stock !== null ? l.qty + stock : undefined;
                        return (
                          <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:16,padding:"12px 0",borderBottom: i < order.lines.length-1 ? `1px solid ${SURFACE.line}` : "none"}}>
                            <span style={{fontSize:TEXT.body,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.product} · {SIZE_LABELS[l.size]}</span>
                            <span style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
                              {stock !== null && <span style={{fontSize:TEXT.caption,color:INK.faint,whiteSpace:"nowrap"}}>max {l.qty + stock}</span>}
                              <input type="number" min="0" max={maxVal} aria-label={`Quantity, ${l.product} ${SIZE_LABELS[l.size]}`} style={{...inputStyle,width:72,padding:"8px",textAlign:"center"}} value={editQtys[l.sku]!==undefined?editQtys[l.sku]:l.qty} onChange={e=>{const raw=e.target.value;if(raw===""){setEditQtys({...editQtys,[l.sku]:0});return;}let v=parseInt(raw,10)||0;if(stock!==null)v=Math.min(v,l.qty+stock);setEditQtys({...editQtys,[l.sku]:Math.max(0,v)});}} onFocus={e=>e.target.select()} />
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      order.lines.map((l, i) => (
                        <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:16,padding:"10px 0",borderBottom: i < order.lines.length-1 ? `1px solid ${SURFACE.line}` : "none"}}>
                          <span style={{fontSize:TEXT.body,color:INK.body,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.product} · {SIZE_LABELS[l.size]}</span>
                          <span style={{fontSize:TEXT.body,color:INK.muted,fontVariantNumeric:"tabular-nums",whiteSpace:"nowrap"}}>{l.qty} × {formatEUR(l.unitPrice)}</span>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Actions read left to right by weight: the thing you came
                      for, then the alternatives, then the destructive one on
                      its own at the far end. */}
                  <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",marginTop:20}}>
                    {editing ? (
                      <>
                        <button className="da-btn" onClick={()=>handleUpdateOrder(order.id)} style={{...ghostBtn,background:INK.primary,color:"#000",border:"none",fontWeight:600}}>Save changes</button>
                        <button className="da-btn da-btn-outline" onClick={()=>{setEditingOrderId(null);setEditQtys({});}} style={ghostBtn}>Discard</button>
                      </>
                    ) : (
                      <>
                        {order.statuses.shipped && !order.statuses.received && !order.cancelled && (
                          <button className="da-btn" onClick={()=>toggleOrderStatus(order.id,"received",{skipConfirm:true})} style={{...ghostBtn,background:INK.primary,color:"#000",border:"none",fontWeight:600}}>Confirm receipt</button>
                        )}
                        <button className="da-btn da-btn-outline" onClick={()=>handleViewInvoice(order.id,"myorders","deposit")} style={ghostBtn}>Shipping invoice</button>
                        {order.statuses.balance_invoiced && <button className="da-btn da-btn-outline" onClick={()=>handleViewInvoice(order.id,"myorders","balance")} style={ghostBtn}>Full invoice</button>}
                        {canClientCancel(order) && <button className="da-btn da-btn-outline" onClick={()=>{setEditingOrderId(order.id);setEditQtys(Object.fromEntries(order.lines.map(l=>[l.sku,l.qty])));}} style={ghostBtn}>Edit</button>}
                        <button className="da-btn da-btn-outline" onClick={()=>repeatOrder(order)} style={ghostBtn}>Repeat order</button>
                        {/* Same predicate the server uses (canEdit in
                            app/api/orders/[id]/route.js). */}
                        {canClientCancel(order) && (
                          <button className="da-btn da-btn-outline" onClick={()=>cancelOrder(order.id,false)} style={{...ghostBtn,marginLeft:"auto",border:`1px solid ${INK.danger}`,color:INK.danger}}>Cancel order</button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main></FadeIn>
    </div>
  );
}
