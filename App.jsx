import { useState, useEffect, useCallback } from "react";

// ⬇️ এখানে তোমার Google Apps Script deploy URL দাও
const API_URL = "https://script.google.com/macros/s/AKfycbx3lOwmMW3Xz40LroT0lLJDA6Z1wfwXTnoJfz0UZn4ZesNxxDvxKVvQMQaA_vZbIlD4/exec"; 

// API helper functions
const api = {
  get: async (action) => {
    const res = await fetch(`${API_URL}?action=${action}`);
    return res.json();
  },
  post: async (body) => {
    const res = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return res.json();
  },
};

// ─── Demo fallback (API না থাকলে) ────────────────────────
const demoData = {
  contacts: [
    { sender_id: "1001", name: "Rahim Uddin",   ai_enabled: true,  last_seen: "2 min ago" },
    { sender_id: "1002", name: "Nadia Hossain", ai_enabled: true,  last_seen: "15 min ago" },
    { sender_id: "1003", name: "Karim Sheikh",  ai_enabled: false, last_seen: "1 hr ago" },
    { sender_id: "1004", name: "Fatema Begum",  ai_enabled: true,  last_seen: "2 hr ago" },
    { sender_id: "1005", name: "Arif Khan",     ai_enabled: true,  last_seen: "3 hr ago" },
  ],
  logs: [
    { timestamp: "10:32 AM", name: "Rahim Uddin",   user_message: "আপনাদের প্রোডাক্টের দাম কত?",  ai_reply: "৳৮৫০ থেকে শুরু। কোনটা দেখতে চান?", status: "replied" },
    { timestamp: "10:18 AM", name: "Nadia Hossain", user_message: "Delivery কতদিনে হবে?",          ai_reply: "ঢাকায় ১-২ দিন, বাইরে ৩-৫ দিন।",    status: "replied" },
    { timestamp: "9:45 AM",  name: "Karim Sheikh",  user_message: "Cash on delivery আছে?",         ai_reply: null,                                 status: "pending" },
    { timestamp: "8:30 AM",  name: "Fatema Begum",  user_message: "Size chart দেখাবেন?",           ai_reply: "S=৩৬, M=৩৮, L=৪০, XL=৪২।",        status: "replied" },
  ],
  stats: { total_today: 24, ai_handled: 22, pending: 2, ai_rate: "92%" },
  settings: { global_ai: "TRUE" },
};

