"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import DecisionExtractorModal from "@/components/DecisionExtractorModal";
import { FileText, Bell } from "@phosphor-icons/react";

interface HeaderProps {
  sidebarOpen?: boolean;
}

export default function Header({ sidebarOpen = true }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [openNotif, setOpenNotif] = useState(false);
  const [allRead, setAllRead] = useState(false);
  const [showExtractor, setShowExtractor] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setOpenNotif(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* Broadcast notification panel state to other components (e.g. heatmap) */
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("notif-toggle", { detail: { open: openNotif } }));
  }, [openNotif]);

  /* Hide on landing & login pages */
  if (pathname === "/" || pathname === "/login") return null;

  const sidebarWidth = sidebarOpen ? 240 : 60;

  return (
    <>
    <header
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        height: 64,
        zIndex: 999,
        background: "var(--card)",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        padding: "0 24px",
        left: sidebarWidth,
        transition: "left 0.25s ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16, position: "relative" }}>

        {/* Decision Extractor Button */}
        <button
          onClick={() => setShowExtractor(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-all duration-200 shadow-sm shadow-indigo-500/20"
        >
          <FileText size={18} weight="duotone" />
          Decision Extractor
        </button>

        {/* Notification Bell */}
        {(() => {
          const notifications = [
            { title: "Water Issue — Delhi", desc: "High priority complaint reported", time: "2m ago", unread: true },
            { title: "Road Damage — Ghaziabad", desc: "New complaint assigned to PWD", time: "15m ago", unread: true },
            { title: "Electricity Fault — Gurgaon", desc: "Issue resolved successfully", time: "1h ago", unread: false },
            { title: "Garbage Issue — Noida", desc: "Scheduled for inspection", time: "3h ago", unread: false },
          ];
          const unreadCount = allRead ? 0 : notifications.filter(n => n.unread).length;

          return (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); setOpenNotif(!openNotif); }}
                className="relative p-2 rounded-full transition-all duration-200"
                style={{ background: "var(--card)", display: "flex", alignItems: "center", justifyContent: "center" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--card-hover)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "var(--card)"; }}
              >
                <Bell size={24} weight="duotone" style={{ color: "var(--text)" }} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 text-[10px] font-bold bg-[#ef4444] text-white rounded-full flex items-center justify-center shadow-sm">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown — Glass UI */}
              {openNotif && (
                <div
                  ref={notifRef}
                  className="absolute right-0 top-14 w-80 rounded-2xl p-4 z-[9999]"
                  style={{ background: "var(--card)", backdropFilter: "blur(16px)", border: "1px solid var(--border)", boxShadow: "0 20px 50px rgba(0,0,0,0.15)", animation: "notifSlideIn 0.3s ease-out" }}
                >
                  <style>{`
                    @keyframes notifSlideIn {
                      from { opacity: 0; transform: translateY(8px); }
                      to   { opacity: 1; transform: translateY(0); }
                    }
                    @keyframes notifItemFadeIn {
                      from { opacity: 0; transform: translateY(6px); }
                      to   { opacity: 1; transform: translateY(0); }
                    }
                    @keyframes fadeIn {
                      from { opacity: 0; transform: translateY(6px); }
                      to   { opacity: 1; transform: translateY(0); }
                    }
                    .notif-scroll::-webkit-scrollbar { width: 4px; }
                    .notif-scroll::-webkit-scrollbar-track { background: transparent; }
                    .notif-scroll::-webkit-scrollbar-thumb { background: var(--text-muted); border-radius: 10px; }
                    .notif-scroll { scrollbar-width: thin; scrollbar-color: var(--text-muted) transparent; }
                  `}</style>

                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Notifications</h3>
                    <button
                      onClick={() => setAllRead(true)}
                      className={`text-xs transition-colors duration-200 ${allRead ? 'text-gray-400 cursor-default' : 'text-gray-500 hover:text-[#4f7df3]'}`}
                    >
                      {allRead ? 'All read ✓' : 'Mark all read'}
                    </button>
                  </div>

                  {/* Notification Items */}
                  <div className="max-h-64 overflow-y-auto notif-scroll space-y-1" style={{ animation: 'fadeIn 0.4s ease-out' }}>
                    {notifications.map((item, idx) => {
                      const isUnread = item.unread && !allRead;
                      const isLatest = idx === 0 && isUnread;

                      return (
                        <div
                          key={item.title}
                          className={`
                            flex gap-3 items-start p-3 rounded-xl cursor-pointer
                            transition-all duration-300 ease-out
                            ${isLatest
                            ? "border hover:opacity-90"
                            : "backdrop-blur-md border border-transparent hover:border-[var(--border)]"
                            }
                            hover:-translate-y-1 hover:shadow-md
                          `}
                          style={{ 
                            animation: `notifItemFadeIn 0.4s ease-out ${idx * 0.06}s both`,
                            background: isLatest ? "var(--accent-light)" : "var(--card)",
                            borderColor: isLatest ? "var(--accent)" : "transparent",
                          }}
                        >
                          {/* Status dot */}
                          <span className={`w-2 h-2 mt-2 rounded-full shrink-0 ${isUnread ? 'bg-[#4f7df3]' : 'bg-gray-300'}`} />

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium" style={{ color: "var(--text)" }}>{item.title}</p>
                            <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{item.desc}</p>
                            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{item.time}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* View All */}
                  <button
                    onClick={() => {
                      setOpenNotif(false);
                      router.push("/notifications");
                    }}
                    className="w-full text-sm hover:text-[#4f7df3] transition-colors duration-200 mt-3 pt-3"
                    style={{ color: "var(--text-muted)", borderTop: "1px solid var(--border)" }}
                  >
                    View all notifications
                  </button>
                </div>
              )}
            </>
          );
        })()}
      </div>
    </header>
    <DecisionExtractorModal isOpen={showExtractor} onClose={() => setShowExtractor(false)} onRefresh={() => router.refresh()} />
    </>
  );
}
