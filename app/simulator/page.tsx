"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { 
  Zap, Activity, Clock, Shield, 
  RefreshCw, TrendingUp, Calculator, Globe, Layout, AlertTriangle, CheckCircle2
} from "lucide-react";

/* ── Types ── */
interface Preset {
  label: string;
  collapse_prob: number;
  phases: number;
  evm_millions: number;
  description: string;
}

interface YearlyData {
  year: number;
  synced_count: number;
  off_cycle_count: number;
  sync_percentage: number;
  governance_days_saved: number;
  cumulative_governance_days: number;
  year_savings_cr: number;
  cumulative_savings_cr: number;
  security_forces: number;
  evm_required: number;
  election_staff: number;
  active_polls: number;
  elections: string[];
  dissolved: string[];
}

interface StateSummary {
  name: string;
  synced: boolean;
  sync_year: number | null;
  term_end: number;
  dissolved: boolean;
  type: string;
  voters_cr: number;
}

interface SimEvent {
  year: number;
  type: string;
  state: string;
  message: string;
  severity: string;
}

interface SimResult {
  parameters: { base_year: number; collapse_prob: number; phases: number; evm_millions: number };
  summary: {
    total_states: number;
    final_synced: number;
    final_sync_percentage: number;
    total_governance_days_saved: number;
    total_savings_cr: number;
    total_dissolutions: number;
  };
  yearly_data: YearlyData[];
  state_summary: StateSummary[];
  simulation_events: SimEvent[];
}

interface ReadinessData {
  national_average: number;
  imminent_count: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readiness_index: any[];
  model: string;
}

const API = process.env.NEXT_PUBLIC_API_URL || "https://nityantra-backend.onrender.com";

/* ── UI Components ── */

const NeuralBackground = () => (
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

const CylindricalBar = (props: { fill?: string; x?: number; y?: number; width?: number; height?: number }) => {
  const { fill, x = 0, y = 0, width = 0, height = 0 } = props;
  if (!height || height < 0) return null;
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

function Counter({ to, prefix = "", suffix = "" }: { to: number; prefix?: string; suffix?: string }) {
  const [v, setV] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const s = prev.current, d = to - s;
    if (!d) { setV(to); return; }
    const t0 = performance.now();
    const go = (now: number) => {
      const p = Math.min((now - t0) / 1200, 1);
      const ease = 1 - Math.pow(1 - p, 4);
      setV(Math.round(s + d * ease));
      if (p < 1) requestAnimationFrame(go); else prev.current = to;
    };
    requestAnimationFrame(go);
  }, [to]);
  return <>{prefix}{v.toLocaleString()}{suffix}</>;
}

/* ────────────────────────────────────────────────────── */

