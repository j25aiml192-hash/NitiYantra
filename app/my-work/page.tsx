"use client";

import { useState, useEffect, useCallback } from "react";
import { useSidebar } from "@/lib/SidebarContext";
import { fetchMyWork, fetchMyReportCard, getCurrentUser, MyWorkComplaint, ReportCard } from "@/lib/api";

/* ─── SLA badge component ─── */
function SlaBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; label: string; border: string }> = {
    on_track:   { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-200", label: "On Track" },
    warning:    { bg: "bg-amber-50",   text: "text-amber-600",   border: "border-amber-200",   label: "Warning" },
    breached:   { bg: "bg-rose-50",    text: "text-rose-600",    border: "border-rose-200",    label: "Breached" },
    resolved:   { bg: "bg-indigo-50",  text: "text-indigo-600",  border: "border-indigo-200",  label: "Resolved" },
    unassigned: { bg: "bg-slate-50",   text: "text-slate-600",   border: "border-slate-200",   label: "Unassigned" },
  };
  const s = map[status] || map.unassigned;
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-xl text-[10px] font-black tracking-widest uppercase border shadow-sm ${s.bg} ${s.text} ${s.border}`}>
      {s.label}
    </span>
  );
}

/* ─── Status badge ─── */
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; label: string; border: string; text: string }> = {
    pending:     { bg: "bg-amber-100",  text: "text-amber-700", border: "border-amber-200", label: "Pending" },
    in_progress: { bg: "bg-blue-100",   text: "text-blue-700",  border: "border-blue-200",  label: "In Progress" },
    resolved:    { bg: "bg-emerald-100",text: "text-emerald-700",border: "border-emerald-200",label: "Resolved" },
    escalated:   { bg: "bg-rose-100",   text: "text-rose-700",  border: "border-rose-200",  label: "Escalated" },
  };
  const s = map[status] || { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-200", label: status };
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-lg text-[10px] tracking-wide font-black border uppercase ${s.bg} ${s.text} ${s.border}`}>
      {s.label}
    </span>
  );
}

