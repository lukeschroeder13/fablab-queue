import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";

const DAYS=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],MO=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const dk=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const fH=h=>{const hr=Math.floor(((h%24)+24)%24),mn=Math.round((h-Math.floor(h))*60),ap=hr>=12?"PM":"AM",dh=hr===0?12:hr>12?hr-12:hr;return`${dh}:${String(mn).padStart(2,"0")} ${ap}`};
const fD=h=>{const hrs=Math.floor(h),mins=Math.round((h-hrs)*60);if(hrs===0)return`${mins}m`;if(mins===0)return`${hrs}h`;return`${hrs}h ${mins}m`};
const fDt=d=>`${DAYS[d.getDay()]}, ${MO[d.getMonth()]} ${d.getDate()}`;
const aD=(d,n)=>{const r=new Date(d);r.setDate(r.getDate()+n);return r};
const gW=b=>{const d=new Date(b),day=d.getDay(),mon=aD(d,-((day+6)%7));return Array.from({length:7},(_,i)=>aD(mon,i))};
const nH=()=>{const n=new Date();return n.getHours()+n.getMinutes()/60};
const BUFFER=0.25;
const jAS=j=>new Date(j.date+"T00:00:00").getTime()+j.start_hour*3600000;
const jAE=j=>jAS(j)+j.duration*3600000;
const jBS=j=>jAS(j)-BUFFER*3600000;
const jBE=j=>jAE(j)+BUFFER*3600000;

function findNextSlot(printers,jobs,duration,isOvernight){
  const online=printers.filter(p=>p.online);if(!online.length)return null;let best=null;
  for(const pr of online){
    const pJ=jobs.filter(j=>j.printer_id===pr.id&&j.status!=="cancelled"&&j.status!=="completed"&&j.status!=="failed").sort((a,b)=>jAS(a)-jAS(b));
    const now=new Date();let cs=now.getTime();
    if(isOvernight){const t5=new Date(now);t5.setHours(17,0,0,0);if(cs<t5.getTime())cs=t5.getTime()}
    cs+=BUFFER*3600000;
    for(const job of pJ){const bs=jBS(job),be=jBE(job);if(cs+duration*3600000<=bs)break;if(be>cs)cs=be}
    if(!best||cs<best.st)best={pid:pr.id,st:cs,pn:pr.name}
  }
  if(best){const sd=new Date(best.st);return{printerId:best.pid,printerName:best.pn,date:dk(sd),startHour:sd.getHours()+sd.getMinutes()/60}}
  return null
}

/* icons */
const I={
  printer:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>,
  clock:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  check:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  cal:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  users:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  left:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
  right:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
  x:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  bell:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  plus:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  alert:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  poke:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0"/></svg>,
  settings:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  trash:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  power:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>,
  logout:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  user:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
};

/* styles */
const inp={width:"100%",padding:"11px 14px",borderRadius:8,border:"1px solid #ddd",fontFamily:"'DM Sans',sans-serif",fontSize:14,outline:"none",boxSizing:"border-box"};
const lbl={display:"block",marginBottom:5,fontWeight:600,fontSize:13,color:"#1a1a2e",fontFamily:"'DM Sans',sans-serif"};
const C={background:"#fff",borderRadius:14,boxShadow:"0 2px 12px rgba(0,0,0,0.05)",border:"1px solid #eee"};
const iB=(bg,bdr)=>({background:bg,borderLeft:`4px solid ${bdr}`,padding:"12px 18px",borderRadius:"0 10px 10px 0",marginBottom:20,fontFamily:"'DM Sans',sans-serif",fontSize:13});
const B=(bg,color)=>({padding:"10px 18px",borderRadius:8,border:"none",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:600,background:bg,color,display:"inline-flex",alignItems:"center",gap:6,transition:"all .15s"});

/* Toast */
function Toast({message,type,onClose}){
  useEffect(()=>{const t=setTimeout(onClose,4500);return()=>clearTimeout(t)},[onClose]);
  const bg={success:"#0f5132",error:"#842029",info:"#1e3a5f",warning:"#6b4c1e"}[type]||"#1e3a5f";
  const bdr={success:"#198754",error:"#dc3545",info:"#3d7ec7",warning:"#d4740e"}[type]||"#3d7ec7";
  return(<div style={{position:"fixed",top:20,right:20,zIndex:9999,background:bg,color:"#fff",padding:"13px 20px",borderRadius:10,borderLeft:`4px solid ${bdr}`,boxShadow:"0 8px 32px rgba(0,0,0,0.25)",fontFamily:"'DM Sans',sans-serif",fontSize:13,maxWidth:400,display:"flex",alignItems:"center",gap:10}}><span style={{flex:1}}>{message}</span><button onClick={onClose} style={{background:"none",border:"none",color:"#fff",cursor:"pointer"}}>{I.x}</button></div>);
}

/* Confirm Modal */
function ConfirmModal({title,message,onConfirm,onCancel}){
  return(<div style={{position:"fixed",inset:0,zIndex:2000,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={onCancel}>
    <div style={{background:"#fff",borderRadius:16,padding:28,maxWidth:400,width:"100%",boxShadow:"0 20px 60px rgba(0,0,0,0.2)"}} onClick={e=>e.stopPropagation()}>
      <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:"#1a1a2e",marginBottom:8}}>{title}</h3>
      <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:14,color:"#666",marginBottom:24,lineHeight:1.5}}>{message}</p>
      <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
        <button onClick={onCancel} style={{...B("#f5f5f5","#666"),padding:"10px 20px"}}>Cancel</button>
        <button onClick={onConfirm} style={{...B("#d4740e","#fff"),padding:"10px 20px"}}>Confirm</button>
      </div>
    </div>
  </div>);
}

