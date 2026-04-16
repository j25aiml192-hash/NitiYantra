"use client";

import { useState, useCallback, useMemo } from "react";
import { useSidebar } from "@/lib/SidebarContext";
import { 
  X, 
  FileArrowUp, 
  Lightning, 
  CheckCircle, 
  Warning, 
  Copy, 
  Trash, 
  Export, 
  ArrowsCounterClockwise,
  Note
} from "@phosphor-icons/react";

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
const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  High:   { bg: "bg-red-100",     text: "text-red-600" },
  Medium: { bg: "bg-amber-100",   text: "text-amber-600" },
  Low:    { bg: "bg-emerald-100", text: "text-emerald-600" },
};

interface DecisionExtractorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

export default function DecisionExtractorModal({ isOpen, onClose, onRefresh }: DecisionExtractorModalProps) {
  const { isOpen: sidebarOpen } = useSidebar();
  const sidebarWidth = sidebarOpen ? 240 : 60;
  const headerHeight = 64;

  const [transcript, setTranscript] = useState("");
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [noted, setNoted] = useState<Set<number>>(new Set());
  const [extracted, setExtracted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [highlightSources, setHighlightSources] = useState(false);
  const [copiedCSV, setCopiedCSV] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const wordCount = useMemo(() => transcript.trim() ? transcript.trim().split(/\s+/).length : 0, [transcript]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
      // Reset all state for a clean reopen
      setTimeout(() => {
        setTranscript("");
        setDecisions([]);
        setError("");
        setNoted(new Set());
        setExtracted(false);
        setProgress(0);
        setHighlightSources(false);
        setCopiedCSV(false);
        setLoading(false);
      }, 100);
      // Refresh data after modal closes (no page reload)
      if (onRefresh) {
        setTimeout(() => onRefresh(), 200);
      }
    }, 280);
  };

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
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  const handleExportCSV = () => {
    if (!decisions.length) return;
    const header = "Action,Department,Deadline,Priority,Status\n";
    const rows = decisions
      .map((d, i) => `"${d.action}","${d.department}","${d.deadline}","${d.priority}","${noted.has(i) ? "Noted" : "Pending"}"`)
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

  if (!isOpen) return null;

  return (
    <div
      className="fixed z-[60] flex items-center justify-center"
      style={{
        left: sidebarWidth,
        top: headerHeight,
        right: 0,
        bottom: 0,
        transition: "left 0.25s ease",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <style>{`
        @keyframes deModalIn {
          from { opacity: 0; transform: scale(0.96) translateY(10px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes deModalOut {
          from { opacity: 1; transform: scale(1) translateY(0); }
          to   { opacity: 0; transform: scale(0.96) translateY(10px); }
        }
        @keyframes deBackdropIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes deBackdropOut {
          from { opacity: 1; }
          to   { opacity: 0; }
        }
        .de-scroll::-webkit-scrollbar { width: 4px; }
        .de-scroll::-webkit-scrollbar-track { background: transparent; }
        .de-scroll::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 10px; }
        .de-scroll { scrollbar-width: thin; scrollbar-color: #d1d5db transparent; }
      `}</style>

      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-md cursor-pointer"
        onClick={handleClose}
        style={{
          animation: `${isClosing ? "deBackdropOut" : "deBackdropIn"} 0.3s ease-out forwards`,
        }}
      />

      {/* Modal Container */}
      <div
        className="relative z-50 w-full max-w-5xl mx-4"
        style={{ animation: `${isClosing ? "deModalOut" : "deModalIn"} 0.35s ease-out forwards` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[var(--card)] backdrop-blur-xl border border-[var(--border)] rounded-2xl shadow-[0_25px_70px_rgba(0,0,0,0.15)] p-6 max-h-[85vh] overflow-y-auto de-scroll">

          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-[var(--card)] hover:bg-red-50 border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:text-red-500 transition-all cursor-pointer z-10"
          >
            <X size={16} weight="bold" />
          </button>

          {/* Header */}
          <div className="mb-5 pr-10">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-bold text-[var(--text)]">Decision Extractor</h1>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100">
                AI Powered
              </span>
            </div>
            <p className="text-sm text-[var(--text-muted)]">
              Paste any meeting transcript and our AI will extract action items, deadlines, and responsibilities
            </p>
          </div>

          {/* ═══ TWO-COLUMN GRID ═══ */}
          <div className={`grid gap-6 ${extracted ? "md:grid-cols-2" : "grid-cols-1"}`}>

            {/* ─── LEFT: Input Panel ─── */}
            <div className="space-y-4">
              <div className="bg-[var(--card)] rounded-xl border border-[var(--border)]/60 p-4 space-y-3">
                {/* Subheader */}
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-[var(--text-secondary)]">Meeting Transcript</h2>
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-medium ${
                    transcript.trim()
                      ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                      : "bg-[var(--bg)] text-[var(--text-muted)] border border-[var(--border)]"
                  }`}>
                    {transcript.trim() ? "Ready" : "Awaiting input"}
                  </span>
                </div>

                {/* Word count */}
                {transcript.trim() && (
                  <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)] font-medium">
                    <span>{wordCount} words</span>
                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                    <span>{transcript.length.toLocaleString()} chars</span>
                  </div>
                )}

                {/* Textarea */}
                <textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  className="w-full h-36 p-3 rounded-lg border border-[var(--border)] bg-[var(--card)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300 resize-vertical transition-all"
                  placeholder={`Paste meeting transcript...\n\nExample:\nThe committee discussed the pending road repair work in Sector 62, Noida. PWD was directed to complete pothole repair by April 15.`}
                  style={{ minHeight: 140 }}
                />

                {/* Upload */}
                <div className="flex gap-2">
                  <button className="flex-1 border border-dashed border-[var(--border)] rounded-lg p-2.5 text-xs text-[var(--text-muted)] hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-300 transition-all cursor-pointer flex items-center justify-center gap-2">
                    <FileArrowUp size={16} weight="duotone" /> Upload File (PDF, DOCX, TXT)
                  </button>
                </div>

                {/* Samples */}
                <div>
                  <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Quick Load</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {Object.keys(SAMPLES).map((key) => (
                      <button
                        key={key}
                        onClick={() => setTranscript(SAMPLES[key])}
                        className="px-2.5 py-1 rounded-full bg-[var(--border)] text-[11px] text-[var(--text-secondary)] hover:bg-indigo-50 hover:text-indigo-600 transition-all cursor-pointer font-medium"
                      >
                        {key}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Extract Button */}
              <button
                onClick={handleExtract}
                disabled={loading || !transcript.trim()}
                className={`w-full py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 text-sm ${
                  loading || !transcript.trim()
                    ? "bg-indigo-300 text-white cursor-not-allowed"
                    : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-500/20"
                }`}
              >
                {loading ? (
                  <>
                    <ArrowsCounterClockwise size={16} weight="bold" className="animate-spin" />
                    Analyzing transcript...
                  </>
                ) : (
                  <>
                    <Lightning size={16} weight="fill" />
                    Extract Decisions &amp; Actions
                  </>
                )}
              </button>

              {/* Progress */}
              {loading && (
                <div className="rounded-full bg-[var(--border)] h-1.5 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
              )}

              {/* Highlight toggle */}
              <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                <span>Highlight extraction sources</span>
                <input
                  type="checkbox"
                  checked={highlightSources}
                  onChange={(e) => setHighlightSources(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
              </div>
            </div>

            {/* ─── RIGHT: Results Panel ─── */}
            {extracted && (
              <div className="space-y-3" style={{ animation: "deModalIn 0.4s ease-out" }}>
                <div className="bg-[var(--card)] rounded-xl border border-[var(--border)]/60 p-4 space-y-3">

                  {error && !decisions.length ? (
                    <div className="flex flex-col items-center justify-center text-center py-10">
                      <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mb-3">
                        <Warning size={32} weight="duotone" className="text-red-400" />
                      </div>
                      <p className="text-sm font-semibold text-red-600 mb-1">{error}</p>
                      <p className="text-xs text-[var(--text-muted)]">Check your connection and try again</p>
                    </div>
                  ) : (
                    <>
                      {/* Success */}
                      <div className="bg-emerald-50 text-emerald-700 px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2">
                        <CheckCircle size={14} weight="fill" />
                        Extracted {decisions.length} Decisions &amp; Action Items
                      </div>

                      {/* Results Table */}
                      <div className="border border-[var(--border)]/60 rounded-lg overflow-hidden">
                        <div className="grid grid-cols-[1fr_90px_70px_40px] text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider bg-slate-50/80 p-2.5 border-b border-[var(--border)]/60">
                          <span>Decision / Task</span>
                          <span>Deadline</span>
                          <span>Assignee</span>
                          <span></span>
                        </div>
                        <div className="overflow-y-auto de-scroll" style={{ maxHeight: 260 }}>
                          {decisions.map((d, idx) => {
                            const isNoted = noted.has(idx);
                            const pc = PRIORITY_COLORS[d.priority] || PRIORITY_COLORS.Low;
                            return (
                              <div
                                key={idx}
                                className={`grid grid-cols-[1fr_90px_70px_40px] items-center p-2.5 border-t border-[var(--border)] text-xs transition-all ${
                                  isNoted ? "bg-indigo-50/30" : "hover:bg-[var(--bg)]"
                                } ${highlightSources ? "ring-1 ring-inset ring-indigo-100" : ""}`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <input
                                    type="checkbox"
                                    checked={isNoted}
                                    onChange={() => toggleNoted(idx)}
                                    className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
                                  />
                                  <div className="min-w-0">
                                    <p className={`text-xs text-[var(--text)] truncate ${isNoted ? "line-through text-[var(--text-muted)]" : ""}`}>
                                      {d.action}
                                    </p>
                                    <span className={`inline-block mt-0.5 px-1.5 py-0.5 text-[9px] rounded font-bold ${pc.bg} ${pc.text}`}>
                                      {d.priority}
                                    </span>
                                  </div>
                                </div>
                                <span className="text-[10px] text-red-500 font-medium">{d.deadline}</span>
                                <span className="text-[10px] text-[var(--text-secondary)]">{d.department}</span>
                                <button
                                  onClick={() => {
                                    setDecisions(prev => prev.filter((_, i) => i !== idx));
                                    setNoted(prev => { const next = new Set(prev); next.delete(idx); return next; });
                                  }}
                                  className="text-red-400 hover:text-red-600 text-[10px] font-medium transition-colors cursor-pointer bg-transparent border-none flex items-center justify-center"
                                >
                                  <Trash size={14} weight="duotone" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Approval */}
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-100">
                          Draft — Needs Review
                        </span>
                        <button
                          onClick={() => setNoted(new Set(decisions.map((_, i) => i)))}
                          className="px-3 py-1.5 rounded-lg bg-[var(--border)] text-[11px] text-[var(--text-secondary)] hover:bg-slate-200 transition-all font-medium cursor-pointer"
                        >
                          Approve All
                        </button>
                      </div>

                      {/* Export */}
                      <div className="space-y-2 pt-2 border-t border-[var(--border)]">
                        <button
                          onClick={handleExportCSV}
                          className="w-full py-2 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 shadow-sm shadow-indigo-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                        >
                          <Export size={16} weight="bold" /> Export to System (CSV)
                        </button>
                      </div>

                      {/* Bottom Actions */}
                      <div className="flex items-center justify-between">
                        <button
                          onClick={handleCopyToClipboard}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                            copiedCSV
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-[var(--card)] text-[var(--text-secondary)] border border-[var(--border)] hover:bg-[var(--bg)]"
                          }`}
                        >
                          {copiedCSV ? (
                            <><CheckCircle size={14} weight="fill" /> Copied!</>
                          ) : (
                            <><Copy size={14} weight="duotone" /> Copy All</>
                          )}
                        </button>
                        <button
                          onClick={handleClear}
                          className="px-3 py-1.5 rounded-lg text-[11px] font-medium text-[var(--text-muted)] hover:bg-red-50 hover:text-red-600 border border-[var(--border)] hover:border-red-200 transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <Trash size={14} weight="duotone" /> Clear All
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
