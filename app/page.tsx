"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

const API = "https://nityantra-backend.onrender.com";

/* ── CountUp ── */
function CountUp({ end, suffix = "" }: { end: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        const t0 = Date.now();
        const dur = 1200;
        const tick = () => {
          const p = Math.min((Date.now() - t0) / dur, 1);
          setCount(Math.floor((1 - Math.pow(1 - p, 3)) * end));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [end]);
  return <span ref={ref}>{count}{suffix}</span>;
}

/* ── Types ── */
interface ClassifyResult { category: string; confidence: number; department: string; model: string; }
const CAT_COLORS: Record<string, string> = {
  Roads: "#F59E0B", "Water Supply": "#06B6D4", Electricity: "#2563EB",
  Sanitation: "#10B981", "Public Safety": "#EF4444", Other: "#9CA3AF",
};
const DEPT_GRADIENTS: Record<string, string> = {
  PWD: "linear-gradient(135deg,#1E293B,#334155)",
  "Jal Board": "linear-gradient(135deg,#0369A1,#38BDF8)",
  DESU: "linear-gradient(135deg,#B45309,#FBBF24)",
  MCD: "linear-gradient(135deg,#15803D,#4ADE80)",
  "Delhi Police": "linear-gradient(135deg,#6D28D9,#A78BFA)",
};
const SAMPLES = [
  { label: "🛣 Road damage", text: "Massive pothole on NH-58 near Sector 62 Noida causing accidents daily. Immediate repair needed." },
  { label: "💧 Water outage", text: "No water supply in Block-4 Ghaziabad for 3 days. Pipeline leaking near main junction." },
  { label: "⚡ Power cut", text: "Frequent power cuts in Sector 18 Noida lasting 4-6 hours. Transformer sparking dangerously." },
];
const TEAM = [
  { name: "Hitendra Dhapola", role: "Backend Developer + AI/ML", initials: "HD", gradient: "linear-gradient(135deg,#1D4ED8,#7C3AED)" },
  { name: "Arya Bhrdwaj", role: "Frontend Developer + UI Designer", initials: "AB", gradient: "linear-gradient(135deg,#0EA5E9,#22D3EE)" },
  { name: "Astha Yadav", role: "Frontend Developer", initials: "AY", gradient: "linear-gradient(135deg,#F59E0B,#FB923C)" },
  { name: "Kartik Kumar", role: "Backend Assist", initials: "KK", gradient: "linear-gradient(135deg,#10B981,#34D399)" },
];

export default function LandingPage() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [totalComplaints, setTotalComplaints] = useState(50);
  const [, setDelayedIssues] = useState(22);
  const [classifyText, setClassifyText] = useState("");
  const [result, setResult] = useState<ClassifyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [barWidth, setBarWidth] = useState(0);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    fetch(`${API}/dashboard/stats`)
      .then(r => r.json())
      .then(d => {
        if (d.total_complaints) setTotalComplaints(d.total_complaints);
        if (d.delayed_issues != null) setDelayedIssues(d.delayed_issues);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(
      es => es.forEach(e => { if (e.isIntersecting) e.target.classList.add("visible"); }),
      { threshold: 0.12 }
    );
    document.querySelectorAll(".anim-in").forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const handleClassify = useCallback(async () => {
    if (!classifyText.trim() || loading) return;
    setLoading(true); setResult(null); setBarWidth(0);
    try {
      const res = await fetch(`${API}/ai/classify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: classifyText }),
      });
      const data: ClassifyResult = await res.json();
      setResult(data);
      setTimeout(() => setBarWidth(data.confidence * 100), 60);
    } catch {
      setResult({ category: "Error", confidence: 0, department: "N/A", model: "Connection failed" });
    }
    setLoading(false);
  }, [classifyText, loading]);

  const f = "'Inter', sans-serif";

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh", fontFamily: f, position: "relative" }}>
      {/* Grid background pattern */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        backgroundImage: "linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px)",
        backgroundSize: "48px 48px",
        maskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)",
        WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)",
      }} />
      <style>{`
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.5); }
        }
        @keyframes float-up {
          from { opacity: 0; transform: translateY(30px); filter: blur(4px); }
          to { opacity: 1; transform: translateY(0); filter: blur(0); }
        }
        @keyframes heroReveal {
          from { opacity: 0; transform: translateY(20px) scale(0.96); filter: blur(8px); }
          to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
        @keyframes heroFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes glowPulse {
          0%, 100% { opacity: 0.4; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 0.7; transform: translate(-50%, -50%) scale(1.1); }
        }
        @keyframes shimmerLine {
          from { transform: translateX(-100%); }
          to { transform: translateX(200%); }
        }
        .float-in { animation: float-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .float-d1 { animation-delay: 0.08s; }
        .float-d2 { animation-delay: 0.2s; }
        .float-d3 { animation-delay: 0.35s; }
        .float-d4 { animation-delay: 0.5s; }
        .float-d5 { animation-delay: 0.65s; }
        .hover-lift { transition: transform 0.3s, box-shadow 0.3s; }
        .hover-lift:hover { transform: translateY(-4px); box-shadow: 0 16px 40px rgba(0,0,0,0.08); }
        .shimmer-bg {
          background: linear-gradient(90deg, transparent, rgba(29,78,216,0.04), transparent);
          background-size: 200% 100%;
          animation: gradientShift 3s ease-in-out infinite;
        }
        .hero-logo-wrap {
          animation: heroReveal 1s cubic-bezier(0.16, 1, 0.3, 1) 0.15s both;
        }
        .hero-logo-wrap img {
          animation: heroFloat 5s ease-in-out infinite;
          animation-delay: 1.2s;
        }
        .metrics-card {
          position: relative;
          overflow: hidden;
        }
        .metrics-card::after {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(29,78,216,0.3), rgba(139,92,246,0.3), transparent);
          animation: shimmerLine 3s ease-in-out infinite;
        }
      `}</style>

      {/* ═══ NAVBAR ═══ */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        height: 64, display: "flex", justifyContent: "center", padding: "0 24px",
        background: scrolled ? "rgba(199,203,8,0.85)" : "transparent",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(20px)" : "none",
        borderBottom: scrolled ? "1px solid var(--border)" : "1px solid transparent",
        transition: "all 0.3s ease",
      }}>
        <div style={{ maxWidth: 1200, width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: "linear-gradient(135deg, #0A0A0A, #374151)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)", padding: 5,
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/nityantralogo.svg" alt="NitiYantra" style={{ width: 20, height: 20, filter: "invert(1)" }} />
            </div>
            <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", letterSpacing: -0.4 }}>NitiYantra</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            {[
              { label: "About", target: "about-section" },
              { label: "Departments", target: "departments-section" },
              { label: "Solutions", target: "features" },
            ].map(n => (
              <button key={n.label} onClick={() => document.getElementById(n.target)?.scrollIntoView({ behavior: "smooth", block: "start" })} style={{
                fontSize: 14, fontWeight: 500, color: "var(--text-secondary)", background: "none",
                border: "none", cursor: "pointer", fontFamily: f, padding: 0, transition: "color 0.2s",
              }}
                onMouseEnter={e => e.currentTarget.style.color = "var(--accent)"}
                onMouseLeave={e => e.currentTarget.style.color = "var(--text-secondary)"}
              >{n.label}</button>
            ))}
            <button onClick={() => router.push("/login")} style={{
              fontSize: 13, fontWeight: 600, color: "#fff",
              background: "var(--accent)", padding: "8px 20px", borderRadius: 999,
              border: "none", cursor: "pointer", fontFamily: f, transition: "opacity 0.2s",
            }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.9"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
            >Login</button>
          </div>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section style={{ textAlign: "center", maxWidth: 900, margin: "0 auto", padding: "120px 24px 55px", position: "relative" }}>
        {/* Radial glow behind logo */}
        <div style={{
          position: "absolute", top: "30%", left: "50%", width: 700, height: 700,
          borderRadius: "50%", pointerEvents: "none",
          background: "radial-gradient(circle, rgba(29,78,216,0.12), rgba(139,92,246,0.06) 40%, transparent 70%)",
          animation: "glowPulse 4s ease-in-out infinite",
        }} />

        {/* Calligraphic Logo — centered hero image */}
        <div className="hero-logo-wrap" style={{ position: "relative", zIndex: 1, marginBottom: 32, display: "flex", justifyContent: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/nityantra-hero.png"
            alt="NitiYantra"
            style={{
              width: "clamp(300px, 55vw, 520px)",
              height: "auto",
              objectFit: "contain",
              filter: "drop-shadow(0 4px 24px rgba(0,0,0,0.08))",
            }}
          />
        </div>

        {/* Subtitle + Description */}
        <h2 className="float-in float-d3" style={{
          fontSize: 26, fontWeight: 600, color: "var(--text)",
          margin: "0 0 10px", letterSpacing: -0.5, position: "relative", zIndex: 1,
        }}>Bridging policy to people</h2>
        <p className="float-in float-d3" style={{
          fontSize: 15, color: "var(--text-secondary)", lineHeight: 1.7,
          maxWidth: 520, margin: "0 auto 32px", position: "relative", zIndex: 1,
        }}>
          NitiYantra consolidates citizen complaints across 5 districts, tracks every issue from
          submission to resolution, and gives administrators AI-driven intelligence to govern proactively.
        </p>

        {/* CTA Buttons */}
        <div className="float-in float-d4" style={{ display: "flex", gap: 13, justifyContent: "center", marginBottom: 48, position: "relative", zIndex: 1 }}>
          <button className="btn-primary" onClick={() => router.push("/dashboard")}>View Dashboard →</button>
          <button className="btn-ghost" onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}>How It Works ↓</button>
        </div>

        {/* Inline metrics */}
        <div className="float-in float-d5 metrics-card" style={{
          display: "inline-flex", alignItems: "center", gap: 0,
          background: "var(--card)", borderRadius: 16, border: "1px solid var(--border)",
          padding: "18px 8px", boxShadow: "0 4px 24px rgba(0,0,0,0.04)",
          position: "relative", zIndex: 1,
        }}>
          {[
            { label: "Complaints Tracked", value: totalComplaints, suffix: "+", color: "#1D4ED8" },
            { label: "Departments", value: 5, suffix: "", color: "#10B981" },
            { label: "Platform Uptime", value: 99, suffix: ".9%", color: "#0EA5E9" },
          ].map((m, i) => (
            <div key={m.label} style={{
              padding: "0 38px", textAlign: "center",
              borderRight: i < 2 ? "1px solid var(--border)" : "none",
            }}>
              <p style={{ fontSize: 30, fontWeight: 800, color: m.color, margin: "0 0 2px", letterSpacing: -1 }}>
                <CountUp end={m.value} suffix={m.suffix} />
              </p>
              <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0, fontWeight: 500 }}>{m.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ SHOWCASE BENTO GRID ═══ */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "55px 24px 89px" }}>
        {/* Row 1: Golden ratio 2-col */}
        <div style={{ display: "grid", gridTemplateColumns: "1.618fr 1fr", gap: 21, marginBottom: 21 }}>
          {/* Department Performance */}
          <div className="card anim-in delay-1 hover-lift" style={{ padding: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 21 }}>
              <div>
                <p style={{ fontSize: 16, fontWeight: 700, margin: "0 0 4px", color: "var(--text)" }}>Department Performance</p>
                <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>Resolution rates across departments</p>
              </div>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                fontSize: 12, fontWeight: 500, color: "#10B981",
                background: "rgba(16,185,129,0.08)", padding: "5px 14px", borderRadius: 999,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981", animation: "pulse-dot 2s ease infinite" }} />
                Live
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 13, height: 160 }}>
              {[
                { name: "PWD", pct: 72, color: "#1E293B" },
                { name: "Jal Board", pct: 88, color: "#0EA5E9" },
                { name: "DESU", pct: 55, color: "#F59E0B" },
                { name: "MCD", pct: 95, color: "#22C55E" },
                { name: "Police", pct: 68, color: "#8B5CF6" },
              ].map(b => (
                <div key={b.name} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: b.color, marginBottom: 6 }}>{b.pct}%</span>
                  <div style={{ width: "100%", height: `${b.pct}%`, background: b.color, borderRadius: "8px 8px 4px 4px", opacity: 0.85, transition: "height 0.8s ease" }} />
                  <span style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>{b.name}</span>
                </div>
              ))}
            </div>
          </div>
          {/* SLA Compliance */}
          <div className="card anim-in delay-2 hover-lift" style={{ padding: 28, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", margin: "0 0 16px", textTransform: "uppercase", letterSpacing: 0.5 }}>SLA Compliance</p>
            <div style={{ position: "relative", width: 120, height: 120, margin: "0 auto 13px" }}>
              <svg viewBox="0 0 36 36" style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--border)" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="#10B981" strokeWidth="3" strokeDasharray="97.4" strokeDashoffset="24.4" strokeLinecap="round" />
              </svg>
              <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 800, color: "#10B981" }}>75%</span>
            </div>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>Issues resolved within SLA</p>
          </div>
        </div>
        {/* Row 2: Golden ratio reversed */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.618fr", gap: 21, marginBottom: 21 }}>
          {/* Category Split */}
          <div className="card anim-in delay-3 hover-lift" style={{ padding: 28 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", margin: "0 0 16px", textTransform: "uppercase", letterSpacing: 0.5 }}>Category Split</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { cat: "Roads", pct: 28, color: "#F59E0B" },
                { cat: "Water Supply", pct: 22, color: "#06B6D4" },
                { cat: "Sanitation", pct: 20, color: "#10B981" },
                { cat: "Electricity", pct: 16, color: "#2563EB" },
                { cat: "Public Safety", pct: 14, color: "#EF4444" },
              ].map(c => (
                <div key={c.cat}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)" }}>{c.cat}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: c.color }}>{c.pct}%</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 99, background: "var(--bg)", overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 99, width: `${c.pct}%`, background: c.color, transition: "width 0.8s ease" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Recent Complaints */}
          <div className="card anim-in delay-4 hover-lift" style={{ padding: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <p style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--text)" }}>Recent Complaints</p>
              <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text-muted)", background: "var(--bg)", padding: "4px 10px", borderRadius: 999, border: "1px solid var(--border)" }}>Last 24h</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { text: "Pothole on main road Sector 62", status: "In Progress", statusColor: "#0EA5E9", cat: "Roads", catColor: "#F59E0B", time: "2h ago" },
                { text: "Water pipeline burst Block-4", status: "Escalated", statusColor: "#EF4444", cat: "Water Supply", catColor: "#06B6D4", time: "5h ago" },
                { text: "Streetlight out near metro station", status: "Pending", statusColor: "#F59E0B", cat: "Electricity", catColor: "#2563EB", time: "8h ago" },
                { text: "Garbage pile-up market road area", status: "Resolved", statusColor: "#10B981", cat: "Sanitation", catColor: "#10B981", time: "12h ago" },
              ].map((c, i) => (
                <div key={i} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "12px 14px", borderRadius: 12, background: "var(--bg)",
                  border: "1px solid var(--border)", transition: "all 0.15s",
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", margin: "0 0 4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.text}</p>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <span style={{ fontSize: 10, fontWeight: 600, color: c.catColor, background: `${c.catColor}12`, padding: "2px 8px", borderRadius: 999 }}>{c.cat}</span>
                      <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{c.time}</span>
                    </div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: c.statusColor, background: `${c.statusColor}12`, padding: "4px 10px", borderRadius: 999, whiteSpace: "nowrap" }}>{c.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Row 3: Full-width weekly trend */}
        <div className="card anim-in delay-5 hover-lift" style={{ padding: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <p style={{ fontSize: 16, fontWeight: 700, margin: "0 0 4px", color: "var(--text)" }}>Weekly Resolution Trend</p>
              <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>Complaints resolved this week</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: "var(--text)" }}>78</span>
              <span style={{ fontSize: 12, color: "#10B981", fontWeight: 600 }}>↑ 23%</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 80 }}>
            {[35, 48, 42, 62, 55, 78, 72].map((v, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ width: "100%", height: `${v}%`, background: i === 5 ? "#1D4ED8" : "rgba(29,78,216,0.18)", borderRadius: "6px 6px 3px 3px", transition: "height 0.6s ease" }} />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
              <span key={d} style={{ fontSize: 10, color: "var(--text-muted)", flex: 1, textAlign: "center" }}>{d}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section id="features" style={{ maxWidth: 1200, margin: "0 auto", padding: "89px 24px 74px" }}>
        <div className="anim-in" style={{ textAlign: "center", marginBottom: 55 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)", textTransform: "uppercase", letterSpacing: 1.5, margin: "0 0 13px" }}>How it works</p>
          <h2 style={{ fontSize: 36, fontWeight: 800, letterSpacing: -0.8, margin: "0 0 13px", color: "var(--text)" }}>From complaint to resolution</h2>
          <p style={{ fontSize: 16, color: "var(--text-secondary)", maxWidth: 480, margin: "0 auto" }}>Three intelligent layers that turn fragmented civic data into actionable governance.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 21 }}>
          {[
            { step: "01", title: "Ingest", emoji: "📥", desc: "Complaints flow in from citizen portals, WhatsApp, phone calls and email — normalized into a single structured format.", tags: ["Portal", "WhatsApp", "Email"], accent: "#1D4ED8" },
            { step: "02", title: "Analyze", emoji: "🧠", desc: "Every complaint classified by category and urgency. Similar issues clustered. Delays flagged when unresolved beyond 7 days.", tags: ["Classification", "Clustering", "Delays"], accent: "#F59E0B" },
            { step: "03", title: "Act", emoji: "📊", desc: "Department performance, issue bottlenecks, and trend data surfaced in real time — so administrators act before crises form.", tags: ["Dashboard", "Alerts", "Reports"], accent: "#10B981" },
          ].map((c, i) => (
            <div key={c.step} className={`card anim-in delay-${i + 1} hover-lift`} style={{ padding: 34, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: -16, right: -8, fontSize: 100, fontWeight: 900, color: "rgba(0,0,0,0.03)", lineHeight: 1 }}>{c.step}</div>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: `${c.accent}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, marginBottom: 16 }}>{c.emoji}</div>
              <h3 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 10px", color: "var(--text)" }}>{c.title}</h3>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7, margin: "0 0 16px" }}>{c.desc}</p>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {c.tags.map(t => (
                  <span key={t} style={{ fontSize: 11, fontWeight: 500, padding: "4px 10px", borderRadius: 999, background: `${c.accent}10`, color: c.accent }}>{t}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ DEPARTMENTS ═══ */}
      <section id="departments-section" style={{ background: "var(--card)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", padding: "89px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div className="anim-in" style={{ textAlign: "center", marginBottom: 55 }}>
            <h2 style={{ fontSize: 36, fontWeight: 800, letterSpacing: -0.8, margin: "0 0 8px", color: "var(--text)" }}>5 departments. One platform.</h2>
            <p style={{ fontSize: 16, color: "var(--text-secondary)", margin: 0 }}>Real-time tracking across the National Capital Region</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16 }}>
            {[
              { name: "PWD", short: "PW", role: "Roads & Infra", issues: 12 },
              { name: "Jal Board", short: "JB", role: "Water Supply", issues: 8 },
              { name: "DESU", short: "BS", role: "Electricity", issues: 6 },
              { name: "MCD", short: "MC", role: "Sanitation", issues: 9 },
              { name: "Delhi Police", short: "DP", role: "Public Safety", issues: 7 },
            ].map((d, i) => (
              <div key={d.name} className={`card anim-in delay-${i + 1} hover-lift`} style={{ padding: 24, textAlign: "center" }}>
                <div style={{
                  width: 52, height: 52, borderRadius: "50%", margin: "0 auto 14px",
                  background: DEPT_GRADIENTS[d.name] || "#374151",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                }}>
                  <span style={{ color: "#fff", fontSize: 16, fontWeight: 700 }}>{d.short}</span>
                </div>
                <p style={{ fontSize: 15, fontWeight: 700, margin: "0 0 2px", color: "var(--text)" }}>{d.name}</p>
                <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 12px" }}>{d.role}</p>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#EF4444", background: "rgba(239,68,68,0.08)", padding: "4px 12px", borderRadius: 999 }}>{d.issues} active</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ AI DEMO ═══ */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "89px 24px" }}>
        <div className="anim-in" style={{ textAlign: "center", marginBottom: 55 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)", textTransform: "uppercase", letterSpacing: 1.5, margin: "0 0 13px" }}>Try it live</p>
          <h2 style={{ fontSize: 36, fontWeight: 800, letterSpacing: -0.8, margin: "0 0 8px", color: "var(--text)" }}>See the AI classify a complaint</h2>
          <p style={{ fontSize: 16, color: "var(--text-secondary)", maxWidth: 460, margin: "0 auto" }}>
            Type any civic complaint and watch NitiYantra instantly categorize, score, and route it.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1.618fr 1fr", gap: 21, alignItems: "start" }}>
          <div className="card-static anim-in delay-1" style={{ padding: 28 }}>
            <textarea
              rows={5} value={classifyText}
              onChange={e => setClassifyText(e.target.value)}
              placeholder="e.g. The road near Sector 62 Noida has a massive pothole causing accidents daily..."
              style={{
                width: "100%", background: "var(--bg)", border: "1px solid var(--border)",
                borderRadius: 12, padding: "14px 16px", fontSize: 14, fontFamily: f,
                color: "var(--text)", resize: "vertical", outline: "none", boxSizing: "border-box",
                transition: "border-color 0.2s",
              }}
              onFocus={e => e.currentTarget.style.borderColor = "var(--accent)"}
              onBlur={e => e.currentTarget.style.borderColor = "var(--border)"}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 13, flexWrap: "wrap" }}>
              {SAMPLES.map(s => (
                <button key={s.label} onClick={() => setClassifyText(s.text)} style={{
                  fontSize: 12, fontWeight: 500, padding: "6px 14px", borderRadius: 999,
                  background: "var(--bg)", border: "1px solid var(--border)",
                  cursor: "pointer", fontFamily: f, color: "var(--text-secondary)", transition: "all 0.15s",
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                >{s.label}</button>
              ))}
            </div>
            <button className="btn-primary" onClick={handleClassify}
              disabled={loading || !classifyText.trim()}
              style={{ width: "100%", marginTop: 16, opacity: loading || !classifyText.trim() ? 0.5 : 1, justifyContent: "center" }}
            >
              {loading ? "Classifying..." : "Classify with AI →"}
            </button>
          </div>
          <div className="card-static anim-in delay-2" style={{ padding: 28, minHeight: 280 }}>
            {!result ? (
              <div style={{
                height: 230, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                border: "2px dashed var(--border)", borderRadius: 16, gap: 8,
              }}>
                <span style={{ fontSize: 36 }}>🤖</span>
                <p style={{ fontSize: 14, color: "var(--text-muted)", margin: 0 }}>Classification result appears here</p>
              </div>
            ) : (
              <div>
                <span style={{
                  display: "inline-block", padding: "6px 18px", borderRadius: 999,
                  fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 21,
                  background: CAT_COLORS[result.category] || "#9CA3AF",
                }}>{result.category}</span>
                <div style={{ marginBottom: 21 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Confidence</span>
                    <span style={{ fontSize: 20, fontWeight: 800, color: "var(--accent)" }}>{Math.round(result.confidence * 100)}%</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 99, background: "var(--bg)", overflow: "hidden" }}>
                    <div style={{
                      height: "100%", borderRadius: 99, background: "var(--accent)",
                      width: `${barWidth}%`, transition: "width 0.8s cubic-bezier(0.22,1,0.36,1)",
                    }} />
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                  <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Routed to</span>
                  <span style={{
                    fontSize: 14, fontWeight: 700, color: "var(--text)",
                    background: "var(--bg)", padding: "4px 14px", borderRadius: 999,
                    border: "1px solid var(--border)",
                  }}>{result.department}</span>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 500, color: "var(--text-muted)",
                  background: "var(--bg)", padding: "4px 12px", borderRadius: 999,
                  border: "1px solid var(--border)",
                }}>{result.model}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ═══ ABOUT — Golden Ratio 2-col ═══ */}
      <section id="about-section" style={{ padding: "89px 24px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "40%", left: "50%", transform: "translate(-50%,-50%)", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(29,78,216,0.04), transparent 70%)", pointerEvents: "none" }} />
        <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative", zIndex: 1 }}>
          <div className="anim-in" style={{ textAlign: "center", marginBottom: 55 }}>
            <h2 style={{ fontSize: 36, fontWeight: 800, letterSpacing: -0.8, margin: "0 0 13px", color: "var(--text)" }}>About</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1.618fr 1fr", gap: 21 }}>
            <div className="card anim-in delay-1 hover-lift" style={{ padding: 34, background: "rgba(255,255,255,0.8)", backdropFilter: "blur(12px)" }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg, rgba(29,78,216,0.1), rgba(29,78,216,0.2))", display: "flex", alignItems: "center", justifyContent: "center", color: "#1D4ED8", marginBottom: 21 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></svg>
              </div>
              <h3 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 13px", color: "var(--text)" }}>Platform Overview</h3>
              <p style={{ fontSize: 15, color: "var(--text-secondary)", lineHeight: 1.8, margin: 0 }}>
                NitiYantra is an AI-powered governance intelligence platform that consolidates citizen complaints across 5 districts and 5 departments. It transforms fragmented civic data into a unified command center, enabling administrators to track every issue from submission to resolution and improve service delivery.
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 21 }}>
              <div className="card anim-in delay-2 hover-lift" style={{ padding: 28, flex: 1, background: "rgba(255,255,255,0.8)", backdropFilter: "blur(12px)" }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg, rgba(14,165,233,0.1), rgba(14,165,233,0.2))", display: "flex", alignItems: "center", justifyContent: "center", color: "#0EA5E9", marginBottom: 16 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><path d="M7 16l4-8 4 5 5-9" /></svg>
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 8px", color: "var(--text)" }}>AI & Insights</h3>
                <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7, margin: 0 }}>Real-time visibility into complaint patterns, department performance, and SLA compliance. AI automatically categorizes, detects delays, and surfaces actionable insights.</p>
              </div>
              <div className="card anim-in delay-3 hover-lift" style={{ padding: 28, flex: 1, background: "rgba(255,255,255,0.8)", backdropFilter: "blur(12px)" }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.2))", display: "flex", alignItems: "center", justifyContent: "center", color: "#10B981", marginBottom: 16 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 8px", color: "var(--text)" }}>Impact & Vision</h3>
                <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7, margin: 0 }}>Bridging governance and ground reality. Our vision is to make civic services responsive, data-driven, and proactive across India.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ TEAM ═══ */}
      <section id="team" style={{ background: "var(--card)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", padding: "89px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div className="anim-in" style={{ textAlign: "center", marginBottom: 55 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)", textTransform: "uppercase", letterSpacing: 1.5, margin: "0 0 13px" }}>The team</p>
            <h2 style={{ fontSize: 36, fontWeight: 800, letterSpacing: -0.8, margin: "0 0 8px", color: "var(--text)" }}>Built by Bugged Bhature</h2>
            <p style={{ fontSize: 16, color: "var(--text-secondary)", maxWidth: 420, margin: "0 auto" }}>JSS University, Noida — India Innovates 2026</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 21 }}>
            {TEAM.map((t, i) => (
              <div key={t.name} className={`card anim-in delay-${i + 1} hover-lift`} style={{ padding: 28, textAlign: "center" }}>
                <div style={{
                  width: 64, height: 64, borderRadius: "50%", margin: "0 auto 16px",
                  background: t.gradient,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 6px 20px rgba(0,0,0,0.12)",
                  fontSize: 20, fontWeight: 700, color: "#fff",
                }}>{t.initials}</div>
                <p style={{ fontSize: 15, fontWeight: 700, margin: "0 0 4px", color: "var(--text)" }}>{t.name}</p>
                <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>{t.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ COVERAGE ═══ */}
      <section style={{
        background: "linear-gradient(135deg, #F8F9FB 0%, #EEF2FF 50%, #F8F9FB 100%)",
        padding: "89px 24px", borderBottom: "1px solid var(--border)",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(29,78,216,0.06), transparent 70%)", pointerEvents: "none" }} />
        <div style={{ maxWidth: 1200, margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}>
          <p className="anim-in" style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)", textTransform: "uppercase", letterSpacing: 1.5, margin: "0 0 13px" }}>Coverage</p>
          <h2 className="anim-in delay-1" style={{ fontSize: 36, fontWeight: 800, letterSpacing: -0.8, margin: "0 0 8px", color: "var(--text)" }}>Across the National Capital Region</h2>
          <p className="anim-in delay-2" style={{ fontSize: 16, color: "var(--text-secondary)", margin: "0 auto 34px", maxWidth: 440 }}>Unified civic intelligence spanning 5 districts, 5 departments, and millions of citizens.</p>
          <div className="anim-in delay-3" style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap", marginBottom: 55 }}>
            {["Noida", "Ghaziabad", "Delhi", "Gurugram", "Faridabad"].map(d => (
              <span key={d} className="hover-lift" style={{
                fontSize: 15, fontWeight: 600, color: "var(--text)",
                background: "var(--card)", padding: "14px 34px", borderRadius: 999,
                boxShadow: "var(--shadow-card)", border: "1px solid var(--border)", cursor: "default",
              }}>{d}</span>
            ))}
          </div>
          <div className="anim-in delay-4" style={{ display: "flex", justifyContent: "center", gap: 34, flexWrap: "wrap" }}>
            {[
              { label: "Uptime", value: "99.9%" },
              { label: "Avg Response", value: "< 200ms" },
              { label: "Data Points", value: "500+" },
              { label: "API Endpoints", value: "12" },
            ].map(s => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <p style={{ fontSize: 22, fontWeight: 800, color: "var(--accent)", margin: "0 0 4px" }}>{s.value}</p>
                <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ DARK CTA ═══ */}
      <section style={{ background: "#0B0B0C", color: "#fff", padding: "89px 24px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.04,
          backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }} />
        <div style={{ position: "absolute", top: "30%", left: "20%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(29,78,216,0.08), transparent 70%)", pointerEvents: "none" }} />
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "1.618fr 1fr", gap: 55, alignItems: "center", position: "relative", zIndex: 1 }}>
          <div className="anim-in">
            <p style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)", textTransform: "uppercase", letterSpacing: 1.5, margin: "0 0 16px" }}>Ready to explore?</p>
            <h2 style={{ fontSize: 48, fontWeight: 800, letterSpacing: -1.5, margin: "0 0 21px", lineHeight: 1.1 }}>
              Governance<br />intelligence,<br />live right now.
            </h2>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.55)", lineHeight: 1.7, margin: "0 0 34px", maxWidth: 400 }}>
              NitiYantra is deployed with real civic data — {totalComplaints} complaints across 5 departments.
              No setup. No demo data. The real thing.
            </p>
            <div style={{ display: "flex", gap: 13, marginBottom: 34 }}>
              <button onClick={() => router.push("/dashboard")} style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "14px 28px", background: "#fff", color: "#0B0B0C",
                borderRadius: 999, fontSize: 14, fontWeight: 600, border: "none",
                cursor: "pointer", transition: "transform 0.2s, opacity 0.2s", fontFamily: f,
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.02)"; e.currentTarget.style.opacity = "0.9"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.opacity = "1"; }}
              >Open Dashboard →</button>
              <button onClick={() => window.open(`${API}/docs`, "_blank")} style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "14px 28px", background: "transparent", color: "#fff",
                borderRadius: 999, fontSize: 14, fontWeight: 500,
                border: "1px solid rgba(255,255,255,0.2)",
                cursor: "pointer", transition: "all 0.2s", fontFamily: f,
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.5)"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"}
              >API Docs</button>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["Next.js", "FastAPI", "PostgreSQL", "Gemini AI", "Render"].map(t => (
                <span key={t} style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.45)", padding: "5px 12px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.1)" }}>{t}</span>
              ))}
            </div>
          </div>
          <div className="anim-in delay-2">
            <div style={{ background: "#fff", borderRadius: 20, padding: 34, boxShadow: "0 24px 64px rgba(0,0,0,0.4)", color: "#0A0A0A" }}>
              <p style={{ fontSize: 16, fontWeight: 700, margin: "0 0 21px" }}>Quick Access</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
                {[
                  { label: "Command Center", desc: "Live complaints & analytics", path: "/dashboard" },
                  { label: "AI Classifier", desc: "Classification engine", path: "/ai-pipeline" },
                  { label: "Geographic Monitor", desc: "District-level visualization", path: "/heatmap" },
                  { label: "Decision Extractor", desc: "Meeting transcript AI", path: "/meetings" },
                ].map(l => (
                  <button key={l.label} onClick={() => router.push(l.path)} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "14px 16px", borderRadius: 14, background: "#F8F9FB",
                    border: "1px solid rgba(0,0,0,0.06)", cursor: "pointer",
                    fontFamily: f, textAlign: "left", transition: "all 0.15s", width: "100%",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = "#EEF2FF"; e.currentTarget.style.borderColor = "var(--accent)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "#F8F9FB"; e.currentTarget.style.borderColor = "rgba(0,0,0,0.06)"; }}
                  >
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600, margin: "0 0 2px", color: "var(--text)" }}>{l.label}</p>
                      <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>{l.desc}</p>
                    </div>
                    <span style={{ fontSize: 16, color: "var(--text-muted)" }}>→</span>
                  </button>
                ))}
              </div>
              <div style={{ marginTop: 21, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-muted)", background: "#F8F9FB", padding: "6px 14px", borderRadius: 999, border: "1px solid rgba(0,0,0,0.06)" }}>Login: admin / admin123</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-muted)", background: "#F8F9FB", padding: "6px 14px", borderRadius: 999, border: "1px solid rgba(0,0,0,0.06)" }}>API: /docs</span>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
