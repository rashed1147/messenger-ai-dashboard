import { useState, useEffect, useCallback, useRef } from "react";

const API_URL = "https://script.google.com/macros/s/AKfycbx3lOwmMW3Xz40LroT0lLJDA6Z1wfwXTnoJfz0UZn4ZesNxxDvxKVvQMQaA_vZbIlD4/exec";
const FB_PAGE_TOKEN = "EAAWmonGrsnwBQ6ZCY29NF0ahwWFUo4ZBWummXszJeSHdZCSz1SfbKZCjfJctq8mnBcmWuHROZBB6ZABKaTF74tWBIOtmZAV1iJXD1VQ5I3ZAdSv8S0fnAIXVfZC5UUy8K5gDevgDCYZBiuOhZAmLP1Q1nS3atKHKxazlpacJNgBzE6vDltZBh5YcgSgjnx8JsdoW96ttpiemEzWAGCEH7VL8J3NzKgZDZD";

const api = {
  get: async (action) => {
    const res = await fetch(`${API_URL}?action=${action}`);
    return res.json();
  },
  post: async (body) => {
    const res = await fetch(API_URL, { method: "POST", body: JSON.stringify(body) });
    return res.json();
  },
};

const demoData = {
  contacts: [
    { sender_id: "1001", name: "Rahim Uddin",   ai_enabled: true,  last_seen: "2 min ago" },
    { sender_id: "1002", name: "Nadia Hossain", ai_enabled: true,  last_seen: "15 min ago" },
    { sender_id: "1003", name: "Karim Sheikh",  ai_enabled: false, last_seen: "1 hr ago" },
    { sender_id: "1004", name: "Fatema Begum",  ai_enabled: true,  last_seen: "2 hr ago" },
    { sender_id: "1005", name: "Arif Khan",     ai_enabled: true,  last_seen: "3 hr ago" },
  ],
  logs: [
    { timestamp: "10:32 AM", name: "Rahim Uddin",   user_message: "আপনাদের প্রোডাক্টের দাম কত?", ai_reply: "৳৮৫০ থেকে শুরু। কোনটা দেখতে চান?", status: "replied" },
    { timestamp: "10:18 AM", name: "Nadia Hossain", user_message: "Delivery কতদিনে হবে?",         ai_reply: "ঢাকায় ১-২ দিন, বাইরে ৩-৫ দিন।",   status: "replied" },
    { timestamp: "9:45 AM",  name: "Karim Sheikh",  user_message: "Cash on delivery আছে?",        ai_reply: null,                                status: "pending" },
    { timestamp: "8:30 AM",  name: "Fatema Begum",  user_message: "Size chart দেখাবেন?",          ai_reply: "S=৩৬, M=৩৮, L=৪০, XL=৪২।",       status: "replied" },
  ],
  stats: { total_today: 24, ai_handled: 22, pending: 2, ai_rate: "92%" },
  settings: { global_ai: "TRUE" },
};