/* ─── Grade color helper ─── */
function gradeColor(grade: string): string {
  if (grade.startsWith("A")) return "from-emerald-400 to-teal-500 text-white shadow-emerald-500/40";
  if (grade.startsWith("B")) return "from-amber-400 to-orange-500 text-white shadow-amber-500/40";
  return "from-rose-500 to-pink-600 text-white shadow-rose-500/40";
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
    <div className="relative min-h-[90vh] bg-transparent font-sans overflow-hidden text-slate-800">
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Background blobs for premium effect */}
      <div className="fixed top-0 left-1/4 w-[600px] h-[600px] bg-indigo-400/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-[500px] h-[500px] bg-emerald-400/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-[1200px] mx-auto px-6 py-12 space-y-8">

        {/* ═══ HEADER ═══ */}
        <div className="animate-[fadeUp_0.5s_ease-out_forwards]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-1">
                  Welcome back, {displayName}
                </h1>
                <p className="text-sm font-medium text-slate-500">
                  {department} • {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>
            <button
              onClick={loadData}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/80 backdrop-blur border border-slate-200 text-sm font-bold text-slate-600 hover:text-indigo-600 hover:border-indigo-300 hover:bg-slate-50 transition-all shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Synchronize
            </button>
          </div>
        </div>

        {/* ═══ STAT CARDS ═══ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: "Total Assigned",     value: report?.total_assigned ?? 0,     icon: "📋", from: "from-blue-500", to: "to-indigo-500" },
            { label: "Resolved This Week", value: report?.this_week_resolved ?? 0, icon: "✅", from: "from-emerald-400", to: "to-teal-500" },
            { label: "SLA Breached",       value: report?.sla_breached ?? 0,       icon: "🔴", from: "from-rose-500", to: "to-pink-600" },
            { label: "On-Time Rate",       value: `${report?.on_time_rate ?? 100}%`, icon: "⏱", from: "from-sky-400", to: "to-cyan-500" },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className="group relative bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden"
              style={{ animation: `fadeUp 0.5s ease-out ${(i+1)*0.1}s forwards`, opacity: 0 }}
            >
              <div className={`absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r ${stat.from} ${stat.to}`} />
              <div className={`absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br ${stat.from} ${stat.to} opacity-10 rounded-full blur-2xl group-hover:opacity-20 transition-opacity`} />
              
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</span>
                <span className="text-xl opacity-80 backdrop-blur bg-white/50 w-8 h-8 flex items-center justify-center rounded-xl shadow-sm border border-white">{stat.icon}</span>
              </div>
              <p className="text-4xl font-black text-slate-800 tracking-tighter">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* ═══ REPORT CARD + TABLE ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Report Card ── */}
          <div className="lg:col-span-1" style={{ animation: `fadeUp 0.5s ease-out 0.2s forwards`, opacity: 0 }}>
            <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-8 h-full shadow-sm relative overflow-hidden">
               {/* 3D styling for Report card BG */}
               <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-slate-100 rounded-bl-full opacity-50 pointer-events-none -mr-10 -mt-10" />
               <div className="relative z-10">
                <h3 className="text-sm font-black text-slate-900 tracking-tight mb-8">Performance Report</h3>

                {report && (
                  <div className="flex flex-col items-center">
                    {/* Grade Badge 3D */}
                    <div className={`w-32 h-32 rounded-[2rem] bg-gradient-to-br ${gradeColor(report.grade)} flex items-center justify-center shadow-lg relative mb-6 transform transition-transform hover:scale-105 duration-500`}>
                      <div className="absolute inset-2 border-2 border-white/20 rounded-[1.5rem]" />
                      <span className="text-6xl font-black">{report.grade}</span>
                    </div>

                    <p className="text-lg font-bold text-slate-800 mb-1">
                      {report.grade.startsWith("A") ? "Excellent Status" : report.grade.startsWith("B") ? "Good Progress" : "Needs Improvement"}
                    </p>
                    <p className="text-xs font-medium text-slate-500 mb-8 max-w-[200px] text-center">Based on SLA compliance & aggregated resolution speed</p>

                    {/* Stats rows */}
                    <div className="w-full space-y-5">
                      {[
                        { label: "Resolution Rate",     value: `${report.resolution_rate}%`,        bar: report.resolution_rate, from: "from-indigo-500", to: "to-purple-500" },
                        { label: "Avg Resolution Days",  value: `${report.avg_resolution_days}d`,   bar: Math.max(0, 100 - report.avg_resolution_days * 5), from: "from-blue-400", to: "to-cyan-500" },
                        { label: "On-Time Rate",        value: `${report.on_time_rate}%`,          bar: report.on_time_rate, from: "from-emerald-400", to: "to-teal-500" },
                      ].map((row) => (
                        <div key={row.label}>
                          <div className="flex justify-between mb-2">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{row.label}</span>
                            <span className="text-xs font-black text-slate-800">{row.value}</span>
                          </div>
                          <div className="h-2 bg-slate-100 border border-slate-200/50 rounded-full overflow-hidden shadow-inner flex">
                            <div
                              className={`h-full rounded-full bg-gradient-to-r ${row.from} ${row.to} shadow-[0_0_10px_rgba(0,0,0,0.1)] transition-all duration-1000 ease-out`}
                              style={{ width: `${Math.min(row.bar, 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Mini stats */}
                    <div className="grid grid-cols-3 gap-3 w-full mt-8">
                      {[
                         { label: "Streak", value: `${report.streak_days}d`, bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-100" },
                         { label: "Pending", value: report.pending, bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-100" },
                         { label: "Escalated", value: report.escalated, bg: "bg-rose-50", text: "text-rose-600", border: "border-rose-100" },
                      ].map((m) => (
                        <div key={m.label} className={`text-center rounded-2xl p-3 border ${m.bg} ${m.border} transition-transform hover:-translate-y-1`}>
                          <p className={`text-xl font-black ${m.text}`}>{m.value}</p>
                          <p className="text-[9px] font-bold text-slate-500 uppercase mt-1 tracking-wider">{m.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
               </div>
            </div>
          </div>

          {/* ── Complaints Table ── */}
          <div className="lg:col-span-2" style={{ animation: `fadeUp 0.5s ease-out 0.3s forwards`, opacity: 0 }}>
            <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden h-full flex flex-col">
              <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">Active Work Queue</h3>
                  <p className="text-xs font-medium text-slate-500">Your currently assigned grievances</p>
                </div>
                <span className="text-xs font-black text-indigo-700 bg-indigo-100 px-3 py-1.5 rounded-xl shadow-sm border border-indigo-200">
                  {complaints.length} Assigned
                </span>
              </div>

              {complaints.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-6 flex-1">
                  <div className="w-20 h-20 rounded-[2rem] bg-slate-100 border border-slate-200 flex items-center justify-center mb-6 shadow-sm">
                    <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <p className="text-base font-bold text-slate-700">Inbox Zero</p>
                  <p className="text-sm font-medium text-slate-500 mt-1 max-w-xs text-center">You have successfully cleared your assigned grievance queue.</p>
                </div>
              ) : (
                <div className="overflow-x-auto flex-1">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-100">
                        {["ID", "Category", "District", "Status", "Days", "SLA"].map((h) => (
                          <th key={h} className="text-left px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {complaints.map((c) => (
                        <tr
                          key={c.id}
                          onClick={() => setSelectedComplaint(selectedComplaint?.id === c.id ? null : c)}
                          className={`border-b border-slate-50 cursor-pointer transition-all ${selectedComplaint?.id === c.id ? 'bg-indigo-50/50' : 'hover:bg-slate-50/80'}`}
                        >
                          <td className="px-6 py-4 text-xs font-bold text-indigo-600">#{c.id}</td>
                          <td className="px-6 py-4 text-sm font-bold text-slate-700 max-w-[150px] truncate">{c.category}</td>
                          <td className="px-6 py-4 text-xs font-medium text-slate-500">{c.district}</td>
                          <td className="px-6 py-4"><StatusBadge status={c.status} /></td>
                          <td className="px-6 py-4 text-xs font-black text-slate-700">{c.days_open}d</td>
                          <td className="px-6 py-4"><SlaBadge status={c.sla_status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ── Complaint Detail (when selected) ── */}
            {selectedComplaint && (
              <div className="mt-6 bg-white/90 backdrop-blur-xl rounded-3xl border border-indigo-100 p-8 shadow-xl relative overflow-hidden animate-[fadeUp_0.3s_ease-out_forwards]">
                <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-indigo-500 to-purple-500" />
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-black text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100 tracking-widest">#{selectedComplaint.id}</span>
                    <StatusBadge status={selectedComplaint.status} />
                    <SlaBadge status={selectedComplaint.sla_status} />
                  </div>
                  <button
                    onClick={() => setSelectedComplaint(null)}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 mb-6">
                  <p className="text-sm font-medium text-slate-700 leading-relaxed">{selectedComplaint.text}</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white border border-slate-100 p-3 rounded-xl shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">District</p>
                    <p className="text-sm font-bold text-slate-800">{selectedComplaint.district}</p>
                  </div>
                  <div className="bg-white border border-slate-100 p-3 rounded-xl shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Category</p>
                    <p className="text-sm font-bold text-slate-800 truncate">{selectedComplaint.category}</p>
                  </div>
                  <div className="bg-white border border-slate-100 p-3 rounded-xl shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Submitted</p>
                    <p className="text-sm font-bold text-slate-800">{new Date(selectedComplaint.date_submitted).toLocaleDateString('en-IN')}</p>
                  </div>
                  <div className="bg-white border border-slate-100 p-3 rounded-xl shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Duration</p>
                    <p className="text-sm font-bold text-slate-800">{selectedComplaint.days_open} days open</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
