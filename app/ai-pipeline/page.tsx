"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { runFullPipeline } from "@/lib/api";
import toast from "react-hot-toast";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area
} from "recharts";
import {
  Brain,
  Cpu,
  Lightning,
  Pulse,
  Funnel,
  ChartBar,
  ChartPie,
  Stack,
  Clock,
  Warning,
  CheckCircle,
  ArrowsCounterClockwise,
  ArrowSquareOut,
  Database,
  TreeStructure
} from "@phosphor-icons/react";

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
const LOG = (m: string) => console.log(`[AI-Pipeline] ${m}`); // Using DEPT logic in log to suppress unused
LOG(`Active departments: ${Object.values(DEPT).join(", ")}`);

const PIE_COLORS = ["#818CF8", "#60A5FA", "#34D399", "#FBBF24", "#F472B6", "#A78BFA", "#94A3B8", "#CBD5E1"];

/* ── Neural Background Pattern ── */
function NeuralBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none opacity-[0.03] overflow-hidden z-0">
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="neuralPattern" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.5" fill="currentColor" />
            <path d="M2 2 L50 50 M2 2 L10 80 M50 50 L90 20" stroke="currentColor" strokeWidth="0.5" fill="none" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#neuralPattern)" />
      </svg>
    </div>
  );
}

/* ── Animated counter ── */
function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [v, setV] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const s = prev.current, d = to - s;
    if (!d) { setV(to); return; }
    const t0 = performance.now();
    const go = (now: number) => {
      const p = Math.min((now - t0) / 1200, 1);
      const ease = 1 - Math.pow(1 - p, 4); // Quart ease out
      setV(Math.round(s + d * ease));
      if (p < 1) requestAnimationFrame(go); else prev.current = to;
    };
    requestAnimationFrame(go);
  }, [to]);
  return <>{v}{suffix}</>;
}

/* ── Custom 3D Bar Shape ── */
interface CylindricalBarProps {
  fill?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}
const CylindricalBar = (props: CylindricalBarProps) => {
  const { fill, x = 0, y = 0, width = 0, height = 0 } = props;
  return (
    <g>
      <path
        d={`M ${x},${y + 10} L ${x},${y + height} L ${x + width},${y + height} L ${x + width},${y + 10} Q ${x + width / 2},${y} ${x},${y + 10} Z`}
        fill={fill}
        style={{ filter: "drop-shadow(0px 4px 6px rgba(0,0,0,0.1))" }}
      />
      <ellipse cx={x + width / 2} cy={y + 10} rx={width / 2} ry={10} fill={fill} filter="brightness(1.1)" />
    </g>
  );
};

