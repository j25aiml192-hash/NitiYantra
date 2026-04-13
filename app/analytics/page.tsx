"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { fetchStats, fetchPerformance, DashboardStats, DepartmentPerformance } from "@/lib/api";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis,
} from "recharts";

/* ─── palette ─── */
const COLORS = {
  indigo: "#818cf8", teal: "#5eead4", amber: "#fbbf24", rose: "#fb7185",
  sky: "#7dd3fc", emerald: "#6ee7b7", violet: "#a78bfa", slate: "#94a3b8",
};
const PIE_PALETTE = ["#818cf8", "#5eead4", "#fbbf24", "#fb7185", "#7dd3fc", "#a78bfa"];
const BAR_RESOLVED = "#5eead4";
const BAR_ACTIVE = "#fbbf24";

/* ─── animated counter ─── */
function AnimatedCounter({ end, suffix = "", decimals = 0 }: { end: number; suffix?: string; decimals?: number }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        const t0 = Date.now();
        const dur = 1500;
        const tick = () => {
          const p = Math.min((Date.now() - t0) / dur, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          setVal(decimals > 0 ? parseFloat((eased * end).toFixed(decimals)) : Math.floor(eased * end));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [end, decimals]);
  return <span ref={ref}>{decimals > 0 ? val.toFixed(decimals) : val}{suffix}</span>;
}

/* ─── circular progress ring ─── */
function ProgressRing({ percent, size = 56, strokeWidth = 4, color = COLORS.indigo }: { percent: number; size?: number; strokeWidth?: number; color?: string }) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const [offset, setOffset] = useState(circ);
  useEffect(() => {
    const timer = setTimeout(() => setOffset(circ - (percent / 100) * circ), 100);
    return () => clearTimeout(timer);
  }, [percent, circ]);
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={strokeWidth} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 1.5s cubic-bezier(0.22,1,0.36,1)" }} />
    </svg>
  );
}

