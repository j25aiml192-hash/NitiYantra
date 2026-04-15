"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { fetchStats, fetchComplaints, fetchPerformance, autoEscalate, getCurrentUser, fetchDepartmentStats, fetchComplaintsByDepartment } from "@/lib/api";
import type { DeptStats, ComplaintResponse } from "@/lib/api";
import { SkeletonStatCards, SkeletonChart, SkeletonHeatmap, SkeletonTable } from "@/components/Skeleton";
import toast from "react-hot-toast";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart, PieChart, Pie, Cell,
  RadialBarChart, RadialBar, Legend,
} from "recharts";

/* ---------- types ---------- */
interface Stats {
  total_complaints: number;
  active_issues: number;
  resolved_today: number;
  delayed_issues: number;
  complaints_by_department: Record<string, number>;
  complaints_by_category: Record<string, number>;
  complaints_over_time: Record<string, number>;
}

interface DeptPerformance {
  department_name: string;
  head: string;
  total_issues: number;
  resolved_issues: number;
  delayed_issues: number;
  active_issues: number;
  avg_resolution_days: number;
}

interface Complaint {
  id: number;
  text: string;
  source: string;
  date_submitted: string;
  district: string;
  category: string;
  status: string;
  department_id: number | null;
}

/* ---------- mature color palette ---------- */
const PALETTE = {
  slate900: "#0f172a",
  slate700: "#334155",
  slate500: "#64748b",
  slate300: "#cbd5e1",
  slate100: "#f1f5f9",
  indigo: "#1D4ED8",
  indigoDark: "#3730a3",
  indigoLight: "#3B82F6",
  teal: "#0d9488",
  tealLight: "#2dd4bf",
  amber: "#d97706",
  amberLight: "#fbbf24",
  rose: "#e11d48",
  roseLight: "#fb7185",
  emerald: "#059669",
  emeraldLight: "#34d399",
  violet: "#7c3aed",
  sky: "#0284c7",
};

const CATEGORY_COLORS = [
  "#1D4ED8", "#0d9488", "#d97706", "#e11d48",
  "#7c3aed", "#0284c7", "#059669", "#ea580c",
  "#6d28d9", "#0891b2", "#ca8a04", "#dc2626",
];

