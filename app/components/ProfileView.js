"use client";
import { base, FadeIn, Toast, Header, UserNav, inputStyle, labelStyle, FONT } from "./shared";

export default function ProfileView({
  session, view, setView, currentUser, handleLogout,
  buyer, setBuyer, saveProfile, showToast, toast, hideToast,
}) {
  return (
    <div style={base}>
      <Header right={<UserNav view={view} setView={setView} session={session} currentUser={currentUser} handleLogout={handleLogout} />} currentUser={currentUser} setView={setView} />
      <FadeIn delay={0.1}><div className="da-pad" style={{maxWidth:600,margin:"0 auto",padding:"48px 48px"}}>
        <div style={{fontSize:17,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:32}}>My Profile</div>
        <div style={{display:"grid",gap:18,marginBottom:32}}>
          <div><label style={labelStyle}>Company Name</label><input className="da-input" style={inputStyle} value={buyer.company} onChange={e=>setBuyer({...buyer,company:e.target.value})}/></div>
          <div><label style={labelStyle}>Contact Person</label><input className="da-input" style={inputStyle} value={buyer.contact} onChange={e=>setBuyer({...buyer,contact:e.target.value})}/></div>
          <div><label style={labelStyle}>Address</label><input className="da-input" style={inputStyle} value={buyer.address} onChange={e=>setBuyer({...buyer,address:e.target.value})}/></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <div><label style={labelStyle}>City</label><input className="da-input" style={inputStyle} value={buyer.city} onChange={e=>setBuyer({...buyer,city:e.target.value})}/></div>
            <div><label style={labelStyle}>ZIP / Postal Code</label><input className="da-input" style={inputStyle} value={buyer.zip} onChange={e=>setBuyer({...buyer,zip:e.target.value})}/></div>
          </div>
          <div><label style={labelStyle}>Country</label><input className="da-input" style={inputStyle} value={buyer.country} onChange={e=>setBuyer({...buyer,country:e.target.value})}/></div>
          <div><label style={labelStyle}>VAT Number</label><input className="da-input" style={inputStyle} value={buyer.vat} onChange={e=>setBuyer({...buyer,vat:e.target.value})}/></div>
          <div><label style={labelStyle}>Email</label><input className="da-input" style={{...inputStyle,background: "#0a0a0a"}} disabled value={buyer.email}/></div>
        </div>
        <div style={{display:"flex",gap:10}}>
          <button className="da-btn" onClick={()=>{saveProfile();showToast("Profile updated");}} style={{background:"#fff",color:"#000",border:"none",padding:"15px 28px",borderRadius:12,fontSize:11,fontWeight:600,letterSpacing:"0.15em",textTransform:"uppercase",cursor:"pointer",fontFamily:FONT}}>Save Changes</button>
          <button className="da-btn da-btn-outline" onClick={()=>setView("catalog")} style={{background:"transparent",border: "1px solid #222",padding:"15px 28px",borderRadius:12,fontSize:11,letterSpacing:"0.1em",textTransform:"uppercase",cursor:"pointer",fontFamily:FONT,color: "#eee",transition:"all 0.25s"}}>Back</button>
        </div>
      </div></FadeIn>
      <Toast message={toast.message} visible={toast.visible} onHide={hideToast} />
    </div>
  );
}
