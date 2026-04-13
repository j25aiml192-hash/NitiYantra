"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { classifyComplaint } from "@/lib/api";
import toast from "react-hot-toast";

const EXAMPLES = [
  "The roads near Sector 12 are full of potholes and no one is repairing them",
  "Water supply has been irregular in our colony for the past week",
  "Streetlights are not working in Block B, making it unsafe at night",
  "Garbage has not been collected from our area for 3 days",
  "There is a major water pipeline leak near the main crossing",
];

const CATEGORY_STYLES: Record<string, string> = {
  Roads: "bg-amber-50 text-amber-700 border-amber-200",
  "Water Supply": "bg-blue-50 text-blue-700 border-blue-200",
  Electricity: "bg-yellow-50 text-yellow-700 border-yellow-200",
  Sanitation: "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Public Safety": "bg-red-50 text-red-700 border-red-200",
};

const DEPT_MAP: Record<string, string> = {
  Roads: "PWD", "Water Supply": "Jal Board", Electricity: "DESU",
  Sanitation: "MCD", "Public Safety": "Delhi Police",
};

interface ClassifyResult {
  category: string;
  confidence: number;
  scores?: Record<string, number>;
}

export default function ClassifierPage() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const router = useRouter();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ClassifyResult | null>(null);

  const handleClassify = async () => {
    if (!text.trim()) {
      toast.error("Enter complaint text first");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const data = await classifyComplaint(text);
      setResult(data);
    } catch {
      toast.error("Classification failed");
    } finally {
      setLoading(false);
    }
  };

  const sortedScores = result
    ? Object.entries(result.scores || {}).sort(([, a], [, b]) => b - a)
    : [];

  return (
    <div className="min-h-screen bg-[var(--bg)] p-6 md:p-10 relative overflow-hidden">
      <div className="max-w-3xl mx-auto relative z-10">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-600 text-xs font-medium mb-4">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
            AI Classifier
          </div>
          <h1 className="text-3xl font-bold text-[var(--text)] mb-2">NLP Text Classifier</h1>
          <p className="text-[var(--text-muted)] text-sm max-w-lg mx-auto">
            Test the zero-shot classification model (facebook/bart-large-mnli) — paste any complaint text and see how the AI categorizes it.
          </p>
        </div>

        {/* Input Card */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 mb-6 shadow-sm">
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Complaint Text</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            className="w-full px-4 py-3 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--text)] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all resize-none"
            placeholder="Enter complaint text to classify..."
          />

          <div className="flex flex-wrap gap-2 mt-4 mb-5">
            <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-semibold w-full mb-1">Quick Examples</p>
            {EXAMPLES.map((eg, i) => (
              <button
                key={i}
                onClick={() => setText(eg)}
                className="px-3 py-1.5 bg-[var(--bg)] hover:bg-indigo-50 border border-[var(--border)] hover:border-indigo-200 rounded-lg text-[11px] text-[var(--text-secondary)] hover:text-indigo-600 transition-all"
              >
                {eg.slice(0, 50)}...
              </button>
            ))}
          </div>

          <button
            onClick={handleClassify}
            disabled={loading || !text.trim()}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>
                Running Model...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                Classify Text
              </>
            )}
          </button>
        </div>

        {/* Results */}
        {result && (
          <div className="bg-[var(--card)] border border-indigo-200 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-[var(--border)]">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--text)]">Classification Complete</p>
                <p className="text-[10px] text-[var(--text-muted)]">AI analysis finished in &lt;1s</p>
              </div>
            </div>

            {/* Primary result */}
            <div className="flex items-center justify-between bg-[var(--bg)] border border-[var(--border)] rounded-xl p-5">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-semibold mb-1">Predicted Category</p>
                <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-bold border ${CATEGORY_STYLES[result.category] || "bg-[var(--border)] text-[var(--text-secondary)] border-[var(--border)]"}`}>
                  {result.category}
                </span>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-semibold mb-1">Confidence</p>
                <p className="text-2xl font-black text-indigo-600">{Math.round(result.confidence * 100)}%</p>
              </div>
            </div>

            {/* Department routing */}
            <div className="flex items-center justify-between bg-[var(--bg)] border border-[var(--border)] rounded-xl px-5 py-4">
              <span className="text-sm text-[var(--text-muted)] font-medium">Auto-routed to:</span>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                <span className="text-sm font-bold text-[var(--text)] uppercase tracking-wide">{DEPT_MAP[result.category] || "MCD"}</span>
              </div>
            </div>

            {/* All scores */}
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-semibold mb-3">All Category Scores</p>
              <div className="space-y-3">
                {sortedScores.map(([cat, score]) => (
                  <div key={cat} className="flex items-center gap-3">
                    <span className="text-xs w-28 text-[var(--text-muted)] shrink-0">{cat}</span>
                    <div className="flex-1 h-2 bg-[var(--border)] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${cat === result.category ? "bg-indigo-500" : "bg-slate-300"}`}
                        style={{ width: `${Math.round(score * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono font-bold text-[var(--text-secondary)] w-12 text-right">{(score * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