/* ---------- helpers ---------- */
const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  in_progress: "bg-sky-500/10 text-sky-500 border-sky-500/20",
  resolved: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  escalated: "bg-rose-500/10 text-rose-500 border-rose-500/20",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${STATUS_COLORS[status] || "bg-slate-500/10 text-slate-500 border-slate-500/20"}`}>
      {status.replace("_", " ")}
    </span>
  );
}

/* ---------- stat card (redesigned with 3D depth) ---------- */
function StatCard({
  title, value, change, icon, accentColor, bgGradient,
}: {
  title: string;
  value: number | string;
  change?: string;
  icon: React.ReactNode;
  accentColor: string;
  bgGradient: string;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl group"
      style={{
        background: bgGradient,
        boxShadow: `0 4px 24px ${accentColor}15, 0 1px 3px rgba(0,0,0,0.08)`,
      }}
    >
      {/* 3D depth decorative sphere */}
      <div
        className="absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-[0.08] group-hover:opacity-[0.12] transition-opacity duration-500"
        style={{ background: accentColor }}
      />
      <div
        className="absolute -right-2 -bottom-6 w-20 h-20 rounded-full opacity-[0.05]"
        style={{ background: accentColor }}
      />

      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
              boxShadow: `0 4px 12px ${accentColor}40`,
            }}
          >
            {icon}
          </div>
          {change && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--card)]/60 backdrop-blur-sm text-[var(--text-secondary)]">
              {change}
            </span>
          )}
        </div>
        <p className="text-2xl font-bold text-[var(--text)] tracking-tight">{value}</p>
        <p className="text-[13px] text-[var(--text-muted)] mt-0.5">{title}</p>
      </div>
    </div>
  );
}

/* ---------- custom tooltip ---------- */
function ChartTooltip({
  active, payload, label,
}: {
  active?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--card)] backdrop-blur-xl border border-[var(--border)] rounded-xl px-4 py-3 shadow-2xl">
      <p className="text-[11px] text-[var(--text-muted)] mb-1.5 font-medium">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-semibold" style={{ color: p.color || p.fill }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

/* ---------- Custom Radial label ---------- */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderRadialLabel(props: any) {
  const { cx, cy, midAngle, outerRadius, name, value } = props;
  const RADIAN = Math.PI / 180;
  const x = cx + (outerRadius + 20) * Math.cos(-midAngle * RADIAN);
  const y = cy + (outerRadius + 20) * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} textAnchor={x > cx ? "start" : "end"} dominantBaseline="central"
      style={{ fontSize: 11, fill: "var(--text-muted)", fontWeight: 500 }}>
      {name} ({value})
    </text>
  );
}

/* ============================================ */
/* ======= DEPT WORKER DASHBOARD ============= */
/* ============================================ */
const DEPT_MAP: Record<number, string> = { 1: "PWD", 2: "Jal Board", 3: "DESU", 4: "MCD", 5: "Delhi Police" };

function DeptWorkerDashboard({ user }: { user: { username: string; department_id: number } }) {
  const deptName = DEPT_MAP[user.department_id] || `Dept #${user.department_id}`;
  const [deptStats, setDeptStats] = useState<DeptStats | null>(null);
  const [deptComplaints, setDeptComplaints] = useState<ComplaintResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [stats, complaints] = await Promise.all([
          fetchDepartmentStats(user.department_id),
          fetchComplaintsByDepartment(user.department_id),
        ]);
        setDeptStats(stats);
        setDeptComplaints(Array.isArray(complaints) ? complaints : []);
      } catch { /* swallow */ }
      setLoading(false);
    })();
  }, [user.department_id]);

  const resRate = deptStats && deptStats.total > 0 ? Math.round((deptStats.resolved / deptStats.total) * 100) : 0;
  const ringColor = resRate >= 70 ? "#059669" : resRate >= 40 ? "#d97706" : "#e11d48";
  const circumference = 2 * Math.PI * 54;
  const dashOffset = circumference - (resRate / 100) * circumference;

  const daysOpen = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    return Math.max(0, Math.floor(diff / 86400000));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)]">
        <main className="p-6 space-y-6">
          <SkeletonStatCards />
          <SkeletonTable rows={6} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <main className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-[22px] font-bold text-[var(--text)] tracking-tight">{deptName} — Task Queue</h1>
          <p className="text-[13px] text-[var(--text-muted)] mt-0.5">Logged in as <span className="font-semibold text-[var(--text-secondary)]">{user.username}</span></p>
        </div>

        {/* ROW 1 — Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Tasks", value: deptStats?.total ?? 0, color: "#1D4ED8", icon: "📋" },
            { label: "Pending", value: deptStats?.pending ?? 0, color: "#d97706", icon: "⏳" },
            { label: "In Progress", value: deptStats?.in_progress ?? 0, color: "#0284c7", icon: "🔄" },
            { label: "Overdue", value: deptStats?.overdue ?? 0, color: "#e11d48", icon: "🚨", pulse: (deptStats?.overdue ?? 0) > 0 },
          ].map((card) => (
            <div
              key={card.label}
              className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 transition-all hover:-translate-y-1 hover:shadow-lg"
              style={{ borderLeft: `4px solid ${card.color}` }}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">{card.label}</p>
                <span className="text-lg">{card.icon}</span>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-3xl font-extrabold text-[var(--text)]" style={{ color: card.color }}>{card.value}</p>
                {card.pulse && <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />}
              </div>
            </div>
          ))}
        </div>

        {/* ROW 2 — Ring + Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Completion Ring */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 flex flex-col items-center justify-center">
            <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-4">Resolution Rate</p>
            <div className="relative w-32 h-32">
              <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                <circle cx="60" cy="60" r="54" fill="none" stroke="var(--border)" strokeWidth="8" />
                <circle
                  cx="60" cy="60" r="54" fill="none"
                  stroke={ringColor}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-extrabold" style={{ color: ringColor }}>{resRate}%</span>
                <span className="text-[10px] text-[var(--text-muted)]">Resolved</span>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="md:col-span-2 bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
            <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-4">Quick Metrics</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: "Resolved", value: deptStats?.resolved ?? 0, dot: "bg-emerald-500" },
                { label: "Escalated", value: deptStats?.escalated ?? 0, dot: "bg-rose-500" },
                { label: "Received This Week", value: deptStats?.received_this_week ?? 0, dot: "bg-sky-500" },
              ].map((m) => (
                <div key={m.label} className="flex items-center gap-3 px-4 py-3 bg-[var(--bg)] border border-[var(--border)] rounded-xl">
                  <span className={`w-3 h-3 rounded-full ${m.dot} shrink-0`} />
                  <div>
                    <p className="text-[11px] text-[var(--text-muted)] font-medium">{m.label}</p>
                    <p className="text-lg font-bold text-[var(--text)]">{m.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ROW 3 — Task Queue */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
            <div>
              <h3 className="text-[14px] font-bold text-[var(--text)]">Task Queue</h3>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{deptComplaints.length} complaints assigned to {deptName}</p>
            </div>
            <span className="text-[10px] font-semibold text-[var(--text-muted)] bg-[var(--bg)] px-3 py-1.5 rounded-full border border-[var(--border)]">{deptComplaints.filter(c => c.status === "pending").length} pending</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg)]">
                  {["ID", "Complaint", "District", "Status", "Submitted", "Days Open"].map(h => (
                    <th key={h} className="text-left text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider py-3 px-5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {deptComplaints.length === 0 ? (
                  <tr><td colSpan={6} className="py-12 text-center text-[var(--text-muted)] text-sm">No complaints assigned to this department</td></tr>
                ) : (
                  deptComplaints.map((c, idx) => {
                    const days = daysOpen(c.date_submitted);
                    const statusStyle: Record<string, string> = {
                      pending: "bg-amber-500/10 text-amber-500 border-amber-500/20",
                      in_progress: "bg-sky-500/10 text-sky-500 border-sky-500/20",
                      resolved: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
                      escalated: "bg-rose-500/10 text-rose-500 border-rose-500/20",
                    };
                    return (
                      <>
                        <tr
                          key={c.id}
                          onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                          className={`cursor-pointer hover:bg-[var(--bg)] transition-colors ${idx % 2 === 1 ? "bg-[var(--bg)]" : ""}`}
                        >
                          <td className="py-3 px-5 text-sm font-mono text-[var(--text-muted)]">{c.id}</td>
                          <td className="py-3 px-5 text-sm text-[var(--text-secondary)] max-w-xs truncate">{c.text.length > 80 ? c.text.slice(0, 80) + "…" : c.text}</td>
                          <td className="py-3 px-5 text-sm text-[var(--text-muted)]">{c.district}</td>
                          <td className="py-3 px-5">
                            <div className="flex items-center gap-1.5">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold border capitalize ${statusStyle[c.status] || "bg-slate-500/10 text-slate-500 border-slate-500/20"}`}>
                                {c.status.replace("_", " ")}
                              </span>
                              {c.escalated && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-red-500/10 text-red-500 border border-red-500/20 animate-pulse">ESCALATED</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-5 text-xs text-[var(--text-muted)] whitespace-nowrap">{new Date(c.date_submitted).toLocaleDateString()}</td>
                          <td className="py-3 px-5">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold border ${days >= 7 ? "bg-red-500/10 text-red-500 border-red-500/20" : days >= 3 ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"}`}>
                              {days}d
                            </span>
                          </td>
                        </tr>
                        {expandedId === c.id && (
                          <tr key={`exp-${c.id}`} className="bg-[var(--bg)]">
                            <td colSpan={6} className="px-5 py-4">
                              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{c.text}</p>
                              {c.escalation_reason && (
                                <p className="mt-2 text-xs text-rose-600 font-medium">⚠ {c.escalation_reason}</p>
                              )}
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ============================================ */
/* ============ MAIN COMPONENT ============== */
/* ============================================ */
export default function DashboardPage() {
  const router = useRouter();
  const currentUser = getCurrentUser();
  const isDeptWorker = currentUser?.role === "dept_worker" && currentUser?.department_id;

  const [stats, setStats] = useState<Stats | null>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [allComplaints, setAllComplaints] = useState<Complaint[]>([]);
  const [performance, setPerformance] = useState<DeptPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [govHealth, setGovHealth] = useState<any>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const loadData = useCallback(async () => {
    if (isDeptWorker) { setLoading(false); return; }
    try {
      const [s, c, p] = await Promise.all([fetchStats(), fetchComplaints(), fetchPerformance()]);
      setStats(s);
      const allC = Array.isArray(c) ? c : [];
      setAllComplaints(allC);
      setComplaints(allC.slice(0, 10));
      setPerformance(Array.isArray(p) ? p : []);
      // Fetch governance health (non-blocking)
      fetch(`${API_URL}/dashboard/governance-health`)
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) setGovHealth(d); })
        .catch(() => {});
    } catch {
      router.push("/login");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, isDeptWorker]);

  useEffect(() => { loadData(); }, [loadData]);

  /* Dept worker early return — AFTER all hooks */
  if (isDeptWorker) {
    return <DeptWorkerDashboard user={{ username: currentUser!.username, department_id: currentUser!.department_id! }} />;
  }

  /* ---- build chart data ---- */
  const deptChartData = stats?.complaints_by_department
    ? Object.entries(stats.complaints_by_department).map(([dept, count]) => ({
        name: dept, Complaints: count,
      }))
    : [];

  /* Category data for pie chart */
  const categoryData = stats?.complaints_by_category
    ? Object.entries(stats.complaints_by_category).map(([cat, count], i) => ({
        name: cat, value: count, fill: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
      }))
    : [];

  /* Time-series from API */
  const timeData = stats?.complaints_over_time
    ? Object.entries(stats.complaints_over_time)
        .map(([date, count]) => ({ date, complaints: count }))
        .slice(-14)
    : [];

  /* Radial bar data for department performance */
  const radialData = performance.map((d, i) => ({
    name: d.department_name,
    score: d.total_issues > 0 ? Math.round((d.resolved_issues / d.total_issues) * 100) : 0,
    fill: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
  }));

  /* Resolution rate */
  const totalResolved = stats ? (stats.total_complaints > 0 ? Math.round(((stats.total_complaints - stats.active_issues) / stats.total_complaints) * 100) : 0) : 0;

  const handleExport = () => {
    try {
      const lines: string[] = [];
      lines.push("NitiYantra Governance Report");
      lines.push(`Generated: ${new Date().toLocaleString()}`);
      lines.push("");
      lines.push("=== Summary ===");
      lines.push(`Total Complaints,${stats?.total_complaints || 0}`);
      lines.push(`Active Issues,${stats?.active_issues || 0}`);
      lines.push(`Resolved Today,${stats?.resolved_today || 0}`);
      lines.push(`Delayed Issues,${stats?.delayed_issues || 0}`);
      lines.push("");
      lines.push("=== Complaints by Category ===");
      lines.push("Category,Count");
      if (stats?.complaints_by_category) {
        Object.entries(stats.complaints_by_category).forEach(([cat, count]) => {
          lines.push(`${cat},${count}`);
        });
      }
      lines.push("");
      lines.push("=== Complaints by Department ===");
      lines.push("Department,Count");
      if (stats?.complaints_by_department) {
        Object.entries(stats.complaints_by_department).forEach(([dept, count]) => {
          lines.push(`${dept},${count}`);
        });
      }
      lines.push("");
      lines.push("=== Department Performance ===");
      lines.push("Department,Head,Total Issues,Resolved,Delayed,Avg Resolution Days");
      if (performance) {
        performance.forEach((p) => {
          lines.push(`${p.department_name},${p.head},${p.total_issues},${p.resolved_issues},${p.delayed_issues},${p.avg_resolution_days}`);
        });
      }
      const csv = lines.join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `NitiYantra_report_${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Report exported successfully!");
    } catch {
      toast.error("Failed to export report");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)]">
        <main className="p-6 space-y-6">
          <SkeletonStatCards />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <SkeletonChart />
            <SkeletonChart />
          </div>
          <SkeletonHeatmap />
          <SkeletonTable rows={5} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent relative overflow-hidden">

      {/* ─── Dashboard Animations ─── */}
      <style>{`
        @keyframes dashSlideUp {
          from { opacity: 0; transform: translateY(24px); filter: blur(4px); }
          to { opacity: 1; transform: translateY(0); filter: blur(0); }
        }
        @keyframes shimmerLine {
          from { transform: translateX(-100%); }
          to { transform: translateX(300%); }
        }
        @keyframes glowOrb {
          0%, 100% { opacity: 0.08; transform: scale(1); }
          50% { opacity: 0.14; transform: scale(1.05); }
        }
        @keyframes pulseRing {
          0%, 100% { box-shadow: 0 0 0 0 rgba(29,78,216,0.15); }
          50% { box-shadow: 0 0 24px 4px rgba(29,78,216,0.08); }
        }
        .dash-in { animation: dashSlideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .dash-d1 { animation-delay: 0.05s; }
        .dash-d2 { animation-delay: 0.12s; }
        .dash-d3 { animation-delay: 0.2s; }
        .dash-d4 { animation-delay: 0.28s; }
        .dash-d5 { animation-delay: 0.36s; }
        .dash-d6 { animation-delay: 0.44s; }
        .dash-d7 { animation-delay: 0.52s; }
        .dash-d8 { animation-delay: 0.6s; }
        .dash-card {
          position: relative;
          overflow: hidden;
          transition: transform 0.3s cubic-bezier(0.22,1,0.36,1), box-shadow 0.3s ease;
        }
        .dash-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 40px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04);
        }
        .dash-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(29,78,216,0.25), rgba(139,92,246,0.2), transparent);
          animation: shimmerLine 4s ease-in-out infinite;
        }
        .glow-orb {
          animation: glowOrb 4s ease-in-out infinite;
        }
      `}</style>

      <main className="relative z-10 p-6 space-y-6 max-w-[1400px] mx-auto">

        {/* ═══ HEADER ═══ */}
        <div className="dash-in dash-d1 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1D4ED8] to-[#7C3AED] flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              </div>
              <div>
                <h1 className="text-[22px] font-bold text-slate-900 tracking-tight">Command Center</h1>
                <p className="text-[13px] text-slate-600">Real-time governance intelligence overview</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleExport} className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--text)] text-[var(--card)] text-sm font-medium hover:opacity-90 transition-all shadow-md hover:shadow-lg">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export Report
            </button>
            {getCurrentUser()?.role === "office_staff" && (
              <button
                onClick={async () => {
                  try {
                    const result = await autoEscalate();
                    toast.success(`${result.escalated_count} complaints auto-escalated`);
                    loadData();
                  } catch { toast.error("Failed to auto-escalate"); }
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--card)] border border-rose-200 hover:border-rose-400 text-rose-600 text-sm font-medium transition-all cursor-pointer hover:shadow-md"
              >
                ⚡ Auto-Escalate
              </button>
            )}
          </div>
        </div>

        {/* ═══ GOVERNANCE HEALTH SCORE ═══ */}
        {govHealth && (
          <div className="dash-in dash-d2 grid grid-cols-1 lg:grid-cols-[200px_1fr] xl:grid-cols-[240px_1fr] gap-6 mt-6 relative z-10">
            {/* LEFT BOX: Score Circle */}
            <div className="bg-slate-50/80 backdrop-blur-xl border border-slate-200 rounded-3xl p-6 flex flex-col items-center justify-center shadow-sm relative overflow-hidden transition-all hover:shadow-md h-full">
              {/* Decorative shimmer */}
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-indigo-400 to-transparent opacity-50" />
              <div className="relative w-32 h-32 flex items-center justify-center mb-6">
                <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                  <circle
                    cx="60" cy="60" r="52" fill="none"
                    stroke={govHealth.overall_score >= 80 ? "#10b981" : govHealth.overall_score >= 60 ? "#f59e0b" : "#f43f5e"}
                    strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 52}
                    strokeDashoffset={2 * Math.PI * 52 * (1 - govHealth.overall_score / 100)}
                    className="transition-all duration-1000"
                    style={{ filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.1))" }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-extrabold text-slate-800 tracking-tighter">{govHealth.overall_score}</span>
                  <span className="text-xs font-semibold text-slate-400">/ 100</span>
                </div>
              </div>
              <span className="px-5 py-2 rounded-xl text-sm font-bold shadow-sm" style={{
                background: govHealth.overall_score >= 80 ? "#ecfdf5" : govHealth.overall_score >= 60 ? "#fffbeb" : "#fff1f2",
                color: govHealth.overall_score >= 80 ? "#059669" : govHealth.overall_score >= 60 ? "#d97706" : "#e11d48",
                border: `1px solid ${govHealth.overall_score >= 80 ? "#34d399" : govHealth.overall_score >= 60 ? "#fcd34d" : "#fda4af"}`
              }}>
                Grade: {govHealth.grade}
              </span>
            </div>

            {/* RIGHT BOX: Info & Departments */}
            <div className="bg-slate-50/60 backdrop-blur-md border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                  </div>
                  <div>
                    <h3 className="text-[17px] font-bold text-slate-900 tracking-tight">Governance Health Score</h3>
                    <p className="text-[12px] text-slate-500 font-medium tracking-wide">AI-powered department performance analysis</p>
                  </div>
                </div>
                <span className="text-xs px-4 py-1.5 rounded-full bg-emerald-50 text-emerald-600 font-bold tracking-widest uppercase border border-emerald-200 shadow-sm">
                  {govHealth.ai_provider || "NIM"}
                </span>
              </div>

              {/* AI Insight */}
              {govHealth.ai_insight && (
                <div className="text-[13px] text-slate-600 font-medium leading-relaxed mb-6 p-4 rounded-2xl bg-white border border-slate-200 shadow-sm relative pr-6">
                  <span className="absolute top-4 left-4 text-amber-500 text-lg leading-none">💡</span>
                  <p className="pl-8">{govHealth.ai_insight}</p>
                </div>
              )}

              {/* Department Cards */}
              <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar flex-1 items-end">
                {govHealth.departments?.map((dept: { name: string; score: number; grade: string; trend: string; bottleneck: string }) => {
                  const isRed = dept.score < 60;
                  const isAmber = dept.score >= 60 && dept.score < 80;
                  const bdColor = isRed ? "border-rose-200" : isAmber ? "border-amber-200" : "border-emerald-200";
                  const bgColor = "bg-white";
                  return (
                    <div key={dept.name} className={`shrink-0 w-[200px] p-4 rounded-2xl ${bgColor} border ${bdColor} shadow-sm group hover:-translate-y-1 hover:shadow-md transition-all duration-300 relative overflow-hidden`}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[13px] font-bold text-slate-800">{dept.name}</span>
                        <span className="text-[11px] font-bold w-6 h-6 flex items-center justify-center rounded-full" style={{
                          color: isRed ? "#e11d48" : isAmber ? "#d97706" : "#059669",
                          background: isRed ? "#ffe4e6" : isAmber ? "#fef3c7" : "#d1fae5"
                        }}>
                          {dept.grade}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2 mb-3">
                        <span className="text-2xl font-black tracking-tighter" style={{
                          color: isRed ? "#f43f5e" : isAmber ? "#f59e0b" : "#10b981",
                        }}>{dept.score}</span>
                        <span className="text-xs">
                          {dept.trend === "improving" ? "📈" : dept.trend === "declining" ? "📉" : "➡️"}
                        </span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
                        <div className="h-full rounded-full transition-all duration-700" style={{
                          width: `${dept.score}%`,
                          background: isRed ? "linear-gradient(90deg, #f43f5e, #fb7185)" : isAmber ? "linear-gradient(90deg, #f59e0b, #fbbf24)" : "linear-gradient(90deg, #10b981, #34d399)",
                        }} />
                      </div>
                      <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 truncate">{dept.bottleneck || "Monitoring"}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ═══ STAT CARDS — Golden Ratio 4-col ═══ */}
        <div className="dash-in dash-d3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard
            title="Total Complaints"
            value={stats?.total_complaints ?? 0}
            accentColor={PALETTE.indigo}
            bgGradient="linear-gradient(135deg, var(--card) 0%, #eef2ff 100%)"
            icon={<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
          />
          <StatCard
            title="Active Issues"
            value={stats?.active_issues ?? 0}
            accentColor={PALETTE.amber}
            bgGradient="linear-gradient(135deg, var(--card) 0%, #fffbeb 100%)"
            icon={<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
          <StatCard
            title="Resolved Today"
            value={stats?.resolved_today ?? 0}
            accentColor={PALETTE.teal}
            bgGradient="linear-gradient(135deg, var(--card) 0%, #f0fdfa 100%)"
            icon={<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
          <StatCard
            title="Delayed Issues"
            value={stats?.delayed_issues ?? 0}
            accentColor={PALETTE.rose}
            bgGradient="linear-gradient(135deg, var(--card) 0%, #fff1f2 100%)"
            icon={<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
        </div>

        {/* ═══ ROW 2: Bar Chart + Category Donut — Golden Ratio 1.618:1 ═══ */}
        <div className="dash-in dash-d4" style={{ display: "grid", gridTemplateColumns: "1.618fr 1fr", gap: 21 }}>
          {/* Department Bar Chart */}
          <div className="dash-card bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6" style={{ boxShadow: "var(--shadow-card)" }}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#1D4ED8] to-[#3B82F6] flex items-center justify-center shadow-md shadow-indigo-500/15">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                </span>
                <div>
                  <h3 className="text-[15px] font-semibold text-[var(--text)]">Complaints by Department</h3>
                  <p className="text-[11px] text-[var(--text-muted)]">Volume distribution across departments</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] bg-[var(--bg)] px-2.5 py-1 rounded-full border border-[var(--border)]">
                <span className="w-2 h-2 rounded-full" style={{ background: PALETTE.indigo }} />
                Complaints
              </div>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptChartData} barGap={6} barSize={36}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={PALETTE.indigo} stopOpacity={1} />
                      <stop offset="100%" stopColor={PALETTE.indigoLight} stopOpacity={0.8} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "var(--text-muted)", fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(79, 70, 229, 0.04)" }} />
                  <Bar dataKey="Complaints" fill="url(#barGradient)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Category Donut */}
          <div className="dash-card bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6" style={{ boxShadow: "var(--shadow-card)" }}>
            <div className="flex items-center gap-2.5 mb-1">
              <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md shadow-violet-500/15">
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>
              </span>
              <div>
                <h3 className="text-[15px] font-semibold text-[var(--text)]">Category Breakdown</h3>
                <p className="text-[11px] text-[var(--text-muted)]">Complaints by category type</p>
              </div>
            </div>
            <div className="h-56 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%" cy="50%"
                    innerRadius={55} outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                    label={renderRadialLabel}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2">
              {categoryData.slice(0, 6).map((c) => (
                <div key={c.name} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ background: c.fill }} />
                  <span className="text-[10px] text-[var(--text-muted)] font-medium">{c.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ═══ ROW 3: Trend + Resolution Gauge — Golden Ratio ═══ */}
        <div className="dash-in dash-d5" style={{ display: "grid", gridTemplateColumns: "1.618fr 1fr", gap: 21 }}>
          {/* Area Trend Chart */}
          <div className="dash-card bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6" style={{ boxShadow: "var(--shadow-card)" }}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-md shadow-teal-500/15">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>
                </span>
                <div>
                  <h3 className="text-[15px] font-semibold text-[var(--text)]">Complaint Trend</h3>
                  <p className="text-[11px] text-[var(--text-muted)]">14-day submission volume</p>
                </div>
              </div>
              <span className="text-[10px] text-[var(--text-muted)] bg-[var(--bg)] px-3 py-1 rounded-full border border-[var(--border)] font-medium">Last 14 days</span>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeData}>
                  <defs>
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={PALETTE.teal} stopOpacity={0.2} />
                      <stop offset="100%" stopColor={PALETTE.teal} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                    axisLine={false} tickLine={false}
                    tickFormatter={(d) => d.slice(5)}
                  />
                  <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone" dataKey="complaints"
                    stroke={PALETTE.teal} strokeWidth={2.5}
                    fillOpacity={1} fill="url(#areaGradient)"
                    dot={{ r: 3, fill: PALETTE.teal, stroke: "#fff", strokeWidth: 2 }}
                    activeDot={{ r: 5, fill: PALETTE.teal, stroke: "#fff", strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Resolution Radial Gauge */}
          <div className="dash-card bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6" style={{ boxShadow: "var(--shadow-card)" }}>
            <div className="flex items-center gap-2.5 mb-1">
              <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-md shadow-amber-500/15">
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </span>
              <div>
                <h3 className="text-[15px] font-semibold text-[var(--text)]">Department Efficiency</h3>
                <p className="text-[11px] text-[var(--text-muted)]">Resolution rate by department</p>
              </div>
            </div>
            <div className="h-64 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  cx="50%" cy="50%"
                  innerRadius="25%" outerRadius="90%"
                  data={radialData}
                  startAngle={180} endAngle={-180}
                  barSize={10}
                >
                  <RadialBar
                    dataKey="score"
                    background={{ fill: "var(--border)" }}
                    cornerRadius={10}
                  />
                  <Legend
                    iconSize={8}
                    layout="horizontal"
                    verticalAlign="bottom"
                    wrapperStyle={{ fontSize: 10, color: "var(--text-muted)" }}
                  />
                  <Tooltip content={<ChartTooltip />} />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-3 mt-1 pt-3 border-t border-[var(--border)]">
              <span className="text-[11px] text-[var(--text-muted)]">Overall Resolution Rate</span>
              <span className="text-lg font-bold" style={{ color: totalResolved >= 50 ? PALETTE.teal : PALETTE.rose }}>{totalResolved}%</span>
            </div>
          </div>
        </div>

        {/* ═══ DISTRICT URGENCY HEATMAP ═══ */}
        {(() => {
          const DISTRICTS = ["Noida", "Ghaziabad", "Delhi", "Gurugram", "Faridabad"];
          const districtCounts: Record<string, number> = {};
          DISTRICTS.forEach((d) => { districtCounts[d] = 0; });
          allComplaints.forEach((c) => { if (districtCounts[c.district] !== undefined) districtCounts[c.district]++; });
          const maxCount = Math.max(...Object.values(districtCounts), 1);

          return (
            <div className="dash-in dash-d6 dash-card bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6" style={{ boxShadow: "var(--shadow-card)" }}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center shadow-md shadow-rose-500/15">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </span>
                  <div>
                    <h3 className="text-[15px] font-semibold text-[var(--text)]">District Urgency Map</h3>
                    <p className="text-[11px] text-[var(--text-muted)]">Complaint intensity across NCR districts</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
                  <span className="font-medium">Low</span>
                  <div className="flex gap-0.5">
                    {["#86efac", "#fde047", "#fdba74", "#fca5a5", "#f87171"].map((c, i) => (
                      <div key={i} className="w-5 h-2.5 rounded-sm" style={{ background: c }} />
                    ))}
                  </div>
                  <span className="font-medium">High</span>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {DISTRICTS.map((district) => {
                  const count = districtCounts[district];
                  const intensity = maxCount > 0 ? count / maxCount : 0;
                  const hue = 140 - intensity * 100;

                  return (
                    <div
                      key={district}
                      className="relative rounded-xl p-5 border border-[var(--border)] transition-all duration-300 hover:-translate-y-1 hover:shadow-lg cursor-default overflow-hidden group"
                      style={{
                        background: `linear-gradient(145deg, var(--card), hsla(${hue}, 50%, 96%, 0.9))`,
                      }}
                    >
                      <div
                        className="absolute -right-3 -top-3 w-16 h-16 rounded-full opacity-[0.1] group-hover:opacity-[0.18] transition-opacity"
                        style={{ background: `hsl(${hue}, 60%, 50%)` }}
                      />
                      <p className="text-[13px] font-semibold text-[var(--text-secondary)] mb-1">{district}</p>
                      <p className="text-2xl font-bold tracking-tight" style={{ color: `hsl(${hue}, 55%, 40%)` }}>
                        {count}
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)] mt-0.5">complaints</p>
                      <div className="mt-3 h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700 ease-out"
                          style={{
                            width: `${Math.max(intensity * 100, 6)}%`,
                            background: `linear-gradient(90deg, hsl(${hue}, 55%, 55%), hsl(${hue}, 65%, 42%))`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* ═══ DEPARTMENT PERFORMANCE TABLE ═══ */}
        {performance.length > 0 && (
          <div className="dash-in dash-d7 dash-card bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden" style={{ boxShadow: "var(--shadow-card)" }}>
            <div className="p-6 pb-0 flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-sky-500 to-cyan-600 flex items-center justify-center shadow-md shadow-sky-500/15">
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
              </span>
              <div>
                <h3 className="text-[15px] font-semibold text-[var(--text)]">Department Performance</h3>
                <p className="text-[11px] text-[var(--text-muted)]">Resolution metrics and efficiency scores</p>
              </div>
            </div>
            <div className="overflow-x-auto mt-4">
              <table className="w-full">
                <thead>
                  <tr className="border-y border-[var(--border)] bg-[var(--bg)]">
                    <th className="text-left text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider py-3 px-6">Department</th>
                    <th className="text-left text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider py-3 px-4">Head</th>
                    <th className="text-center text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider py-3 px-4">Active</th>
                    <th className="text-center text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider py-3 px-4">Resolved</th>
                    <th className="text-center text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider py-3 px-4">Delayed</th>
                    <th className="text-center text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider py-3 px-4">Avg Days</th>
                    <th className="text-left text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider py-3 px-6">Efficiency</th>
                  </tr>
                </thead>
                <tbody>
                  {performance.map((d) => {
                    const score = d.total_issues > 0
                      ? Math.round((d.resolved_issues / d.total_issues) * 100) : 0;
                    const barColor = score >= 70 ? PALETTE.teal : score >= 40 ? PALETTE.amber : PALETTE.rose;
                    const bgTint = score >= 70 ? "bg-emerald-50/40" : score >= 40 ? "bg-amber-50/30" : "bg-rose-50/30";
                    return (
                      <tr key={d.department_name} className={`border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg)] transition-colors ${bgTint}`}>
                        <td className="py-3.5 px-6">
                          <span className="text-[13px] font-medium text-[var(--text)]">{d.department_name}</span>
                        </td>
                        <td className="py-3.5 px-4 text-[13px] text-[var(--text-muted)]">{d.head}</td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="text-[13px] font-semibold text-amber-600">{d.active_issues}</span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="text-[13px] font-semibold text-teal-600">{d.resolved_issues}</span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`text-[13px] font-semibold ${d.delayed_issues > 0 ? "text-rose-600" : "text-slate-300"}`}>
                            {d.delayed_issues}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center text-[13px] font-medium text-[var(--text-secondary)]">{d.avg_resolution_days.toFixed(1)}d</td>
                        <td className="py-3.5 px-6">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-2 bg-[var(--border)] rounded-full overflow-hidden min-w-[80px]">
                              <div
                                className="h-full rounded-full transition-all duration-700 ease-out"
                                style={{ width: `${score}%`, background: `linear-gradient(90deg, ${barColor}, ${barColor}cc)` }}
                              />
                            </div>
                            <span className="text-[12px] font-semibold tabular-nums w-10 text-right" style={{ color: barColor }}>
                              {score}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══ RECENT COMPLAINTS TABLE ═══ */}
        <div className="dash-in dash-d8 dash-card bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-md shadow-indigo-500/15">
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
              </span>
              <div>
                <h3 className="text-[15px] font-semibold text-[var(--text)]">Recent Complaints</h3>
                <p className="text-[11px] text-[var(--text-muted)]">Latest citizen complaints across all districts</p>
              </div>
            </div>
            <span className="text-[10px] text-[var(--text-muted)] bg-[var(--bg)] px-3 py-1.5 rounded-full border border-[var(--border)] font-medium">
              Showing {complaints.length} of {stats?.total_complaints ?? 0}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider pb-3 pr-4">ID</th>
                  <th className="text-left text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider pb-3 pr-4">Complaint</th>
                  <th className="text-left text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider pb-3 pr-4">District</th>
                  <th className="text-left text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider pb-3 pr-4">Category</th>
                  <th className="text-left text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider pb-3 pr-4">Source</th>
                  <th className="text-left text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {complaints.map((c) => (
                  <tr key={c.id} className="hover:bg-[var(--bg)] transition-colors">
                    <td className="py-3 pr-4 text-[12px] text-[var(--text-muted)] font-mono">#{c.id}</td>
                    <td className="py-3 pr-4 text-[13px] text-[var(--text-secondary)] max-w-xs truncate">{c.text}</td>
                    <td className="py-3 pr-4 text-[12px] text-[var(--text-muted)]">{c.district}</td>
                    <td className="py-3 pr-4 text-[12px] text-[var(--text-muted)]">{c.category}</td>
                    <td className="py-3 pr-4 text-[12px] text-[var(--text-muted)] capitalize">{c.source}</td>
                    <td className="py-3"><StatusBadge status={c.status} /></td>
                  </tr>
                ))}
                {complaints.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[var(--text-muted)] text-sm">No complaints found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
}
