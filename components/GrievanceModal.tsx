"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { createComplaint, classifyComplaint } from "@/lib/api";
import { 
  CheckCircle, 
  Lightning, 
  Tag, 
  ArrowsLeftRight, 
  X, 
  Buildings,
  ArrowRight,
  ArrowsCounterClockwise
} from "@phosphor-icons/react";

const DISTRICTS = ["Noida", "Ghaziabad", "Delhi", "Gurugram", "Faridabad"];
const SOURCES = ["Portal", "WhatsApp", "Phone", "Email"];

const CATEGORY_COLORS: Record<string, string> = {
  Roads: "bg-amber-500",
  "Water Supply": "bg-blue-500",
  Electricity: "bg-yellow-500",
  Sanitation: "bg-emerald-500",
  "Public Safety": "bg-red-500",
  Other: "bg-slate-500",
};

const DEPT_MAP: Record<string, string> = {
  Roads: "PWD",
  "Water Supply": "Jal Board",
  Electricity: "DESU",
  Sanitation: "MCD",
  "Public Safety": "Delhi Police",
  Other: "MCD",
};

interface ClassifyResult {
  category: string;
  confidence: number;
  department: string;
  complaintId: number | null;
}

/* ── Step timeline component ── */
function RoutingTimeline({
  result,
  onReset,
}: {
  result: ClassifyResult;
  onReset: () => void;
}) {
  const [step, setStep] = useState(0);
  const [progressWidth, setProgressWidth] = useState(0);
  const [confidenceWidth, setConfidenceWidth] = useState(0);

  useEffect(() => {
    setStep(1);
    const t2 = setTimeout(() => { setStep(2); setProgressWidth(0); setTimeout(() => setProgressWidth(100), 50); }, 800);
    const t3 = setTimeout(() => { setStep(3); setTimeout(() => setConfidenceWidth(result.confidence), 50); }, 1600);
    const t4 = setTimeout(() => setStep(4), 2400);
    const t5 = setTimeout(() => setStep(5), 3200);
    return () => { clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5); };
  }, [result.confidence]);

  const confColor = result.confidence >= 85 ? "bg-emerald-500" : result.confidence >= 70 ? "bg-amber-500" : "bg-red-500";

  const steps = [
    { id: 1, icon: <CheckCircle size={18} weight="duotone" />, title: "Complaint Received", sub: "Your complaint has been logged in the system" },
    { id: 2, icon: <Lightning size={18} weight="duotone" />, title: "AI Analyzing...", sub: "Running NitiYantra Keyword Engine v1", hasProgress: true },
    { id: 3, icon: <Tag size={18} weight="duotone" />, title: `Classified: ${result.category}`, sub: `Confidence: ${result.confidence}%`, hasConfidence: true },
    { id: 4, icon: <ArrowsLeftRight size={18} weight="duotone" />, title: `Routing to ${result.department}`, sub: "Assigning to responsible department", hasDept: true },
    { id: 5, icon: <CheckCircle size={18} weight="duotone" />, title: "Successfully Assigned", sub: result.complaintId ? `Complaint #${result.complaintId} is now being tracked` : "Your complaint is now being tracked", hasActions: true },
  ];

  return (
    <div className="bg-[#0f1117] rounded-2xl border border-[#1e2130] p-8 shadow-xl">
      <style>{`
        @keyframes slideIn { from { opacity:0; transform:translateX(-20px); } to { opacity:1; transform:translateX(0); } }
        @keyframes popIn { from { opacity:0; transform:scale(0.8); } to { opacity:1; transform:scale(1); } }
        @keyframes bounce-check { 0% { transform:scale(0.5); } 60% { transform:scale(1.15); } 100% { transform:scale(1); } }
        @keyframes glow-pulse { 0%,100% { box-shadow:0 0 8px rgba(99,102,241,0.3); } 50% { box-shadow:0 0 20px rgba(99,102,241,0.6); } }
        @keyframes dash-flow { to { stroke-dashoffset: 0; } }
        .step-slide { animation: slideIn 0.35s cubic-bezier(0.22,1,0.36,1) forwards; }
        .step-pop { animation: popIn 0.35s cubic-bezier(0.22,1,0.36,1) forwards; }
        .step-bounce { animation: bounce-check 0.5s cubic-bezier(0.22,1,0.36,1) forwards; }
        .glow { animation: glow-pulse 1.5s ease-in-out infinite; }
      `}</style>

      <div className="relative">
        <div className="absolute left-[15px] top-4 bottom-4 w-[2px]"
          style={{
            background: step >= 5
              ? "linear-gradient(to bottom, #2563EB, #22c55e)"
              : "linear-gradient(to bottom, #2563EB, #1e2130)",
          }}
        />
        <div className="space-y-0">
          {steps.map((s) => {
            const isActive = step === s.id;
            const isCompleted = step > s.id;
            const isVisible = step >= s.id;

            if (!isVisible) return (
              <div key={s.id} className="flex items-start gap-4 py-4 opacity-0">
                <div className="w-8 h-8 rounded-full border-2 border-[#1e2130] shrink-0 z-10" />
                <div />
              </div>
            );

            return (
              <div key={s.id} className={`flex items-start gap-4 py-4 ${s.id === 3 ? "step-pop" : "step-slide"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 z-10 transition-all ${
                  isCompleted ? "bg-indigo-600 text-white"
                    : isActive && s.id === 5 ? "bg-emerald-500 text-white step-bounce"
                    : isActive ? "bg-indigo-600 text-white glow"
                    : "border-2 border-[#1e2130] text-[var(--text-secondary)]"
                }`}>
                  {isCompleted ? (
                    <CheckCircle size={18} weight="bold" />
                  ) : (
                    <span className="flex items-center justify-center">{s.icon}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${isActive || isCompleted ? "text-white" : "text-[var(--text-muted)]"}`}>{s.title}</p>
                  <p className={`text-xs mt-0.5 ${isCompleted ? "text-[var(--text-muted)]" : "text-[var(--text-muted)]"}`}>{s.sub}</p>

                  {s.hasProgress && isActive && (
                    <div className="mt-3 h-1.5 bg-[#1e2130] rounded-full overflow-hidden w-48">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${progressWidth}%`, transition: "width 0.8s cubic-bezier(0.22,1,0.36,1)" }} />
                    </div>
                  )}

                  {s.hasConfidence && (isActive || isCompleted) && (
                    <div className="mt-3 space-y-2">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold text-white ${CATEGORY_COLORS[result.category] || "bg-slate-500"}`}>{result.category}</span>
                      <div className="w-48">
                        <div className="h-1.5 bg-[#1e2130] rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${confColor}`} style={{ width: `${confidenceWidth}%`, transition: "width 0.8s cubic-bezier(0.22,1,0.36,1)" }} />
                        </div>
                      </div>
                    </div>
                  )}

                  {s.hasDept && (isActive || isCompleted) && (
                    <div className="mt-3 flex items-center gap-3">
                      <svg width="48" height="2" className="overflow-visible">
                        <line x1="0" y1="1" x2="48" y2="1" stroke="#2563EB" strokeWidth="2" strokeDasharray="4 3" strokeDashoffset="48" style={{ animation: "dash-flow 0.6s ease forwards" }} />
                      </svg>
                      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold uppercase tracking-wider">
                        <Buildings size={14} weight="duotone" />
                        {result.department}
                      </span>
                    </div>
                  )}

                  {s.hasActions && isActive && (
                    <div className="mt-5 flex flex-wrap gap-3">
                      <button onClick={onReset} className="px-4 py-2.5 rounded-xl bg-[var(--card)] text-[var(--text)] text-xs font-semibold hover:bg-[var(--border)] transition-all">Submit Another</button>
                      <Link href="/complaints" className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 transition-all flex items-center gap-2">
                        View All Complaints <ArrowRight size={14} weight="bold" />
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Modal component ── */
interface GrievanceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GrievanceModal({ isOpen, onClose }: GrievanceModalProps) {
  const [text, setText] = useState("");
  const [district, setDistrict] = useState(DISTRICTS[0]);
  const [source, setSource] = useState(SOURCES[0]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ClassifyResult | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) { toast.error("Please enter complaint details"); return; }

    setLoading(true);
    setResult(null);

    try {
      const [complaintRes, aiRes] = await Promise.all([
        createComplaint({ text, district, source: source.toLowerCase(), category: "Pending", status: "pending" }),
        classifyComplaint(text),
      ]);

      const category = aiRes.category;
      const confidence = Math.round(aiRes.confidence * 100);
      const department = DEPT_MAP[category] || "MCD";

      setResult({ category, confidence, department, complaintId: complaintRes?.id ?? null });
      toast.success("Complaint submitted and classified!");
    } catch {
      toast.error("Failed to submit complaint");
    } finally {
      setLoading(false);
    }
  }, [text, district, source]);

  const handleReset = () => {
    setText("");
    setResult(null);
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      handleReset();
      onClose();
    }, 300);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      {/* Backdrop */}
      <div className={`absolute inset-0 bg-black/20 backdrop-blur-md transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`} />

      {/* Modal */}
      <div
        className={`relative z-50 w-full max-w-2xl mx-4 ${isClosing ? 'animate-[fadeOut_0.3s_ease-in_forwards]' : 'animate-[fadeIn_0.4s_ease-out]'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Unified glass container */}
        {!result ? (
          <form onSubmit={handleSubmit} className="bg-[var(--card)] backdrop-blur-xl border border-[var(--border)] rounded-2xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.15)] space-y-5 relative">

            {/* Close button */}
            <button
              type="button"
              onClick={handleClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[var(--card)] shadow-sm border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--card)] transition-all z-10"
            >
              <X size={16} weight="bold" />
            </button>

            {/* Header inside container */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-600 text-xs font-medium mb-3">
                New Grievance
              </div>
              <h2 className="text-2xl font-bold text-[var(--text)] mb-1">File Grievance</h2>
              <p className="text-[var(--text-muted)] text-sm">
                Describe the issue clearly. Our AI will automatically classify and route it.
              </p>
            </div>

            {/* Form fields */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Complaint Details</label>
              <textarea
                rows={4}
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full px-4 py-3 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--text)] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all resize-none"
                placeholder="Describe the issue in detail (e.g., Streetlights are not working in Sector 15 for the past 3 days)..."
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">District</label>
                <select
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full px-4 py-3 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all appearance-none cursor-pointer"
                >
                  {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Source</label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="w-full px-4 py-3 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all appearance-none cursor-pointer"
                >
                  {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <ArrowsCounterClockwise size={20} weight="bold" className="animate-spin" />
                  Processing via AI...
                </>
              ) : (
                <>
                  <Lightning size={20} weight="fill" className="text-amber-300" />
                  Submit &amp; Classify
                </>
              )}
            </button>
          </form>
        ) : (
          <div className="relative">
            <button
              onClick={handleClose}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-[var(--card)] shadow-lg border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg)] transition-all z-10"
            >
              <X size={16} weight="bold" />
            </button>
            <RoutingTimeline result={result} onReset={handleReset} />
          </div>
        )}
      </div>

      {/* Animation keyframes */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes fadeOut {
          from { opacity: 1; transform: scale(1); }
          to { opacity: 0; transform: scale(0.95); }
        }
      `}</style>
    </div>
  );
}
