"use client";
import { base, FadeIn, Logo, FONT } from "./shared";

export default function LandingView({ setView }) {
  return (
    <div style={{...base,background:"#000",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh",padding:"40px 20px"}}>
      <div style={{textAlign:"center",maxWidth:520,width:"100%"}}>
        <div style={{animation:"scaleIn 0.8s cubic-bezier(0.23,1,0.32,1) 0s both",display:"flex",justifyContent:"center"}}>
          <Logo color="#fff" style={{ height: 36 }} />
        </div>
        <FadeIn delay={0.5} style={{textAlign:"center"}}>
          <div style={{fontSize:14,color:"rgba(255,255,255,0.7)",lineHeight:1.8,marginBottom:48,marginTop:40}}>
            <div style={{fontWeight:600,color:"#fff",marginBottom:12,fontSize:15,letterSpacing:"0.04em"}}>B2B Wholesale Portal</div>
            <div style={{marginBottom:16,maxWidth:420,margin:"0 auto 16px"}}>Browse the collection, place orders, and receive invoices — all in one place.</div>
            <div style={{fontSize:12,color:"rgba(255,255,255,0.4)",lineHeight:1.8,maxWidth:420,margin:"0 auto"}}>
              <span style={{fontWeight:500,color:"rgba(255,255,255,0.6)"}}>How it works:</span> Create an account, browse the range at wholesale prices, select quantities and place your order — a shipping invoice is generated first, with the full order invoiced before dispatch.
            </div>
          </div>
        </FadeIn>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <button className="da-btn" onClick={()=>setView("register")} style={{width:"100%",background: "#fff",color: "#000",border:"none",padding:"16px",borderRadius:12,fontSize:11,fontWeight:600,letterSpacing:"0.15em",textTransform:"uppercase",cursor:"pointer",fontFamily:FONT,animation:"slideUp 0.6s cubic-bezier(0.23,1,0.32,1) 0.2s both"}}>Create Account</button>
          <button className="da-btn" onClick={()=>setView("login")} style={{width:"100%",background:"transparent",color:"#fff",border:"1px solid rgba(255,255,255,0.3)",padding:"16px",borderRadius:12,fontSize:11,fontWeight:600,letterSpacing:"0.15em",textTransform:"uppercase",cursor:"pointer",fontFamily:FONT,animation:"slideUp 0.6s cubic-bezier(0.23,1,0.32,1) 0.3s both"}}>Sign In</button>
          <button className="da-btn" onClick={()=>setView("adminlogin")} style={{width:"100%",background:"transparent",color:"rgba(255,255,255,0.5)",border:"none",padding:"16px",borderRadius:12,fontSize:10,letterSpacing:"0.15em",textTransform:"uppercase",cursor:"pointer",fontFamily:FONT,animation:"slideUp 0.6s cubic-bezier(0.23,1,0.32,1) 0.4s both"}}>Admin</button>
        </div>
        <div style={{marginTop:40,display:"flex",justifyContent:"center",gap:20}}>
          <a href="/privacy-policy" style={{fontSize:10,color:"rgba(255,255,255,0.3)",textDecoration:"none",letterSpacing:"0.06em"}}>Privacy Policy</a>
          <a href="/eula" style={{fontSize:10,color:"rgba(255,255,255,0.3)",textDecoration:"none",letterSpacing:"0.06em"}}>Terms of Use</a>
          <a href="/dpa" style={{fontSize:10,color:"rgba(255,255,255,0.3)",textDecoration:"none",letterSpacing:"0.06em"}}>DPA</a>
        </div>
      </div>
    </div>
  );
}
