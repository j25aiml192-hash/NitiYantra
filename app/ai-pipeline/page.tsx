"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { runFullPipeline } from "@/lib/api";
import toast from "react-hot-toast";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";

/* ── Types & helpers ── */
interface PipelineResult {
  classified: Array<{ id: number; text: string; predicted_category: string; confidence: number }>;
  clusters: Array<{ cluster_label: string; complaints: Array<{ id: number; text: string }> }>;
  delayed_issues: Record<string, unknown>;
}
function getDelayed(raw: Record<string, unknown> | unknown[] | null | undefined): Array<{ id: number; issue_id?: number; complaint_id: number; department_id: number; days_open: number; status: string }> {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as never[];
  if (typeof raw === "object" && "delayed_issues" in raw && Array.isArray((raw as Record<string, unknown>).delayed_issues))
    return (raw as Record<string, unknown>).delayed_issues as never[];
  return [];
}
const DEPT: Record<number, string> = { 1: "PWD", 2: "Jal Board", 3: "DESU", 4: "MCD", 5: "Delhi Police" };
const PIE_COLORS = ["#2563EB", "#0EA5E9", "#F59E0B", "#EF4444", "#8B5CF6", "#10B981", "#EC4899", "#F97316"];
const CLUSTER_COLORS = ["#2563EB", "#0EA5E9", "#F59E0B", "#EF4444", "#8B5CF6", "#10B981", "#EC4899", "#F97316"];

/* ── Animated counter ── */
function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [v, setV] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const s = prev.current, d = to - s;
    if (!d) { setV(to); return; }
    const t0 = performance.now();
    const go = (now: number) => {
      const p = Math.min((now - t0) / 900, 1);
      setV(Math.round(s + d * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(go); else prev.current = to;
    };
    requestAnimationFrame(go);
  }, [to]);
  return <>{v}{suffix}</>;
}