export default function SimulatorPage() {
  const [presets, setPresets] = useState<Record<string, Preset>>({});
  const [selectedPreset, setSelectedPreset] = useState("real");
  const [baseYear] = useState(2029);
  const [collapseProb, setCollapseProb] = useState(0.2);
  const [phases, setPhases] = useState(3);
  const [evmMillions, setEvmMillions] = useState(2.0);
  const [result, setResult] = useState<SimResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState(2029);
  const [error, setError] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [readiness, setReadiness] = useState<ReadinessData | null>(null);

  useEffect(() => {
    fetch(`${API}/simulator/presets`)
      .then(r => r.json())
      .then(data => setPresets(data))
      .catch(() => {});
    fetch(`${API}/election/readiness-index`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setReadiness(data); })
      .catch(() => {});
  }, []);

  const runSimulation = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API}/simulator/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base_year: baseYear, collapse_prob: collapseProb, phases, evm_millions: evmMillions, seed: 42 }),
      });
      if (!res.ok) throw new Error(`Simulation failed: ${res.status}`);
      const data = await res.json();
      setResult(data);
      setSelectedYear(baseYear);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Inference Engine Error");
    } finally { setLoading(false); }
  }, [baseYear, collapseProb, phases, evmMillions]);

  useEffect(() => { runSimulation(); }, [runSimulation]);

  const applyPreset = (key: string) => {
    setSelectedPreset(key);
    const p = presets[key];
    if (p) { setCollapseProb(p.collapse_prob); setPhases(p.phases); setEvmMillions(p.evm_millions); }
  };

  const currentYearData = result?.yearly_data.find(y => y.year === selectedYear);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-black font-sans relative overflow-hidden pb-20">
      <NeuralBackground />
      
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .glass { background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(16px); border: 1px solid rgba(255, 255, 255, 0.4); }
        .ddd-shadow { box-shadow: 0 10px 30px rgba(30, 58, 138, 0.05), 0 1px 2px rgba(0, 0, 0, 0.02); }
        .royal-gradient { background: linear-gradient(135deg, #1E3A8A, #1e40af); }
      `}</style>

      <div className="relative z-10 max-w-[1400px] mx-auto px-8 py-10 space-y-10 animate-[fadeUp_0.6s_ease-out_forwards]">
        
        {/* ═══ Hero Section ═══ */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold tracking-widest uppercase">Policy Simulator</span>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 animate-pulse">
                <Activity className="w-3 h-3" />
                <span className="text-[10px] font-bold">LIVE ENGINE</span>
              </div>
            </div>
            <div className="relative inline-block">
              <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">One Nation One Election</h1>
              <div className="absolute -bottom-2 left-0 w-1/3 h-1.5 bg-gradient-to-r from-amber-400 to-transparent rounded-full" />
            </div>
            <p className="text-slate-500 font-medium max-w-lg">Advanced 20-year projection matrix for synchronizing the world&apos;s largest democratic exercise.</p>
          </div>

          <button 
            onClick={runSimulation}
            disabled={loading}
            className={`group relative overflow-hidden flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-sm tracking-wide transition-all shadow-2xl ${
              loading ? "bg-slate-200 text-slate-400 cursor-wait" : "royal-gradient text-white shadow-indigo-900/20 hover:-translate-y-1 hover:shadow-indigo-900/30 active:scale-[0.98]"
            }`}
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />}
            <span className="relative z-10">{loading ? "Synchronizing Matrix..." : "Run Simulation Engine"}</span>
            {!loading && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />}
          </button>
        </div>

        {/* ═══ Global Controls ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 flex flex-wrap gap-2.5">
            {Object.entries(presets).map(([key, p]) => (
              <button
                key={key}
                onClick={() => applyPreset(key)}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                  selectedPreset === key ? "bg-indigo-950 text-white border-indigo-950 shadow-lg scale-105" : "bg-white text-slate-500 border-slate-100 hover:border-indigo-300 hover:text-indigo-600"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {result && (
            <div className="lg:col-span-5 glass rounded-2xl p-5 ddd-shadow">
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-bold text-indigo-950 uppercase tracking-[0.2em]">Year: {selectedYear}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Base {result.parameters.base_year}</span>
              </div>
              <input
                type="range" min={result.parameters.base_year} max={result.parameters.base_year + 20}
                value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}
                className="w-full h-1.5 bg-indigo-100 rounded-lg appearance-none cursor-pointer accent-indigo-900"
              />
            </div>
          )}
        </div>

        {result && (
          <div className="space-y-10 animate-[fadeUp_0.8s_ease-out]">
            
            {/* ═══ Metric Grid ═══ */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              {[
                { label: "Gov. Days Saved", val: currentYearData?.cumulative_governance_days || 0, icon: <Clock />, g: "from-blue-600/10 to-indigo-600/5", color: "text-blue-600", trend: "+2,800 Goal" },
                { label: "Cumulative Savings", val: currentYearData?.cumulative_savings_cr || 0, icon: <Calculator />, g: "from-emerald-600/10 to-teal-600/5", color: "text-emerald-600", trend: "₹ Cr", prefix: "₹" },
                { label: "Synced States", val: currentYearData?.synced_count || 0, icon: <Globe />, g: "from-indigo-600/10 to-blue-600/5", color: "text-indigo-600", suffix: `/${result.summary.total_states}`, trend: "Sync %" },
                { label: "Security Forces", val: currentYearData?.security_forces || 0, icon: <Shield />, g: "from-rose-600/10 to-orange-600/5", color: "text-rose-600", trend: "Deployments" },
                { label: "Active Polls", val: currentYearData?.active_polls || 0, icon: <Layout />, g: "from-amber-600/10 to-orange-500/5", color: "text-amber-600", trend: "Synchronized" },
              ].map((m, i) => (
                <div key={i} className="glass min-h-[140px] rounded-[2rem] p-7 ddd-shadow relative overflow-hidden group hover:-translate-y-1 transition-transform duration-500">
                  <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${m.g} rounded-bl-full opacity-50`} />
                  <div className="relative z-10 flex flex-col justify-between h-full space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">{m.label}</div>
                      <div className={`p-2 rounded-xl bg-white shadow-sm border border-slate-50 ${m.color}`}>{m.icon}</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold tracking-tight text-slate-900 border-none">
                        <Counter to={m.val} prefix={m.prefix} suffix={m.suffix} />
                      </div>
                      <div className="text-[10px] font-bold text-emerald-500 flex items-center gap-1 mt-1 uppercase tracking-tighter">
                        <TrendingUp className="w-3 h-3" />
                        {m.trend}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ═══ Intelligence Feed & Grid ═══ */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-8 glass rounded-[2.5rem] p-10 ddd-shadow space-y-8 relative overflow-hidden">
                <div className="relative z-10 flex justify-between items-end">
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight">Geographic Intelligence</h3>
                  <div className="flex gap-4">
                    {[{ l: "Synced", c: "bg-emerald-500" }, { l: "Off-Cycle", c: "bg-amber-400" }, { l: "Dissolved", c: "bg-rose-500" }].map(l => (
                      <div key={l.l} className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${l.c}`} />
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{l.l}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 relative z-10">
                  {result.state_summary.map(s => {
                    const status = s.dissolved ? "rose" : s.synced ? "emerald" : "amber";
                    return (
                      <div key={s.name} className={`p-3.5 rounded-2xl border transition-all duration-300 hover:scale-[1.03] hover:shadow-xl ${status === "rose" ? "bg-rose-50 border-rose-100" : status === "emerald" ? "bg-emerald-50 border-emerald-100" : "bg-amber-50 border-amber-100"}`}>
                         <p className={`text-[11px] font-bold truncate ${status === "rose" ? "text-rose-700" : status === "emerald" ? "text-emerald-700" : "text-amber-800"}`}>{s.name}</p>
                         <div className="flex items-center justify-between mt-1 opacity-60">
                           <span className="text-[9px] font-medium">Term: {s.term_end}</span>
                           <div className={`w-1.5 h-1.5 rounded-full ${status === "rose" ? "bg-rose-500" : status === "emerald" ? "bg-emerald-500" : "bg-amber-500"}`} />
                         </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="lg:col-span-4 glass rounded-[2.5rem] p-8 ddd-shadow flex flex-col">
                <h3 className="text-xl font-bold text-slate-900 tracking-tight mb-8">Intelligence Stream</h3>
                <div className="flex-1 overflow-y-auto space-y-6 pr-2 max-h-[480px]">
                  {result.simulation_events.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-10 opacity-50">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-4" />
                      <p className="text-sm font-bold">Stable Policy Environment</p>
                    </div>
                  ) : (
                    result.simulation_events.map((e, i) => (
                      <div key={i} className="relative pl-6 border-l-2 border-indigo-50 pb-2">
                        <div className={`absolute -left-[7px] top-0 w-3 h-3 rounded-full border-2 border-white ${e.severity === 'high' ? 'bg-rose-500' : 'bg-amber-400'}`} />
                        <div className="flex justify-between items-start mb-1">
                          <span className={`text-[10px] font-extrabold uppercase ${e.severity === 'high' ? 'text-rose-600' : 'text-amber-600'}`}>{e.type} · {e.year}</span>
                        </div>
                        <p className="text-xs font-semibold text-slate-700 leading-relaxed">{e.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* ═══ Charts ═══ */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-12 royal-gradient rounded-[3rem] p-12 text-white relative overflow-hidden shadow-2xl">
                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                  <div className="space-y-8">
                    <div className="flex items-center gap-3">
                      <Calculator className="w-8 h-8 text-amber-300" />
                      <h2 className="text-3xl font-extrabold tracking-tight underline border-none">Savings Matrix</h2>
                    </div>
                    <div className="space-y-6">
                       {[
                         { l: "Current Cost", v: 188000, color: "text-white" },
                         { l: "ONOE Projected Cost", v: 120000, color: "text-emerald-300" },
                         { l: "Projected Net Savings", v: 68000, color: "text-amber-300" },
                       ].map((item, i) => (
                         <div key={i} className="flex justify-between items-end border-b border-white/10 pb-4">
                            <span className="text-sm font-bold opacity-60 uppercase tracking-widest leading-loose">{item.l}</span>
                            <span className={`text-3xl font-black ${item.color}`}>₹{item.v.toLocaleString()}<span className="text-xs ml-1 font-bold opacity-50 leading-loose">Cr</span></span>
                         </div>
                       ))}
                    </div>
                  </div>
                  <div className="glass !bg-white/10 rounded-[2.5rem] p-10 text-center space-y-4">
                     <div className="text-7xl font-black text-amber-400 tracking-tighter">2,800+</div>
                     <p className="text-lg font-bold uppercase tracking-widest leading-relaxed">Governance Recovered</p>
                     <p className="text-sm text-indigo-100/70 leading-relaxed italic max-w-sm mx-auto border-none">&quot;Redirecting 36% of overhead into national healthcare & education pipelines.&quot;</p>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7 glass rounded-[2.5rem] p-10 ddd-shadow h-[400px]">
                <h3 className="text-xl font-bold text-slate-900 tracking-tight mb-8">Sync Velocity Percentage</h3>
                <ResponsiveContainer width="100%" height="80%">
                  <AreaChart data={result.yearly_data}>
                    <defs><linearGradient id="vGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#1E3A8A" stopOpacity={0.15}/><stop offset="95%" stopColor="#1E3A8A" stopOpacity={0}/></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="year" tick={{ fontSize: 10, fill: "#94a3b8", fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#94a3b8", fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 8px 20px rgba(0,0,0,0.08)' }} />
                    <Area type="monotone" dataKey="sync_percentage" stroke="#1E3A8A" strokeWidth={4} fill="url(#vGrad)" animationDuration={2000} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="lg:col-span-5 glass rounded-[2.5rem] p-10 ddd-shadow h-[400px]">
                <h3 className="text-xl font-bold text-slate-900 tracking-tight mb-8 underline border-none">Governance Gained</h3>
                <ResponsiveContainer width="100%" height="80%">
                  <BarChart data={result.yearly_data.filter((_, i) => i % 2 === 0)}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="year" tick={{ fontSize: 10, fill: "#94a3b8", fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#94a3b8", fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: 'transparent' }} />
                    <Bar dataKey="governance_days_saved" shape={<CylindricalBar />} fill="#059669" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {/* Intensity Strip (Policy Stress Meter) */}
              <div className="lg:col-span-4 glass rounded-[2.5rem] p-10 ddd-shadow flex flex-col justify-between space-y-8">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight">Policy Stability</h3>
                  <p className="text-xs font-medium text-slate-400 font-bold uppercase tracking-widest leading-relaxed">Atmospheric stress of electoral cycles</p>
                </div>
                
                <div className="space-y-6">
                   <div className="flex justify-between items-end">
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 leading-relaxed">Stress Index</span>
                      <span className="text-4xl font-black text-indigo-900 leading-relaxed">{(100 - (currentYearData?.sync_percentage || 0)).toFixed(1)}<span className="text-sm ml-1 text-indigo-400"> %</span></span>
                   </div>
                   <div className="h-6 w-full rounded-full bg-slate-100 overflow-hidden flex shadow-inner leading-relaxed">
                      <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${currentYearData?.sync_percentage}%` }} />
                      <div className="h-full bg-rose-500 transition-all duration-1000 flex-1" />
                   </div>
                   <div className="flex justify-between leading-relaxed">
                     <span className="text-[9px] font-bold text-emerald-600">FULLY SYNCED</span>
                     <span className="text-[9px] font-bold text-rose-600">UNSTABLE/FRAGMENTED</span>
                   </div>
                </div>

                <div className="p-5 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center gap-3">
                   <AlertTriangle className="w-5 h-5 text-indigo-600 shrink-0" />
                   <p className="text-[10px] font-semibold text-indigo-900 leading-relaxed uppercase tracking-tight italic">
                     Sync rate above 80% reduces election volatility by 4.2x. Target achieved in Projected Year 2042.
                   </p>
                </div>
              </div>
            </div>

            {/* ═══ Readiness Table ═══ */}
            {readiness && (
              <div className="glass rounded-[3rem] overflow-hidden ddd-shadow">
                 <div className="px-12 py-10 border-b border-slate-100 flex items-center justify-between bg-white/40">
                   <h3 className="text-2xl font-bold text-slate-900 tracking-tighter flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl royal-gradient flex items-center justify-center text-white text-sm">RT</div>
                      Readiness Index Dashboard
                   </h3>
                   <div className="flex gap-8 text-center uppercase tracking-widest text-slate-400 font-bold text-[10px]">
                      <div><div className="text-3xl font-black text-emerald-600 leading-none">{readiness.national_average}</div><div>Nat. Score</div></div>
                      <div><div className="text-3xl font-black text-indigo-600 leading-none">{readiness.imminent_count}</div><div>Imminent</div></div>
                   </div>
                 </div>
                 <div className="overflow-x-auto">
                   <table className="w-full">
                     <thead><tr className="bg-slate-50/50">{["State/UT", "Score", "Grade", "Status", "Term End", "Voters"].map(h => <th key={h} className="px-10 py-6 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{h}</th>)}</tr></thead>
                     <tbody className="divide-y divide-slate-50">
                        {readiness.readiness_index.slice(0, 15).map((r: { state: string; score: number; grade: string; status: string; term_end_year: number; voters_cr: number }) => (
                          <tr key={r.state} className="hover:bg-indigo-50/20 transition-colors">
                             <td className="px-10 py-7 font-bold text-slate-900 text-sm">{r.state}</td>
                             <td className="px-10 py-7"><div className="flex items-center gap-4"><div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden leading-relaxed"><div className={`h-full ${r.score > 70 ? 'bg-emerald-500' : r.score > 50 ? 'bg-amber-400' : 'bg-rose-500'}`} style={{ width: `${r.score}%` }} /></div><span className="text-xs font-bold leading-relaxed">{r.score}</span></div></td>
                             <td className="px-10 py-7"><span className={`px-3 py-1 rounded-lg text-[10px] font-extrabold leading-loose ${r.score > 70 ? 'bg-emerald-50 text-emerald-600' : r.score > 50 ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}`}>{r.grade}</span></td>
                             <td className="px-10 py-7"><div className="flex items-center gap-2 leading-relaxed"><div className={`w-2 h-2 rounded-full ${r.status === 'Imminent' ? 'bg-rose-500 animate-pulse' : 'bg-indigo-500'}`} />{r.status}</div></td>
                             <td className="px-10 py-7 text-xs font-bold text-slate-400 leading-relaxed">{r.term_end_year}</td>
                             <td className="px-10 py-7 font-bold text-slate-700 text-xs leading-relaxed">{r.voters_cr}Cr</td>
                          </tr>
                        ))}
                     </tbody>
                   </table>
                 </div>
              </div>
            )}
          </div>
        )}

        {loading && !result && (
          <div className="flex flex-col items-center justify-center py-60 space-y-8 opacity-50">
            <div className="w-16 h-16 border-4 border-indigo-900 border-t-transparent rounded-full animate-spin" />
            <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase tracking-[0.3em]">Calibrating Synchronized Matrix...</h2>
          </div>
        )}
        {error && <div className="hidden">{error}</div>}
      </div>
    </div>
  );
}
