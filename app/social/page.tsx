"use client";

import { useState } from "react";
import { useSidebar } from "@/lib/SidebarContext";
import { redditScan, importSocialComplaint, analyzeUrl, SocialComplaint, UrlAnalyzeResponse } from "@/lib/api";
import toast from "react-hot-toast";

/* ─── Mature Color Palette ─── */
const PALETTE = {
  sapphire: "#1D4ED8",
  sapphireLight: "#3B82F6",
  indigo: "#4F46E5",
  violet: "#7C3AED",
  teal: "#0D9488",
  tealLight: "#2DD4BF",
  amber: "#D97706",
  amberLight: "#FBBF24",
  rose: "#E11D48",
  emerald: "#059669",
  emeraldLight: "#34D399",
  slate: "#64748B",
};

/* ─── Urgency badge — bright theme ─── */
function UrgencyBadge({ level }: { level: string | null }) {
  const map: Record<string, { bg: string; ring: string; label: string }> = {
    high:   { bg: "bg-rose-50 text-rose-700",   ring: "ring-rose-200", label: "High" },
    medium: { bg: "bg-amber-50 text-amber-700",  ring: "ring-amber-200", label: "Medium" },
    low:    { bg: "bg-emerald-50 text-emerald-700", ring: "ring-emerald-200", label: "Low" },
  };
  const s = map[level || "medium"] || map.medium;
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ring-1 ${s.bg} ${s.ring}`}>{s.label}</span>;
}

/* ─── Category badge — bright theme ─── */
function CategoryBadge({ category }: { category: string | null }) {
  const colors: Record<string, { bg: string; ring: string }> = {
    Roads: { bg: "bg-amber-50 text-amber-700", ring: "ring-amber-200" },
    "Water Supply": { bg: "bg-sky-50 text-sky-700", ring: "ring-sky-200" },
    Electricity: { bg: "bg-indigo-50 text-indigo-700", ring: "ring-indigo-200" },
    Sanitation: { bg: "bg-emerald-50 text-emerald-700", ring: "ring-emerald-200" },
    "Public Safety": { bg: "bg-rose-50 text-rose-700", ring: "ring-rose-200" },
  };
  const c = colors[category || ""] || { bg: "bg-slate-50 text-slate-600", ring: "ring-slate-200" };
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ring-1 ${c.bg} ${c.ring}`}>{category || "Other"}</span>;
}

