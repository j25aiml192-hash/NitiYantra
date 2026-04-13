"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { fetchPerformance } from "@/lib/api";

interface DeptPerformance {
  department_name: string;
  head: string;
  total_issues: number;
  resolved_issues: number;
  delayed_issues: number;
  active_issues: number;
  avg_resolution_days: number;
}

type SortField = "name" | "score" | "active" | "resolved" | "avgDays";
type ViewMode = "grid" | "table" | "list";

interface DeptTheme { bg: string; text: string; border: string; light: string; ring: string; gradient: string; bar: string; }

const DEPT_THEMES: Record<string, DeptTheme> = {
  "PWD":            { bg: "#fef9ee", text: "#b45309", border: "#fde68a", light: "#fffbeb", ring: "#d97706", gradient: "linear-gradient(135deg, #f59e0b, #d97706)", bar: "#f59e0b" },
  "Jal Board":      { bg: "#eefbf4", text: "#047857", border: "#a7f3d0", light: "#ecfdf5", ring: "#059669", gradient: "linear-gradient(135deg, #10b981, #059669)", bar: "#10b981" },
  "DESU":           { bg: "#fefce8", text: "#a16207", border: "#fef08a", light: "#fefce8", ring: "#ca8a04", gradient: "linear-gradient(135deg, #eab308, #ca8a04)", bar: "#eab308" },
  "MCD":            { bg: "#effefb", text: "#0f766e", border: "#99f6e4", light: "#f0fdfa", ring: "#0d9488", gradient: "linear-gradient(135deg, #14b8a6, #0d9488)", bar: "#14b8a6" },
  "Delhi Police":   { bg: "#fff1f2", text: "#e11d48", border: "#fecdd3", light: "#fff1f2", ring: "#e11d48", gradient: "linear-gradient(135deg, #f43f5e, #e11d48)", bar: "#f43f5e" },
  "Traffic Police":  { bg: "#faf5ff", text: "#7c3aed", border: "#e9d5ff", light: "#faf5ff", ring: "#7c3aed", gradient: "linear-gradient(135deg, #8b5cf6, #7c3aed)", bar: "#8b5cf6" },
  "Fire Department": { bg: "#fff7ed", text: "#c2410c", border: "#fed7aa", light: "#fff7ed", ring: "#ea580c", gradient: "linear-gradient(135deg, #f97316, #ea580c)", bar: "#f97316" },
};
const DEFAULT_THEME: DeptTheme = { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe", light: "#eff6ff", ring: "#3b82f6", gradient: "linear-gradient(135deg, #3b82f6, #2563eb)", bar: "#3b82f6" };
function getDeptTheme(name: string): DeptTheme { return DEPT_THEMES[name] || DEFAULT_THEME; }

const DEPT_CONTACTS: Record<string, { email: string; phone: string; address: string }> = {
  "PWD": { email: "pwd@delhi.gov.in", phone: "011-2338-1762", address: "MSO Building, IP Estate, New Delhi" },
  "Jal Board": { email: "ceo@djb.gov.in", phone: "011-2369-8381", address: "Varunalaya, Jhandewalan, New Delhi" },
  "DESU": { email: "support@desudelhi.com", phone: "1800-102-7377", address: "DESU Bhawan, Nehru Place, New Delhi" },
  "MCD": { email: "commissioner@mcd.gov.in", phone: "011-2324-3401", address: "MCD Civic Centre, Minto Road, New Delhi" },
  "Delhi Police": { email: "cp@delhipolice.gov.in", phone: "011-2301-4551", address: "Police HQ, ITO, New Delhi" },
  "Traffic Police": { email: "traffic@delhipolice.gov.in", phone: "011-2584-4444", address: "Traffic HQ, Todapur, New Delhi" },
  "Fire Department": { email: "dfs@delhi.gov.in", phone: "011-2341-4000", address: "Fire Station HQ, Connaught Place, New Delhi" },
};

function getGrade(score: number, theme: DeptTheme) {
  if (score >= 70) return { label: score >= 85 ? "A+" : "A", color: theme.text, bg: theme.bg, border: theme.border };
  if (score >= 40) return { label: score >= 55 ? "B" : "C", color: theme.text, bg: theme.bg, border: theme.border };
  return { label: "D", color: theme.text, bg: theme.bg, border: theme.border };
}

function getStatusDot(score: number) {
  if (score > 70) return { color: "#22c55e", label: "Good" };
  if (score >= 40) return { color: "#f59e0b", label: "Warning" };
  return { color: "#ef4444", label: "Critical" };
}

function getTrend(resRate: number) {
  if (resRate > 60) return { icon: "↗", label: "Improving", color: "#22c55e" };
  if (resRate > 30) return { icon: "→", label: "Stable", color: "#f59e0b" };
  return { icon: "↘", label: "Declining", color: "#ef4444" };
}

function ScoreRing({ score, size = 56, ringColor }: { score: number; size?: number; ringColor: string }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border)" strokeWidth={3} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={ringColor} strokeWidth={3} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={offset} style={{ transition: "stroke-dashoffset 1s ease-out", opacity: 0.8 }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold" style={{ color: ringColor }}>{score}%</span>
      </div>
    </div>
  );
}