/* NotifBell */
function NotifBell({notifications,onClear,onDismiss}){
  const[open,setOpen]=useState(false);const unread=notifications.filter(n=>!n.read).length;
  return(<div style={{position:"relative"}}>
    <button onClick={()=>setOpen(!open)} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.8)",position:"relative",padding:6,borderRadius:8}}>{I.bell}{unread>0&&<span style={{position:"absolute",top:0,right:0,width:18,height:18,borderRadius:"50%",background:"#ef4444",color:"#fff",fontSize:10,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",border:"2px solid #1a1a2e"}}>{unread}</span>}</button>
    {open&&<div style={{position:"absolute",top:"100%",right:0,marginTop:8,width:340,maxWidth:"90vw",maxHeight:420,overflowY:"auto",background:"#fff",borderRadius:14,boxShadow:"0 12px 48px rgba(0,0,0,0.2)",border:"1px solid #e8e8e8",zIndex:999}}>
      <div style={{padding:"14px 18px",borderBottom:"1px solid #f0f0f0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontFamily:"'Playfair Display',serif",fontSize:16,fontWeight:700,color:"#1a1a2e"}}>Notifications</span>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {notifications.length>0&&<button onClick={onClear} style={{background:"none",border:"none",cursor:"pointer",color:"#d4740e",fontSize:12,fontWeight:600}}>Clear all</button>}
          <button onClick={()=>setOpen(false)} style={{background:"none",border:"none",cursor:"pointer",color:"#aaa",padding:2}}>{I.x}</button>
        </div>
      </div>
      {notifications.length===0?<div style={{padding:32,textAlign:"center",color:"#aaa",fontSize:13}}>No notifications</div>:notifications.map(n=>(
        <div key={n.id} style={{padding:"12px 18px",borderBottom:"1px solid #f7f7f7",background:n.read?"#fff":"#fef7ed",display:"flex",gap:10,alignItems:"flex-start"}}>
          <div style={{width:28,height:28,borderRadius:"50%",flexShrink:0,marginTop:2,background:n.type==="alert"?"#fef2f2":n.type==="poke"?"#fef7ed":n.type==="success"?"#f0f9f0":"#f0f4ff",color:n.type==="alert"?"#ef4444":n.type==="poke"?"#d4740e":n.type==="success"?"#22c55e":"#3d7ec7",display:"flex",alignItems:"center",justifyContent:"center"}}>{n.type==="alert"?I.alert:n.type==="poke"?I.poke:n.type==="success"?I.check:I.bell}</div>
          <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,color:"#1a1a2e",fontWeight:n.read?400:600}}>{n.message}</div><div style={{fontSize:11,color:"#aaa",marginTop:2}}>{new Date(n.created_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</div></div>
          <button onClick={()=>onDismiss(n.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#ccc",padding:2,flexShrink:0}}>{I.x}</button>
        </div>
      ))}
    </div>}
  </div>);
}

/* AUTH */
function AuthPage({onAuth,showToast,siteUrl}){
  const[mode,setMode]=useState("login");const[email,setEmail]=useState("");const[password,setPassword]=useState("");const[name,setName]=useState("");const[compId,setCompId]=useState("");const[loading,setLoading]=useState(false);const[confirmSent,setConfirmSent]=useState(false);
  async function handleLogin(e){e.preventDefault();if(!email||!password){showToast("Enter email and password","error");return}setLoading(true);const{data,error}=await supabase.auth.signInWithPassword({email,password});setLoading(false);if(error){showToast(error.message.includes("Email not confirmed")?"Check your email to confirm first":error.message,"error");return}onAuth(data.session)}
  async function handleSignup(e){e.preventDefault();if(!name||!compId||!email||!password){showToast("Fill in all fields","error");return}if(!email.endsWith("@virginia.edu")){showToast("Must use @virginia.edu email","error");return}if(password.length<6){showToast("Password must be 6+ characters","error");return}setLoading(true);const{data,error}=await supabase.auth.signUp({email,password,options:{data:{name,comp_id:compId},emailRedirectTo:siteUrl}});if(error){setLoading(false);showToast(error.message,"error");return}await supabase.from("users").upsert({id:data.user.id,name,comp_id:compId,email,role:"user"},{onConflict:"email"});setLoading(false);setConfirmSent(true)}
  async function handleForgot(e){e.preventDefault();if(!email){showToast("Enter your email","error");return}setLoading(true);const{error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:siteUrl});setLoading(false);if(error){showToast(error.message,"error");return}showToast("Reset email sent!","success");setMode("login")}
  if(confirmSent)return(<div style={{minHeight:"100vh",background:"#f5f4f0",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans',sans-serif",padding:20}}><div style={{...C,padding:40,maxWidth:440,width:"100%",textAlign:"center"}}><div style={{width:64,height:64,borderRadius:"50%",background:"#f0f9f0",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px",color:"#22c55e"}}>{I.check}</div><h2 style={{fontFamily:"'Playfair Display',serif",fontSize:24,color:"#1a1a2e",marginBottom:8}}>Check Your Email</h2><p style={{color:"#888",fontSize:14,marginBottom:24,lineHeight:1.6}}>Confirmation link sent to <strong>{email}</strong>.</p><button onClick={()=>{setConfirmSent(false);setMode("login")}} style={{...B("#1a1a2e","#fff"),padding:"12px 28px",fontSize:14}}>Back to Login</button></div></div>);
  return(
    <div style={{minHeight:"100vh",background:"#f5f4f0",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans',sans-serif",padding:20}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600;700&display=swap');*{box-sizing:border-box;margin:0;padding:0}input:focus{border-color:#d4740e!important;box-shadow:0 0 0 3px rgba(212,116,14,0.1)}`}</style>
      <div style={{maxWidth:440,width:"100%"}}>
        <div style={{textAlign:"center",marginBottom:32}}><div style={{width:56,height:56,borderRadius:14,background:"linear-gradient(135deg,#1a1a2e,#0f3460)",display:"inline-flex",alignItems:"center",justifyContent:"center",color:"#d4740e",marginBottom:16}}>{I.printer}</div><h1 style={{fontFamily:"'Playfair Display',serif",fontSize:28,color:"#1a1a2e",marginBottom:4}}>Fablab Printer Queue</h1><p style={{color:"#999",fontSize:13}}>University of Virginia</p></div>
        <div style={{...C,padding:28}}>
          {mode!=="forgot"&&<div style={{display:"flex",marginBottom:24,background:"#f3f3f3",borderRadius:8,padding:3}}><button onClick={()=>setMode("login")} style={{flex:1,padding:"9px 0",borderRadius:6,border:"none",cursor:"pointer",fontSize:13,fontWeight:600,background:mode==="login"?"#1a1a2e":"transparent",color:mode==="login"?"#fff":"#888"}}>Log In</button><button onClick={()=>setMode("signup")} style={{flex:1,padding:"9px 0",borderRadius:6,border:"none",cursor:"pointer",fontSize:13,fontWeight:600,background:mode==="signup"?"#1a1a2e":"transparent",color:mode==="signup"?"#fff":"#888"}}>Sign Up</button></div>}
          {mode==="forgot"&&<div style={{marginBottom:20}}><button onClick={()=>setMode("login")} style={{background:"none",border:"none",cursor:"pointer",color:"#d4740e",fontSize:13,fontWeight:600,display:"flex",alignItems:"center",gap:4}}>{I.left} Back</button><h3 style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:"#1a1a2e",marginTop:12}}>Reset Password</h3></div>}
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            {mode==="signup"&&<><div><label style={lbl}>Full Name</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="John Doe" style={inp}/></div><div><label style={lbl}>Computing ID</label><input value={compId} onChange={e=>setCompId(e.target.value)} placeholder="abc3de" style={inp}/></div></>}
            <div><label style={lbl}>UVA Email</label><input value={email} onChange={e=>setEmail(e.target.value)} placeholder="mst3k@virginia.edu" style={inp} type="email"/></div>
            {mode!=="forgot"&&<div><label style={lbl}>Password</label><input value={password} onChange={e=>setPassword(e.target.value)} placeholder={mode==="signup"?"At least 6 characters":"Enter password"} style={inp} type="password"/></div>}
            <button onClick={mode==="login"?handleLogin:mode==="signup"?handleSignup:handleForgot} disabled={loading} style={{...B("linear-gradient(135deg,#d4740e,#e8922e)","#fff"),width:"100%",justifyContent:"center",padding:"13px",fontSize:15,borderRadius:10,opacity:loading?0.7:1}}>{loading?"Please wait...":mode==="login"?"Log In":mode==="signup"?"Create Account":"Send Reset Link"}</button>
            {mode==="login"&&<button onClick={()=>setMode("forgot")} style={{background:"none",border:"none",cursor:"pointer",color:"#d4740e",fontSize:12,textAlign:"center"}}>Forgot password?</button>}
            {mode==="signup"&&<div style={{fontSize:11,color:"#aaa",textAlign:"center"}}>Only @virginia.edu emails accepted.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* HOME */
function HomePage({printers,jobs,onNavigate}){
  const now=new Date();
  function getStatus(p){if(!p.online)return{text:"Offline",color:"#888"};const active=jobs.find(j=>j.printer_id===p.id&&j.status!=="cancelled"&&j.status!=="completed"&&j.status!=="failed"&&now.getTime()>=jAS(j)&&now.getTime()<jAE(j));if(active){const rem=(jAE(active)-now.getTime())/3600000;return{text:`${fD(rem)} remaining`,color:"#d4740e"}}return{text:"Available",color:"#22c55e"}}
  return(<div>
    <div style={{textAlign:"center",marginBottom:36}}><h1 style={{fontFamily:"'Playfair Display',serif",fontSize:34,color:"#1a1a2e",margin:"0 0 6px",fontWeight:700}}>Available Printers</h1></div>
    <div style={iB("#fef7ed","#d4740e")}><div style={{color:"#6b4c1e"}}><strong>How it works:</strong> Join the queue and we'll assign the next available printer. Each reservation includes a 15-minute buffer on each side for setup and removal.</div></div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:16,marginBottom:32}}>
      {printers.map(p=>{const s=getStatus(p);return(
        <div key={p.id} onClick={()=>p.online&&onNavigate("join")} style={{...C,overflow:"hidden",cursor:p.online?"pointer":"default",transition:"all .25s",opacity:p.online?1:0.55}} onMouseEnter={e=>{if(p.online){e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow="0 8px 28px rgba(0,0,0,0.1)"}}} onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow=""}}>
          <div style={{height:120,background:p.online?"linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)":"linear-gradient(135deg,#555,#777)",display:"flex",alignItems:"center",justifyContent:"center",position:"relative"}}>
            <div style={{position:"absolute",inset:0,opacity:0.08,backgroundImage:"radial-gradient(circle at 30% 50%,#d4740e 0%,transparent 50%)"}}/>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={p.online?"#d4740e":"#999"} strokeWidth="1.5" style={{opacity:0.7}}><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            <div style={{position:"absolute",top:10,right:10,width:10,height:10,borderRadius:"50%",background:p.online?(s.color==="#22c55e"?"#22c55e":"#d4740e"):"#888",boxShadow:`0 0 6px ${p.online?s.color:"#888"}`}}/>
            {!p.online&&<div style={{position:"absolute",bottom:8,left:0,right:0,textAlign:"center",color:"#fff",fontSize:11,fontWeight:600,background:"rgba(0,0,0,0.4)",padding:"3px 0"}}>OFFLINE</div>}
          </div>
          <div style={{padding:"14px 16px"}}><h3 style={{margin:"0 0 2px",fontFamily:"'Playfair Display',serif",fontSize:16,color:"#1a1a2e"}}>{p.name}</h3>
            <div style={{display:"flex",alignItems:"center",gap:5,color:s.color,fontSize:12,fontFamily:"'DM Sans',sans-serif",fontWeight:500,marginTop:6}}>{I.clock}<span>{s.text}</span></div>
          </div>
        </div>
      )})}
    </div>
    <div style={{display:"flex",gap:12,flexWrap:"wrap"}}><button onClick={()=>onNavigate("join")} style={{...B("linear-gradient(135deg,#d4740e,#e8922e)","#fff"),padding:"14px 28px",fontSize:15,borderRadius:10,boxShadow:"0 4px 16px rgba(212,116,14,0.25)"}}>{I.plus} Join the Queue</button><button onClick={()=>onNavigate("reserve")} style={{...B("#fff","#1a1a2e"),padding:"14px 28px",fontSize:15,borderRadius:10,border:"1px solid #ddd"}}>{I.cal} Reserve a Slot</button></div>
  </div>);
}

/* JOIN QUEUE */
function JoinQueuePage({printers,jobs,userProfile,isAdmin,onJoinQueue,showToast}){
  const[duration,setDuration]=useState("");const[printName,setPrintName]=useState("");const[qWindow,setQWindow]=useState("now");
  const dur=parseFloat(duration)||0;const isOvernight=dur>8;
  const activeCount=jobs.filter(j=>(j.comp_id===userProfile.comp_id)&&(j.status==="reserved"||j.status==="checkedIn")).length;
  const atLimit=!isAdmin&&activeCount>=2;
  const slot=dur>0?findNextSlot(printers,jobs,dur,isOvernight):null;
  // Check if "Now" is available (any printer free right now)
  const nowAvailable=dur>0&&slot&&(new Date(slot.date+"T00:00:00").getTime()+slot.startHour*3600000-Date.now()<60000);
  // Build time options: "Now" if available, then 15-min increments rounded to :00/:15/:30/:45, up to 2 hours
  const timeOpts=(()=>{
    const opts=[];
    const now=new Date();const curMin=now.getMinutes();
    // Round up to next :00/:15/:30/:45
    const nextQ=Math.ceil(curMin/15)*15;
    const baseDate=new Date(now);baseDate.setSeconds(0,0);
    if(nextQ>=60){baseDate.setHours(baseDate.getHours()+1);baseDate.setMinutes(0)}else{baseDate.setMinutes(nextQ)}
    for(let i=1;i<=8;i++){
      const t=new Date(baseDate.getTime()+i*15*60000);
      const h=t.getHours()+t.getMinutes()/60;
      const label=fH(h);
      opts.push({key:String(i*15),label,hours:h});
    }
    return opts;
  })();
  function handleSubmit(){
    if(atLimit){showToast("You already have 2 active prints. Check out or cancel one first.","error");return}
    if(!duration){showToast("Enter duration","error");return}if(dur<0.25){showToast("Min 15 minutes","error");return}
    onJoinQueue({name:userProfile.name,compId:userProfile.comp_id,email:userProfile.email,duration:dur,isOvernight,printName:printName.trim()||null,qWindow});
    setDuration("");setPrintName("");setQWindow("now");
  }
  return(<div style={{maxWidth:600,margin:"0 auto"}}>
    <div style={{marginBottom:24}}><h1 style={{fontFamily:"'Playfair Display',serif",fontSize:30,color:"#1a1a2e",margin:"0 0 4px"}}>Join the Print Queue</h1></div>
    <div style={iB("#fef7ed","#d4740e")}><div style={{color:"#6b4c1e"}}><strong>Smart Queue:</strong> We auto-assign the earliest slot. A 15-min buffer is added on each side for setup/removal.{dur>8&&" Prints over 8 hours are scheduled after 5 PM."}</div></div>
    {atLimit&&<div style={iB("#fef2f2","#ef4444")}><div style={{color:"#842029"}}><strong>Limit reached:</strong> You have 2 active prints. Check out or cancel one before adding more.</div></div>}
    <div style={{...C,padding:24,marginBottom:20}}>
      <div style={{padding:"12px 16px",background:"#f9f9f9",borderRadius:10,marginBottom:18,display:"flex",alignItems:"center",gap:12}}><div style={{width:36,height:36,borderRadius:"50%",background:"#1a1a2e",color:"#d4740e",display:"flex",alignItems:"center",justifyContent:"center"}}>{I.user}</div><div><div style={{fontSize:14,fontWeight:600,color:"#1a1a2e"}}>{userProfile.name}</div><div style={{fontSize:12,color:"#888"}}>{userProfile.comp_id}</div></div></div>
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        <div><label style={lbl}>Print Name <span style={{fontWeight:400,color:"#aaa"}}>(optional)</span></label><input value={printName} onChange={e=>setPrintName(e.target.value)} placeholder="e.g. Phone stand v2" style={inp}/></div>
        <div><label style={lbl}>Print Duration (hours)</label><input value={duration} onChange={e=>setDuration(e.target.value)} placeholder="2.5" style={inp} type="number" min="0.25" step="0.25"/><div style={{fontSize:11,color:"#aaa",marginTop:4}}>Min 15 min. +15 min buffer each side automatically.</div></div>
        <div><label style={lbl}>When do you want to print?</label>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            <button onClick={()=>setQWindow("now")} style={{padding:"9px 16px",borderRadius:8,border:qWindow==="now"?"2px solid #d4740e":"1px solid #ddd",background:qWindow==="now"?"#fef7ed":"#fff",color:qWindow==="now"?"#d4740e":nowAvailable?"#555":"#bbb",fontSize:13,fontWeight:qWindow==="now"?600:400,cursor:nowAvailable?"pointer":"not-allowed",opacity:nowAvailable?1:0.5}}>Now</button>
            {timeOpts.map(o=><button key={o.key} onClick={()=>setQWindow(o.key)} style={{padding:"9px 12px",borderRadius:8,border:qWindow===o.key?"2px solid #d4740e":"1px solid #ddd",background:qWindow===o.key?"#fef7ed":"#fff",color:qWindow===o.key?"#d4740e":"#555",fontSize:13,fontWeight:qWindow===o.key?600:400,cursor:"pointer"}}>{o.label}</button>)}
          </div>
          {!nowAvailable&&qWindow==="now"&&dur>0&&<div style={{fontSize:11,color:"#d4740e",marginTop:6}}>No printer is available right now. Pick a later time or we'll assign the soonest slot.</div>}
        </div>
        {isOvernight&&<div style={iB("#f0f4ff","#3d7ec7")}><div style={{color:"#1e3a5f"}}>This print is over 8 hours and will be scheduled after 5 PM.</div></div>}
        {slot&&dur>0&&<div style={{padding:"14px 18px",background:"#f0f9f0",borderRadius:10,border:"1px solid #c6e6c6"}}><div style={{fontSize:12,color:"#2d4a27",fontWeight:600,marginBottom:4}}>Your estimated slot:</div><div style={{fontSize:15,color:"#1a1a2e",fontWeight:600}}>{slot.printerName} · {fH(slot.startHour)} on {slot.date===dk(new Date())?"Today":slot.date}</div><div style={{fontSize:11,color:"#888",marginTop:2}}>Buffer: {fH(slot.startHour-BUFFER)} (setup) → {fH(slot.startHour)} (print) → {fH(slot.startHour+dur)} (done) → {fH(slot.startHour+dur+BUFFER)} (removal)</div></div>}
        <button onClick={handleSubmit} disabled={atLimit} style={{...B("linear-gradient(135deg,#d4740e,#e8922e)","#fff"),width:"100%",justifyContent:"center",padding:"14px",fontSize:15,borderRadius:10,boxShadow:"0 4px 16px rgba(212,116,14,0.25)",opacity:atLimit?0.5:1}}>Join Queue</button>
      </div>
    </div>
  </div>);
}

/* RESERVE */
function ReservePage({printers,jobs,userProfile,isAdmin,onReserve,showToast}){
  const[duration,setDuration]=useState("");const[printerId,setPrinterId]=useState("");const[date,setDate]=useState(dk(new Date()));const[hour,setHour]=useState("");const[printName,setPrintName]=useState("");
  const dur=parseFloat(duration)||0;const isOvernight=dur>8;const online=printers.filter(p=>p.online);
  const activeCount=jobs.filter(j=>(j.comp_id===userProfile.comp_id)&&(j.status==="reserved"||j.status==="checkedIn")).length;
  const atLimit=!isAdmin&&activeCount>=2;
  const dateOpts=Array.from({length:14},(_,i)=>{const d=aD(new Date(),i);return{key:dk(d),label:i===0?"Today":i===1?"Tomorrow":fDt(d)}});
  function getSlots(){
    if(!printerId||dur<=0)return[];
    const pJ=jobs.filter(j=>j.printer_id===Number(printerId)&&j.status!=="cancelled"&&j.status!=="completed"&&j.status!=="failed");
    const slots=[];const sR=isOvernight?17:0;const eR=24;
    for(let h=sR;h<eR;h+=0.5){
      const sD=new Date(date+"T00:00:00"),sS=sD.getTime()+h*3600000,sE=sS+dur*3600000;
      if(sS<Date.now())continue;
      if(sE>sD.getTime()+24*3600000)continue;
      const bS=sS-BUFFER*3600000,bE=sE+BUFFER*3600000;
      const conflict=pJ.some(j=>{const jb=jBS(j),je=jBE(j);return bS<je&&bE>jb});
      if(!conflict)slots.push(h);
    }
    return slots;
  }
  const slots=getSlots();
  function handleSubmit(){
    if(atLimit){showToast("You have 2 active prints already.","error");return}
    if(!duration||!printerId||hour===""){showToast("Fill all fields","error");return}
    onReserve({name:userProfile.name,compId:userProfile.comp_id,email:userProfile.email,duration:dur,printerId:Number(printerId),date,startHour:parseFloat(hour),isOvernight,printName:printName.trim()||null});
    setDuration("");setPrinterId("");setHour("");setPrintName("");
  }
  return(<div style={{maxWidth:600,margin:"0 auto"}}>
    <div style={{marginBottom:24}}><h1 style={{fontFamily:"'Playfair Display',serif",fontSize:30,color:"#1a1a2e",margin:"0 0 4px"}}>Reserve a Slot</h1></div>
    <div style={iB("#f0f4ff","#3d7ec7")}><div style={{color:"#1e3a5f"}}><strong>Note:</strong> Use "Join Queue" for the fastest available slot, or reserve here to pick a specific printer and time. A 15-min buffer is added on each side for setup and removal.</div></div>
    {atLimit&&<div style={iB("#fef2f2","#ef4444")}><div style={{color:"#842029"}}><strong>Limit reached:</strong> You have 2 active prints.</div></div>}
    <div style={{...C,padding:24}}>
      <div style={{padding:"12px 16px",background:"#f9f9f9",borderRadius:10,marginBottom:18,display:"flex",alignItems:"center",gap:12}}><div style={{width:36,height:36,borderRadius:"50%",background:"#1a1a2e",color:"#d4740e",display:"flex",alignItems:"center",justifyContent:"center"}}>{I.user}</div><div><div style={{fontSize:14,fontWeight:600,color:"#1a1a2e"}}>{userProfile.name}</div><div style={{fontSize:12,color:"#888"}}>{userProfile.comp_id}</div></div></div>
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        <div><label style={lbl}>Print Name <span style={{fontWeight:400,color:"#aaa"}}>(optional)</span></label><input value={printName} onChange={e=>setPrintName(e.target.value)} placeholder="e.g. Gear assembly" style={inp}/></div>
        <div><label style={lbl}>Duration (hours)</label><input value={duration} onChange={e=>setDuration(e.target.value)} placeholder="2.5" style={inp} type="number" min="0.25" step="0.25"/><div style={{fontSize:11,color:"#aaa",marginTop:4}}>+15 min buffer on each side for setup/removal.</div></div>
        {isOvernight&&<div style={iB("#f0f4ff","#3d7ec7")}><div style={{color:"#1e3a5f"}}>Over 8 hours — only evening slots (after 5 PM) shown.</div></div>}
        <div><label style={lbl}>Printer</label><select value={printerId} onChange={e=>{setPrinterId(e.target.value);setHour("")}} style={{...inp,cursor:"pointer"}}><option value="">Choose...</option>{online.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
        <div><label style={lbl}>Date</label><select value={date} onChange={e=>{setDate(e.target.value);setHour("")}} style={{...inp,cursor:"pointer"}}>{dateOpts.map(d=><option key={d.key} value={d.key}>{d.label}</option>)}</select></div>
        {printerId&&dur>0&&<div><label style={lbl}>Available Slots</label>{slots.length===0?<div style={{padding:14,background:"#fef2f2",borderRadius:8,color:"#991b1b",fontSize:13}}>No slots available for this date/printer.</div>:<div style={{display:"flex",flexWrap:"wrap",gap:6}}>{slots.slice(0,30).map(h=><button key={h} onClick={()=>setHour(String(h))} style={{padding:"7px 12px",borderRadius:7,cursor:"pointer",fontSize:12,border:hour===String(h)?"2px solid #d4740e":"1px solid #ddd",background:hour===String(h)?"#fef7ed":"#fff",color:hour===String(h)?"#d4740e":"#555",fontWeight:hour===String(h)?600:400}}>{fH(h)}</button>)}</div>}</div>}
        {hour!==""&&<div style={{fontSize:12,color:"#555",background:"#f9f9f9",padding:"10px 14px",borderRadius:8}}>Your print window: <strong>{fH(parseFloat(hour)-BUFFER)}</strong> (buffer/setup) → <strong>{fH(parseFloat(hour))}</strong> (print starts) → <strong>{fH(parseFloat(hour)+dur)}</strong> (print ends) → <strong>{fH(parseFloat(hour)+dur+BUFFER)}</strong> (buffer/removal)</div>}
        <button onClick={handleSubmit} disabled={atLimit} style={{...B("#1a1a2e","#fff"),width:"100%",justifyContent:"center",padding:"14px",fontSize:15,borderRadius:10,opacity:atLimit?0.5:1}}>Reserve Slot</button>
      </div>
    </div>
  </div>);
}

/* SCHEDULE */
function SchedulePage({printers,jobs,userProfile,isAdmin,onCheckIn,onCheckOut,onCancel,onReportFailure}){
  const[selDate,setSelDate]=useState(new Date());const[weekBase,setWeekBase]=useState(new Date());
  const week=gW(weekBase);const today=dk(new Date());const sd=dk(selDate);const ROW_H=48;const hours=Array.from({length:24},(_,i)=>i);
  const dayJobs=jobs.filter(j=>{if(j.status==="cancelled")return false;const dS=new Date(sd+"T00:00:00").getTime(),dE=dS+86400000,js=jAS(j)-BUFFER*3600000,je=jAE(j)+BUFFER*3600000;return js<dE&&je>dS});
  function gJD(job,pid){if(job.printer_id!==pid)return null;const dS=new Date(sd+"T00:00:00").getTime();
    const js=jAS(job),je=jAE(job),bs=js-BUFFER*3600000,be=je+BUFFER*3600000;
    const vS=Math.max(bs,dS),vE=Math.min(be,dS+86400000);
    if(vS>=vE)return null;
    const totalTop=(vS-dS)/3600000*ROW_H, totalH=Math.max((vE-vS)/3600000*ROW_H-2,20);
    const printVS=Math.max(js,dS),printVE=Math.min(je,dS+86400000);
    const bufTopH=Math.max(0,(printVS-vS)/3600000*ROW_H);
    const bufBotH=Math.max(0,(vE-printVE)/3600000*ROW_H);
    const printH=Math.max(totalH-bufTopH-bufBotH,0);
    const c={reserved:{bg:"#1e3a5f",t:"#fff"},checkedIn:{bg:"#d4740e",t:"#fff"},completed:{bg:"#4a6741",t:"#fff"},failed:{bg:"#842029",t:"#fff"}}[job.status]||{bg:"#1e3a5f",t:"#fff"};
    return{top:totalTop,height:totalH,bg:c.bg,text:c.t,bufTopH,bufBotH,printH}}
  const isToday=sd===today,ch=nH();
  const isMine=j=>j.comp_id===userProfile?.comp_id||j.email===userProfile?.email;
  return(<div>
    <div style={{marginBottom:24}}><h1 style={{fontFamily:"'Playfair Display',serif",fontSize:30,color:"#1a1a2e",margin:"0 0 4px"}}>Schedule</h1></div>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,flexWrap:"wrap",gap:8}}>
      <div style={{display:"flex",gap:4,flexWrap:"wrap",overflowX:"auto",WebkitOverflowScrolling:"touch"}}>{week.map(d=>{const isSel=dk(d)===sd,isT=dk(d)===today;return<button key={dk(d)} onClick={()=>setSelDate(d)} style={{padding:"7px 12px",borderRadius:7,border:"none",cursor:"pointer",fontSize:12,fontWeight:500,background:isSel?"#d4740e":isT?"#fef7ed":"#f3f3f3",color:isSel?"#fff":isT?"#d4740e":"#666",whiteSpace:"nowrap",flexShrink:0}}>{DAYS[d.getDay()]} {d.getDate()}</button>})}</div>
      <div style={{display:"flex",alignItems:"center",gap:6}}><button onClick={()=>{const nb=aD(weekBase,-7);setWeekBase(nb);setSelDate(gW(nb)[0])}} style={{background:"none",border:"1px solid #ddd",borderRadius:6,padding:"5px 7px",cursor:"pointer"}}>{I.left}</button><span style={{fontSize:12,color:"#999",minWidth:110,textAlign:"center"}}>{MO[week[0].getMonth()]} {week[0].getDate()}–{week[6].getDate()}, {week[6].getFullYear()}</span><button onClick={()=>{const nb=aD(weekBase,7);setWeekBase(nb);setSelDate(gW(nb)[0])}} style={{background:"none",border:"1px solid #ddd",borderRadius:6,padding:"5px 7px",cursor:"pointer"}}>{I.right}</button></div>
    </div>
    <div style={{fontSize:16,fontFamily:"'Playfair Display',serif",fontWeight:600,color:"#1a1a2e",marginBottom:12}}>{fDt(selDate)}</div>
    <div style={{overflowX:"auto",borderRadius:12,border:"1px solid #e0e0e0",WebkitOverflowScrolling:"touch"}}><div style={{minWidth:Math.max(500,printers.length*100+60)}}>
      <div style={{display:"grid",gridTemplateColumns:`60px repeat(${printers.length},1fr)`,background:"#1a1a2e"}}><div style={{padding:"10px 6px",color:"#888",fontSize:11,fontWeight:600}}>Time</div>{printers.map(p=><div key={p.id} style={{padding:"8px 6px",borderLeft:"1px solid #2a2a4e",textAlign:"center",opacity:p.online?1:0.5}}><div style={{color:"#fff",fontSize:11,fontWeight:600}}>{p.name}</div>{!p.online&&<div style={{color:"#ef4444",fontSize:9}}>OFFLINE</div>}</div>)}</div>
      <div style={{position:"relative"}}>{hours.map(h=><div key={h} style={{display:"grid",gridTemplateColumns:`60px repeat(${printers.length},1fr)`,borderBottom:"1px solid #f0f0f0",background:h>=20||h<8?"#fafaf8":"#fff"}}><div style={{padding:"6px 8px",height:ROW_H-1,fontSize:11,color:"#bbb",fontWeight:500}}>{fH(h)}</div>{printers.map(p=><div key={p.id} style={{borderLeft:"1px solid #f0f0f0",height:ROW_H}}/>)}</div>)}
        {printers.map((p,pi)=>{const pJ=dayJobs.filter(j=>j.printer_id===p.id);return pJ.map(job=>{const d=gJD(job,p.id);if(!d)return null;
          const mine=isMine(job);const canCI=job.status==="reserved"&&isToday&&mine;const canCO=job.status==="checkedIn"&&mine;const canDel=isAdmin||(mine&&(job.status==="reserved"||job.status==="checkedIn"));const canFail=job.status==="reserved"&&isToday&&mine;const canClear=isAdmin&&(job.status==="completed"||job.status==="failed");
          const colL=`calc(60px + ${pi}*((100% - 60px)/${printers.length}) + 2px)`,colW=`calc((100% - 60px)/${printers.length} - 4px)`;
          return<div key={job.id} style={{position:"absolute",top:d.top+1,left:colL,width:colW,height:d.height,zIndex:2,display:"flex",flexDirection:"column",borderRadius:6,overflow:"hidden",cursor:"default"}}>
            {d.bufTopH>0&&<div style={{height:d.bufTopH,background:"repeating-linear-gradient(135deg,rgba(255,190,60,0.35),rgba(255,190,60,0.35) 3px,rgba(255,190,60,0.15) 3px,rgba(255,190,60,0.15) 6px)",borderBottom:"1px dashed rgba(255,255,255,0.3)"}}/>}
            <div style={{flex:1,minHeight:0,background:d.bg,color:d.text,padding:"4px 6px",fontSize:10,fontFamily:"'DM Sans',sans-serif",overflow:"hidden",display:"flex",flexDirection:"column"}}>
              <div style={{fontWeight:600,lineHeight:1.2,fontSize:Math.min(11,Math.max(9,d.printH/5))}}>{job.print_name||job.name}</div>
              {d.printH>22&&<div style={{opacity:0.75,fontSize:9}}>{job.comp_id} · {fH(job.start_hour)}–{fH(job.start_hour+job.duration)}</div>}
              {d.printH>34&&<div style={{opacity:0.6,fontSize:8}}>{fD(job.duration)}{job.status==="checkedIn"?" · Active":job.status==="completed"?" · Done":job.status==="failed"?" · Failed":""}</div>}
              {d.printH>30&&(canCI||canCO||canDel||canFail||canClear)&&(
                <div style={{display:"flex",gap:2,marginTop:2,flexWrap:"wrap"}}>
                  {canCI&&<button onClick={()=>onCheckIn(job.id)} style={{background:"rgba(255,255,255,0.2)",border:"none",color:"#fff",fontSize:8,padding:"2px 4px",borderRadius:3,cursor:"pointer"}}>Check In</button>}
                  {canCO&&<button onClick={()=>onCheckOut(job.id)} style={{background:"rgba(255,255,255,0.2)",border:"none",color:"#fff",fontSize:8,padding:"2px 4px",borderRadius:3,cursor:"pointer"}}>Check Out</button>}
                  {canFail&&<button onClick={()=>onReportFailure(job.id)} style={{background:"rgba(255,0,0,0.2)",border:"none",color:"#fff",fontSize:8,padding:"2px 4px",borderRadius:3,cursor:"pointer"}}>Failed</button>}
                  {canDel&&<button onClick={()=>onCancel(job.id)} style={{background:"rgba(255,255,255,0.1)",border:"none",color:"rgba(255,255,255,0.7)",fontSize:8,padding:"2px 4px",borderRadius:3,cursor:"pointer"}}>{job.status==="reserved"||job.status==="checkedIn"?"Cancel":"Clear"}</button>}
                  {canClear&&!canDel&&<button onClick={()=>onCancel(job.id)} style={{background:"rgba(255,255,255,0.1)",border:"none",color:"rgba(255,255,255,0.7)",fontSize:8,padding:"2px 4px",borderRadius:3,cursor:"pointer"}}>Clear</button>}
                </div>
              )}
            </div>
            {d.bufBotH>0&&<div style={{height:d.bufBotH,background:"repeating-linear-gradient(135deg,rgba(255,190,60,0.35),rgba(255,190,60,0.35) 3px,rgba(255,190,60,0.15) 3px,rgba(255,190,60,0.15) 6px)",borderTop:"1px dashed rgba(255,255,255,0.3)"}}/>}
          </div>})})}
        {isToday&&ch>=0&&ch<=24&&<div style={{position:"absolute",top:ch*ROW_H,left:0,right:0,height:2,background:"#ef4444",zIndex:3,boxShadow:"0 0 8px rgba(239,68,68,0.3)"}}><div style={{position:"absolute",left:2,top:-4,width:10,height:10,borderRadius:"50%",background:"#ef4444"}}/></div>}
      </div>
    </div></div>
    <div style={{display:"flex",gap:16,marginTop:14,padding:"10px 16px",background:"#f9f9f9",borderRadius:10,fontSize:12,flexWrap:"wrap",alignItems:"center"}}>
      {[{l:"Reserved",c:"#1e3a5f"},{l:"Active",c:"#d4740e"},{l:"Completed",c:"#4a6741"},{l:"Failed",c:"#842029"}].map(x=><div key={x.l} style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:12,height:12,borderRadius:3,background:x.c}}/><span style={{color:"#888"}}>{x.l}</span></div>)}
      <div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:12,height:12,borderRadius:3,background:"repeating-linear-gradient(135deg,rgba(255,190,60,0.5),rgba(255,190,60,0.5) 2px,rgba(255,190,60,0.2) 2px,rgba(255,190,60,0.2) 4px)"}}/><span style={{color:"#888"}}>Buffer (15 min setup/removal)</span></div>
    </div>
  </div>);
}

/* MY PRINTS */
function MyPrintsPage({printers,jobs,userProfile,onCheckIn,onCheckOut,onCancel,onReportFailure}){
  const now=new Date();const myJobs=jobs.filter(j=>(j.comp_id===userProfile.comp_id||j.email===userProfile.email)&&j.status!=="cancelled").sort((a,b)=>jAS(a)-jAS(b));
  return(<div style={{maxWidth:600,margin:"0 auto"}}>
    <div style={{marginBottom:24}}><h1 style={{fontFamily:"'Playfair Display',serif",fontSize:30,color:"#1a1a2e",margin:"0 0 4px"}}>My Prints</h1></div>
    <div style={iB("#fef7ed","#d4740e")}><div style={{color:"#6b4c1e"}}><strong>Check in</strong> when you start. <strong>Check out</strong> when done — please do not check out until your print is removed from the printer.</div></div>
    {myJobs.length===0&&<div style={{padding:40,textAlign:"center",background:"#f9f9f9",borderRadius:14,color:"#aaa"}}>No active reservations. Join the queue to start!</div>}
    {myJobs.map(job=>{const printer=printers.find(p=>p.id===job.printer_id);const js=jAS(job),je=jAE(job),isNow=now.getTime()>=js-900000&&now.getTime()<je,isPast=now.getTime()>=je;const canCI=job.status==="reserved"&&(isNow||now.getTime()>=js);const canCO=job.status==="checkedIn";
    return<div key={job.id} style={{...C,padding:18,marginBottom:10,opacity:job.status==="completed"||job.status==="failed"?0.5:1,borderLeft:canCI?"4px solid #d4740e":canCO?"4px solid #22c55e":"4px solid transparent"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
        <div style={{minWidth:0}}><div style={{fontFamily:"'Playfair Display',serif",fontSize:16,color:"#1a1a2e",marginBottom:3}}>{job.print_name||printer?.name||"Print"}</div>
          <div style={{fontSize:12,color:"#888"}}>{printer?.name} · {job.date} · {fH(job.start_hour)} → {fH(job.start_hour+job.duration)} · {fD(job.duration)}</div></div>
        <span style={{padding:"3px 10px",borderRadius:12,fontSize:11,fontWeight:600,flexShrink:0,background:{reserved:"#f0f4ff",checkedIn:"#fef7ed",completed:"#f0f9f0",failed:"#fef2f2"}[job.status],color:{reserved:"#3d7ec7",checkedIn:"#d4740e",completed:"#22c55e",failed:"#ef4444"}[job.status]}}>{{reserved:"Reserved",checkedIn:"Active",completed:"Done",failed:"Failed"}[job.status]}</span>
      </div>
      {(canCI||canCO||job.status==="reserved"||job.status==="checkedIn")&&job.status!=="completed"&&job.status!=="failed"&&<div style={{display:"flex",gap:8,marginTop:14,flexWrap:"wrap"}}>
        {canCI&&<button onClick={()=>onCheckIn(job.id)} style={B("linear-gradient(135deg,#d4740e,#e8922e)","#fff")}>{I.check} Check In</button>}
        {canCO&&<button onClick={()=>onCheckOut(job.id)} style={B("#22c55e","#fff")}>{I.check} Check Out</button>}
        {canCI&&<button onClick={()=>onReportFailure(job.id)} style={B("#fef2f2","#ef4444")}>{I.alert} Report Failure</button>}
        {(job.status==="reserved"||job.status==="checkedIn")&&<button onClick={()=>onCancel(job.id)} style={B("#f5f5f5","#999")}>{I.x} Cancel</button>}
      </div>}
    </div>})}
  </div>);
}

/* ADMIN */
function AdminPage({printers,jobs,onAddPrinter,onTogglePrinter,onRemovePrinter,showToast}){
  const[newName,setNewName]=useState("");
  return(<div style={{maxWidth:600,margin:"0 auto"}}>
    <div style={{marginBottom:24}}><h1 style={{fontFamily:"'Playfair Display',serif",fontSize:30,color:"#1a1a2e",margin:"0 0 4px"}}>Admin Panel</h1></div>
    <div style={{...C,padding:20,marginBottom:24}}>
      <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:17,color:"#1a1a2e",marginBottom:14}}>Add Printer</h3>
      <div style={{display:"flex",gap:10,alignItems:"flex-end",flexWrap:"wrap"}}>
        <div style={{flex:1,minWidth:180}}><label style={lbl}>Printer Name</label><input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Enter name" style={inp}/></div>
        <button onClick={()=>{if(!newName.trim()){showToast("Enter a name","error");return}onAddPrinter(newName.trim());setNewName("")}} style={{...B("#1a1a2e","#fff"),padding:"11px 20px"}}>{I.plus} Add</button>
      </div>
    </div>
    <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:17,color:"#1a1a2e",marginBottom:14}}>All Printers ({printers.length})</h3>
    {printers.map(p=>{const active=jobs.filter(j=>j.printer_id===p.id&&(j.status==="reserved"||j.status==="checkedIn")).length;return<div key={p.id} style={{...C,padding:"14px 18px",marginBottom:8,display:"flex",alignItems:"center",gap:14,borderLeft:`4px solid ${p.online?"#22c55e":"#ef4444"}`,flexWrap:"wrap"}}>
      <div style={{flex:1,minWidth:120}}><div style={{fontSize:14,fontWeight:600,color:"#1a1a2e"}}>{p.name}</div><div style={{fontSize:12,color:"#888"}}>{active} active · {p.online?"Online":"Offline"}</div></div>
      <button onClick={()=>onTogglePrinter(p.id,p.online)} style={{...B(p.online?"#fef2f2":"#f0f9f0",p.online?"#ef4444":"#22c55e"),fontSize:12,padding:"7px 14px"}}>{I.power} {p.online?"Take Offline":"Bring Online"}</button>
      {active===0&&<button onClick={()=>onRemovePrinter(p.id)} style={{...B("#f5f5f5","#999"),fontSize:12,padding:"7px 12px"}}>{I.trash} Remove</button>}
    </div>})}
  </div>);
}

