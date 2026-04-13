"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getCurrentUser } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

/* ────────────────────────────────────────────────────── */
/*  NAV CONFIGURATION                                     */
/* ────────────────────────────────────────────────────── */
interface NavItem {
  label: string;
  href: string;
  icon: string;
  badge?: string;
  badgeColor?: string;
  dynamicKey?: "total_complaints" | "delayed_issues";
}

interface Section {
  title: string;
  items: NavItem[];
}

const SECTIONS: Section[] = [
  {
    title: "Operations",
    items: [
      { label: "Command Center", href: "/dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
      { label: "Live Feed", href: "/activity", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
    ],
  },
  {
    title: "Grievance Management",
    items: [
      { label: "Grievance Registry", href: "/complaints", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2", dynamicKey: "total_complaints" },
      { label: "SLA Breaches", href: "/issues", icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z", dynamicKey: "delayed_issues" },
    ],
  },
  {
    title: "Analytics",
    items: [
      { label: "Pattern Analysis", href: "/ai-pipeline", icon: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" },
      { label: "Performance Metrics", href: "/analytics", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
      { label: "Geographic Monitor", href: "/heatmap", icon: "M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z" },
    ],
  },
  {
    title: "Election Intelligence",
    items: [
      { label: "Election Engine", href: "/election", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
      { label: "ONOE Simulator", href: "/simulator", icon: "M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" },
      { label: "Spotlight Debate", href: "/debate", icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" },
    ],
  },
  {
    title: "Administration",
    items: [
      { label: "Department Directory", href: "/departments", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4", badge: "5", badgeColor: "#64748b" },
      { label: "Settings", href: "/settings", icon: "M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" },
    ],
  },
];

const STORAGE_KEY = "nityantra_sidebar_collapsed";
const COLLAPSED_W = 60;
const EXPANDED_W = 240;
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/* ────────────────────────────────────────────────────── */
/*  SIDEBAR COMPONENT                                     */
/* ────────────────────────────────────────────────────── */
interface SidebarProps {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const collapsed = !isOpen;
  const [search, setSearch] = useState("");
  const [badges, setBadges] = useState<Record<string, number>>({});
  const [liveAge, setLiveAge] = useState("just now");
  const liveRef = useRef(0);

  /* Role-based filtering */
  const user = getCurrentUser();
  const { logout: authLogout } = useAuth();
  const ROLE_ALLOWED_ROUTES: Record<string, string[]> = {
    office_staff: ["all"],
    politician: ["/dashboard", "/activity", "/complaints", "/issues", "/ai-pipeline", "/analytics", "/heatmap"],
    dept_worker: ["/dashboard", "/complaints", "/settings"],
    citizen: ["/complaints", "/complaints/new"],
  };
  const allowedRoutes = ROLE_ALLOWED_ROUTES[user?.role || ""] || ["all"];
  const isRouteAllowed = (href: string) => allowedRoutes[0] === "all" || allowedRoutes.includes(href);

  /* Restore preference */
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) setIsOpen(saved !== "true");
  }, [setIsOpen]);

  /* Live timer */
  useEffect(() => {
    const t = setInterval(() => {
      liveRef.current += 30;
      const s = liveRef.current;
      setLiveAge(s < 60 ? `${s}s ago` : `${Math.floor(s / 60)}m ago`);
    }, 30000);
    return () => clearInterval(t);
  }, []);

  /* Fetch badge counts */
  const fetchBadges = useCallback(async () => {
    try {
      const res = await fetch(`${API}/dashboard/stats`);
      if (res.ok) {
        const d = await res.json();
        setBadges({ total_complaints: d.total_complaints ?? 0, delayed_issues: d.delayed_issues ?? 0 });
      }
    } catch { /* swallow */ }
  }, []);
  useEffect(() => { fetchBadges(); }, [fetchBadges]);

  /* Don't render on landing / login */
  if (pathname === "/" || pathname === "/login") return null;

  const toggle = () => {
    const next = !collapsed;
    setIsOpen(!next);
    localStorage.setItem(STORAGE_KEY, String(next));
  };

  const handleLogoClick = () => {
    if (!isOpen) {
      setIsOpen(true);
    } else {
      router.push("/");
    }
  };

  const handleLogout = () => {
    authLogout();
  };

  const q = search.toLowerCase().trim();
  const w = collapsed ? COLLAPSED_W : EXPANDED_W;

  return (
    <>
      {/* ─── Sidebar ─── */}
      <aside
        style={{
          width: w,
          height: "100vh",
          background: "var(--card)",
          borderRight: "1px solid var(--border)",
          transition: "width 0.25s ease",
          display: "flex",
          flexDirection: "column",
          position: "fixed",
          left: 0,
          top: 0,
          zIndex: 100,
          overflow: "hidden",
        }}
      >
        {/* ── Header ── */}
        <div
          style={{
            padding: collapsed ? "16px 12px" : "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "space-between",
            borderBottom: "1px solid var(--border)",
            minHeight: 64,
          }}
        >
          <div onClick={handleLogoClick} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <div
              style={{
                width: 32, height: 32, borderRadius: 10,
                background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, padding: 5,
              }}
            >
              <img src="/nityantralogo.svg" alt="NitiYantra" style={{ width: 20, height: 20, filter: "invert(1)" }} />
            </div>
            {!collapsed && (
              <div style={{ whiteSpace: "nowrap", opacity: 1, transition: "opacity 0.15s ease 0.1s" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", lineHeight: 1.2 }}>NitiYantra</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.03em" }}>Governance Intelligence</div>
              </div>
            )}
          </div>

          {/* Collapse button — shown when expanded */}
          {!collapsed && (
            <button onClick={toggle} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 4, borderRadius: 6, display: "flex", alignItems: "center", flexShrink: 0 }} title="Collapse sidebar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="9" y1="3" x2="9" y2="21" />
                <polyline points="15 8 11 12 15 16" />
              </svg>
            </button>
          )}
        </div>

        {/* Expand button — shown when collapsed */}
        {collapsed && (
          <button onClick={toggle} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "12px 0", display: "flex", justifyContent: "center", width: "100%" }} title="Expand sidebar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
              <polyline points="13 8 17 12 13 16" />
            </svg>
          </button>
        )}

        {/* ── Search (expanded only) ── */}
        {!collapsed && (
          <div style={{ padding: "8px 12px" }}>
            <div style={{ position: "relative" }}>
              <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "var(--text-muted)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter..."
                style={{
                  width: "100%", padding: "7px 10px 7px 32px",
                  borderRadius: 8, border: "1px solid var(--border)",
                  background: "var(--bg)", color: "var(--text)",
                  fontSize: 12, outline: "none",
                }}
              />
            </div>
          </div>
        )}

        {/* ── Live indicator ── */}
        <div style={{ padding: collapsed ? "8px 0" : "6px 16px", display: "flex", alignItems: "center", gap: 6, justifyContent: collapsed ? "center" : "flex-start" }}>
          <span style={{ position: "relative", display: "inline-flex", width: 6, height: 6 }}>
            <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "#34d399", opacity: 0.6, animation: "ping 1.5s cubic-bezier(0,0,0.2,1) infinite" }} />
            <span style={{ position: "relative", display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#10b981" }} />
          </span>
          {!collapsed && <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Live · {liveAge}</span>}
        </div>

        {/* ── Navigation ── */}
        <nav className="sidebar-nav" style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: collapsed ? "4px 6px" : "4px 8px" }}>
          {SECTIONS.map((section) => {
            const roleFiltered = section.items.filter((i) => isRouteAllowed(i.href));
            const items = q ? roleFiltered.filter((i) => i.label.toLowerCase().includes(q)) : roleFiltered;
            if (items.length === 0) return null;

            return (
              <div key={section.title} style={{ marginBottom: 16 }}>
                {!collapsed && (
                  <div style={{ padding: "4px 8px", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: 4 }}>
                    {section.title}
                  </div>
                )}
                {items.map((item) => {
                  const active = pathname === item.href;
                  const dynCount = item.dynamicKey ? badges[item.dynamicKey] : undefined;
                  const isDelay = item.dynamicKey === "delayed_issues";

                  return (
                    <button
                      key={item.label + item.href}
                      onClick={() => router.push(item.href)}
                      title={collapsed ? item.label : undefined}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: collapsed ? "10px 0" : "8px 10px",
                        justifyContent: collapsed ? "center" : "flex-start",
                        borderRadius: 10,
                        border: "none",
                        cursor: "pointer",
                        fontSize: 13,
                        fontWeight: 500,
                        color: active ? "var(--text)" : "var(--text-secondary)",
                        background: active ? "var(--accent-light)" : "transparent",
                        transition: "all 0.15s ease",
                        position: "relative",
                      }}
                      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "var(--bg)"; e.currentTarget.style.color = "var(--text)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = active ? "var(--accent-light)" : "transparent"; e.currentTarget.style.color = active ? "var(--text)" : "var(--text-secondary)"; }}
                    >
                      <svg style={{ width: 18, height: 18, flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                      </svg>
                      {!collapsed && (
                        <>
                          <span style={{ flex: 1, textAlign: "left", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</span>
                          {/* Static badge */}
                          {item.badge && !item.dynamicKey && (
                            <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 5, background: "var(--accent-light)", color: "var(--text)" }}>{item.badge}</span>
                          )}
                          {/* Dynamic badge */}
                          {dynCount !== undefined && dynCount > 0 && (
                            <span style={{
                              fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 5,
                              background: isDelay ? "rgba(239,68,68,0.12)" : "var(--accent-light)",
                              color: isDelay ? "#ef4444" : "var(--text)",
                            }}>
                              {dynCount}
                            </span>
                          )}
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* ── Admin card ── */}
        <div style={{ borderTop: "1px solid var(--border)", padding: collapsed ? "12px 0" : "12px", flexShrink: 0 }}>
          <div
            onClick={() => router.push("/admin")}
            title={collapsed ? "Admin Panel" : undefined}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: collapsed ? "0" : "6px 8px",
              justifyContent: collapsed ? "center" : "flex-start",
              borderRadius: 10,
              position: "relative",
              cursor: "pointer",
              transition: "background 0.15s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--accent-light)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            {/* Avatar */}
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0,
              position: "relative",
            }}>
              {(user?.username || "AD").slice(0, 2).toUpperCase()}
              <span style={{ position: "absolute", bottom: -1, right: -1, width: 8, height: 8, borderRadius: "50%", background: "#10b981", border: "2px solid var(--card)" }} />
            </div>

            {!collapsed && (
              <>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.username || "Admin"}</div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{(user?.role || "office_staff").replace("_", " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}</div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleLogout(); }}
                  title="Logout"
                  style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 4, borderRadius: 6, display: "flex", alignItems: "center", flexShrink: 0 }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "#ef4444"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; }}
                >
                  <svg style={{ width: 16, height: 16 }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* ─── Spacer ─── pushes main content right */}
      <div style={{ width: w, flexShrink: 0, transition: "width 0.25s ease" }} />

      {/* Ping animation keyframes */}
      <style>{`
        @keyframes ping{75%,100%{transform:scale(2);opacity:0}}
        .sidebar-nav::-webkit-scrollbar{width:3px}
        .sidebar-nav::-webkit-scrollbar-track{background:transparent}
        .sidebar-nav::-webkit-scrollbar-thumb{background:var(--text-muted);border-radius:10px}
        .sidebar-nav{scrollbar-width:thin;scrollbar-color:var(--text-muted) transparent}
      `}</style>
    </>
  );
}
