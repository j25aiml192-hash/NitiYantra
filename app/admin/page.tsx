"use client";

import { useState } from "react";

/* ─── Demo data ─── */
const DEMO_USERS = [
  {
    username: "admin",
    role: "Admin",
    email: "admin@NitiYantra.gov",
    status: "Active",
  },
  {
    username: "viewer",
    role: "Viewer",
    email: "viewer@NitiYantra.gov",
    status: "Active",
  },
];

/* ─── Sub-components ─── */
function RoleBadge({ role }: { role: string }) {
  const cls =
    role === "Admin"
      ? "bg-indigo-50 text-indigo-700 border-indigo-200"
      : "bg-[var(--bg)] text-[var(--text-secondary)] border-[var(--border)]";
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${cls}`}>
      {role}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border bg-emerald-50 text-emerald-700 border-emerald-200">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
      {status}
    </span>
  );
}

/* ─── Admin Page ─── */
export default function AdminPage() {
  const [tooltipVisible, setTooltipVisible] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <main className="p-6 max-w-3xl mx-auto space-y-6">
        {/* Page heading */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--text)]">Admin Panel</h1>
            <p className="text-sm text-[var(--text-muted)]">
              Manage users, roles, and platform configuration
            </p>
          </div>

          {/* Invite button with tooltip */}
          <div className="relative">
            <button
              disabled
              aria-disabled="true"
              onMouseEnter={() => setTooltipVisible(true)}
              onMouseLeave={() => setTooltipVisible(false)}
              onFocus={() => setTooltipVisible(true)}
              onBlur={() => setTooltipVisible(false)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-100 text-indigo-400 text-sm font-medium border border-indigo-200 cursor-not-allowed opacity-70 select-none"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Invite User
            </button>
            {tooltipVisible && (
              <div className="absolute right-0 top-full mt-2 px-3 py-1.5 bg-slate-800 text-white text-xs rounded-lg whitespace-nowrap shadow-lg z-50 pointer-events-none">
                Coming in v2
                <div className="absolute -top-1 right-4 w-2 h-2 bg-slate-800 rotate-45" />
              </div>
            )}
          </div>
        </div>
        {/* Info notice */}
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-amber-800 font-medium">
            Access Control is in admin-only mode. Full CRUD support is coming in v2.
          </p>
        </div>

        {/* Users table */}
        <div
          className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6"
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
        >
          <div className="mb-5">
            <h3 className="text-base font-semibold text-[var(--text)]">Platform Users</h3>
            <p className="text-xs text-[var(--text-muted)]">{DEMO_USERS.length} users registered</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  {["Username", "Role", "Email", "Status"].map((h) => (
                    <th
                      key={h}
                      className="text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider pb-3 pr-6"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {DEMO_USERS.map((user) => (
                  <tr key={user.username} className="hover:bg-[var(--bg)] transition-colors">
                    <td className="py-4 pr-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {user.username[0].toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-[var(--text)]">{user.username}</span>
                      </div>
                    </td>
                    <td className="py-4 pr-6">
                      <RoleBadge role={user.role} />
                    </td>
                    <td className="py-4 pr-6 text-sm text-[var(--text-muted)] font-mono">{user.email}</td>
                    <td className="py-4">
                      <StatusBadge status={user.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Roles legend */}
        <div
          className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5"
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
        >
          <h4 className="text-sm font-semibold text-[var(--text)] mb-3">Role Permissions</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              {
                role: "Admin",
                perms: "Full access: manage users, view all data, configure settings",
                color: "text-indigo-700 bg-indigo-50 border-indigo-200",
              },
              {
                role: "Viewer",
                perms: "Read-only: view dashboard, complaints, and reports",
                color: "text-[var(--text-secondary)] bg-[var(--bg)] border-[var(--border)]",
              },
            ].map((r) => (
              <div key={r.role} className={`rounded-xl p-3.5 border ${r.color}`}>
                <p className="text-xs font-bold uppercase tracking-wide mb-1">{r.role}</p>
                <p className="text-xs opacity-80">{r.perms}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
