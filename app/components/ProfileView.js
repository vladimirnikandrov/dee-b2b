"use client";
import { countryCode } from "@/lib/countries";
import { base, FadeIn, CountrySelect, Header, UserNav, inputStyle, labelStyle, FONT } from "./shared";

export default function ProfileView({
  session, view, setView, currentUser, handleLogout,
  buyer, setBuyer, saveProfile, showToast,
}) {
  const handleSave = async () => {
    const ok = await saveProfile();
    showToast(ok ? "Profile updated" : "Couldn't save — check your connection and try again");
  };
  // Saving the profile is allowed with an unresolvable country (refusing would
  // block editing the other eight fields), but checkout is not — so say so
  // here rather than letting them discover it at the end of an order.
  const countryUnresolved = !!(buyer.country || "").trim() && !countryCode(buyer.country);
  return (
    <div style={base}>
      <Header right={<UserNav view={view} setView={setView} session={session} currentUser={currentUser} handleLogout={handleLogout} />} currentUser={currentUser} setView={setView} />
      <FadeIn delay={0.1}><main className="da-pad" style={{maxWidth:600,margin:"0 auto",padding:"48px 48px"}}>
        <h1 style={{fontSize:17,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:32}}>My profile</h1>
        <form onSubmit={(e)=>{e.preventDefault();handleSave();}} style={{display:"grid",gap:18,marginBottom:32}}>
          <div><label style={labelStyle} htmlFor="pf-company">Company name</label><input id="pf-company" className="da-input" style={inputStyle} value={buyer.company} onChange={e=>setBuyer({...buyer,company:e.target.value})}/></div>
          <div><label style={labelStyle} htmlFor="pf-contact">Contact person</label><input id="pf-contact" className="da-input" style={inputStyle} value={buyer.contact} onChange={e=>setBuyer({...buyer,contact:e.target.value})}/></div>
          <div><label style={labelStyle} htmlFor="pf-address">Address</label><input id="pf-address" className="da-input" style={inputStyle} value={buyer.address} onChange={e=>setBuyer({...buyer,address:e.target.value})}/></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <div><label style={labelStyle} htmlFor="pf-city">City</label><input id="pf-city" className="da-input" style={inputStyle} value={buyer.city} onChange={e=>setBuyer({...buyer,city:e.target.value})}/></div>
            <div><label style={labelStyle} htmlFor="pf-zip">ZIP / postal code</label><input id="pf-zip" className="da-input" style={inputStyle} value={buyer.zip} onChange={e=>setBuyer({...buyer,zip:e.target.value})}/></div>
          </div>
          <div>
            <label style={labelStyle} htmlFor="profile-country">Country</label>
            <CountrySelect id="profile-country" value={buyer.country} onChange={c=>setBuyer({...buyer,country:c})}/>
            {countryUnresolved && <div style={{fontSize:11,color:"#eab308",marginTop:6,lineHeight:1.6}}>Please pick your country from the list — orders can&rsquo;t be placed until it&rsquo;s set, so VAT is calculated correctly.</div>}
          </div>
          <div><label style={labelStyle} htmlFor="pf-vat">VAT number</label><input id="pf-vat" className="da-input" style={inputStyle} value={buyer.vat} onChange={e=>setBuyer({...buyer,vat:e.target.value})}/></div>
          {/* Not an input: the address is the account's identity, set when the
              account was created, and the server pins every order to it. */}
          <div>
            <span style={labelStyle}>Email</span>
            <div style={{...inputStyle,background:"#0f0f0f",color:"#ddd",display:"flex",alignItems:"center",minHeight:45,wordBreak:"break-all",lineHeight:1.4}}>{buyer.email}</div>
            <div style={{fontSize:11,color:"#8a8a8a",marginTop:6,lineHeight:1.5}}>Your sign-in address, and where invoices are sent. Contact DEE to change it.</div>
          </div>
        <div style={{display:"flex",gap:10}}>
          <button type="submit" className="da-btn" style={{background:"#fff",color:"#000",border:"none",padding:"16px 28px",borderRadius:10,fontSize:11,fontWeight:600,letterSpacing:"0.15em",textTransform:"uppercase",cursor:"pointer",fontFamily:FONT}}>Save changes</button>
          <button type="button" className="da-btn da-btn-outline" onClick={()=>setView("catalog")} style={{background:"transparent",border: "1px solid #222",padding:"16px 28px",borderRadius:10,fontSize:11,letterSpacing:"0.1em",textTransform:"uppercase",cursor:"pointer",fontFamily:FONT,color: "#eee",transition:"all 0.25s"}}>Back</button>
        </div>
        </form>
      </main></FadeIn>
    </div>
  );
}
