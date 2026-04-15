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
    <div style={{ minHeight: "100vh", background: "var(--bg)", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        @keyframes enter { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
        @keyframes spin { to { transform:rotate(360deg) } }
        @keyframes shimmer { from { background-position:-200% 0 } to { background-position:200% 0 } }
        @keyframes flowBar { 0% { background-position:0% 50% } 100% { background-position:200% 50% } }
        @keyframes borderGlow { 0%,100% { opacity:0.5 } 50% { opacity:1 } }
      `}</style>

      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "28px 24px 64px" }}>

        {/* ═══ Header ═══ */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28, animation: "enter 0.4s ease both" }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", margin: 0, letterSpacing: -0.3 }}>Pattern Analysis</h1>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "2px 0 0" }}>Three-stage AI inference pipeline</p>
          </div>
          <button onClick={run} disabled={loading} style={{
            display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 20px",
            background: loading ? "transparent" : "linear-gradient(135deg, #1D4ED8, #7C3AED)",
            color: loading ? "var(--text)" : "#fff",
            borderRadius: 10, border: loading ? "1px solid var(--border)" : "none",
            fontSize: 12, fontWeight: 600, fontFamily: "inherit", cursor: loading ? "wait" : "pointer",
            boxShadow: loading ? "none" : "0 2px 12px rgba(29,78,216,0.25)",
            transition: "all 0.3s",
          }}>
            {loading && <div style={{ width: 13, height: 13, border: "2px solid var(--border)", borderTop: "2px solid var(--accent)", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />}
            {loading ? "Running…" : done ? "Re-run Pipeline" : "Run Pipeline"}
          </button>
        </div>

        {/* ═══ Pipeline Stepper ═══ */}
        <div style={{ marginBottom: 28, animation: "enter 0.4s ease 40ms both" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
            {steps.map((s, i) => {
              const active = loading && stage === i;
              const passed = done || (loading && stage > i);
              return (
                <div key={s} style={{ display: "flex", alignItems: "center", flex: i < 2 ? 1 : undefined }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
                      background: passed ? "#10B981" : active ? "var(--accent)" : "var(--card)",
                      border: `1.5px solid ${passed ? "#10B981" : active ? "var(--accent)" : "var(--border)"}`,
                      transition: "all 0.4s",
                    }}>
                      {passed ? (
                        <svg style={{ width: 12, height: 12, color: "#fff" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                      ) : active ? (
                        <div style={{ width: 8, height: 8, border: "1.5px solid #fff", borderTop: "1.5px solid transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                      ) : (
                        <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)" }}>{i + 1}</span>
                      )}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: passed ? "#059669" : active ? "var(--accent)" : "var(--text-muted)", transition: "color 0.3s", whiteSpace: "nowrap" }}>{s}</span>
                  </div>
                  {i < 2 && <div style={{ flex: 1, height: 1, margin: "0 12px", background: passed ? "#10B981" : "var(--border)", transition: "background 0.5s" }} />}
                </div>
              );
            })}
          </div>
          {loading && (
            <div style={{ height: 2, borderRadius: 2, overflow: "hidden", background: "var(--border)", marginTop: 14 }}>
              <div style={{ height: "100%", width: `${((stage + 1) / 3) * 100}%`, borderRadius: 2, background: "linear-gradient(90deg, #2563EB, #8B5CF6, #2563EB)", backgroundSize: "200% 100%", animation: "flowBar 2s linear infinite", transition: "width 0.8s ease" }} />
            </div>
          )}
        </div>

        {/* ═══ Loading ═══ */}
        {init && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ height: 160, borderRadius: 14, border: "1px solid var(--border)", background: "linear-gradient(90deg, var(--card) 25%, var(--bg) 50%, var(--card) 75%)", backgroundSize: "400% 100%", animation: "shimmer 1.8s ease infinite" }} />
            ))}
          </div>
        )}

        {/* ═══ Results — Bento Grid ═══ */}
        {result && done && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 14, animation: "enter 0.5s ease 80ms both" }}>

            {/* ── Stat: Classified ── */}
            <div style={{ gridColumn: "span 4", padding: "20px 22px", borderRadius: 14, background: "var(--card)", border: "1px solid var(--border)", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, #2563EB, #8B5CF6)", borderRadius: "14px 14px 0 0" }} />
              <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, margin: "0 0 8px" }}>Classified</p>
              <p style={{ fontSize: 36, fontWeight: 800, color: "var(--text)", margin: 0, letterSpacing: -2, lineHeight: 1 }}>
                <Counter to={result.classified?.length ?? 0} />
              </p>
              <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "6px 0 0" }}>complaints analyzed</p>
            </div>

            {/* ── Stat: Clusters ── */}
            <div style={{ gridColumn: "span 4", padding: "20px 22px", borderRadius: 14, background: "var(--card)", border: "1px solid var(--border)", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, #0EA5E9, #06B6D4)", borderRadius: "14px 14px 0 0" }} />
              <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, margin: "0 0 8px" }}>Clusters</p>
              <p style={{ fontSize: 36, fontWeight: 800, color: "var(--text)", margin: 0, letterSpacing: -2, lineHeight: 1 }}>
                <Counter to={result.clusters?.length ?? 0} />
              </p>
              <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "6px 0 0" }}>semantic groups</p>
            </div>

            {/* ── Stat: Delayed ── */}
            <div style={{ gridColumn: "span 4", padding: "20px 22px", borderRadius: 14, background: "var(--card)", border: "1px solid var(--border)", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${delayed.length > 0 ? "#EF4444, #F97316" : "#10B981, #059669"})`, borderRadius: "14px 14px 0 0" }} />
              <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, margin: "0 0 8px" }}>Delayed</p>
              <p style={{ fontSize: 36, fontWeight: 800, color: delayed.length > 0 ? "#EF4444" : "#10B981", margin: 0, letterSpacing: -2, lineHeight: 1 }}>
                <Counter to={delayed.length} />
              </p>
              <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
                {sevBreakdown.critical > 0 && <span style={{ fontSize: 10, color: "#EF4444", fontWeight: 600 }}>● {sevBreakdown.critical} critical</span>}
                {sevBreakdown.warning > 0 && <span style={{ fontSize: 10, color: "#F59E0B", fontWeight: 600 }}>● {sevBreakdown.warning} warning</span>}
              </div>
            </div>

            {/* ── Category Distribution (Pie) ── */}
            <div style={{ gridColumn: "span 5", padding: "20px 22px", borderRadius: 14, background: "var(--card)", border: "1px solid var(--border)", minHeight: 260 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", margin: "0 0 4px" }}>Category Distribution</p>
              <p style={{ fontSize: 10, color: "var(--text-muted)", margin: "0 0 12px" }}>AI classification breakdown</p>
              {pieData.length > 0 ? (
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ width: 140, height: 140 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} dataKey="value" strokeWidth={2} stroke="var(--card)">
                          {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip content={<ChartTip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                    {pieData.map((d, i) => (
                      <div key={d.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ width: 8, height: 8, borderRadius: 2, background: PIE_COLORS[i % PIE_COLORS.length] }} />
                          <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{d.name}</span>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : <p style={{ fontSize: 12, color: "var(--text-muted)" }}>No data</p>}
            </div>

            {/* ── Confidence Distribution (Bar) ── */}
            <div style={{ gridColumn: "span 7", padding: "20px 22px", borderRadius: 14, background: "var(--card)", border: "1px solid var(--border)", minHeight: 260 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", margin: "0 0 4px" }}>Confidence Distribution</p>
              <p style={{ fontSize: 10, color: "var(--text-muted)", margin: "0 0 12px" }}>Model certainty across predictions</p>
              <div style={{ width: "100%", height: 170 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={confBuckets} barSize={32}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="range" tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTip />} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {confBuckets.map((b, i) => <Cell key={i} fill={b.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ── Classification Table ── */}
            <div style={{ gridColumn: "span 12", borderRadius: 14, background: "var(--card)", border: "1px solid var(--border)", overflow: "hidden" }}>
              <div style={{ padding: "16px 22px 12px", borderBottom: "1px solid var(--border)" }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", margin: 0 }}>Classification Results</p>
                <p style={{ fontSize: 10, color: "var(--text-muted)", margin: "2px 0 0" }}>{result.classified?.length || 0} complaints via BART-large-MNLI zero-shot</p>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "var(--bg)" }}>
                      {["ID", "Complaint Text", "Predicted Category", "Confidence"].map(h => (
                        <th key={h} style={{ textAlign: h === "Confidence" ? "right" : "left", padding: "8px 20px", fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, borderBottom: "1px solid var(--border)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(result.classified || []).slice(0, 10).map((c, i) => {
                      const conf = Math.round(c.confidence * 100);
                      const cc = conf >= 80 ? "#10B981" : conf >= 50 ? "#F59E0B" : "#EF4444";
                      return (
                        <tr key={c.id} style={{ borderBottom: "1px solid var(--border)", transition: "background 0.1s" }}
                          onMouseEnter={e => e.currentTarget.style.background = "var(--bg)"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                        >
                          <td style={{ padding: "10px 20px", fontSize: 12, fontFamily: "'GeistMono', monospace", color: "var(--text-muted)", width: 64 }}>#{c.id}</td>
                          <td style={{ padding: "10px 20px", fontSize: 12, color: "var(--text-secondary)", maxWidth: 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.text}</td>
                          <td style={{ padding: "10px 20px" }}>
                            <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 6, background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>{c.predicted_category}</span>
                          </td>
                          <td style={{ padding: "10px 20px", textAlign: "right", width: 160 }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
                              <div style={{ width: 56, height: 4, borderRadius: 2, background: "var(--border)", overflow: "hidden" }}>
                                <div style={{ width: `${conf}%`, height: "100%", borderRadius: 2, background: cc, transition: "width 0.6s ease", animationDelay: `${i * 50}ms` }} />
                              </div>
                              <span style={{ fontSize: 11, fontWeight: 700, color: cc, minWidth: 28, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{conf}%</span>
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
            <div style={{ gridColumn: "span 12" }}>
              <div style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", margin: 0 }}>Issue Clusters</p>
                <p style={{ fontSize: 10, color: "var(--text-muted)", margin: "2px 0 0" }}>{result.clusters?.length || 0} groups formed via MiniLM-L6 semantic similarity</p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                {(result.clusters || []).map((cluster, idx) => {
                  const clr = CLUSTER_COLORS[idx % CLUSTER_COLORS.length];
                  return (
                    <div key={idx} style={{
                      borderRadius: 14, background: "var(--card)", border: "1px solid var(--border)",
                      overflow: "hidden", animation: `enter 0.4s ease ${idx * 40}ms both`,
                      transition: "border-color 0.2s, box-shadow 0.2s",
                    }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = clr; e.currentTarget.style.boxShadow = `0 0 0 1px ${clr}20`; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
                    >
                      {/* Header */}
                      <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: clr, boxShadow: `0 0 6px ${clr}50` }} />
                          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>{cluster.cluster_label}</span>
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 700, color: clr, background: `${clr}10`, padding: "2px 8px", borderRadius: 5 }}>{cluster.complaints.length}</span>
                      </div>
                      {/* Items */}
                      <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 4 }}>
                        {cluster.complaints.slice(0, 3).map(comp => (
                          <div key={comp.id} style={{ display: "flex", gap: 8, padding: "6px 8px", borderRadius: 6, background: "var(--bg)", border: "1px solid transparent", transition: "border-color 0.15s" }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = "var(--border)"}
                            onMouseLeave={e => e.currentTarget.style.borderColor = "transparent"}
                          >
                            <span style={{ fontSize: 9, fontFamily: "monospace", color: "var(--text-muted)", flexShrink: 0, marginTop: 2 }}>#{comp.id}</span>
                            <p style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.4, margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{comp.text}</p>
                          </div>
                        ))}
                        {cluster.complaints.length > 3 && (
                          <p style={{ fontSize: 10, color: "var(--text-muted)", textAlign: "center", margin: "2px 0 0", fontWeight: 500 }}>+{cluster.complaints.length - 3} more</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Delayed Issues ── */}
            {delayed.length > 0 && (
              <div style={{ gridColumn: "span 12", borderRadius: 14, background: "var(--card)", border: "1px solid var(--border)", overflow: "hidden" }}>
                <div style={{ padding: "16px 22px 12px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", margin: 0 }}>SLA Delays Detected</p>
                    <p style={{ fontSize: 10, color: "var(--text-muted)", margin: "2px 0 0" }}>{delayed.length} issues past threshold</p>
                  </div>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    {sevBreakdown.critical > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", background: "#EF4444", padding: "2px 8px", borderRadius: 5 }}>{sevBreakdown.critical} critical</span>}
                    {sevBreakdown.warning > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: "#92400E", background: "#FDE68A", padding: "2px 8px", borderRadius: 5 }}>{sevBreakdown.warning} warning</span>}
                  </div>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "var(--bg)" }}>
                        {["Issue", "Complaint", "Department", "Days Open", "Severity", "Status"].map(h => (
                          <th key={h} style={{ textAlign: "left", padding: "8px 20px", fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, borderBottom: "1px solid var(--border)" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {delayed.slice(0, 15).map(d => {
                        const sev = d.days_open >= 15 ? { label: "Critical", color: "#EF4444", bg: "#FEF2F2" } : d.days_open >= 7 ? { label: "Warning", color: "#D97706", bg: "#FFFBEB" } : { label: "Normal", color: "#059669", bg: "#ECFDF5" };
                        return (
                          <tr key={d.issue_id ?? d.id} style={{ borderBottom: "1px solid var(--border)", transition: "background 0.1s" }}
                            onMouseEnter={e => e.currentTarget.style.background = "var(--bg)"}
                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                          >
                            <td style={{ padding: "10px 20px", fontSize: 12, fontFamily: "monospace", color: "var(--text-muted)" }}>ISS-{String(d.issue_id ?? d.id).padStart(3, "0")}</td>
                            <td style={{ padding: "10px 20px", fontSize: 12, fontFamily: "monospace", color: "var(--text-muted)" }}>#{d.complaint_id}</td>
                            <td style={{ padding: "10px 20px", fontSize: 12, color: "var(--text-secondary)" }}>{DEPT[d.department_id] || `Dept ${d.department_id}`}</td>
                            <td style={{ padding: "10px 20px" }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: sev.color, fontVariantNumeric: "tabular-nums" }}>{d.days_open}d</span>
                            </td>
                            <td style={{ padding: "10px 20px" }}>
                              <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: sev.bg, color: sev.color, textTransform: "uppercase", letterSpacing: 0.5 }}>{sev.label}</span>
                            </td>
                            <td style={{ padding: "10px 20px" }}>
                              <span style={{ fontSize: 10, fontWeight: 600, color: d.status === "escalated" ? "#EF4444" : d.status === "in_progress" ? "#D97706" : "#2563EB", textTransform: "capitalize" }}>{d.status.replace("_", " ")}</span>
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
          <div style={{ textAlign: "center", padding: "96px 0", animation: "enter 0.5s ease both" }}>
            <div style={{
              width: 56, height: 56, borderRadius: 14, margin: "0 auto 20px",
              background: "linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.1))",
              border: "1px solid rgba(99,102,241,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg style={{ width: 24, height: 24, color: "#2563EB" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082" />
              </svg>
            </div>
            <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", margin: "0 0 6px" }}>Ready to analyze</p>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 24px", maxWidth: 320, marginLeft: "auto", marginRight: "auto" }}>
              Run the AI pipeline to classify complaints, discover patterns, and detect SLA violations.
            </p>
            <button onClick={run} style={{
              padding: "10px 24px", background: "linear-gradient(135deg, #1D4ED8, #7C3AED)", color: "#fff",
              borderRadius: 10, border: "none", fontSize: 13, fontWeight: 600,
              fontFamily: "inherit", cursor: "pointer", boxShadow: "0 4px 16px rgba(29,78,216,0.25)",
            }}>Run Pipeline →</button>
          </div>
        )}
      </div>
    </div>
  );
}
