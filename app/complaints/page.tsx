"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchComplaints, createComplaint, classifyComplaint, assignComplaint, getDepartmentStaff, getCurrentUser } from "@/lib/api";
import { SkeletonTable } from "@/components/Skeleton";
import toast from "react-hot-toast";

/* ─── constants ─── */
const STATUSES = ["all", "pending", "in_progress", "resolved", "escalated"] as const;
const CATEGORIES = ["all", "Roads", "Water Supply", "Electricity", "Sanitation", "Public Safety"] as const;
const DISTRICTS = ["all", "Noida", "Ghaziabad", "Delhi", "Gurugram", "Faridabad"] as const;

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  in_progress: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  resolved: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  escalated: "bg-red-500/10 text-red-500 border-red-500/20",
};

const CATEGORY_COLORS: Record<string, string> = {
  Roads: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  "Water Supply": "bg-blue-500/10 text-blue-500 border-blue-500/20",
  Electricity: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  Sanitation: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  "Public Safety": "bg-red-500/10 text-red-500 border-red-500/20",
};

const DEPT_NAMES: Record<number, string> = {
  21: "PWD", 22: "Jal Board", 23: "DESU", 24: "MCD", 25: "Delhi Police",
};

const SOURCE_ICONS: Record<string, string> = {
  web: "🌐", mobile_app: "📱", phone: "📞", email: "📧", twitter: "🐦",
};

/* ─── types ─── */
interface Complaint {
  id: number;
  text: string;
  source: string;
  date_submitted: string;
  district: string;
  category: string;
  status: string;
  department_id: number | null;
  assigned_to: number | null;
  assigned_at: string | null;
  escalated: boolean;
  escalation_reason: string | null;
}

interface StaffMember {
  id: number;
  username: string;
  email: string;
}