/* MAIN APP */
export default function App(){
  const siteUrl=window.location.origin;
  const[session,setSession]=useState(null);const[userProfile,setUserProfile]=useState(null);const[page,setPage]=useState("home");const[printers,setPrinters]=useState([]);const[jobs,setJobs]=useState([]);const[notifications,setNotifications]=useState([]);const[toast,setToast]=useState(null);const[loading,setLoading]=useState(true);const[confirm,setConfirm]=useState(null);
  const showToast=useCallback((m,t="info")=>setToast({message:m,type:t,key:Date.now()}),[]);
  const isAdmin=userProfile?.role==="admin";

  useEffect(()=>{supabase.auth.getSession().then(({data:{session:s}})=>{setSession(s);if(s)loadProfile(s.user);else setLoading(false)});const{data:{subscription}}=supabase.auth.onAuthStateChange((_,s)=>{setSession(s);if(s)loadProfile(s.user);else{setUserProfile(null);setLoading(false)}});return()=>subscription.unsubscribe()},[]);

  async function loadProfile(au){const{data}=await supabase.from("users").select("*").eq("id",au.id).single();if(data)setUserProfile(data);else{const m=au.user_metadata||{};const p={id:au.id,name:m.name||au.email.split("@")[0],comp_id:m.comp_id||au.email.split("@")[0],email:au.email,role:"user"};await supabase.from("users").upsert(p,{onConflict:"id"});setUserProfile(p)}await Promise.all([loadPrinters(),loadJobs()]);setLoading(false)}
  async function loadPrinters(){const{data}=await supabase.from("printers").select("*").order("id");if(data)setPrinters(data)}
  async function loadJobs(){const{data}=await supabase.from("jobs").select("*").order("created_at",{ascending:false});if(data)setJobs(data)}
  async function loadNotifs(){if(!userProfile)return;const{data}=await supabase.from("notifications").select("*").eq("comp_id",userProfile.comp_id).order("created_at",{ascending:false}).limit(50);if(data)setNotifications(data)}
  useEffect(()=>{if(userProfile)loadNotifs()},[userProfile]);
  useEffect(()=>{if(!session)return;const j=supabase.channel("j").on("postgres_changes",{event:"*",schema:"public",table:"jobs"},()=>loadJobs()).subscribe();const p=supabase.channel("p").on("postgres_changes",{event:"*",schema:"public",table:"printers"},()=>loadPrinters()).subscribe();const n=supabase.channel("n").on("postgres_changes",{event:"*",schema:"public",table:"notifications"},()=>loadNotifs()).subscribe();return()=>{supabase.removeChannel(j);supabase.removeChannel(p);supabase.removeChannel(n)}},[session,userProfile]);

  async function addN(compId,msg,type="info"){await supabase.from("notifications").insert({comp_id:compId,message:msg,type})}

  async function handleJoinQueue({name,compId,email,duration,isOvernight,printName}){
    // Check 2-print limit
    const activeCount=jobs.filter(j=>(j.comp_id===compId)&&(j.status==="reserved"||j.status==="checkedIn")).length;
    if(!isAdmin&&activeCount>=2){showToast("You already have 2 active prints.","error");return}
    const slot=findNextSlot(printers,jobs,duration,isOvernight);if(!slot){showToast("No printers available","error");return}
    let sH=slot.startHour,d=slot.date;if(isOvernight&&sH<17)sH=17;
    // Double-check for conflicts before inserting
    const existing=jobs.filter(j=>j.printer_id===slot.printerId&&j.date===d&&j.status!=="cancelled"&&j.status!=="completed"&&j.status!=="failed");
    const newStart=sH,newEnd=sH+duration;
    const hasConflict=existing.some(j=>{const jS=j.start_hour-BUFFER,jE=j.start_hour+j.duration+BUFFER;return(newStart-BUFFER)<jE&&(newEnd+BUFFER)>jS});
    if(hasConflict){showToast("Slot conflict detected. Please try again.","error");await loadJobs();return}
    const{error}=await supabase.from("jobs").insert({name,comp_id:compId,email,printer_id:slot.printerId,date:d,start_hour:sH,duration,status:"reserved",is_overnight:isOvernight,from_queue:true,print_name:printName});
    if(error){showToast("Error: "+error.message,"error");return}
    await addN(compId,`Assigned to ${slot.printerName} at ${fH(sH)} on ${d}.`,"success");
    showToast(`Assigned to ${slot.printerName} at ${fH(sH)}!`,"success");setPage("checkin");await loadJobs();
  }

  async function handleReserve({name,compId,email,duration,printerId,date,startHour,isOvernight,printName}){
    const activeCount=jobs.filter(j=>(j.comp_id===compId)&&(j.status==="reserved"||j.status==="checkedIn")).length;
    if(!isAdmin&&activeCount>=2){showToast("You have 2 active prints already.","error");return}
    // Conflict check with buffer
    const existing=jobs.filter(j=>j.printer_id===printerId&&j.date===date&&j.status!=="cancelled"&&j.status!=="completed"&&j.status!=="failed");
    const hasConflict=existing.some(j=>{const jS=j.start_hour-BUFFER,jE=j.start_hour+j.duration+BUFFER;return(startHour-BUFFER)<jE&&(startHour+duration+BUFFER)>jS});
    if(hasConflict){showToast("This slot conflicts with an existing reservation.","error");await loadJobs();return}
    const{error}=await supabase.from("jobs").insert({name,comp_id:compId,email,printer_id:printerId,date,start_hour:startHour,duration,status:"reserved",is_overnight:isOvernight,from_queue:false,print_name:printName});
    if(error){showToast("Error: "+error.message,"error");return}
    const pr=printers.find(p=>p.id===printerId);await addN(compId,`Reserved ${pr?.name} at ${fH(startHour)} on ${date}.`,"success");
    showToast(`Reserved ${pr?.name}!`,"success");setPage("checkin");await loadJobs();
  }

  async function handleCheckIn(id){await supabase.from("jobs").update({status:"checkedIn"}).eq("id",id);showToast("Checked in!","success");await loadJobs()}

  function handleCheckOut(id){
    setConfirm({title:"Confirm Check Out",message:"Please do not check out until your print is removed from the printer. Are you sure you're done?",onConfirm:async()=>{
      const job=jobs.find(j=>j.id===id);await supabase.from("jobs").update({status:"completed"}).eq("id",id);showToast("Print completed!","success");setConfirm(null);await loadJobs();
      if(job){const next=jobs.find(j=>j.printer_id===job.printer_id&&j.id!==id&&j.status==="reserved"&&jAS(j)>Date.now());if(next)await addN(next.comp_id,`${printers.find(p=>p.id===job.printer_id)?.name} is now free! Your print is coming up.`,"poke")}
    }});
  }

  async function handleCancel(id){const job=jobs.find(j=>j.id===id);await supabase.from("jobs").update({status:"cancelled"}).eq("id",id);showToast("Removed.","info");await loadJobs();if(job&&(job.status==="reserved"||job.status==="checkedIn")){const next=jobs.find(j=>j.printer_id===job.printer_id&&j.id!==id&&j.status==="reserved"&&jAS(j)>jAS(job));if(next)await addN(next.comp_id,`Slot opened on ${printers.find(p=>p.id===job.printer_id)?.name}.`,"info")}}

  async function handleReportFailure(id){const fj=jobs.find(j=>j.id===id);if(!fj)return;const ft=Date.now(),dMs=Math.min(jAE(fj)-ft,3600000),dH=dMs/3600000;await supabase.from("jobs").update({status:"failed"}).eq("id",id);
    await addN(fj.comp_id,`Your print on ${printers.find(p=>p.id===fj.printer_id)?.name} has been marked as failed.`,"alert");
    const aff=jobs.filter(j=>j.printer_id===fj.printer_id&&j.status==="reserved"&&jAS(j)>=ft);
    for(const j of aff){await supabase.from("jobs").update({start_hour:j.start_hour+dH}).eq("id",j.id);await addN(j.comp_id,`Print delayed ~${fD(dH)} due to failure on ${printers.find(p=>p.id===fj.printer_id)?.name}.`,"alert")}
    showToast(`Failure reported. ${aff.length} job(s) delayed.`,"warning");await loadJobs()}

  async function handleAddPrinter(name){await supabase.from("printers").insert({name,model:"Bambu Lab",online:true});showToast(`${name} added!`,"success");await loadPrinters()}
  async function handleTogglePrinter(id,online){await supabase.from("printers").update({online:!online}).eq("id",id);const pr=printers.find(p=>p.id===id);if(online){const aff=jobs.filter(j=>j.printer_id===id&&(j.status==="reserved"||j.status==="checkedIn"));for(const j of aff)await addN(j.comp_id,`${pr?.name} taken offline. Contact Fablab.`,"alert");showToast(`${pr?.name} offline. ${aff.length} notified.`,"warning")}else showToast(`${pr?.name} online!`,"success");await loadPrinters()}
  async function handleRemovePrinter(id){const pr=printers.find(p=>p.id===id);await supabase.from("printers").delete().eq("id",id);showToast(`${pr?.name} removed.`,"info");await loadPrinters()}
  async function clearNotifs(){if(userProfile){await supabase.from("notifications").delete().eq("comp_id",userProfile.comp_id);setNotifications([])}}
  async function dismissNotif(id){await supabase.from("notifications").delete().eq("id",id);setNotifications(p=>p.filter(n=>n.id!==id))}

  if(loading)return(<div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#f5f4f0"}}><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style><div style={{textAlign:"center"}}><div style={{width:48,height:48,border:"4px solid #eee",borderTopColor:"#d4740e",borderRadius:"50%",animation:"spin 1s linear infinite",margin:"0 auto 16px"}}/><div style={{color:"#888",fontSize:14}}>Loading...</div></div></div>);
  if(!session)return(<><AuthPage onAuth={s=>setSession(s)} showToast={showToast} siteUrl={siteUrl}/>{toast&&<Toast key={toast.key} message={toast.message} type={toast.type} onClose={()=>setToast(null)}/>}</>);
  if(!userProfile)return null;

  const nav=[{key:"home",label:"Home",icon:I.printer},{key:"join",label:"Queue",icon:I.users},{key:"reserve",label:"Reserve",icon:I.cal},{key:"schedule",label:"Schedule",icon:I.cal},{key:"checkin",label:"My Prints",icon:I.check},...(isAdmin?[{key:"admin",label:"Admin",icon:I.settings}]:[])];

  return(<div style={{minHeight:"100vh",background:"#f5f4f0",fontFamily:"'DM Sans',sans-serif"}}>
    <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600;700&display=swap');*{box-sizing:border-box;margin:0;padding:0}@keyframes spin{to{transform:rotate(360deg)}}input:focus,select:focus{border-color:#d4740e!important;box-shadow:0 0 0 3px rgba(212,116,14,0.1)}select{appearance:auto}::-webkit-scrollbar{width:6px;height:6px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#ccc;border-radius:3px}@media(max-width:600px){.hide-mobile{display:none!important}}`}</style>
    <header style={{background:"linear-gradient(135deg,#1a1a2e 0%,#16213e 60%,#0f3460 100%)",padding:"14px 24px",position:"sticky",top:0,zIndex:100,boxShadow:"0 4px 20px rgba(0,0,0,0.15)"}}>
      <div style={{maxWidth:1200,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}} onClick={()=>setPage("home")}><div style={{width:34,height:34,borderRadius:8,background:"#d4740e",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff"}}>{I.printer}</div><div><div style={{fontFamily:"'Playfair Display',serif",color:"#fff",fontSize:16,fontWeight:700,letterSpacing:0.3}}>Fablab 3D Printer Queue</div><div style={{color:"rgba(255,255,255,0.45)",fontSize:10,fontFamily:"'DM Sans',sans-serif"}}>University of Virginia</div></div></div>
        <div style={{display:"flex",alignItems:"center",gap:4}}>
          <nav style={{display:"flex",gap:1}}>{nav.map(i=><button key={i.key} onClick={()=>setPage(i.key)} style={{padding:"7px 13px",borderRadius:7,border:"none",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:500,background:page===i.key?"#d4740e":"transparent",color:page===i.key?"#fff":"rgba(255,255,255,0.65)",display:"flex",alignItems:"center",gap:5,transition:"all .2s",whiteSpace:"nowrap"}} onMouseEnter={e=>{if(page!==i.key)e.currentTarget.style.background="rgba(255,255,255,0.08)"}} onMouseLeave={e=>{if(page!==i.key)e.currentTarget.style.background="transparent"}}>{i.icon}{i.label}</button>)}</nav>
          <div style={{width:1,height:24,background:"rgba(255,255,255,0.15)",margin:"0 6px"}}/>
          <NotifBell notifications={notifications} onClear={clearNotifs} onDismiss={dismissNotif}/>
          <div style={{width:1,height:24,background:"rgba(255,255,255,0.15)",margin:"0 6px"}}/>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{textAlign:"right"}}><div style={{color:"#fff",fontSize:12,fontFamily:"'DM Sans',sans-serif",fontWeight:600}}>{userProfile.name}</div><div style={{color:"rgba(255,255,255,0.5)",fontSize:10}}>{userProfile.comp_id}{isAdmin&&" · Admin"}</div></div>
            <button onClick={async()=>{await supabase.auth.signOut();setSession(null);setUserProfile(null);setPage("home")}} title="Log out" style={{background:"rgba(255,255,255,0.1)",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.7)",padding:7,borderRadius:6,display:"flex",alignItems:"center"}}>{I.logout}</button>
          </div>
        </div>
      </div>
    </header>
    <main style={{maxWidth:1200,margin:"0 auto",padding:"28px 20px"}}>
      {page==="home"&&<HomePage printers={printers} jobs={jobs} onNavigate={setPage}/>}
      {page==="join"&&<JoinQueuePage printers={printers} jobs={jobs} userProfile={userProfile} isAdmin={isAdmin} onJoinQueue={handleJoinQueue} showToast={showToast}/>}
      {page==="reserve"&&<ReservePage printers={printers} jobs={jobs} userProfile={userProfile} isAdmin={isAdmin} onReserve={handleReserve} showToast={showToast}/>}
      {page==="schedule"&&<SchedulePage printers={printers} jobs={jobs} userProfile={userProfile} isAdmin={isAdmin} onCheckIn={handleCheckIn} onCheckOut={handleCheckOut} onCancel={handleCancel} onReportFailure={handleReportFailure}/>}
      {page==="checkin"&&<MyPrintsPage printers={printers} jobs={jobs} userProfile={userProfile} onCheckIn={handleCheckIn} onCheckOut={handleCheckOut} onCancel={handleCancel} onReportFailure={handleReportFailure}/>}
      {page==="admin"&&isAdmin&&<AdminPage printers={printers} jobs={jobs} onAddPrinter={handleAddPrinter} onTogglePrinter={handleTogglePrinter} onRemovePrinter={handleRemovePrinter} showToast={showToast}/>}
      {page==="admin"&&!isAdmin&&<div style={{padding:40,textAlign:"center",color:"#888"}}><h2>Access Denied</h2></div>}
    </main>
    <footer style={{textAlign:"center",padding:"16px",color:"#ccc",fontSize:11,borderTop:"1px solid #e8e8e8",marginTop:32}}>UVA Fablab · Printer Queue System</footer>
    {toast&&<Toast key={toast.key} message={toast.message} type={toast.type} onClose={()=>setToast(null)}/>}
    {confirm&&<ConfirmModal title={confirm.title} message={confirm.message} onConfirm={confirm.onConfirm} onCancel={()=>setConfirm(null)}/>}
  </div>);
}