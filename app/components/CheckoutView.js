"use client";
import { useState, useEffect } from "react";
import { SIZE_LABELS, formatEUR } from "@/lib/format";
import { countryCode } from "@/lib/countries";
import { base, FadeIn, CountrySelect, Header, UserNav, inputStyle, labelStyle, FONT } from "./shared";

export default function CheckoutView({
  session, view, setView, currentUser, handleLogout,
  buyer, setBuyer, vatInfo,
  promoCodeInput, setPromoCodeInput, applyPromoCode, appliedPromo, clearPromo, promoError, setPromoError,
  orderLines, totalWSP, vatAmount, shippingAmount, totalWithVat, depositInvoiceTotal,
  submitting, submitError, setSubmitError, askConfirm, closeConfirm, handleSubmitOrder,
}) {
  // Errors appear after the first submit attempt, not while the buyer is still
  // typing their address — but once showing, they follow the fields.
  const [showErrors, setShowErrors] = useState(false);
  const [scrollToError, setScrollToError] = useState(false);
  useEffect(() => {
    if (!scrollToError) return;
    setScrollToError(false);
    const first = document.querySelector('[data-checkout-error="1"]');
    if (first) first.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [scrollToError]);

  const required = [
    ["company", "Company name", buyer.company], ["address", "Address", buyer.address],
    ["city", "City", buyer.city], ["country", "Country", buyer.country],
  ];
  const missing = required.filter(([, , v]) => !(v || "").trim());
  const missingKeys = new Set(missing.map(([k]) => k));
  // A country string we can't resolve is exactly the case that used to be
  // invoiced at 0% export VAT by accident. POST /api/orders rejects it, so
  // block here too rather than letting the buyer hit a server error — this
  // only fires for an old profile whose free-text country predates the picker.
  const countryUnresolved = !!(buyer.country || "").trim() && !countryCode(buyer.country);
  const canSubmit = missing.length === 0 && !countryUnresolved && orderLines.length > 0;
  // Shipping depends on the destination and the rest-of-EU rate is the
  // fallback, so an untouched checkout used to quote a Danish buyer €35.00 and
  // a total to match, then drop to €9.25 the moment they picked their country.
  const countryChosen = !!(buyer.country || "").trim() && !countryUnresolved;

  const err = (key) => showErrors && missingKeys.has(key);
  const fieldStyle = (key) => (err(key) ? { ...inputStyle, borderColor: "#f87171" } : inputStyle);
  const Err = ({ show, children }) =>
    show ? <div style={{fontSize:12,color:"#f87171",marginTop:6,lineHeight:1.5}}>{children}</div> : null;

  const attemptSubmit = () => {
    if (submitting) return;
    // A permanently-greyed button with the reason in the other column made the
    // buyer map three field names back to a form they had to scroll to find.
    if (!canSubmit) {
      // setShowErrors is what ADDS the marker attribute, so querying in the
      // same tick finds nothing — the first click never scrolled anywhere.
      setShowErrors(true);
      setScrollToError(true);
      return;
    }
    askConfirm({
      title: "Confirm order",
      message: `Place this order for ${formatEUR(totalWithVat)}? A shipping invoice of ${formatEUR(depositInvoiceTotal)} is issued now; the full order is invoiced before dispatch.`,
      confirmLabel: "Place order",
      cancelLabel: "Keep editing",
      danger: false,
      onConfirm: async () => { closeConfirm(); await handleSubmitOrder(); },
    });
  };

  return (
    <div style={base}>
      <Header right={<UserNav view={view} setView={setView} session={session} currentUser={currentUser} handleLogout={handleLogout} />} currentUser={currentUser} setView={setView} />
      <div style={{maxWidth:1060,margin:"0 auto",padding:"0 24px"}}>
        <div className="da-grid-checkout" style={{display:"grid",gridTemplateColumns:"1.1fr 1fr",gap:48,paddingTop:40,paddingBottom:60}}>
          <FadeIn delay={0.1}><div>
            <h1 style={{fontSize:13,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:28}}>Buyer details</h1>
            <div style={{display:"grid",gap:16}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                <div {...(err("company") ? { "data-checkout-error": "1" } : {})}>
                  <label style={labelStyle} htmlFor="co-company">Company name *</label>
                  <input id="co-company" className="da-input" style={fieldStyle("company")} value={buyer.company} onChange={e=>setBuyer({...buyer,company:e.target.value})} placeholder="Company Ltd."/>
                  <Err show={err("company")}>Required — this is the name on the invoice.</Err>
                </div>
                <div>
                  <label style={labelStyle} htmlFor="co-contact">Contact person</label>
                  <input id="co-contact" className="da-input" style={inputStyle} value={buyer.contact} onChange={e=>setBuyer({...buyer,contact:e.target.value})} placeholder="Full name"/>
                </div>
              </div>
              <div {...(err("address") ? { "data-checkout-error": "1" } : {})}>
                <label style={labelStyle} htmlFor="co-address">Address *</label>
                <input id="co-address" className="da-input" style={fieldStyle("address")} value={buyer.address} onChange={e=>setBuyer({...buyer,address:e.target.value})} placeholder="Street address"/>
                <Err show={err("address")}>Required — where the order is delivered.</Err>
              </div>
              <div className="da-grid-3" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14}}>
                <div {...(err("city") ? { "data-checkout-error": "1" } : {})}>
                  <label style={labelStyle} htmlFor="co-city">City *</label>
                  <input id="co-city" className="da-input" style={fieldStyle("city")} value={buyer.city} onChange={e=>setBuyer({...buyer,city:e.target.value})}/>
                  <Err show={err("city")}>Required.</Err>
                </div>
                <div>
                  <label style={labelStyle} htmlFor="co-zip">ZIP</label>
                  <input id="co-zip" className="da-input" style={inputStyle} value={buyer.zip} onChange={e=>setBuyer({...buyer,zip:e.target.value})}/>
                </div>
                <div {...(err("country") ? { "data-checkout-error": "1" } : {})}>
                  <label style={labelStyle} htmlFor="checkout-country">Country *</label>
                  <CountrySelect id="checkout-country" value={buyer.country} onChange={c=>setBuyer({...buyer,country:c})} style={err("country") ? { borderColor: "#f87171" } : {}}/>
                  <Err show={err("country")}>Required — it sets the VAT and the shipping rate.</Err>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                <div>
                  <label style={labelStyle} htmlFor="co-vat">VAT number</label>
                  <input id="co-vat" className="da-input" style={inputStyle} value={buyer.vat} onChange={e=>setBuyer({...buyer,vat:e.target.value})} placeholder="e.g. DK12345678"/>
                  <div style={{fontSize:11,color:"#8a8a8a",marginTop:6,lineHeight:1.5}}>EU buyers: a valid VAT number means reverse charge — 0% VAT on this order.</div>
                </div>
                {/* Read-only on purpose. The order's address comes from the
                    signed-in account (app/api/orders/route.js), so an edit here
                    would be accepted by the form and discarded by the server. */}
                <div>
                  <span style={labelStyle}>Email</span>
                  <div style={{...inputStyle,background:"#0f0f0f",color:"#ddd",display:"flex",alignItems:"center",minHeight:45,wordBreak:"break-all",lineHeight:1.4}}>{buyer.email}</div>
                  <div style={{fontSize:11,color:"#8a8a8a",marginTop:6,lineHeight:1.5}}>Invoices and updates go to your account address.</div>
                </div>
              </div>
            </div>
            {/* Never show a VAT verdict derived from a country we couldn't
                resolve — "Export (0% VAT)" is the fallback branch, and
                displaying it here would read as confirmation. */}
            {countryUnresolved
              ? <div style={{padding:"12px 16px",background:"#1a1408",borderRadius:10,border:"1px solid #4a3a10",fontSize:12,lineHeight:1.6,marginTop:20,color:"#eab308"}}>Please reselect your country from the list so VAT is calculated correctly.</div>
              : buyer.country && <div style={{padding:"12px 16px",background: "#111",borderRadius:10,border: "1px solid #222",fontSize:12,lineHeight:1.6,marginTop:20}}><span style={{fontWeight:600,color:"#fff"}}>{vatInfo.label}</span><span style={{color:"#9a9a9a",marginLeft:8}}>{vatInfo.note}</span></div>}
            <div style={{marginTop:28,padding:"20px",background: "#111",borderRadius:12,border: "1px solid #222"}}>
              <div style={{fontSize:10,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color: "#8a8a8a",marginBottom:10}}>Promo code</div>
              <div style={{display:"flex",gap:8}}>
                <input className="da-input" style={{...inputStyle,flex:1}} placeholder="Enter code" value={promoCodeInput} onChange={e=>{setPromoCodeInput(e.target.value);if(promoError)setPromoError("");}} onKeyDown={e=>e.key==="Enter"&&applyPromoCode()} />
                <button className="da-btn" onClick={applyPromoCode} style={{background:"#fff",color:"#000",border:"none",padding:"12px 18px",borderRadius:10,fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:FONT,whiteSpace:"nowrap",letterSpacing:"0.06em",textTransform:"uppercase"}}>Apply</button>
              </div>
              {appliedPromo && (
                <div style={{marginTop:10,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,fontSize:12}}>
                  <span style={{color:"#4ade80",fontWeight:500}}>{appliedPromo.label} pricing applied</span>
                  {/* A code the server later refuses has to be removable, or
                      checkout dead-ends on an instruction nobody can follow. */}
                  <button onClick={clearPromo} style={{background:"none",border:"none",color:"#9a9a9a",fontSize:12,textDecoration:"underline",textUnderlineOffset:3,cursor:"pointer",fontFamily:FONT,padding:0}}>Remove</button>
                </div>
              )}
              {promoError && <div style={{marginTop:10,fontSize:12,color:"#f87171"}}>{promoError}</div>}
            </div>
          </div></FadeIn>
          <FadeIn delay={0.2}><div>
            <div className="da-checkout-summary" style={{background: "#000",border: "1px solid #333",borderRadius:16,padding:"28px 24px",position:"sticky",top:100}}>
              <div style={{fontSize:11,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:16,color: "#9a9a9a"}}>Order summary</div>
              <div style={{marginBottom:16}}>{orderLines.map((line,i)=>(<div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",padding:"10px 0",borderBottom: "1px solid #222",fontSize:12}}><div><div style={{fontWeight:500}}>{line.product}</div><div style={{color: "#9a9a9a",fontSize:11,marginTop:2}}>{SIZE_LABELS[line.size]}</div></div><div style={{textAlign:"right",whiteSpace:"nowrap"}}><div style={{color:"#9a9a9a",fontSize:11}}>{line.qty} × {formatEUR(line.unitPrice)}</div><div style={{fontWeight:600,marginTop:1}}>{formatEUR(line.total)}</div></div></div>))}</div>
              <div style={{paddingTop:12,borderTop: "1px solid #333"}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:6,color: "#9a9a9a"}}><span>Subtotal</span><span style={{fontWeight:500,color: "#eee"}}>{formatEUR(totalWSP)}</span></div>
                {/* Shipping sits ABOVE the VAT row, same order as the invoice,
                    the PDF and the confirmation email: shipping is quoted
                    VAT-inclusive, so its VAT is part of the VAT total below.
                    Listed underneath, it would read as though the VAT covered
                    only the goods. The gross is spelled out alongside because a
                    Danish buyer told "shipping is 9.25" should not see 7.40 and
                    think the quote moved. */}
                <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:6,color: "#9a9a9a"}}>
                  <span>Shipping{countryChosen&&depositInvoiceTotal>shippingAmount?<span style={{color:"#8a8a8a"}}> ({formatEUR(depositInvoiceTotal)} incl. VAT)</span>:null}</span>
                  <span style={{fontWeight:500,color: countryChosen ? "#eee" : "#8a8a8a"}}>{countryChosen ? formatEUR(shippingAmount) : "Select country"}</span>
                </div>
                {countryChosen&&vatAmount>0&&<div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:6,color: "#9a9a9a"}}><span>{vatInfo.label}</span><span style={{fontWeight:500,color: "#eee"}}>{formatEUR(vatAmount)}</span></div>}
                {countryChosen&&vatInfo.rate===0&&<div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:6,color: "#8a8a8a"}}><span>VAT</span><span>{vatInfo.label}</span></div>}
                <div style={{display:"flex",justifyContent:"space-between",fontSize:14,fontWeight:600,paddingTop:8,borderTop: "1px solid #333"}}><span>Total</span><span>{countryChosen ? formatEUR(totalWithVat) : "—"}</span></div>
              </div>
              <div style={{marginTop:12,padding:"14px 0 0",borderTop:"2px solid #000"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}><div><div style={{fontSize:10,textTransform:"uppercase",letterSpacing:"0.1em",color: "#8a8a8a"}}>Shipping invoice</div><div style={{fontSize:11,color: "#9a9a9a",marginTop:2}}>Due now — full order invoiced separately</div></div><span style={{fontSize:20,fontWeight:600}}>{countryChosen ? formatEUR(depositInvoiceTotal) : "—"}</span></div>
              </div>
              {/* A rejected order used to be announced only by a toast that
                  dismissed itself — on the most expensive click in the app. */}
              {submitError && (
                <div style={{marginTop:16,padding:"12px 14px",background:"#2a0a0a",border:"1px solid #8b4545",borderRadius:10,fontSize:12,color:"#f87171",lineHeight:1.6}}>
                  {submitError}
                  <button onClick={()=>setSubmitError("")} style={{display:"block",marginTop:8,background:"none",border:"none",color:"#9a9a9a",fontSize:11,textDecoration:"underline",textUnderlineOffset:3,cursor:"pointer",fontFamily:FONT,padding:0}}>Dismiss</button>
                </div>
              )}
              <div style={{display:"flex",flexDirection:"column",gap:10,marginTop:20}}>
                <button className="da-btn" onClick={attemptSubmit} disabled={submitting} style={{width:"100%",background:submitting?"#333":"#fff",color:submitting?"#8a8a8a":"#000",border:"none",padding:"14px",borderRadius:12,fontSize:11,fontWeight:600,letterSpacing:"0.15em",textTransform:"uppercase",cursor:submitting?"default":"pointer",fontFamily:FONT}}>{submitting?"Placing order…":"Place order"}</button>
                {showErrors && missing.length > 0 && orderLines.length > 0 && <div style={{fontSize:12,color:"#eab308",textAlign:"center",lineHeight:1.6}}>Still needed: {missing.map(([, label]) => label).join(" · ")}</div>}
                {countryUnresolved && orderLines.length > 0 && <div style={{fontSize:12,color:"#eab308",textAlign:"center",lineHeight:1.6}}>Select your country from the list</div>}
                {orderLines.length === 0 && <div style={{fontSize:12,color:"#eab308",textAlign:"center",lineHeight:1.6}}>Your cart is empty</div>}
                <button className="da-btn da-btn-outline" onClick={()=>setView("catalog")} style={{width:"100%",background:"transparent",border: "1px solid #222",padding:"12px",borderRadius:12,fontSize:11,letterSpacing:"0.1em",textTransform:"uppercase",cursor:"pointer",fontFamily:FONT,color: "#eee",transition:"all 0.25s"}}>Back to catalog</button>
              </div>
            </div>
          </div></FadeIn>
        </div>
      </div>
    </div>
  );
}
