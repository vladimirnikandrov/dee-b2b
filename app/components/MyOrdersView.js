"use client";
import { SIZE_LABELS, formatEUR } from "@/lib/format";
import { base, FadeIn, Toast, ConfirmModal, Header, UserNav, inputStyle, FONT } from "./shared";

export default function MyOrdersView({
  session, view, setView, currentUser, handleLogout,
  allOrders, editingOrderId, setEditingOrderId, editQtys, setEditQtys, getStock,
  handleUpdateOrder, handleViewInvoice, repeatOrder, toggleOrderStatus, canClientCancel, cancelOrder,
  toast, hideToast, confirm, closeConfirm,
}) {
  const myOrders = allOrders.filter(o => o.userId === session?.id);
  return (
    <div style={base}>
      <Header right={<UserNav view={view} setView={setView} session={session} currentUser={currentUser} handleLogout={handleLogout} />} currentUser={currentUser} setView={setView} />
      <FadeIn delay={0.1}><div className="da-pad" style={{padding:"48px 48px"}}>
        <div style={{fontSize:17,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:32}}>My Orders</div>
        {myOrders.length === 0 ? (
          <div style={{padding:"40px",textAlign:"center",color: "#666"}}>No orders yet. <button onClick={()=>setView("catalog")} style={{background:"none",border:"none",color: "#fff",textDecoration:"underline",cursor:"pointer",fontFamily:FONT}}>Start shopping</button></div>
        ) : (
          <div style={{display:"grid",gap:24}}>
            {myOrders.map(order => (
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
}
