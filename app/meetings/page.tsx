"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "https://nityantra-backend.onrender.com";

/* ── Types ── */
interface Decision {
  action: string;
  department: string;
  deadline: string;
  priority: "High" | "Medium" | "Low";
  status: string;
}

/* ── Sample transcripts ── */
const SAMPLES: Record<string, string> = {
  "Infrastructure Review": `The Infrastructure Review Committee met on March 20, 2026 to discuss pending civic issues. The chair directed PWD to complete pothole repair work on the main highway connecting Sector 62 and Sector 63 in Noida by April 10. DESU was instructed to resolve the transformer overload issue in Block B, Ghaziabad within 5 working days as residents have reported frequent power cuts. MCD was asked to deploy additional sanitation workers in Gurugram's Sector 14 market area where garbage accumulation has been reported repeatedly. The committee noted that Jal Board's pipeline replacement project in Faridabad is behind schedule by 3 weeks and directed them to submit a revised timeline by next Monday. Delhi Police was asked to increase night patrolling near the new metro construction site following reports of theft.`,

  "Public Safety Meeting": `Public Safety Review meeting held on March 22, 2026. Delhi Police reported a 15% increase in theft cases near construction sites in South Delhi. The DCP was directed to deploy additional patrol units by this weekend. Traffic Police to install speed breakers near the school zone in Noida Sector 44 within 10 days following a near-miss accident last week. MCD to repair broken streetlights on the main road between Ghaziabad and Noida border — deadline April 5. Fire department to conduct safety audits of all commercial buildings in Gurugram's Cyber City area by end of month. A special task force to be formed for addressing eve-teasing complaints near Faridabad's NIT area metro station.`,

  "Water Crisis Discussion": `Emergency meeting on water supply disruption held March 24, 2026. Jal Board reported main pipeline burst in Ghaziabad affecting 15,000 households. Immediate repair ordered — target completion within 48 hours. PWD to coordinate with Jal Board for road restoration after pipeline work. DESU to ensure uninterrupted power supply to water pumping stations in Noida and Faridabad during summer months — submit contingency plan by April 1. MCD to set up temporary water tanker distribution points in affected Ghaziabad areas starting tomorrow morning. Delhi Jal Board to share daily status updates with the monitoring cell until crisis is resolved. Gurugram's water recycling plant Phase 2 approval to be fast-tracked — submit proposal by April 15.`,
};

/* ── Priority styling ── */
const PRIORITY_COLORS: Record<string, { bg: string; text: string; bar: string }> = {
  High:   { bg: "bg-red-100",     text: "text-red-600",     bar: "bg-red-500" },
  Medium: { bg: "bg-amber-100",   text: "text-amber-600",   bar: "bg-amber-500" },
  Low:    { bg: "bg-emerald-100", text: "text-emerald-600", bar: "bg-emerald-500" },
};



