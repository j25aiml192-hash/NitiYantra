"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";

const STORAGE_KEY = "NitiYantra_settings";

interface Settings {
  /* Profile */
  name: string;
  email: string;
  role: string;
  /* Notifications */
  emailNotif: boolean;
  pushNotif: boolean;
  criticalOnly: boolean;
  /* System */
  theme: string;
  autoRefresh: string;
  aiScores: boolean;
  /* Security */
  twoFactor: boolean;
}

const DEFAULTS: Settings = {
  name: "Admin User",
  email: "admin@NitiYantra.gov.in",
  role: "administrator",
  emailNotif: true,
  pushNotif: true,
  criticalOnly: false,
  theme: "light",
  autoRefresh: "30",
  aiScores: true,
  twoFactor: false,
};

function loadSettings(): Settings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return DEFAULTS;
}

function saveSettingsToStorage(s: Settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

/* ─── iOS Toggle (accessible) ─── */
function IOSToggle({ enabled, onChange, ariaLabel }: { enabled: boolean; onChange: (v: boolean) => void; ariaLabel: string }) {
  return (
    <button
      role="switch"
      aria-checked={enabled}
      aria-label={ariaLabel}
      onClick={() => onChange(!enabled)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onChange(!enabled); } }}
      tabIndex={0}
      className="relative flex-shrink-0 cursor-pointer border-none focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 rounded-full"
      style={{
        width: 51, height: 31, borderRadius: 999,
        background: enabled ? "#34C759" : "#e5e5ea",
        transition: "background-color 0.3s ease",
        padding: 2,
        minWidth: 51, minHeight: 44, display: "flex", alignItems: "center",
      }}
    >
      <span
        className="block rounded-full bg-[var(--card)]"
        style={{
          width: 27, height: 27,
          boxShadow: "0 1px 3px rgba(0,0,0,0.2), 0 1px 1px rgba(0,0,0,0.1)",
          transform: enabled ? "translateX(20px)" : "translateX(0)",
          transition: "transform 0.3s ease",
        }}
      />
    </button>
  );
}

/* ─── iOS Row Icon ─── */
function RowIcon({ emoji, bg, label }: { emoji: string; bg: string; label: string }) {
  return (
    <div className="flex items-center justify-center flex-shrink-0" style={{ width: 28, height: 28, borderRadius: 6, background: bg }} role="img" aria-label={label}>
      <span className="text-sm" aria-hidden="true">{emoji}</span>
    </div>
  );
}

/* ─── Chevron ─── */
function Chevron({ isOpen = false }: { isOpen?: boolean }) {
  return (
    <svg
      className="w-4 h-4 flex-shrink-0"
      style={{
        color: "#c7c7cc",
        transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
        transition: "transform 0.2s ease",
      }}
      fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
    </svg>
  );
}

/* ─── Section Header ─── */
function SectionHeader({ title, id }: { title: string; id: string }) {
  return <h2 id={id} className="text-xs font-semibold uppercase tracking-wider px-5 pt-6 pb-1.5" style={{ color: "#6B7280" }}>{title}</h2>;
}

/* ─── Section Footer ─── */
function SectionFooter({ text }: { text: string }) {
  return <p className="text-xs px-5 pt-1.5 pb-1" style={{ color: "#6B7280", lineHeight: 1.4 }}>{text}</p>;
}

/* ─── Grouped Card ─── */
function GroupedCard({ children, labelledBy }: { children: React.ReactNode; labelledBy?: string }) {
  return (
    <section className="mx-4 rounded-xl overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)" }} aria-labelledby={labelledBy}>
      {children}
    </section>
  );
}

/* ─── Row (generic container with keyboard support) ─── */
function Row({ children, onClick, isLast = false, destructive = false, ariaLabel }: { children: React.ReactNode; onClick?: () => void; isLast?: boolean; destructive?: boolean; ariaLabel?: string }) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onClick && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onClick(); }
  };
  return (
    <div
      onClick={onClick}
      onKeyDown={handleKeyDown}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? "button" : undefined}
      aria-label={ariaLabel}
      className={`flex items-center gap-3 px-4 min-h-[44px] ${onClick ? "cursor-pointer active:bg-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500" : ""} ${destructive ? "justify-center" : ""}`}
      style={{ borderBottom: isLast ? "none" : "1px solid var(--border)" }}
    >
      {children}
    </div>
  );
}

