"use client";
import { SIZE_LABELS, formatEUR } from "@/lib/format";
import { base, FadeIn, ConfirmModal, Header, UserNav, inputStyle, labelStyle, FONT } from "./shared";

export default function CheckoutView({
  session, view, setView, currentUser, handleLogout,
  buyer, setBuyer, vatInfo,
  promoCodeInput, setPromoCodeInput, applyPromoCode, appliedPromo, promoError,
  orderLines, totalWSP, vatAmount, shippingAmount, totalWithVat, depositInvoiceTotal,
  submitting, askConfirm, closeConfirm, confirm, handleSubmitOrder,
}) {
  // Naming the missing fields beats a permanently-greyed button with no
  // explanation — the buyer otherwise has to guess which one is blank.
  const required = [
    ["Company name", buyer.company], ["Address", buyer.address], ["City", buyer.city],
    ["Country", buyer.country], ["Email", buyer.email],
  ];
  const missing = required.filter(([, v]) => !(v || "").trim()).map(([k]) => k);
  const canSubmit = missing.length === 0 && orderLines.length > 0;
  return (
    <div style={base}>
      <Header right={<UserNav view={view} setView={setView} session={session} currentUser={currentUser} handleLogout={handleLogout} />} currentUser={currentUser} setView={setView} />
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
                <button className="da-btn" onClick={()=>{if(canSubmit&&!submitting){askConfirm({title:"Confirm Order",message:`Place this order for ${formatEUR(totalWithVat)}? A shipping invoice of ${formatEUR(depositInvoiceTotal)} will be generated now.`,confirmLabel:"Place Order",danger:false,onConfirm:async ()=>{closeConfirm();await handleSubmitOrder();}});}}} disabled={!canSubmit||submitting} style={{width:"100%",background:canSubmit&&!submitting?"#fff":"#333",color:canSubmit&&!submitting?"#000":"#666",border:"none",padding:"14px",borderRadius:12,fontSize:11,fontWeight:600,letterSpacing:"0.15em",textTransform:"uppercase",cursor:canSubmit&&!submitting?"pointer":"default",fontFamily:FONT}}>{submitting?"Placing Order...":"Place Order"}</button>
                {missing.length > 0 && orderLines.length > 0 && <div style={{fontSize:10,color:"#b45309",textAlign:"center",lineHeight:1.6,letterSpacing:"0.02em"}}>Required: {missing.join(" · ")}</div>}
                {orderLines.length === 0 && <div style={{fontSize:10,color:"#b45309",textAlign:"center",lineHeight:1.6,letterSpacing:"0.02em"}}>Your cart is empty</div>}
                <button className="da-btn da-btn-outline" onClick={()=>setView("catalog")} style={{width:"100%",background:"transparent",border: "1px solid #222",padding:"12px",borderRadius:12,fontSize:11,letterSpacing:"0.1em",textTransform:"uppercase",cursor:"pointer",fontFamily:FONT,color: "#eee",transition:"all 0.25s"}}>Back to Catalog</button>
              </div>
            </div>
          </div></FadeIn>
        </div>
      </div>
      <ConfirmModal {...confirm} onCancel={closeConfirm} />
    </div>
  );
}