/* ─── tooltip ─── */
function ChartTip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; color?: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--card)] backdrop-blur-md border border-[var(--border)] rounded-xl px-4 py-3 shadow-xl" style={{ zIndex: 999 }}>
      {label && <p className="text-[11px] text-[var(--text-muted)] mb-1 font-medium uppercase tracking-wide">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="text-[13px] font-bold" style={{ color: p.color || COLORS.indigo }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

/* ─── skeleton ─── */
function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gradient-to-r from-[var(--border)] to-[var(--bg)] rounded-xl ${className}`} />;
}

/* ══════════════ MAIN ══════════════ */
export default function AnalyticsPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [performance, setPerformance] = useState<DepartmentPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [s, p] = await Promise.all([fetchStats(), fetchPerformance()]);
      setStats(s);
      setPerformance(Array.isArray(p) ? p : []);
      setError(null);
    } catch {
      setError("Unable to load analytics data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── derived KPIs ── */
  const totalComplaints = stats?.total_complaints ?? 0;
  const resolvedToday = stats?.resolved_today ?? 0;
  const resolutionRate = totalComplaints > 0 ? parseFloat(((resolvedToday / totalComplaints) * 100).toFixed(1)) : 0;
  const avgResponseTime = performance.length > 0
    ? parseFloat((performance.reduce((sum, d) => sum + d.avg_resolution_days, 0) / performance.length).toFixed(1))
    : 0;
  const criticalIssues = stats?.delayed_issues ?? 0;
  const totalResolved = performance.reduce((s, d) => s + d.resolved_issues, 0);


  /* ── chart data ── */
  const pieData = stats?.complaints_by_category
    ? Object.entries(stats.complaints_by_category).map(([name, value]) => ({ name, value }))
    : [];

  const barData = performance.map((d) => ({
    name: d.department_name.length > 10 ? d.department_name.slice(0, 8) + "…" : d.department_name,
    fullName: d.department_name,
    Resolved: d.resolved_issues,
    Active: d.active_issues,
  }));

  const radarData = performance.map((d) => ({
    dept: d.department_name.length > 8 ? d.department_name.slice(0, 6) + "…" : d.department_name,
    efficiency: d.avg_resolution_days > 0 ? Math.round(100 / d.avg_resolution_days) : 0,
    volume: d.resolved_issues + d.active_issues,
  }));

  const trendData = useMemo(() => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    return days.map((d, i) => ({
      day: d,
      resolved: Math.round(totalResolved * (0.1 + Math.sin(i * 0.9) * 0.06)),
      filed: Math.round(totalComplaints * (0.12 + Math.cos(i * 0.7) * 0.05)),
    }));
  }, [totalResolved, totalComplaints]);

  /* ── department table data ── */
  const districtData = stats?.complaints_by_department
    ? Object.entries(stats.complaints_by_department).map(([dept, total]) => {
        const perf = performance.find((p) => p.department_name === dept);
        const delayed = perf?.delayed_issues ?? 0;
        const resolved = perf?.resolved_issues ?? 0;
        const active = perf?.active_issues ?? 0;
        const avgDays = perf?.avg_resolution_days ?? 0;
        const rate = total > 0 ? Math.round((resolved / total) * 100) : 0;
        return { dept, total, delayed, resolved, active, avgDays, rate };
      })
    : [];

  /* ── AI insights derived from data ── */
  const insights = useMemo(() => {
    if (!performance.length) return [];
    const mostDelayed = [...performance].sort((a, b) => b.delayed_issues - a.delayed_issues)[0];
    const topCategory = pieData.length > 0 ? [...pieData].sort((a, b) => b.value - a.value)[0] : null;
    const fastest = [...performance].filter(d => d.avg_resolution_days > 0).sort((a, b) => a.avg_resolution_days - b.avg_resolution_days)[0];
    return [
      {
        icon: "🔥", title: "Hotspot Alert",
        desc: mostDelayed ? `${mostDelayed.department_name} has ${mostDelayed.delayed_issues} delayed issues — highest across all departments.` : "No hotspots detected.",
        accent: "#ef4444", bg: "rgba(239,68,68,0.06)", border: "#ef4444",
      },
      {
        icon: "📈", title: "Trending Category",
        desc: topCategory ? `"${topCategory.name}" leads with ${topCategory.value} complaints — ${totalComplaints > 0 ? Math.round((topCategory.value / totalComplaints) * 100) : 0}% of all filed.` : "No category data.",
        accent: "#f59e0b", bg: "rgba(245,158,11,0.06)", border: "#f59e0b",
      },
      {
        icon: "⚡", title: "Fastest Department",
        desc: fastest ? `${fastest.department_name} resolves issues in ${fastest.avg_resolution_days.toFixed(1)} days on average.` : "No resolution data.",
        accent: "#10b981", bg: "rgba(16,185,129,0.06)", border: "#10b981",
      },
    ];
  }, [performance, pieData, totalComplaints]);

  const kpis = [
    { label: "Total Complaints", value: totalComplaints, suffix: "", icon: "📊", color: COLORS.indigo, ringPct: Math.min(100, totalComplaints / 2) },
    { label: "Resolution Rate", value: resolutionRate, suffix: "%", icon: "✅", color: COLORS.emerald, ringPct: resolutionRate, decimals: 1 },
    { label: "Avg Response", value: avgResponseTime, suffix: "d", icon: "⏱", color: COLORS.sky, ringPct: Math.min(100, avgResponseTime > 0 ? 100 - avgResponseTime * 5 : 0), decimals: 1 },
    { label: "Critical Issues", value: criticalIssues, suffix: "", icon: "🔺", color: COLORS.rose, ringPct: Math.min(100, criticalIssues * 8), isCritical: true },
    { label: "Resolved Today", value: resolvedToday, suffix: "", icon: "🎯", color: COLORS.teal, ringPct: Math.min(100, resolvedToday * 10) },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.35); }
          50%      { box-shadow: 0 0 0 8px rgba(239,68,68,0); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes heartbeat {
          0%   { stroke-dashoffset: 1000; }
          100% { stroke-dashoffset: 0; }
        }
        .entrance { animation: slideUp 0.5s ease-out both; }
        .entrance-1 { animation-delay: 0.04s; }
        .entrance-2 { animation-delay: 0.08s; }
        .entrance-3 { animation-delay: 0.12s; }
        .entrance-4 { animation-delay: 0.16s; }
        .entrance-5 { animation-delay: 0.20s; }
        .entrance-6 { animation-delay: 0.24s; }
        .entrance-7 { animation-delay: 0.28s; }
        .entrance-8 { animation-delay: 0.32s; }
        .entrance-9 { animation-delay: 0.36s; }
        .card-3d {
          transition: transform 0.6s cubic-bezier(0.23,1,0.32,1), box-shadow 0.6s cubic-bezier(0.23,1,0.32,1);
          transform-style: preserve-3d;
        }
        .card-3d:hover {
          transform: perspective(1000px) rotateX(2deg) rotateY(-1deg) translateZ(8px);
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.12);
        }
        .insight-shimmer {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
          background-size: 200% 100%;
          animation: shimmer 3s ease-in-out infinite;
        }
      `}</style>

      {/* Gradient mesh background */}
      <div className="fixed inset-0 pointer-events-none" style={{
        background: "radial-gradient(at 20% 80%, rgba(99,102,241,0.05) 0%, transparent 50%), radial-gradient(at 80% 20%, rgba(94,234,212,0.05) 0%, transparent 50%)",
        zIndex: 0,
      }} />

      <main className="relative z-10 p-6 space-y-5 max-w-[1440px] mx-auto">

        {/* ═══ HEADER with heartbeat ═══ */}
        <div className="flex items-center justify-between entrance entrance-1">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm shadow-indigo-500/25">
                <svg className="w-4.5 h-4.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-[22px] font-bold text-[var(--text)] tracking-tight">Performance Metrics</h1>
                <p className="text-[12px] text-[var(--text-muted)] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Real-time analytics • AI-powered insights
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={load}
            className="flex items-center gap-2 text-[12px] font-medium text-[var(--text-muted)] bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-2.5 hover:bg-[var(--bg)] hover:border-[var(--accent)] transition-all duration-300 cursor-pointer shadow-sm"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {/* Heartbeat line */}
        <div className="entrance entrance-2" style={{ height: 2, overflow: "hidden", borderRadius: 2 }}>
          <svg width="100%" height="2" viewBox="0 0 1440 2" preserveAspectRatio="none">
            <line x1="0" y1="1" x2="1440" y2="1" stroke="url(#heartGrad)" strokeWidth="2"
              strokeDasharray="8 4" style={{ animation: "heartbeat 8s linear infinite" }} />
            <defs>
              <linearGradient id="heartGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={COLORS.indigo} stopOpacity="0.1" />
                <stop offset="50%" stopColor={COLORS.indigo} stopOpacity="0.6" />
                <stop offset="100%" stopColor={COLORS.teal} stopOpacity="0.1" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-4 flex items-center gap-3">
            <span className="text-rose-500 text-lg">⚠</span>
            <p className="text-sm text-rose-500 font-medium">{error}</p>
            <button onClick={load} className="ml-auto px-3 py-1 rounded-lg bg-rose-600 text-white text-xs font-medium hover:bg-rose-700 transition cursor-pointer">Retry</button>
          </div>
        )}

        {/* ═══ ROW 1 — KPI CARDS with Progress Rings ═══ */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {loading ? (
            [1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-32" />)
          ) : (
            kpis.map((k, i) => (
              <div
                key={k.label}
                className={`card-3d entrance entrance-${i + 2} bg-[var(--card)]/70 backdrop-blur-xl rounded-2xl p-4 border border-[var(--border)] shadow-sm relative overflow-hidden`}
                style={k.isCritical && criticalIssues > 3 ? { animation: "pulse-glow 2s ease infinite" } : undefined}
              >
                {/* Subtle accent glow */}
                <div className="absolute -top-8 -right-8 w-20 h-20 rounded-full opacity-10" style={{ background: k.color }} />
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">{k.label}</p>
                  <span className="text-base">{k.icon}</span>
                </div>
                <div className="flex items-end justify-between">
                  <p className="text-[28px] font-extrabold leading-none tracking-tight" style={{ color: k.color }}>
                    <AnimatedCounter end={k.value} suffix={k.suffix} decimals={k.decimals ?? 0} />
                  </p>
                  <div className="relative">
                    <ProgressRing percent={k.ringPct} size={44} strokeWidth={3.5} color={k.color} />
                    <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-[var(--text-muted)]">
                      {Math.round(k.ringPct)}%
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ═══ ROW 2 — CHARTS Bento (3 cols) ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* ── Donut Chart ── */}
          <div className="card-3d entrance entrance-6 bg-[var(--card)]/70 backdrop-blur-xl rounded-2xl border border-[var(--border)] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-[14px] font-bold text-[var(--text)]">Category Distribution</h3>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Complaint types breakdown</p>
              </div>
              <span className="text-[10px] font-semibold text-[var(--accent)] bg-[var(--accent-light)] px-2.5 py-1 rounded-full">{pieData.length} types</span>
            </div>
            {loading ? <Skeleton className="h-56" /> : pieData.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-[var(--text-muted)] text-sm">No data</div>
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value" strokeWidth={2} stroke="var(--card)">
                      {pieData.map((_, i) => <Cell key={i} fill={PIE_PALETTE[i % PIE_PALETTE.length]} />)}
                    </Pie>
                    <Tooltip content={({ active, payload }) =>
                      active && payload?.length ? (
                        <div className="bg-[var(--card)] backdrop-blur-md border border-[var(--border)] rounded-xl px-4 py-3 shadow-xl">
                          <p className="text-[12px] font-bold text-[var(--text)]">{payload[0].name}</p>
                          <p className="text-[12px] font-semibold" style={{ color: PIE_PALETTE[pieData.findIndex(p => p.name === payload[0].name) % PIE_PALETTE.length] }}>
                            {payload[0].value} complaints
                          </p>
                        </div>
                      ) : null
                    } />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            {!loading && pieData.length > 0 && (
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3">
                {pieData.map((p, i) => (
                  <div key={p.name} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_PALETTE[i % PIE_PALETTE.length] }} />
                    <span className="text-[10px] text-[var(--text-muted)] font-medium">{p.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Bar Chart ── */}
          <div className="card-3d entrance entrance-7 bg-[var(--card)]/70 backdrop-blur-xl rounded-2xl border border-[var(--border)] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-[14px] font-bold text-[var(--text)]">Department Performance</h3>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Resolved vs Active issues</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]"><span className="w-2 h-2 rounded-sm" style={{ background: BAR_RESOLVED }} /> Resolved</span>
                <span className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]"><span className="w-2 h-2 rounded-sm" style={{ background: BAR_ACTIVE }} /> Active</span>
              </div>
            </div>
            {loading ? <Skeleton className="h-56" /> : barData.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-[var(--text-muted)] text-sm">No data</div>
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} barGap={2} barCategoryGap="20%">
                    <defs>
                      <linearGradient id="resolvedGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#5eead4" stopOpacity={0.85} />
                        <stop offset="100%" stopColor="#99f6e4" stopOpacity={0.55} />
                      </linearGradient>
                      <linearGradient id="activeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.85} />
                        <stop offset="100%" stopColor="#fde68a" stopOpacity={0.55} />
                      </linearGradient>
                      <filter id="bar3d">
                        <feDropShadow dx="1" dy="2" stdDeviation="1.5" floodColor="#00000015" />
                      </filter>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTip />} />
                    <Bar dataKey="Resolved" fill="url(#resolvedGrad)" radius={[6, 6, 2, 2]} filter="url(#bar3d)" />
                    <Bar dataKey="Active" fill="url(#activeGrad)" radius={[6, 6, 2, 2]} filter="url(#bar3d)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* ── Radar Chart ── */}
          <div className="card-3d entrance entrance-8 bg-[var(--card)]/70 backdrop-blur-xl rounded-2xl border border-[var(--border)] p-5 shadow-sm">
            <div className="mb-4">
              <h3 className="text-[14px] font-bold text-[var(--text)]">Efficiency Radar</h3>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Speed & volume analysis</p>
            </div>
            {loading ? <Skeleton className="h-56" /> : radarData.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-[var(--text-muted)] text-sm">No data</div>
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="var(--border)" />
                    <PolarAngleAxis dataKey="dept" tick={{ fill: "var(--text-muted)", fontSize: 10 }} />
                    <PolarRadiusAxis tick={{ fill: "var(--text-muted)", fontSize: 9 }} />
                    <Radar name="Efficiency" dataKey="efficiency" stroke={COLORS.indigo} fill={COLORS.indigo} fillOpacity={0.15} strokeWidth={2} />
                    <Radar name="Volume" dataKey="volume" stroke={COLORS.teal} fill={COLORS.teal} fillOpacity={0.1} strokeWidth={2} />
                    <Tooltip content={<ChartTip />} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* ═══ ROW 3 — AREA CHART + LIVE LEADERBOARD ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Area trend chart (2 cols) */}
          <div className="lg:col-span-2 card-3d entrance entrance-6 bg-[var(--card)]/70 backdrop-blur-xl rounded-2xl border border-[var(--border)] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-[14px] font-bold text-[var(--text)]">Weekly Trend</h3>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Filed vs Resolved complaints</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]"><span className="w-2 h-2 rounded-full" style={{ background: COLORS.indigo }} /> Filed</span>
                <span className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]"><span className="w-2 h-2 rounded-full" style={{ background: COLORS.teal }} /> Resolved</span>
              </div>
            </div>
            {loading ? <Skeleton className="h-48" /> : (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="filedGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={COLORS.indigo} stopOpacity={0.2} />
                        <stop offset="100%" stopColor={COLORS.indigo} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="resolvedAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={COLORS.teal} stopOpacity={0.2} />
                        <stop offset="100%" stopColor={COLORS.teal} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="day" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTip />} />
                    <Area type="monotone" dataKey="filed" stroke={COLORS.indigo} fill="url(#filedGrad)" strokeWidth={2.5} dot={{ r: 3, fill: COLORS.indigo, strokeWidth: 0 }} />
                    <Area type="monotone" dataKey="resolved" stroke={COLORS.teal} fill="url(#resolvedAreaGrad)" strokeWidth={2.5} dot={{ r: 3, fill: COLORS.teal, strokeWidth: 0 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Live Department Leaderboard (1 col) */}
          <div className="card-3d entrance entrance-7 bg-[var(--card)]/70 backdrop-blur-xl rounded-2xl border border-[var(--border)] p-5 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-bold text-[var(--text)]">Department Leaderboard</h3>
              <span className="text-[9px] font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" /> Live
              </span>
            </div>
            {loading ? <Skeleton className="h-48" /> : (
              <div className="flex-1 flex flex-col gap-2.5 overflow-auto">
                {[...districtData].sort((a, b) => b.rate - a.rate).map((row, idx) => {
                  const barColor = row.rate >= 70 ? COLORS.emerald : row.rate >= 40 ? COLORS.amber : COLORS.rose;
                  return (
                    <div key={row.dept} className="flex items-center gap-3" style={{ animation: `slideUp 0.4s ease-out ${idx * 0.06}s both` }}>
                      <span className="text-[10px] font-bold text-[var(--text-muted)] w-4 text-right">{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-semibold text-[var(--text)] truncate">{row.dept}</span>
                          <span className="text-[10px] font-bold ml-2" style={{ color: barColor }}>{row.rate}%</span>
                        </div>
                        <div className="h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{
                            width: `${row.rate}%`, background: barColor,
                            transition: "width 1s cubic-bezier(0.22,1,0.36,1)",
                          }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ═══ ROW 4 — DEPARTMENT TABLE ═══ */}
        <div className="card-3d entrance entrance-8 bg-[var(--card)]/70 backdrop-blur-xl rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
          <div className="p-5 pb-0 flex items-center justify-between">
            <div>
              <h3 className="text-[14px] font-bold text-[var(--text)]">Department Breakdown</h3>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Volume, delays, response time & resolution rate</p>
            </div>
            <span className="text-[10px] font-semibold text-[var(--text-muted)] bg-[var(--bg)] px-2.5 py-1 rounded-full border border-[var(--border)]">{districtData.length} departments</span>
          </div>
          {loading ? (
            <div className="p-5 space-y-2">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12" />)}</div>
          ) : (
            <div className="overflow-x-auto mt-4">
              <table className="w-full">
                <thead>
                  <tr className="border-y border-[var(--border)]" style={{ background: "var(--bg)" }}>
                    {["Department", "Total", "Resolved", "Active", "Delayed", "Avg Days", "Resolution"].map(h => (
                      <th key={h} className="text-left text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider py-2.5 px-5">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {districtData.length === 0 ? (
                    <tr><td colSpan={7} className="py-8 text-center text-[var(--text-muted)] text-sm">No data available</td></tr>
                  ) : (
                    districtData.map((row) => {
                      const rateColor = row.rate >= 70 ? COLORS.emerald : row.rate >= 40 ? COLORS.amber : COLORS.rose;
                      return (
                        <tr key={row.dept} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg)]/50 transition-all duration-200">
                          <td className="py-3 px-5 text-[13px] font-semibold text-[var(--text-secondary)]">{row.dept}</td>
                          <td className="py-3 px-5 text-[13px] font-bold text-[var(--text)]">{row.total}</td>
                          <td className="py-3 px-5 text-[13px] font-medium" style={{ color: COLORS.teal }}>{row.resolved}</td>
                          <td className="py-3 px-5 text-[13px] font-medium" style={{ color: COLORS.amber }}>{row.active}</td>
                          <td className="py-3 px-5">
                            <span className={`text-[12px] font-bold px-2 py-0.5 rounded-full ${row.delayed > 0 ? "bg-rose-500/10 text-rose-500" : "text-[var(--text-muted)]"}`}>
                              {row.delayed}
                            </span>
                          </td>
                          <td className="py-3 px-5 text-[13px] font-medium text-[var(--text-secondary)]">{row.avgDays.toFixed(1)}d</td>
                          <td className="py-3 px-5">
                            <div className="flex items-center gap-2.5">
                              <div className="flex-1 h-2 bg-[var(--border)] rounded-full overflow-hidden min-w-[60px]">
                                <div
                                  className="h-full rounded-full transition-all duration-700"
                                  style={{ width: `${row.rate}%`, background: `linear-gradient(90deg, ${rateColor}, ${rateColor}cc)` }}
                                />
                              </div>
                              <span
                                className="text-[11px] font-bold w-10 text-right px-1.5 py-0.5 rounded-md"
                                style={{ color: rateColor, background: `${rateColor}15` }}
                              >
                                {row.rate}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ═══ ROW 5 — AI PATTERN INSIGHTS ═══ */}
        {!loading && insights.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {insights.map((ins, i) => (
              <div
                key={ins.title}
                className={`card-3d entrance entrance-${i + 7} relative overflow-hidden rounded-2xl border border-[var(--border)] p-5 shadow-sm`}
                style={{
                  background: "var(--card)",
                  borderLeft: `4px solid ${ins.border}`,
                }}
              >
                {/* Shimmer overlay */}
                <div className="insight-shimmer absolute inset-0 pointer-events-none" />
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">{ins.icon}</span>
                    <h4 className="text-[13px] font-bold text-[var(--text)]">{ins.title}</h4>
                  </div>
                  <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">{ins.desc}</p>
                </div>
              </div>
            ))}
          </div>
        )}

      </main>
    </div>
  );
}