/* ─── LABEL HELPERS ─── */
const THEME_LABELS: Record<string, string> = { light: "Light", dark: "Dark", system: "System Default" };
const REFRESH_LABELS: Record<string, string> = { "15": "15 seconds", "30": "30 seconds", "60": "1 minute", "300": "5 minutes", "0": "Disabled" };
const ROLE_LABELS: Record<string, string> = { administrator: "Administrator", supervisor: "Supervisor", analyst: "Analyst", viewer: "Viewer" };

/* ─── Main ─── */
const TEXT_KEYS = new Set<string>(["name", "email"]);

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [mounted, setMounted] = useState(false);
  const [showRolePicker, setShowRolePicker] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showRefreshPicker, setShowRefreshPicker] = useState(false);

  useEffect(() => {
    setSettings(loadSettings());
    setMounted(true);
  }, []);

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      saveSettingsToStorage(next);
      if (key === "theme") {
        const t = value === "system"
          ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
          : value as string;
        document.documentElement.setAttribute("data-theme", t);
      }
      return next;
    });
    if (!TEXT_KEYS.has(key)) {
      toast.success("Saved", { duration: 1000, style: { fontSize: "12px", padding: "6px 12px" } });
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen pb-12" style={{ background: "var(--bg)" }}>
      <style>{`@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; } }`}</style>

      {/* ── iOS Large Title ── */}
      <header className="px-5 pt-6 pb-2">
        <h1 className="font-bold" style={{ fontSize: 34, color: "var(--text)", letterSpacing: "-0.5px" }}>Settings</h1>
      </header>

      {/* ── Apple ID / Profile Card ── */}
      <div className="mx-4 mt-2 mb-1">
        <section className="rounded-xl overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)" }} aria-label="User profile summary">
          <div className="flex items-center gap-3.5 px-4 py-3">
            <div className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, #667eea, #764ba2)" }} role="img" aria-label={`Avatar for ${settings.name}`}>
              <span className="text-xl font-bold text-white" aria-hidden="true">{settings.name.split(" ").map(n => n[0]).join("").slice(0, 2)}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[17px] font-semibold truncate" style={{ color: "var(--text)" }}>{settings.name}</p>
              <p className="text-sm truncate" style={{ color: "#6B7280" }}>{settings.email}</p>
              <span className="inline-block mt-1 text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: "#e8def8", color: "#6b21a8" }}>
                {ROLE_LABELS[settings.role] || settings.role}
              </span>
            </div>
          </div>
        </section>
      </div>

      {/* ── PROFILE ── */}
      <form onSubmit={(e) => e.preventDefault()}>
        <SectionHeader title="Profile" id="section-profile" />
        <GroupedCard labelledBy="section-profile">
          <Row>
            <RowIcon emoji="👤" bg="#5856D6" label="Profile icon" />
            <label htmlFor="input-name" className="flex-1 text-[15px]" style={{ color: "var(--text)" }}>Full Name</label>
            <input
              id="input-name" type="text" value={settings.name} onChange={(e) => update("name", e.target.value)}
              className="text-right text-[15px] bg-transparent border-none focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg w-40 min-h-[44px] px-2"
              style={{ color: "#6B7280" }} aria-label="Full name"
            />
          </Row>
          <Row>
            <RowIcon emoji="✉️" bg="#007AFF" label="Email icon" />
            <label htmlFor="input-email" className="flex-1 text-[15px]" style={{ color: "var(--text)" }}>Email</label>
            <input
              id="input-email" type="email" value={settings.email} onChange={(e) => update("email", e.target.value)}
              className="text-right text-[15px] bg-transparent border-none focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg w-48 min-h-[44px] px-2"
              style={{ color: "#6B7280" }} aria-label="Email address"
            />
          </Row>
          <Row isLast onClick={() => setShowRolePicker(!showRolePicker)} ariaLabel={`Role: ${ROLE_LABELS[settings.role] || settings.role}. Click to change.`}>
            <RowIcon emoji="🏷️" bg="#AF52DE" label="Role icon" />
            <span className="flex-1 text-[15px]" style={{ color: "var(--text)" }}>Role</span>
            <span className="text-[15px] mr-1" style={{ color: "#6B7280" }}>{ROLE_LABELS[settings.role] || settings.role}</span>
            <Chevron isOpen={showRolePicker} />
          </Row>
          {showRolePicker && (
            <div className="px-4 py-2 border-t" style={{ borderColor: "var(--border)", background: "var(--bg)" }} role="listbox" aria-label="Select role">
              {Object.entries(ROLE_LABELS).map(([val, label]) => (
                <button key={val} onClick={() => { update("role", val); setShowRolePicker(false); }}
                  role="option" aria-selected={settings.role === val}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-[15px] cursor-pointer min-h-[44px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 ${settings.role === val ? "font-semibold" : ""}`}
                  style={{ color: settings.role === val ? "#007AFF" : "var(--text)", background: "transparent" }}>
                  {settings.role === val && <span aria-hidden="true">✓  </span>}{label}
                </button>
              ))}
            </div>
          )}
        </GroupedCard>
      </form>

      {/* ── NOTIFICATIONS ── */}
      <SectionHeader title="Notifications" id="section-notifications" />
      <GroupedCard labelledBy="section-notifications">
        <Row>
          <RowIcon emoji="🔔" bg="#FF9500" label="Email notifications icon" />
          <span className="flex-1 text-[15px]" style={{ color: "var(--text)" }}>Email Notifications</span>
          <IOSToggle enabled={settings.emailNotif} onChange={(v) => update("emailNotif", v)} ariaLabel="Toggle email notifications" />
        </Row>
        <Row>
          <RowIcon emoji="📱" bg="#007AFF" label="Push notifications icon" />
          <span className="flex-1 text-[15px]" style={{ color: "var(--text)" }}>Push Notifications</span>
          <IOSToggle enabled={settings.pushNotif} onChange={(v) => update("pushNotif", v)} ariaLabel="Toggle push notifications" />
        </Row>
        <Row isLast>
          <RowIcon emoji="⚠️" bg="#FF3B30" label="Critical alerts icon" />
          <span className="flex-1 text-[15px]" style={{ color: "var(--text)" }}>Critical Alerts Only</span>
          <IOSToggle enabled={settings.criticalOnly} onChange={(v) => update("criticalOnly", v)} ariaLabel="Toggle critical alerts only" />
        </Row>
      </GroupedCard>
      <SectionFooter text="When critical alerts only is enabled, you will only receive notifications for escalated issues." />

      {/* ── SYSTEM ── */}
      <SectionHeader title="System" id="section-system" />
      <GroupedCard labelledBy="section-system">
        <Row onClick={() => setShowThemePicker(!showThemePicker)} ariaLabel={`Theme: ${THEME_LABELS[settings.theme]}. Click to change.`}>
          <RowIcon emoji="🎨" bg="#AF52DE" label="Theme icon" />
          <span className="flex-1 text-[15px]" style={{ color: "var(--text)" }}>Theme</span>
          <span className="text-[15px] mr-1" style={{ color: "#6B7280" }}>{THEME_LABELS[settings.theme]}</span>
          <Chevron isOpen={showThemePicker} />
        </Row>
        {showThemePicker && (
          <div className="px-4 py-2 border-t" style={{ borderColor: "var(--border)", background: "var(--bg)" }} role="listbox" aria-label="Select theme">
            {Object.entries(THEME_LABELS).map(([val, label]) => (
              <button key={val} onClick={() => { update("theme", val); setShowThemePicker(false); }}
                role="option" aria-selected={settings.theme === val}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-[15px] cursor-pointer min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 ${settings.theme === val ? "font-semibold" : ""}`}
                style={{ color: settings.theme === val ? "#007AFF" : "var(--text)", background: "transparent" }}>
                {settings.theme === val && <span aria-hidden="true">✓  </span>}{label}
              </button>
            ))}
          </div>
        )}
        <Row onClick={() => setShowRefreshPicker(!showRefreshPicker)} ariaLabel={`Auto-refresh: ${REFRESH_LABELS[settings.autoRefresh]}. Click to change.`}>
          <RowIcon emoji="🔄" bg="#007AFF" label="Auto-refresh icon" />
          <span className="flex-1 text-[15px]" style={{ color: "var(--text)" }}>Auto-Refresh</span>
          <span className="text-[15px] mr-1" style={{ color: "#6B7280" }}>{REFRESH_LABELS[settings.autoRefresh]}</span>
          <Chevron isOpen={showRefreshPicker} />
        </Row>
        {showRefreshPicker && (
          <div className="px-4 py-2 border-t" style={{ borderColor: "var(--border)", background: "var(--bg)" }} role="listbox" aria-label="Select auto-refresh interval">
            {Object.entries(REFRESH_LABELS).map(([val, label]) => (
              <button key={val} onClick={() => { update("autoRefresh", val); setShowRefreshPicker(false); }}
                role="option" aria-selected={settings.autoRefresh === val}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-[15px] cursor-pointer min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 ${settings.autoRefresh === val ? "font-semibold" : ""}`}
                style={{ color: settings.autoRefresh === val ? "#007AFF" : "var(--text)", background: "transparent" }}>
                {settings.autoRefresh === val && <span aria-hidden="true">✓  </span>}{label}
              </button>
            ))}
          </div>
        )}
        <Row isLast>
          <RowIcon emoji="🤖" bg="#34C759" label="AI confidence scores icon" />
          <span className="flex-1 text-[15px]" style={{ color: "var(--text)" }}>AI Confidence Scores</span>
          <IOSToggle enabled={settings.aiScores} onChange={(v) => update("aiScores", v)} ariaLabel="Toggle AI confidence scores" />
        </Row>
      </GroupedCard>
      <SectionFooter text="Auto-refresh controls how often the dashboard fetches new data." />

      {/* ── SECURITY ── */}
      <SectionHeader title="Security" id="section-security" />
      <GroupedCard labelledBy="section-security">
        <Row>
          <RowIcon emoji="🔐" bg="#34C759" label="Two-factor authentication icon" />
          <span className="flex-1 text-[15px]" style={{ color: "var(--text)" }}>Two-Factor Auth</span>
          <IOSToggle enabled={settings.twoFactor} onChange={(v) => update("twoFactor", v)} ariaLabel="Toggle two-factor authentication" />
        </Row>
        <Row isLast onClick={() => toast.success("Password reset link sent to your email")} ariaLabel="Change password">
          <RowIcon emoji="🔑" bg="#8E8E93" label="Password icon" />
          <span className="flex-1 text-[15px]" style={{ color: "var(--text)" }}>Change Password</span>
          <Chevron />
        </Row>
      </GroupedCard>
      <SectionFooter text="Two-factor authentication adds an extra layer of security." />

      {/* ── DATA & PRIVACY ── */}
      <SectionHeader title="Data & Privacy" id="section-data-privacy" />
      <GroupedCard labelledBy="section-data-privacy">
        <Row onClick={() => toast.success("Data export started. You'll receive an email shortly.")} ariaLabel="Download my data">
          <RowIcon emoji="📦" bg="#007AFF" label="Download data icon" />
          <span className="flex-1 text-[15px]" style={{ color: "var(--text)" }}>Download My Data</span>
          <Chevron />
        </Row>
        <Row isLast onClick={() => toast.success("Activity logs cleared")} ariaLabel="Clear activity logs - this action is permanent">
          <RowIcon emoji="🗑️" bg="#FF3B30" label="Delete icon" />
          <span className="flex-1 text-[15px]" style={{ color: "#FF3B30" }}>Clear Activity Logs</span>
          <Chevron />
        </Row>
      </GroupedCard>
      <SectionFooter text="Clearing activity logs is permanent and cannot be undone." />

      {/* ── ABOUT ── */}
      <SectionHeader title="About" id="section-about" />
      <GroupedCard labelledBy="section-about">
        {[
          { label: "Version", value: "1.0.0" },
          { label: "Environment", value: "Production" },
          { label: "Backend", value: "Render" },
        ].map((item, i, arr) => (
          <Row key={item.label} isLast={i === arr.length - 1}>
            <span className="flex-1 text-[15px]" style={{ color: "var(--text)" }}>{item.label}</span>
            <span className="text-[15px]" style={{ color: "#6B7280" }}>{item.value}</span>
          </Row>
        ))}
      </GroupedCard>

      {/* ── SIGN OUT ── */}
      <div className="mt-6">
        <GroupedCard>
          <Row isLast onClick={() => toast.success("Sign out functionality coming soon")} destructive ariaLabel="Sign out of NitiYantra">
            <span className="text-[15px] font-medium text-center" style={{ color: "#FF3B30" }}>Sign Out</span>
          </Row>
        </GroupedCard>
      </div>



      {/* ── Footer ── */}
      <p className="text-center text-xs mt-6 pb-4" style={{ color: "#6B7280" }}>
        NitiYantra v1.0.0 • AI Governance Intelligence
      </p>
    </div>
  );
}
