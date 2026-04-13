"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { updateIssueStatus } from "@/lib/api";
import toast from "react-hot-toast";

const API = process.env.NEXT_PUBLIC_API_URL || "https://nityantra-backend.onrender.com";

/* ── Department map ── */
const DEPT: Record<number, { name: string; icon: string; color: string }> = {
  1:  { name: "PWD",            icon: "🛣️", color: "#1E293B" },
  2:  { name: "Jal Board",      icon: "💧", color: "#0EA5E9" },
  3:  { name: "DESU",           icon: "⚡", color: "#F59E0B" },
  4:  { name: "MCD",            icon: "🧹", color: "#22C55E" },
  5:  { name: "Delhi Police",   icon: "🛡️", color: "#8B5CF6" },
  21: { name: "PWD",            icon: "🛣️", color: "#1E293B" },
  22: { name: "Jal Board",      icon: "💧", color: "#0EA5E9" },
  23: { name: "DESU",           icon: "⚡", color: "#F59E0B" },
  24: { name: "MCD",            icon: "🧹", color: "#22C55E" },
  25: { name: "Delhi Police",   icon: "🛡️", color: "#8B5CF6" },
};
const getDept = (id: number) => DEPT[id] || { name: "General", icon: "📋", color: "#64748B" };

/* ── Interfaces ── */
interface DelayedIssue {
  issue_id: number;
  complaint_id: number;
  department_id: number;
  status: string;
  days_open: number;
  last_updated: string | null;
  is_delayed: boolean;
}
interface ComplaintDetail {
  id: number; text: string; source: string; date_submitted: string;
  district: string; category: string; status: string;
  department_id: number | null; assigned_to: number | null;
  assigned_at: string | null; escalated: boolean; escalation_reason: string | null;
}

/* ── Severity ── */
function getSev(d: number) {
  if (d >= 15) return { label: "Critical", color: "#DC2626", bg: "#FEF2F2", border: "#FECACA" };
  if (d >= 7)  return { label: "Warning",  color: "#D97706", bg: "#FFFBEB", border: "#FDE68A" };
  return               { label: "Normal",   color: "#059669", bg: "#ECFDF5", border: "#A7F3D0" };
}

/* ── CountUp ── */
function Num({ value }: { value: number }) {
  const [n, setN] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const s = prev.current, diff = value - s;
    if (!diff) return;
    const t0 = performance.now();
    const go = (now: number) => {
      const p = Math.min((now - t0) / 1200, 1);
      setN(Math.round(s + diff * (1 - Math.pow(1 - p, 4))));
      if (p < 1) requestAnimationFrame(go); else prev.current = value;
    };
    requestAnimationFrame(go);
  }, [value]);
  return <>{n}</>;
}

/* ── Helpers ── */
const fmtDate = (d: string | null) => {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return "—"; }
};
const timeAgo = (d: string | null) => {
  if (!d) return "Unknown";
  try {
    const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
    if (days === 0) return "Today";
    return days === 1 ? "Yesterday" : `${days}d ago`;
  } catch { return "Unknown"; }
};