export default function SocialPage() {
  const { isOpen: sidebarOpen } = useSidebar();
  void sidebarOpen;

  /* Reddit Scanner */
  const [subreddit, setSubreddit] = useState("india");
  const [query, setQuery] = useState("road pothole delhi");
  const [limit, setLimit] = useState(10);
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<SocialComplaint[]>([]);
  const [scanStats, setScanStats] = useState<{ scanned: number; detected: number } | null>(null);
  const [importingId, setImportingId] = useState<string | null>(null);

  /* URL Analyzer */
  const [urlInput, setUrlInput] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [urlResult, setUrlResult] = useState<UrlAnalyzeResponse | null>(null);

  const handleScan = async () => {
    setScanning(true);
    setResults([]);
    setScanStats(null);
    try {
      const res = await redditScan(subreddit, query, limit);
      setResults(res.complaints);
      setScanStats({ scanned: res.posts_scanned, detected: res.complaints_detected });
      toast.success(`Found ${res.complaints_detected} complaints in ${res.posts_scanned} posts`);
    } catch {
      toast.error("Reddit scan failed");
    } finally {
      setScanning(false);
    }
  };

  const handleImport = async (post: SocialComplaint) => {
    setImportingId(post.url);
    try {
      const res = await importSocialComplaint(post);
      toast.success(`Imported as Complaint #${res.complaint_id}`);
      setResults((prev) => prev.filter((p) => p.url !== post.url));
    } catch {
      toast.error("Import failed");
    } finally {
      setImportingId(null);
    }
  };

  const handleAnalyze = async () => {
    if (!urlInput.trim()) return toast.error("Please enter a URL");
    setAnalyzing(true);
    setUrlResult(null);
    try {
      const res = await analyzeUrl(urlInput);
      setUrlResult(res);
      if (res.is_complaint) {
        toast.success("Complaint detected in URL!");
      } else {
        toast("No civic complaint detected", { icon: "ℹ️" });
      }
    } catch {
      toast.error("URL analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleImportFromUrl = async () => {
    if (!urlResult || !urlResult.is_complaint) return;
    const post: SocialComplaint = {
      title: "Imported from URL",
      url: urlResult.url,
      category: urlResult.category,
      district: urlResult.district,
      urgency: urlResult.urgency,
      summary: urlResult.summary,
      upvotes: 0,
      ai_provider: urlResult.ai_provider,
    };
    await handleImport(post);
    setUrlResult(null);
    setUrlInput("");
  };

  return (
    <div className="min-h-screen bg-transparent text-[var(--text)] relative overflow-hidden">
      {/* ─── Animations ─── */}
      <style>{`
        @keyframes crSlide {
          from { opacity: 0; transform: translateY(20px); filter: blur(3px); }
          to { opacity: 1; transform: translateY(0); filter: blur(0); }
        }
        @keyframes crShimmer {
          from { transform: translateX(-100%); }
          to { transform: translateX(300%); }
        }
        @keyframes crPulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes crFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }
        .cr-in { animation: crSlide 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .cr-d1 { animation-delay: 0.04s; }
        .cr-d2 { animation-delay: 0.12s; }
        .cr-d3 { animation-delay: 0.2s; }
        .cr-d4 { animation-delay: 0.28s; }
        .cr-panel {
          position: relative;
          overflow: hidden;
          transition: transform 0.3s cubic-bezier(0.22,1,0.36,1), box-shadow 0.3s ease;
        }
        .cr-panel:hover {
          transform: translateY(-2px);
          box-shadow: 0 16px 48px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04);
        }
        .cr-panel::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(29,78,216,0.2), rgba(124,58,237,0.15), transparent);
          animation: crShimmer 4.5s ease-in-out infinite;
        }
        .cr-input {
          width: 100%;
          padding: 12px 16px;
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 12px;
          font-size: 14px;
          color: var(--text);
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          font-family: inherit;
        }
        .cr-input:focus {
          border-color: ${PALETTE.sapphire};
          box-shadow: 0 0 0 3px rgba(29,78,216,0.08);
        }
        .cr-input::placeholder { color: var(--text-muted); }
        input[type="range"].cr-range {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 6px;
          border-radius: 8px;
          background: linear-gradient(90deg, #EEF2FF, #C7D2FE);
          outline: none;
        }
        input[type="range"].cr-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: linear-gradient(135deg, ${PALETTE.sapphire}, ${PALETTE.indigo});
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(29,78,216,0.3);
          border: 3px solid #fff;
          transition: transform 0.2s;
        }
        input[type="range"].cr-range::-webkit-slider-thumb:hover {
          transform: scale(1.15);
        }
      `}</style>

      <div className="relative z-10 max-w-[1400px] mx-auto px-6 py-8 space-y-8">

        {/* ═══ HEADER ═══ */}
        <div className="cr-in cr-d1">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1D4ED8] to-[#7C3AED] flex items-center justify-center shadow-lg shadow-indigo-500/25">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
              </div>
              {/* Live pulse dot */}
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[var(--bg)]" style={{ animation: "crPulse 2s ease-in-out infinite" }} />
            </div>
            <div>
              <h1 className="text-[24px] font-bold text-slate-900 tracking-tight">Crowd Monitor</h1>
              <p className="text-[13px] text-slate-600 mt-0.5">Scan social media & news for civic complaints in real time</p>
            </div>
          </div>
        </div>

        {/* ═══ SOURCE STATS RIBBON ═══ */}
        <div className="cr-in cr-d2 flex items-center gap-4 flex-wrap">
          {[
            { icon: <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#FF4500]" fill="currentColor"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 13.38c.15.36.23.75.23 1.15 0 2.34-2.73 4.24-6.1 4.24s-6.1-1.9-6.1-4.24c0-.4.08-.79.23-1.15a1.55 1.55 0 0 1-.63-1.25c0-.86.7-1.56 1.56-1.56.42 0 .8.16 1.08.44 1.07-.74 2.5-1.2 4.06-1.26l.82-3.88a.31.31 0 0 1 .37-.24l2.73.57a1.1 1.1 0 0 1 2.1.35c0 .6-.49 1.1-1.1 1.1-.59 0-1.07-.47-1.1-1.05l-2.43-.51-.73 3.47c1.52.07 2.9.53 3.95 1.25.27-.27.65-.44 1.08-.44.86 0 1.56.7 1.56 1.56 0 .5-.24.95-.63 1.25zM8.62 12.53c-.6 0-1.09.49-1.09 1.09 0 .6.49 1.09 1.09 1.09.6 0 1.09-.49 1.09-1.09 0-.6-.49-1.09-1.09-1.09zm6.76 0c-.6 0-1.09.49-1.09 1.09 0 .6.49 1.09 1.09 1.09.6 0 1.09-.49 1.09-1.09 0-.6-.49-1.09-1.09-1.09zm-5.97 3.99a.32.32 0 0 1 .45 0c.63.63 1.54.93 2.64.93h.06c1.1 0 2.01-.3 2.64-.93a.32.32 0 0 1 .45.45c-.75.75-1.82 1.12-3.09 1.12h-.06c-1.27 0-2.34-.37-3.09-1.12a.32.32 0 0 1 0-.45z"/></svg>, label: "Reddit", desc: "Subreddit scanning", color: "#FF4500" },
            { icon: <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#1DA1F2]" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>, label: "Twitter / X", desc: "Tweet analysis", color: "#1DA1F2" },
            { icon: <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#059669]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21V5a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h15ZM2 14h15Z"/><path d="M6 7h6"/><path d="M6 10h6"/><path d="M16 7h.01"/><path d="M16 10h.01"/></svg>, label: "News", desc: "Article extraction", color: "#059669" },
            { icon: <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#7C3AED]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4c0-1.1.9-2 2-2h8a2 2 0 0 1 2 2v5Z"/><path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1"/></svg>, label: "Forums", desc: "Community posts", color: "#7C3AED" },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-[var(--card)] border border-[var(--border)] shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 cursor-default">
              <span className="flex items-center justify-center">{s.icon}</span>
              <div>
                <p className="text-[12px] font-semibold text-[var(--text)]">{s.label}</p>
                <p className="text-[9px] text-[var(--text-muted)]">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ═══ TWO PANELS — Golden Ratio 1.618:1 ═══ */}
        <div className="cr-in cr-d3" style={{ display: "grid", gridTemplateColumns: "1.618fr 1fr", gap: 24 }}>

          {/* ── LEFT: Reddit Scanner ── */}
          <div className="cr-panel bg-[var(--card)] rounded-2xl border border-[var(--border)]" style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.05)" }}>
            {/* Panel Header */}
            <div className="px-6 py-5 border-b border-[var(--border)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FF4500] to-[#FF6B35] flex items-center justify-center shadow-md shadow-orange-500/20">
                  <svg className="w-4.5 h-4.5 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 13.38c.15.36.23.75.23 1.15 0 2.34-2.73 4.24-6.1 4.24s-6.1-1.9-6.1-4.24c0-.4.08-.79.23-1.15a1.55 1.55 0 0 1-.63-1.25c0-.86.7-1.56 1.56-1.56.42 0 .8.16 1.08.44 1.07-.74 2.5-1.2 4.06-1.26l.82-3.88a.31.31 0 0 1 .37-.24l2.73.57a1.1 1.1 0 0 1 2.1.35c0 .6-.49 1.1-1.1 1.1-.59 0-1.07-.47-1.1-1.05l-2.43-.51-.73 3.47c1.52.07 2.9.53 3.95 1.25.27-.27.65-.44 1.08-.44.86 0 1.56.7 1.56 1.56 0 .5-.24.95-.63 1.25zM8.62 12.53c-.6 0-1.09.49-1.09 1.09 0 .6.49 1.09 1.09 1.09.6 0 1.09-.49 1.09-1.09 0-.6-.49-1.09-1.09-1.09zm6.76 0c-.6 0-1.09.49-1.09 1.09 0 .6.49 1.09 1.09 1.09.6 0 1.09-.49 1.09-1.09 0-.6-.49-1.09-1.09-1.09zm-5.97 3.99a.32.32 0 0 1 .45 0c.63.63 1.54.93 2.64.93h.06c1.1 0 2.01-.3 2.64-.93a.32.32 0 0 1 .45.45c-.75.75-1.82 1.12-3.09 1.12h-.06c-1.27 0-2.34-.37-3.09-1.12a.32.32 0 0 1 0-.45z"/></svg>
                </div>
                <div>
                  <h3 className="text-[14px] font-bold text-[var(--text)]">Reddit Scanner</h3>
                  <p className="text-[10px] text-[var(--text-muted)]">AI-powered subreddit complaint detection</p>
                </div>
              </div>
              {scanStats && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-[var(--text-muted)] bg-[var(--bg)] px-2.5 py-1 rounded-full border border-[var(--border)]">
                    {scanStats.scanned} scanned
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full ring-1 ring-emerald-200">
                    {scanStats.detected} found
                  </span>
                </div>
              )}
            </div>

            <div className="p-6 space-y-5">
              {/* Inputs — Golden ratio internal layout */}
              <div style={{ display: "grid", gridTemplateColumns: "1.618fr 1fr", gap: 16 }}>
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.08em] text-[var(--text-muted)] font-semibold mb-2">Subreddit</label>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-medium text-[var(--text-muted)] shrink-0">r/</span>
                    <input
                      value={subreddit}
                      onChange={(e) => setSubreddit(e.target.value)}
                      className="cr-input"
                      placeholder="india"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.08em] text-[var(--text-muted)] font-semibold mb-2">Posts to Scan</label>
                  <div className="flex items-center gap-3 mt-1">
                    <input
                      type="range"
                      min={5}
                      max={25}
                      value={limit}
                      onChange={(e) => setLimit(Number(e.target.value))}
                      className="cr-range flex-1"
                    />
                    <span className="text-sm font-bold text-[var(--text)] bg-[var(--bg)] px-3 py-1.5 rounded-lg border border-[var(--border)] min-w-[2.5rem] text-center tabular-nums">{limit}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-[0.08em] text-[var(--text-muted)] font-semibold mb-2">Search Query</label>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="cr-input"
                  placeholder="e.g. road pothole delhi, water crisis, garbage dump..."
                />
              </div>

              {/* Scan Button */}
              <button
                onClick={handleScan}
                disabled={scanning}
                className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2.5 cursor-pointer"
                style={{
                  background: scanning ? "var(--border)" : `linear-gradient(135deg, ${PALETTE.sapphire}, ${PALETTE.indigo})`,
                  color: "#fff",
                  boxShadow: scanning ? "none" : `0 6px 20px rgba(29,78,216,0.25)`,
                }}
              >
                {scanning ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>
                    Scanning Reddit…
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    Scan Reddit
                  </>
                )}
              </button>
            </div>

            {/* ── Results ── */}
            {results.length > 0 && (
              <div className="border-t border-[var(--border)] max-h-[420px] overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
                {results.map((post, idx) => (
                  <div key={idx} className="p-5 border-b border-[var(--border)] hover:bg-gradient-to-r hover:from-[var(--bg)] hover:to-transparent transition-all duration-300 group">
                    <div className="flex items-start justify-between gap-3 mb-2.5">
                      <p className="text-[13px] font-semibold text-[var(--text)] leading-snug line-clamp-2 group-hover:text-[#1D4ED8] transition-colors">{post.title}</p>
                      <span className="text-[10px] text-[var(--text-muted)] bg-[var(--bg)] px-2 py-0.5 rounded-md border border-[var(--border)] shrink-0 tabular-nums">⬆ {post.upvotes}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-2.5">
                      <CategoryBadge category={post.category} />
                      <UrgencyBadge level={post.urgency} />
                      <span className="inline-flex items-center text-[10px] text-[var(--text-muted)] bg-slate-50 px-2 py-0.5 rounded-full ring-1 ring-slate-200 font-medium">📍 {post.district || "Unknown"}</span>
                    </div>
                    {post.summary && <p className="text-[11px] text-[var(--text-muted)] mb-3 leading-relaxed line-clamp-2">{post.summary}</p>}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleImport(post)}
                        disabled={importingId === post.url}
                        className="px-3.5 py-1.5 text-white text-[10px] font-bold rounded-lg transition-all disabled:opacity-50 cursor-pointer"
                        style={{ background: `linear-gradient(135deg, ${PALETTE.sapphire}, ${PALETTE.indigo})`, boxShadow: "0 2px 8px rgba(29,78,216,0.2)" }}
                      >
                        {importingId === post.url ? "Importing…" : "⬇ Import as Complaint"}
                      </button>
                      <a
                        href={post.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-1.5 bg-[var(--bg)] border border-[var(--border)] text-[var(--text-secondary)] text-[10px] font-bold rounded-lg hover:border-[#1D4ED8] hover:text-[#1D4ED8] transition-all"
                      >
                        View Source ↗
                      </a>
                      {post.ai_provider && (
                        <span className="text-[9px] text-[var(--text-muted)] ml-auto bg-indigo-50 px-2 py-0.5 rounded-md ring-1 ring-indigo-100 font-medium">AI: {post.ai_provider}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── RIGHT: URL Analyzer ── */}
          <div className="space-y-6">
            {/* URL Analyzer Panel */}
            <div className="cr-panel bg-[var(--card)] rounded-2xl border border-[var(--border)]" style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.05)" }}>
              <div className="px-6 py-5 border-b border-[var(--border)] flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#4F46E5] flex items-center justify-center shadow-md shadow-violet-500/20">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-[14px] font-bold text-[var(--text)]">URL Analyzer</h3>
                  <p className="text-[10px] text-[var(--text-muted)]">Extract complaints from any web page</p>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.08em] text-[var(--text-muted)] font-semibold mb-2">Paste URL</label>
                  <textarea
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    rows={3}
                    className="cr-input resize-none"
                    placeholder="https://twitter.com/... or https://news.site/article..."
                  />
                </div>

                <button
                  onClick={handleAnalyze}
                  disabled={analyzing}
                  className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2.5 cursor-pointer"
                  style={{
                    background: analyzing ? "var(--border)" : `linear-gradient(135deg, ${PALETTE.violet}, ${PALETTE.indigo})`,
                    color: "#fff",
                    boxShadow: analyzing ? "none" : `0 6px 20px rgba(124,58,237,0.25)`,
                  }}
                >
                  {analyzing ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>
                      Analyzing…
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                      Analyze URL
                    </>
                  )}
                </button>

                {/* URL Result */}
                {urlResult && (
                  <div className={`rounded-xl border p-5 transition-all ${urlResult.is_complaint ? "bg-emerald-50/60 border-emerald-200" : "bg-slate-50/60 border-slate-200"}`}>
                    <div className="flex items-center gap-2.5 mb-3">
                      <span className={`w-2.5 h-2.5 rounded-full ${urlResult.is_complaint ? "bg-emerald-500" : "bg-slate-400"}`} />
                      <span className="text-[13px] font-bold text-[var(--text)]">
                        {urlResult.is_complaint ? "✅ Civic Complaint Detected" : "No Complaint Found"}
                      </span>
                    </div>
                    {urlResult.is_complaint && (
                      <>
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          <CategoryBadge category={urlResult.category} />
                          <UrgencyBadge level={urlResult.urgency} />
                          <span className="inline-flex items-center text-[10px] text-[var(--text-muted)] bg-white px-2 py-0.5 rounded-full ring-1 ring-slate-200 font-medium">📍 {urlResult.district || "Unknown"}</span>
                        </div>
                        {urlResult.summary && (
                          <p className="text-[12px] text-[var(--text-secondary)] mb-3 leading-relaxed">{urlResult.summary}</p>
                        )}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleImportFromUrl}
                            className="px-3.5 py-1.5 text-white text-[10px] font-bold rounded-lg transition-all cursor-pointer"
                            style={{ background: `linear-gradient(135deg, ${PALETTE.sapphire}, ${PALETTE.indigo})`, boxShadow: "0 2px 8px rgba(29,78,216,0.2)" }}
                          >
                            ⬇ Import as Complaint
                          </button>
                          <span className="text-[9px] text-[var(--text-muted)] ml-auto bg-indigo-50 px-2 py-0.5 rounded-md ring-1 ring-indigo-100 font-medium">
                            AI: {urlResult.ai_provider} • {urlResult.text_extracted} chars
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Supported Sources Card */}
            <div className="cr-in cr-d4 cr-panel bg-[var(--card)] rounded-2xl border border-[var(--border)] p-6" style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.05)" }}>
              <div className="flex items-center gap-2.5 mb-4">
                <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-md shadow-teal-500/15">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                </span>
                <div>
                  <h3 className="text-[13px] font-bold text-[var(--text)]">Supported Sources</h3>
                  <p className="text-[10px] text-[var(--text-muted)]">Compatible platforms for analysis</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { icon: <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#1DA1F2]" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>, label: "Twitter / X", color: "#1DA1F2" },
                  { icon: <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#059669]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21V5a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h15ZM2 14h15Z"/><path d="M6 7h6"/><path d="M6 10h6"/><path d="M16 7h.01"/><path d="M16 10h.01"/></svg>, label: "News Articles", color: "#059669" },
                  { icon: <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#7C3AED]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4c0-1.1.9-2 2-2h8a2 2 0 0 1 2 2v5Z"/><path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1"/></svg>, label: "Forum Posts", color: "#7C3AED" },
                  { icon: <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#D97706]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/></svg>, label: "Blog Posts", color: "#D97706" },
                ].map((s) => (
                  <div key={s.label} className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] hover:border-indigo-200 hover:-translate-y-0.5 transition-all duration-300 cursor-default">
                    <span className="flex items-center justify-center">{s.icon}</span>
                    <span className="text-[12px] font-medium text-[var(--text-secondary)]">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* How it works mini-card */}
            <div className="cr-in cr-d4 bg-gradient-to-br from-indigo-50 to-violet-50 rounded-2xl border border-indigo-100 p-6">
              <h4 className="text-[13px] font-bold text-indigo-900 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                How Crowd Monitor Works
              </h4>
              <div className="space-y-2.5">
                {[
                  { step: "01", text: "Scan reddit or paste any URL" },
                  { step: "02", text: "AI classifies & extracts complaints" },
                  { step: "03", text: "Import directly into NitiYantra" },
                ].map((s) => (
                  <div key={s.step} className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-indigo-500 bg-white px-2 py-1 rounded-md border border-indigo-100 shadow-sm tabular-nums">{s.step}</span>
                    <span className="text-[12px] text-indigo-800 font-medium">{s.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
