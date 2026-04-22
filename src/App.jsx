import { useState, useEffect, useCallback, useRef, useMemo } from "react";

// ─── Constants & Helpers ─────────────────────────────────────────────────────

const INITIAL_PRINTERS = [
  { id: 1, name: "Printer 1", model: "Bambu Lab X1C", online: true },
  { id: 2, name: "Printer 2", model: "Bambu Lab X1C", online: true },
  { id: 3, name: "Printer 3", model: "Bambu Lab X1C", online: true },
  { id: 4, name: "Printer 4", model: "Bambu Lab P1S", online: true },
  { id: 5, name: "Printer 5", model: "Bambu Lab P1S", online: true },
  { id: 6, name: "Printer 6", model: "Bambu Lab A1", online: true },
];

const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function dk(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function uid() { return Math.random().toString(36).substr(2,9); }
function fmtHour(h) {
  const hr = Math.floor(((h % 24) + 24) % 24);
  const mn = Math.round((h - Math.floor(h)) * 60);
  const ampm = hr >= 12 ? "PM" : "AM";
  const dh = hr === 0 ? 12 : hr > 12 ? hr - 12 : hr;
  return `${dh}:${String(mn).padStart(2,"0")} ${ampm}`;
}
function fmtDuration(h) {
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}
function fmtDate(d) { return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`; }
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function getWeekDates(base) {
  const d = new Date(base);
  const day = d.getDay();
  const mon = addDays(d, -((day + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => addDays(mon, i));
}
function nowHour() { const n = new Date(); return n.getHours() + n.getMinutes() / 60; }

// Convert a job's absolute start into { date, hour } where hour can be 0-24+
function jobAbsoluteStart(job) {
  const d = new Date(job.date + "T00:00:00");
  return d.getTime() + job.startHour * 3600000;
}
function jobAbsoluteEnd(job) {
  return jobAbsoluteStart(job) + job.duration * 3600000;
}

// ─── Icons ───────────────────────────────────────────────────────────────────
const I = {
  printer: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>,
  clock: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  check: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  cal: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  users: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  left: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
  right: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
  x: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  bell: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  plus: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  alert: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  poke: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0"/></svg>,
  settings: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  logout: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>,
  moon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
  zap: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  trash: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  power: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>,
};

// ─── Notification System ─────────────────────────────────────────────────────

function NotificationBell({ notifications, onClear, onDismiss }) {
  const [open, setOpen] = useState(false);
  const unread = notifications.filter(n => !n.read).length;
  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen(!open)} style={{
        background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.8)",
        position: "relative", padding: 6, borderRadius: 8,
      }}>
        {I.bell}
        {unread > 0 && <span style={{
          position: "absolute", top: 0, right: 0, width: 18, height: 18, borderRadius: "50%",
          background: "#ef4444", color: "#fff", fontSize: 10, fontWeight: 700,
          display: "flex", alignItems: "center", justifyContent: "center",
          border: "2px solid #1a1a2e",
        }}>{unread}</span>}
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "100%", right: 0, marginTop: 8,
          width: 360, maxHeight: 420, overflowY: "auto",
          background: "#fff", borderRadius: 14, boxShadow: "0 12px 48px rgba(0,0,0,0.2)",
          border: "1px solid #e8e8e8", zIndex: 999,
        }}>
          <div style={{
            padding: "14px 18px", borderBottom: "1px solid #f0f0f0",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 16, fontWeight: 700, color: "#1a1a2e" }}>Notifications</span>
            {notifications.length > 0 && <button onClick={onClear} style={{
              background: "none", border: "none", cursor: "pointer", color: "#d4740e",
              fontSize: 12, fontFamily: "'DM Sans',sans-serif", fontWeight: 600,
            }}>Clear all</button>}
          </div>
          {notifications.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center", color: "#aaa", fontFamily: "'DM Sans',sans-serif", fontSize: 13 }}>
              No notifications yet
            </div>
          ) : notifications.map(n => (
            <div key={n.id} style={{
              padding: "12px 18px", borderBottom: "1px solid #f7f7f7",
              background: n.read ? "#fff" : "#fef7ed",
              display: "flex", gap: 10, alignItems: "flex-start",
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%", flexShrink: 0, marginTop: 2,
                background: n.type === "alert" ? "#fef2f2" : n.type === "poke" ? "#fef7ed" : n.type === "success" ? "#f0f9f0" : "#f0f4ff",
                color: n.type === "alert" ? "#ef4444" : n.type === "poke" ? "#d4740e" : n.type === "success" ? "#22c55e" : "#3d7ec7",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {n.type === "alert" ? I.alert : n.type === "poke" ? I.poke : n.type === "success" ? I.check : I.bell}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: "#1a1a2e", fontWeight: n.read ? 400 : 600 }}>{n.message}</div>
                <div style={{ fontSize: 11, color: "#aaa", marginTop: 2, fontFamily: "'DM Sans',sans-serif" }}>{n.time}</div>
              </div>
              <button onClick={() => onDismiss(n.id)} style={{
                background: "none", border: "none", cursor: "pointer", color: "#ccc", padding: 2, flexShrink: 0,
              }}>{I.x}</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Toast ───────────────────────────────────────────────────────────────────

function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 4500); return () => clearTimeout(t); }, [onClose]);
  const bg = { success: "#0f5132", error: "#842029", info: "#1e3a5f", warning: "#6b4c1e" }[type] || "#1e3a5f";
  const bdr = { success: "#198754", error: "#dc3545", info: "#3d7ec7", warning: "#d4740e" }[type] || "#3d7ec7";
  return (
    <div style={{
      position: "fixed", top: 20, right: 20, zIndex: 9999, background: bg, color: "#fff",
      padding: "13px 20px", borderRadius: 10, borderLeft: `4px solid ${bdr}`,
      boxShadow: "0 8px 32px rgba(0,0,0,0.25)", fontFamily: "'DM Sans',sans-serif",
      fontSize: 13, animation: "slideIn .3s ease", maxWidth: 400,
      display: "flex", alignItems: "center", gap: 10,
    }}>
      <span style={{ flex: 1 }}>{message}</span>
      <button onClick={onClose} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer" }}>{I.x}</button>
    </div>
  );
}

// ─── Shared Styles ───────────────────────────────────────────────────────────

const inp = {
  width: "100%", padding: "11px 14px", borderRadius: 8, border: "1px solid #ddd",
  fontFamily: "'DM Sans',sans-serif", fontSize: 14, outline: "none", boxSizing: "border-box",
};
const lbl = { display: "block", marginBottom: 5, fontWeight: 600, fontSize: 13, color: "#1a1a2e", fontFamily: "'DM Sans',sans-serif" };
const card = {
  background: "#fff", borderRadius: 14, boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
  border: "1px solid #eee",
};
const infoBox = (color, border) => ({
  background: color, borderLeft: `4px solid ${border}`, padding: "12px 18px",
  borderRadius: "0 10px 10px 0", marginBottom: 20, fontFamily: "'DM Sans',sans-serif",
  fontSize: 13,
});
const btn = (bg, color) => ({
  padding: "10px 18px", borderRadius: 8, border: "none", cursor: "pointer",
  fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 600,
  background: bg, color, display: "inline-flex", alignItems: "center", gap: 6,
  transition: "all .15s",
});

// ─── FCFS Queue Engine ───────────────────────────────────────────────────────
// Finds the earliest available slot across all online printers

function findNextSlot(printers, jobs, duration) {
  const onlinePrinters = printers.filter(p => p.online);
  if (onlinePrinters.length === 0) return null;

  let best = null;

  for (const printer of onlinePrinters) {
    const pJobs = jobs
      .filter(j => j.printerId === printer.id && j.status !== "cancelled")
      .sort((a, b) => jobAbsoluteStart(a) - jobAbsoluteStart(b));

    // Start from now
    const now = new Date();
    let candidateStart = now.getTime();

    // Check each gap
    for (const job of pJobs) {
      const jStart = jobAbsoluteStart(job);
      const jEnd = jobAbsoluteEnd(job);
      if (candidateStart + duration * 3600000 <= jStart) {
        break; // Found a gap
      }
      if (jEnd > candidateStart) {
        candidateStart = jEnd;
      }
    }

    if (!best || candidateStart < best.startTime) {
      best = {
        printerId: printer.id,
        startTime: candidateStart,
        printerName: printer.name,
      };
    }
  }

  if (best) {
    const startDate = new Date(best.startTime);
    return {
      printerId: best.printerId,
      printerName: best.printerName,
      date: dk(startDate),
      startHour: startDate.getHours() + startDate.getMinutes() / 60,
      startTime: best.startTime,
    };
  }
  return null;
}

// ─── Home Page ───────────────────────────────────────────────────────────────

function HomePage({ printers, jobs, queue, onNavigate }) {
  const now = new Date();
  const ch = nowHour();
  const today = dk(now);

  function getStatus(p) {
    if (!p.online) return { text: "Offline", color: "#888" };
    const pJobs = jobs.filter(j => j.printerId === p.id && j.status !== "cancelled" && j.status !== "completed");
    // Check for active job (including overnight)
    const active = pJobs.find(j => {
      const js = jobAbsoluteStart(j);
      const je = jobAbsoluteEnd(j);
      return now.getTime() >= js && now.getTime() < je;
    });
    if (active) {
      const remaining = (jobAbsoluteEnd(active) - now.getTime()) / 3600000;
      return { text: `${fmtDuration(remaining)} remaining`, color: "#d4740e", job: active };
    }
    return { text: "Available now", color: "#22c55e" };
  }

  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: 36 }}>
        <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 34, color: "#1a1a2e", margin: "0 0 6px", fontWeight: 700 }}>
          Available Printers
        </h1>
        <p style={{ color: "#888", fontFamily: "'DM Sans',sans-serif", fontSize: 14 }}>
          First come, first served · {printers.filter(p=>p.online).length} printers online
        </p>
      </div>

      <div style={infoBox("#fef7ed", "#d4740e")}>
        <div style={{ color: "#6b4c1e" }}>
          <strong>How it works:</strong> Join the queue with your estimated print time and we'll assign you the next available printer automatically.
          Need a specific time? Use "Reserve a Slot" instead. Prints over 10 hours should be booked overnight (after 8 PM).
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16, marginBottom: 32 }}>
        {printers.map(p => {
          const s = getStatus(p);
          return (
            <div key={p.id} onClick={() => onNavigate("join")} style={{
              ...card, overflow: "hidden", cursor: "pointer", transition: "all .25s",
              opacity: p.online ? 1 : 0.55,
            }}
            onMouseEnter={e => { if (p.online) { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 28px rgba(0,0,0,0.1)"; }}}
            onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
            >
              <div style={{
                height: 120, background: p.online
                  ? "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)"
                  : "linear-gradient(135deg, #555 0%, #777 100%)",
                display: "flex", alignItems: "center", justifyContent: "center", position: "relative",
              }}>
                <div style={{ position: "absolute", inset: 0, opacity: 0.08, backgroundImage: "radial-gradient(circle at 30% 50%, #d4740e 0%, transparent 50%)" }}/>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={p.online ? "#d4740e" : "#999"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
                  <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
                </svg>
                <div style={{
                  position: "absolute", top: 10, right: 10, width: 10, height: 10, borderRadius: "50%",
                  background: p.online ? (s.color === "#22c55e" ? "#22c55e" : "#d4740e") : "#888",
                  boxShadow: `0 0 6px ${p.online ? s.color : "#888"}`,
                }}/>
                {!p.online && <div style={{
                  position: "absolute", bottom: 8, left: 0, right: 0, textAlign: "center",
                  color: "#fff", fontSize: 11, fontFamily: "'DM Sans',sans-serif", fontWeight: 600,
                  background: "rgba(0,0,0,0.4)", padding: "3px 0",
                }}>OFFLINE</div>}
              </div>
              <div style={{ padding: "14px 16px" }}>
                <h3 style={{ margin: "0 0 2px", fontFamily: "'Playfair Display',serif", fontSize: 16, color: "#1a1a2e" }}>{p.name}</h3>
                <div style={{ fontSize: 11, color: "#aaa", marginBottom: 8, fontFamily: "'DM Sans',sans-serif" }}>{p.model}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, color: s.color, fontSize: 12, fontFamily: "'DM Sans',sans-serif", fontWeight: 500 }}>
                  {I.clock} <span>{s.text}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick actions */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button onClick={() => onNavigate("join")} style={{
          ...btn("linear-gradient(135deg,#d4740e,#e8922e)", "#fff"),
          padding: "14px 28px", fontSize: 15, borderRadius: 10,
          boxShadow: "0 4px 16px rgba(212,116,14,0.25)",
        }}>
          {I.plus} Join the Queue
        </button>
        <button onClick={() => onNavigate("reserve")} style={{
          ...btn("#fff", "#1a1a2e"),
          padding: "14px 28px", fontSize: 15, borderRadius: 10,
          border: "1px solid #ddd",
        }}>
          {I.cal} Reserve a Specific Slot
        </button>
      </div>
    </div>
  );
}

// ─── Join Queue Page (FCFS Primary) ──────────────────────────────────────────

function JoinQueuePage({ printers, jobs, queue, onJoinQueue, showToast }) {
  const [name, setName] = useState("");
  const [compId, setCompId] = useState("");
  const [email, setEmail] = useState("");
  const [duration, setDuration] = useState("");
  const [isOvernight, setIsOvernight] = useState(false);

  const dur = parseFloat(duration) || 0;
  const slot = dur > 0 ? findNextSlot(printers, jobs, dur) : null;

  function handleSubmit() {
    if (!name || !compId || !email || !duration) { showToast("Please fill in all fields", "error"); return; }
    if (!email.endsWith("@virginia.edu")) { showToast("Please use a valid UVA email (@virginia.edu)", "error"); return; }
    if (dur < 0.25) { showToast("Minimum print time is 15 minutes", "error"); return; }
    if (dur > 10 && !isOvernight) { showToast("Prints over 10 hours must be booked overnight. Toggle the overnight option.", "warning"); return; }
    onJoinQueue({ name, compId, email, duration: dur, isOvernight });
    setName(""); setCompId(""); setEmail(""); setDuration(""); setIsOvernight(false);
  }

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 30, color: "#1a1a2e", margin: "0 0 4px" }}>Join the Print Queue</h1>
        <p style={{ color: "#888", fontFamily: "'DM Sans',sans-serif", fontSize: 14 }}>First come, first served — you'll get the next available printer</p>
      </div>

      <div style={infoBox("#fef7ed", "#d4740e")}>
        <div style={{ color: "#6b4c1e" }}>
          <strong>Smart Queue:</strong> We auto-assign you the earliest available slot across all printers.
          You'll be notified when your slot is approaching. Check in when you start printing.
        </div>
      </div>

      <div style={{ ...card, padding: 24, marginBottom: 20 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={lbl}>Full Name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="John Doe" style={inp} />
            </div>
            <div>
              <label style={lbl}>Computing ID</label>
              <input value={compId} onChange={e => setCompId(e.target.value)} placeholder="abc3de" style={inp} />
            </div>
          </div>
          <div>
            <label style={lbl}>UVA Email</label>
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="abc3de@virginia.edu" style={inp} type="email" />
          </div>
          <div>
            <label style={lbl}>Estimated Print Duration (hours)</label>
            <input value={duration} onChange={e => setDuration(e.target.value)} placeholder="2.5" style={inp} type="number" min="0.25" step="0.25" />
            <div style={{ fontSize: 11, color: "#aaa", marginTop: 4, fontFamily: "'DM Sans',sans-serif" }}>
              Min 15 min. Prints over 10h must be overnight.
            </div>
          </div>

          {dur > 10 && (
            <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "#f0f4ff", borderRadius: 10, cursor: "pointer" }}>
              <input type="checkbox" checked={isOvernight} onChange={e => setIsOvernight(e.target.checked)} style={{ width: 18, height: 18, accentColor: "#1a1a2e" }} />
              <div>
                <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>{I.moon} Book as Overnight Print</div>
                <div style={{ fontSize: 11, color: "#888", fontFamily: "'DM Sans',sans-serif" }}>Starts after 8 PM, runs through the night</div>
              </div>
            </label>
          )}

          {/* Preview assigned slot */}
          {slot && dur > 0 && (dur <= 10 || isOvernight) && (
            <div style={{
              padding: "14px 18px", background: "#f0f9f0", borderRadius: 10,
              border: "1px solid #c6e6c6",
            }}>
              <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "#2d4a27", fontWeight: 600, marginBottom: 4 }}>
                Your estimated slot:
              </div>
              <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 15, color: "#1a1a2e", fontWeight: 600 }}>
                {slot.printerName} · {fmtHour(slot.startHour)} on {slot.date === dk(new Date()) ? "Today" : slot.date}
              </div>
              <div style={{ fontSize: 11, color: "#888", marginTop: 2, fontFamily: "'DM Sans',sans-serif" }}>
                This is an estimate — actual slot depends on queue position at submission.
              </div>
            </div>
          )}

          <button onClick={handleSubmit} style={{
            ...btn("linear-gradient(135deg,#d4740e,#e8922e)", "#fff"),
            width: "100%", justifyContent: "center", padding: "14px", fontSize: 15,
            borderRadius: 10, boxShadow: "0 4px 16px rgba(212,116,14,0.25)",
          }}>
            Join Queue
          </button>
        </div>
      </div>

      {/* Current queue */}
      {queue.length > 0 && (
        <div>
          <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, color: "#1a1a2e", marginBottom: 12 }}>Current Queue ({queue.length})</h3>
          {queue.map((q, i) => (
            <div key={q.id} style={{ ...card, padding: "12px 16px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%", background: "#1a1a2e", color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 700, flexShrink: 0,
              }}>#{i + 1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>
                  {q.name} <span style={{ color: "#aaa", fontWeight: 400 }}>({q.compId})</span>
                </div>
                <div style={{ fontSize: 11, color: "#888", fontFamily: "'DM Sans',sans-serif" }}>
                  {fmtDuration(q.duration)} print · {q.assignedPrinter ? `→ ${q.assignedPrinter}` : "Waiting..."}
                </div>
              </div>
              {q.assignedPrinter && <span style={{
                padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600,
                background: "#f0f9f0", color: "#22c55e", fontFamily: "'DM Sans',sans-serif",
              }}>Assigned</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Reserve Specific Slot Page ──────────────────────────────────────────────

function ReservePage({ printers, jobs, onReserve, showToast }) {
  const [name, setName] = useState("");
  const [compId, setCompId] = useState("");
  const [email, setEmail] = useState("");
  const [duration, setDuration] = useState("");
  const [printerId, setPrinterId] = useState("");
  const [date, setDate] = useState(dk(new Date()));
  const [hour, setHour] = useState("");
  const [isOvernight, setIsOvernight] = useState(false);

  const dur = parseFloat(duration) || 0;
  const online = printers.filter(p => p.online);

  const dateOpts = Array.from({ length: 14 }, (_, i) => {
    const d = addDays(new Date(), i);
    return { key: dk(d), label: i === 0 ? "Today" : i === 1 ? "Tomorrow" : fmtDate(d) };
  });

  // Generate available hours (0-23.5 for full day if overnight enabled)
  function getSlots() {
    if (!printerId || dur <= 0) return [];
    const pJobs = jobs.filter(j => j.printerId === Number(printerId) && j.status !== "cancelled" && j.status !== "completed");
    const slots = [];
    const startRange = isOvernight ? 20 : 8; // overnight starts at 8PM
    const endRange = isOvernight ? 24 : 20;

    for (let h = startRange; h < endRange; h += 0.5) {
      // For the selected date, compute absolute times
      const selDate = new Date(date + "T00:00:00");
      const slotStart = selDate.getTime() + h * 3600000;
      const slotEnd = slotStart + dur * 3600000;

      // Skip past times for today
      if (date === dk(new Date()) && h < nowHour()) continue;

      const conflict = pJobs.some(j => {
        const js = jobAbsoluteStart(j);
        const je = jobAbsoluteEnd(j);
        return slotStart < je && slotEnd > js;
      });
      if (!conflict) slots.push(h);
    }
    return slots;
  }

  const slots = getSlots();

  function handleSubmit() {
    if (!name || !compId || !email || !duration || !printerId || hour === "") {
      showToast("Please fill in all fields and select a time slot", "error"); return;
    }
    if (!email.endsWith("@virginia.edu")) { showToast("Use a valid UVA email", "error"); return; }
    onReserve({ name, compId, email, duration: dur, printerId: Number(printerId), date, startHour: parseFloat(hour), isOvernight });
    setName(""); setCompId(""); setEmail(""); setDuration(""); setPrinterId(""); setHour("");
  }

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 30, color: "#1a1a2e", margin: "0 0 4px" }}>Reserve a Specific Slot</h1>
        <p style={{ color: "#888", fontFamily: "'DM Sans',sans-serif", fontSize: 14 }}>Pick your printer, date, and time</p>
      </div>

      <div style={infoBox("#f0f4ff", "#3d7ec7")}>
        <div style={{ color: "#1e3a5f" }}>
          <strong>Note:</strong> The general queue (FCFS) is recommended for fastest access. Use this if you need a specific printer or time.
        </div>
      </div>

      <div style={{ ...card, padding: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={lbl}>Full Name</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="John Doe" style={inp}/></div>
            <div><label style={lbl}>Computing ID</label><input value={compId} onChange={e=>setCompId(e.target.value)} placeholder="abc3de" style={inp}/></div>
          </div>
          <div><label style={lbl}>UVA Email</label><input value={email} onChange={e=>setEmail(e.target.value)} placeholder="abc3de@virginia.edu" style={inp} type="email"/></div>
          <div>
            <label style={lbl}>Print Duration (hours)</label>
            <input value={duration} onChange={e=>setDuration(e.target.value)} placeholder="2.5" style={inp} type="number" min="0.25" step="0.25"/>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
            <input type="checkbox" checked={isOvernight} onChange={e=>setIsOvernight(e.target.checked)} style={{ width: 16, height: 16, accentColor: "#1a1a2e" }}/>
            <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: "#555" }}>{I.moon} Overnight print (starts after 8 PM)</span>
          </label>

          <div>
            <label style={lbl}>Select Printer</label>
            <select value={printerId} onChange={e=>{setPrinterId(e.target.value);setHour("");}} style={{...inp,cursor:"pointer"}}>
              <option value="">Choose a printer...</option>
              {online.map(p => <option key={p.id} value={p.id}>{p.name} ({p.model})</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Select Date</label>
            <select value={date} onChange={e=>{setDate(e.target.value);setHour("");}} style={{...inp,cursor:"pointer"}}>
              {dateOpts.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
            </select>
          </div>

          {printerId && dur > 0 && (
            <div>
              <label style={lbl}>Available Time Slots</label>
              {slots.length === 0 ? (
                <div style={{ padding: 14, background: "#fef2f2", borderRadius: 8, color: "#991b1b", fontSize: 13, fontFamily: "'DM Sans',sans-serif" }}>
                  No slots available. Try a different printer, date, or toggle overnight.
                </div>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {slots.slice(0, 24).map(h => (
                    <button key={h} onClick={() => setHour(String(h))} style={{
                      padding: "7px 12px", borderRadius: 7, cursor: "pointer",
                      fontFamily: "'DM Sans',sans-serif", fontSize: 12,
                      border: hour === String(h) ? "2px solid #d4740e" : "1px solid #ddd",
                      background: hour === String(h) ? "#fef7ed" : "#fff",
                      color: hour === String(h) ? "#d4740e" : "#555",
                      fontWeight: hour === String(h) ? 600 : 400,
                    }}>
                      {fmtHour(h)}
                    </button>
                  ))}
                  {slots.length > 24 && <span style={{ fontSize: 12, color: "#aaa", alignSelf: "center" }}>+{slots.length - 24} more</span>}
                </div>
              )}
            </div>
          )}

          <button onClick={handleSubmit} style={{
            ...btn("#1a1a2e", "#fff"), width: "100%", justifyContent: "center",
            padding: "14px", fontSize: 15, borderRadius: 10,
          }}>
            Reserve Slot
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Schedule Page ───────────────────────────────────────────────────────────

function SchedulePage({ printers, jobs, onCheckIn, onCheckOut, onCancel, onReportFailure, onPoke, showToast }) {
  const [selDate, setSelDate] = useState(new Date());
  const [weekBase, setWeekBase] = useState(new Date());
  const week = getWeekDates(weekBase);
  const today = dk(new Date());
  const sd = dk(selDate);
  const ch = nowHour();

  // For schedule, show 24h (to support overnight)
  const scheduleHours = Array.from({ length: 24 }, (_, i) => i);
  const ROW_H = 48;

  const dayJobs = jobs.filter(j => {
    if (j.status === "cancelled") return false;
    // Show job on this day if it starts on this day OR spans into this day
    if (j.date === sd) return true;
    // Check if job from previous day spans into this day
    const je = jobAbsoluteEnd(j);
    const dayStart = new Date(sd + "T00:00:00").getTime();
    const dayEnd = dayStart + 86400000;
    const js = jobAbsoluteStart(j);
    return js < dayEnd && je > dayStart;
  });

  function getJobDisplay(job, printerId) {
    if (job.printerId !== printerId) return null;
    const dayStart = new Date(sd + "T00:00:00").getTime();
    const js = jobAbsoluteStart(job);
    const je = jobAbsoluteEnd(job);

    // Clip to current day view
    const visStart = Math.max(js, dayStart);
    const visEnd = Math.min(je, dayStart + 86400000);

    const startHourInDay = (visStart - dayStart) / 3600000;
    const durationInDay = (visEnd - visStart) / 3600000;

    const top = startHourInDay * ROW_H;
    const height = Math.max(durationInDay * ROW_H - 2, 20);

    const colors = {
      reserved: { bg: "#1e3a5f", text: "#fff" },
      checkedIn: { bg: "#d4740e", text: "#fff" },
      completed: { bg: "#4a6741", text: "#fff" },
      failed: { bg: "#842029", text: "#fff" },
    };
    const c = colors[job.status] || colors.reserved;
    return { top, height, bg: c.bg, text: c.text, startHourInDay, durationInDay };
  }

  const now = new Date();
  const isToday = sd === today;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 30, color: "#1a1a2e", margin: "0 0 4px" }}>Schedule</h1>
        <p style={{ color: "#888", fontFamily: "'DM Sans',sans-serif", fontSize: 14 }}>24-hour view · supports overnight prints</p>
      </div>

      {/* Week nav */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {week.map(d => {
            const isSel = dk(d) === sd;
            const isT = dk(d) === today;
            return (
              <button key={dk(d)} onClick={() => setSelDate(d)} style={{
                padding: "7px 12px", borderRadius: 7, border: "none", cursor: "pointer",
                fontFamily: "'DM Sans',sans-serif", fontSize: 12, fontWeight: 500,
                background: isSel ? "#d4740e" : isT ? "#fef7ed" : "#f3f3f3",
                color: isSel ? "#fff" : isT ? "#d4740e" : "#666",
              }}>
                {DAYS[d.getDay()]} {d.getDate()}
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button onClick={() => setWeekBase(addDays(weekBase,-7))} style={{ background: "none", border: "1px solid #ddd", borderRadius: 6, padding: "5px 7px", cursor: "pointer" }}>{I.left}</button>
          <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "#999", minWidth: 110, textAlign: "center" }}>
            {MONTHS[week[0].getMonth()]} {week[0].getDate()} – {week[6].getDate()}, {week[6].getFullYear()}
          </span>
          <button onClick={() => setWeekBase(addDays(weekBase,7))} style={{ background: "none", border: "1px solid #ddd", borderRadius: 6, padding: "5px 7px", cursor: "pointer" }}>{I.right}</button>
        </div>
      </div>

      <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 16, fontWeight: 600, color: "#1a1a2e", marginBottom: 12 }}>
        {fmtDate(selDate)}, {selDate.getFullYear()}
      </div>

      {/* Grid */}
      <div style={{ overflowX: "auto", borderRadius: 12, border: "1px solid #e0e0e0" }}>
        <div style={{ minWidth: 800 }}>
          {/* Header */}
          <div style={{ display: "grid", gridTemplateColumns: `60px repeat(${printers.length}, 1fr)`, background: "#1a1a2e" }}>
            <div style={{ padding: "10px 6px", color: "#888", fontFamily: "'DM Sans',sans-serif", fontSize: 11, fontWeight: 600 }}>Time</div>
            {printers.map(p => (
              <div key={p.id} style={{
                padding: "8px 10px", borderLeft: "1px solid #2a2a4e", textAlign: "center",
                opacity: p.online ? 1 : 0.5,
              }}>
                <div style={{ color: "#fff", fontFamily: "'DM Sans',sans-serif", fontSize: 12, fontWeight: 600 }}>{p.name}</div>
                <div style={{ color: p.online ? "#888" : "#ef4444", fontSize: 10 }}>{p.online ? p.model : "OFFLINE"}</div>
              </div>
            ))}
          </div>

          {/* Time rows */}
          <div style={{ position: "relative" }}>
            {scheduleHours.map(hour => (
              <div key={hour} style={{
                display: "grid", gridTemplateColumns: `60px repeat(${printers.length}, 1fr)`,
                borderBottom: "1px solid #f0f0f0",
                background: hour >= 20 || hour < 8 ? "#fafaf8" : "#fff",
              }}>
                <div style={{
                  padding: "6px 8px", height: ROW_H - 1, fontFamily: "'DM Sans',sans-serif",
                  fontSize: 11, color: "#bbb", fontWeight: 500,
                }}>
                  {fmtHour(hour)}
                </div>
                {printers.map(p => (
                  <div key={p.id} style={{ borderLeft: "1px solid #f0f0f0", height: ROW_H }}/>
                ))}
              </div>
            ))}

            {/* Render jobs */}
            {printers.map((p, pi) => {
              const pJobs = dayJobs.filter(j => j.printerId === p.id);
              return pJobs.map(job => {
                const d = getJobDisplay(job, p.id);
                if (!d) return null;
                const isActive = job.status === "checkedIn";
                const canCheckIn = job.status === "reserved" && isToday;
                const canCheckOut = job.status === "checkedIn";
                return (
                  <div key={job.id} style={{
                    position: "absolute",
                    top: d.top + 1,
                    left: `calc(60px + ${pi} * ((100% - 60px) / ${printers.length}) + 2px)`,
                    width: `calc((100% - 60px) / ${printers.length} - 4px)`,
                    height: d.height,
                    background: d.bg, color: d.text, borderRadius: 6,
                    padding: "6px 8px", fontSize: 11, fontFamily: "'DM Sans',sans-serif",
                    overflow: "hidden", zIndex: 2, cursor: "default",
                  }} title={`${job.name} (${job.compId}) — ${fmtDuration(job.duration)} — ${job.status}`}>
                    <div style={{ fontWeight: 600, fontSize: 11, lineHeight: 1.2 }}>{job.name}</div>
                    <div style={{ opacity: 0.75, fontSize: 10 }}>{job.compId} · {fmtDuration(job.duration)}</div>
                    {job.status === "checkedIn" && <div style={{ fontSize: 9, opacity: 0.7 }}>✓ Active</div>}
                    {job.status === "completed" && <div style={{ fontSize: 9, opacity: 0.7 }}>✓ Done</div>}
                    {job.status === "failed" && <div style={{ fontSize: 9, opacity: 0.7 }}>✕ Failed</div>}
                    {d.height > 60 && (canCheckIn || canCheckOut) && (
                      <div style={{ display: "flex", gap: 3, marginTop: 4, flexWrap: "wrap" }}>
                        {canCheckIn && <button onClick={() => onCheckIn(job.id)} style={{
                          background: "rgba(255,255,255,0.2)", border: "none", color: "#fff",
                          fontSize: 9, padding: "2px 5px", borderRadius: 3, cursor: "pointer",
                        }}>Check In</button>}
                        {canCheckOut && <button onClick={() => onCheckOut(job.id)} style={{
                          background: "rgba(255,255,255,0.2)", border: "none", color: "#fff",
                          fontSize: 9, padding: "2px 5px", borderRadius: 3, cursor: "pointer",
                        }}>Check Out</button>}
                        {canCheckOut && <button onClick={() => onPoke(job.id)} style={{
                          background: "rgba(255,255,255,0.15)", border: "none", color: "#fff",
                          fontSize: 9, padding: "2px 5px", borderRadius: 3, cursor: "pointer",
                        }}>Finish Early</button>}
                        {canCheckIn && <button onClick={() => onReportFailure(job.id)} style={{
                          background: "rgba(255,0,0,0.2)", border: "none", color: "#fff",
                          fontSize: 9, padding: "2px 5px", borderRadius: 3, cursor: "pointer",
                        }}>Failed</button>}
                      </div>
                    )}
                  </div>
                );
              });
            })}

            {/* Now line */}
            {isToday && ch >= 0 && ch <= 24 && (
              <div style={{
                position: "absolute", top: ch * ROW_H, left: 0, right: 0,
                height: 2, background: "#ef4444", zIndex: 3, boxShadow: "0 0 8px rgba(239,68,68,0.3)",
              }}>
                <div style={{ position: "absolute", left: 2, top: -4, width: 10, height: 10, borderRadius: "50%", background: "#ef4444" }}/>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{
        display: "flex", gap: 16, marginTop: 14, padding: "10px 16px", background: "#f9f9f9",
        borderRadius: 10, fontSize: 12, fontFamily: "'DM Sans',sans-serif", flexWrap: "wrap", alignItems: "center",
      }}>
        {[
          { l: "Reserved", c: "#1e3a5f" }, { l: "Active", c: "#d4740e" },
          { l: "Completed", c: "#4a6741" }, { l: "Failed", c: "#842029" },
        ].map(x => (
          <div key={x.l} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: x.c }}/><span style={{ color: "#888" }}>{x.l}</span>
          </div>
        ))}
        <div style={{ marginLeft: "auto", color: "#aaa", fontSize: 11 }}>
          Shaded rows = overnight hours (8 PM–8 AM)
        </div>
      </div>
    </div>
  );
}

// ─── Check-In / Check-Out Page ───────────────────────────────────────────────

function CheckInPage({ printers, jobs, onCheckIn, onCheckOut, onCancel, onReportFailure, onPoke, showToast }) {
  const [lookupId, setLookupId] = useState("");
  const now = new Date();
  const ch = nowHour();

  const myJobs = lookupId.trim()
    ? jobs.filter(j =>
        (j.compId?.toLowerCase() === lookupId.trim().toLowerCase() || j.email?.toLowerCase() === lookupId.trim().toLowerCase()) &&
        j.status !== "cancelled"
      ).sort((a, b) => jobAbsoluteStart(a) - jobAbsoluteStart(b))
    : [];

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 30, color: "#1a1a2e", margin: "0 0 4px" }}>Check In / Check Out</h1>
        <p style={{ color: "#888", fontFamily: "'DM Sans',sans-serif", fontSize: 14 }}>Manage your active prints</p>
      </div>

      <div style={infoBox("#fef7ed", "#d4740e")}>
        <div style={{ color: "#6b4c1e" }}>
          <strong>Check in</strong> when you start your print. <strong>Check out</strong> when finished — this frees the printer for the next person.
          If your print fails, report it and subsequent users will be notified of the delay.
        </div>
      </div>

      <div style={{ ...card, padding: 20, marginBottom: 20 }}>
        <label style={lbl}>Computing ID or Email</label>
        <input value={lookupId} onChange={e => setLookupId(e.target.value)} placeholder="abc3de or abc3de@virginia.edu" style={inp} />
      </div>

      {lookupId && myJobs.length === 0 && (
        <div style={{ padding: 28, textAlign: "center", background: "#f9f9f9", borderRadius: 14, color: "#aaa", fontFamily: "'DM Sans',sans-serif" }}>
          No reservations found.
        </div>
      )}

      {myJobs.map(job => {
        const printer = printers.find(p => p.id === job.printerId);
        const js = jobAbsoluteStart(job);
        const je = jobAbsoluteEnd(job);
        const isNow = now.getTime() >= js - 900000 && now.getTime() < je; // 15min before start
        const isPast = now.getTime() >= je;
        const canCheckIn = job.status === "reserved" && (isNow || now.getTime() >= js);
        const canCheckOut = job.status === "checkedIn";

        return (
          <div key={job.id} style={{
            ...card, padding: 18, marginBottom: 10,
            opacity: job.status === "completed" || isPast ? 0.5 : 1,
            borderLeft: canCheckIn ? "4px solid #d4740e" : canCheckOut ? "4px solid #22c55e" : "4px solid transparent",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 16, color: "#1a1a2e", marginBottom: 3 }}>
                  {printer?.name || "Unknown"} <span style={{ fontSize: 12, color: "#aaa", fontFamily: "'DM Sans',sans-serif" }}>({printer?.model})</span>
                </div>
                <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "#888" }}>
                  {job.date} · {fmtHour(job.startHour)} → {fmtHour(job.startHour + job.duration)} · {fmtDuration(job.duration)}
                </div>
              </div>
              <span style={{
                padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600,
                fontFamily: "'DM Sans',sans-serif",
                background: { reserved: "#f0f4ff", checkedIn: "#fef7ed", completed: "#f0f9f0", failed: "#fef2f2" }[job.status],
                color: { reserved: "#3d7ec7", checkedIn: "#d4740e", completed: "#22c55e", failed: "#ef4444" }[job.status],
              }}>
                {{ reserved: "Reserved", checkedIn: "Active", completed: "Done", failed: "Failed" }[job.status]}
              </span>
            </div>

            {(canCheckIn || canCheckOut) && (
              <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                {canCheckIn && <button onClick={() => onCheckIn(job.id)} style={btn("linear-gradient(135deg,#d4740e,#e8922e)", "#fff")}>
                  {I.check} Check In
                </button>}
                {canCheckOut && <button onClick={() => onCheckOut(job.id)} style={btn("#22c55e", "#fff")}>
                  {I.check} Check Out — Print Done
                </button>}
                {canCheckOut && <button onClick={() => onPoke(job.id)} style={btn("#f0f4ff", "#3d7ec7")}>
                  {I.poke} Finished Early — Notify Next
                </button>}
                {canCheckIn && <button onClick={() => onReportFailure(job.id)} style={btn("#fef2f2", "#ef4444")}>
                  {I.alert} Report Print Failure
                </button>}
                <button onClick={() => onCancel(job.id)} style={btn("#f5f5f5", "#999")}>
                  {I.x} Cancel
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Admin Page ──────────────────────────────────────────────────────────────

function AdminPage({ printers, onAddPrinter, onTogglePrinter, onRemovePrinter, jobs, showToast }) {
  const [newName, setNewName] = useState("");
  const [newModel, setNewModel] = useState("Bambu Lab X1C");

  function handleAdd() {
    if (!newName) { showToast("Enter a printer name", "error"); return; }
    onAddPrinter(newName, newModel);
    setNewName("");
  }

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 30, color: "#1a1a2e", margin: "0 0 4px" }}>Admin · Printer Management</h1>
        <p style={{ color: "#888", fontFamily: "'DM Sans',sans-serif", fontSize: 14 }}>Add, remove, or take printers offline</p>
      </div>

      {/* Add printer */}
      <div style={{ ...card, padding: 20, marginBottom: 24 }}>
        <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 17, color: "#1a1a2e", marginBottom: 14 }}>Add New Printer</h3>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 140 }}>
            <label style={lbl}>Name</label>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Printer 7" style={inp} />
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <label style={lbl}>Model</label>
            <select value={newModel} onChange={e => setNewModel(e.target.value)} style={{ ...inp, cursor: "pointer" }}>
              <option>Bambu Lab X1C</option>
              <option>Bambu Lab P1S</option>
              <option>Bambu Lab A1</option>
              <option>Bambu Lab A1 Mini</option>
            </select>
          </div>
          <button onClick={handleAdd} style={{ ...btn("#1a1a2e", "#fff"), padding: "11px 20px", whiteSpace: "nowrap" }}>
            {I.plus} Add Printer
          </button>
        </div>
      </div>

      {/* Printer list */}
      <div>
        <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 17, color: "#1a1a2e", marginBottom: 14 }}>
          All Printers ({printers.length})
        </h3>
        {printers.map(p => {
          const activeJobs = jobs.filter(j => j.printerId === p.id && (j.status === "reserved" || j.status === "checkedIn")).length;
          return (
            <div key={p.id} style={{
              ...card, padding: "14px 18px", marginBottom: 8,
              display: "flex", alignItems: "center", gap: 14,
              borderLeft: `4px solid ${p.online ? "#22c55e" : "#ef4444"}`,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 600, color: "#1a1a2e" }}>
                  {p.name} <span style={{ fontWeight: 400, color: "#aaa" }}>· {p.model}</span>
                </div>
                <div style={{ fontSize: 12, color: "#888", fontFamily: "'DM Sans',sans-serif" }}>
                  {activeJobs} active/upcoming jobs · {p.online ? "Online" : "Offline"}
                </div>
              </div>
              <button onClick={() => onTogglePrinter(p.id)} style={{
                ...btn(p.online ? "#fef2f2" : "#f0f9f0", p.online ? "#ef4444" : "#22c55e"),
                fontSize: 12, padding: "7px 14px",
              }}>
                {I.power} {p.online ? "Take Offline" : "Bring Online"}
              </button>
              {activeJobs === 0 && (
                <button onClick={() => onRemovePrinter(p.id)} style={{
                  ...btn("#f5f5f5", "#999"), fontSize: 12, padding: "7px 12px",
                }}>
                  {I.trash}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── Main App ─────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export default function App() {
  const [page, setPage] = useState("home");
  const [printers, setPrinters] = useState(INITIAL_PRINTERS);
  const [jobs, setJobs] = useState(() => {
    const t = dk(new Date());
    return [
      { id: uid(), name: "John Doe", compId: "jd3ab", email: "jd3ab@virginia.edu", printerId: 2, date: t, startHour: 9, duration: 2.5, status: "reserved", checkedIn: false },
      { id: uid(), name: "Alice Brown", compId: "ab4cd", email: "ab4cd@virginia.edu", printerId: 5, date: t, startHour: 8, duration: 3, status: "checkedIn", checkedIn: true },
      { id: uid(), name: "Bob Johnson", compId: "bj7ef", email: "bj7ef@virginia.edu", printerId: 4, date: t, startHour: 10, duration: 1.25, status: "reserved", checkedIn: false },
      { id: uid(), name: "Eve Wilson", compId: "ew2gh", email: "ew2gh@virginia.edu", printerId: 6, date: t, startHour: 10, duration: 1, status: "checkedIn", checkedIn: true },
      { id: uid(), name: "Emma Wilson", compId: "ew9ij", email: "ew9ij@virginia.edu", printerId: 3, date: t, startHour: 17, duration: 2, status: "reserved", checkedIn: false },
      { id: uid(), name: "Overnight Owl", compId: "oo1kl", email: "oo1kl@virginia.edu", printerId: 1, date: t, startHour: 21, duration: 11, status: "reserved", checkedIn: false },
    ];
  });
  const [queue, setQueue] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, type = "info") => setToast({ message: msg, type, key: Date.now() }), []);

  const addNotification = useCallback((message, type = "info") => {
    setNotifications(prev => [{
      id: uid(), message, type, read: false,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }, ...prev]);
  }, []);

  // ── FCFS Queue: Join ──
  function handleJoinQueue({ name, compId, email, duration, isOvernight }) {
    const slot = findNextSlot(printers, jobs, duration);
    if (!slot) {
      showToast("No printers available. Try again later.", "error");
      return;
    }

    let startHour = slot.startHour;
    let date = slot.date;

    // If overnight and start before 8PM, push to 8PM
    if (isOvernight && startHour < 20) {
      startHour = 20;
      // Re-check for conflicts at 8PM
    }

    const newJob = {
      id: uid(), name, compId, email, printerId: slot.printerId,
      date, startHour, duration, status: "reserved", checkedIn: false, fromQueue: true,
    };

    setJobs(prev => [...prev, newJob]);
    setQueue(prev => [...prev, {
      id: newJob.id, name, compId, email, duration,
      joinedAt: Date.now(), assignedPrinter: slot.printerName,
    }]);

    const printer = printers.find(p => p.id === slot.printerId);
    showToast(`Assigned to ${printer.name} at ${fmtHour(startHour)} on ${date === dk(new Date()) ? "today" : date}!`, "success");
    addNotification(`Your print has been assigned to ${printer.name} starting at ${fmtHour(startHour)}.`, "success");
  }

  // ── Reserve specific slot ──
  function handleReserve({ name, compId, email, duration, printerId, date, startHour }) {
    const newJob = {
      id: uid(), name, compId, email, printerId,
      date, startHour, duration, status: "reserved", checkedIn: false, fromQueue: false,
    };
    setJobs(prev => [...prev, newJob]);
    const printer = printers.find(p => p.id === printerId);
    showToast(`Reserved ${printer.name} at ${fmtHour(startHour)}!`, "success");
    addNotification(`Reservation confirmed: ${printer.name} at ${fmtHour(startHour)} on ${date}.`, "success");
    setPage("checkin");
  }

  // ── Check In ──
  function handleCheckIn(jobId) {
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: "checkedIn", checkedIn: true } : j));
    showToast("Checked in! Happy printing.", "success");
    addNotification("You've checked in. Your print is now active.", "success");
  }

  // ── Check Out (finished print) ──
  function handleCheckOut(jobId) {
    const job = jobs.find(j => j.id === jobId);
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: "completed" } : j));
    setQueue(prev => prev.filter(q => q.id !== jobId));
    showToast("Print completed! Printer is now free.", "success");

    // Notify next person in queue for this printer
    if (job) {
      const nextJob = jobs.find(j =>
        j.printerId === job.printerId && j.id !== jobId &&
        j.status === "reserved" &&
        jobAbsoluteStart(j) > Date.now()
      );
      if (nextJob) {
        addNotification(`${nextJob.name} (${nextJob.compId}): ${printers.find(p=>p.id===job.printerId)?.name} is now free! Your print is coming up.`, "poke");
      }
    }
  }

  // ── Cancel ──
  function handleCancel(jobId) {
    const job = jobs.find(j => j.id === jobId);
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: "cancelled" } : j));
    setQueue(prev => prev.filter(q => q.id !== jobId));
    showToast("Reservation cancelled.", "info");

    // Notify next user
    if (job) {
      const nextJob = jobs.find(j =>
        j.printerId === job.printerId && j.id !== jobId &&
        j.status === "reserved" &&
        jobAbsoluteStart(j) > jobAbsoluteStart(job)
      );
      if (nextJob) {
        addNotification(`${nextJob.name}: A slot before yours was cancelled on ${printers.find(p=>p.id===job.printerId)?.name}. You may be able to start earlier!`, "info");
      }
    }
  }

  // ── Report Failure (delay system) ──
  function handleReportFailure(jobId) {
    const failedJob = jobs.find(j => j.id === jobId);
    if (!failedJob) return;

    const failTime = Date.now();
    const scheduledEnd = jobAbsoluteEnd(failedJob);
    const delayMs = Math.min(scheduledEnd - failTime, 3600000); // max 1 hour delay
    const delayHours = delayMs / 3600000;

    // Mark failed
    setJobs(prev => {
      const updated = prev.map(j => {
        if (j.id === jobId) return { ...j, status: "failed" };
        // Slide back later jobs on same printer by delay amount
        if (j.printerId === failedJob.printerId && j.status === "reserved" && jobAbsoluteStart(j) >= failTime) {
          return { ...j, startHour: j.startHour + delayHours };
        }
        return j;
      });
      return updated;
    });

    setQueue(prev => prev.filter(q => q.id !== jobId));
    showToast(`Print failure reported. Later prints on this printer delayed by ~${fmtDuration(delayHours)}.`, "warning");
    addNotification(`Print failure on ${printers.find(p=>p.id===failedJob.printerId)?.name}. Subsequent prints have been delayed by ${fmtDuration(delayHours)}.`, "alert");

    // Notify affected users
    jobs.filter(j => j.printerId === failedJob.printerId && j.status === "reserved" && jobAbsoluteStart(j) >= failTime).forEach(j => {
      addNotification(`${j.name} (${j.compId}): Your print on ${printers.find(p=>p.id===j.printerId)?.name} has been delayed by ~${fmtDuration(delayHours)} due to a print failure.`, "alert");
    });
  }

  // ── Poke / Finish Early ──
  function handlePoke(jobId) {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;

    // Complete the job
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: "completed" } : j));
    setQueue(prev => prev.filter(q => q.id !== jobId));

    const printer = printers.find(p => p.id === job.printerId);
    showToast(`Print marked as finished early! Next user has been notified.`, "success");

    // Find and notify next user
    const nextJob = jobs.find(j =>
      j.printerId === job.printerId && j.id !== jobId &&
      j.status === "reserved" &&
      jobAbsoluteStart(j) > jobAbsoluteStart(job)
    );
    if (nextJob) {
      addNotification(`🎉 ${nextJob.name} (${nextJob.compId}): ${printer?.name} is free early! You can start your print now.`, "poke");
    }
    addNotification(`${printer?.name} freed up early by ${job.name}.`, "info");
  }

  // ── Admin: Add Printer ──
  function handleAddPrinter(name, model) {
    const maxId = Math.max(0, ...printers.map(p => p.id));
    setPrinters(prev => [...prev, { id: maxId + 1, name, model, online: true }]);
    showToast(`${name} added!`, "success");
    addNotification(`New printer added: ${name} (${model}).`, "info");
  }

  // ── Admin: Toggle Online/Offline ──
  function handleTogglePrinter(id) {
    const printer = printers.find(p => p.id === id);
    const goingOffline = printer?.online;
    setPrinters(prev => prev.map(p => p.id === id ? { ...p, online: !p.online } : p));

    if (goingOffline) {
      // Notify affected users
      const affected = jobs.filter(j => j.printerId === id && (j.status === "reserved" || j.status === "checkedIn"));
      affected.forEach(j => {
        addNotification(`⚠️ ${j.name} (${j.compId}): ${printer.name} has been taken offline. Please contact the Fablab to reschedule.`, "alert");
      });
      showToast(`${printer.name} taken offline. ${affected.length} user(s) notified.`, "warning");
    } else {
      showToast(`${printer.name} is back online!`, "success");
      addNotification(`${printer.name} is back online and available for prints.`, "success");
    }
  }

  // ── Admin: Remove Printer ──
  function handleRemovePrinter(id) {
    const printer = printers.find(p => p.id === id);
    setPrinters(prev => prev.filter(p => p.id !== id));
    showToast(`${printer?.name} removed.`, "info");
  }

  const navItems = [
    { key: "home", label: "Home", icon: I.printer },
    { key: "join", label: "Join Queue", icon: I.users },
    { key: "reserve", label: "Reserve", icon: I.cal },
    { key: "schedule", label: "Schedule", icon: I.cal },
    { key: "checkin", label: "Check In/Out", icon: I.check },
    { key: "admin", label: "Admin", icon: I.settings },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f5f4f0", fontFamily: "'DM Sans',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        @keyframes slideIn{from{transform:translateX(100px);opacity:0}to{transform:translateX(0);opacity:1}}
        input:focus,select:focus{border-color:#d4740e!important;box-shadow:0 0 0 3px rgba(212,116,14,0.1)}
        select{appearance:auto}
        ::-webkit-scrollbar{width:6px;height:6px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#ccc;border-radius:3px}
      `}</style>

      {/* Header */}
      <header style={{
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%)",
        padding: "14px 24px", position: "sticky", top: 0, zIndex: 100,
        boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => setPage("home")}>
            <div style={{
              width: 34, height: 34, borderRadius: 8, background: "#d4740e",
              display: "flex", alignItems: "center", justifyContent: "center", color: "#fff",
            }}>{I.printer}</div>
            <div>
              <div style={{ fontFamily: "'Playfair Display',serif", color: "#fff", fontSize: 16, fontWeight: 700, letterSpacing: 0.3 }}>
                Fablab 3D Printer Queue
              </div>
              <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, fontFamily: "'DM Sans',sans-serif" }}>University of Virginia</div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <nav style={{ display: "flex", gap: 1 }}>
              {navItems.map(item => (
                <button key={item.key} onClick={() => setPage(item.key)} style={{
                  padding: "7px 13px", borderRadius: 7, border: "none", cursor: "pointer",
                  fontFamily: "'DM Sans',sans-serif", fontSize: 12, fontWeight: 500,
                  background: page === item.key ? "#d4740e" : "transparent",
                  color: page === item.key ? "#fff" : "rgba(255,255,255,0.65)",
                  display: "flex", alignItems: "center", gap: 5, transition: "all .2s", whiteSpace: "nowrap",
                }}
                onMouseEnter={e => { if (page !== item.key) e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
                onMouseLeave={e => { if (page !== item.key) e.currentTarget.style.background = "transparent"; }}
                >{item.icon}{item.label}</button>
              ))}
            </nav>
            <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.15)", margin: "0 6px" }}/>
            <NotificationBell
              notifications={notifications}
              onClear={() => setNotifications([])}
              onDismiss={id => setNotifications(prev => prev.filter(n => n.id !== id))}
            />
          </div>
        </div>
      </header>

      {/* Content */}
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 20px" }}>
        {page === "home" && <HomePage printers={printers} jobs={jobs} queue={queue} onNavigate={setPage} />}
        {page === "join" && <JoinQueuePage printers={printers} jobs={jobs} queue={queue} onJoinQueue={handleJoinQueue} showToast={showToast} />}
        {page === "reserve" && <ReservePage printers={printers} jobs={jobs} onReserve={handleReserve} showToast={showToast} />}
        {page === "schedule" && <SchedulePage printers={printers} jobs={jobs} onCheckIn={handleCheckIn} onCheckOut={handleCheckOut} onCancel={handleCancel} onReportFailure={handleReportFailure} onPoke={handlePoke} showToast={showToast} />}
        {page === "checkin" && <CheckInPage printers={printers} jobs={jobs} onCheckIn={handleCheckIn} onCheckOut={handleCheckOut} onCancel={handleCancel} onReportFailure={handleReportFailure} onPoke={handlePoke} showToast={showToast} />}
        {page === "admin" && <AdminPage printers={printers} onAddPrinter={handleAddPrinter} onTogglePrinter={handleTogglePrinter} onRemovePrinter={handleRemovePrinter} jobs={jobs} showToast={showToast} />}
      </main>

      <footer style={{
        textAlign: "center", padding: "20px", color: "#bbb",
        fontFamily: "'DM Sans',sans-serif", fontSize: 11,
        borderTop: "1px solid #e8e8e8", marginTop: 32,
      }}>
        UVA Fablab · 3D Printer Queue System · {new Date().getFullYear()}
      </footer>

      {toast && <Toast key={toast.key} message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}