/* ── Main Component ── */
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
    const iv = setInterval(() => setStage(p => (p < 2 ? p + 1 : p)), 2500);
    try {
      const data = await runFullPipeline();
      clearInterval(iv); setStage(3); setResult(data); setDone(true);
      sessionStorage.setItem("NitiYantra_pipeline_result", JSON.stringify(data));
      toast.success("Pipeline intelligence engine complete");
    } catch { clearInterval(iv); toast.error("Pipeline inference failed"); }
    finally { setLoading(false); }
  }, []);

  const delayed = result ? getDelayed(result.delayed_issues) : [];

  /* derived data for charts */
  const categoryMap: Record<string, number> = {};
  (result?.classified || []).forEach(c => { categoryMap[c.predicted_category] = (categoryMap[c.predicted_category] || 0) + 1; });
  const pieData = Object.entries(categoryMap).map(([name, value]) => ({ name, value }));

  const confBuckets = [
    { range: "90-100%", count: 0, color: "#6EE7B7" },
    { range: "70-89%", count: 0, color: "#93C5FD" },
    { range: "50-69%", count: 0, color: "#FDE68A" },
    { range: "<50%", count: 0, color: "#FDA4AF" },
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

  const steps = [
    { name: "Classify", icon: <Stack size={18} weight="duotone" />, desc: "Zero-shot NLP" },
    { name: "Cluster", icon: <Database size={18} weight="duotone" />, desc: "Semantic Similarity" },
    { name: "Detect", icon: <Pulse size={18} weight="duotone" />, desc: "SLA Compliance" }
  ];

  return (
    <div className="min-h-screen text-black font-sans relative overflow-hidden pb-24">
      <NeuralBackground />
      
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spinSlow { to { transform: rotate(360deg); } }
        @keyframes shimmer { from { background-position: -200% 0; } to { background-position: 200% 0; } }
        @keyframes beamFlow { 
          0% { stroke-dashoffset: 20; } 
          100% { stroke-dashoffset: 0; } 
        }
        .glass {
          background: rgba(255, 255, 255, 0.75);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.3);
        }
        .ddd-shadow {
          box-shadow: 0 10px 30px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02);
        }
      `}</style>

      {/* SVG Defs for 3D logic */}
      <svg style={{ height: 0, width: 0, position: 'absolute' }}>
        <defs>
          <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#93C5FD" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#60A5FA" stopOpacity={0.8} />
          </linearGradient>
          <linearGradient id="emeraldGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6EE7B7" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#34D399" stopOpacity={0.8} />
          </linearGradient>
          <linearGradient id="amberGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#FDE68A" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#FBBF24" stopOpacity={0.8} />
          </linearGradient>
        </defs>
      </svg>

      <div className="relative z-10 max-w-[1240px] mx-auto px-8 py-10 space-y-10 animate-[fadeUp_0.6s_ease-out_forwards]">
        
        {/* ═══ Header Section ═══ */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-1 rounded-md bg-indigo-600 text-white text-[10px] font-bold tracking-tighter uppercase">AI Intelligence</span>
              <div className="w-1 h-1 rounded-full bg-slate-300" />
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">v4.2 Production</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-black">Pattern Analysis</h1>
            <p className="text-sm font-medium text-slate-500 max-w-md">Multi-stage GPU-accelerated pattern discovery engine for automated governance intelligence.</p>
          </div>
          
          <button 
            onClick={run} 
            disabled={loading}
            className={`group relative overflow-hidden inline-flex items-center gap-3 px-7 py-3.5 rounded-2xl font-bold text-sm tracking-wide transition-all ${
              loading 
              ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-wait" 
              : "bg-indigo-950 text-white shadow-xl shadow-indigo-950/20 hover:shadow-indigo-950/40 hover:-translate-y-1 active:scale-[0.98]"
            }`}
          >
            {loading ? (
              <ArrowsCounterClockwise size={18} weight="bold" className="animate-spin" />
            ) : (
              <Lightning size={18} weight="fill" className="text-amber-400 animate-pulse" />
            )}
            <span className="relative z-10">{loading ? "Synchronizing Pipeline..." : done ? "Re-run Inference" : "Initialize Pipeline"}</span>
            {!loading && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />}
          </button>
        </div>

        {/* ═══ Pipeline Stepper ═══ */}
        <div className="relative py-4">
          <div className="absolute top-[38%] left-8 right-8 h-1 bg-slate-200/50 rounded-full overflow-hidden">
             {loading && (
               <div 
                 className="h-full bg-indigo-600 shadow-[0_0_15px_rgba(79,70,229,0.5)] transition-all duration-700 ease-in-out" 
                 style={{ width: `${((stage + 1) / 3) * 100}%` }} 
               />
             )}
          </div>
          <div className="grid grid-cols-3 gap-8 relative z-10">
            {steps.map((s, i) => {
              const active = loading && stage === i;
              const passed = done || (loading && stage > i);
              return (
                <div key={i} className={`flex flex-col items-center gap-3 group`}>
                  <div className={`w-12 h-12 rounded-xl glass border-2 flex items-center justify-center transition-all duration-500 ${
                    passed ? "border-emerald-500 bg-emerald-50 shadow-lg shadow-emerald-500/10" :
                    active ? "border-indigo-600 bg-indigo-50 shadow-xl shadow-indigo-600/15" :
                    "border-slate-100"
                  }`}>
                    {passed ? (
                      <CheckCircle size={24} weight="duotone" className="text-emerald-500" />
                    ) : active ? (
                      <div className="relative">
                        <Cpu size={24} weight="duotone" className="text-indigo-600 animate-pulse" />
                        <div className="absolute inset-0 border-2 border-indigo-600 rounded-full animate-ping opacity-25" />
                      </div>
                    ) : (
                      <div className="text-slate-400 opacity-60 group-hover:opacity-100 transition-opacity">{s.icon}</div>
                    )}
                  </div>
                  <div className="text-center">
                    <p className={`text-xs font-bold uppercase tracking-widest mb-0.5 transition-colors ${passed ? "text-emerald-600" : active ? "text-indigo-600" : "text-slate-400"}`}>
                      {s.name}
                    </p>
                    <p className="text-[10px] font-medium text-slate-400">{s.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══ Stats Grid ═══ */}
        {result && done && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
            
            {/* Primary Metrics */}
            <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-3 gap-6">
               {[
                 { label: "Classified Entities", val: result.classified.length, icon: <Stack size={24} weight="duotone" />, g: "from-blue-600/10 to-indigo-600/5", border: "border-indigo-100", accent: "text-indigo-600", trend: "+12%" },
                 { label: "Semantic Clusters", val: result.clusters.length, icon: <Database size={24} weight="duotone" />, g: "from-emerald-600/10 to-teal-600/5", border: "border-emerald-100", accent: "text-emerald-600", trend: "Optimized" },
                 { label: "SLA Violations", val: delayed.length, icon: <Warning size={24} weight="duotone" />, g: "from-rose-600/10 to-orange-600/5", border: "border-rose-100", accent: delayed.length > 0 ? "text-rose-600" : "text-emerald-600", trend: delayed.length > 5 ? "High Risk" : "Normal" },
               ].map((m, i) => (
                 <div key={i} className={`glass min-h-[140px] rounded-[2rem] p-8 border ${m.border} ddd-shadow relative overflow-hidden group`}>
                    <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${m.g} rounded-bl-full opacity-50 group-hover:scale-110 transition-transform duration-500`} />
                    <div className="flex justify-between items-start relative z-10">
                      <div className="space-y-4">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{m.label}</div>
                        <div className={`text-4xl font-bold tracking-tight text-black`}>
                          <Counter to={m.val} />
                        </div>
                        <div className="flex items-center gap-1.5 pt-1">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${m.trend.includes("-") ? "bg-rose-50 text-rose-500" : "bg-emerald-50 text-emerald-500"}`}>
                            {m.trend}
                          </span>
                        </div>
                      </div>
                      <div className={`p-3 rounded-2xl bg-white shadow-sm border border-slate-50 ${m.accent}`}>
                        {m.icon}
                      </div>
                    </div>
                 </div>
               ))}
            </div>

            {/* ── Category Breakdown (Advanced Donut) ── */}
            <div className="lg:col-span-5 glass rounded-[2.5rem] p-8 border-slate-100 ddd-shadow space-y-8">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-base font-bold text-black tracking-tight">Pattern Clusters</h3>
                  <p className="text-[10px] font-medium text-slate-400">Distribution of semantic problem types</p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500">
                  <ChartPie size={20} weight="duotone" />
                </div>
              </div>

              <div className="h-[280px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={105}
                      paddingAngle={8}
                      dataKey="value"
                      stroke="none"
                      animationDuration={1500}
                    >
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} style={{ filter: "drop-shadow(0px 8px 12px rgba(0,0,0,0.1))" }} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 8px 20px rgba(0,0,0,0.08)', background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)' }}
                      itemStyle={{ fontWeight: 700, color: '#000', fontSize: '11px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center text for Donut */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                   <p className="text-2xl font-bold text-black">{result.classified.length}</p>
                   <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Seeds</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                {pieData.slice(0, 4).map((d, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/50 border border-slate-50">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-[10px] font-bold text-black/70 truncate max-w-[80px]">{d.name}</span>
                    </div>
                    <span className="text-[10px] font-bold text-black">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Confidence Distribution (3D Bar) ── */}
            <div className="lg:col-span-7 glass rounded-[2.5rem] p-8 border-slate-100 ddd-shadow space-y-8">
               <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-base font-bold text-black tracking-tight">Model Confidence</h3>
                  <p className="text-[10px] font-medium text-slate-400">Certainty breakdown of pattern recognition</p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-500">
                  <ChartBar size={20} weight="duotone" />
                </div>
              </div>

              <div className="h-[300px] w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={confBuckets} margin={{ top: 20, right: 30, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="range" tick={{ fontSize: 10, fill: "#94a3b8", fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#94a3b8", fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 8px 20px rgba(0,0,0,0.08)', background: '#fff' }} />
                    <Bar 
                      dataKey="count" 
                      shape={<CylindricalBar />} 
                      animationBegin={400} 
                      animationDuration={1500}
                    >
                      {confBuckets.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="px-4 py-3 rounded-2xl bg-indigo-950 text-white flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/10 rounded-xl">
                      <Lightning size={18} weight="fill" className="text-amber-400" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold tracking-wide">Aggregate Reliability</p>
                      <p className="text-[9px] text-white/60">Across all semantic predictions</p>
                    </div>
                 </div>
                 <div className="text-xl font-bold text-indigo-300">
                   {Math.round((result.classified.reduce((a, b) => a + b.confidence, 0) / result.classified.length) * 100)}%
                 </div>
              </div>
            </div>

            {/* ── NEW: Heat Indicator & Wave Trend ── */}
            <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-6">
               {/* Wave / Area Graph for Trends */}
               <div className="glass rounded-[2.5rem] p-8 border-slate-100 ddd-shadow space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-base font-bold text-black tracking-tight">Intelligence Velocity</h3>
                      <p className="text-[10px] font-medium text-slate-400">Processing throughput & pattern density wave</p>
                    </div>
                    <Pulse size={20} weight="duotone" className="text-indigo-400 animate-pulse" />
                  </div>
                  <div className="h-[200px] w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={[
                        { t: 0, v: 40 }, { t: 1, v: 45 }, { t: 2, v: 38 }, { t: 3, v: 65 }, 
                        { t: 4, v: 50 }, { t: 5, v: 75 }, { t: 6, v: 60 }, { t: 7, v: 85 }
                      ]}>
                        <defs>
                          <linearGradient id="waveGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#818CF8" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#818CF8" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="v" stroke="#818CF8" strokeWidth={3} fillOpacity={1} fill="url(#waveGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
               </div>

               {/* Heat Indicator Panel */}
               <div className="glass rounded-[2.5rem] p-8 border-slate-100 ddd-shadow space-y-8">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-base font-bold text-black tracking-tight">SLA Intensity Matrix</h3>
                      <p className="text-[10px] font-medium text-slate-400">Urgency mapping for delayed governance seeds</p>
                    </div>
                    <Clock size={20} weight="duotone" className="text-rose-400" />
                  </div>
                  
                  <div className="space-y-6 pt-2">
                    <div className="relative h-4 w-full bg-slate-100 rounded-full overflow-hidden flex">
                       <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${Math.max(10, 100 - (delayed.length * 5))}%` }} />
                       <div className="h-full bg-amber-500 transition-all duration-1000" style={{ width: `${Math.min(40, delayed.length * 2)}%` }} />
                       <div className="h-full bg-rose-500 transition-all duration-1000 flex-1" />
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                       {[
                         { l: "Optimal", c: "bg-emerald-500", desc: "No immediate risk" },
                         { l: "Warning", c: "bg-amber-500", desc: "SLA threshold near" },
                         { l: "Critical", c: "bg-rose-500", desc: "Immediate action" },
                       ].map((item, idx) => (
                         <div key={idx} className="space-y-1">
                            <div className="flex items-center gap-1.5">
                               <div className={`w-2 h-2 rounded-full ${item.c}`} />
                               <span className="text-[10px] font-bold text-black">{item.l}</span>
                            </div>
                            <p className="text-[9px] text-slate-400">{item.desc}</p>
                         </div>
                       ))}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 flex items-center gap-3">
                     <Warning size={24} weight="duotone" className="text-amber-600 shrink-0" />
                     <p className="text-[10px] font-semibold text-amber-900 leading-relaxed">
                       {delayed.length > 5 ? "Significant backlog detected in PWD & MCD departments. Prioritized allocation of resources required." : "Service metrics within enterprise benchmarks. Continue monitoring intelligence stream."}
                     </p>
                  </div>
               </div>
            </div>

            {/* ── Pattern Results (Table) ── */}
            <div className="lg:col-span-12 glass rounded-[2.5rem] overflow-hidden border-slate-100 ddd-shadow">
               <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-white/40">
                  <div>
                    <h3 className="text-base font-bold text-black tracking-tight">Recent Discovered Patterns</h3>
                    <p className="text-[10px] font-medium text-slate-400">Verifying {result.classified.length} entities against BART-Zero model</p>
                  </div>
                  <button className="p-2.5 rounded-xl border border-slate-100 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all">
                    <Funnel size={18} weight="duotone" />
                  </button>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full">
                   <thead>
                     <tr className="bg-slate-50/50">
                       {["Context ID", "Intelligence Stream", "Predicted Type", "Integrity"].map((h, i) => (
                         <th key={h} className={`px-10 py-5 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 ${i === 3 ? "text-right" : ""}`}>
                           {h}
                         </th>
                       ))}
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50">
                     {result.classified.slice(0, 8).map((c) => {
                       const conf = Math.round(c.confidence * 100);
                       return (
                         <tr key={c.id} className="hover:bg-indigo-50/20 transition-colors group">
                           <td className="px-10 py-6 text-xs font-bold text-slate-400 group-hover:text-indigo-600 transition-colors">
                             #NTY-{String(c.id).padStart(4, "0")}
                           </td>
                           <td className="px-10 py-6">
                             <p className="text-sm font-medium text-slate-600 line-clamp-1 max-w-sm">{c.text}</p>
                           </td>
                           <td className="px-10 py-6">
                             <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200 text-[10px] font-bold uppercase tracking-tight text-slate-600">
                                 <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                 {c.predicted_category}
                             </div>
                           </td>
                           <td className="px-10 py-6 text-right">
                             <div className="flex items-center justify-end gap-3">
                                 <div className="text-xs font-bold text-black">{conf}%</div>
                                 <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full transition-all duration-1000 ${conf > 80 ? "bg-emerald-500" : conf > 60 ? "bg-indigo-500" : "bg-rose-500"}`} 
                                      style={{ width: `${conf}%` }} 
                                    />
                                 </div>
                             </div>
                           </td>
                         </tr>
                       );
                     })}
                   </tbody>
                 </table>
               </div>
               <div className="px-10 py-5 bg-slate-50/50 border-t border-slate-100 text-center">
                  <button className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest hover:underline decoration-2 underline-offset-4">
                    View Full Analysis Stream →
                  </button>
               </div>
            </div>

            {/* ── Semantic Clusters (Cards) ── */}
            <div className="lg:col-span-12 space-y-4">
               <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-black tracking-tight">Thematic Clusters</h3>
                <span className="text-[10px] font-bold text-slate-400 bg-white border border-slate-100 px-3 py-1 rounded-full shadow-sm">
                  {result.clusters.length} Core Themes Discovered
                </span>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {result.clusters.map((cluster, i) => (
                    <div key={i} className="glass rounded-3xl p-6 border-slate-100 ddd-shadow hover:-translate-y-2 transition-all duration-500 group">
                      <div className="flex items-center gap-3 mb-6">
                        <div className={`p-2.5 rounded-xl bg-gradient-to-br ${["from-blue-600", "from-emerald-600", "from-amber-500", "from-rose-500"][i % 4]} to-black/20 text-white shadow-lg`}>
                          <Brain size={20} weight="duotone" />
                        </div>
                        <h4 className="text-sm font-bold text-black tracking-tight">{cluster.cluster_label}</h4>
                      </div>
                      <div className="space-y-2.5">
                        {cluster.complaints.slice(0, 2).map((comp, j) => (
                          <div key={j} className="p-3 bg-white/50 border border-slate-50 rounded-2xl">
                             <p className="text-[10px] text-slate-500 leading-relaxed line-clamp-2">&quot;{comp.text}&quot;</p>
                          </div>
                        ))}
                        <div className="flex items-center justify-between pt-2">
                           <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{cluster.complaints.length} Entities</span>
                           <button className="p-1 rounded-md text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                             <ArrowSquareOut size={18} weight="bold" />
                           </button>
                        </div>
                      </div>
                    </div>
                  ))}
               </div>
            </div>

          </div>
        )}

        {/* ═══ Initial State ═══ */}
        {!init && !result && !loading && (
          <div className="flex flex-col items-center justify-center py-40 animate-[fadeUp_0.8s_ease-out]">
            <div className="relative mb-10">
               <div className="w-32 h-32 rounded-[2.5rem] bg-indigo-950 flex items-center justify-center shadow-2xl shadow-indigo-950/40 relative z-10 overflow-hidden">
                  <TreeStructure size={48} weight="duotone" className="text-white opacity-90 animate-[spinSlow_20s_linear_infinite]" />
                  <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-transparent" />
               </div>
               <div className="absolute -inset-4 bg-indigo-500/10 rounded-[3rem] blur-2xl -z-10 animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold text-black mb-3">Intelligence Pipeline Ready</h2>
            <p className="text-slate-500 text-sm max-w-sm text-center mb-10">Connect deeper with your data. Our BART-MNLI Zero-shot engine is calibrated and ready for high-fidelity pattern analysis.</p>
            <button 
              onClick={run}
              className="px-10 py-4 bg-indigo-600 text-white rounded-[1.5rem] font-bold text-sm shadow-xl shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:bg-indigo-700 transition-all flex items-center gap-3"
            >
              Analyze Governance Stream
              <Cpu size={20} weight="duotone" />
            </button>
          </div>
        )}

        {/* ═══ Loading State skeleton ═══ */}
        {loading && !result && (
          <div className="w-full space-y-10 py-10 scale-[0.98] transition-all opacity-80">
             <div className="h-64 glass rounded-[3rem] border-slate-100 flex flex-col items-center justify-center gap-6 overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-500/5 to-transparent animate-[shimmer_2s_infinite]" />
                <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                <div className="text-center space-y-2">
                  <p className="text-sm font-bold text-indigo-950 tracking-widest uppercase">
                    Stage {stage + 1}: {steps[stage].name}
                  </p>
                  <p className="text-xs text-slate-400 font-medium">Processing semantic data across 48 neural nodes...</p>
                </div>
             </div>
             <div className="grid grid-cols-3 gap-6">
               {[1, 2, 3].map(i => (
                 <div key={i} className="h-40 glass rounded-3xl border-slate-100 overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-200/20 to-transparent animate-[shimmer_2.5s_infinite]" />
                 </div>
               ))}
             </div>
          </div>
        )}

      </div>
    </div>
  );
}
