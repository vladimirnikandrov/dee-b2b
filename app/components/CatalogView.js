"use client";
import { PRODUCTS } from "@/lib/products";
import { PRODUCT_IMAGES } from "@/lib/assets";
import { formatEUR } from "@/lib/format";
import { base, FadeIn, Header, UserNav, BottleSVG, QtyInput, FONT } from "./shared";

export default function CatalogView({
  session, view, setView, currentUser, handleLogout,
  inventory, getQty, setQty, getStock, totalItems, totalWSP,
}) {
  return (
    <div style={base}>
      <Header right={<UserNav view={view} setView={setView} session={session} currentUser={currentUser} handleLogout={handleLogout} />} currentUser={currentUser} setView={setView} />
      <FadeIn delay={0.1}><div className="da-pad" style={{margin:"24px 48px 0",padding:"14px 24px",background: "#000",borderRadius:12,fontSize:11,color:"#888",display:"flex",justifyContent:"space-between",alignItems:"center",border: "1px solid #222",flexWrap:"wrap",gap:8}}><span>All prices wholesale (WSP), excl. VAT · VAT applied at checkout based on location</span><span style={{fontWeight:500,color: "#888"}}>EUR</span></div></FadeIn>
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
                          <div style={{fontSize:10,color:"#b45309",marginTop:4,height:14,lineHeight:"14px"}}>{getStock(v.sku) !== null && qty >= getStock(v.sku) && qty > 0 ? `Max available: ${getStock(v.sku)}` : " "}</div>
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
            <span className="da-excl-vat" style={{fontSize:10,opacity:0.35}}>excl. VAT</span>
          </div>
          <button className="da-btn" onClick={()=>setView("checkout")} style={{background: "#000",color: "#fff",border:"none",padding:"11px 28px",borderRadius:12,fontSize:11,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",cursor:"pointer",fontFamily:FONT,whiteSpace:"nowrap"}}>Proceed</button>
        </div>
      )}
    </div>
  );
}