/* ─── main page ─── */
export default function ComplaintsPage() {

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Complaint | null>(null);

  /* filters */
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [districtFilter, setDistrictFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  /* grievance modal */
  const [showGrievanceModal, setShowGrievanceModal] = useState(false);

  /* assignment panel state */
  const currentUser = getCurrentUser();
  const [assignDeptId, setAssignDeptId] = useState<number | null>(null);
  const [assignStaffId, setAssignStaffId] = useState<number | null>(null);
  const [assignNotes, setAssignNotes] = useState("");
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [loadingStaff, setLoadingStaff] = useState(false);

  const loadComplaints = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchComplaints();
      const sorted = Array.isArray(data) ? data.sort((a, b) => b.id - a.id) : [];
      setComplaints(sorted);
    } catch {
      toast.error("Failed to load complaints");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadComplaints(); }, [loadComplaints]);

  /* filtered list */
  const filtered = complaints.filter((c) => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (categoryFilter !== "all" && c.category !== categoryFilter) return false;
    if (districtFilter !== "all" && c.district !== districtFilter) return false;
    if (search && !c.text.toLowerCase().includes(search.toLowerCase()) && !c.district.toLowerCase().includes(search.toLowerCase()) && !c.category.toLowerCase().includes(search.toLowerCase()) && !`#${c.id}`.includes(search)) return false;
    return true;
  });

  /* pagination */
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  /* reset page when filters change */
  useEffect(() => { setCurrentPage(1); }, [statusFilter, categoryFilter, districtFilter, search]);

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
    catch { return "N/A"; }
  };

  const statusCounts = {
    all: complaints.length,
    pending: complaints.filter((c) => c.status === "pending").length,
    in_progress: complaints.filter((c) => c.status === "in_progress").length,
    resolved: complaints.filter((c) => c.status === "resolved").length,
    escalated: complaints.filter((c) => c.status === "escalated" || c.escalated).length,
  };

  /* fetch staff when department changes */
  const handleDeptChange = async (deptId: number) => {
    setAssignDeptId(deptId);
    setAssignStaffId(null);
    setStaffList([]);
    if (deptId) {
      setLoadingStaff(true);
      try {
        const staff = await getDepartmentStaff(deptId);
        setStaffList(staff);
      } catch { /* swallow */ }
      setLoadingStaff(false);
    }
  };

  const handleAssign = async () => {
    if (!selected || !assignDeptId) return;
    setAssigning(true);
    try {
      await assignComplaint(selected.id, {
        department_id: assignDeptId,
        assigned_to: assignStaffId || undefined,
        notes: assignNotes || undefined,
      });
      toast.success(`Complaint assigned to ${DEPT_NAMES[assignDeptId] || "department"}`);
      setSelected(null);
      setAssignDeptId(null);
      setAssignStaffId(null);
      setAssignNotes("");
      loadComplaints();
    } catch {
      toast.error("Failed to assign complaint");
    }
    setAssigning(false);
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] relative overflow-hidden">
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-6">

        {/* ── Page Title ── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--text)]">Grievance Registry</h1>
            <p className="text-sm text-[var(--text-muted)]">Manage and track all registered complaints</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { loadComplaints(); toast.success("Refreshed!"); }}
              disabled={loading}
              className="px-3 py-2 bg-[var(--card)] hover:bg-[var(--bg)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] text-sm font-medium rounded-xl transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <svg className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              Refresh
            </button>
            <button
              onClick={() => setShowGrievanceModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              New Complaint
            </button>
          </div>
        </div>

        {/* Complaint count */}
        <p className="text-xs text-[var(--text-muted)] mb-4">{filtered.length} of {complaints.length} complaints shown</p>

        {/* Status tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 border ${
                statusFilter === s
                  ? "bg-blue-600/10 text-blue-600 border-blue-600/20 shadow-sm"
                  : "bg-[var(--card)] text-[var(--text-muted)] border-[var(--border)] hover:text-[var(--text)] hover:bg-[var(--bg)]"
              }`}
            >
              {s === "all" ? "All" : s.replace("_", " ")}
              <span className={`px-1.5 py-0.5 rounded text-[10px] ${statusFilter === s ? "bg-blue-600/15 text-blue-600" : "bg-[var(--border)] text-[var(--text-muted)]"}`}>
                {statusCounts[s as keyof typeof statusCounts] ?? 0}
              </span>
            </button>
          ))}
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap gap-3 mb-6">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search complaints or ID..."
              className="w-full pl-10 pr-4 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 transition-all"
            />
          </div>

          {/* Category filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-blue-600/30 appearance-none cursor-pointer min-w-[140px]"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c === "all" ? "All Categories" : c}</option>
            ))}
          </select>

          {/* District filter */}
          <select
            value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value)}
            className="px-4 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-blue-600/30 appearance-none cursor-pointer min-w-[140px]"
          >
            {DISTRICTS.map((d) => (
              <option key={d} value={d}>{d === "all" ? "All Districts" : d}</option>
            ))}
          </select>

          {/* Reset */}
          {(statusFilter !== "all" || categoryFilter !== "all" || districtFilter !== "all" || search) && (
            <button
              onClick={() => { setStatusFilter("all"); setCategoryFilter("all"); setDistrictFilter("all"); setSearch(""); }}
              className="px-4 py-2.5 bg-[var(--card)] hover:bg-[var(--bg)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-all"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="max-w-full">
            <SkeletonTable rows={8} />
          </div>
        )}

        {/* Table */}
        {!loading && (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)" }}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--bg)]">
                    <th className="text-left text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider py-3.5 px-5">ID</th>
                    <th className="text-left text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider py-3.5 px-5">Complaint</th>
                    <th className="text-left text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider py-3.5 px-5">Category</th>
                    <th className="text-left text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider py-3.5 px-5">District</th>
                    <th className="text-left text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider py-3.5 px-5">Source</th>
                    <th className="text-left text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider py-3.5 px-5">Date</th>
                    <th className="text-left text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider py-3.5 px-5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {paginated.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => setSelected(c)}
                      className="hover:bg-[var(--bg)] cursor-pointer transition-colors group"
                    >
                      <td className="py-3.5 px-5 text-sm text-[var(--text-muted)] font-mono">#{c.id}</td>
                      <td className="py-3.5 px-5 text-sm text-[var(--text-secondary)] max-w-[280px]">
                        <p className="truncate group-hover:text-[var(--text)] transition-colors">{c.text}</p>
                      </td>
                      <td className="py-3.5 px-5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${CATEGORY_COLORS[c.category] || "bg-[var(--border)] text-[var(--text-secondary)] border-[var(--border)]"}`}>
                          {c.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-sm text-[var(--text-muted)]">{c.district}</td>
                      <td className="py-3.5 px-5 text-sm">
                        <span title={c.source}>{SOURCE_ICONS[c.source] || "📝"}</span>
                      </td>
                      <td className="py-3.5 px-5 text-xs text-[var(--text-muted)] whitespace-nowrap">{formatDate(c.date_submitted)}</td>
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border capitalize ${STATUS_STYLES[c.status] || "bg-[var(--border)] text-[var(--text-secondary)] border-[var(--border)]"}`}>
                            {c.status.replace("_", " ")}
                          </span>
                          {c.assigned_to && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">✅ Assigned</span>
                          )}
                          {c.escalated && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-red-500/10 text-red-500 border border-red-500/20 animate-pulse">🔴 Escalated</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-16 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <svg className="w-10 h-10 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="text-[var(--text-muted)] text-sm">No complaints match your filters</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--border)]">
                <p className="text-xs text-[var(--text-muted)]">
                  Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border)] bg-[var(--card)] text-[var(--text-secondary)] hover:bg-[var(--bg)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                    .map((p, idx, arr) => (
                      <span key={p}>
                        {idx > 0 && arr[idx - 1] !== p - 1 && (
                          <span className="px-1 text-xs text-[var(--text-muted)]">…</span>
                        )}
                        <button
                          onClick={() => setCurrentPage(p)}
                          className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${
                            p === safePage
                              ? "bg-blue-600/10 text-blue-600 border border-blue-600/20"
                              : "text-[var(--text-muted)] hover:bg-[var(--bg)]"
                          }`}
                        >
                          {p}
                        </button>
                      </span>
                    ))}
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage === totalPages}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border)] bg-[var(--card)] text-[var(--text-secondary)] hover:bg-[var(--bg)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══ Slide-in Detail Panel ═══ */}
      {selected && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" onClick={() => setSelected(null)} />

          {/* Panel */}
          <div className="fixed top-0 right-0 h-full w-full max-w-lg bg-[var(--card)] border-l border-[var(--border)] z-50 overflow-y-auto shadow-2xl animate-slide-in">
            {/* Header */}
            <div className="sticky top-0 bg-[var(--card)] backdrop-blur-xl border-b border-[var(--border)] px-6 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-blue-600/20">
                  #{selected.id}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--text)]">Complaint Details</p>
                  <p className="text-[10px] text-[var(--text-muted)]">Submitted {formatDate(selected.date_submitted)}</p>
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="w-8 h-8 rounded-lg bg-[var(--border)] hover:bg-[var(--bg)] border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Status + Category badges */}
              <div className="flex flex-wrap gap-2">
                <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold border capitalize ${STATUS_STYLES[selected.status] || "bg-[var(--border)] text-[var(--text-secondary)] border-[var(--border)]"}`}>
                  {selected.status.replace("_", " ")}
                </span>
                <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold border ${CATEGORY_COLORS[selected.category] || "bg-[var(--border)] text-[var(--text-secondary)] border-[var(--border)]"}`}>
                  {selected.category}
                </span>
              </div>

              {/* Full complaint text */}
              <div>
                <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-semibold mb-2">Complaint Text</p>
                <div className="bg-[var(--bg)] border border-[var(--border)] rounded-xl p-4">
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">{selected.text}</p>
                </div>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[var(--bg)] border border-[var(--border)] rounded-xl p-4">
                  <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-semibold mb-1">District</p>
                  <p className="text-sm font-medium text-[var(--text)] flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {selected.district}
                  </p>
                </div>
                <div className="bg-[var(--bg)] border border-[var(--border)] rounded-xl p-4">
                  <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-semibold mb-1">Source</p>
                  <p className="text-sm font-medium text-[var(--text)] flex items-center gap-2">
                    <span>{SOURCE_ICONS[selected.source] || "📝"}</span>
                    <span className="capitalize">{selected.source.replace("_", " ")}</span>
                  </p>
                </div>
                <div className="bg-[var(--bg)] border border-[var(--border)] rounded-xl p-4">
                  <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-semibold mb-1">Department</p>
                  <p className="text-sm font-medium text-[var(--text)]">
                    {selected.department_id ? DEPT_NAMES[selected.department_id] || `Dept #${selected.department_id}` : "Unassigned"}
                  </p>
                </div>
                <div className="bg-[var(--bg)] border border-[var(--border)] rounded-xl p-4">
                  <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-semibold mb-1">Date</p>
                  <p className="text-sm font-medium text-[var(--text)]">{formatDate(selected.date_submitted)}</p>
                </div>
              </div>

              {/* Complaint ID metadata */}
              <div className="bg-[var(--bg)] border border-[var(--border)] rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--border)] border border-[var(--border)] flex items-center justify-center">
                    <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">Complaint ID</p>
                    <p className="text-sm font-mono font-bold text-[var(--text)]">COMP-{String(selected.id).padStart(4, "0")}</p>
                  </div>
                </div>
                <span className="text-[10px] text-[var(--text-muted)] bg-[var(--border)] px-2 py-1 rounded-md border border-[var(--border)]">
                  {selected.source.toUpperCase()}
                </span>
              </div>
            </div>

              {/* Escalation banner */}
              {selected.escalated && (
                <div className="p-6 pt-0">
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-sm font-bold text-red-500">AUTO-ESCALATED</span>
                    </div>
                    <p className="text-xs text-red-400">
                      {selected.escalation_reason || "Escalated because this complaint was unresolved for 7+ days"}
                    </p>
                  </div>
                </div>
              )}

              {/* Assignment Panel */}
              {currentUser?.role === "office_staff" && selected.status === "pending" && !selected.assigned_to && (
                <div className="px-6 pb-6">
                  <div className="border-t border-[var(--border)] pt-5">
                    <h4 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2 mb-4">
                      🔀 Assign & Route
                    </h4>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-semibold mb-1.5">Department</label>
                        <select
                          value={assignDeptId || ""}
                          onChange={(e) => handleDeptChange(Number(e.target.value))}
                          className="w-full px-3 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-blue-600/30 appearance-none cursor-pointer"
                        >
                          <option value="">Select department...</option>
                          {Object.entries(DEPT_NAMES).map(([id, name]) => (
                            <option key={id} value={id}>{name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-semibold mb-1.5">Assign To</label>
                        <select
                          value={assignStaffId || ""}
                          onChange={(e) => setAssignStaffId(Number(e.target.value) || null)}
                          disabled={!assignDeptId || loadingStaff}
                          className="w-full px-3 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-blue-600/30 appearance-none cursor-pointer disabled:opacity-50"
                        >
                          <option value="">{loadingStaff ? "Loading..." : staffList.length ? "Select staff..." : "No staff"}</option>
                          {staffList.map((s) => (
                            <option key={s.id} value={s.id}>{s.username}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <textarea
                      value={assignNotes}
                      onChange={(e) => setAssignNotes(e.target.value)}
                      placeholder="Optional notes..."
                      rows={2}
                      className="w-full px-3 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-blue-600/30 transition-all resize-none mb-3"
                    />
                    <button
                      onClick={handleAssign}
                      disabled={!assignDeptId || assigning}
                      className="w-full py-3 bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-600 hover:to-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {assigning ? (
                        <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>Assigning...</>
                      ) : (
                        <>🔀 Assign & Route</>
                      )}
                    </button>
                  </div>
                </div>
              )}
          </div>
        </>
      )}

      {/* CSS */}
      <style jsx>{`
        @keyframes slide-in {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
        @keyframes fadeScaleIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-modal-in {
          animation: fadeScaleIn 0.4s ease-out;
        }
      `}</style>

      {/* ═══ File Grievance Modal ═══ */}
      {showGrievanceModal && (
        <GrievanceModal
          onClose={() => setShowGrievanceModal(false)}
          onSuccess={() => { setShowGrievanceModal(false); loadComplaints(); }}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════ */
/*  GRIEVANCE MODAL                                    */
/* ═══════════════════════════════════════════════════ */
const GRIEVANCE_DISTRICTS = ["Noida", "Ghaziabad", "Delhi", "Gurugram", "Faridabad"];
const GRIEVANCE_SOURCES = ["Portal", "WhatsApp", "Phone", "Email"];
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const FORM_CATEGORY_COLORS: Record<string, string> = {
  Roads: "bg-amber-500", "Water Supply": "bg-blue-500", Electricity: "bg-yellow-500",
  Sanitation: "bg-emerald-500", "Public Safety": "bg-red-500", Other: "bg-slate-500",
};
const DEPT_MAP: Record<string, string> = {
  Roads: "PWD", "Water Supply": "Jal Board", Electricity: "DESU",
  Sanitation: "MCD", "Public Safety": "Delhi Police", Other: "MCD",
};

interface ClassifyResult {
  category: string; confidence: number; department: string; complaintId: number | null;
}

function RoutingTimeline({ result, onReset, onViewAll }: { result: ClassifyResult; onReset: () => void; onViewAll: () => void }) {
  const [step, setStep] = useState(0);
  const [progressWidth, setProgressWidth] = useState(0);
  const [confidenceWidth, setConfidenceWidth] = useState(0);

  useEffect(() => {
    setStep(1);
    const t2 = setTimeout(() => { setStep(2); setProgressWidth(0); setTimeout(() => setProgressWidth(100), 50); }, 800);
    const t3 = setTimeout(() => { setStep(3); setTimeout(() => setConfidenceWidth(result.confidence), 50); }, 1600);
    const t4 = setTimeout(() => setStep(4), 2400);
    const t5 = setTimeout(() => setStep(5), 3200);
    return () => { clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5); };
  }, [result.confidence]);

  const confColor = result.confidence >= 85 ? "bg-blue-500" : result.confidence >= 70 ? "bg-blue-400" : "bg-blue-300";

  const steps = [
    { id: 1, icon: "✅", title: "Complaint Received", sub: "Your complaint has been logged in the system" },
    { id: 2, icon: "⚡", title: "AI Analyzing...", sub: "Running NitiYantra Keyword Engine v1", hasProgress: true },
    { id: 3, icon: "🏷", title: `Classified: ${result.category}`, sub: `Confidence: ${result.confidence}%`, hasConfidence: true },
    { id: 4, icon: "🔀", title: `Routing to ${result.department}`, sub: "Assigning to responsible department", hasDept: true },
    { id: 5, icon: "✅", title: "Successfully Assigned", sub: result.complaintId ? `Complaint #${result.complaintId} is now being tracked` : "Your complaint is now being tracked", hasActions: true },
  ];

  return (
    <div className="bg-[var(--card)] rounded-2xl border border-blue-500/20 p-8 shadow-xl" style={{ boxShadow: '0 0 0 1px rgba(37,99,235,0.08), 0 8px 40px rgba(37,99,235,0.08)' }}>
      <style>{`
        @keyframes slideIn { from { opacity:0; transform:translateX(-20px); } to { opacity:1; transform:translateX(0); } }
        @keyframes popIn { from { opacity:0; transform:scale(0.8); } to { opacity:1; transform:scale(1); } }
        @keyframes bounce-check { 0% { transform:scale(0.5); } 60% { transform:scale(1.15); } 100% { transform:scale(1); } }
        @keyframes glow-pulse { 0%,100% { box-shadow:0 0 8px rgba(37,99,235,0.3); } 50% { box-shadow:0 0 24px rgba(37,99,235,0.5); } }
        @keyframes dash-flow { to { stroke-dashoffset: 0; } }
        .step-slide { animation: slideIn 0.35s cubic-bezier(0.22,1,0.36,1) forwards; }
        .step-pop { animation: popIn 0.35s cubic-bezier(0.22,1,0.36,1) forwards; }
        .step-bounce { animation: bounce-check 0.5s cubic-bezier(0.22,1,0.36,1) forwards; }
        .glow { animation: glow-pulse 1.5s ease-in-out infinite; }
      `}</style>
      <div className="relative">
        <div className="absolute left-[15px] top-4 bottom-4 w-[2px]" style={{ background: step >= 5 ? "linear-gradient(to bottom, #2563EB, #3B82F6)" : "linear-gradient(to bottom, #2563EB, var(--border))" }} />
        <div className="space-y-0">
          {steps.map((s) => {
            const isActive = step === s.id;
            const isCompleted = step > s.id;
            const isVisible = step >= s.id;
            if (!isVisible) return (
              <div key={s.id} className="flex items-start gap-4 py-4 opacity-0">
                <div className="w-8 h-8 rounded-full border-2 border-[var(--border)] shrink-0 z-10" /><div />
              </div>
            );
            return (
              <div key={s.id} className={`flex items-start gap-4 py-4 ${s.id === 3 ? "step-pop" : "step-slide"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 z-10 transition-all ${isCompleted ? "bg-blue-600 text-white" : isActive && s.id === 5 ? "bg-blue-600 text-white step-bounce" : isActive ? "bg-blue-600 text-white glow" : "border-2 border-[var(--border)] text-[var(--text-secondary)]"}`}>
                  {isCompleted ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg> : <span className="text-xs">{s.icon}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${isActive || isCompleted ? "text-blue-600" : "text-[var(--text-muted)]"}`}>{s.title}</p>
                  <p className={`text-xs mt-0.5 text-[var(--text-muted)]`}>{s.sub}</p>
                  {s.hasProgress && isActive && (
                    <div className="mt-3 h-1.5 bg-[var(--border)] rounded-full overflow-hidden w-48">
                      <div className="h-full rounded-full" style={{ width: `${progressWidth}%`, transition: "width 0.8s cubic-bezier(0.22,1,0.36,1)", background: "linear-gradient(90deg, #2563EB, #3B82F6)" }} />
                    </div>
                  )}
                  {s.hasConfidence && (isActive || isCompleted) && (
                    <div className="mt-3 space-y-2">
                      <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold text-white bg-blue-600">{result.category}</span>
                      <div className="w-48"><div className="h-1.5 bg-[var(--border)] rounded-full overflow-hidden"><div className={`h-full rounded-full ${confColor}`} style={{ width: `${confidenceWidth}%`, transition: "width 0.8s cubic-bezier(0.22,1,0.36,1)" }} /></div></div>
                    </div>
                  )}
                  {s.hasDept && (isActive || isCompleted) && (
                    <div className="mt-3 flex items-center gap-3">
                      <svg width="48" height="2" className="overflow-visible"><line x1="0" y1="1" x2="48" y2="1" stroke="#2563EB" strokeWidth="2" strokeDasharray="4 3" strokeDashoffset="48" style={{ animation: "dash-flow 0.6s ease forwards" }} /></svg>
                      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600/15 border border-blue-500/30 text-blue-600 text-xs font-bold uppercase tracking-wider">{result.department}</span>
                    </div>
                  )}
                  {s.hasActions && isActive && (
                    <div className="mt-5 flex flex-wrap gap-3">
                      <button onClick={onReset} className="px-5 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] text-xs font-semibold hover:bg-[var(--border)] transition-all">Submit Another</button>
                      <button onClick={onViewAll} className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500 shadow-lg shadow-blue-600/20 transition-all">View All Complaints →</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function GrievanceModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [text, setText] = useState("");
  const [district, setDistrict] = useState(GRIEVANCE_DISTRICTS[0]);
  const [source, setSource] = useState(GRIEVANCE_SOURCES[0]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ClassifyResult | null>(null);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) { toast.error("Please enter complaint details"); return; }
    setLoading(true);
    setResult(null);
    try {
      // Step 1: Classify first to get the correct category
      const aiRes = await classifyComplaint(text);
      const category = aiRes.category;
      const confidence = Math.round(aiRes.confidence * 100);
      const department = DEPT_MAP[category] || "MCD";

      // Step 2: Map department name to department_id (production DB IDs)
      const DEPT_ID_MAP: Record<string, number> = {
        "PWD": 21, "Jal Board": 22, "DESU": 23, "MCD": 24, "Delhi Police": 25,
      };
      const deptId = DEPT_ID_MAP[department] || 24;

      // Step 3: Create complaint WITH the AI-classified category and department
      const complaintRes = await createComplaint({
        text, district, source: source.toLowerCase(),
        category: category,
        status: "in_progress",
        department_id: deptId,
      });
      setResult({ category, confidence, department, complaintId: complaintRes?.id ?? null });
      toast.success("Complaint submitted and classified!");
    } catch {
      toast.error("Failed to submit complaint");
    } finally {
      setLoading(false);
    }
  }, [text, district, source]);

  const handleReset = () => { setText(""); setResult(null); };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-md" />

      {/* Modal */}
      <div className="relative z-50 w-full max-w-2xl mx-auto animate-modal-in">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-[var(--card)] shadow-lg border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:scale-110 transition-all z-10"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Glass card */}
        <div className="bg-[var(--card)] backdrop-blur-xl border border-[var(--border)] rounded-2xl p-8 shadow-[0_20px_60px_rgba(0,0,0,0.15)]">
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-600/10 border border-blue-600/20 text-blue-600 text-xs font-medium mb-4">New Grievance</div>
            <h2 className="text-2xl font-bold text-[var(--text)] mb-1">File Grievance</h2>
            <p className="text-sm text-[var(--text-muted)]">Describe the issue clearly. Our AI will automatically classify it and route it to the correct department.</p>
          </div>

          {!result ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Complaint Details</label>
                <textarea
                  rows={4}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="w-full px-4 py-3 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--text)] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600 transition-all resize-none"
                  placeholder="Describe the issue in detail..."
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">District</label>
                  <select value={district} onChange={(e) => setDistrict(e.target.value)} className="w-full px-4 py-3 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-blue-600/50 transition-all appearance-none cursor-pointer">
                    {GRIEVANCE_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Source</label>
                  <select value={source} onChange={(e) => setSource(e.target.value)} className="w-full px-4 py-3 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-blue-600/50 transition-all appearance-none cursor-pointer">
                    {GRIEVANCE_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-600 hover:to-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>Processing via AI...</>
                ) : (
                  <><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>Submit &amp; Classify</>
                )}
              </button>
            </form>
          ) : (
            <RoutingTimeline result={result} onReset={handleReset} onViewAll={() => { onSuccess(); }} />
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeScaleIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-modal-in { animation: fadeScaleIn 0.4s ease-out; }
      `}</style>
    </div>
  );
}
