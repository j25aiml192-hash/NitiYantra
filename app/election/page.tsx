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

  const budgetPieData = result
    ? [
        { name: "Security", value: result.budget_split.security, color: "#ef4444" },
        { name: "HR & Admin", value: result.budget_split.hr_admin, color: "#2563EB" },
        { name: "Logistics", value: result.budget_split.logistics, color: "#f59e0b" },
      ]
    : [];

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
    <div style={{ padding: "24px 32px", maxWidth: 1400, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--text)", margin: 0 }}>
          ⚡ Hybrid Election Resource Calculator
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
          AI-powered election resource allocation engine for Indian states & UTs
        </p>
        {result && (
          <span style={{
            display: "inline-block", marginTop: 8, fontSize: 11, fontWeight: 600,
            padding: "3px 10px", borderRadius: 6,
            background: "rgba(99,102,241,0.1)", color: "#2563EB",
          }}>
            Model: {result.model}
          </span>
        )}
      </div>

      <div style={{ display: "flex", gap: 24 }}>
        {/* LEFT: Controls */}
        <div style={{ width: 280, flexShrink: 0 }}>
          <div style={{
            background: "var(--card)", borderRadius: 16, border: "1px solid var(--border)",
            padding: 20, position: "sticky", top: 24,
          }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", margin: 0, marginBottom: 16 }}>
              Parameters
            </h3>

            {/* State Dropdown */}
            <label style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: 4, marginTop: 12 }}>
              State / UT
            </label>
            <select
              value={selectedState}
              onChange={e => setSelectedState(e.target.value)}
              style={{
                width: "100%", padding: "8px 12px", borderRadius: 8,
                border: "1px solid var(--border)", background: "var(--bg)",
                color: "var(--text)", fontSize: 13, outline: "none",
              }}
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
            <label style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: 4, marginTop: 16 }}>
              Target Year: {targetYear}
            </label>
            <input
              type="range" min={2025} max={2040} value={targetYear}
              onChange={e => setTargetYear(Number(e.target.value))}
              style={{ width: "100%" }}
            />

            {/* Inflation */}
            <label style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: 4, marginTop: 16 }}>
              Inflation Rate: {inflation}%
            </label>
            <input
              type="range" min={0} max={15} step={0.5} value={inflation}
              onChange={e => setInflation(Number(e.target.value))}
              style={{ width: "100%" }}
            />

            {/* Pop Growth */}
            <label style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: 4, marginTop: 16 }}>
              Population Growth: {popGrowth}%
            </label>
            <input
              type="range" min={0} max={3} step={0.1} value={popGrowth}
              onChange={e => setPopGrowth(Number(e.target.value))}
              style={{ width: "100%" }}
            />

            {/* Crisis Factor */}
            <label style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: 4, marginTop: 16 }}>
              Crisis Factor: {crisisFactor}%
            </label>
            <input
              type="range" min={0} max={100} step={5} value={crisisFactor}
              onChange={e => setCrisisFactor(Number(e.target.value))}
              style={{ width: "100%" }}
            />

            <button
              onClick={compute}
              disabled={loading}
              style={{
                width: "100%", marginTop: 20, padding: "10px 0",
                borderRadius: 10, border: "none", fontWeight: 700, fontSize: 13,
                background: "linear-gradient(135deg, #2563EB, #1D4ED8)",
                color: "#fff", cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Computing..." : "Recalculate"}
            </button>
          </div>
        </div>

        {/* RIGHT: Results */}
        <div style={{ flex: 1, minWidth: 0 }}>
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
              {/* Top Metric Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
                {[
                  { label: "Projected Voters", value: result.projected_voters, bg: "#10b981" },
                  { label: "Poll Stations", value: formatNumber(result.poll_stations), bg: "#f59e0b" },
                  { label: "Total Budget", value: `₹${result.grand_total_budget_cr} Cr`, bg: "#2563EB" },
                  { label: "Total Workforce", value: formatNumber(result.total_human_force), bg: "#ef4444" },
                ].map((card, i) => (
                  <div key={i} style={{
                    padding: 20, borderRadius: 14,
                    background: `linear-gradient(135deg, ${card.bg}22, ${card.bg}08)`,
                    border: `1px solid ${card.bg}30`,
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {card.label}
                    </div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: card.bg, marginTop: 8 }}>
                      {card.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Resource Allocation Tables */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
                {/* Security */}
                <div style={{
                  background: "var(--card)", borderRadius: 14, border: "1px solid var(--border)", padding: 20,
                }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", margin: 0, marginBottom: 12 }}>
                    🛡️ Security Forces
                  </h3>
                  <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                    {[
                      ["CAPF Companies", result.security.capf_companies.toLocaleString()],
                      ["State Police", result.security.state_police.toLocaleString()],
                      ["Home Guards", result.security.home_guards.toLocaleString()],
                      ["Total Force", result.security.total_security_force.toLocaleString()],
                      ["Budget", `₹${result.security.budget_cr} Cr`],
                    ].map(([label, val], i) => (
                      <div key={i} style={{
                        display: "flex", justifyContent: "space-between", padding: "8px 0",
                        borderBottom: "1px solid var(--border)",
                      }}>
                        <span>{label}</span>
                        <span style={{ fontWeight: 700, color: "var(--text)" }}>{val}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* HR & Admin */}
                <div style={{
                  background: "var(--card)", borderRadius: 14, border: "1px solid var(--border)", padding: 20,
                }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", margin: 0, marginBottom: 12 }}>
                    👥 HR & Administration
                  </h3>
                  <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                    {[
                      ["Class A/B Officers", result.hr_admin.class_ab.toLocaleString()],
                      ["Class C Staff", result.hr_admin.class_c.toLocaleString()],
                      ["Class D Support", result.hr_admin.class_d.toLocaleString()],
                      ["EVM Sets", result.hr_admin.evm_sets.toLocaleString()],
                      ["VVPAT Units", result.hr_admin.vvpat_units.toLocaleString()],
                      ["Budget", `₹${result.hr_admin.budget_cr} Cr`],
                    ].map(([label, val], i) => (
                      <div key={i} style={{
                        display: "flex", justifyContent: "space-between", padding: "8px 0",
                        borderBottom: "1px solid var(--border)",
                      }}>
                        <span>{label}</span>
                        <span style={{ fontWeight: 700, color: "var(--text)" }}>{val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Budget Split + Logistics */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                {/* Donut Chart */}
                <div style={{
                  background: "var(--card)", borderRadius: 14, border: "1px solid var(--border)", padding: 20,
                }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", margin: 0, marginBottom: 12 }}>
                    📊 Budget Split
                  </h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={budgetPieData}
                        cx="50%" cy="50%"
                        innerRadius={60} outerRadius={95}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}%`}
                        labelLine={false}
                      >
                        {budgetPieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => `${v}%`} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 8 }}>
                    {budgetPieData.map((d, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: d.color }} />
                        <span style={{ color: "var(--text-muted)" }}>{d.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Resource Bar Chart */}
                <div style={{
                  background: "var(--card)", borderRadius: 14, border: "1px solid var(--border)", padding: 20,
                }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", margin: 0, marginBottom: 12 }}>
                    📈 Resource Distribution
                  </h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={resourceBarData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--text-muted)" }} />
                      <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#2563EB" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Logistics Summary */}
              <div style={{
                background: "var(--card)", borderRadius: 14, border: "1px solid var(--border)",
                padding: 20, marginTop: 20,
              }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", margin: 0, marginBottom: 12 }}>
                  🚛 Logistics Overview
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, fontSize: 13 }}>
                  {[
                    ["Poll Stations", result.logistics.poll_stations.toLocaleString()],
                    ["Transport Vehicles", result.logistics.transport_vehicles.toLocaleString()],
                    ["Comm Units", result.logistics.communication_units.toLocaleString()],
                    ["Logistics Budget", `₹${result.logistics.budget_cr} Cr`],
                  ].map(([label, val], i) => (
                    <div key={i} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: "#f59e0b" }}>{val}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {loading && !result && (
            <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
              Computing election resources...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
