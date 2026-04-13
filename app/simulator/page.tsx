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

  // Fetch presets
  useEffect(() => {
    fetch(`${API}/simulator/presets`)
      .then(r => r.json())
      .then(data => setPresets(data))
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
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/simulator/run`, {
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
      if (!res.ok) throw new Error("Simulation failed");
      const data = await res.json();
      setResult(data);
      setSelectedYear(baseYear);
    } catch {
      setError("Simulation failed. Check backend connection.");
    } finally {
      setLoading(false);
    }
  }, [baseYear, collapseProb, phases, evmMillions]);

  // Auto-run on first load
  useEffect(() => {
    runSimulation();
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
              border: selectedPreset === key ? "2px solid #6366f1" : "1px solid var(--border)",
              background: selectedPreset === key ? "rgba(99,102,241,0.1)" : "var(--card)",
              color: selectedPreset === key ? "#6366f1" : "var(--text-secondary)",
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
            background: "linear-gradient(135deg, #6366f1, #4f46e5)",
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
              { label: "Cumulative Savings", value: `₹${currentYearData?.cumulative_savings_cr?.toLocaleString() || "0"} Cr`, bg: "#6366f1" },
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
                  <Line type="monotone" dataKey="sync_percentage" stroke="#6366f1" strokeWidth={2} dot={false} name="Sync %" />
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
            background: "linear-gradient(135deg, #6366f112, #6366f106)",
            borderRadius: 14, border: "1px solid #6366f130", padding: 20,
          }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", margin: 0, marginBottom: 12 }}>
              📊 20-Year Simulation Summary
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, fontSize: 13 }}>
              {[
                ["Final Sync Rate", `${result.summary.final_sync_percentage}%`, "#6366f1"],
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
        </>
      )}

      {loading && !result && (
        <div style={{ textAlign: "center", padding: 80, color: "var(--text-muted)" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔄</div>
          <div style={{ fontSize: 16 }}>Running simulation...</div>
        </div>
      )}
    </div>
  );
}