export default function Dashboard() {
  const [contacts,   setContacts]   = useState([]);
  const [logs,       setLogs]       = useState([]);
  const [stats,      setStats]      = useState({});
  const [globalAI,   setGlobalAI]   = useState(true);
  const [selected,   setSelected]   = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [apiMode,    setApiMode]    = useState(false); // false = demo mode
  const [syncing,    setSyncing]    = useState(false);
  const [lastSync,   setLastSync]   = useState(null);

  // ── Data load ─────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!apiMode) {
      setContacts(demoData.contacts);
      setLogs(demoData.logs);
      setStats(demoData.stats);
      setGlobalAI(demoData.settings.global_ai === "TRUE");
      setSelected(demoData.contacts[0]);
      setLoading(false);
      return;
    }

    try {
      setSyncing(true);
      const [cRes, lRes, sRes, stRes] = await Promise.all([
        api.get("contacts"),
        api.get("logs"),
        api.get("settings"),
        api.get("stats"),
      ]);
      setContacts(cRes.contacts || []);
      setLogs(lRes.logs || []);
      setGlobalAI(stRes.settings?.global_ai === "TRUE");
      setStats(stRes.stats || {});
      if (!selected && cRes.contacts?.length) setSelected(cRes.contacts[0]);
      setLastSync(new Date().toLocaleTimeString());
    } catch (e) {
      console.error("API error:", e);
    } finally {
      setSyncing(false);
      setLoading(false);
    }
  }, [apiMode]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // 30s auto-refresh
    return () => clearInterval(interval);
  }, [loadData]);

  // ── Toggle contact AI ──────────────────────────────────
  const toggleContact = async (sender_id, name) => {
    const contact = contacts.find(c => c.sender_id === sender_id);
    const newVal = !contact.ai_enabled;

    // Optimistic update
    setContacts(prev => prev.map(c =>
      c.sender_id === sender_id ? { ...c, ai_enabled: newVal } : c
    ));
    if (selected?.sender_id === sender_id) {
      setSelected(prev => ({ ...prev, ai_enabled: newVal }));
    }

    if (apiMode) {
      await api.post({ action: "toggle_contact", sender_id, name, ai_enabled: newVal });
    }
  };

  // ── Toggle global AI ───────────────────────────────────
  const toggleGlobal = async () => {
    const newVal = !globalAI;
    setGlobalAI(newVal);
    if (apiMode) {
      await api.post({ action: "toggle_global", enabled: newVal });
    }
  };

  const statCards = [
    { label: "আজকের মেসেজ", value: stats.total_today || "—", color: "#00d4aa" },
    { label: "AI Handled",   value: stats.ai_rate     || "—", color: "#4f8ef7" },
    { label: "Pending",      value: stats.pending     || "—", color: "#f74f6a" },
    { label: "Last Sync",    value: lastSync || "Demo",        color: "#f7934f" },
  ];

  if (loading) return (
    <div style={{ background: "#0a0d14", minHeight: "100vh", display: "flex",
      alignItems: "center", justifyContent: "center", color: "#7a8299",
      fontFamily: "sans-serif", fontSize: 14 }}>
      Loading...
    </div>
  );

  return (
    <div style={{ fontFamily: "'DM Sans', 'Noto Sans Bengali', sans-serif",
      background: "#0a0d14", minHeight: "100vh", color: "#e8eaf0",
      display: "flex", flexDirection: "column" }}>

      {/* Top bar */}
      <div style={{ background: "#0f1320", borderBottom: "1px solid #1e2535",
        padding: "0 24px", display: "flex", alignItems: "center",
        justifyContent: "space-between", height: 54 }}>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8,
            background: "linear-gradient(135deg, #1877f2, #00d4aa)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>💬</div>
          <span style={{ fontWeight: 700, fontSize: 14 }}>Messenger AI</span>

          {/* API / Demo toggle */}
          <button onClick={() => setApiMode(!apiMode)} style={{
            marginLeft: 8, background: apiMode ? "#0a1a16" : "#1a1020",
            border: `1px solid ${apiMode ? "#00d4aa44" : "#f74f6a44"}`,
            borderRadius: 20, padding: "3px 12px", fontSize: 11,
            color: apiMode ? "#00d4aa" : "#f74f6a", cursor: "pointer" }}>
            {apiMode ? "● Live" : "○ Demo"}
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {syncing && <span style={{ fontSize: 11, color: "#4a5270" }}>syncing...</span>}
          <span style={{ fontSize: 12, color: "#7a8299" }}>Global AI</span>
          <button onClick={toggleGlobal} style={{
            width: 46, height: 24, borderRadius: 12,
            background: globalAI ? "linear-gradient(90deg,#1877f2,#00d4aa)" : "#1e2535",
            border: "none", cursor: "pointer", position: "relative", outline: "none" }}>
            <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff",
              position: "absolute", top: 3, left: globalAI ? 25 : 3, transition: "left 0.25s" }} />
          </button>
          <div style={{ width: 7, height: 7, borderRadius: "50%",
            background: globalAI ? "#00d4aa" : "#f74f6a",
            boxShadow: `0 0 7px ${globalAI ? "#00d4aa" : "#f74f6a"}` }} />
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)",
        gap: 1, background: "#1e2535", borderBottom: "1px solid #1e2535" }}>
        {statCards.map(s => (
          <div key={s.label} style={{ background: "#0f1320", padding: "14px 20px",
            display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 3, height: 32, borderRadius: 4,
              background: s.color, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "#7a8299" }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden",
        height: "calc(100vh - 112px)" }}>

        {/* Contact list */}
        <div style={{ width: 280, background: "#0d1018",
          borderRight: "1px solid #1e2535", display: "flex",
          flexDirection: "column", overflow: "hidden" }}>

          <div style={{ padding: "10px 14px", borderBottom: "1px solid #1e2535" }}>
            <input placeholder="Search..." style={{ width: "100%",
              background: "#1a1f2e", border: "1px solid #252b3d",
              borderRadius: 7, padding: "7px 12px", color: "#e8eaf0",
              fontSize: 12, outline: "none", boxSizing: "border-box" }} />
          </div>

          <div style={{ overflowY: "auto", flex: 1 }}>
            {contacts.map(c => (
              <div key={c.sender_id} onClick={() => setSelected(c)}
                style={{ padding: "11px 14px", borderBottom: "1px solid #131825",
                  cursor: "pointer",
                  background: selected?.sender_id === c.sender_id ? "#141926" : "transparent",
                  borderLeft: `3px solid ${selected?.sender_id === c.sender_id ? "#1877f2" : "transparent"}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", gap: 9, alignItems: "center" }}>
                    <div style={{ width: 34, height: 34, borderRadius: "50%",
                      background: "linear-gradient(135deg,#1877f2,#00d4aa)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                      {c.name.split(" ").map(w => w[0]).join("").slice(0,2)}
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{c.name}</div>
                      <div style={{ fontSize: 10, color: "#4a5270", marginTop: 1 }}>{c.last_seen}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                    {/* Mini toggle */}
                    <button onClick={(e) => { e.stopPropagation(); toggleContact(c.sender_id, c.name); }}
                      style={{ width: 32, height: 17, borderRadius: 9,
                        background: c.ai_enabled
                          ? "linear-gradient(90deg,#1877f2,#00d4aa)" : "#1e2535",
                        border: "none", cursor: "pointer", position: "relative", outline: "none" }}>
                      <div style={{ width: 13, height: 13, borderRadius: "50%",
                        background: "#fff", position: "absolute", top: 2,
                        left: c.ai_enabled ? 17 : 2, transition: "left 0.2s" }} />
                    </button>
                    <span style={{ fontSize: 9, color: c.ai_enabled ? "#00d4aa" : "#f74f6a" }}>
                      {c.ai_enabled ? "AI ON" : "AI OFF"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Log view */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Selected contact header */}
          {selected && (
            <div style={{ padding: "12px 20px", borderBottom: "1px solid #1e2535",
              display: "flex", justifyContent: "space-between", alignItems: "center",
              background: "#0d1018" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%",
                  background: "linear-gradient(135deg,#1877f2,#00d4aa)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 700, fontSize: 12 }}>
                  {selected.name.split(" ").map(w => w[0]).join("").slice(0,2)}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{selected.name}</div>
                  <div style={{ fontSize: 11, color: "#7a8299" }}>ID: {selected.sender_id}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 12, color: "#7a8299" }}>AI Reply</span>
                <button onClick={() => toggleContact(selected.sender_id, selected.name)}
                  style={{ width: 42, height: 22, borderRadius: 11,
                    background: selected.ai_enabled
                      ? "linear-gradient(90deg,#1877f2,#00d4aa)" : "#1e2535",
                    border: "none", cursor: "pointer", position: "relative", outline: "none" }}>
                  <div style={{ width: 16, height: 16, borderRadius: "50%",
                    background: "#fff", position: "absolute", top: 3,
                    left: selected.ai_enabled ? 23 : 3, transition: "left 0.25s" }} />
                </button>
                <span style={{ fontSize: 11, fontWeight: 600,
                  color: selected.ai_enabled ? "#00d4aa" : "#f74f6a" }}>
                  {selected.ai_enabled ? "Active" : "Paused"}
                </span>
              </div>
            </div>
          )}

          {/* Log table */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
            <div style={{ fontSize: 11, color: "#4a5270", marginBottom: 12,
              textTransform: "uppercase", letterSpacing: "0.07em" }}>
              Recent Messages {logs.length > 0 && `(${logs.length})`}
            </div>
            {logs.map((log, i) => (
              <div key={i} style={{ background: "#0f1320", border: "1px solid #1e2535",
                borderRadius: 10, padding: "14px 16px", marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between",
                  alignItems: "flex-start", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%",
                      background: "linear-gradient(135deg,#1877f2,#00d4aa)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, fontWeight: 700 }}>
                      {log.name?.split(" ").map(w => w[0]).join("").slice(0,2)}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{log.name}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 10, color: "#4a5270" }}>{log.timestamp}</span>
                    <span style={{
                      fontSize: 10, borderRadius: 6, padding: "2px 8px",
                      background: log.status === "replied" ? "#0a1f15" : "#1f0a0e",
                      color: log.status === "replied" ? "#00d4aa" : "#f74f6a",
                      border: `1px solid ${log.status === "replied" ? "#00d4aa22" : "#f74f6a22"}` }}>
                      {log.status === "replied" ? "✓ replied" : "⏸ pending"}
                    </span>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div style={{ background: "#1a1f2e", borderRadius: 8, padding: "10px 12px" }}>
                    <div style={{ fontSize: 10, color: "#4a5270", marginBottom: 4 }}>👤 User</div>
                    <div style={{ fontSize: 12, lineHeight: 1.6 }}>{log.user_message}</div>
                  </div>
                  <div style={{ background: "#0d1a2a", borderRadius: 8, padding: "10px 12px",
                    borderLeft: "2px solid #1877f233" }}>
                    <div style={{ fontSize: 10, color: "#4a5270", marginBottom: 4 }}>🤖 AI Reply</div>
                    <div style={{ fontSize: 12, lineHeight: 1.6, color: log.ai_reply ? "#e8eaf0" : "#4a5270" }}>
                      {log.ai_reply || "—"}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
