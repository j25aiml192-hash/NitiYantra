"use client";

import { useState } from "react";
import { useSidebar } from "@/lib/SidebarContext";
import { redditScan, importSocialComplaint, analyzeUrl, SocialComplaint, UrlAnalyzeResponse } from "@/lib/api";
import toast from "react-hot-toast";

/* ─── Urgency badge ─── */
function UrgencyBadge({ level }: { level: string | null }) {
  const map: Record<string, { bg: string; label: string }> = {
    high:   { bg: "bg-red-500/15 text-red-400",     label: "High" },
    medium: { bg: "bg-amber-500/15 text-amber-400",  label: "Medium" },
    low:    { bg: "bg-emerald-500/15 text-emerald-400", label: "Low" },
  };
  const s = map[level || "medium"] || map.medium;
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${s.bg}`}>{s.label}</span>;
}

/* ─── Category badge ─── */
function CategoryBadge({ category }: { category: string | null }) {
  const colors: Record<string, string> = {
    Roads: "bg-amber-500/15 text-amber-400",
    "Water Supply": "bg-blue-500/15 text-blue-400",
    Electricity: "bg-yellow-500/15 text-yellow-400",
    Sanitation: "bg-emerald-500/15 text-emerald-400",
    "Public Safety": "bg-red-500/15 text-red-400",
  };
  const c = colors[category || ""] || "bg-slate-500/15 text-slate-400";
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${c}`}>{category || "Other"}</span>;
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
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.5s ease-out forwards; }
      `}</style>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* ═══ HEADER ═══ */}
        <div className="fade-up">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-[var(--text)] to-[var(--text-secondary)] bg-clip-text text-transparent">
                Social Intelligence
              </h1>
              <p className="text-sm text-[var(--text-muted)]">Detect civic complaints from social media and news</p>
            </div>
          </div>
        </div>

        {/* ═══ TWO PANELS ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── LEFT: Reddit Scanner ── */}
          <div className="fade-up bg-[var(--card)] rounded-2xl border border-[var(--border)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--border)] flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white text-sm font-bold">R</div>
              <div>
                <h3 className="text-sm font-bold text-[var(--text)]">Reddit Scanner</h3>
                <p className="text-[10px] text-[var(--text-muted)]">Search subreddits for civic complaints</p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-semibold mb-1.5">Subreddit</label>
                  <div className="flex items-center">
                    <span className="text-sm text-[var(--text-muted)] mr-1">r/</span>
                    <input
                      value={subreddit}
                      onChange={(e) => setSubreddit(e.target.value)}
                      className="flex-1 px-3 py-2.5 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                      placeholder="india"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-semibold mb-1.5">Posts to scan</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={5}
                      max={25}
                      value={limit}
                      onChange={(e) => setLimit(Number(e.target.value))}
                      className="flex-1 accent-orange-500"
                    />
                    <span className="text-sm font-bold text-[var(--text-secondary)] min-w-[2rem] text-right">{limit}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-semibold mb-1.5">Search Query</label>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                  placeholder="road pothole delhi"
                />
              </div>

              <button
                onClick={handleScan}
                disabled={scanning}
                className="w-full py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-semibold rounded-xl shadow-lg shadow-orange-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {scanning ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>
                    Scanning Reddit…
                  </>
                ) : (
                  <>🔍 Scan Reddit</>
                )}
              </button>

              {scanStats && (
                <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                  <span className="bg-[var(--bg)] px-2.5 py-1 rounded-lg border border-[var(--border)]">
                    {scanStats.scanned} scanned
                  </span>
                  <span className="bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                    {scanStats.detected} complaints
                  </span>
                </div>
              )}
            </div>

            {/* Results */}
            {results.length > 0 && (
              <div className="border-t border-[var(--border)] max-h-[400px] overflow-y-auto">
                {results.map((post, idx) => (
                  <div key={idx} className="p-4 border-b border-[var(--border)] hover:bg-[var(--bg)] transition-colors">
                    <p className="text-sm font-semibold text-[var(--text)] mb-2 line-clamp-2">{post.title}</p>
                    <div className="flex flex-wrap gap-2 mb-2">
                      <CategoryBadge category={post.category} />
                      <UrgencyBadge level={post.urgency} />
                      <span className="text-[10px] text-[var(--text-muted)] bg-[var(--bg)] px-2 py-0.5 rounded-full">📍 {post.district || "Unknown"}</span>
                      <span className="text-[10px] text-[var(--text-muted)] bg-[var(--bg)] px-2 py-0.5 rounded-full">⬆ {post.upvotes}</span>
                    </div>
                    {post.summary && <p className="text-xs text-[var(--text-muted)] mb-3 line-clamp-2">{post.summary}</p>}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleImport(post)}
                        disabled={importingId === post.url}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold rounded-lg transition-all disabled:opacity-50"
                      >
                        {importingId === post.url ? "Importing…" : "⬇ Import as Complaint"}
                      </button>
                      <a
                        href={post.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-[var(--bg)] border border-[var(--border)] text-[var(--text-muted)] text-[10px] font-bold rounded-lg hover:bg-[var(--border)] transition-all"
                      >
                        View on Reddit ↗
                      </a>
                      {post.ai_provider && (
                        <span className="text-[9px] text-[var(--text-muted)] ml-auto">AI: {post.ai_provider}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── RIGHT: URL Analyzer ── */}
          <div className="fade-up bg-[var(--card)] rounded-2xl border border-[var(--border)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--border)] flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-sm">🔗</div>
              <div>
                <h3 className="text-sm font-bold text-[var(--text)]">URL Analyzer</h3>
                <p className="text-[10px] text-[var(--text-muted)]">Paste any URL — tweet, news, forum post</p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-semibold mb-1.5">URL</label>
                <textarea
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2.5 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-violet-500/30 resize-none"
                  placeholder="https://twitter.com/... or https://news.site/article..."
                />
              </div>

              <button
                onClick={handleAnalyze}
                disabled={analyzing}
                className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-violet-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {analyzing ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>
                    Analyzing…
                  </>
                ) : (
                  <>🧠 Analyze URL</>
                )}
              </button>

              {/* URL Result */}
              {urlResult && (
                <div className={`rounded-xl border p-4 ${urlResult.is_complaint ? "bg-emerald-500/5 border-emerald-500/20" : "bg-slate-500/5 border-[var(--border)]"}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`w-2 h-2 rounded-full ${urlResult.is_complaint ? "bg-emerald-500" : "bg-slate-500"}`} />
                    <span className="text-sm font-bold text-[var(--text)]">
                      {urlResult.is_complaint ? "Civic Complaint Detected" : "No Complaint Found"}
                    </span>
                  </div>
                  {urlResult.is_complaint && (
                    <>
                      <div className="flex flex-wrap gap-2 mb-3">
                        <CategoryBadge category={urlResult.category} />
                        <UrgencyBadge level={urlResult.urgency} />
                        <span className="text-[10px] text-[var(--text-muted)] bg-[var(--bg)] px-2 py-0.5 rounded-full">📍 {urlResult.district || "Unknown"}</span>
                      </div>
                      {urlResult.summary && (
                        <p className="text-xs text-[var(--text-secondary)] mb-3">{urlResult.summary}</p>
                      )}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleImportFromUrl}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold rounded-lg transition-all"
                        >
                          ⬇ Import as Complaint
                        </button>
                        <span className="text-[9px] text-[var(--text-muted)] ml-auto">
                          AI: {urlResult.ai_provider} • {urlResult.text_extracted} chars analyzed
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Info card */}
              <div className="bg-[var(--bg)] rounded-xl border border-[var(--border)] p-4">
                <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-semibold mb-2">Supported Sources</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { icon: "🐦", label: "Twitter / X" },
                    { icon: "📰", label: "News Articles" },
                    { icon: "💬", label: "Forum Posts" },
                    { icon: "📝", label: "Blog Posts" },
                  ].map((s) => (
                    <div key={s.label} className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                      <span>{s.icon}</span> {s.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
