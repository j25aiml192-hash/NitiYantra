"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { fetchComplaints, ComplaintResponse } from "@/lib/api";

/* ─── helpers ─── */
function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  if (isNaN(then)) return "Unknown";
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() &&
    d.getMonth() === n.getMonth() &&
    d.getDate() === n.getDate();
}

function isThisWeek(dateStr: string): boolean {
  const d = new Date(dateStr).getTime();
  return Date.now() - d <= 7 * 24 * 60 * 60 * 1000;
}

/* ─── palette ─── */
const PALETTE = {
  Roads:         { bg: "#FFF7ED", text: "#C2410C", accent: "#EA580C", icon: "🛣" },
  "Water Supply": { bg: "#EFF6FF", text: "#1D4ED8", accent: "#2563EB", icon: "💧" },
  Electricity:   { bg: "#FEFCE8", text: "#A16207", accent: "#CA8A04", icon: "⚡" },
  Sanitation:    { bg: "#F0FDF4", text: "#15803D", accent: "#16A34A", icon: "♻️" },
  "Public Safety": { bg: "#FEF2F2", text: "#B91C1C", accent: "#DC2626", icon: "🛡" },
  Other:         { bg: "#F8FAFC", text: "#475569", accent: "#64748B", icon: "📋" },
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  pending:     { label: "Pending",     bg: "bg-[var(--bg)]",   text: "text-[var(--text-secondary)]",   dot: "bg-slate-400" },
  in_progress: { label: "In Progress", bg: "bg-sky-50",     text: "text-sky-700",     dot: "bg-sky-500" },
  resolved:    { label: "Resolved",    bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  escalated:   { label: "Escalated",   bg: "bg-rose-50",    text: "text-rose-700",    dot: "bg-rose-500" },
  delayed:     { label: "Delayed",     bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-500" },
};

const SOURCE_ICONS: Record<string, string> = {
  PORTAL: "🌐", WHATSAPP: "💬", MOBILE_APP: "📱", EMAIL: "📧", PHONE: "📞",
};

type FilterTab = "all" | "today" | "week";

/* ─── main ─── */
export default function ActivityPage() {
  const router = useRouter();
  const [complaints, setComplaints] = useState<ComplaintResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchComplaints();
      const sorted = [...(Array.isArray(data) ? data : [])].sort(
        (a, b) => new Date(b.date_submitted).getTime() - new Date(a.date_submitted).getTime()
      );
      setComplaints(sorted);
      setError(null);
    } catch {
      setError("Unable to load complaints. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  const filtered = complaints.filter((c) => {
    if (filter === "today") return isToday(c.date_submitted);
    if (filter === "week") return isThisWeek(c.date_submitted);
    return true;
  });

  /* ─── stats ─── */
  const stats = useMemo(() => {
    const pending = filtered.filter(c => c.status === "pending").length;
    const inProgress = filtered.filter(c => c.status === "in_progress").length;
    const resolved = filtered.filter(c => c.status === "resolved").length;
    const escalated = filtered.filter(c => c.status === "escalated" || c.status === "delayed").length;
    return { total: filtered.length, pending, inProgress, resolved, escalated };
  }, [filtered]);

  const TABS: { key: FilterTab; label: string; count?: number }[] = [
    { key: "all", label: "All Activity", count: complaints.length },
    { key: "today", label: "Today" },
    { key: "week", label: "This Week" },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <main className="p-6 space-y-5 max-w-5xl mx-auto">

        {/* ═══ HEADER ═══ */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-bold text-[var(--text)] tracking-tight">Live Feed</h1>
            <p className="text-[13px] text-[var(--text-muted)] mt-0.5">Real-time complaint activity across all districts</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-[12px] text-[var(--text-muted)] bg-[var(--card)] border border-[var(--border)] rounded-xl px-3 py-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Live • {complaints.length} records
            </div>
          </div>
        </div>

        {/* ═══ STAT CARDS ═══ */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total", value: stats.total, color: "#4338CA", border: "#6366F1", icon: "📊" },
            { label: "Pending", value: stats.pending, color: "#B45309", border: "#F59E0B", icon: "⏳" },
            { label: "In Progress", value: stats.inProgress, color: "#0F766E", border: "#14B8A6", icon: "🔄" },
            { label: "Escalated", value: stats.escalated, color: "#BE123C", border: "#F43F5E", icon: "🔺" },
          ].map(s => (
            <div
              key={s.label}
              className="bg-[var(--card)] rounded-xl p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
              style={{ borderLeft: `3px solid ${s.border}` }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">{s.label}</p>
                <span className="text-base">{s.icon}</span>
              </div>
              <p className="text-[28px] font-extrabold leading-none" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* ═══ FILTER TABS ═══ */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1 bg-[var(--card)] border border-[var(--border)] rounded-xl p-1 shadow-sm">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setFilter(t.key)}
                className={`px-4 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-200 flex items-center gap-2 cursor-pointer ${
                  filter === t.key
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg)]"
                }`}
              >
                {t.label}
                {t.count !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    filter === t.key ? "bg-[var(--card)]/20 text-white" : "bg-[var(--border)] text-[var(--text-muted)]"
                  }`}>{t.count}</span>
                )}
              </button>
            ))}
          </div>
          <p className="text-[12px] text-[var(--text-muted)]">
            Showing <span className="font-semibold text-[var(--text-secondary)]">{filtered.length}</span> items
          </p>
        </div>

        {/* ═══ LOADING ═══ */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 animate-pulse">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[var(--border)] flex-shrink-0" />
                  <div className="flex-1 space-y-2.5">
                    <div className="h-4 bg-[var(--border)] rounded-lg w-2/3" />
                    <div className="h-3 bg-[var(--bg)] rounded-lg w-4/5" />
                    <div className="flex gap-2">
                      <div className="h-5 bg-[var(--bg)] rounded-full w-16" />
                      <div className="h-5 bg-[var(--bg)] rounded-full w-20" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ═══ ERROR ═══ */}
        {!loading && error && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-8 text-center">
            <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-sm text-rose-700 font-semibold">{error}</p>
            <button onClick={load} className="mt-3 px-4 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-medium hover:bg-rose-700 transition-all cursor-pointer">
              Retry
            </button>
          </div>
        )}

        {/* ═══ EMPTY ═══ */}
        {!loading && !error && filtered.length === 0 && (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-16 text-center">
            <div className="w-14 h-14 bg-[var(--border)] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-[var(--text-secondary)] font-semibold mb-1">No activity found</p>
            <p className="text-[var(--text-muted)] text-sm">No complaints match the selected filter.</p>
          </div>
        )}

        {/* ═══ TIMELINE ═══ */}
        {!loading && !error && filtered.length > 0 && (
          <div className="space-y-2">
            {filtered.map((c, idx) => {
              const cat = PALETTE[c.category as keyof typeof PALETTE] || PALETTE.Other;
              const st = STATUS_CONFIG[c.status] || STATUS_CONFIG.pending;
              const srcIcon = SOURCE_ICONS[c.source?.toUpperCase()] || "📋";
              const isHovered = hoveredId === c.id;

              return (
                <div
                  key={c.id}
                  onClick={() => router.push("/complaints")}
                  onMouseEnter={() => setHoveredId(c.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className="group cursor-pointer rounded-xl border transition-all duration-300"
                  style={{
                    background: isHovered ? `linear-gradient(135deg, ${cat.bg}, #ffffff)` : "#ffffff",
                    borderColor: isHovered ? cat.accent + "30" : "#e2e8f0",
                    boxShadow: isHovered
                      ? `0 8px 25px ${cat.accent}12, 0 2px 8px rgba(0,0,0,0.04)`
                      : "0 1px 3px rgba(0,0,0,0.03)",
                    transform: isHovered ? "translateY(-1px)" : "translateY(0)",
                    animation: `feedSlideIn 0.4s ease-out ${idx * 0.03}s both`,
                  }}
                >
                  <div className="p-4 flex gap-3.5">
                    {/* Category Icon */}
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110"
                      style={{ background: cat.bg, border: `1px solid ${cat.accent}20` }}
                    >
                      <span className="text-base">{cat.icon}</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[13px] font-semibold text-[var(--text)]">
                            New complaint in {c.district}
                          </span>
                          {/* Category Badge */}
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{ background: cat.bg, color: cat.text, border: `1px solid ${cat.accent}25` }}
                          >
                            {c.category}
                          </span>
                          {/* Status Badge */}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${st.bg} ${st.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                            {st.label}
                          </span>
                        </div>
                        <span className="text-[11px] text-[var(--text-muted)] whitespace-nowrap font-medium flex-shrink-0">
                          {timeAgo(c.date_submitted)}
                        </span>
                      </div>

                      <p className="text-[13px] text-[var(--text-muted)] leading-relaxed line-clamp-1 mb-2">
                        {c.text}
                      </p>

                      {/* Footer chips */}
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-[10px] text-[var(--text-muted)] bg-[var(--bg)] px-2 py-0.5 rounded-full font-medium border border-[var(--border)]">
                          {srcIcon} {c.source}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)] font-mono bg-[var(--bg)] px-2 py-0.5 rounded-full border border-[var(--border)]">
                          #{c.id}
                        </span>
                        {/* Priority indicator */}
                        {(c.status === "escalated" || c.status === "delayed") && (
                          <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100 animate-pulse">
                            ⚠ Urgent
                          </span>
                        )}
                        {/* Hover arrow */}
                        <span className="ml-auto text-[var(--text-muted)] group-hover:text-[var(--text-muted)] transition-all duration-300 group-hover:translate-x-1 text-sm">
                          →
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <style>{`
        @keyframes feedSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .line-clamp-1 {
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}