const avatarColors = [
  ["#667eea","#764ba2"], ["#f093fb","#f5576c"], ["#4facfe","#00f2fe"],
  ["#43e97b","#38f9d7"], ["#fa709a","#fee140"], ["#a18cd1","#fbc2eb"],
];
const getAvatarGrad = (id) => avatarColors[parseInt(id || "0") % avatarColors.length];

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #2a3150; border-radius: 4px; }
  body { font-family: 'Plus Jakarta Sans', sans-serif; background: #070b14; }

  @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
  @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
  @keyframes glow { 0%,100% { box-shadow: 0 0 8px #1877f240; } 50% { box-shadow: 0 0 20px #1877f280; } }
  @keyframes slideIn { from { opacity:0; transform:translateX(-10px); } to { opacity:1; transform:translateX(0); } }

  .contact-item { transition: all 0.2s; }
  .contact-item:hover { background: #0f1628 !important; }
  .contact-item.active { background: #0f1628 !important; }

  .send-btn { transition: all 0.2s; }
  .send-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 20px #1877f260; }
  .send-btn:active:not(:disabled) { transform: translateY(0); }

  .toggle-btn { transition: all 0.3s; }
  .stat-card { animation: fadeIn 0.5s ease both; }
  .msg-card { animation: fadeIn 0.3s ease both; }
  .live-dot { animation: pulse 2s infinite; }

  textarea:focus { border-color: #1877f2 !important; box-shadow: 0 0 0 3px #1877f215 !important; }
  input:focus { border-color: #1877f2 !important; outline: none; }
`;

export default function Dashboard() {
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
  const textareaRef = useRef(null);
  const messagesEndRef = useRef(null);

  const loadData = useCallback(async () => {
    if (!apiMode) {
      setContacts(demoData.contacts);
      setLogs(demoData.logs);
      setStats(demoData.stats);
      setGlobalAI(demoData.settings.global_ai === "TRUE");
      setSelected(s => s || demoData.contacts[0]);
      setLoading(false);
      return;
    }
    try {
      setSyncing(true);
      const [cRes, lRes, stRes, statRes] = await Promise.all([
        api.get("contacts"), api.get("logs"), api.get("settings"), api.get("stats"),
      ]);
      setContacts(cRes.contacts || []);
      setLogs(lRes.logs || []);
      setGlobalAI(stRes.settings?.global_ai === "TRUE");
      setStats(statRes.stats || {});
      setSelected(s => s || cRes.contacts?.[0]);
      setLastSync(new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }));
    } catch(e) { console.error(e); }
    finally { setSyncing(false); setLoading(false); }
  }, [apiMode]);

  useEffect(() => { loadData(); const t = setInterval(loadData, 30000); return () => clearInterval(t); }, [loadData]);

  const toggleContact = async (sender_id, name) => {
    const c = contacts.find(x => x.sender_id === sender_id);
    const nv = !c.ai_enabled;
    setContacts(prev => prev.map(x => x.sender_id === sender_id ? {...x, ai_enabled: nv} : x));
    setSelected(s => s?.sender_id === sender_id ? {...s, ai_enabled: nv} : s);
    if (apiMode) await api.post({ action: "toggle_contact", sender_id, name, ai_enabled: nv });
  };

  const toggleGlobal = async () => {
    const nv = !globalAI;
    setGlobalAI(nv);
    if (apiMode) await api.post({ action: "toggle_global", enabled: nv });
  };

  const sendManualReply = async () => {
    if (!replyText.trim() || !selected) return;
    const msgText = replyText;
    setSending(true); setSendStatus(null);

    // Optimistically add to UI immediately
    const now = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    const newEntry = {
      timestamp: now,
      name: selected.name,
      sender_id: selected.sender_id,
      user_message: "— (manual reply sent)",
      ai_reply: msgText,
      status: "manual",
    };
    setLogs(prev => [newEntry, ...prev]);
    setReplyText("");

    try {
      const res = await fetch(
        `https://graph.facebook.com/v18.0/me/messages?access_token=${FB_PAGE_TOKEN}`,
        { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recipient: { id: selected.sender_id }, message: { text: msgText } }) }
      );
      setSendStatus(res.ok ? "ok" : "error");
      if (!res.ok) {
        // Remove optimistic entry on failure
        setLogs(prev => prev.filter(l => l !== newEntry));
        setReplyText(msgText);
      }
      setTimeout(() => setSendStatus(null), 3000);
    } catch {
      setSendStatus("error");
      setLogs(prev => prev.filter(l => l !== newEntry));
      setReplyText(msgText);
    }
    finally { setSending(false); }
  };

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedLogs?.length]);

  const filteredContacts = contacts.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase())
  );

  const selectedLogs = logs
    .filter(l => !selected || l.name === selected.name || l.sender_id === selected.sender_id)
    .slice()
    .reverse();

  if (loading) return (
    <div style={{ background: "#070b14", minHeight: "100vh", display: "flex",
      alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
      <style>{css}</style>
      <div style={{ width: 40, height: 40, borderRadius: "50%",
        border: "3px solid #1877f230", borderTopColor: "#1877f2",
        animation: "spin 1s linear infinite" }} />
      <span style={{ color: "#4a5270", fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13 }}>
        Loading...
      </span>
    </div>
  );

  const initials = (name) => name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const [g1, g2] = selected ? getAvatarGrad(selected.sender_id) : ["#1877f2", "#00d4aa"];

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: "#070b14",
      minHeight: "100vh", color: "#dde1f0", display: "flex", flexDirection: "column",
      height: "100vh", overflow: "hidden" }}>
      <style>{css}</style>

      {/* ── Topbar ── */}
      <div style={{ background: "linear-gradient(180deg, #0c1220 0%, #080d18 100%)",
        borderBottom: "1px solid #151d30", padding: "0 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        height: 56, flexShrink: 0, position: "relative" }}>

        {/* Subtle top glow */}
        <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
          width: 300, height: 1, background: "linear-gradient(90deg, transparent, #1877f260, transparent)" }} />

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10,
            background: "linear-gradient(135deg, #1877f2, #00c6ff)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, boxShadow: "0 4px 16px #1877f240", animation: "glow 3s infinite" }}>
            💬
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, letterSpacing: "-0.01em", color: "#fff" }}>
              Messenger AI
            </div>
            <div style={{ fontSize: 10, color: "#3d4f70", letterSpacing: "0.08em",
              textTransform: "uppercase", marginTop: -1 }}>
              Control Center
            </div>
          </div>

          <button onClick={() => setApiMode(!apiMode)} style={{
            marginLeft: 4, background: apiMode ? "#071a12" : "#120710",
            border: `1px solid ${apiMode ? "#00d4aa30" : "#f74f6a30"}`,
            borderRadius: 20, padding: "4px 12px", fontSize: 11,
            color: apiMode ? "#00d4aa" : "#f74f6a", cursor: "pointer",
            fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600,
            display: "flex", alignItems: "center", gap: 6 }}>
            <div className="live-dot" style={{ width: 5, height: 5, borderRadius: "50%",
              background: apiMode ? "#00d4aa" : "#f74f6a" }} />
            {apiMode ? "Live" : "Demo"}
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {syncing && (
            <span style={{ fontSize: 11, color: "#3d4f70", fontStyle: "italic" }}>syncing...</span>
          )}
          {lastSync && (
            <span style={{ fontSize: 11, color: "#3d4f70" }}>synced {lastSync}</span>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 10,
            background: "#0c1525", borderRadius: 24, padding: "6px 14px",
            border: "1px solid #151d30" }}>
            <span style={{ fontSize: 12, color: "#5a6f90", fontWeight: 500 }}>Global AI</span>
            <button className="toggle-btn" onClick={toggleGlobal} style={{
              width: 44, height: 23, borderRadius: 12,
              background: globalAI ? "linear-gradient(90deg, #1877f2, #00c6ff)" : "#151d30",
              border: "none", cursor: "pointer", position: "relative", outline: "none",
              boxShadow: globalAI ? "0 0 12px #1877f240" : "none" }}>
              <div style={{ width: 17, height: 17, borderRadius: "50%", background: "#fff",
                position: "absolute", top: 3, left: globalAI ? 24 : 3,
                transition: "left 0.25s cubic-bezier(.4,0,.2,1)",
                boxShadow: "0 1px 4px rgba(0,0,0,0.4)" }} />
            </button>
            <div style={{ width: 7, height: 7, borderRadius: "50%",
              background: globalAI ? "#00d4aa" : "#f74f6a",
              boxShadow: `0 0 8px ${globalAI ? "#00d4aa" : "#f74f6a"}` }} />
          </div>
        </div>
      </div>

      {/* ── Stats Bar ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)",
        borderBottom: "1px solid #151d30", flexShrink: 0 }}>
        {[
          { label: "আজকের মেসেজ", value: stats.total_today ?? "—", icon: "📨", color: "#4f8ef7" },
          { label: "AI Handled",   value: stats.ai_rate    ?? "—", icon: "🤖", color: "#00d4aa" },
          { label: "Pending",      value: stats.pending    ?? "—", icon: "⏳", color: "#f7934f" },
          { label: "Last Sync",    value: lastSync ?? "Demo",       icon: "🔄", color: "#a78bfa" },
        ].map((s, i) => (
          <div key={s.label} className="stat-card" style={{
            background: "linear-gradient(180deg, #0c1220 0%, #080d18 100%)",
            padding: "14px 20px", borderRight: i < 3 ? "1px solid #151d30" : "none",
            display: "flex", alignItems: "center", gap: 14,
            animationDelay: `${i * 0.07}s` }}>
            <div style={{ width: 38, height: 38, borderRadius: 10,
              background: `${s.color}15`, border: `1px solid ${s.color}25`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
              {s.icon}
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: s.color,
                letterSpacing: "-0.02em", lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "#3d4f70", marginTop: 3,
                fontWeight: 500 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main Layout ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* ── Sidebar ── */}
        <div style={{ width: 272, background: "#080d18",
          borderRight: "1px solid #151d30", display: "flex",
          flexDirection: "column", flexShrink: 0 }}>

          <div style={{ padding: "12px 14px", borderBottom: "1px solid #151d30" }}>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 10, top: "50%",
                transform: "translateY(-50%)", fontSize: 13, color: "#3d4f70" }}>🔍</span>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search contacts..."
                style={{ width: "100%", background: "#0c1220",
                  border: "1px solid #151d30", borderRadius: 8,
                  padding: "8px 10px 8px 32px", color: "#dde1f0",
                  fontSize: 12, fontFamily: "'Plus Jakarta Sans', sans-serif",
                  transition: "border-color 0.2s" }} />
            </div>
          </div>

          <div style={{ overflowY: "auto", flex: 1 }}>
            {filteredContacts.map((c, i) => {
              const [c1, c2] = getAvatarGrad(c.sender_id);
              const isActive = selected?.sender_id === c.sender_id;
              return (
                <div key={c.sender_id} className={`contact-item${isActive ? " active" : ""}`}
                  onClick={() => setSelected(c)}
                  style={{ padding: "11px 14px", cursor: "pointer",
                    borderBottom: "1px solid #0d1424",
                    borderLeft: `2px solid ${isActive ? "#1877f2" : "transparent"}`,
                    animation: `slideIn 0.3s ease ${i * 0.04}s both` }}>

                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ position: "relative", flexShrink: 0 }}>
                      <div style={{ width: 38, height: 38, borderRadius: "50%",
                        background: `linear-gradient(135deg, ${c1}, ${c2})`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 12, fontWeight: 700, color: "#fff",
                        boxShadow: isActive ? `0 0 12px ${c1}50` : "none" }}>
                        {initials(c.name)}
                      </div>
                      <div style={{ position: "absolute", bottom: 0, right: 0,
                        width: 10, height: 10, borderRadius: "50%",
                        background: c.ai_enabled ? "#00d4aa" : "#f74f6a",
                        border: "2px solid #080d18",
                        boxShadow: `0 0 5px ${c.ai_enabled ? "#00d4aa80" : "#f74f6a80"}` }} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between",
                        alignItems: "center" }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: isActive ? "#fff" : "#c8cfe0",
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {c.name}
                        </span>
                        <span style={{ fontSize: 10, color: "#3d4f70", flexShrink: 0, marginLeft: 6 }}>
                          {c.last_seen}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                        <span style={{ fontSize: 10, fontWeight: 600,
                          color: c.ai_enabled ? "#00d4aa" : "#f74f6a" }}>
                          {c.ai_enabled ? "AI Active" : "AI Off"}
                        </span>
                      </div>
                    </div>

                    <button onClick={e => { e.stopPropagation(); toggleContact(c.sender_id, c.name); }}
                      className="toggle-btn"
                      style={{ width: 30, height: 16, borderRadius: 8, border: "none",
                        background: c.ai_enabled ? "linear-gradient(90deg,#1877f2,#00c6ff)" : "#1a2235",
                        cursor: "pointer", position: "relative", outline: "none", flexShrink: 0 }}>
                      <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#fff",
                        position: "absolute", top: 2, left: c.ai_enabled ? 16 : 2,
                        transition: "left 0.25s cubic-bezier(.4,0,.2,1)" }} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Main Panel ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden",
          background: "#07090f" }}>

          {selected ? (
            <>
              {/* Contact Header */}
              <div style={{ padding: "14px 24px", borderBottom: "1px solid #151d30",
                background: "linear-gradient(180deg, #0c1220, #08091a)",
                display: "flex", justifyContent: "space-between", alignItems: "center",
                flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%",
                    background: `linear-gradient(135deg, ${g1}, ${g2})`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 700, fontSize: 14, color: "#fff",
                    boxShadow: `0 4px 16px ${g1}40` }}>
                    {initials(selected.name)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "#fff" }}>{selected.name}</div>
                    <div style={{ fontSize: 11, color: "#3d4f70", marginTop: 1,
                      fontFamily: "'JetBrains Mono', monospace" }}>
                      {selected.sender_id}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 11, color: "#3d4f70", marginBottom: 2 }}>AI Reply</div>
                    <div style={{ fontSize: 12, fontWeight: 700,
                      color: selected.ai_enabled ? "#00d4aa" : "#f74f6a" }}>
                      {selected.ai_enabled ? "● Active" : "○ Paused"}
                    </div>
                  </div>
                  <button className="toggle-btn"
                    onClick={() => toggleContact(selected.sender_id, selected.name)}
                    style={{ width: 50, height: 26, borderRadius: 13, border: "none",
                      background: selected.ai_enabled
                        ? "linear-gradient(90deg, #1877f2, #00c6ff)" : "#151d30",
                      cursor: "pointer", position: "relative", outline: "none",
                      boxShadow: selected.ai_enabled ? "0 0 16px #1877f240" : "none" }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff",
                      position: "absolute", top: 3, left: selected.ai_enabled ? 27 : 3,
                      transition: "left 0.25s cubic-bezier(.4,0,.2,1)",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.3)" }} />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
                {selectedLogs.length === 0 ? (
                  <div style={{ textAlign: "center", color: "#2a3450", marginTop: 60, fontSize: 13 }}>
                    No messages yet
                  </div>
                ) : selectedLogs.map((log, i) => (
                  <div key={i} className="msg-card"
                    style={{ marginBottom: 16, animationDelay: `${i * 0.05}s` }}>

                    {/* User message */}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
                      <div style={{ width: 30, height: 30, borderRadius: "50%",
                        background: "linear-gradient(135deg,#2a3450,#1a2035)",
                        border: "1px solid #1e2a40",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 10, fontWeight: 700, flexShrink: 0, color: "#7a8ab0" }}>
                        {initials(log.name)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: "#8a9bc0" }}>{log.name}</span>
                          <span style={{ fontSize: 10, color: "#2a3450" }}>{log.timestamp}</span>
                          <span style={{
                            fontSize: 10, borderRadius: 4, padding: "1px 7px",
                            background: log.status === "replied" ? "#071a12" : log.status === "manual" ? "#0a0e1a" : "#1a0a08",
                            color: log.status === "replied" ? "#00d4aa" : log.status === "manual" ? "#4f8ef7" : "#f7934f",
                            border: `1px solid ${log.status === "replied" ? "#00d4aa20" : log.status === "manual" ? "#4f8ef720" : "#f7934f20"}`,
                            fontWeight: 600 }}>
                            {log.status === "replied" ? "✓ replied" : log.status === "manual" ? "✍ manual" : "⏸ pending"}
                          </span>
                        </div>
                        <div style={{ background: "#0c1525", border: "1px solid #151d30",
                          borderRadius: "4px 14px 14px 14px", padding: "10px 14px",
                          fontSize: 13, color: "#c0c8e0", lineHeight: 1.6,
                          display: "inline-block", maxWidth: "80%" }}>
                          {log.user_message}
                        </div>
                      </div>
                    </div>

                    {/* AI Reply */}
                    {log.ai_reply && (
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 10,
                        justifyContent: "flex-end" }}>
                        <div style={{ flex: 1, display: "flex", flexDirection: "column",
                          alignItems: "flex-end" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                            <span style={{ fontSize: 10, color: "#2a3450" }}>{log.timestamp}</span>
                            <span style={{ fontSize: 11, fontWeight: 600, color: "#4f8ef7" }}>🤖 AI</span>
                          </div>
                          <div style={{
                            background: "linear-gradient(135deg, #0d1e3a, #0a1828)",
                            border: "1px solid #1877f225",
                            borderRadius: "14px 4px 14px 14px", padding: "10px 14px",
                            fontSize: 13, color: "#c8d8f8", lineHeight: 1.6,
                            maxWidth: "80%", boxShadow: "0 2px 12px #1877f215" }}>
                            {log.ai_reply}
                          </div>
                        </div>
                        <div style={{ width: 30, height: 30, borderRadius: "50%",
                          background: "linear-gradient(135deg, #1877f2, #00c6ff)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 13, flexShrink: 0, boxShadow: "0 2px 10px #1877f240" }}>
                          🤖
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply Box */}
              <div style={{ padding: "14px 20px", borderTop: "1px solid #151d30",
                background: "linear-gradient(180deg, #080d18, #07090f)", flexShrink: 0 }}>
                <div style={{ fontSize: 11, color: "#3d4f70", marginBottom: 8,
                  fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  ✍️ Manual Reply to {selected.name}
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                  <textarea
                    ref={textareaRef}
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendManualReply(); }}}
                    placeholder="Message লিখো...  (Enter = send)"
                    rows={2}
                    style={{ flex: 1, background: "#0c1525",
                      border: "1px solid #1a2540", borderRadius: 12,
                      padding: "10px 14px", color: "#dde1f0", fontSize: 13,
                      outline: "none", resize: "none", lineHeight: 1.6,
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      transition: "border-color 0.2s, box-shadow 0.2s" }} />
                  <button className="send-btn" onClick={sendManualReply}
                    disabled={sending || !replyText.trim()}
                    style={{ height: 52, padding: "0 22px", borderRadius: 12,
                      border: `1px solid ${sending || !replyText.trim() ? "#1a2540" : "transparent"}`,
                      background: sending || !replyText.trim()
                        ? "#0c1525" : "linear-gradient(135deg, #1877f2, #00c6ff)",
                      color: sending || !replyText.trim() ? "#2a3450" : "#fff",
                      cursor: sending || !replyText.trim() ? "not-allowed" : "pointer",
                      fontSize: 13, fontWeight: 700, whiteSpace: "nowrap",
                      fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {sending ? "..." : "Send →"}
                  </button>
                </div>
                {sendStatus === "ok" && (
                  <div style={{ marginTop: 8, fontSize: 12, color: "#00d4aa",
                    fontWeight: 600, animation: "fadeIn 0.3s ease" }}>
                    ✓ পাঠানো হয়েছে!
                  </div>
                )}
                {sendStatus === "error" && (
                  <div style={{ marginTop: 8, fontSize: 12, color: "#f74f6a",
                    fontWeight: 600 }}>
                    ✗ Error! Page Access Token চেক করো।
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: "flex", alignItems: "center",
              justifyContent: "center", color: "#2a3450", fontSize: 13 }}>
              কোনো contact সিলেক্ট করো
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
