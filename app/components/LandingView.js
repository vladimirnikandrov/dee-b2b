"use client";
import { base, FadeIn, Logo, FONT } from "./shared";
import { SELLER } from "@/lib/seller";

// The portal is invite-only (Vladimir, 2026-08-02): accounts are created by
// Dorte in the admin panel's Buyers section, which sends the welcome email.
// There is deliberately no self-service sign-up — this page used to offer
// "Create account" as its primary action, and anyone with an email address
// could be looking at the whole trade price list, RRPs and stock a minute later.
export default function LandingView({ setView }) {
  return (
    <div style={{...base,background:"#000",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh",padding:"40px 20px"}}>
      <div style={{textAlign:"center",maxWidth:520,width:"100%"}}>
        <div style={{animation:"scaleIn 0.8s cubic-bezier(0.23,1,0.32,1) 0s both",display:"flex",justifyContent:"center"}}>
          <Logo color="#fff" style={{ height: 36 }} />
        </div>
        <FadeIn delay={0.25} style={{textAlign:"center"}}>
          <div style={{fontSize:14,color:"rgba(255,255,255,0.75)",lineHeight:1.8,marginBottom:48,marginTop:40}}>
            <div style={{fontWeight:600,color:"#fff",marginBottom:12,fontSize:14,letterSpacing:"0.04em"}}>B2B Wholesale Portal</div>
            <div style={{marginBottom:16,maxWidth:420,margin:"0 auto 16px"}}>Browse the collection, place orders, and receive invoices — all in one place.</div>
            <div style={{fontSize:12,color:"rgba(255,255,255,0.6)",lineHeight:1.8,maxWidth:420,margin:"0 auto"}}>
              <span style={{fontWeight:500,color:"rgba(255,255,255,0.8)"}}>How it works:</span> Sign in with your email — we send a 6-digit code, there is no password. Browse the range at wholesale prices, place your order, and a shipping invoice is issued first, with the full order invoiced before dispatch.
            </div>
          </div>
        </FadeIn>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <button className="da-btn" onClick={()=>setView("login")} style={{width:"100%",background: "#fff",color: "#000",border:"none",padding:"16px",borderRadius:10,fontSize:11,fontWeight:600,letterSpacing:"0.15em",textTransform:"uppercase",cursor:"pointer",fontFamily:FONT,animation:"slideUp 0.6s cubic-bezier(0.23,1,0.32,1) 0.45s both"}}>Sign In</button>
          <div style={{fontSize:12,color:"rgba(255,255,255,0.6)",lineHeight:1.7,animation:"slideUp 0.6s cubic-bezier(0.23,1,0.32,1) 0.55s both"}}>
            Wholesale accounts are opened by DEE. To request one, write to{" "}
            <a href={`mailto:${SELLER.email}`} style={{color:"#fff",textDecoration:"underline",textUnderlineOffset:3}}>{SELLER.email}</a>.
          </div>
          <button className="da-btn" onClick={()=>setView("adminlogin")} style={{width:"100%",background:"transparent",color:"rgba(255,255,255,0.65)",border:"none",padding:"16px",borderRadius:10,fontSize:10,letterSpacing:"0.15em",textTransform:"uppercase",cursor:"pointer",fontFamily:FONT,animation:"slideUp 0.6s cubic-bezier(0.23,1,0.32,1) 0.65s both"}}>Admin</button>
        </div>
        <div style={{marginTop:40,display:"flex",justifyContent:"center",gap:20}}>
          <a href="/privacy-policy" style={{fontSize:11,color:"rgba(255,255,255,0.6)",textDecoration:"none",letterSpacing:"0.06em"}}>Privacy Policy</a>
          <a href="/eula" style={{fontSize:11,color:"rgba(255,255,255,0.6)",textDecoration:"none",letterSpacing:"0.06em"}}>Terms of Use</a>
          <a href="/dpa" style={{fontSize:11,color:"rgba(255,255,255,0.6)",textDecoration:"none",letterSpacing:"0.06em"}}>DPA</a>
        </div>
      </div>
    </div>
  );
}
