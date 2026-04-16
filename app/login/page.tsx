"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginUser } from "@/lib/api";
import { 
  User, 
  Lock, 
  Eye, 
  EyeSlash, 
  Warning, 
  ArrowsCounterClockwise, 
  CaretDown,
  CaretUp,
  Bank,
  IdentificationBadge,
  Wrench,
  UserCircle
} from "@phosphor-icons/react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const DEMO_ACCOUNTS = [
    { role: "office_staff", label: "Office Staff", icon: <Bank size={24} weight="duotone" />, username: "admin", password: "admin123" },
    { role: "politician", label: "Politician", icon: <IdentificationBadge size={24} weight="duotone" />, username: "minister_sharma", password: "pass123" },
    { role: "dept_worker", label: "Dept Worker", icon: <Wrench size={24} weight="duotone" />, username: "pwd_ravi", password: "pass123" },
    { role: "citizen", label: "Citizen", icon: <UserCircle size={24} weight="duotone" />, username: "citizen_rahul", password: "pass123" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await loginUser(username, password);
      localStorage.setItem("nityantra_token", data.access_token);
      if (data.user) {
        localStorage.setItem("nityantra_user", JSON.stringify(data.user));
      }
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "transparent", fontFamily: "Inter, sans-serif" }}>
      <style>{`
        @keyframes loginFadeIn {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes floatSlow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes drawIn {
          from { stroke-dashoffset: 200; }
          to { stroke-dashoffset: 0; }
        }
      `}</style>

      {/* ─── Top Navbar ─── */}
      <nav className="w-full flex items-center justify-between px-8 py-2.5 relative z-30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center shadow-sm p-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/nityantralogo.svg" alt="NitiYantra" className="w-5 h-5" style={{ filter: "invert(1)" }} />
          </div>
          <span className="text-xl font-semibold text-[var(--text)] tracking-tight">NitiYantra</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] cursor-pointer transition-colors">Sign up</span>
          <button className="px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm">
            Request Demo
          </button>
        </div>
      </nav>

      {/* ─── Main Content ─── */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden px-4">

        {/* ─── Decorative SVG Doodles (Left Side) ─── */}
        <div className="absolute inset-0 pointer-events-none z-0">

          {/* Squiggly line – top-left */}
          <svg className="absolute top-[12%] left-[5%] w-40 h-20 opacity-40" viewBox="0 0 160 80" fill="none">
            <path d="M10 40 Q30 10, 50 40 T90 40 T130 40 T160 40" stroke="#78716c" strokeWidth="2" fill="none"
              strokeDasharray="200" style={{ animation: "drawIn 2s ease-out forwards" }} />
          </svg>

          {/* Squiggly line – mid-left */}
          <svg className="absolute top-[30%] left-[3%] w-32 h-16 opacity-30" viewBox="0 0 130 60" fill="none">
            <path d="M5 30 Q25 5, 45 30 T85 30 T125 30" stroke="#a8a29e" strokeWidth="1.5" fill="none" />
          </svg>

          {/* Dotted rectangle – lower-left */}
          <div className="absolute bottom-[15%] left-[4%] w-28 h-36 rounded-lg overflow-hidden" style={{ animation: "floatSlow 6s ease-in-out infinite" }}>
            <div className="w-full h-full" style={{
              backgroundColor: "#F5C842",
              backgroundImage: "radial-gradient(circle, #1a1a1a 4px, transparent 4px)",
              backgroundSize: "14px 14px",
              borderRadius: "8px"
            }} />
          </div>

          {/* Small dotted rectangle – lower-left offset */}
          <div className="absolute bottom-[12%] left-[16%] w-16 h-20 rounded-md overflow-hidden opacity-80" style={{ animation: "floatSlow 7s ease-in-out infinite 0.5s" }}>
            <div className="w-full h-full" style={{
              backgroundColor: "#F5C842",
              backgroundImage: "radial-gradient(circle, #1a1a1a 3px, transparent 3px)",
              backgroundSize: "11px 11px",
              borderRadius: "6px"
            }} />
          </div>

          {/* Geometric rectangle with dashed border – mid-left */}
          <div className="absolute top-[42%] left-[8%] w-24 h-16 rounded-md border-2 border-dashed border-gray-400 opacity-25" />

          {/* Horizontal lines inside a box – left */}
          <svg className="absolute top-[45%] left-[5%] w-20 h-14 opacity-30" viewBox="0 0 80 56" fill="none">
            <rect x="2" y="2" width="76" height="52" rx="6" stroke="#78716c" strokeWidth="1.5" fill="none" />
            <line x1="16" y1="20" x2="64" y2="20" stroke="#78716c" strokeWidth="2" />
            <line x1="16" y1="30" x2="56" y2="30" stroke="#a8a29e" strokeWidth="1.5" />
            <line x1="16" y1="40" x2="48" y2="40" stroke="#d6d3d1" strokeWidth="1" />
          </svg>

          {/* Arrow doodle – left */}
          <svg className="absolute bottom-[35%] left-[14%] w-12 h-16 opacity-35" viewBox="0 0 48 64" fill="none">
            <path d="M24 8 L24 48 M16 40 L24 50 L32 40" stroke="#57534e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>

          {/* Small square – left */}
          <div className="absolute top-[22%] left-[14%] w-6 h-6 border-2 border-gray-400 rounded-sm opacity-20 rotate-12" />
        </div>

        {/* ─── Decorative SVG Doodles (Right Side) ─── */}
        <div className="absolute inset-0 pointer-events-none z-0">

          {/* Squiggly line – top-right */}
          <svg className="absolute top-[10%] right-[4%] w-36 h-16 opacity-35" viewBox="0 0 140 60" fill="none">
            <path d="M5 30 Q25 5, 50 30 T95 30 T135 30" stroke="#78716c" strokeWidth="1.5" fill="none" />
          </svg>

          {/* Horizontal lines box – right */}
          <svg className="absolute top-[28%] right-[6%] w-20 h-14 opacity-25" viewBox="0 0 80 56" fill="none">
            <rect x="2" y="2" width="76" height="52" rx="6" stroke="#78716c" strokeWidth="1.5" fill="none" />
            <line x1="16" y1="20" x2="64" y2="20" stroke="#78716c" strokeWidth="2" />
            <line x1="16" y1="30" x2="56" y2="30" stroke="#a8a29e" strokeWidth="1.5" />
          </svg>

          {/* Dotted rectangle – bottom-right */}
          <div className="absolute bottom-[10%] right-[4%] w-24 h-32 rounded-lg overflow-hidden" style={{ animation: "floatSlow 5.5s ease-in-out infinite 1s" }}>
            <div className="w-full h-full" style={{
              backgroundColor: "#F5B73B",
              backgroundImage: "radial-gradient(circle, #1a1a1a 3.5px, transparent 3.5px)",
              backgroundSize: "13px 13px",
              borderRadius: "8px"
            }} />
          </div>

          {/* Small square – right */}
          <div className="absolute top-[50%] right-[12%] w-5 h-5 border-2 border-dashed border-gray-400 opacity-20 -rotate-6" />

          {/* Decorative dot cluster – right */}
          <svg className="absolute top-[65%] right-[8%] w-8 h-8 opacity-20" viewBox="0 0 32 32" fill="none">
            <circle cx="8" cy="8" r="2.5" fill="#a8a29e" />
            <circle cx="20" cy="8" r="2.5" fill="#a8a29e" />
            <circle cx="8" cy="20" r="2.5" fill="#a8a29e" />
            <circle cx="20" cy="20" r="2.5" fill="#a8a29e" />
          </svg>

          {/* Squiggly line – mid-right */}
          <svg className="absolute top-[55%] right-[3%] w-28 h-12 opacity-25" viewBox="0 0 110 48" fill="none">
            <path d="M5 24 Q20 4, 40 24 T75 24 T105 24" stroke="#a8a29e" strokeWidth="1.5" fill="none" />
          </svg>
        </div>

        {/* ─── Login Card ─── */}
        <div
          className="relative z-10 w-full max-w-md"
          style={{ animation: "loginFadeIn 0.6s ease-out" }}
        >
          <div className="rounded-3xl p-8 sm:p-10 shadow-[0_8px_40px_rgba(0,0,0,0.08)]" style={{ backgroundColor: "var(--card)" }}>

            {/* Title */}
            <h2 className="text-3xl font-bold text-[var(--text)] text-center mb-2">NitiYantra Login</h2>
            <p className="text-sm text-[var(--text-muted)] text-center mb-8 leading-relaxed">
              Hey, Enter your credentials to sign in to<br />your governance dashboard
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username */}
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                  <User size={18} weight="duotone" />
                </div>
                <input
                  id="login-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-[var(--border)] text-sm text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition bg-[var(--bg)]"
                  placeholder="Enter username"
                  required
                />
              </div>

              {/* Password */}
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                  <Lock size={18} weight="duotone" />
                </div>
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-16 py-3.5 rounded-xl border border-[var(--border)] text-sm text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition bg-[var(--bg)]"
                  placeholder="Enter password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)] font-medium transition-colors cursor-pointer bg-transparent border-none px-1 py-0.5"
                >
                  {showPassword ? <EyeSlash size={18} weight="duotone" /> : <Eye size={18} weight="duotone" />}
                </button>
              </div>

              {/* Trouble link */}
              <p className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] cursor-pointer transition-colors">
                Having trouble signing in?
              </p>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                  <Warning size={18} weight="duotone" className="shrink-0" />
                  {error}
                </div>
              )}

              {/* Sign In Button */}
              <button
                id="login-submit"
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl text-[var(--text)] font-medium text-sm transition-all duration-200 shadow-sm hover:shadow-md hover:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                style={{ backgroundColor: "#F5A623" }}
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2 justify-center">
                    <ArrowsCounterClockwise size={18} weight="bold" className="animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  "Sign in"
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-[var(--border)]" />
              <span className="text-xs text-[var(--text-muted)] whitespace-nowrap">Or Quick Login As</span>
              <div className="flex-1 h-px bg-[var(--border)]" />
            </div>

            {/* Quick Login Role Buttons */}
            <div className="flex gap-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.role}
                  type="button"
                  onClick={() => {
                    setUsername(acc.username);
                    setPassword(acc.password);
                    setSelectedRole(acc.role);
                  }}
                  className={`flex-1 flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border text-center transition-all duration-200 cursor-pointer hover:shadow-sm ${
                    selectedRole === acc.role
                      ? "bg-amber-500/10 border-amber-400 shadow-sm"
                      : "bg-[var(--card)] border-[var(--border)] hover:bg-[var(--bg)]"
                  }`}
                >
                  <span className={selectedRole === acc.role ? "text-amber-500" : "text-[var(--text-muted)]"}>
                    {acc.icon}
                  </span>
                  <span className={`text-[10px] font-bold leading-tight ${selectedRole === acc.role ? "text-amber-600" : "text-[var(--text-secondary)]"}`}>
                    {acc.label}
                  </span>
                </button>
              ))}
            </div>

            {/* Demo toggle (hidden by default) */}
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setShowDemo(!showDemo)}
                className="w-full text-center text-[var(--text-muted)] text-[10px] hover:text-[var(--text-secondary)] transition-colors flex items-center justify-center gap-1 cursor-pointer bg-transparent border-none font-bold uppercase tracking-wider"
              >
                {showDemo ? "Hide" : "Show"} credentials
                {showDemo ? <CaretUp size={10} weight="bold" /> : <CaretDown size={10} weight="bold" />}
              </button>
              {showDemo && (
                <div className="mt-2 space-y-1 text-[10px]">
                  {DEMO_ACCOUNTS.map((d) => (
                    <div key={d.username} className="flex items-center justify-between px-3 py-1.5 bg-[var(--bg)] border border-[var(--border)] rounded-lg">
                      <span className="font-semibold text-[var(--text-secondary)]">{d.label}</span>
                      <span className="text-[var(--text-muted)]">
                        <span className="font-medium">{d.username}</span> / <span className="font-medium">{d.password}</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom text */}
            <p className="text-center text-xs text-[var(--text-muted)] mt-6">
              Don&apos;t have an account?{" "}
              <span className="text-[var(--text)] font-medium hover:text-indigo-500 cursor-pointer transition-colors underline underline-offset-2">
                Request Now
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* ─── Footer ─── */}
      <footer className="w-full text-center py-5 relative z-10">
        <p className="text-xs text-[var(--text-muted)]">
          Copyright @NitiYantra 2026 &nbsp;|&nbsp; <span className="hover:text-gray-600 cursor-pointer transition-colors">Privacy Policy</span>
        </p>
      </footer>
    </div>
  );
}
