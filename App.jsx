import { useState, useEffect, useCallback, useRef } from "react";

const API_URL = "https://script.google.com/macros/s/AKfycbx3lOwmMW3Xz40LroT0lLJDA6Z1wfwXTnoJfz0UZn4ZesNxxDvxKVvQMQaA_vZbIlD4/exec";
const FB_PAGE_TOKEN = "EAAWmonGrsnwBQ6ZCY29NF0ahwWFUo4ZBWummXszJeSHdZCSz1SfbKZCjfJctq8mnBcmWuHROZBB6ZABKaTF74tWBIOtmZAV1iJXD1VQ5I3ZAdSv8S0fnAIXVfZC5UUy8K5gDevgDCYZBiuOhZAmLP1Q1nS3atKHKxazlpacJNgBzE6vDltZBh5YcgSgjnx8JsdoW96ttpiemEzWAGCEH7VL8J3NzKgZDZD";

const api = {
  get: (action) => fetch(`${API_URL}?action=${action}`).then(r => r.json()),
  post: (body) => fetch(API_URL, { method: "POST", body: JSON.stringify(body) }).then(r => r.json()),
};

const DEMO = {
  contacts: [
    { sender_id: "1001", name: "Rahim Uddin",   ai_enabled: true,  last_seen: "2 min ago" },
    { sender_id: "1002", name: "Nadia Hossain", ai_enabled: true,  last_seen: "15 min ago" },
    { sender_id: "1003", name: "Karim Sheikh",  ai_enabled: false, last_seen: "1 hr ago" },
    { sender_id: "1004", name: "Fatema Begum",  ai_enabled: true,  last_seen: "2 hr ago" },
  ],
  logs: [
    { timestamp: "10:32 AM", name: "Rahim Uddin",   user_message: "দাম কত?",         ai_reply: "৳৮৫০ থেকে শুরু।", status: "replied" },
    { timestamp: "10:18 AM", name: "Nadia Hossain", user_message: "Delivery কতদিন?", ai_reply: "ঢাকায় ১-২ দিন।", status: "replied" },
    { timestamp: "9:45 AM",  name: "Karim Sheikh",  user_message: "COD আছে?",         ai_reply: null,               status: "pending" },
    { timestamp: "8:30 AM",  name: "Fatema Begum",  user_message: "Size chart দিন।", ai_reply: "S=৩৬, M=৩৮।",    status: "replied" },
  ],
  stats: { total_today: 24, ai_rate: "92%", pending: 2 },
};