function DeptSkeleton() {
  return (
    <div className="rounded-2xl border border-[var(--border)] p-6 animate-pulse" style={{ background: "#FFFFF8" }}>
      <div className="flex justify-between mb-6">
        <div><div className="h-5 w-32 rounded-lg mb-2" style={{ background: "#f5f0e0" }} /><div className="h-3 w-24 rounded-lg" style={{ background: "#f0ead6" }} /></div>
        <div className="w-14 h-14 rounded-full" style={{ background: "#f0ead6" }} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="h-16 rounded-xl" style={{ background: "#faf5e4" }} />
        <div className="h-16 rounded-xl" style={{ background: "#faf5e4" }} />
        <div className="h-16 rounded-xl" style={{ background: "#faf5e4" }} />
      </div>
    </div>
  );
}

function DeptDetailModal({ dept, score, onClose }: { dept: DeptPerformance; score: number; onClose: () => void }) {
  const theme = getDeptTheme(dept.department_name);
  const grade = getGrade(score, theme);
  const resRate = dept.total_issues > 0 ? Math.round((dept.resolved_issues / dept.total_issues) * 100) : 0;
  const delayRate = dept.total_issues > 0 ? Math.round((dept.delayed_issues / dept.total_issues) * 100) : 0;
  const contact = DEPT_CONTACTS[dept.department_name];
  const trend = getTrend(resRate);
  const router = useRouter();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" />
      <div className="relative bg-[var(--card)] rounded-3xl border border-[var(--border)] shadow-2xl w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()} style={{ animation: "deptModalIn 0.3s ease-out" }}>
        <div className="px-6 pt-6 pb-8 text-white relative" style={{ background: theme.gradient }}>
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors cursor-pointer">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-xl font-black">{dept.department_name.charAt(0)}</div>
            <div><h2 className="text-xl font-bold">{dept.department_name}</h2><p className="text-white/70 text-sm">Head: {dept.head}</p></div>
          </div>
        </div>
        <div className="flex justify-center -mt-7">
          <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] shadow-lg px-8 py-4 flex items-center gap-6">
            <ScoreRing score={score} size={52} ringColor={theme.ring} />
            <div className="flex flex-col">
              <span className="text-xl font-black leading-tight" style={{ color: theme.text }}>Grade {grade.label}</span>
              <p className="text-xs text-[var(--text-muted)] font-medium mt-0.5">Performance Score</p>
            </div>
          </div>
        </div>
        <div className="px-6 pt-5 pb-6 space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: theme.light, borderColor: theme.border }}>
            <span className="text-lg">{trend.icon}</span>
            <span className="text-sm font-semibold" style={{ color: trend.color }}>{trend.label}</span>
            <span className="text-xs text-[var(--text-muted)]">Performance Trend</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[{ label: "Total Issues", value: dept.total_issues },{ label: "Resolved", value: dept.resolved_issues },{ label: "Active", value: dept.active_issues },{ label: "Delayed", value: dept.delayed_issues }].map((m) => (
              <div key={m.label} className="rounded-xl border p-3.5" style={{ background: theme.light, borderColor: theme.border }}>
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: theme.text, opacity: 0.7 }}>{m.label}</span>
                <p className="text-2xl font-black text-[var(--text)] mt-1">{m.value}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border p-4 space-y-3" style={{ background: theme.light, borderColor: theme.border }}>
            <div><div className="flex justify-between text-xs mb-1.5"><span className="font-medium text-[var(--text-secondary)]">Resolution Rate</span><span className="font-bold" style={{ color: theme.text }}>{resRate}%</span></div>
              <div className="h-2 rounded-full bg-slate-200 overflow-hidden"><div className="h-full rounded-full transition-all duration-700" style={{ width: `${resRate}%`, background: theme.bar, opacity: 0.8 }} /></div></div>
            <div><div className="flex justify-between text-xs mb-1.5"><span className="font-medium text-[var(--text-secondary)]">Delay Rate</span><span className="font-bold" style={{ color: theme.text, opacity: 0.6 }}>{delayRate}%</span></div>
              <div className="h-2 rounded-full bg-slate-200 overflow-hidden"><div className="h-full rounded-full transition-all duration-700" style={{ width: `${delayRate}%`, background: theme.bar, opacity: 0.5 }} /></div></div>
            <div className="flex justify-between items-center pt-2 border-t" style={{ borderColor: theme.border }}>
              <span className="text-xs font-medium text-[var(--text-secondary)]">Avg Resolution Time</span>
              <span className="text-sm font-bold" style={{ color: theme.text }}>{dept.avg_resolution_days.toFixed(1)} days</span>
            </div>
          </div>
          {contact && (
            <div className="rounded-xl border p-4 space-y-2" style={{ background: theme.light, borderColor: theme.border }}>
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: theme.text }}>Contact Information</p>
              <div className="space-y-1.5 text-xs text-[var(--text-secondary)]">
                <div className="flex items-center gap-2"><svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>{contact.email}</div>
                <div className="flex items-center gap-2"><svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>{contact.phone}</div>
                <div className="flex items-center gap-2"><svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>{contact.address}</div>
              </div>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button onClick={() => { onClose(); router.push("/issues"); }} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer transition-all hover:opacity-90" style={{ background: theme.gradient }}>View All Issues</button>
            {contact && <a href={`mailto:${contact.email}`} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-center border-2 cursor-pointer transition-all hover:shadow-md" style={{ color: theme.text, borderColor: theme.border }}>Contact Dept</a>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════ */
/*  MAIN PAGE                              */
/* ═══════════════════════════════════════ */
export default function DepartmentsPage() {
  const router = useRouter();
  const [performance, setPerformance] = useState<DeptPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>("score");
  const [sortAsc, setSortAsc] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState<DeptPerformance | null>(null);
  const [gradeFilter, setGradeFilter] = useState("All");

  const loadData = useCallback(async () => {
    try { const p = await fetchPerformance(); setPerformance(Array.isArray(p) ? p : []); }
    catch { router.push("/login"); }
    finally { setLoading(false); }
  }, [router]);

  useEffect(() => { loadData(); }, [loadData]);

  const withScores = useMemo(() =>
    performance.map((d) => ({ ...d, score: Math.round(Math.min((d.resolved_issues / (d.active_issues + 1)) * 100, 100)) })),
    [performance]
  );

  const sorted = useMemo(() => {
    let data = withScores;
    if (searchQuery.trim()) { const q = searchQuery.toLowerCase(); data = data.filter((d) => d.department_name.toLowerCase().includes(q) || d.head.toLowerCase().includes(q)); }
    if (gradeFilter !== "All") { data = data.filter((d) => { const g = getGrade(d.score, getDeptTheme(d.department_name)); return g.label === gradeFilter; }); }
    const dir = sortAsc ? 1 : -1;
    return [...data].sort((a, b) => {
      switch (sortField) {
        case "name": return dir * a.department_name.localeCompare(b.department_name);
        case "score": return dir * (a.score - b.score);
        case "active": return dir * (a.active_issues - b.active_issues);
        case "resolved": return dir * (a.resolved_issues - b.resolved_issues);
        case "avgDays": return dir * (a.avg_resolution_days - b.avg_resolution_days);
        default: return 0;
      }
    });
  }, [withScores, sortField, sortAsc, searchQuery, gradeFilter]);

  const agg = useMemo(() => {
    const total = performance.reduce((s, d) => s + d.total_issues, 0);
    const resolved = performance.reduce((s, d) => s + d.resolved_issues, 0);
    const active = performance.reduce((s, d) => s + d.active_issues, 0);
    const delayed = performance.reduce((s, d) => s + d.delayed_issues, 0);
    const avgDays = performance.length > 0 ? performance.reduce((s, d) => s + d.avg_resolution_days, 0) / performance.length : 0;
    return { total, resolved, active, delayed, avgDays };
  }, [performance]);

  const toggleSort = (field: SortField) => { if (sortField === field) setSortAsc(!sortAsc); else { setSortField(field); setSortAsc(false); } };

  const selectedScore = selectedDept ? Math.round(Math.min((selectedDept.resolved_issues / (selectedDept.active_issues + 1)) * 100, 100)) : 0;

  const STAT_ICONS = [
    <svg key="t" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
    <svg key="r" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    <svg key="a" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    <svg key="d" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>,
    <svg key="av" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <style>{`
        @keyframes deptFadeIn { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes deptModalIn { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }
      `}</style>
      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* ── Hero Banner ── */}
        <div className="rounded-3xl px-8 py-10 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed, #6d28d9)" }}>
          <div className="absolute top-0 right-0 w-72 h-72 opacity-10 pointer-events-none">
            <svg viewBox="0 0 200 200" fill="none"><circle cx="100" cy="100" r="80" stroke="white" strokeWidth="1" /><circle cx="100" cy="100" r="60" stroke="white" strokeWidth="0.5" /><circle cx="100" cy="100" r="40" stroke="white" strokeWidth="0.5" />
              {[0,45,90,135,180,225,270,315].map(a=><circle key={a} cx={100+60*Math.cos(a*Math.PI/180)} cy={100+60*Math.sin(a*Math.PI/180)} r="3" fill="white"/>)}</svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Department Directory</h1>
          <p className="text-white/70 text-sm max-w-lg">Monitor performance, resolution rates, and accountability across all government departments</p>
        </div>

        {/* ── Aggregate Stats (overlapping hero) ── */}
        {!loading && performance.length > 0 && (
          <div className="-mt-12 relative z-10">
            <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] shadow-lg p-4">
              <div className="flex gap-3 overflow-x-auto">
                {[
                  { label: "Total Issues", val: agg.total, tint: "#e0e7ff" },
                  { label: "Resolved", val: agg.resolved, tint: "#d1fae5" },
                  { label: "Active", val: agg.active, tint: "#fef3c7" },
                  { label: "Delayed", val: agg.delayed, tint: "#fee2e2" },
                  { label: "Avg Days", val: agg.avgDays.toFixed(1), tint: "#e0e7ff" },
                ].map((s, i) => (
                  <div key={s.label} className="flex-1 min-w-[140px] rounded-xl p-4 flex items-center gap-3 transition-all hover:scale-[1.02] hover:shadow-md cursor-default" style={{ background: s.tint }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "white" }}>{STAT_ICONS[i]}</div>
                    <div><p className="text-xl font-black text-[var(--text)]">{s.val}</p><p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">{s.label}</p></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Toolbar ── */}
        {!loading && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search departments or heads..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--border)] text-sm text-[var(--text-secondary)] bg-[var(--card)]/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all shadow-sm" />
            </div>
            <select value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-[var(--border)] text-xs font-semibold text-[var(--text-secondary)] bg-[var(--card)] cursor-pointer focus:outline-none">
              {["All","A+","A","B","C","D"].map(g => <option key={g} value={g}>{g === "All" ? "All Grades" : `Grade ${g}`}</option>)}
            </select>
            <div className="flex items-center bg-[var(--card)] rounded-xl border border-[var(--border)] shadow-sm overflow-hidden">
              {([{ field: "score" as SortField, label: "Score" },{ field: "active" as SortField, label: "Active" },{ field: "resolved" as SortField, label: "Resolved" },{ field: "avgDays" as SortField, label: "Avg Days" },{ field: "name" as SortField, label: "A-Z" }]).map((s) => (
                <button key={s.field} onClick={() => toggleSort(s.field)} className={`px-3 py-2 text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer ${sortField === s.field ? "bg-indigo-50 text-indigo-700" : "text-[var(--text-muted)] hover:bg-[var(--bg)]"}`}>
                  {s.label}{sortField === s.field && <svg className={`w-3 h-3 transition-transform ${sortAsc ? "" : "rotate-180"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>}
                </button>
              ))}
            </div>
            <div className="flex items-center bg-[var(--card)] rounded-xl border border-[var(--border)] shadow-sm overflow-hidden">
              {(["grid","list","table"] as ViewMode[]).map((m) => (
                <button key={m} onClick={() => setViewMode(m)} className={`p-2.5 transition-colors cursor-pointer ${viewMode === m ? "bg-indigo-50 text-indigo-600" : "text-[var(--text-muted)] hover:bg-[var(--bg)]"}`} title={`${m} view`}>
                  {m === "grid" && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>}
                  {m === "list" && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>}
                  {m === "table" && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M3 6h18M3 18h18M10 6v12M17 6v12" /></svg>}
                </button>
              ))}
            </div>
            <span className="text-[11px] font-semibold text-[var(--text-muted)] px-2">Showing {sorted.length} of {withScores.length}</span>
          </div>
        )}

        {/* ── Loading ── */}
        {loading && <div className="grid grid-cols-1 md:grid-cols-2 gap-5">{[1,2,3,4,5,6].map((i) => <DeptSkeleton key={i} />)}</div>}

        {/* ── No results ── */}
        {!loading && sorted.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[var(--border)] flex items-center justify-center mb-4"><svg className="w-8 h-8 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg></div>
            <p className="text-sm font-semibold text-[var(--text-secondary)]">No departments found</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Try adjusting your search or filter</p>
          </div>
        )}

        {/* ── Grid View ── */}
        {!loading && sorted.length > 0 && viewMode === "grid" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {sorted.map((d, idx) => {
              const theme = getDeptTheme(d.department_name);
              const grade = getGrade(d.score, theme);
              const status = getStatusDot(d.score);
              const resRate = d.total_issues > 0 ? Math.round((d.resolved_issues / d.total_issues) * 100) : 0;

              return (
                <div key={d.department_name} onClick={() => setSelectedDept(d)}
                  className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 cursor-pointer shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg group"
                  style={{ animation: `deptFadeIn 0.4s ease-out ${idx * 0.06}s both` }}>

                  {/* Top row: Icon + Name | ScoreRing */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ background: theme.text }}>
                        {d.department_name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base font-semibold text-[var(--text)] truncate">{d.department_name}</h3>
                        <p className="text-xs text-[var(--text-muted)] truncate">{d.head}</p>
                      </div>
                    </div>
                    <ScoreRing score={d.score} size={44} ringColor={theme.ring} />
                  </div>

                  {/* Grade + Status */}
                  <div className="flex items-center gap-2 mt-3">
                    <span className="px-2 py-0.5 rounded-lg text-xs font-bold" style={{ color: theme.text, background: theme.light }}>{grade.label}</span>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: status.color }} />
                      <span className="text-xs text-[var(--text-muted)]">{status.label}</span>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    {[
                      { label: "Active", value: d.active_issues },
                      { label: "Resolved", value: d.resolved_issues },
                      { label: "Delayed", value: d.delayed_issues },
                    ].map((stat) => (
                      <div key={stat.label} className="bg-[var(--bg)] rounded-lg px-3 py-2.5 text-center">
                        <p className="text-lg font-bold text-[var(--text)]">{stat.value}</p>
                        <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{stat.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Resolution Bar */}
                  <div className="mt-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[var(--text-muted)]">Resolution</span>
                      <span className="font-semibold" style={{ color: theme.text }}>{resRate}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${resRate}%`, background: theme.bar }} />
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--border)]">
                    <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      Avg: {d.avg_resolution_days.toFixed(1)} days
                    </span>
                    <span className="text-xs font-medium cursor-pointer group-hover:underline" style={{ color: theme.text }}>Details →</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── List View ── */}
        {!loading && sorted.length > 0 && viewMode === "list" && (
          <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden divide-y divide-[var(--border)]">
            {sorted.map((d, idx) => {
              const theme = getDeptTheme(d.department_name);
              return (
                <div key={d.department_name} onClick={() => setSelectedDept(d)}
                  className="flex items-center gap-4 px-5 py-3 cursor-pointer transition-all hover:shadow-sm"
                  style={{ animation: `deptFadeIn 0.3s ease-out ${idx * 0.05}s both`, background: idx % 2 === 0 ? "transparent" : "var(--bg)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = theme.light; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = idx % 2 === 0 ? "transparent" : "var(--bg)"; }}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: theme.gradient }}>{d.department_name.charAt(0)}</div>
                  <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-[var(--text)] truncate">{d.department_name}</p><p className="text-[10px] text-[var(--text-muted)] truncate">{d.head}</p></div>
                  <ScoreRing score={d.score} size={36} ringColor={theme.ring} />
                  <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
                    <span><b style={{ color: theme.text }}>{d.active_issues}</b> active</span>
                    <span><b style={{ color: theme.text }}>{d.resolved_issues}</b> resolved</span>
                    <span><b style={{ color: theme.text }}>{d.delayed_issues}</b> delayed</span>
                  </div>
                  <span className="text-xs font-semibold text-[var(--text-secondary)] w-16 text-right">{d.avg_resolution_days.toFixed(1)}d</span>
                  <button className="text-[11px] font-semibold px-3 py-1.5 rounded-lg border cursor-pointer transition-colors hover:shadow-sm" style={{ color: theme.text, borderColor: theme.border, background: theme.light }}>View</button>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Table View ── */}
        {!loading && sorted.length > 0 && viewMode === "table" && (
          <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b border-[var(--border)]" style={{ background: "var(--bg)" }}>
                  {[{ label: "Department", field: "name" as SortField },{ label: "Score", field: "score" as SortField },{ label: "Grade", field: "score" as SortField },{ label: "Active", field: "active" as SortField },{ label: "Resolved", field: "resolved" as SortField },{ label: "Delayed", field: "active" as SortField },{ label: "Res. Rate", field: "resolved" as SortField },{ label: "Avg Days", field: "avgDays" as SortField }].map((col) => (
                    <th key={col.label} onClick={() => toggleSort(col.field)} className="text-left text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider px-4 py-3 cursor-pointer hover:text-indigo-600 transition-colors select-none sticky top-0" style={{ background: "var(--bg)" }}>
                      <span className="flex items-center gap-1">{col.label}{sortField === col.field && <svg className={`w-3 h-3 ${sortAsc ? "" : "rotate-180"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>}</span>
                    </th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {sorted.map((d) => {
                    const theme = getDeptTheme(d.department_name); const grade = getGrade(d.score, theme);
                    const resRate = d.total_issues > 0 ? Math.round((d.resolved_issues / d.total_issues) * 100) : 0;
                    return (
                      <tr key={d.department_name} onClick={() => setSelectedDept(d)} className="cursor-pointer transition-colors"
                        onMouseEnter={(e) => { e.currentTarget.style.background = theme.light; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                        <td className="px-4 py-3.5"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: theme.gradient }}>{d.department_name.charAt(0)}</div><div><p className="text-sm font-semibold text-[var(--text)]">{d.department_name}</p><p className="text-[10px] text-[var(--text-muted)]">{d.head}</p></div></div></td>
                        <td className="px-4 py-3.5"><ScoreRing score={d.score} size={36} ringColor={theme.ring} /></td>
                        <td className="px-4 py-3.5"><span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ color: theme.text, background: theme.bg }}>{grade.label}</span></td>
                        <td className="px-4 py-3.5"><span className="text-sm font-bold" style={{ color: theme.text }}>{d.active_issues}</span></td>
                        <td className="px-4 py-3.5"><span className="text-sm font-bold" style={{ color: theme.text }}>{d.resolved_issues}</span></td>
                        <td className="px-4 py-3.5"><span className="text-sm font-bold" style={{ color: d.delayed_issues > 0 ? theme.text : "#94a3b8", opacity: d.delayed_issues > 0 ? 0.7 : 1 }}>{d.delayed_issues}</span></td>
                        <td className="px-4 py-3.5"><span className="text-sm font-semibold" style={{ color: theme.text }}>{resRate}%</span></td>
                        <td className="px-4 py-3.5"><span className="text-sm font-semibold text-[var(--text-secondary)]">{d.avg_resolution_days.toFixed(1)}d</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
      {selectedDept && <DeptDetailModal dept={selectedDept} score={selectedScore} onClose={() => setSelectedDept(null)} />}
    </div>
  );
}