export default function MeetingTrackerPage() {
  const router = useRouter();
  const [transcript, setTranscript] = useState("");
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [noted, setNoted] = useState<Set<number>>(new Set());
  const [extracted, setExtracted] = useState(false);
  const [progress, setProgress] = useState(0);

  const [highlightSources, setHighlightSources] = useState(false);
  const [copiedCSV, setCopiedCSV] = useState(false);

  /* ── Transcript stats ── */
  const wordCount = useMemo(() => transcript.trim() ? transcript.trim().split(/\s+/).length : 0, [transcript]);



  const handleExtract = useCallback(async () => {
    if (!transcript.trim() || loading) return;
    setLoading(true);
    setError("");
    setDecisions([]);
    setNoted(new Set());
    setExtracted(false);

    setProgress(0);

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) { clearInterval(progressInterval); return 90; }
        return prev + Math.random() * 15;
      });
    }, 400);

    try {
      const res = await fetch(`${API}/ai/extract-decisions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();

      if (data.error) {
        setError(data.error);
        setDecisions([]);
      } else {
        setDecisions(data.decisions || []);
      }
      setExtracted(true);
    } catch {
      setError("Failed to extract decisions. Please try again.");
    }
    clearInterval(progressInterval);
    setProgress(100);
    setTimeout(() => setProgress(0), 500);
    setLoading(false);
  }, [transcript, loading]);

  const toggleNoted = (i: number) => {
    setNoted((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const handleExportCSV = () => {
    if (!decisions.length) return;
    const header = "Action,Department,Deadline,Priority,Status\n";
    const rows = decisions
      .map((d, i) =>
        `"${d.action}","${d.department}","${d.deadline}","${d.priority}","${noted.has(i) ? "Noted" : "Pending"}"`
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "meeting_decisions.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyToClipboard = async () => {
    if (!decisions.length) return;
    const text = decisions
      .map((d, i) => `${i + 1}. [${d.priority}] ${d.action}\n   Dept: ${d.department} | Deadline: ${d.deadline} | Status: ${noted.has(i) ? "Noted" : "Pending"}`)
      .join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCSV(true);
      setTimeout(() => setCopiedCSV(false), 2000);
    } catch { /* fallback */ }
  };

  const handleClear = () => {
    setTranscript("");
    setDecisions([]);
    setNoted(new Set());
    setExtracted(false);
    setError("");

  };

  void router;

  return (
    <div className="min-h-screen bg-transparent p-6">
      {/* Page Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-semibold text-slate-900">
            Decision Extractor
          </h1>
          <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100">
            AI Powered
          </span>
        </div>
        <p className="text-sm text-slate-600">
          Paste any meeting transcript and our AI will extract action items, deadlines, and responsibilities
        </p>
      </div>

      {/* Animated split layout */}
      <div className={`max-w-7xl mx-auto flex gap-6 items-start transition-all duration-700 ${extracted ? '' : 'justify-center'}`} style={{ transitionTimingFunction: 'cubic-bezier(0.22,1,0.36,1)' }}>

        {/* ─────────── LEFT — Input Panel (centered → half on extract) ─────────── */}
        <div className={`transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${extracted ? 'w-1/2' : 'w-full max-w-2xl'}`}>
        <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-5 shadow-sm space-y-4">

          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--text)]">
              Meeting Transcript
            </h2>
            <span className={`text-xs px-3 py-1 rounded-full ${
              transcript.trim()
                ? "bg-green-100 text-green-600"
                : "bg-[var(--border)] text-[var(--text-muted)]"
            }`}>
              {transcript.trim() ? "Ready for analysis" : "Awaiting input"}
            </span>
          </div>

          {/* Word count */}
          {transcript.trim() && (
            <div className="flex items-center gap-3 text-[10px] text-[var(--text-muted)] font-medium">
              <span>{wordCount} words</span>
              <span className="w-1 h-1 rounded-full bg-slate-300" />
              <span>{transcript.length.toLocaleString()} chars</span>
            </div>
          )}

          {/* Transcript Input */}
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            className="w-full h-32 p-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300 resize-vertical transition-all"
            placeholder={`Paste meeting transcript...\n\nExample:\nThe committee discussed the pending road repair work in Sector 62, Noida. PWD was directed to complete pothole repair by April 15.`}
            style={{ minHeight: 128 }}
          />

          {/* File Upload Section */}
          <div className="flex gap-3">
            <button className="flex-1 border border-dashed border-[var(--border)] rounded-xl p-3 text-sm text-[var(--text-muted)] hover:bg-indigo-500/10 hover:text-indigo-600 hover:border-indigo-300 transition-all cursor-pointer">
              📄 Upload File (PDF, DOCX, TXT)
            </button>
            <button className="px-4 py-2 rounded-xl bg-gray-100 text-sm text-gray-600 hover:bg-gray-200 transition-all cursor-pointer">
              Upload
            </button>
          </div>

          {/* Quick Load Samples */}
          <div>
            <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">Quick Load Samples</p>
            <div className="flex gap-2 flex-wrap">
              {Object.keys(SAMPLES).map((key) => (
                <button
                  key={key}
                  onClick={() => setTranscript(SAMPLES[key])}
                  className="px-3 py-1 rounded-lg bg-gray-100 text-sm text-[var(--text-secondary)] hover:bg-indigo-500/10 hover:text-indigo-600 transition-all"
                >
                  {key}
                </button>
              ))}
            </div>
          </div>

          {/* Extract Button */}
          <button
            onClick={handleExtract}
            disabled={loading || !transcript.trim()}
            className={`w-full py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
              loading || !transcript.trim()
                ? "bg-indigo-300 text-white cursor-not-allowed"
                : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-500/20"
            }`}
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Analyzing transcript...
              </>
            ) : (
              <>⚡ Extract Decisions & Action</>
            )}
          </button>

          {/* Progress bar */}
          {loading && (
            <div className="rounded-full bg-[var(--border)] h-1.5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          )}

          {/* Highlight toggle */}
          <div className="flex items-center justify-between text-sm text-[var(--text-muted)]">
            <span>Highlight extraction sources</span>
            <input
              type="checkbox"
              checked={highlightSources}
              onChange={(e) => setHighlightSources(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
          </div>
        </div>
        </div>

        {/* ─────────── RIGHT — Results Panel (slides in) ─────────── */}
        {extracted && (
        <div className="w-1/2 animate-[fadeSlideIn_0.6s_ease-out_forwards]">
        <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-5 shadow-sm space-y-4">

          {error && !decisions.length ? (
            /* Error state */
            <div className="flex flex-col items-center justify-center text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-red-600 mb-1">{error}</p>
              <p className="text-xs text-[var(--text-muted)]">Check your connection and try again</p>
            </div>
          ) : (
            <>
              {/* Success Banner */}
              <div className="bg-green-50 text-green-700 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Extracted {decisions.length} Decisions & Action Items
              </div>

              {/* Results Table */}
              <div className="border border-[var(--border)] rounded-xl overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-[1fr_100px_80px_50px] text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider bg-[var(--bg)] p-3 border-b border-[var(--border)]">
                  <span>Decision / Task</span>
                  <span>Deadline</span>
                  <span>Assignee</span>
                  <span></span>
                </div>

                {/* Table Rows */}
                <div className="overflow-y-auto" style={{ maxHeight: 320 }}>
                  {decisions.map((d, idx) => {
                    const isNoted = noted.has(idx);
                    const pc = PRIORITY_COLORS[d.priority] || PRIORITY_COLORS.Low;
                    return (
                      <div
                        key={idx}
                        className={`grid grid-cols-[1fr_100px_80px_50px] items-center p-3 border-t border-[var(--border)] text-sm transition-all ${
                          isNoted ? "bg-indigo-50/30" : "hover:bg-[var(--bg)]"
                        } ${highlightSources ? "ring-1 ring-inset ring-indigo-100" : ""}`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <input
                            type="checkbox"
                            checked={isNoted}
                            onChange={() => toggleNoted(idx)}
                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
                          />
                          <div className="min-w-0">
                            <p className={`text-sm text-[var(--text)] truncate ${isNoted ? "line-through text-[var(--text-muted)]" : ""}`}>
                              {d.action}
                            </p>
                            <span className={`inline-block mt-0.5 px-1.5 py-0.5 text-[10px] rounded font-bold ${pc.bg} ${pc.text}`}>
                              {d.priority}
                            </span>
                          </div>
                        </div>
                        <span className="text-xs text-red-500 font-medium">{d.deadline}</span>
                        <span className="text-xs text-[var(--text-secondary)]">{d.department}</span>
                        <button
                          onClick={() => {
                            setDecisions(prev => prev.filter((_, i) => i !== idx));
                            setNoted(prev => {
                              const next = new Set(prev);
                              next.delete(idx);
                              return next;
                            });
                          }}
                          className="text-red-400 hover:text-red-600 text-xs font-medium transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Source Highlighting */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--text-muted)]">Source Highlighting</span>
                <input
                  type="checkbox"
                  checked={highlightSources}
                  onChange={(e) => setHighlightSources(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
              </div>

              {/* Approval Status */}
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-bold">
                  Draft — Needs Review
                </span>
                <button
                  onClick={() => {
                    const allIdxs = decisions.map((_, i) => i);
                    setNoted(new Set(allIdxs));
                  }}
                  className="px-4 py-2 rounded-xl bg-gray-100 text-sm text-[var(--text-secondary)] hover:bg-gray-200 transition-all font-medium"
                >
                  Approve Selected
                </button>
              </div>

              {/* Download & Export */}
              <div className="space-y-2 pt-2 border-t border-[var(--border)]">
                <label className="text-xs text-[var(--text-muted)] font-medium">Download format</label>
                <select className="w-full p-2 rounded-lg border border-[var(--border)] text-sm text-[var(--text-secondary)] bg-[var(--bg)] focus:outline-none focus:ring-2 focus:ring-indigo-500/30">
                  <option>PDF</option>
                  <option>Excel</option>
                  <option>CSV</option>
                </select>
                <button
                  onClick={handleExportCSV}
                  className="w-full py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 shadow-sm shadow-indigo-500/20 transition-all"
                >
                  Export to System
                </button>
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={handleCopyToClipboard}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                    copiedCSV
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-[var(--card)] text-[var(--text-secondary)] border border-[var(--border)] hover:bg-[var(--bg)]"
                  }`}
                >
                  {copiedCSV ? (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                      Copy All
                    </>
                  )}
                </button>
                <button
                  onClick={handleClear}
                  className="px-3.5 py-2 rounded-xl text-xs font-medium text-[var(--text-muted)] hover:bg-red-50 hover:text-red-600 border border-[var(--border)] hover:border-red-200 transition-all"
                >
                  Clear All
                </button>
              </div>
            </>
          )}
        </div>
        </div>
        )}
      </div>

      {/* Custom scrollbar + animation styles */}
      <style>{`
        .overflow-y-auto::-webkit-scrollbar{width:4px}
        .overflow-y-auto::-webkit-scrollbar-track{background:transparent}
        .overflow-y-auto::-webkit-scrollbar-thumb{background:#d1d5db;border-radius:10px}
        .overflow-y-auto{scrollbar-width:thin;scrollbar-color:#d1d5db transparent}
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateX(40px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