const COLORS = [
  ["#667eea","#764ba2"],["#f093fb","#f5576c"],["#4facfe","#00f2fe"],
  ["#43e97b","#38f9d7"],["#fa709a","#fee140"],["#a18cd1","#fbc2eb"],
];
const gradOf = (id) => COLORS[Math.abs(parseInt(id||"0")) % COLORS.length];
const initials = (name) => (name||"?").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  html,body,#root{height:100%;overflow:hidden;}
  body{font-family:'Plus Jakarta Sans',sans-serif;background:#0a0e1a;}
  ::-webkit-scrollbar{width:4px;}
  ::-webkit-scrollbar-thumb{background:#1e2840;border-radius:4px;}
  @keyframes fadeUp{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
  @keyframes slideRight{from{opacity:0;transform:translateX(-6px)}to{opacity:1;transform:translateX(0)}}
  @keyframes slideLeft{from{opacity:0;transform:translateX(6px)}to{opacity:1;transform:translateX(0)}}
  @keyframes glow{0%,100%{box-shadow:0 0 8px #1877f240}50%{box-shadow:0 0 20px #1877f270}}
  .tog{transition:all .25s cubic-bezier(.4,0,.2,1);}
  .ci{transition:background .15s;}
  .ci:hover{background:#0f1830!important;}
  textarea:focus{border-color:#1877f2!important;box-shadow:0 0 0 3px #1877f218!important;outline:none;}
  input:focus{border-color:#1877f255!important;outline:none;}
  .send-btn:active:not(:disabled){transform:scale(.96);}
`;

// ── Shared Toggle Button ──────────────────────────────────
function Toggle({ on, onChange, size = "md" }) {
  const w = size==="sm"?36:size==="lg"?50:44;
  const h = size==="sm"?18:size==="lg"?26:23;
  const d = size==="sm"?12:size==="lg"?20:17;
  return (
    <button className="tog" onClick={onChange}
      style={{width:w,height:h,borderRadius:h/2,border:"none",cursor:"pointer",position:"relative",
        background:on?"linear-gradient(90deg,#1877f2,#00c6ff)":"#1e2840",
        boxShadow:on?`0 0 12px #1877f240`:"none",flexShrink:0}}>
      <div className="tog" style={{width:d,height:d,borderRadius:"50%",background:"#fff",
        position:"absolute",top:(h-d)/2,left:on?w-d-(h-d)/2:(h-d)/2,
        boxShadow:"0 1px 4px #0006"}}/>
    </button>
  );
}

// ── Shared Avatar ─────────────────────────────────────────
function Avatar({ name, sender_id, size=44, showDot=false, aiEnabled=true }) {
  const [c1,c2] = gradOf(sender_id);
  return (
    <div style={{position:"relative",flexShrink:0}}>
      <div style={{width:size,height:size,borderRadius:"50%",
        background:`linear-gradient(135deg,${c1},${c2})`,
        display:"flex",alignItems:"center",justifyContent:"center",
        fontWeight:700,fontSize:size*0.3,color:"#fff",
        boxShadow:`0 3px 12px ${c1}40`}}>
        {initials(name)}
      </div>
      {showDot && (
        <div style={{position:"absolute",bottom:1,right:1,
          width:size*0.26,height:size*0.26,borderRadius:"50%",
          border:`${size*0.05}px solid #0a0e1a`,
          background:aiEnabled?"#00d4aa":"#f74f6a",
          boxShadow:`0 0 6px ${aiEnabled?"#00d4aa80":"#f74f6a80"}`}}/>
      )}
    </div>
  );
}

// ── Message Bubbles ───────────────────────────────────────
function MessageThread({ logs, bottomRef }) {
  return (
    <div style={{flex:1,overflowY:"auto",padding:"16px 14px",display:"flex",flexDirection:"column",gap:10}}>
      {logs.length===0
        ? <div style={{textAlign:"center",color:"#1e2840",marginTop:60,fontSize:13}}>No messages yet</div>
        : logs.map((log,i)=>(
          <div key={i} style={{animation:`fadeUp .25s ease ${i*.03}s both`}}>
            {/* User */}
            <div style={{display:"flex",gap:8,marginBottom:6,animation:"slideRight .2s ease both"}}>
              <Avatar name={log.name} sender_id={log.sender_id||"0"} size={30}/>
              <div style={{maxWidth:"78%"}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                  <span style={{fontSize:11,fontWeight:600,color:"#6a7f9a"}}>{log.name}</span>
                  <span style={{fontSize:10,color:"#1e2840"}}>{log.timestamp}</span>
                  <span style={{fontSize:10,borderRadius:4,padding:"1px 6px",fontWeight:600,
                    background:log.status==="replied"?"#061510":log.status==="manual"?"#060a18":"#160806",
                    color:log.status==="replied"?"#00d4aa":log.status==="manual"?"#a78bfa":"#f7934f"}}>
                    {log.status==="replied"?"✓":log.status==="manual"?"✍":"⏸"}
                  </span>
                </div>
                <div style={{background:"#111828",border:"1px solid #1a2540",
                  borderRadius:"4px 14px 14px 14px",padding:"9px 13px",
                  fontSize:14,color:"#c8d4e8",lineHeight:1.6}}>
                  {log.user_message}
                </div>
              </div>
            </div>
            {/* Reply */}
            {log.ai_reply && (
              <div style={{display:"flex",gap:8,justifyContent:"flex-end",animation:"slideLeft .2s ease both"}}>
                <div style={{maxWidth:"78%",textAlign:"right"}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3,justifyContent:"flex-end"}}>
                    <span style={{fontSize:10,color:"#1e2840"}}>{log.timestamp}</span>
                    <span style={{fontSize:11,fontWeight:600,
                      color:log.status==="manual"?"#a78bfa":"#4f8ef7"}}>
                      {log.status==="manual"?"✍️ You":"🤖 AI"}
                    </span>
                  </div>
                  <div style={{
                    background:log.status==="manual"?"linear-gradient(135deg,#1a0e3c,#130a28)":"linear-gradient(135deg,#0c1e3c,#091628)",
                    border:`1px solid ${log.status==="manual"?"#a78bfa28":"#1877f228"}`,
                    borderRadius:"14px 4px 14px 14px",padding:"9px 13px",
                    fontSize:14,color:"#c8d4f8",lineHeight:1.6,
                    boxShadow:`0 2px 10px ${log.status==="manual"?"#a78bfa15":"#1877f215"}`}}>
                    {log.ai_reply}
                  </div>
                </div>
                <div style={{width:30,height:30,borderRadius:"50%",flexShrink:0,marginTop:2,
                  background:log.status==="manual"?"linear-gradient(135deg,#7c3aed,#a78bfa)":"linear-gradient(135deg,#1877f2,#00c6ff)",
                  display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>
                  {log.status==="manual"?"👤":"🤖"}
                </div>
              </div>
            )}
          </div>
        ))
      }
      <div ref={bottomRef}/>
    </div>
  );
}

// ── Reply Input ───────────────────────────────────────────
function ReplyInput({ selected, replyText, setReplyText, sendReply, sending, sendStatus, mobile=false }) {
  return (
    <div style={{background:"#0b1120",borderTop:"1px solid #141e32",
      padding:mobile?"10px 14px":"12px 20px",flexShrink:0,
      paddingBottom:mobile?"max(10px, env(safe-area-inset-bottom))":"12px"}}>
      {!mobile && (
        <div style={{fontSize:10,color:"#2a3860",marginBottom:7,fontWeight:600,
          textTransform:"uppercase",letterSpacing:"0.08em"}}>
          ✍️ Manual Reply → {selected?.name}
        </div>
      )}
      {sendStatus==="ok"&&<div style={{fontSize:12,color:"#00d4aa",fontWeight:600,marginBottom:6}}>✓ পাঠানো হয়েছে!</div>}
      {sendStatus==="error"&&<div style={{fontSize:12,color:"#f74f6a",fontWeight:600,marginBottom:6}}>✗ Error! Token চেক করো।</div>}
      <div style={{display:"flex",gap:10,alignItems:"flex-end"}}>
        <textarea value={replyText} onChange={e=>setReplyText(e.target.value)}
          onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendReply();}}}
          placeholder={mobile?"Reply করো...":"Message লিখো...  (Enter = send)"}
          rows={mobile?1:2}
          style={{flex:1,background:"#141e32",border:"1px solid #1e2840",
            borderRadius:mobile?22:10,padding:mobile?"10px 16px":"9px 13px",
            color:"#dde1f0",fontSize:14,outline:"none",resize:"none",
            lineHeight:1.5,fontFamily:"inherit",maxHeight:100}}/>
        <button className="send-btn" onClick={sendReply} disabled={sending||!replyText.trim()}
          style={mobile
            ? {width:44,height:44,borderRadius:"50%",border:"none",flexShrink:0,fontSize:18,
               background:sending||!replyText.trim()?"#141e32":"linear-gradient(135deg,#1877f2,#00c6ff)",
               cursor:sending||!replyText.trim()?"not-allowed":"pointer",
               display:"flex",alignItems:"center",justifyContent:"center",
               boxShadow:!sending&&replyText.trim()?"0 3px 12px #1877f240":"none",transition:"all .2s"}
            : {height:50,padding:"0 20px",borderRadius:10,border:`1px solid ${sending||!replyText.trim()?"#1a2540":"transparent"}`,
               background:sending||!replyText.trim()?"#0b1525":"linear-gradient(135deg,#1877f2,#00c6ff)",
               color:sending||!replyText.trim()?"#2a3860":"#fff",
               cursor:sending||!replyText.trim()?"not-allowed":"pointer",
               fontSize:13,fontWeight:700,whiteSpace:"nowrap",fontFamily:"inherit",transition:"all .2s"}}>
          {mobile ? (sending?"⏳":"➤") : (sending?"...":"Send →")}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
export default function App() {
  const [contacts,   setContacts]   = useState([]);
  const [logs,       setLogs]       = useState([]);
  const [stats,      setStats]      = useState({});
  const [globalAI,   setGlobalAI]   = useState(true);
  const [selected,   setSelected]   = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [apiMode,    setApiMode]    = useState(false);
  const [syncing,    setSyncing]    = useState(false);
  const [lastSync,   setLastSync]   = useState(null);
  const [replyText,  setReplyText]  = useState("");
  const [sending,    setSending]    = useState(false);
  const [sendStatus, setSendStatus] = useState(null);
  const [search,     setSearch]     = useState("");
  const [mobileView, setMobileView] = useState("list");
  const [isMobile,   setIsMobile]   = useState(window.innerWidth < 768);
  const bottomRef = useRef(null);

  // Responsive detection
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const loadData = useCallback(async () => {
    if (!apiMode) {
      setContacts(DEMO.contacts); setLogs(DEMO.logs); setStats(DEMO.stats);
      setGlobalAI(true); setSelected(s=>s||DEMO.contacts[0]); setLoading(false); return;
    }
    try {
      setSyncing(true);
      const [cR,lR,stR,saR] = await Promise.all([
        api.get("contacts"),api.get("logs"),api.get("settings"),api.get("stats"),
      ]);
      setContacts(cR.contacts||[]); setLogs(lR.logs||[]);
      setGlobalAI(stR.settings?.global_ai==="TRUE"); setStats(saR.stats||{});
      setSelected(s=>s||cR.contacts?.[0]);
      setLastSync(new Date().toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"}));
    } catch(e){console.error(e);}
    finally{setSyncing(false);setLoading(false);}
  }, [apiMode]);

  useEffect(() => { loadData(); const t=setInterval(loadData,30000); return ()=>clearInterval(t); }, [loadData]);

  const filteredContacts = contacts.filter(c=>c.name?.toLowerCase().includes(search.toLowerCase()));
  const selectedLogs = logs
    .filter(l=>!selected||l.name===selected.name||l.sender_id===selected.sender_id)
    .slice().reverse();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({behavior:"smooth"});
  }, [selectedLogs.length]);

  const toggleContact = async (sender_id, name) => {
    const c = contacts.find(x=>x.sender_id===sender_id);
    const nv = !c.ai_enabled;
    setContacts(p=>p.map(x=>x.sender_id===sender_id?{...x,ai_enabled:nv}:x));
    setSelected(s=>s?.sender_id===sender_id?{...s,ai_enabled:nv}:s);
    if (apiMode) await api.post({action:"toggle_contact",sender_id,name,ai_enabled:nv});
  };

  const toggleGlobal = async () => {
    const nv=!globalAI; setGlobalAI(nv);
    if (apiMode) await api.post({action:"toggle_global",enabled:nv});
  };

  const sendReply = async () => {
    if (!replyText.trim()||!selected||sending) return;
    const txt=replyText;
    const now=new Date().toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"});
    const entry={timestamp:now,name:selected.name,sender_id:selected.sender_id,
      user_message:"— (manual)",ai_reply:txt,status:"manual"};
    setLogs(p=>[entry,...p]); setReplyText(""); setSending(true); setSendStatus(null);
    try {
      const res=await fetch(
        `https://graph.facebook.com/v18.0/me/messages?access_token=${FB_PAGE_TOKEN}`,
        {method:"POST",headers:{"Content-Type":"application/json"},
          body:JSON.stringify({recipient:{id:selected.sender_id},message:{text:txt}})}
      );
      if(res.ok){setSendStatus("ok");setTimeout(()=>setSendStatus(null),3000);}
      else{setSendStatus("error");setLogs(p=>p.filter(l=>l!==entry));setReplyText(txt);}
    } catch{setSendStatus("error");setLogs(p=>p.filter(l=>l!==entry));setReplyText(txt);}
    finally{setSending(false);}
  };

  // Shared topbar buttons
  const TopBarRight = () => (
    <div style={{display:"flex",alignItems:"center",gap:10}}>
      <button onClick={()=>setApiMode(v=>!v)} style={{background:apiMode?"#061510":"#100610",
        border:`1px solid ${apiMode?"#00d4aa40":"#f74f6a40"}`,borderRadius:16,
        padding:"4px 10px",fontSize:11,color:apiMode?"#00d4aa":"#f74f6a",cursor:"pointer",
        fontFamily:"inherit",fontWeight:600,display:"flex",alignItems:"center",gap:5}}>
        <span style={{width:5,height:5,borderRadius:"50%",display:"inline-block",
          background:apiMode?"#00d4aa":"#f74f6a"}}/>
        {apiMode?"Live":"Demo"}
      </button>
      <div style={{display:"flex",alignItems:"center",gap:7}}>
        <span style={{fontSize:11,color:"#4a5f80",fontWeight:500}}>AI</span>
        <Toggle on={globalAI} onChange={toggleGlobal} size={isMobile?"sm":"md"}/>
        <div style={{width:7,height:7,borderRadius:"50%",
          background:globalAI?"#00d4aa":"#f74f6a",
          boxShadow:`0 0 8px ${globalAI?"#00d4aa":"#f74f6a"}`}}/>
      </div>
    </div>
  );

  if (loading) return (
    <div style={{background:"#0a0e1a",height:"100%",display:"flex",alignItems:"center",
      justifyContent:"center",fontFamily:"'Plus Jakarta Sans',sans-serif",color:"#2a3860",fontSize:13}}>
      <style>{STYLES}</style>Loading...
    </div>
  );

  const [g1,g2] = selected ? gradOf(selected.sender_id) : ["#1877f2","#00c6ff"];

  // ══════════════════════════════════════════════════════════
  // MOBILE LAYOUT
  // ══════════════════════════════════════════════════════════
  if (isMobile) {
    if (mobileView==="chat" && selected) return (
      <div style={{height:"100%",display:"flex",flexDirection:"column",background:"#06080e",
        fontFamily:"'Plus Jakarta Sans',sans-serif",color:"#dde1f0"}}>
        <style>{STYLES}</style>
        <div style={{background:"#0b1120",borderBottom:"1px solid #141e32",padding:"10px 16px",
          paddingTop:"max(10px,env(safe-area-inset-top))",
          display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
          <button onClick={()=>setMobileView("list")} style={{background:"none",border:"none",
            color:"#4f8ef7",cursor:"pointer",fontSize:22,padding:"0 8px 0 0",lineHeight:1}}>‹</button>
          <Avatar name={selected.name} sender_id={selected.sender_id} size={40} showDot aiEnabled={selected.ai_enabled}/>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:700,fontSize:15,color:"#fff",overflow:"hidden",
              textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{selected.name}</div>
            <div style={{fontSize:11,fontWeight:600,color:selected.ai_enabled?"#00d4aa":"#f74f6a"}}>
              {selected.ai_enabled?"🤖 AI Active":"⏸ AI Paused"}
            </div>
          </div>
          <Toggle on={selected.ai_enabled} onChange={()=>toggleContact(selected.sender_id,selected.name)} size="md"/>
        </div>
        <MessageThread logs={selectedLogs} bottomRef={bottomRef}/>
        <ReplyInput selected={selected} replyText={replyText} setReplyText={setReplyText}
          sendReply={sendReply} sending={sending} sendStatus={sendStatus} mobile/>
      </div>
    );

    return (
      <div style={{height:"100%",display:"flex",flexDirection:"column",background:"#0a0e1a",
        fontFamily:"'Plus Jakarta Sans',sans-serif",color:"#dde1f0"}}>
        <style>{STYLES}</style>
        <div style={{background:"#0b1120",borderBottom:"1px solid #141e32",padding:"12px 16px",
          paddingTop:"max(12px,env(safe-area-inset-top))",flexShrink:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:32,height:32,borderRadius:9,fontSize:15,animation:"glow 3s infinite",
                background:"linear-gradient(135deg,#1877f2,#00c6ff)",
                display:"flex",alignItems:"center",justifyContent:"center"}}>💬</div>
              <div>
                <div style={{fontWeight:800,fontSize:15,color:"#fff"}}>Messenger AI</div>
                <div style={{fontSize:10,color:"#2a3860",textTransform:"uppercase",letterSpacing:"0.07em"}}>
                  {syncing?"syncing...":lastSync?`synced ${lastSync}`:"Control Center"}
                </div>
              </div>
            </div>
            <TopBarRight/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:10}}>
            {[
              {label:"মেসেজ",value:stats.total_today??"0",color:"#4f8ef7"},
              {label:"AI Rate",value:stats.ai_rate??"0%",color:"#00d4aa"},
              {label:"Pending",value:stats.pending??"0",color:"#f7934f"},
            ].map(s=>(
              <div key={s.label} style={{background:"#0e1525",borderRadius:10,padding:"8px 12px",border:"1px solid #141e32"}}>
                <div style={{fontSize:18,fontWeight:800,color:s.color,lineHeight:1}}>{s.value}</div>
                <div style={{fontSize:10,color:"#2a3860",marginTop:2,fontWeight:500}}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{position:"relative"}}>
            <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",fontSize:13,color:"#2a3860"}}>🔍</span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..."
              style={{width:"100%",background:"#0e1525",border:"1px solid #141e32",borderRadius:22,
                padding:"9px 14px 9px 34px",color:"#dde1f0",fontSize:13,fontFamily:"inherit"}}/>
          </div>
        </div>
        <div style={{flex:1,overflowY:"auto"}}>
          {filteredContacts.map((c,i)=>{
            const lastMsg=logs.filter(l=>l.name===c.name||l.sender_id===c.sender_id)[0];
            return (
              <div key={c.sender_id} className="ci" onClick={()=>{setSelected(c);setMobileView("chat");}}
                style={{padding:"12px 16px",borderBottom:"1px solid #0d1220",cursor:"pointer",
                  display:"flex",alignItems:"center",gap:12,animation:`fadeUp .3s ease ${i*.05}s both`}}>
                <Avatar name={c.name} sender_id={c.sender_id} size={48} showDot aiEnabled={c.ai_enabled}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                    <span style={{fontSize:15,fontWeight:700,color:"#fff",overflow:"hidden",
                      textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</span>
                    <span style={{fontSize:11,color:"#2a3860",flexShrink:0,marginLeft:8}}>{c.last_seen}</span>
                  </div>
                  <div style={{fontSize:12,color:"#4a5f80",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                    {lastMsg?(lastMsg.ai_reply?`🤖 ${lastMsg.ai_reply}`:`👤 ${lastMsg.user_message}`):"No messages yet"}
                  </div>
                </div>
                <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:5,flexShrink:0}}>
                  <Toggle on={c.ai_enabled} onChange={e=>{if(e&&e.stopPropagation)e.stopPropagation();toggleContact(c.sender_id,c.name);}} size="sm"/>
                  <span style={{fontSize:10,fontWeight:600,color:c.ai_enabled?"#00d4aa":"#f74f6a"}}>
                    {c.ai_enabled?"ON":"OFF"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════
  // DESKTOP LAYOUT
  // ══════════════════════════════════════════════════════════
  return (
    <div style={{height:"100%",display:"flex",flexDirection:"column",background:"#070b14",
      fontFamily:"'Plus Jakarta Sans',sans-serif",color:"#dde1f0"}}>
      <style>{STYLES}</style>

      {/* Topbar */}
      <div style={{background:"#0b1120",borderBottom:"1px solid #141e32",padding:"0 24px",
        display:"flex",alignItems:"center",justifyContent:"space-between",height:54,flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:34,height:34,borderRadius:10,fontSize:16,animation:"glow 3s infinite",
            background:"linear-gradient(135deg,#1877f2,#00c6ff)",
            display:"flex",alignItems:"center",justifyContent:"center"}}>💬</div>
          <div>
            <div style={{fontWeight:800,fontSize:14,color:"#fff"}}>Messenger AI</div>
            <div style={{fontSize:10,color:"#2a3860",textTransform:"uppercase",letterSpacing:"0.08em"}}>
              {syncing?"syncing...":lastSync?`synced ${lastSync}`:"Control Center"}
            </div>
          </div>
        </div>
        <TopBarRight/>
      </div>

      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",borderBottom:"1px solid #141e32",flexShrink:0}}>
        {[
          {label:"আজকের মেসেজ",value:stats.total_today??"—",icon:"📨",color:"#4f8ef7"},
          {label:"AI Handled",  value:stats.ai_rate??"—",   icon:"🤖",color:"#00d4aa"},
          {label:"Pending",     value:stats.pending??"—",   icon:"⏳",color:"#f7934f"},
          {label:"Last Sync",   value:lastSync??"Demo",      icon:"🔄",color:"#a78bfa"},
        ].map((s,i)=>(
          <div key={s.label} style={{background:"#090e1a",padding:"13px 20px",
            borderRight:i<3?"1px solid #141e32":"none",display:"flex",alignItems:"center",gap:12,
            animation:`fadeUp .4s ease ${i*.07}s both`}}>
            <div style={{width:36,height:36,borderRadius:10,background:`${s.color}18`,
              border:`1px solid ${s.color}28`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>
              {s.icon}
            </div>
            <div>
              <div style={{fontSize:20,fontWeight:800,color:s.color,lineHeight:1}}>{s.value}</div>
              <div style={{fontSize:11,color:"#2a3860",marginTop:3,fontWeight:500}}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Body */}
      <div style={{display:"flex",flex:1,overflow:"hidden"}}>
        {/* Sidebar */}
        <div style={{width:268,background:"#07090f",borderRight:"1px solid #141e32",
          display:"flex",flexDirection:"column",flexShrink:0}}>
          <div style={{padding:"10px 12px",borderBottom:"1px solid #141e32"}}>
            <div style={{position:"relative"}}>
              <span style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",fontSize:12,color:"#2a3860"}}>🔍</span>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..."
                style={{width:"100%",background:"#0b1120",border:"1px solid #141e32",borderRadius:8,
                  padding:"7px 10px 7px 28px",color:"#dde1f0",fontSize:12,fontFamily:"inherit"}}/>
            </div>
          </div>
          <div style={{overflowY:"auto",flex:1}}>
            {filteredContacts.map((c,i)=>{
              const on=selected?.sender_id===c.sender_id;
              const lastMsg=logs.filter(l=>l.name===c.name||l.sender_id===c.sender_id)[0];
              return (
                <div key={c.sender_id} className="ci" onClick={()=>setSelected(c)}
                  style={{padding:"10px 12px",cursor:"pointer",borderBottom:"1px solid #0d1220",
                    borderLeft:`2px solid ${on?"#1877f2":"transparent"}`,
                    background:on?"#0e1525":"transparent",
                    animation:`fadeUp .3s ease ${i*.04}s both`}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <Avatar name={c.name} sender_id={c.sender_id} size={38} showDot aiEnabled={c.ai_enabled}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <span style={{fontSize:12,fontWeight:600,overflow:"hidden",
                          textOverflow:"ellipsis",whiteSpace:"nowrap",
                          color:on?"#fff":"#b0bcd8"}}>{c.name}</span>
                        <span style={{fontSize:10,color:"#2a3860",flexShrink:0,marginLeft:4}}>{c.last_seen}</span>
                      </div>
                      <div style={{fontSize:11,color:"#3a4f6a",overflow:"hidden",
                        textOverflow:"ellipsis",whiteSpace:"nowrap",marginTop:2}}>
                        {lastMsg?(lastMsg.ai_reply?`🤖 ${lastMsg.ai_reply}`:`👤 ${lastMsg.user_message}`):"No messages"}
                      </div>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4,flexShrink:0}}>
                      <Toggle on={c.ai_enabled} onChange={()=>toggleContact(c.sender_id,c.name)} size="sm"/>
                      <span style={{fontSize:9,fontWeight:600,color:c.ai_enabled?"#00d4aa":"#f74f6a"}}>
                        {c.ai_enabled?"AI ON":"AI OFF"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Main */}
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:"#06080e"}}>
          {selected ? (
            <>
              <div style={{padding:"13px 22px",borderBottom:"1px solid #141e32",background:"#0b1120",
                display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <Avatar name={selected.name} sender_id={selected.sender_id} size={42}/>
                  <div>
                    <div style={{fontWeight:700,fontSize:14,color:"#fff"}}>{selected.name}</div>
                    <div style={{fontSize:10,color:"#2a3860",fontFamily:"'JetBrains Mono',monospace",marginTop:1}}>
                      {selected.sender_id}
                    </div>
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:10,color:"#2a3860",marginBottom:2}}>AI Reply</div>
                    <div style={{fontSize:12,fontWeight:700,color:selected.ai_enabled?"#00d4aa":"#f74f6a"}}>
                      {selected.ai_enabled?"● Active":"○ Paused"}
                    </div>
                  </div>
                  <Toggle on={selected.ai_enabled} onChange={()=>toggleContact(selected.sender_id,selected.name)} size="lg"/>
                </div>
              </div>
              <MessageThread logs={selectedLogs} bottomRef={bottomRef}/>
              <ReplyInput selected={selected} replyText={replyText} setReplyText={setReplyText}
                sendReply={sendReply} sending={sending} sendStatus={sendStatus} mobile={false}/>
            </>
          ) : (
            <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",
              color:"#1e2840",fontSize:13}}>কোনো contact সিলেক্ট করো</div>
          )}
        </div>
      </div>
    </div>
  );
}
