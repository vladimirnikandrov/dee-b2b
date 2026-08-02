"use client";
import { PRODUCTS } from "@/lib/products";
import { PRODUCT_IMAGES } from "@/lib/assets";
import { formatEUR, SIZE_LABELS } from "@/lib/format";
import { base, FadeIn, Header, UserNav, BottleSVG, QtyInput, FONT } from "./shared";

// Three honest states, in one place so they can't drift apart.
function StockBadge({ stock, unknownReason }) {
  // null = we don't know yet: still loading, or the fetch failed. Saying
  // nothing here is what made a broken stock fetch look like a healthy page.
  if (stock === null) return <span style={{marginLeft:8,fontSize:11,color:"#8a8a8a"}}>{unknownReason}</span>;
  const [color, label] =
    stock > 10 ? ["#22c55e", "In stock"] :
    stock > 0 ? ["#eab308", `Only ${stock} left`] :
    ["#f87171", "Out of stock"];
  return (
    <span style={{marginLeft:8,display:"inline-flex",alignItems:"center",gap:5}}>
      <span style={{width:8,height:8,background:color,borderRadius:"50%",display:"inline-block"}} />
      <span style={{fontSize:11,color}}>{label}</span>
    </span>
  );
}

export default function CatalogView({
  session, view, setView, currentUser, handleLogout,
  getQty, setQty, getStock, inventoryError, reloadInventory, totalItems, totalWSP,
}) {
  const unknownReason = inventoryError ? "Availability unknown" : "Checking stock…";
  return (
    <div style={base}>
      <Header right={<UserNav view={view} setView={setView} session={session} currentUser={currentUser} handleLogout={handleLogout} />} currentUser={currentUser} setView={setView} />
      <FadeIn delay={0.1}><div className="da-pad" style={{margin:"24px 48px 0",padding:"14px 24px",background: "#000",borderRadius:12,fontSize:12,color:"#9a9a9a",display:"flex",justifyContent:"space-between",alignItems:"center",border: "1px solid #222",flexWrap:"wrap",gap:8}}><span>All prices wholesale (WSP) in EUR, excl. VAT · VAT applied at checkout based on your location</span></div></FadeIn>
      {/* A failed stock fetch used to render as a perfectly normal catalogue —
          badges simply absent, steppers unbounded — and the buyer found out
          only when the order was rejected. */}
      {inventoryError && (
        <div className="da-pad" style={{margin:"12px 48px 0",padding:"14px 24px",background:"#1a1408",borderRadius:12,fontSize:12,color:"#eab308",border:"1px solid #4a3a10",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
          <span>Stock levels couldn&apos;t be loaded, so availability isn&apos;t shown. Quantities are re-checked when you place the order.</span>
          <button className="da-btn" onClick={reloadInventory} style={{background:"transparent",border:"1px solid #6a5518",color:"#eab308",padding:"9px 18px",borderRadius:10,fontSize:10,letterSpacing:"0.08em",textTransform:"uppercase",cursor:"pointer",fontFamily:FONT}}>Retry</button>
        </div>
      )}
      <div className="da-pad" style={{padding:"32px 48px 120px"}}>
        {PRODUCTS.map((product,pi) => {
          // Stagger caps after the 4th section — below the fold nobody sees
          // the cascade, they just wait through it.
          return (
          <FadeIn key={pi} delay={0.1 + Math.min(pi, 3) * 0.05} style={{marginBottom:pi<PRODUCTS.length-1?56:0}}>
            <div style={{display:"flex",alignItems:"baseline",gap:12,marginBottom:24,flexWrap:"wrap"}}>
              <span style={{fontSize:17,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase"}}>{product.name}</span>
            </div>
            <div className="da-grid-4" style={{display:"grid",gridTemplateColumns:"repeat(4, 1fr)",gap:24}}>
              {product.variants.map((v,vi) => {
                const qty = getQty(v.sku);
                const stock = getStock(v.sku);
                return (
                  <div key={vi} style={{display:"flex",flexDirection:"column"}}>
                    <div style={{background: "#1a1a1a",aspectRatio:"1/1",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:20,overflow:"hidden"}}>
                      {/* Sized and lazy: the catalogue is 21 cards and the
                          images are the entire weight of this screen. */}
                      {PRODUCT_IMAGES[v.size]
                        ? <img src={PRODUCT_IMAGES[v.size]} alt={`${product.name} ${SIZE_LABELS[v.size] || v.size}`} width={600} height={600} loading={pi === 0 ? "eager" : "lazy"} decoding="async" style={{width:"100%",height:"100%",objectFit:"cover"}} />
                        : <BottleSVG size={v.size} uniqueId={`${pi}_${vi}`} />}
                    </div>
                    <div style={{fontSize:12,lineHeight:1.9,color: "#eee",flex:1}}>
                      <div><span style={{fontWeight:700}}>SIZE</span> {SIZE_LABELS[v.size] || v.size} <StockBadge stock={stock} unknownReason={unknownReason} /></div>
                      <div><span style={{fontWeight:700}}>SKU</span> {v.sku}</div>
                      {v.ean ? <div><span style={{fontWeight:700}}>EAN</span> {v.ean}</div> : null}
                      {v.rrp ? <div><span style={{fontWeight:700}}>RRP</span> {formatEUR(v.rrp)}</div> : <div style={{fontWeight:700,fontSize:11,color: "#8a8a8a",fontStyle:"italic"}}>NOT FOR RETAIL SALE</div>}
                      <div><span style={{fontWeight:700}}>WSP</span> {formatEUR(v.wsp)}</div>
                    </div>
                    <div style={{marginTop:12,minHeight:52}}>
                      {/* If it is already in the cart, the stepper stays even
                          at zero stock — otherwise the line can never be
                          reduced and checkout is blocked for good. */}
                      {stock === 0 && qty === 0 ? (
                        <div style={{fontSize:12,color:"#f87171",fontWeight:500,lineHeight:"44px"}}>Out of stock</div>
                      ) : stock === 0 ? (
                        <>
                          <QtyInput value={qty} onChange={val => setQty(v.sku, Math.min(val, qty))} max={qty} label={`${product.name} ${SIZE_LABELS[v.size] || v.size}`} />
                          <div style={{fontSize:11,color:"#f87171",marginTop:4,height:16,lineHeight:"16px"}}>Sold out — remove to check out</div>
                        </>
                      ) : (
                        <>
                          <QtyInput value={qty} onChange={val => setQty(v.sku, val)} max={stock} label={`${product.name} ${SIZE_LABELS[v.size] || v.size}`} />
                          <div style={{fontSize:11,color:"#eab308",marginTop:4,height:16,lineHeight:"16px"}}>{stock !== null && qty >= stock && qty > 0 ? `Max available: ${stock}` : " "}</div>
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
            <span style={{fontSize:12,opacity:0.6}}>{totalItems} item{totalItems!==1?"s":""}</span>
            <span style={{fontSize:18,fontWeight:600,letterSpacing:"0.02em"}}>{formatEUR(totalWSP)}</span>
            <span className="da-excl-vat" style={{fontSize:11,opacity:0.5}}>excl. VAT</span>
          </div>
          <button className="da-btn" onClick={()=>setView("checkout")} style={{background: "#000",color: "#fff",border:"none",padding:"11px 28px",borderRadius:12,fontSize:11,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",cursor:"pointer",fontFamily:FONT,whiteSpace:"nowrap"}}>Proceed</button>
        </div>
      )}
    </div>
  );
}
