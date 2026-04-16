"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { getCurrentUser } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { 
  House, 
  ClipboardText, 
  SquaresFour, 
  MapPin, 
  User, 
  Globe, 
  Lightning, 
  Strategy, 
  ChatCircleDots,
  Sidebar as SidebarIcon,
  MagnifyingGlass,
  SignOut
} from "@phosphor-icons/react";

/* ────────────────────────────────────────────────────── */
/*  NAV CONFIGURATION                                     */
/* ────────────────────────────────────────────────────── */
interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
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
    title: "Governance Command",
    items: [
      { label: "Command Center", href: "/dashboard", icon: House },
      { label: "Grievance Intelligence", href: "/complaints", icon: ClipboardText, dynamicKey: "total_complaints" },
      { label: "AI Pipeline", href: "/ai-pipeline", icon: SquaresFour },
      { label: "Geographic Monitor", href: "/heatmap", icon: MapPin },
      { label: "My Work", href: "/my-work", icon: User },
      { label: "Crowd Monitor", href: "/social", icon: Globe },
    ],
  },
  {
    title: "Election Intelligence",
    items: [
      { label: "Election Resource Engine", href: "/election", icon: Lightning },
      { label: "ONOE Simulator", href: "/simulator", icon: Strategy },
      { label: "Policy Debate Arena", href: "/debate", icon: ChatCircleDots },
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
    politician: ["/dashboard", "/complaints", "/ai-pipeline", "/heatmap", "/election", "/simulator", "/debate"],
    dept_worker: ["/dashboard", "/complaints", "/my-work", "/settings"],
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
                background: "linear-gradient(135deg, #2563EB, #1D4ED8)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, padding: 5,
              }}
            >
              <Image src="/nityantralogo.svg" alt="NitiYantra" width={20} height={20} style={{ filter: "invert(1)" }} />
            </div>
            {!collapsed && (
              <div style={{ whiteSpace: "nowrap", opacity: 1, transition: "opacity 0.15s ease 0.1s" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", lineHeight: 1.2 }}>NitiYantra</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.03em" }}>नीतियंत्र</div>
              </div>
            )}
          </div>

          {/* Collapse button — shown when expanded */}
          {!collapsed && (
            <button onClick={toggle} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 4, borderRadius: 6, display: "flex", alignItems: "center", flexShrink: 0 }} title="Collapse sidebar">
              <SidebarIcon size={18} weight="duotone" />
            </button>
          )}
        </div>

        {/* Expand button — shown when collapsed */}
        {collapsed && (
          <button onClick={toggle} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "12px 0", display: "flex", justifyContent: "center", width: "100%" }} title="Expand sidebar">
            <SidebarIcon size={18} weight="duotone" mirrored />
          </button>
        )}

        {/* ── Search (expanded only) ── */}
        {!collapsed && (
          <div style={{ padding: "8px 12px" }}>
            <div style={{ position: "relative" }}>
              <MagnifyingGlass 
                size={14} 
                weight="bold"
                style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} 
              />
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
                      <item.icon 
                        size={ collapsed ? 20 : 18 } 
                        weight="duotone" 
                        style={{ flexShrink: 0, color: active ? "var(--accent)" : "inherit" }} 
                      />
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
            onClick={() => router.push("/settings")}
            title={collapsed ? "Settings" : undefined}
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
              background: "linear-gradient(135deg, #2563EB, #8b5cf6)",
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
                  <SignOut size={16} weight="bold" />
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
