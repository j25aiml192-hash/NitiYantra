const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/* ─── Shared Types ─── */
export interface DashboardStats {
  total_complaints: number;
  active_issues: number;
  resolved_today: number;
  delayed_issues: number;
  complaints_by_category: Record<string, number>;
  complaints_by_department: Record<string, number>;
  complaints_over_time: Record<string, number>;
}

export interface DepartmentPerformance {
  department_name: string;
  head: string;
  total_issues: number;
  resolved_issues: number;
  delayed_issues: number;
  active_issues: number;
  avg_resolution_days: number;
}

export interface ComplaintResponse {
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

export interface ComplaintCreateInput {
  text: string;
  district: string;
  source: string;
  category: string;
  status: string;
  department_id?: number;
}

export interface DelayedIssue {
  issue_id: number;
  complaint_id: number;
  department_id: number;
  status: string;
  days_open: number;
  last_updated: string | null;
  is_delayed: boolean;
}

export interface ClassifyResult {
  category: string;
  confidence: number;
}

export interface ClusterResult {
  cluster_id: number;
  label: string;
  complaint_ids: number[];
}

export interface LoginUser {
  id: number;
  username: string;
  email: string;
  role: string;
  department_id: number | null;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: LoginUser;
}

/* ─── Auth helpers ─── */
export function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("nityantra_token");
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export function getCurrentUser(): LoginUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("nityantra_user");
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

/* ─── Dashboard ─── */
export async function fetchStats(): Promise<DashboardStats> {
  const res = await fetch(`${API}/dashboard/stats`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch stats");
  return res.json();
}

export async function fetchPerformance(): Promise<DepartmentPerformance[]> {
  const res = await fetch(`${API}/dashboard/performance`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch performance");
  return res.json();
}

/* ─── Complaints ─── */
export async function fetchComplaints(): Promise<ComplaintResponse[]> {
  const res = await fetch(`${API}/complaints/`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch complaints");
  return res.json();
}

export async function createComplaint(data: ComplaintCreateInput): Promise<ComplaintResponse> {
  const res = await fetch(`${API}/complaints/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create complaint");
  return res.json();
}

/* ─── Issues ─── */
export async function fetchDelayed(): Promise<DelayedIssue[]> {
  const res = await fetch(`${API}/issues/delayed`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch delayed issues");
  return res.json();
}

export async function fetchDelayedAI(): Promise<DelayedIssue[]> {
  const res = await fetch(`${API}/ai/delays`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch AI delays");
  return res.json();
}

export async function updateIssueStatus(issueId: number, status: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${API}/issues/${issueId}/status`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Failed to update issue status");
  return res.json();
}

/* ─── AI Pipeline ─── */
export async function classifyComplaint(text: string): Promise<ClassifyResult> {
  const res = await fetch(`${API}/ai/classify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error("Failed to classify complaint");
  return res.json();
}

export async function fetchClusters(): Promise<ClusterResult[]> {
  const res = await fetch(`${API}/ai/clusters`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch clusters");
  return res.json();
}

/* ─── Full Pipeline ─── */
export async function runFullPipeline(): Promise<{
  classified: Array<{ id: number; text: string; predicted_category: string; confidence: number }>;
  clusters: Array<{ cluster_label: string; complaints: Array<{ id: number; text: string }> }>;
  delayed_issues: Record<string, unknown>;
}> {
  const res = await fetch(`${API}/ai/pipeline`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to run pipeline");
  return res.json();
}

/* ─── Auth ─── */
export async function loginUser(username: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username, password }),
  });
  if (!res.ok) {
    const err: { detail?: string } = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Login failed");
  }
  return res.json();
}

/* ─── CRM: Assignment & Escalation ─── */
export async function assignComplaint(complaintId: number, data: { department_id: number; assigned_to?: number; notes?: string }): Promise<ComplaintResponse> {
  const res = await fetch(`${API}/complaints/${complaintId}/assign`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to assign");
  return res.json();
}

export async function getDepartmentStaff(deptId: number): Promise<Array<{ id: number; username: string; email: string }>> {
  const res = await fetch(`${API}/complaints/staff/${deptId}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error("Failed to fetch staff");
  return res.json();
}

export async function autoEscalate(): Promise<{ escalated_count: number; message: string }> {
  const res = await fetch(`${API}/complaints/auto-escalate`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to auto-escalate");
  return res.json();
}

/* ─── Department-Filtered ─── */
export interface DeptStats {
  total: number;
  pending: number;
  in_progress: number;
  resolved: number;
  escalated: number;
  overdue: number;
  received_this_week: number;
}

export async function fetchComplaintsByDepartment(deptId: number): Promise<ComplaintResponse[]> {
  const res = await fetch(`${API}/complaints/by-department/${deptId}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch department complaints");
  return res.json();
}

export async function fetchDepartmentStats(deptId: number): Promise<DeptStats> {
  const res = await fetch(`${API}/complaints/department-stats/${deptId}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch department stats");
  return res.json();
}

/* ─── Election Engine ─── */
export async function getStatesMeta(): Promise<Array<{
  name: string; voters_cr: number; constituencies: number;
  booths: number; last_election_year: number; term_end_year: number;
  capital: string; type: string;
}>> {
  const res = await fetch(`${API}/election/states-meta`);
  if (!res.ok) throw new Error("Failed to fetch states meta");
  return res.json();
}

export async function computeElection(params: {
  state: string; target_year?: number; inflation?: number;
  pop_growth?: number; crisis_factor?: number;
}): Promise<Record<string, unknown>> {
  const res = await fetch(`${API}/election/compute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error("Failed to compute election");
  return res.json();
}

/* ─── ONOE Simulator ─── */
export async function runSimulation(params: {
  base_year?: number; collapse_prob?: number;
  phases?: number; evm_millions?: number; seed?: number;
}): Promise<Record<string, unknown>> {
  const res = await fetch(`${API}/simulator/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error("Failed to run simulation");
  return res.json();
}

export async function getSimulatorPresets(): Promise<Record<string, unknown>> {
  const res = await fetch(`${API}/simulator/presets`);
  if (!res.ok) throw new Error("Failed to fetch presets");
  return res.json();
}

export async function dissolveState(state: string, dissolution_year?: number): Promise<Record<string, unknown>> {
  const res = await fetch(`${API}/simulator/dissolve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state, dissolution_year }),
  });
  if (!res.ok) throw new Error("Failed to dissolve state");
  return res.json();
}

/* ─── Spotlight Debate ─── */
export async function generateDebate(topic: string, language: string = "en"): Promise<Record<string, unknown>> {
  const res = await fetch(`${API}/debate/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic, language }),
  });
  if (!res.ok) throw new Error("Failed to generate debate");
  return res.json();
}

/* ─── Election Readiness Index ─── */
export interface ReadinessState {
  state: string;
  type: string;
  score: number;
  grade: string;
  voters_cr: number;
  constituencies: number;
  booths: number;
  term_end_year: number;
  years_until_election: number;
  status: string;
  key_risk: string;
  breakdown: {
    time: number;
    infrastructure: number;
    budget: number;
    security: number;
    digital: number;
  };
}

export interface ReadinessIndexResponse {
  readiness_index: ReadinessState[];
  national_average: number;
  target_year: number;
  total_states: number;
  imminent_count: number;
  model: string;
}

export async function fetchReadinessIndex(target_year: number = 2029): Promise<ReadinessIndexResponse> {
  const res = await fetch(`${API}/election/readiness-index?target_year=${target_year}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch readiness index");
  return res.json();
}

/* ─── My Work (Ravi's Dashboard) ─── */
export interface MyWorkComplaint {
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
  days_open: number;
  sla_status: string;
  is_overdue: boolean;
}

export interface MyWorkResponse {
  complaints: MyWorkComplaint[];
  total: number;
}

export interface ReportCard {
  user: { username: string; role: string; department: string | null };
  total_assigned: number;
  resolved: number;
  pending: number;
  escalated: number;
  resolution_rate: number;
  avg_resolution_days: number;
  sla_breached: number;
  on_time_rate: number;
  grade: string;
  streak_days: number;
  this_week_resolved: number;
}

export async function fetchMyWork(): Promise<MyWorkResponse> {
  const res = await fetch(`${API}/complaints/my-work`, {
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) throw new Error("Failed to fetch my work");
  return res.json();
}

export async function fetchMyReportCard(): Promise<ReportCard> {
  const res = await fetch(`${API}/complaints/my-report-card`, {
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) throw new Error("Failed to fetch report card");
  return res.json();
}

/* ─── Complaint Timeline ─── */
export interface TimelineEvent {
  event: string;
  timestamp: string | null;
  actor: string;
  description: string;
  icon: string;
  status: "completed" | "upcoming";
}

export interface TimelineResponse {
  complaint_id: number;
  timeline: TimelineEvent[];
}

export async function fetchComplaintTimeline(complaintId: number): Promise<TimelineResponse> {
  const res = await fetch(`${API}/complaints/${complaintId}/timeline`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch timeline");
  return res.json();
}