/* ── Tooltip ── */
function ChartTip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color?: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#0F172A", border: "1px solid #1E293B", borderRadius: 8, padding: "8px 12px", boxShadow: "0 8px 24px rgba(0,0,0,0.3)" }}>
      {label && <p style={{ fontSize: 10, color: "#94A3B8", margin: "0 0 4px", fontWeight: 600 }}>{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ fontSize: 12, fontWeight: 700, color: p.color || "#fff", margin: 0 }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════ */
export default function AIPipelinePage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [stage, setStage] = useState(0);
  const [done, setDone] = useState(false);
  const [init, setInit] = useState(true);

  useEffect(() => {
    const c = sessionStorage.getItem("NitiYantra_pipeline_result");
    if (c) { try { setResult(JSON.parse(c)); setDone(true); } catch { /* */ } }
    setInit(false);
  }, []);

  const run = useCallback(async () => {
    setLoading(true); setDone(false); setResult(null); setStage(0);
    const iv = setInterval(() => setStage(p => p < 2 ? p + 1 : p), 2800);
    try {
      const data = await runFullPipeline();
      clearInterval(iv); setStage(3); setResult(data); setDone(true);
      sessionStorage.setItem("NitiYantra_pipeline_result", JSON.stringify(data));
      toast.success("Pipeline complete");
    } catch { clearInterval(iv); toast.error("Pipeline failed"); }
    finally { setLoading(false); }
  }, []);

  const delayed = result ? getDelayed(result.delayed_issues) : [];

  /* derived data for charts */
  const categoryMap: Record<string, number> = {};
  (result?.classified || []).forEach(c => { categoryMap[c.predicted_category] = (categoryMap[c.predicted_category] || 0) + 1; });
  const pieData = Object.entries(categoryMap).map(([name, value]) => ({ name, value }));

  const confBuckets = [
    { range: "90-100%", count: 0, color: "#10B981" },
    { range: "70-89%", count: 0, color: "#0EA5E9" },
    { range: "50-69%", count: 0, color: "#F59E0B" },
    { range: "<50%", count: 0, color: "#EF4444" },
  ];
  (result?.classified || []).forEach(c => {
    const p = Math.round(c.confidence * 100);
    if (p >= 90) confBuckets[0].count++;
    else if (p >= 70) confBuckets[1].count++;
    else if (p >= 50) confBuckets[2].count++;
    else confBuckets[3].count++;
  });

  const sevBreakdown = { critical: 0, warning: 0, normal: 0 };
  delayed.forEach(d => {
    if (d.days_open >= 15) sevBreakdown.critical++;
    else if (d.days_open >= 7) sevBreakdown.warning++;
    else sevBreakdown.normal++;
  });

  const steps = ["Classify", "Cluster", "Detect"];

  return (
    <div className="relative min-h-[90vh] bg-transparent font-sans overflow-hidden">
      <style>{`
        @keyframes enter { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
        @keyframes flowBar { 0% { background-position:0% 50% } 100% { background-position:200% 50% } }
        .chart-3d { filter: drop-shadow(0 12px 12px rgba(0,0,0,0.15)) drop-shadow(0 4px 4px rgba(0,0,0,0.1)); }
        .bar-3d { filter: drop-shadow(0 6px 8px rgba(0,0,0,0.1)); }
      `}</style>
      
      {/* 3D background elements */}
      <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-indigo-400/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-teal-400/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-[1200px] mx-auto px-6 py-12">
        {/* ═══ Header ═══ */}
        <div className="flex justify-between items-center mb-10 animate-[enter_0.4s_ease_both]">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-1">AI Intelligence Pipeline</h1>
            <p className="text-sm font-medium text-slate-500">Three-stage advanced machine learning inference</p>
          </div>
          <button onClick={run} disabled={loading} className={`
            inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold transition-all
            ${loading ? 'bg-slate-100 text-slate-400 cursor-wait' : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/40 hover:-translate-y-0.5'}
          `}>
            {loading && <svg className="w-4 h-4 border-2 border-slate-300 border-t-indigo-500 rounded-full animate-spin" viewBox="0 0 24 24" />}
            {loading ? "Processing..." : done ? "Re-run Pipeline" : "Initialize Pipeline"}
          </button>
        </div>

        {/* ═══ Pipeline Stepper ═══ */}
        <div className="mb-10 p-6 bg-white/60 backdrop-blur-xl border border-slate-200/60 rounded-3xl shadow-sm animate-[enter_0.4s_ease_40ms_both]">
          <div className="flex items-center justify-between relative z-10 w-full max-w-2xl mx-auto">
            {steps.map((s, i) => {
              const active = loading && stage === i;
              const passed = done || (loading && stage > i);
              const color = passed ? 'bg-emerald-500 border-emerald-500' : active ? 'bg-indigo-600 border-indigo-600' : 'bg-slate-100 border-slate-200';
              const textColor = passed ? 'text-emerald-600' : active ? 'text-indigo-600' : 'text-slate-400';
              return (
                <div key={s} className="flex flex-col items-center gap-3 relative z-10">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 shadow-sm transition-all duration-500 ${color} ${active ? 'scale-110 shadow-indigo-500/30' : ''}`}>
                    {passed ? (
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    ) : active ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <span className="text-sm font-bold text-slate-400">{i + 1}</span>
                    )}
                  </div>
                  <span className={`text-sm font-bold ${textColor} transition-colors tracking-wide`}>{s}</span>
                </div>
              );
            })}
            
            {/* Connecting Lines */}
            <div className="absolute top-6 left-12 right-12 h-1 bg-slate-100 -z-10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-500 via-indigo-500 to-indigo-500 transition-all duration-1000 ease-in-out" style={{ width: done ? '100%' : `${(stage / (steps.length - 1)) * 100}%` }} />
            </div>
          </div>
        </div>

        {/* ═══ Loading ═══ */}
        {init && (
           <div className="grid grid-cols-3 gap-6">
             {Array.from({ length: 6 }).map((_, i) => (
               <div key={i} className="h-40 rounded-3xl bg-slate-100/50 animate-pulse border border-slate-200/50" />
             ))}
           </div>
        )}

        {/* ═══ Results — Bento Grid ═══ */}
        {result && done && (
          <div className="grid grid-cols-12 gap-6 animate-[enter_0.5s_ease_80ms_both]">

            {/* ── Stat Cards ── */}
            {[
              { title: "Classified", count: result.classified?.length ?? 0, sub: "analyzed anomalies", from: "from-blue-500", to: "to-indigo-500" },
              { title: "Clusters", count: result.clusters?.length ?? 0, sub: "semantic groups", from: "from-sky-400", to: "to-cyan-500" },
              { title: "Delayed", count: delayed.length, sub: "SLA violations", from: delayed.length ? "from-rose-500" : "from-emerald-400", to: delayed.length ? "to-pink-600" : "to-teal-500" }
            ].map((stat, i) => (
              <div key={i} className="col-span-12 md:col-span-4 bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-6 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 shadow-sm hover:shadow-xl">
                <div className={`absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r ${stat.from} ${stat.to}`} />
                <div className={`absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br ${stat.from} ${stat.to} opacity-10 rounded-full blur-2xl group-hover:opacity-20 transition-opacity`} />
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">{stat.title}</p>
                <div className="flex items-end gap-2">
                  <p className="text-5xl font-black text-slate-800 tracking-tighter">
                    <Counter to={stat.count} />
                  </p>
                </div>
                <p className="text-sm font-semibold text-slate-500 mt-2">{stat.sub}</p>
              </div>
            ))}

            {/* ── Category Distribution (3D Pie) ── */}
            <div className="col-span-12 md:col-span-5 bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <p className="text-lg font-bold text-slate-900 tracking-tight">Category Distribution</p>
                <p className="text-xs font-medium text-slate-500">AI classification breakdown</p>
              </div>
              {pieData.length > 0 ? (
                <div className="flex items-center gap-6 mt-4">
                  <div className="w-36 h-36 shrink-0 chart-3d">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <defs>
                          {PIE_COLORS.map((c, i) => (
                            <linearGradient key={`pie_g_${i}`} id={`pie_g_${i}`} x1="0" y1="0" x2="1" y2="1">
                              <stop offset="5%" stopColor={c} />
                              <stop offset="95%" stopColor={c} stopOpacity={0.6} />
                            </linearGradient>
                          ))}
                        </defs>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" stroke="none">
                          {pieData.map((_, i) => <Cell key={i} fill={`url(#pie_g_${i})`} />)}
                        </Pie>
                        <Tooltip content={<ChartTip />} cursor={{ fill: 'transparent' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-col gap-2 flex-1">
                    {pieData.map((d, i) => (
                      <div key={d.name} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-2.5 h-2.5 rounded-sm shadow-sm" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                          <span className="text-xs font-bold text-slate-600">{d.name}</span>
                        </div>
                        <span className="text-xs font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : <p className="text-sm text-slate-400 py-10 text-center">No data available</p>}
            </div>

            {/* ── Confidence Distribution (3D Bar) ── */}
            <div className="col-span-12 md:col-span-7 bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <p className="text-lg font-bold text-slate-900 tracking-tight">Confidence Distribution</p>
                <p className="text-xs font-medium text-slate-500 mb-6">Model certainty across inferences</p>
              </div>
              <div className="w-full h-[180px] bar-3d">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={confBuckets} barSize={40}>
                    <defs>
                      {confBuckets.map((b, i) => (
                        <linearGradient key={`bar_g_${i}`} id={`bar_g_${i}`} x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor={b.color} />
                          <stop offset="50%" stopColor={b.color} stopOpacity={0.8} />
                          <stop offset="100%" stopColor={b.color} stopOpacity={0.6} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} opacity={0.5} />
                    <XAxis dataKey="range" tick={{ fontSize: 11, fill: "#64748b", fontWeight: 600 }} axisLine={false} tickLine={false} dy={10} />
                    <YAxis tick={{ fontSize: 11, fill: "#64748b", fontWeight: 600 }} axisLine={false} tickLine={false} dx={-10} />
                    <Tooltip content={<ChartTip />} cursor={{ fill: 'rgba(226, 232, 240, 0.4)' }} />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                      {confBuckets.map((b, i) => <Cell key={i} fill={`url(#bar_g_${i})`} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ── Classification Table ── */}
            <div className="col-span-12 bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-200/60 bg-slate-50/50">
                <p className="text-lg font-bold text-slate-900 tracking-tight">Classification Results</p>
                <p className="text-xs font-medium text-slate-500">{result.classified?.length || 0} records via BART-large-MNLI zero-shot</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50/80">
                      {["ID", "Complaint Text", "Predicted Category", "Confidence"].map(h => (
                        <th key={h} className={`px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest ${h === "Confidence" ? "text-right" : "text-left"} border-b border-slate-200/60`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(result.classified || []).slice(0, 5).map((c, i) => {
                      const conf = Math.round(c.confidence * 100);
                      const cc = conf >= 80 ? "#10B981" : conf >= 50 ? "#F59E0B" : "#EF4444";
                      const bg = conf >= 80 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : conf >= 50 ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-rose-50 text-rose-700 border-rose-200";
                      return (
                        <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 text-xs font-bold text-indigo-600">#{c.id}</td>
                          <td className="px-6 py-4 text-sm font-medium text-slate-700 max-w-[400px] truncate">{c.text}</td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${bg}`}>{c.predicted_category}</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-3">
                              <div className="w-20 h-2 rounded-full bg-slate-200 overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${conf}%`, background: cc, animationDelay: `${i * 100}ms` }} />
                              </div>
                              <span className="text-sm font-black w-10 text-right" style={{ color: cc }}>{conf}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Issue Clusters ── */}
            <div className="col-span-12">
              <div className="mb-6">
                <p className="text-xl font-bold text-slate-900 tracking-tight">Issue Clusters</p>
                <p className="text-sm font-medium text-slate-500">{result.clusters?.length || 0} groups formed via MiniLM-L6 semantic similarity</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(result.clusters || []).map((cluster, idx) => {
                  const clr = CLUSTER_COLORS[idx % CLUSTER_COLORS.length];
                  return (
                    <div key={idx} className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-3xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 group relative">
                       <div className="absolute top-0 inset-x-0 h-1 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: clr }} />
                      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: clr, boxShadow: `0 0 10px ${clr}` }} />
                          <span className="text-sm font-bold text-slate-800">{cluster.cluster_label}</span>
                        </div>
                        <span className="text-xs font-black px-2 py-1 rounded-lg" style={{ color: clr, background: `${clr}1a` }}>{cluster.complaints.length}</span>
                      </div>
                      <div className="p-5 flex flex-col gap-3">
                        {cluster.complaints.slice(0, 3).map(comp => (
                          <div key={comp.id} className="flex gap-3 p-3 rounded-xl bg-slate-50/50 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-colors">
                            <span className="text-[10px] font-bold text-indigo-400 mt-0.5 shrink-0">#{comp.id}</span>
                            <p className="text-xs font-medium text-slate-600 line-clamp-2">{comp.text}</p>
                          </div>
                        ))}
                        {cluster.complaints.length > 3 && (
                          <p className="text-[10px] font-bold text-slate-400 text-center uppercase tracking-widest mt-2">+{cluster.complaints.length - 3} more</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Delayed Issues ── */}
            {delayed.length > 0 && (
              <div className="col-span-12 bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden mt-4">
                <div className="px-6 py-5 border-b border-slate-200/60 bg-slate-50/50 flex justify-between items-center">
                  <div>
                    <p className="text-lg font-bold text-slate-900 tracking-tight">SLA Delays Detected</p>
                    <p className="text-xs font-medium text-slate-500">{delayed.length} issues past threshold</p>
                  </div>
                  <div className="flex gap-3 items-center">
                    {sevBreakdown.critical > 0 && <span className="text-xs font-black text-rose-700 bg-rose-100 px-3 py-1 rounded-xl shadow-sm">{sevBreakdown.critical} CRITICAL</span>}
                    {sevBreakdown.warning > 0 && <span className="text-xs font-black text-amber-700 bg-amber-100 px-3 py-1 rounded-xl shadow-sm">{sevBreakdown.warning} WARNING</span>}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50/80">
                        {["Issue", "Complaint", "Department", "Days Open", "Severity", "Status"].map(h => (
                          <th key={h} className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest text-left border-b border-slate-200/60">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {delayed.slice(0, 15).map(d => {
                        const sev = d.days_open >= 15 ? { label: "Critical", color: "text-rose-600", bg: "bg-rose-50 border-rose-200" } : d.days_open >= 7 ? { label: "Warning", color: "text-amber-600", bg: "bg-amber-50 border-amber-200" } : { label: "Normal", color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" };
                        return (
                          <tr key={d.issue_id ?? d.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 text-xs font-bold text-slate-400">ISS-{String(d.issue_id ?? d.id).padStart(3, "0")}</td>
                            <td className="px-6 py-4 text-xs font-bold text-indigo-500">#{d.complaint_id}</td>
                            <td className="px-6 py-4 text-sm font-bold text-slate-700">{DEPT[d.department_id] || `Dept ${d.department_id}`}</td>
                            <td className="px-6 py-4">
                              <span className={`text-sm font-black w-10 block ${sev.color}`}>{d.days_open}d</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border ${sev.bg} ${sev.color}`}>{sev.label}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`text-xs font-bold capitalize ${d.status === 'escalated' ? 'text-rose-500' : d.status === 'in_progress' ? 'text-amber-500' : 'text-indigo-500'}`}>{d.status.replace("_", " ")}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ═══ Empty state ═══ */}
        {!init && !result && !loading && (
          <div className="flex flex-col items-center justify-center py-32 animate-[enter_0.5s_ease_both]">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 flex items-center justify-center mb-6 shadow-sm">
              <svg className="w-10 h-10 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082" />
              </svg>
            </div>
            <p className="text-2xl font-extrabold text-slate-900 mb-2">Ready to Orchestrate</p>
            <p className="text-sm font-medium text-slate-500 max-w-sm text-center mb-8">
              Run the AI pipeline to classify complaints, discover unstructured patterns, and detect SLA violations across all departments.
            </p>
            <button onClick={run} className="px-8 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/40 hover:-translate-y-0.5 transition-all">
              Initialize Pipeline →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