/* ═══════════════════════════════════════════════════════ */
export default function IssuesPage() {
  const [issues, setIssues] = useState<DelayedIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [resolvingId, setResolvingId] = useState<number | null>(null);
  const [filter, setFilter] = useState<"all" | "critical" | "warning" | "normal">("all");
  const [search, setSearch] = useState("");
  const [sortDir, setSortDir] = useState<"desc" | "asc" | "dept">("desc");
  const [selected, setSelected] = useState<DelayedIssue | null>(null);
  const [detail, setDetail] = useState<ComplaintDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  /* ── Fetch ── */
  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      let parsed: DelayedIssue[] = [];
      const r1 = await fetch(`${API}/ai/delays`);
      if (r1.ok) {
        const d = await r1.json();
        const arr = Array.isArray(d?.delayed_issues ?? d) ? (d?.delayed_issues ?? d) : [];
        parsed = arr.map((i: Record<string, unknown>) => ({
          issue_id: (i.issue_id ?? i.id) as number,
          complaint_id: (i.complaint_id ?? 0) as number,
          department_id: (i.department_id ?? 0) as number,
          status: (i.status ?? "open") as string,
          days_open: (i.days_open ?? 0) as number,
          last_updated: (i.last_updated ?? i.assigned_date ?? null) as string | null,
          is_delayed: (i.is_delayed ?? true) as boolean,
        }));
      }
      if (!parsed.length) {
        const r2 = await fetch(`${API}/issues/delayed`);
        if (r2.ok) {
          const d2 = await r2.json();
          parsed = (Array.isArray(d2) ? d2 : []).map((i: Record<string, unknown>) => ({
            issue_id: (i.issue_id ?? i.id) as number,
            complaint_id: (i.complaint_id ?? 0) as number,
            department_id: (i.department_id ?? 0) as number,
            status: (i.status ?? "open") as string,
            days_open: (i.days_open ?? 0) as number,
            last_updated: (i.last_updated ?? i.assigned_date ?? null) as string | null,
            is_delayed: (i.is_delayed ?? true) as boolean,
          }));
        }
      }
      parsed.sort((a, b) => b.days_open - a.days_open);
      setIssues(parsed);
      setLastRefresh(new Date());
    } catch { toast.error("Failed to load delayed issues"); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const handleResolve = async (id: number) => {
    setResolvingId(id);
    try {
      await updateIssueStatus(id, "resolved");
      setTimeout(() => {
        setIssues(p => p.filter(i => i.issue_id !== id));
        if (selected?.issue_id === id) setSelected(null);
      }, 400);
      toast.success(`ISS-${String(id).padStart(3, "0")} resolved`);
    } catch { toast.error("Failed to resolve"); }
    finally { setResolvingId(null); }
  };

  const openDrawer = async (issue: DelayedIssue) => {
    setSelected(issue); setLoadingDetail(true); setDetail(null);
    try {
      const r = await fetch(`${API}/complaints/${issue.complaint_id}`);
      if (r.ok) setDetail(await r.json());
    } catch { /* */ }
    setLoadingDetail(false);
  };

  /* ── Derived ── */
  const q = search.toLowerCase().trim();
  const visible = issues
    .filter(i => {
      if (filter === "critical") return i.days_open >= 15;
      if (filter === "warning") return i.days_open >= 7 && i.days_open < 15;
      if (filter === "normal") return i.days_open < 7;
      return true;
    })
    .filter(i => !q || `ISS-${String(i.issue_id).padStart(3, "0")}`.toLowerCase().includes(q) || getDept(i.department_id).name.toLowerCase().includes(q))
    .sort((a, b) => {
      if (sortDir === "asc") return a.days_open - b.days_open;
      if (sortDir === "dept") return getDept(a.department_id).name.localeCompare(getDept(b.department_id).name);
      return b.days_open - a.days_open;
    });

  const critCount = issues.filter(i => i.days_open >= 15).length;
  const warnCount = issues.filter(i => i.days_open >= 7 && i.days_open < 15).length;
  const avgDays   = issues.length ? Math.round(issues.reduce((s, i) => s + i.days_open, 0) / issues.length) : 0;
  const minsAgo   = Math.max(0, Math.round((Date.now() - lastRefresh.getTime()) / 60000));

  const f = "'Inter', system-ui, sans-serif";

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", fontFamily: f }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes drawerIn { from { transform:translateX(100%); opacity:0; } to { transform:translateX(0); opacity:1; } }
        @keyframes shimmer { from { background-position:-200% 0; } to { background-position:200% 0; } }
        @keyframes pulse-ring { 0% { box-shadow: 0 0 0 0 rgba(220,38,38,0.3); } 70% { box-shadow: 0 0 0 6px rgba(220,38,38,0); } 100% { box-shadow: 0 0 0 0 rgba(220,38,38,0); } }
      `}</style>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 24px 48px" }}>

        {/* ─── Header ─── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, animation: "fadeUp 0.4s ease-out both" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: critCount > 0 ? "#DC2626" : "#059669", animation: critCount > 0 ? "pulse-ring 2s ease infinite" : "none" }} />
              <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", letterSpacing: -0.5, margin: 0 }}>SLA Breach Monitor</h1>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0, paddingLeft: 18 }}>
              Delayed issues requiring ministerial attention
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)", padding: "5px 12px", borderRadius: 8, background: "var(--card)", border: "1px solid var(--border)" }}>
              {minsAgo === 0 ? "Just now" : `${minsAgo}m ago`}
            </span>
            <button onClick={() => load(true)} disabled={refreshing} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 10,
              background: "var(--card)", border: "1px solid var(--border)", cursor: "pointer",
              fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", fontFamily: f,
              opacity: refreshing ? 0.5 : 1, transition: "all 0.2s",
            }}>
              <svg style={{ width: 13, height: 13, animation: refreshing ? "spin 1s linear infinite" : "none" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {refreshing ? "Syncing…" : "Refresh"}
            </button>
          </div>
        </div>

        {/* ─── Critical Alert ─── */}
        {!loading && critCount > 0 && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 18px", borderRadius: 12, marginBottom: 20,
            background: "linear-gradient(135deg, #FEF2F2, #FFF1F2)", border: "1px solid #FECACA",
            animation: "fadeUp 0.45s ease-out both",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <svg style={{ width: 16, height: 16, color: "#DC2626", flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#991B1B" }}>
                {critCount} critical breach{critCount > 1 ? "es" : ""} — immediate escalation required
              </span>
            </div>
            <button onClick={() => setFilter("critical")} style={{
              fontSize: 11, fontWeight: 600, color: "#DC2626", background: "none", border: "none",
              cursor: "pointer", fontFamily: f, textDecoration: "underline", textUnderlineOffset: 2,
            }}>View Critical →</button>
          </div>
        )}

        {/* ─── Stats Row ─── */}
        {!loading && issues.length > 0 && (
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1,
            background: "var(--border)", borderRadius: 14, overflow: "hidden",
            marginBottom: 20, animation: "fadeUp 0.5s ease-out both",
          }}>
            {[
              { label: "Total Breaches", val: issues.length, color: "#4F46E5" },
              { label: "Critical", val: critCount, color: "#DC2626" },
              { label: "Warning", val: warnCount, color: "#D97706" },
              { label: "Avg Days Open", val: avgDays, color: "#64748B" },
            ].map(s => (
              <div key={s.label} style={{ background: "var(--card)", padding: "20px 16px", textAlign: "center" }}>
                <p style={{ fontSize: 28, fontWeight: 800, color: s.color, margin: "0 0 2px", fontVariantNumeric: "tabular-nums", letterSpacing: -1 }}>
                  <Num value={s.val} />
                </p>
                <p style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, margin: 0 }}>{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* ─── Toolbar ─── */}
        {!loading && (
          <div style={{
            display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
            marginBottom: 16, animation: "fadeUp 0.55s ease-out both",
          }}>
            {/* Filter tabs */}
            <div style={{ display: "inline-flex", borderRadius: 10, overflow: "hidden", border: "1px solid var(--border)" }}>
              {([
                { key: "all" as const, label: "All", count: issues.length },
                { key: "critical" as const, label: "Critical", count: critCount },
                { key: "warning" as const, label: "Warning", count: warnCount },
                { key: "normal" as const, label: "Normal", count: issues.length - critCount - warnCount },
              ]).map(tab => (
                <button key={tab.key} onClick={() => setFilter(tab.key)} style={{
                  padding: "7px 14px", fontSize: 12, fontWeight: 600, fontFamily: f,
                  border: "none", cursor: "pointer", transition: "all 0.15s",
                  background: filter === tab.key ? "var(--text)" : "var(--card)",
                  color: filter === tab.key ? "var(--card)" : "var(--text-muted)",
                }}>
                  {tab.label} <span style={{ opacity: 0.6, marginLeft: 3 }}>{tab.count}</span>
                </button>
              ))}
            </div>

            {/* Sort */}
            <select value={sortDir} onChange={e => setSortDir(e.target.value as "desc"|"asc"|"dept")} style={{
              padding: "7px 12px", borderRadius: 10, border: "1px solid var(--border)",
              fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", background: "var(--card)",
              cursor: "pointer", fontFamily: f, outline: "none",
            }}>
              <option value="desc">Days Open ↓</option>
              <option value="asc">Days Open ↑</option>
              <option value="dept">Department</option>
            </select>

            {/* Search */}
            <div style={{ flex: 1, minWidth: 160, position: "relative" }}>
              <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "var(--text-muted)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search ID or department…"
                style={{
                  width: "100%", padding: "7px 12px 7px 32px", borderRadius: 10,
                  border: "1px solid var(--border)", fontSize: 12, color: "var(--text)",
                  background: "var(--bg)", fontFamily: f, outline: "none",
                }}
              />
            </div>

            <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}>
              {visible.length} of {issues.length}
            </span>
          </div>
        )}

        {/* ─── Loading skeletons ─── */}
        {loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{
                height: 64, borderRadius: 12, background: "linear-gradient(90deg, var(--card) 25%, var(--bg) 50%, var(--card) 75%)",
                backgroundSize: "400% 100%", animation: "shimmer 1.8s ease infinite",
                border: "1px solid var(--border)",
              }} />
            ))}
          </div>
        )}

        {/* ─── Issue Table ─── */}
        {!loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {visible.length === 0 && (
              <div style={{ textAlign: "center", padding: "64px 0", animation: "fadeUp 0.5s ease-out both" }}>
                <div style={{
                  width: 56, height: 56, borderRadius: "50%", background: "#ECFDF5",
                  border: "1px solid #A7F3D0", display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 16px",
                }}>
                  <svg style={{ width: 24, height: 24, color: "#059669" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", margin: "0 0 4px" }}>All clear</p>
                <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>No SLA breaches match your filters</p>
              </div>
            )}
            {visible.map((issue, idx) => {
              const sev = getSev(issue.days_open);
              const dept = getDept(issue.department_id);
              const isActive = selected?.issue_id === issue.issue_id;
              return (
                <div key={issue.issue_id} onClick={() => openDrawer(issue)} style={{
                  display: "grid", gridTemplateColumns: "4px 1fr", borderRadius: 12,
                  background: isActive ? "var(--accent-light)" : "var(--card)",
                  border: `1px solid ${isActive ? "var(--accent)" : "var(--border)"}`,
                  cursor: "pointer", transition: "all 0.2s ease",
                  animation: `fadeUp 0.35s ease-out ${idx * 30}ms both`,
                  overflow: "hidden",
                }}>
                  {/* Color bar */}
                  <div style={{ background: sev.color, borderRadius: "12px 0 0 12px" }} />

                  {/* Content */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", gap: 16 }}>
                    {/* Left: ID + Dept */}
                    <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", margin: 0, fontFamily: "'GeistMono', 'SF Mono', monospace" }}>
                          ISS-{String(issue.issue_id).padStart(3, "0")}
                        </p>
                        <p style={{ fontSize: 10, color: "var(--text-muted)", margin: 0 }}>CMP-{String(issue.complaint_id).padStart(3, "0")}</p>
                      </div>
                    </div>

                    {/* Department */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 14 }}>{dept.icon}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>{dept.name}</span>
                    </div>

                    {/* Status pill */}
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 6,
                      textTransform: "capitalize",
                      background: issue.status === "resolved" ? "#ECFDF5" : issue.status === "escalated" ? "#FEF2F2" : issue.status === "in_progress" ? "#FFFBEB" : "#EFF6FF",
                      color: issue.status === "resolved" ? "#059669" : issue.status === "escalated" ? "#DC2626" : issue.status === "in_progress" ? "#D97706" : "#2563EB",
                      border: `1px solid ${issue.status === "resolved" ? "#A7F3D0" : issue.status === "escalated" ? "#FECACA" : issue.status === "in_progress" ? "#FDE68A" : "#BFDBFE"}`,
                    }}>
                      {issue.status.replace("_", " ")}
                    </span>

                    {/* Severity badge */}
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
                      background: sev.bg, color: sev.color, border: `1px solid ${sev.border}`,
                      textTransform: "uppercase", letterSpacing: 0.5,
                    }}>{sev.label}</span>

                    {/* Days open */}
                    <div style={{ textAlign: "right", minWidth: 48 }}>
                      <p style={{ fontSize: 20, fontWeight: 800, color: sev.color, margin: 0, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{issue.days_open}</p>
                      <p style={{ fontSize: 9, color: "var(--text-muted)", margin: 0, textTransform: "uppercase", letterSpacing: 0.5 }}>days</p>
                    </div>

                    {/* Chevron */}
                    <svg style={{ width: 14, height: 14, color: "var(--text-muted)", flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══ Detail Drawer ═══ */}
      {selected && (() => {
        const sev = getSev(selected.days_open);
        const dept = getDept(selected.department_id);
        const resolving = resolvingId === selected.issue_id;
        return (
          <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", justifyContent: "flex-end" }} onClick={() => setSelected(null)}>
            <div style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.18)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }} />
            <div onClick={e => e.stopPropagation()} style={{
              position: "relative", width: "100%", maxWidth: 420, height: "100%",
              background: "var(--card)", borderLeft: "1px solid var(--border)",
              boxShadow: "-20px 0 60px rgba(0,0,0,0.1)", overflowY: "auto",
              animation: "drawerIn 0.25s ease-out",
            }}>
              {/* ── Severity accent bar at top ── */}
              <div style={{ height: 3, background: `linear-gradient(90deg, ${sev.color}, ${sev.color}55)` }} />

              {/* ── Drawer header ── */}
              <div style={{
                position: "sticky", top: 0, zIndex: 10, background: "var(--card)",
                borderBottom: "1px solid var(--border)", padding: "14px 20px",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{
                    fontSize: 13, fontWeight: 700, color: "var(--text)",
                    fontFamily: "'GeistMono', monospace", letterSpacing: -0.3,
                  }}>
                    ISS-{String(selected.issue_id).padStart(3, "0")}
                  </span>
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 6,
                    background: sev.bg, color: sev.color, border: `1px solid ${sev.border}`,
                    textTransform: "uppercase", letterSpacing: 0.5,
                  }}>{sev.label}</span>
                </div>
                <button onClick={() => setSelected(null)} style={{
                  width: 28, height: 28, borderRadius: 8, border: "1px solid var(--border)", cursor: "pointer",
                  background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "background 0.15s",
                }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--border)"}
                  onMouseLeave={e => e.currentTarget.style.background = "var(--bg)"}
                >
                  <svg style={{ width: 12, height: 12, color: "var(--text-muted)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div style={{ padding: "20px 20px 28px", display: "flex", flexDirection: "column", gap: 22 }}>

                {/* ── Complaint text ── */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                    <svg style={{ width: 12, height: 12, color: "var(--text-muted)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                    <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1.2, margin: 0 }}>Complaint</p>
                  </div>
                  {loadingDetail ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {[100, 80, 50].map((w, i) => (
                        <div key={i} style={{
                          height: 14, borderRadius: 6, width: `${w}%`,
                          background: "linear-gradient(90deg, var(--bg) 25%, var(--border) 50%, var(--bg) 75%)",
                          backgroundSize: "400% 100%", animation: "shimmer 1.8s ease infinite",
                        }} />
                      ))}
                    </div>
                  ) : detail ? (
                    <>
                      <div style={{
                        padding: "14px 16px", borderRadius: 12, background: "var(--bg)",
                        borderLeft: `3px solid ${sev.color}`, fontSize: 13, lineHeight: 1.75,
                        color: "var(--text)", fontStyle: "normal",
                      }}>
                        {detail.text}
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                        {detail.category && (
                          <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 6, background: "var(--accent-light)", color: "var(--accent)", border: "1px solid rgba(79,70,229,0.15)" }}>
                            {detail.category}
                          </span>
                        )}
                        {detail.district && (
                          <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 6, background: "var(--bg)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
                            📍 {detail.district}
                          </span>
                        )}
                        {detail.source && (
                          <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 6, background: "rgba(99,102,241,0.06)", color: "#6366F1", border: "1px solid rgba(99,102,241,0.15)" }}>
                            {detail.source}
                          </span>
                        )}
                      </div>
                      {detail.date_submitted && (
                        <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8, display: "flex", alignItems: "center", gap: 4 }}>
                          <svg style={{ width: 10, height: 10 }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          Filed {fmtDate(detail.date_submitted)}
                        </p>
                      )}
                    </>
                  ) : (
                    <p style={{ fontSize: 13, color: "var(--text-muted)", fontStyle: "italic" }}>Details unavailable</p>
                  )}
                </div>

                {/* ── Accountability ── */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                    <svg style={{ width: 12, height: 12, color: "var(--text-muted)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1.2, margin: 0 }}>Accountability</p>
                  </div>
                  <div style={{ borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>
                    {[
                      { k: "Department", v: <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span>{dept.icon}</span><span style={{ fontWeight: 600, fontSize: 12 }}>{dept.name}</span></span> },
                      { k: "Status", v: <span style={{
                        fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 6, textTransform: "capitalize" as const,
                        background: selected.status === "escalated" ? "rgba(220,38,38,0.06)" : selected.status === "resolved" ? "rgba(16,185,129,0.06)" : "rgba(37,99,235,0.06)",
                        color: selected.status === "escalated" ? "#DC2626" : selected.status === "resolved" ? "#059669" : "#2563EB",
                        border: `1px solid ${selected.status === "escalated" ? "rgba(220,38,38,0.15)" : selected.status === "resolved" ? "rgba(16,185,129,0.15)" : "rgba(37,99,235,0.15)"}`,
                      }}>{selected.status.replace("_", " ")}</span> },
                      { k: "Days Open", v: <span style={{ fontSize: 15, fontWeight: 800, color: sev.color, letterSpacing: -0.5 }}>{selected.days_open}</span> },
                      { k: "Last Updated", v: <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)" }}>{timeAgo(selected.last_updated)}</span> },
                    ].map((row, i, arr) => (
                      <div key={row.k} style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "11px 14px", background: i % 2 === 0 ? "var(--card)" : "var(--bg)",
                        borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none",
                      }}>
                        <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}>{row.k}</span>
                        <span style={{ fontSize: 12, color: "var(--text)" }}>{row.v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Actions — refined, subtle style ── */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                    <svg style={{ width: 12, height: 12, color: "var(--text-muted)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1.2, margin: 0 }}>Actions</p>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <button onClick={() => handleResolve(selected.issue_id)} disabled={resolving} style={{
                      width: "100%", padding: "11px 0", borderRadius: 10,
                      border: "1px solid rgba(5,150,105,0.2)",
                      background: "rgba(5,150,105,0.06)", color: "#059669", fontSize: 13, fontWeight: 600,
                      cursor: resolving ? "wait" : "pointer", opacity: resolving ? 0.6 : 1,
                      fontFamily: f, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      transition: "all 0.2s",
                    }}
                      onMouseEnter={e => { if (!resolving) { e.currentTarget.style.background = "#059669"; e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "#059669"; } }}
                      onMouseLeave={e => { e.currentTarget.style.background = "rgba(5,150,105,0.06)"; e.currentTarget.style.color = "#059669"; e.currentTarget.style.borderColor = "rgba(5,150,105,0.2)"; }}
                    >
                      {resolving ? "Resolving…" : "✓ Mark Resolved"}
                    </button>
                    <button onClick={() => { toast.success("Escalated to CM Office"); setSelected(null); }} style={{
                      width: "100%", padding: "11px 0", borderRadius: 10,
                      border: "1px solid rgba(220,38,38,0.2)",
                      background: "rgba(220,38,38,0.06)", color: "#DC2626", fontSize: 13, fontWeight: 600,
                      cursor: "pointer", fontFamily: f, transition: "all 0.2s",
                    }}
                      onMouseEnter={e => { e.currentTarget.style.background = "#DC2626"; e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "#DC2626"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "rgba(220,38,38,0.06)"; e.currentTarget.style.color = "#DC2626"; e.currentTarget.style.borderColor = "rgba(220,38,38,0.2)"; }}
                    >
                      ↑ Escalate to CM Office
                    </button>
                    <button onClick={() => toast.success("Status update requested")} style={{
                      width: "100%", padding: "11px 0", borderRadius: 10,
                      border: "1px solid var(--border)",
                      background: "var(--bg)", color: "var(--text-secondary)", fontSize: 13, fontWeight: 600,
                      cursor: "pointer", fontFamily: f, transition: "all 0.2s",
                    }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                    >
                      Request Status Update
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
