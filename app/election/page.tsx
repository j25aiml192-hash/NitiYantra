"use client";

import { useState, useEffect, useCallback } from "react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from "recharts";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface StateMeta {
  name: string;
  voters_cr: number;
  constituencies: number;
  booths: number;
  last_election_year: number;
  term_end_year: number;
  capital: string;
  type: string;
}

interface ElectionResult {
  state: string;
  target_year: number;
  projected_voters: string;
  projected_voters_raw: number;
  poll_stations: number;
  grand_total_budget_cr: number;
  total_human_force: number;
  security: {
    capf_companies: number;
    state_police: number;
    home_guards: number;
    total_security_force: number;
    budget_cr: number;
  };
  hr_admin: {
    class_ab: number;
    class_c: number;
    class_d: number;
    total_staff: number;
    evm_sets: number;
    vvpat_units: number;
    budget_cr: number;
  };
  logistics: {
    poll_stations: number;
    transport_vehicles: number;
    communication_units: number;
    budget_cr: number;
  };
  budget_split: {
    security: number;
    hr_admin: number;
    logistics: number;
  };
  model: string;
}


function formatNumber(n: number): string {
  if (n >= 10000000) return `${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `${(n / 100000).toFixed(1)} L`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString("en-IN");
}

export default function ElectionPage() {
  const [states, setStates] = useState<StateMeta[]>([]);
  const [selectedState, setSelectedState] = useState("");
  const [targetYear, setTargetYear] = useState(2029);
  const [inflation, setInflation] = useState(6);
  const [popGrowth, setPopGrowth] = useState(1.2);
  const [crisisFactor, setCrisisFactor] = useState(0);
  const [result, setResult] = useState<ElectionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch states on mount
  useEffect(() => {
    fetch(`${API}/election/states-meta`)
      .then(r => r.json())
      .then(data => {
        setStates(data);
        if (data.length > 0) setSelectedState(data[0].name);
      })
      .catch(() => setError("Failed to fetch states"));
  }, []);

  // Compute on state/param change
  const compute = useCallback(async () => {
    if (!selectedState) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/election/compute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          state: selectedState,
          target_year: targetYear,
          inflation: inflation / 100,
          pop_growth: popGrowth / 100,
          crisis_factor: crisisFactor / 100,
        }),
      });
      if (!res.ok) throw new Error("Computation failed");
      const data = await res.json();
      setResult(data);
    } catch {
      setError("Failed to compute election data");
    } finally {
      setLoading(false);
    }
  }, [selectedState, targetYear, inflation, popGrowth, crisisFactor]);

  useEffect(() => {
    if (selectedState) compute();
  }, [selectedState, targetYear, compute]);



  const resourceBarData = result
    ? [
        { name: "CAPF", value: result.security.capf_companies },
        { name: "State Police", value: result.security.state_police },
        { name: "Home Guards", value: result.security.home_guards },
        { name: "Class A/B", value: result.hr_admin.class_ab },
        { name: "Class C", value: result.hr_admin.class_c },
        { name: "Class D", value: result.hr_admin.class_d },
      ]
    : [];

  return (
    <div className="relative min-h-[90vh] bg-transparent font-sans overflow-hidden text-slate-700">
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      
      {/* Background blobs for premium effect */}
      <div className="fixed top-0 left-1/4 w-[600px] h-[600px] bg-sky-200/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-[500px] h-[500px] bg-emerald-200/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-[1200px] mx-auto px-6 py-12 space-y-8 animate-[fadeUp_0.5s_ease-out_forwards]">
        {/* SVG Defs for 3D Charts */}
        <svg style={{ height: 0, width: 0, position: 'absolute' }}>
          <defs>
            <linearGradient id="colorSecurity" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#fca5a5" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#f87171" stopOpacity={0.8} />
            </linearGradient>
            <linearGradient id="colorHR" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#93c5fd" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#60a5fa" stopOpacity={0.8} />
            </linearGradient>
            <linearGradient id="colorLogistics" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#fde047" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#facc15" stopOpacity={0.8} />
            </linearGradient>
            <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#a5b4fc" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#818cf8" stopOpacity={0.8} />
            </linearGradient>
          </defs>
        </svg>

        {/* ═══ HEADER ═══ */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-300 to-purple-300 flex items-center justify-center shadow-lg shadow-indigo-400/10">
              <span className="text-2xl text-white">⚡</span>
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-700 mb-1">
                Hybrid Election Resource Calculator
              </h1>
              <p className="text-sm font-medium text-slate-400">
                AI-powered election resource allocation engine for Indian states & UTs
              </p>
            </div>
          </div>
          {result && (
            <span className="inline-flex items-center px-4 py-2 rounded-xl text-[10px] font-semibold tracking-widest uppercase bg-indigo-50/50 text-indigo-400 border border-indigo-100/30 shadow-sm">
              Model: {result.model}
            </span>
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* LEFT: Controls */}
          <div className="w-full lg:w-72 shrink-0">
            <div className="bg-white/80 backdrop-blur-xl border border-slate-100/60 rounded-3xl p-6 shadow-sm sticky top-6">
              <h3 className="text-sm font-semibold text-slate-600 tracking-tight mb-6">
                Parameters
              </h3>

              {/* State Dropdown */}
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2 block">State / UT</label>
              <select
                value={selectedState}
                onChange={e => setSelectedState(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50/30 text-slate-600 text-sm font-medium outline-none focus:border-indigo-200 focus:ring-4 focus:ring-indigo-50 transition-all cursor-pointer shadow-sm mb-5 appearance-none"
              >
                <optgroup label="States">
                  {states.filter(s => s.type === "state").map(s => (
                    <option key={s.name} value={s.name}>{s.name}</option>
                  ))}
                </optgroup>
                <optgroup label="Union Territories">
                  {states.filter(s => s.type === "ut").map(s => (
                    <option key={s.name} value={s.name}>{s.name}</option>
                  ))}
                </optgroup>
              </select>

              {/* Target Year */}
              <div className="mb-5">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Target Year</label>
                  <span className="text-xs font-semibold text-indigo-400 bg-indigo-50/50 px-2.5 py-1 rounded-lg">{targetYear}</span>
                </div>
                <input
                  type="range" min={2025} max={2040} value={targetYear}
                  onChange={e => setTargetYear(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-300"
                />
              </div>

              {/* Inflation */}
              <div className="mb-5">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Inflation Rate</label>
                  <span className="text-xs font-semibold text-indigo-400 bg-indigo-50/50 px-2.5 py-1 rounded-lg">{inflation}%</span>
                </div>
                <input
                  type="range" min={0} max={15} step={0.5} value={inflation}
                  onChange={e => setInflation(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-300"
                />
              </div>

              {/* Pop Growth */}
              <div className="mb-5">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Population Growth</label>
                  <span className="text-xs font-semibold text-indigo-400 bg-indigo-50/50 px-2.5 py-1 rounded-lg">{popGrowth}%</span>
                </div>
                <input
                  type="range" min={0} max={3} step={0.1} value={popGrowth}
                  onChange={e => setPopGrowth(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-300"
                />
              </div>

              {/* Crisis Factor */}
              <div className="mb-8">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Crisis Factor</label>
                  <span className="text-xs font-semibold text-rose-400 bg-rose-50/50 px-2.5 py-1 rounded-lg">{crisisFactor}%</span>
                </div>
                <input
                  type="range" min={0} max={100} step={5} value={crisisFactor}
                  onChange={e => setCrisisFactor(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-rose-300"
                />
              </div>

              <button
                onClick={compute}
                disabled={loading}
                className="w-full py-3.5 rounded-2xl text-white font-semibold text-sm tracking-wide bg-gradient-to-r from-indigo-300 to-purple-300 shadow-lg shadow-indigo-200/50 hover:shadow-indigo-300/60 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {loading ? "Computing..." : "Recalculate Allocation"}
              </button>
            </div>
          </div>

          {/* RIGHT: Results */}
          <div className="flex-1 min-w-0 space-y-6">
            {error && (
              <div className="px-5 py-4 rounded-2xl bg-rose-50/50 border border-rose-100/50 text-rose-400 text-sm font-medium animate-[fadeUp_0.3s_ease-out]">
                {error}
              </div>
            )}

            {result && (
              <div className="space-y-6">
                {/* Top Metric Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                  {[
                    { label: "Projected Voters", value: result.projected_voters, from: "from-emerald-200", to: "to-teal-300", text: "text-emerald-500", bg: "bg-emerald-50/30", border: "border-emerald-100/30" },
                    { label: "Poll Stations", value: formatNumber(result.poll_stations), from: "from-amber-200", to: "to-orange-300", text: "text-amber-500", bg: "bg-amber-50/30", border: "border-amber-100/30" },
                    { label: "Total Budget", value: `₹${result.grand_total_budget_cr} Cr`, from: "from-blue-200", to: "to-indigo-300", text: "text-blue-500", bg: "bg-blue-50/30", border: "border-blue-100/30" },
                    { label: "Total Workforce", value: formatNumber(result.total_human_force), from: "from-rose-200", to: "to-pink-300", text: "text-rose-500", bg: "bg-rose-50/30", border: "border-rose-100/30" },
                  ].map((card, i) => (
                    <div key={i} className={`group relative ${card.bg} backdrop-blur-sm border ${card.border} rounded-3xl p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all overflow-hidden`}>
                      <div className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r ${card.from} ${card.to} opacity-40`} />
                      <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">{card.label}</div>
                      <div className={`text-2xl font-semibold tracking-tight ${card.text}`}>{card.value}</div>
                    </div>
                  ))}
                </div>

                {/* Resource Allocation Tables */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Security */}
                  <div className="bg-white/80 backdrop-blur-xl border border-slate-100/60 rounded-3xl p-7 shadow-sm">
                    <h3 className="text-sm font-semibold text-slate-600 tracking-tight mb-5 flex items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-rose-50/50 text-rose-400 shadow-sm border border-rose-100/20">🛡️</span> Security Forces
                    </h3>
                    <div className="space-y-3.5">
                      {[
                        ["CAPF Companies", result.security.capf_companies.toLocaleString()],
                        ["State Police", result.security.state_police.toLocaleString()],
                        ["Home Guards", result.security.home_guards.toLocaleString()],
                        ["Total Force", result.security.total_security_force.toLocaleString()],
                        ["Budget", `₹${result.security.budget_cr} Cr`],
                      ].map(([label, val], i) => (
                        <div key={i} className="flex justify-between items-center text-sm border-b border-slate-50/50 pb-3.5 last:border-0 last:pb-0">
                          <span className="font-medium text-slate-400">{label}</span>
                          <span className="font-semibold text-slate-600">{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* HR & Admin */}
                  <div className="bg-white/80 backdrop-blur-xl border border-slate-100/60 rounded-3xl p-7 shadow-sm">
                    <h3 className="text-sm font-semibold text-slate-600 tracking-tight mb-5 flex items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-blue-50/50 text-blue-400 shadow-sm border border-blue-100/20">👥</span> HR & Administration
                    </h3>
                    <div className="space-y-3.5">
                      {[
                        ["Class A/B Officers", result.hr_admin.class_ab.toLocaleString()],
                        ["Class C Staff", result.hr_admin.class_c.toLocaleString()],
                        ["Class D Support", result.hr_admin.class_d.toLocaleString()],
                        ["EVM Sets", result.hr_admin.evm_sets.toLocaleString()],
                        ["VVPAT Units", result.hr_admin.vvpat_units.toLocaleString()],
                        ["Budget", `₹${result.hr_admin.budget_cr} Cr`],
                      ].map(([label, val], i) => (
                        <div key={i} className="flex justify-between items-center text-sm border-b border-slate-50/50 pb-3.5 last:border-0 last:pb-0">
                          <span className="font-medium text-slate-400">{label}</span>
                          <span className="font-semibold text-slate-600">{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Budget Split + Logistics */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Donut Chart */}
                  <div className="bg-white/80 backdrop-blur-xl border border-slate-100/60 rounded-3xl p-7 shadow-sm">
                    <h3 className="text-sm font-semibold text-slate-600 tracking-tight mb-6">
                      📊 Budget Split Allocation
                    </h3>
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: "Security", value: result.budget_split.security },
                            { name: "HR & Admin", value: result.budget_split.hr_admin },
                            { name: "Logistics", value: result.budget_split.logistics },
                          ]}
                          cx="50%" cy="50%"
                          innerRadius={70} outerRadius={105}
                          dataKey="value"
                          labelLine={false}
                          stroke="none"
                        >
                          {[0, 1, 2].map((_, index) => (
                             <Cell key={`cell-${index}`} fill={[ "url(#colorSecurity)", "url(#colorHR)", "url(#colorLogistics)" ][index]} />
                          ))}
                        </Pie>
                        <Tooltip 
                           formatter={(v: number) => `${v}%`} 
                           contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 8px 20px rgba(0,0,0,0.06)', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)' }}
                           itemStyle={{ fontWeight: 600, color: '#64748b', fontSize: '11px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex justify-center gap-6 mt-4">
                      {[ { name: "Security", hex: "#fca5a5" }, { name: "HR & Admin", hex: "#93c5fd" }, { name: "Logistics", hex: "#fde047" }].map((d, i) => (
                        <div key={i} className="flex items-center gap-2 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.hex }} />
                          {d.name}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Resource Bar Chart */}
                  <div className="bg-white/80 backdrop-blur-xl border border-slate-100/60 rounded-3xl p-7 shadow-sm">
                    <h3 className="text-sm font-semibold text-slate-600 tracking-tight mb-6">
                      📈 Resource Asset Distribution
                    </h3>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={resourceBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8", fontWeight: 500 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: "#94a3b8", fontWeight: 500 }} axisLine={false} tickLine={false} />
                        <Tooltip cursor={{ fill: "rgba(241,245,249,0.3)" }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 8px 20px rgba(0,0,0,0.06)', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)' }} />
                        <Bar dataKey="value" fill="url(#colorBar)" radius={[6, 6, 6, 6]} barSize={28} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Logistics Summary */}
                <div className="bg-white/80 backdrop-blur-xl border border-slate-100/60 rounded-[2rem] overflow-hidden shadow-sm">
                   <div className="bg-slate-50/30 px-8 py-5 border-b border-slate-100/30 flex items-center justify-between">
                     <h3 className="text-sm font-semibold text-slate-600 tracking-tight flex items-center gap-2">
                       <span className="p-1.5 rounded-lg bg-amber-50/50 text-amber-400 shadow-sm border border-amber-100/20">🚛</span> Logistics Overview
                     </h3>
                   </div>
                   <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 p-8">
                    {[
                      ["Poll Stations", result.logistics.poll_stations.toLocaleString(), "text-amber-400"],
                      ["Transport Vehicles", result.logistics.transport_vehicles.toLocaleString(), "text-amber-400"],
                      ["Comm Units", result.logistics.communication_units.toLocaleString(), "text-amber-400"],
                      ["Logistics Budget", `₹${result.logistics.budget_cr} Cr`, "text-amber-400"],
                    ].map(([label, val, colorClass], i) => (
                      <div key={i} className="text-center border-r border-slate-50 last:border-0 hover:bg-slate-50/20 transition-colors rounded-xl py-2">
                        <div className={`text-2xl font-semibold ${colorClass} mb-1 transition-transform`}>{val}</div>
                        <div className="text-[10px] font-semibold text-slate-400 tracking-widest uppercase">{label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {loading && !result && (
              <div className="flex flex-col items-center justify-center py-24 text-slate-400 bg-white/40 backdrop-blur-md rounded-3xl border border-white/60 shadow-sm">
                <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-300 rounded-full animate-spin mb-6" />
                <div className="text-sm font-medium tracking-tight">Computing highly optimized election resource allocation...</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
