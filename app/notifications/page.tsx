"use client";

import { useState } from "react";

const notifications = [
  {
    title: "Water Issue — Delhi",
    message: "High priority complaint reported",
    time: "2m ago",
    unread: true,
    category: "water",
  },
  {
    title: "Road Damage — Ghaziabad",
    message: "New complaint assigned to PWD",
    time: "15m ago",
    unread: true,
    category: "road",
  },
  {
    title: "Electricity Fault — Gurgaon",
    message: "Issue resolved successfully",
    time: "1h ago",
    unread: false,
    category: "electricity",
  },
  {
    title: "Garbage Issue — Noida",
    message: "Scheduled for inspection",
    time: "3h ago",
    unread: false,
    category: "sanitation",
  },
  {
    title: "Sewage Overflow — Faridabad",
    message: "Urgent attention required",
    time: "5h ago",
    unread: false,
    category: "water",
  },
  {
    title: "Streetlight Outage — Meerut",
    message: "Complaint forwarded to electrical dept",
    time: "8h ago",
    unread: false,
    category: "electricity",
  },
  {
    title: "Pothole Complaint — Lucknow",
    message: "Under review by road authority",
    time: "12h ago",
    unread: false,
    category: "road",
  },
  {
    title: "Tree Fallen — Chandigarh",
    message: "Municipal team dispatched",
    time: "1d ago",
    unread: false,
    category: "sanitation",
  },
];

const categoryColors: Record<string, string> = {
  water: "bg-blue-100 text-blue-700",
  road: "bg-amber-100 text-amber-700",
  electricity: "bg-yellow-100 text-yellow-700",
  sanitation: "bg-green-100 text-green-700",
};

export default function NotificationsPage() {
  const [filter, setFilter] = useState<string>("all");

  const filtered =
    filter === "all"
      ? notifications
      : filter === "unread"
        ? notifications.filter((n) => n.unread)
        : notifications.filter((n) => n.category === filter);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text)]">
            All Notifications
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Stay updated with the latest complaints and resolutions
          </p>
        </div>
        <span className="text-xs text-gray-400">
          {notifications.filter((n) => n.unread).length} unread
        </span>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {["all", "unread", "water", "road", "electricity", "sanitation"].map(
          (f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize transition-all duration-200 ${
                filter === f
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f}
            </button>
          )
        )}
      </div>

      {/* Notification Cards */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">
            No notifications match this filter.
          </p>
        )}
        {filtered.map((item, idx) => (
          <div
            key={item.title}
            className={`
              p-4 rounded-xl border transition-all duration-300
              hover:-translate-y-0.5 hover:shadow-md
              ${
                item.unread
                  ? "bg-blue-50/60 border-blue-100"
                  : "bg-[var(--card)] border-[#e2e8f0]"
              }
            `}
            style={{
              animation: `notifPageFadeIn 0.35s ease-out ${idx * 0.05}s both`,
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {item.unread && (
                    <span className="w-2 h-2 rounded-full bg-[#4f7df3] shrink-0" />
                  )}
                  <p className="text-sm font-medium text-[var(--text)]">
                    {item.title}
                  </p>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${categoryColors[item.category] || ""}`}
                  >
                    {item.category}
                  </span>
                </div>
                <p className="text-sm text-[var(--text-muted)]">{item.message}</p>
              </div>
              <span className="text-xs text-gray-400 whitespace-nowrap">
                {item.time}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Inline keyframes */}
      <style>{`
        @keyframes notifPageFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
