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
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  html,body,#root{height:100%;overflow:hidden;}
  body{font-family:'Plus Jakarta Sans',sans-serif;background:#0a0e1a;}
  ::-webkit-scrollbar{width:3px;}
  ::-webkit-scrollbar-thumb{background:#1e2840;border-radius:4px;}
  @keyframes fadeUp{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
  @keyframes slideRight{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:translateX(0)}}
  @keyframes slideLeft{from{opacity:0;transform:translateX(8px)}to{opacity:1;transform:translateX(0)}}
  @keyframes glow{0%,100%{opacity:.6}50%{opacity:1}}
  .tog{transition:all .25s cubic-bezier(.4,0,.2,1);}
  .ci{transition:background .15s;}
  .ci:hover{background:#0f1830!important;}
  .ci:active{background:#141e35!important;}
  .send-btn:active:not(:disabled){transform:scale(.97);}
`;

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
  const [view,       setView]       = useState("list"); // "list" | "chat"
  const bottomRef = useRef(null);

  const loadData = useCallback(async () => {
    if (!apiMode) {
      setContacts(DEMO.contacts);
      setLogs(DEMO.logs);
      setStats(DEMO.stats);
      setGlobalAI(true);
      setSelected(s => s || DEMO.contacts[0]);
      setLoading(false);
      return;
    }
    try {
      setSyncing(true);
      const [cR,lR,stR,saR] = await Promise.all([
        api.get("contacts"),api.get("logs"),api.get("settings"),api.get("stats"),
      ]);
      setContacts(cR.contacts||[]);
      setLogs(lR.logs||[]);
      setGlobalAI(stR.settings?.global_ai==="TRUE");
      setStats(saR.stats||{});
      setSelected(s => s || cR.contacts?.[0]);
      setLastSync(new Date().toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"}));
    } catch(e){console.error(e);}
    finally{setSyncing(false);setLoading(false);}
  }, [apiMode]);

  useEffect(() => {
    loadData();
    const t = setInterval(loadData, 30000);
    return () => clearInterval(t);
  }, [loadData]);

  const filteredContacts = contacts.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase())
  );

  const selectedLogs = logs
    .filter(l => !selected || l.name===selected.name || l.sender_id===selected.sender_id)
    .slice().reverse();

  useEffect(() => {
    if (view === "chat") bottomRef.current?.scrollIntoView({behavior:"smooth"});
  }, [selectedLogs.length, view]);

  const toggleContact = async (sender_id, name) => {
    const c = contacts.find(x => x.sender_id===sender_id);
    const nv = !c.ai_enabled;
    setContacts(p => p.map(x => x.sender_id===sender_id?{...x,ai_enabled:nv}:x));
    setSelected(s => s?.sender_id===sender_id?{...s,ai_enabled:nv}:s);
    if (apiMode) await api.post({action:"toggle_contact",sender_id,name,ai_enabled:nv});
  };

  const toggleGlobal = async () => {
    const nv = !globalAI;
    setGlobalAI(nv);
    if (apiMode) await api.post({action:"toggle_global",enabled:nv});
  };

  const sendReply = async () => {
    if (!replyText.trim()||!selected||sending) return;
    const txt = replyText;
    const now = new Date().toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"});
    const entry = {timestamp:now,name:selected.name,sender_id:selected.sender_id,
      user_message:"— (manual)",ai_reply:txt,status:"manual"};
    setLogs(p => [entry,...p]);
    setReplyText("");
    setSending(true); setSendStatus(null);
    try {
      const res = await fetch(
        `https://graph.facebook.com/v18.0/me/messages?access_token=${FB_PAGE_TOKEN}`,
        {method:"POST",headers:{"Content-Type":"application/json"},
          body:JSON.stringify({recipient:{id:selected.sender_id},message:{text:txt}})}
      );
      if (res.ok) { setSendStatus("ok"); setTimeout(()=>setSendStatus(null),3000); }
      else { setSendStatus("error"); setLogs(p=>p.filter(l=>l!==entry)); setReplyText(txt); }
    } catch {
      setSendStatus("error"); setLogs(p=>p.filter(l=>l!==entry)); setReplyText(txt);
    } finally { setSending(false); }
  };

  const openChat = (c) => { setSelected(c); setView("chat"); };

  if (loading) return (
    <div style={{background:"#0a0e1a",height:"100%",display:"flex",alignItems:"center",
      justifyContent:"center",fontFamily:"'Plus Jakarta Sans',sans-serif",color:"#2a3860",fontSize:13}}>
      <style>{STYLES}</style>
      Loading...
    </div>
  );

  const [g1,g2] = selected ? gradOf(selected.sender_id) : ["#1877f2","#00c6ff"];

  // ── CHAT VIEW ──────────────────────────────────────────────
  if (view === "chat" && selected) return (
    <div style={{height:"100%",display:"flex",flexDirection:"column",background:"#06080e",
      fontFamily:"'Plus Jakarta Sans',sans-serif",color:"#dde1f0"}}>
      <style>{STYLES}</style>

      {/* Chat header */}
      <div style={{background:"#0b1120",borderBottom:"1px solid #141e32",padding:"10px 16px",
        display:"flex",alignItems:"center",gap:12,flexShrink:0,
        paddingTop:"max(10px, env(safe-area-inset-top))"}}>
        <button onClick={()=>setView("list")} style={{background:"none",border:"none",
          color:"#4f8ef7",cursor:"pointer",fontSize:20,padding:"4px 8px 4px 0",lineHeight:1}}>
          ‹
        </button>
        <div style={{width:40,height:40,borderRadius:"50%",flexShrink:0,
          background:`linear-gradient(135deg,${g1},${g2})`,
          display:"flex",alignItems:"center",justifyContent:"center",
          fontWeight:700,fontSize:14,color:"#fff",boxShadow:`0 3px 12px ${g1}50`}}>
          {initials(selected.name)}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:700,fontSize:15,color:"#fff",
            overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
            {selected.name}
          </div>
          <div style={{fontSize:11,color:selected.ai_enabled?"#00d4aa":"#f74f6a",fontWeight:600}}>
            {selected.ai_enabled?"🤖 AI Active":"⏸ AI Paused"}
          </div>
        </div>
        {/* AI toggle */}
        <button className="tog" onClick={()=>toggleContact(selected.sender_id,selected.name)}
          style={{width:46,height:24,borderRadius:12,border:"none",cursor:"pointer",position:"relative",
            background:selected.ai_enabled?"linear-gradient(90deg,#1877f2,#00c6ff)":"#1e2840",
            boxShadow:selected.ai_enabled?"0 0 12px #1877f240":"none",flexShrink:0}}>
          <div className="tog" style={{width:18,height:18,borderRadius:"50%",background:"#fff",
            position:"absolute",top:3,left:selected.ai_enabled?25:3,boxShadow:"0 1px 4px #0006"}}/>
        </button>
      </div>

      {/* Messages */}
      <div style={{flex:1,overflowY:"auto",padding:"16px 14px",display:"flex",flexDirection:"column",gap:12}}>
        {selectedLogs.length===0
          ? <div style={{textAlign:"center",color:"#1e2840",marginTop:60,fontSize:13}}>No messages yet</div>
          : selectedLogs.map((log,i)=>(
            <div key={i} style={{animation:`fadeUp .25s ease ${i*.03}s both`}}>
              {/* User message */}
              <div style={{display:"flex",gap:8,marginBottom:6,animation:"slideRight .25s ease both"}}>
                <div style={{width:30,height:30,borderRadius:"50%",flexShrink:0,
                  background:"#141e32",border:"1px solid #1e2840",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:10,fontWeight:700,color:"#4a5f80",marginTop:2}}>
                  {initials(log.name)}
                </div>
                <div style={{maxWidth:"78%"}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                    <span style={{fontSize:11,fontWeight:600,color:"#6a7f9a"}}>{log.name}</span>
                    <span style={{fontSize:10,color:"#1e2840"}}>{log.timestamp}</span>
                  </div>
                  <div style={{background:"#111828",border:"1px solid #1a2540",
                    borderRadius:"4px 16px 16px 16px",padding:"10px 14px",
                    fontSize:14,color:"#c8d4e8",lineHeight:1.6}}>
                    {log.user_message}
                  </div>
                </div>
              </div>

              {/* AI / manual reply */}
              {log.ai_reply && (
                <div style={{display:"flex",gap:8,justifyContent:"flex-end",
                  animation:"slideLeft .25s ease both"}}>
                  <div style={{maxWidth:"78%"}}>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4,justifyContent:"flex-end"}}>
                      <span style={{fontSize:10,color:"#1e2840"}}>{log.timestamp}</span>
                      <span style={{fontSize:11,fontWeight:600,
                        color:log.status==="manual"?"#a78bfa":"#4f8ef7"}}>
                        {log.status==="manual"?"✍️ You":"🤖 AI"}
                      </span>
                    </div>
                    <div style={{
                      background:log.status==="manual"
                        ?"linear-gradient(135deg,#1a0e3c,#130a28)"
                        :"linear-gradient(135deg,#0c1e3c,#091628)",
                      border:`1px solid ${log.status==="manual"?"#a78bfa28":"#1877f228"}`,
                      borderRadius:"16px 4px 16px 16px",padding:"10px 14px",
                      fontSize:14,color:"#c8d4f8",lineHeight:1.6,
                      boxShadow:`0 2px 12px ${log.status==="manual"?"#a78bfa15":"#1877f215"}`}}>
                      {log.ai_reply}
                    </div>
                  </div>
                  <div style={{width:30,height:30,borderRadius:"50%",flexShrink:0,marginTop:2,
                    background:log.status==="manual"
                      ?"linear-gradient(135deg,#7c3aed,#a78bfa)"
                      :"linear-gradient(135deg,#1877f2,#00c6ff)",
                    display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,
                    boxShadow:`0 2px 8px ${log.status==="manual"?"#7c3aed40":"#1877f240"}`}}>
                    {log.status==="manual"?"👤":"🤖"}
                  </div>
                </div>
              )}
            </div>
          ))
        }
        <div ref={bottomRef}/>
      </div>

      {/* Reply box */}
      <div style={{background:"#0b1120",borderTop:"1px solid #141e32",padding:"10px 14px",
        flexShrink:0,paddingBottom:"max(10px, env(safe-area-inset-bottom))"}}>
        {sendStatus==="ok" && (
          <div style={{fontSize:12,color:"#00d4aa",fontWeight:600,marginBottom:6,
            animation:"fadeUp .3s ease"}}>✓ পাঠানো হয়েছে!</div>
        )}
        {sendStatus==="error" && (
          <div style={{fontSize:12,color:"#f74f6a",fontWeight:600,marginBottom:6}}>
            ✗ Error! Token চেক করো।
          </div>
        )}
        <div style={{display:"flex",gap:10,alignItems:"flex-end"}}>
          <textarea value={replyText} onChange={e=>setReplyText(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendReply();}}}
            placeholder="Reply করো..."
            rows={1}
            style={{flex:1,background:"#141e32",border:"1px solid #1e2840",borderRadius:22,
              padding:"10px 16px",color:"#dde1f0",fontSize:14,outline:"none",resize:"none",
              lineHeight:1.5,fontFamily:"inherit",maxHeight:100,
              transition:"border-color .2s,box-shadow .2s"}}/>
          <button className="send-btn" onClick={sendReply} disabled={sending||!replyText.trim()}
            style={{width:44,height:44,borderRadius:"50%",border:"none",flexShrink:0,
              background:sending||!replyText.trim()?"#141e32":"linear-gradient(135deg,#1877f2,#00c6ff)",
              cursor:sending||!replyText.trim()?"not-allowed":"pointer",
              fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",
              boxShadow:!sending&&replyText.trim()?"0 3px 12px #1877f240":"none",
              transition:"all .2s"}}>
            {sending ? "⏳" : "➤"}
          </button>
        </div>
      </div>
    </div>
  );

  // ── LIST VIEW ──────────────────────────────────────────────
  return (
    <div style={{height:"100%",display:"flex",flexDirection:"column",background:"#0a0e1a",
      fontFamily:"'Plus Jakarta Sans',sans-serif",color:"#dde1f0"}}>
      <style>{STYLES}</style>

      {/* Header */}
      <div style={{background:"#0b1120",borderBottom:"1px solid #141e32",
        padding:"12px 16px",flexShrink:0,
        paddingTop:"max(12px, env(safe-area-inset-top))"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:32,height:32,borderRadius:9,
              background:"linear-gradient(135deg,#1877f2,#00c6ff)",
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>💬</div>
            <div>
              <div style={{fontWeight:800,fontSize:15,color:"#fff"}}>Messenger AI</div>
              <div style={{fontSize:10,color:"#2a3860",textTransform:"uppercase",letterSpacing:"0.07em"}}>
                {syncing?"syncing...":lastSync?`synced ${lastSync}`:"Control Center"}
              </div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <button onClick={()=>setApiMode(v=>!v)} style={{background:apiMode?"#061510":"#100610",
              border:`1px solid ${apiMode?"#00d4aa40":"#f74f6a40"}`,borderRadius:16,
              padding:"4px 10px",fontSize:11,color:apiMode?"#00d4aa":"#f74f6a",cursor:"pointer",
              fontFamily:"inherit",fontWeight:600,display:"flex",alignItems:"center",gap:5}}>
              <span style={{width:5,height:5,borderRadius:"50%",display:"inline-block",
                background:apiMode?"#00d4aa":"#f74f6a"}}/>
              {apiMode?"Live":"Demo"}
            </button>
            {/* Global AI toggle */}
            <div style={{display:"flex",alignItems:"center",gap:7}}>
              <span style={{fontSize:11,color:"#4a5f80"}}>AI</span>
              <button className="tog" onClick={toggleGlobal}
                style={{width:40,height:21,borderRadius:11,border:"none",cursor:"pointer",
                  position:"relative",
                  background:globalAI?"linear-gradient(90deg,#1877f2,#00c6ff)":"#1e2840",
                  boxShadow:globalAI?"0 0 10px #1877f240":"none"}}>
                <div className="tog" style={{width:15,height:15,borderRadius:"50%",background:"#fff",
                  position:"absolute",top:3,left:globalAI?22:3,boxShadow:"0 1px 4px #0006"}}/>
              </button>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
          {[
            {label:"মেসেজ", value:stats.total_today??"0", color:"#4f8ef7"},
            {label:"AI Rate", value:stats.ai_rate??"0%",  color:"#00d4aa"},
            {label:"Pending", value:stats.pending??"0",   color:"#f7934f"},
          ].map(s=>(
            <div key={s.label} style={{background:"#0e1525",borderRadius:10,padding:"8px 12px",
              border:"1px solid #141e32"}}>
              <div style={{fontSize:18,fontWeight:800,color:s.color,lineHeight:1}}>{s.value}</div>
              <div style={{fontSize:10,color:"#2a3860",marginTop:2,fontWeight:500}}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div style={{position:"relative",marginTop:10}}>
          <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",
            fontSize:13,color:"#2a3860"}}>🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Search contacts..."
            style={{width:"100%",background:"#0e1525",border:"1px solid #141e32",borderRadius:22,
              padding:"9px 14px 9px 34px",color:"#dde1f0",fontSize:13,fontFamily:"inherit"}}/>
        </div>
      </div>

      {/* Contact list */}
      <div style={{flex:1,overflowY:"auto"}}>
        {filteredContacts.map((c,i)=>{
          const [c1,c2]=gradOf(c.sender_id);
          const lastMsg = logs.filter(l=>l.name===c.name||l.sender_id===c.sender_id)[0];
          return (
            <div key={c.sender_id} className="ci" onClick={()=>openChat(c)}
              style={{padding:"12px 16px",borderBottom:"1px solid #0d1220",cursor:"pointer",
                display:"flex",alignItems:"center",gap:12,
                animation:`fadeUp .3s ease ${i*.05}s both`}}>
              <div style={{position:"relative",flexShrink:0}}>
                <div style={{width:48,height:48,borderRadius:"50%",
                  background:`linear-gradient(135deg,${c1},${c2})`,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontWeight:700,fontSize:16,color:"#fff",
                  boxShadow:`0 3px 12px ${c1}40`}}>
                  {initials(c.name)}
                </div>
                <div style={{position:"absolute",bottom:1,right:1,width:12,height:12,
                  borderRadius:"50%",border:"2px solid #0a0e1a",
                  background:c.ai_enabled?"#00d4aa":"#f74f6a",
                  boxShadow:`0 0 6px ${c.ai_enabled?"#00d4aa80":"#f74f6a80"}`}}/>
              </div>

              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                  <span style={{fontSize:15,fontWeight:700,color:"#fff",
                    overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</span>
                  <span style={{fontSize:11,color:"#2a3860",flexShrink:0,marginLeft:8}}>{c.last_seen}</span>
                </div>
                <div style={{fontSize:12,color:"#4a5f80",overflow:"hidden",
                  textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                  {lastMsg
                    ? (lastMsg.ai_reply ? `🤖 ${lastMsg.ai_reply}` : `👤 ${lastMsg.user_message}`)
                    : "No messages yet"}
                </div>
              </div>

              <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6,flexShrink:0}}>
                <button className="tog" onClick={e=>{e.stopPropagation();toggleContact(c.sender_id,c.name);}}
                  style={{width:38,height:20,borderRadius:10,border:"none",cursor:"pointer",
                    background:c.ai_enabled?"linear-gradient(90deg,#1877f2,#00c6ff)":"#1e2840",
                    position:"relative",outline:"none",
                    boxShadow:c.ai_enabled?"0 0 8px #1877f240":"none"}}>
                  <div className="tog" style={{width:14,height:14,borderRadius:"50%",background:"#fff",
                    position:"absolute",top:3,left:c.ai_enabled?21:3,boxShadow:"0 1px 3px #0005"}}/>
                </button>
                <span style={{fontSize:10,fontWeight:600,
                  color:c.ai_enabled?"#00d4aa":"#f74f6a"}}>
                  {c.ai_enabled?"AI ON":"AI OFF"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
