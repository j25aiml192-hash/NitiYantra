"use client";

import { useState, useEffect, useCallback } from "react";
import { useSidebar } from "@/lib/SidebarContext";
import { fetchMyWork, fetchMyReportCard, getCurrentUser, MyWorkComplaint, ReportCard } from "@/lib/api";

/* ─── SLA badge component ─── */
function SlaBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    on_track:   { bg: "bg-emerald-500/15", text: "text-emerald-400", label: "On Track" },
    warning:    { bg: "bg-amber-500/15",   text: "text-amber-400",   label: "Warning" },
    breached:   { bg: "bg-red-500/15",     text: "text-red-400",     label: "Breached" },
    resolved:   { bg: "bg-blue-500/15",    text: "text-blue-400",    label: "Resolved" },
    unassigned: { bg: "bg-slate-500/15",   text: "text-slate-400",   label: "Unassigned" },
  };
  const s = map[status] || map.unassigned;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}

/* ─── Status badge ─── */
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; label: string }> = {
    pending:     { bg: "bg-amber-500",   label: "Pending" },
    in_progress: { bg: "bg-blue-500",    label: "In Progress" },
    resolved:    { bg: "bg-emerald-500", label: "Resolved" },
    escalated:   { bg: "bg-red-500",     label: "Escalated" },
  };
  const s = map[status] || { bg: "bg-slate-500", label: status };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${s.bg}`}>
      {s.label}
    </span>
  );
}

/* ─── Grade color helper ─── */
function gradeColor(grade: string): string {
  if (grade.startsWith("A")) return "from-emerald-500 to-emerald-600";
  if (grade.startsWith("B")) return "from-amber-500 to-amber-600";
  return "from-red-500 to-red-600";
}

function gradeGlow(grade: string): string {
  if (grade.startsWith("A")) return "shadow-emerald-500/30";
  if (grade.startsWith("B")) return "shadow-amber-500/30";
  return "shadow-red-500/30";
}

/* ═══════════════ COMPONENT ═══════════════ */
export default function MyWorkPage() {
  const { isOpen: sidebarOpen } = useSidebar();
  void sidebarOpen;

  const [complaints, setComplaints] = useState<MyWorkComplaint[]>([]);
  const [report, setReport] = useState<ReportCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState<MyWorkComplaint | null>(null);
  const user = getCurrentUser();

  const loadData = useCallback(async () => {
    try {
      const [workData, reportData] = await Promise.all([
        fetchMyWork(),
        fetchMyReportCard(),
      ]);
      setComplaints(workData.complaints);
      setReport(reportData);
    } catch (err) {
      console.error("Error loading my work:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const displayName = report?.user?.username || user?.username || "Worker";
  const department = report?.user?.department || "Department";

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[var(--text-muted)]">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-[var(--text)]">
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.5s ease-out forwards; }
        .fade-up-1 { animation-delay: 0.05s; opacity: 0; }
        .fade-up-2 { animation-delay: 0.1s; opacity: 0; }
        .fade-up-3 { animation-delay: 0.15s; opacity: 0; }
        .fade-up-4 { animation-delay: 0.2s; opacity: 0; }
      `}</style>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* ═══ HEADER ═══ */}
        <div className="fade-up">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
                    Welcome back, {displayName}
                  </h1>
                  <p className="text-sm text-slate-600">
                    {department} • {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={loadData}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--card)] border border-[var(--border)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg)] transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* ═══ STAT CARDS ═══ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Assigned",     value: report?.total_assigned ?? 0,     icon: "📋", color: "from-indigo-500/10 to-indigo-600/5",  textColor: "text-indigo-400",  borderColor: "border-indigo-500/20" },
            { label: "Resolved This Week", value: report?.this_week_resolved ?? 0, icon: "✅", color: "from-emerald-500/10 to-emerald-600/5", textColor: "text-emerald-400", borderColor: "border-emerald-500/20" },
            { label: "SLA Breached",       value: report?.sla_breached ?? 0,       icon: "🔴", color: "from-red-500/10 to-red-600/5",        textColor: "text-red-400",     borderColor: "border-red-500/20" },
            { label: "On-Time Rate",       value: `${report?.on_time_rate ?? 100}%`, icon: "⏱", color: "from-amber-500/10 to-amber-600/5",    textColor: (report?.on_time_rate ?? 100) >= 80 ? "text-emerald-400" : (report?.on_time_rate ?? 100) >= 50 ? "text-amber-400" : "text-red-400", borderColor: "border-amber-500/20" },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className={`fade-up fade-up-${i + 1} bg-gradient-to-br ${stat.color} rounded-2xl border ${stat.borderColor} p-5 backdrop-blur-sm`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">{stat.label}</span>
                <span className="text-lg">{stat.icon}</span>
              </div>
              <p className={`text-3xl font-black ${stat.textColor}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* ═══ REPORT CARD + TABLE ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Report Card ── */}
          <div className="fade-up fade-up-2 lg:col-span-1">
            <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-6 h-full">
              <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-6">Performance Report Card</h3>

              {report && (
                <div className="flex flex-col items-center">
                  {/* Grade Badge */}
                  <div className={`w-24 h-24 rounded-3xl bg-gradient-to-br ${gradeColor(report.grade)} flex items-center justify-center shadow-2xl ${gradeGlow(report.grade)} mb-4`}>
                    <span className="text-4xl font-black text-white">{report.grade}</span>
                  </div>

                  <p className="text-sm font-semibold text-[var(--text)] mb-1">
                    {report.grade.startsWith("A") ? "Excellent" : report.grade.startsWith("B") ? "Good" : "Needs Improvement"}
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)] mb-6">Based on SLA compliance & resolution rate</p>

                  {/* Stats rows */}
                  <div className="w-full space-y-3">
                    {[
                      { label: "Resolution Rate",     value: `${report.resolution_rate}%`,        bar: report.resolution_rate, color: "bg-indigo-500" },
                      { label: "Avg Resolution Days",  value: `${report.avg_resolution_days}d`,   bar: Math.max(0, 100 - report.avg_resolution_days * 5), color: "bg-blue-500" },
                      { label: "On-Time Rate",        value: `${report.on_time_rate}%`,          bar: report.on_time_rate, color: "bg-emerald-500" },
                    ].map((row) => (
                      <div key={row.label}>
                        <div className="flex justify-between mb-1">
                          <span className="text-[10px] text-[var(--text-muted)]">{row.label}</span>
                          <span className="text-[10px] font-bold text-[var(--text-secondary)]">{row.value}</span>
                        </div>
                        <div className="h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${row.color} transition-all duration-1000`}
                            style={{ width: `${Math.min(row.bar, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Mini stats */}
                  <div className="grid grid-cols-3 gap-2 w-full mt-6">
                    {[
                      { label: "Streak", value: `${report.streak_days}d`, color: "text-amber-400" },
                      { label: "Pending", value: report.pending, color: "text-blue-400" },
                      { label: "Escalated", value: report.escalated, color: "text-red-400" },
                    ].map((m) => (
                      <div key={m.label} className="text-center bg-[var(--bg)] rounded-xl p-2.5 border border-[var(--border)]">
                        <p className={`text-lg font-black ${m.color}`}>{m.value}</p>
                        <p className="text-[9px] text-[var(--text-muted)]">{m.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Complaints Table ── */}
          <div className="fade-up fade-up-3 lg:col-span-2">
            <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
                <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">My Complaints</h3>
                <span className="text-[10px] font-semibold text-[var(--text-muted)] bg-[var(--bg)] px-2.5 py-1 rounded-lg">
                  {complaints.length} assigned
                </span>
              </div>

              {complaints.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-6">
                  <div className="w-16 h-16 rounded-3xl bg-[var(--bg)] flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-[var(--text-secondary)]">No complaints assigned yet</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">You&apos;ll see assigned complaints here</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[var(--border)]">
                        {["ID", "Category", "District", "Status", "Days", "SLA"].map((h) => (
                          <th key={h} className="text-left px-4 py-3 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {complaints.map((c) => (
                        <tr
                          key={c.id}
                          onClick={() => setSelectedComplaint(selectedComplaint?.id === c.id ? null : c)}
                          className="border-b border-[var(--border)] hover:bg-[var(--bg)] cursor-pointer transition-colors"
                        >
                          <td className="px-4 py-3 text-xs font-mono font-bold text-indigo-400">#{c.id}</td>
                          <td className="px-4 py-3 text-xs font-medium text-[var(--text)]">{c.category}</td>
                          <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">{c.district}</td>
                          <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                          <td className="px-4 py-3 text-xs font-bold text-[var(--text-secondary)]">{c.days_open}d</td>
                          <td className="px-4 py-3"><SlaBadge status={c.sla_status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ── Complaint Detail (when selected) ── */}
            {selectedComplaint && (
              <div className="fade-up mt-4 bg-[var(--card)] rounded-2xl border border-[var(--border)] p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-indigo-400">#{selectedComplaint.id}</span>
                    <StatusBadge status={selectedComplaint.status} />
                    <SlaBadge status={selectedComplaint.sla_status} />
                  </div>
                  <button
                    onClick={() => setSelectedComplaint(null)}
                    className="text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                  >
                    ✕ Close
                  </button>
                </div>
                <p className="text-sm text-[var(--text)] leading-relaxed mb-3">{selectedComplaint.text}</p>
                <div className="flex flex-wrap gap-4 text-[11px] text-[var(--text-muted)]">
                  <span>📍 {selectedComplaint.district}</span>
                  <span>📂 {selectedComplaint.category}</span>
                  <span>📅 {new Date(selectedComplaint.date_submitted).toLocaleDateString('en-IN')}</span>
                  <span>⏱ {selectedComplaint.days_open} days open</span>
                  {selectedComplaint.escalated && <span className="text-red-400">⚠ Escalated</span>}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
