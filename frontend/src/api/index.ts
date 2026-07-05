// API client
const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "";
const API = `${BASE_URL}/api`;

type FetchOpts = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: any;
  token?: string | null;
};

export async function apiFetch<T = any>(path: string, opts: FetchOpts = {}): Promise<T> {
  const { method = "GET", body, token } = opts;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const message = (data && data.detail) || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data as T;
}

// Endpoints
export type DashboardStats = {
  total_leads: number;
  meetings_scheduled: number;
  proposals_sent: number;
  active_clients: number;
  win_rate: number;
  this_month_revenue: number;
  by_status: Record<string, number>;
};

export type LeadSummary = {
  id: string;
  business_name: string;
  category: string;
  city: string;
  state: string;
  status: string;
  model: string;
  created_at: string;
  updated_at: string;
};

export type LeadFull = LeadSummary & {
  instagram_url: string;
  website_url: string;
  google_maps_url: string;
  usp: string;
  notes: string;
  goal: string;
  report: any;
  sales_kit: any;
  proposal: any;
};

export const api = {
  dashboardStats: (token: string) => apiFetch<DashboardStats>("/dashboard/stats", { token }),
  listLeads: (token: string) => apiFetch<LeadSummary[]>("/leads", { token }),
  getLead: (token: string, id: string) => apiFetch<LeadFull>(`/leads/${id}`, { token }),
  createLead: (token: string, body: any) => apiFetch<LeadFull>("/leads", { method: "POST", body, token }),
  updateStatus: (token: string, id: string, status: string) =>
    apiFetch(`/leads/${id}/status`, { method: "PATCH", body: { status }, token }),
  deleteLead: (token: string, id: string) => apiFetch(`/leads/${id}`, { method: "DELETE", token }),
  generateSalesKit: (token: string, id: string) => apiFetch(`/leads/${id}/sales-kit`, { method: "POST", token }),
  generateProposal: (token: string, id: string) => apiFetch(`/leads/${id}/proposal`, { method: "POST", token }),
};
