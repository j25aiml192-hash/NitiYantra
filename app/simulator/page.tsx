"use client";

import { useState, useEffect, useCallback } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, BarChart, Bar
} from "recharts";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
  const [readiness, setReadiness] = useState<any>(null);

  // Fetch presets
  useEffect(() => {
    fetch(`${API}/simulator/presets`)
      .then(r => r.json())
      .then(data => setPresets(data))
      .catch(() => {});
    // Fetch readiness index
    fetch(`${API}/election/readiness-index`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setReadiness(data); })
      .catch(() => {});
  }, []);

  // Apply preset
  const applyPreset = (key: string) => {
    setSelectedPreset(key);
    const p = presets[key];
    if (p) {
      setCollapseProb(p.collapse_prob);
      setPhases(p.phases);
      setEvmMillions(p.evm_millions);
    }
  };

  // Run simulation
  const runSimulation = useCallback(async () => {
    console.log("[Simulator] Starting simulation with params:", { baseYear, collapseProb, phases, evmMillions });
    setLoading(true);
    setError("");
    try {
      const url = `${API}/simulator/run`;
      console.log("[Simulator] Fetching:", url);
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base_year: baseYear,
          collapse_prob: collapseProb,
          phases: phases,
          evm_millions: evmMillions,
          seed: 42,
        }),
      });
      console.log("[Simulator] Response status:", res.status);
      if (!res.ok) {
        const errText = await res.text().catch(() => "Unknown error");
        console.error("[Simulator] Error response:", errText);
        throw new Error(`Simulation failed (${res.status}): ${errText}`);
      }
      const data = await res.json();
      console.log("[Simulator] Got result:", {
        savings: data?.summary?.total_savings_cr,
        states: data?.summary?.total_states,
        events: data?.simulation_events?.length,
        yearly: data?.yearly_data?.length,
      });
      setResult(data);
      setSelectedYear(baseYear);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error("[Simulator] Failed:", msg);
      setError(`Simulation failed: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, [baseYear, collapseProb, phases, evmMillions]);

  // Auto-run on first load
  useEffect(() => {
    runSimulation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentYearData = result?.yearly_data.find(y => y.year === selectedYear);

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1400, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--text)", margin: 0 }}>
          🗳️ One Nation One Election — Simulator
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
          20-year projection engine for synchronized Indian elections
        </p>
      </div>

      {/* Preset Buttons */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {Object.entries(presets).map(([key, p]) => (
          <button
            key={key}
            onClick={() => applyPreset(key)}
            style={{
              padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
              border: selectedPreset === key ? "2px solid #2563EB" : "1px solid var(--border)",
              background: selectedPreset === key ? "rgba(99,102,241,0.1)" : "var(--card)",
              color: selectedPreset === key ? "#2563EB" : "var(--text-secondary)",
              cursor: "pointer",
            }}
            title={p.description}
          >
            {p.label}
          </button>
        ))}
        <button
          onClick={runSimulation}
          disabled={loading}
          style={{
            padding: "6px 20px", borderRadius: 8, fontSize: 12, fontWeight: 700,
            border: "none", marginLeft: "auto",
            background: "linear-gradient(135deg, #2563EB, #1D4ED8)",
            color: "#fff", cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Simulating..." : "▶ Run Simulation"}
        </button>
      </div>

      {/* Timeline Slider */}
      {result && (
        <div style={{
          background: "var(--card)", borderRadius: 14, border: "1px solid var(--border)",
          padding: "16px 24px", marginBottom: 20,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>
              Timeline: {selectedYear}
            </span>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {result.parameters.base_year} → {result.parameters.base_year + 20}
            </span>
          </div>
          <input
            type="range"
            min={result.parameters.base_year}
            max={result.parameters.base_year + 20}
            value={selectedYear}
            onChange={e => setSelectedYear(Number(e.target.value))}
            style={{ width: "100%" }}
          />
        </div>
      )}

      {error && (
        <div style={{
          padding: 16, borderRadius: 12, background: "rgba(239,68,68,0.1)",
          color: "#ef4444", fontSize: 13, marginBottom: 16,
        }}>
          {error}
        </div>
      )}

      {result && (
        <>
          {/* Metric Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14, marginBottom: 24 }}>
            {[
              { label: "Governance Days Saved", value: currentYearData?.cumulative_governance_days?.toLocaleString() || "0", bg: "#10b981" },
              { label: "Cumulative Savings", value: `₹${currentYearData?.cumulative_savings_cr?.toLocaleString() || "0"} Cr`, bg: "#2563EB" },
              { label: "Synced States", value: `${currentYearData?.synced_count || 0}/${result.summary.total_states}`, bg: "#f59e0b" },
              { label: "Security Forces", value: currentYearData?.security_forces?.toLocaleString() || "0", bg: "#ef4444" },
              { label: "Active Elections", value: currentYearData?.active_polls?.toString() || "0", bg: "#8b5cf6" },
            ].map((card, i) => (
              <div key={i} style={{
                padding: 16, borderRadius: 14,
                background: `linear-gradient(135deg, ${card.bg}18, ${card.bg}08)`,
                border: `1px solid ${card.bg}25`,
              }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {card.label}
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: card.bg, marginTop: 6 }}>
                  {card.value}
                </div>
              </div>
            ))}
          </div>

          {/* Main content: Map placeholder + Events */}
          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 20, marginBottom: 24 }}>
            {/* State Grid (Map Placeholder) */}
            <div style={{
              background: "var(--card)", borderRadius: 14, border: "1px solid var(--border)",
              padding: 20, minHeight: 350,
            }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", margin: 0, marginBottom: 12 }}>
                🗺️ State Sync Status
              </h3>
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: "#10b981" }} />
                  <span style={{ color: "var(--text-muted)" }}>Synced</span>
                </span>
                <span style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: "#f59e0b" }} />
                  <span style={{ color: "var(--text-muted)" }}>Off-Cycle</span>
                </span>
                <span style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: "#ef4444" }} />
                  <span style={{ color: "var(--text-muted)" }}>Dissolved</span>
                </span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {result.state_summary.map(s => (
                  <button
                    key={s.name}
                    style={{
                      padding: "4px 10px", borderRadius: 6, fontSize: 10, fontWeight: 600,
                      border: "none", cursor: "pointer",
                      background: s.dissolved ? "#ef444422" : s.synced ? "#10b98122" : "#f59e0b22",
                      color: s.dissolved ? "#ef4444" : s.synced ? "#10b981" : "#f59e0b",
                    }}
                    title={`${s.name} — ${s.synced ? "Synced" : s.dissolved ? "Dissolved" : "Off-Cycle"} (Term: ${s.term_end})`}
                  >
                    {s.name.length > 15 ? s.name.substring(0, 12) + "..." : s.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Simulation Events */}
            <div style={{
              background: "linear-gradient(135deg, #f59e0b12, #f59e0b06)",
              borderRadius: 14, border: "1px solid #f59e0b30", padding: 20,
              maxHeight: 350, overflowY: "auto",
            }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", margin: 0, marginBottom: 12 }}>
                📰 Simulation Events
              </h3>
              {result.simulation_events.length === 0 ? (
                <div style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", padding: 40 }}>
                  No disruptions in this simulation ✨
                </div>
              ) : (
                result.simulation_events.slice(0, 12).map((e, i) => (
                  <div key={i} style={{
                    padding: "8px 0", borderBottom: "1px solid var(--border)",
                    fontSize: 12, color: "var(--text-secondary)",
                  }}>
                    <span style={{
                      fontWeight: 700,
                      color: e.severity === "high" ? "#ef4444" : "#f59e0b",
                    }}>
                      [{e.year}]
                    </span>{" "}
                    {e.message}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Charts */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
            {/* Savings Over Time */}
            <div style={{
              background: "var(--card)", borderRadius: 14, border: "1px solid var(--border)", padding: 20,
            }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", margin: 0, marginBottom: 12 }}>
                💰 Cumulative Savings
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={result.yearly_data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="year" tick={{ fontSize: 10, fill: "var(--text-muted)" }} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="cumulative_savings_cr" stroke="#10b981" fill="#10b98122" name="Savings (₹ Cr)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Sync Percentage */}
            <div style={{
              background: "var(--card)", borderRadius: 14, border: "1px solid var(--border)", padding: 20,
            }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", margin: 0, marginBottom: 12 }}>
                📈 Sync Rate Over Time
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={result.yearly_data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="year" tick={{ fontSize: 10, fill: "var(--text-muted)" }} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} domain={[0, 100]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="sync_percentage" stroke="#2563EB" strokeWidth={2} dot={false} name="Sync %" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Governance Days */}
            <div style={{
              background: "var(--card)", borderRadius: 14, border: "1px solid var(--border)", padding: 20,
            }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", margin: 0, marginBottom: 12 }}>
                📅 Governance Days Saved
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={result.yearly_data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="year" tick={{ fontSize: 10, fill: "var(--text-muted)" }} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} />
                  <Tooltip />
                  <Bar dataKey="governance_days_saved" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Days" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Active Elections */}
            <div style={{
              background: "var(--card)", borderRadius: 14, border: "1px solid var(--border)", padding: 20,
            }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", margin: 0, marginBottom: 12 }}>
                🗳️ Active Elections by Year
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={result.yearly_data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="year" tick={{ fontSize: 10, fill: "var(--text-muted)" }} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} />
                  <Tooltip />
                  <Bar dataKey="active_polls" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Elections" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Summary */}
          <div style={{
            background: "linear-gradient(135deg, #2563EB12, #2563EB06)",
            borderRadius: 14, border: "1px solid #2563EB30", padding: 20,
          }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", margin: 0, marginBottom: 12 }}>
              📊 20-Year Simulation Summary
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, fontSize: 13 }}>
              {[
                ["Final Sync Rate", `${result.summary.final_sync_percentage}%`, "#2563EB"],
                ["Total Savings", `₹${result.summary.total_savings_cr.toLocaleString()} Cr`, "#10b981"],
                ["Governance Days Recovered", result.summary.total_governance_days_saved.toLocaleString(), "#f59e0b"],
                ["Total Dissolutions", result.summary.total_dissolutions.toString(), "#ef4444"],
                ["States Synced", `${result.summary.final_synced}/${result.summary.total_states}`, "#8b5cf6"],
                ["Simulation Events", result.simulation_events.length.toString(), "#f97316"],
              ].map(([label, val, color], i) => (
                <div key={i} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color }}>{val}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── ONOE Savings Calculator ── */}
          <div style={{ marginTop: 24 }}>
            <h2 style={{
              fontSize: 22, fontWeight: 800, color: "var(--text)", margin: 0, marginBottom: 16,
              display: "flex", alignItems: "center", gap: 10,
            }}>
              💰 ONOE Savings Calculator
              <span style={{
                fontSize: 10, fontWeight: 600, background: "#10b98118", color: "#10b981",
                padding: "3px 10px", borderRadius: 20,
              }}>
                CMS India 2024
              </span>
            </h2>

            {/* Top stat cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
              {[
                {
                  label: "Current System Cost (per cycle)",
                  value: "₹1,88,000 Cr",
                  sub: "28 states × ₹3,000 Cr + 8 UTs × ₹500 Cr + ₹1,00,000 Cr Lok Sabha",
                  color: "#ef4444",
                },
                {
                  label: "ONOE Cost (per cycle)",
                  value: "₹1,20,000 Cr",
                  sub: "All elections conducted simultaneously",
                  color: "#10b981",
                },
                {
                  label: "Savings Per Cycle",
                  value: "₹68,000 Cr",
                  sub: "36% cost reduction per 5-year cycle",
                  color: "#2563EB",
                },
                {
                  label: "20-Year Savings (4 cycles)",
                  value: "₹2,72,000 Cr",
                  sub: "Directed to development, education, healthcare",
                  color: "#f59e0b",
                },
              ].map((card, i) => (
                <div key={i} style={{
                  padding: 18, borderRadius: 14,
                  background: `linear-gradient(135deg, ${card.color}12, ${card.color}06)`,
                  border: `1px solid ${card.color}25`,
                }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {card.label}
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: card.color, marginTop: 6 }}>
                    {card.value}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4, lineHeight: 1.4 }}>
                    {card.sub}
                  </div>
                </div>
              ))}
            </div>

            {/* Cost Comparison Chart + Governance Days */}
            <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 20, marginBottom: 20 }}>
              {/* Bar Chart: Current vs ONOE */}
              <div style={{
                background: "var(--card)", borderRadius: 14, border: "1px solid var(--border)", padding: 20,
              }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", margin: 0, marginBottom: 12 }}>
                  📊 Cost Comparison: Current System vs ONOE
                </h3>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={[
                    { cycle: "2029-34", current: 188000, onoe: 120000 },
                    { cycle: "2034-39", current: 199280, onoe: 127200 },
                    { cycle: "2039-44", current: 211240, onoe: 134830 },
                    { cycle: "2044-49", current: 223910, onoe: 142920 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="cycle" tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
                    <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} tickFormatter={(v) => `₹${(Number(v) / 1000).toFixed(0)}K Cr`} />
                    <Tooltip
                      formatter={(value) => [`₹${Number(value).toLocaleString()} Cr`, ""]}
                      contentStyle={{
                        background: "var(--card)", border: "1px solid var(--border)",
                        borderRadius: 10, fontSize: 12,
                      }}
                    />
                    <Bar dataKey="current" fill="#ef4444" radius={[6, 6, 0, 0]} name="Current System" />
                    <Bar dataKey="onoe" fill="#10b981" radius={[6, 6, 0, 0]} name="ONOE System" />
                  </BarChart>
                </ResponsiveContainer>
                <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 8 }}>
                  <span style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: "#ef4444" }} />
                    <span style={{ color: "var(--text-muted)" }}>Current System</span>
                  </span>
                  <span style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: "#10b981" }} />
                    <span style={{ color: "var(--text-muted)" }}>ONOE System</span>
                  </span>
                </div>
              </div>

              {/* Governance Days Saved */}
              <div style={{
                background: "linear-gradient(135deg, #f59e0b12, #f59e0b06)",
                borderRadius: 14, border: "1px solid #f59e0b30", padding: 24,
                display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
                textAlign: "center",
              }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Model Code of Conduct Days Eliminated
                </div>
                <div style={{ fontSize: 56, fontWeight: 800, color: "#f59e0b", marginTop: 12, lineHeight: 1 }}>
                  2,800
                </div>
                <div style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 8, fontWeight: 600 }}>
                  governance days saved over 20 years
                </div>
                <div style={{
                  marginTop: 20, fontSize: 11, color: "var(--text-muted)", lineHeight: 1.6,
                  borderTop: "1px solid var(--border)", paddingTop: 16,
                }}>
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ fontWeight: 700, color: "#ef4444" }}>Current:</span>{" "}
                    ~200 MCC days/year across states
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ fontWeight: 700, color: "#10b981" }}>ONOE:</span>{" "}
                    Only 60 MCC days per 5-year cycle
                  </div>
                  <div>
                    <span style={{ fontWeight: 700, color: "#2563EB" }}>Net:</span>{" "}
                    ~140 extra governance days/year recovered
                  </div>
                </div>
              </div>
            </div>

            {/* Disclaimer */}
            <div style={{
              padding: "12px 20px", borderRadius: 10,
              background: "var(--card)", border: "1px solid var(--border)",
              fontSize: 11, color: "var(--text-muted)", fontStyle: "italic",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <span>⚠️</span>
              <span>
                Figures based on CMS India 2024 data and HLC Kovind Committee Report (March 2024).
                Inflation estimated at 6% p.a. Actual savings may vary based on political conditions and implementation timeline.
              </span>
            </div>
          </div>
        </>
      )}

      {loading && !result && (
        <div style={{ textAlign: "center", padding: 80, color: "var(--text-muted)" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔄</div>
          <div style={{ fontSize: 16 }}>Running simulation...</div>
        </div>
      )}
      {loading && result && (
        <div style={{
          position: "fixed", top: 80, right: 32, zIndex: 100,
          padding: "10px 20px", borderRadius: 12,
          background: "var(--card)", border: "1px solid #2563EB50",
          boxShadow: "0 4px 20px rgba(37,99,235,0.15)",
          fontSize: 13, fontWeight: 600, color: "#2563EB",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>🔄</span>
          Re-running simulation...
        </div>
      )}
      {/* ═══ ELECTION READINESS INDEX ═══ */}
      {readiness && readiness.readiness_index && (
        <div style={{
          background: "var(--card)", borderRadius: 16, border: "1px solid var(--border)",
          padding: 24, marginTop: 32,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg, #2563EB, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>📊</span>
                Election Readiness Index
              </h3>
              <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                {readiness.total_states} states/UTs — {readiness.imminent_count} imminent elections
              </p>
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: readiness.national_average >= 60 ? "#059669" : "#d97706" }}>
                  {readiness.national_average}
                </div>
                <div style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase" as const, fontWeight: 600 }}>Nat. Avg</div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg)" }}>
                  {["State/UT", "Score", "Grade", "Status", "Term End", "Voters (Cr)", "Constituencies", "Key Risk"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "8px 12px", fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {readiness.readiness_index.map((r: { state: string; score: number; grade: string; status: string; term_end_year: number; voters_cr: number; constituencies: number; key_risk: string; type: string }, i: number) => (
                  <tr key={r.state} style={{ borderBottom: "1px solid var(--border)", background: i % 2 === 1 ? "var(--bg)" : "transparent" }}>
                    <td style={{ padding: "8px 12px", fontWeight: 600, color: "var(--text)" }}>
                      {r.state}
                      <span style={{ fontSize: 9, color: "var(--text-muted)", marginLeft: 4 }}>({r.type})</span>
                    </td>
                    <td style={{ padding: "8px 12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 60, height: 6, borderRadius: 3, background: "var(--border)", overflow: "hidden" }}>
                          <div style={{ height: "100%", borderRadius: 3, width: `${r.score}%`, background: r.score >= 70 ? "#059669" : r.score >= 50 ? "#d97706" : "#e11d48", transition: "width 0.7s ease" }} />
                        </div>
                        <span style={{ fontWeight: 700, color: r.score >= 70 ? "#059669" : r.score >= 50 ? "#d97706" : "#e11d48" }}>{r.score}</span>
                      </div>
                    </td>
                    <td style={{ padding: "8px 12px" }}>
                      <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700, background: r.score >= 70 ? "rgba(5,150,105,0.1)" : r.score >= 50 ? "rgba(217,119,6,0.1)" : "rgba(225,29,72,0.1)", color: r.score >= 70 ? "#059669" : r.score >= 50 ? "#d97706" : "#e11d48" }}>
                        {r.grade}
                      </span>
                    </td>
                    <td style={{ padding: "8px 12px" }}>
                      <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 600, background: r.status === "Imminent" ? "rgba(239,68,68,0.1)" : r.status === "Upcoming" ? "rgba(217,119,6,0.1)" : "rgba(5,150,105,0.1)", color: r.status === "Imminent" ? "#ef4444" : r.status === "Upcoming" ? "#d97706" : "#059669" }}>
                        {r.status === "Imminent" && "🔴 "}{r.status}
                      </span>
                    </td>
                    <td style={{ padding: "8px 12px", color: "var(--text-secondary)", fontWeight: 500 }}>{r.term_end_year}</td>
                    <td style={{ padding: "8px 12px", color: "var(--text-muted)" }}>{r.voters_cr}</td>
                    <td style={{ padding: "8px 12px", color: "var(--text-muted)" }}>{r.constituencies}</td>
                    <td style={{ padding: "8px 12px", color: "var(--text-muted)", fontSize: 10, maxWidth: 160 }}>{r.key_risk}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 12, fontSize: 10, color: "var(--text-muted)", fontStyle: "italic" }}>
            {readiness.model}
          </div>
        </div>
      )}
    </div>
  );
}
