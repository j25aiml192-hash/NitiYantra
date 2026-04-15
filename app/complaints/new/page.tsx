"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { createComplaint, classifyComplaint } from "@/lib/api";

const DISTRICTS = ["Noida", "Ghaziabad", "Delhi", "Gurugram", "Faridabad"];
const SOURCES = ["Portal", "WhatsApp", "Phone", "Email"];

const CATEGORY_COLORS: Record<string, string> = {
  Roads: "bg-amber-500",
  "Water Supply": "bg-blue-500",
  Electricity: "bg-yellow-500",
  Sanitation: "bg-emerald-500",
  "Public Safety": "bg-red-500",
  Other: "bg-[var(--bg)]0",
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
    // Step 1 immediately
    setStep(1);
    const t2 = setTimeout(() => { setStep(2); setProgressWidth(0); setTimeout(() => setProgressWidth(100), 50); }, 800);
    const t3 = setTimeout(() => { setStep(3); setTimeout(() => setConfidenceWidth(result.confidence), 50); }, 1600);
    const t4 = setTimeout(() => setStep(4), 2400);
    const t5 = setTimeout(() => setStep(5), 3200);
    return () => { clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5); };
  }, [result.confidence]);

  const confColor = result.confidence >= 85 ? "bg-emerald-500" : result.confidence >= 70 ? "bg-amber-500" : "bg-red-500";

  const steps = [
    {
      id: 1,
      icon: "✅",
      title: "Complaint Received",
      sub: "Your complaint has been logged in the system",
    },
    {
      id: 2,
      icon: "⚡",
      title: "AI Analyzing...",
      sub: "Running NitiYantra Keyword Engine v1",
      hasProgress: true,
    },
    {
      id: 3,
      icon: "🏷",
      title: `Classified: ${result.category}`,
      sub: `Confidence: ${result.confidence}%`,
      hasConfidence: true,
    },
    {
      id: 4,
      icon: "🔀",
      title: `Routing to ${result.department}`,
      sub: "Assigning to responsible department",
      hasDept: true,
    },
    {
      id: 5,
      icon: "✅",
      title: "Successfully Assigned",
      sub: result.complaintId
        ? `Complaint #${result.complaintId} is now being tracked`
        : "Your complaint is now being tracked",
      hasActions: true,
    },
  ];

  return (
    <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-8 shadow-xl">
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
        {/* Timeline vertical line */}
        <div className="absolute left-[15px] top-4 bottom-4 w-[2px]"
          style={{
            background: step >= 5
              ? "linear-gradient(to bottom, #2563EB, #22c55e)"
              : "linear-gradient(to bottom, #2563EB, var(--border))",
          }}
        />

        <div className="space-y-0">
          {steps.map((s) => {
            const isActive = step === s.id;
            const isCompleted = step > s.id;
            const isVisible = step >= s.id;

            if (!isVisible) return (
              <div key={s.id} className="flex items-start gap-4 py-4 opacity-0">
                <div className="w-8 h-8 rounded-full border-2 border-[var(--border)] shrink-0 z-10" />
                <div />
              </div>
            );

            return (
              <div
                key={s.id}
                className={`flex items-start gap-4 py-4 ${s.id === 3 ? "step-pop" : "step-slide"}`}
              >
                {/* Circle */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 z-10 transition-all ${
                  isCompleted
                    ? "bg-indigo-600 text-white"
                    : isActive && s.id === 5
                    ? "bg-emerald-500 text-white step-bounce"
                    : isActive
                    ? "bg-indigo-600 text-white glow"
                    : "border-2 border-[var(--border)] text-[var(--text-secondary)]"
                }`}>
                  {isCompleted ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className="text-xs">{s.icon}</span>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${isActive || isCompleted ? "text-[var(--text)]" : "text-[var(--text-muted)]"}`}>
                    {s.title}
                  </p>
                  <p className={`text-xs mt-0.5 ${isCompleted ? "text-[var(--text-muted)]" : "text-[var(--text-muted)]"}`}>
                    {s.sub}
                  </p>

                  {/* Step 2: Progress bar */}
                  {s.hasProgress && isActive && (
                    <div className="mt-3 h-1.5 bg-[var(--border)] rounded-full overflow-hidden w-48">
                      <div
                        className="h-full bg-indigo-500 rounded-full"
                        style={{
                          width: `${progressWidth}%`,
                          transition: "width 0.8s cubic-bezier(0.22,1,0.36,1)",
                        }}
                      />
                    </div>
                  )}

                  {/* Step 3: Category badge + confidence */}
                  {s.hasConfidence && (isActive || isCompleted) && (
                    <div className="mt-3 space-y-2">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold text-white ${CATEGORY_COLORS[result.category] || "bg-[var(--bg)]0"}`}>
                        {result.category}
                      </span>
                      <div className="w-48">
                        <div className="h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${confColor}`}
                            style={{
                              width: `${confidenceWidth}%`,
                              transition: "width 0.8s cubic-bezier(0.22,1,0.36,1)",
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 4: Department routing */}
                  {s.hasDept && (isActive || isCompleted) && (
                    <div className="mt-3 flex items-center gap-3">
                      {/* Animated dashed line */}
                      <svg width="48" height="2" className="overflow-visible">
                        <line
                          x1="0" y1="1" x2="48" y2="1"
                          stroke="#2563EB"
                          strokeWidth="2"
                          strokeDasharray="4 3"
                          strokeDashoffset="48"
                          style={{ animation: "dash-flow 0.6s ease forwards" }}
                        />
                      </svg>
                      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold uppercase tracking-wider">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        {result.department}
                      </span>
                    </div>
                  )}

                  {/* Step 5: Action buttons */}
                  {s.hasActions && isActive && (
                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        onClick={onReset}
                        className="px-4 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] text-xs font-semibold hover:bg-[var(--border)] transition-all"
                      >
                        Submit Another Complaint
                      </button>
                      <Link
                        href="/complaints"
                        className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 transition-all"
                      >
                        View All Complaints →
                      </Link>
                      <Link
                        href="/issues"
                        className="px-4 py-2.5 rounded-xl border border-[var(--border)] text-[var(--text-muted)] text-xs font-semibold hover:bg-[var(--border)] transition-all"
                      >
                        Track This Issue →
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

/* ── Main page ── */
export default function SubmitComplaintPage() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [district, setDistrict] = useState(DISTRICTS[0]);
  const [source, setSource] = useState(SOURCES[0]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ClassifyResult | null>(null);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) { toast.error("Please enter complaint details"); return; }

    setLoading(true);
    setResult(null);

    try {
      // Step 1: Classify first to get the category
      const aiRes = await classifyComplaint(text);
      const category = aiRes.category;
      const confidence = Math.round(aiRes.confidence * 100);
      const department = DEPT_MAP[category] || "MCD";

      // Step 2: Map department name to department_id (production DB IDs)
      const DEPT_ID_MAP: Record<string, number> = {
        "PWD": 21, "Jal Board": 22, "DESU": 23, "MCD": 24, "Delhi Police": 25,
      };
      const deptId = DEPT_ID_MAP[department] || 24;

      // Step 3: Create complaint WITH the correct category and department
      const complaintRes = await createComplaint({
        text,
        district,
        source: source.toLowerCase(),
        category: category,
        status: "in_progress",
        department_id: deptId,
      });

      setResult({ category, confidence, department, complaintId: complaintRes?.id ?? null });
      toast.success("Complaint submitted and classified!");
      // Auto-redirect to complaints list after timeline animation finishes
      setTimeout(() => {
        router.push("/complaints");
      }, 5000);
    } catch {
      toast.error("Failed to submit complaint");
    } finally {
      setLoading(false);
    }
  }, [text, district, source, router]);

  const handleReset = () => {
    setText("");
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] p-6 md:p-10 relative overflow-hidden">
      <div className="max-w-2xl mx-auto relative z-10">

        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-600 text-xs font-medium mb-4">
            New Grievance
          </div>
          <h1 className="text-3xl font-bold text-[var(--text)] mb-2">File Grievance</h1>
          <p className="text-[var(--text-muted)] text-sm">
            Describe the issue clearly. Our AI will automatically classify it and route it to the correct department.
          </p>
        </div>

        {/* Form */}
        {!result ? (
          <form onSubmit={handleSubmit} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Complaint Details</label>
                <textarea
                  rows={5}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="w-full px-4 py-3 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--text)] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all resize-none"
                  placeholder="Describe the issue in detail (e.g., Streetlights are not working in Sector 15 for the past 3 days)..."
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                      Processing via AI...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Submit &amp; Classify
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        ) : (
          <RoutingTimeline result={result} onReset={handleReset} />
        )}
      </div>
    </div>
  );
}

