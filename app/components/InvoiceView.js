"use client";
import { SELLER } from "@/lib/seller";
import { SIZE_LABELS, formatEUR } from "@/lib/format";
import { base, FadeIn, Logo, FONT, generateOrderNumber } from "./shared";

export default function InvoiceView({
  viewingOrderId, orderNumber, allOrders, buyer, orderLines,
  totalWSP, vatInfo, vatAmount, shippingAmount, totalWithVat, depositAmount, depositInvoiceTotal, totalBeforeShipping,
  invoiceSource, invoiceViewType, setInvoiceViewType, invoiceRef,
  setView, setViewingOrderId, setInvoiceSource, setQuantities, setOrderNumber, setPromoCode, setAppliedPromo,
  handlePrint,
}) {
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
