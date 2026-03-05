const BASE = '/api';

export function getToken() { return localStorage.getItem('qa_token'); }
export function setToken(t: string) { localStorage.setItem('qa_token', t); }
export function clearToken() { localStorage.removeItem('qa_token'); }

async function req<T>(path: string, opts?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts?.headers,
    },
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(e.error || res.statusText);
  }
  return res.json() as Promise<T>;
}

// ── Types ──────────────────────────────────────────────────────────────

export interface User { id: string; name: string; email: string; role: string; avatar: string }
export interface Release {
  id: string; version: string; name: string; description?: string;
  start_date?: string; end_date?: string; status: string;
  runs: number | RunSummary[]; stats: Stats; created_at: string;
}
export interface RunSummary { id: string; name: string; status: string; total: number; done: number; pass: number; fail: number; created_at: string }
export interface Stats { total: number; pass: number; fail: number; blocked: number; skip: number; pending: number }
export interface Suite { id: string; name: string; description?: string; case_count: number }
export interface Step  { step: string; expected: string }
export interface TestCase {
  id: string; title: string; description?: string; steps: Step[];
  expected_result?: string; type: string; priority: string;
  suite_id?: string; suite_name?: string; tags?: string; created_at: string;
}
export interface TestRun {
  id: string; name: string; release_id: string; status: string;
  total: number; done: number; pass: number; fail: number; created_at: string;
  cases?: Execution[]; stats?: Stats;
}
export interface Execution extends TestCase {
  status: 'pending'|'pass'|'fail'|'blocked'|'skip';
  actual_result?: string; notes?: string; executed_at?: string;
  case_id: string; run_id: string;
}

// ── Auth ───────────────────────────────────────────────────────────────
export const auth = {
  login:    (email: string, password: string) => req<{ token: string; user: User }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (data: Partial<User> & { password: string }) => req<User>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  me:       () => req<User>('/auth/me'),
  users:    () => req<User[]>('/auth/users'),
};

// ── Releases ───────────────────────────────────────────────────────────
export const releases = {
  list:   ()         => req<Release[]>('/releases'),
  get:    (id: string) => req<Release>(`/releases/${id}`),
  create: (d: Partial<Release>) => req<Release>('/releases', { method: 'POST', body: JSON.stringify(d) }),
  update: (id: string, d: Partial<Release>) => req<{success:boolean}>(`/releases/${id}`, { method: 'PATCH', body: JSON.stringify(d) }),
  delete: (id: string) => req<{success:boolean}>(`/releases/${id}`, { method: 'DELETE' }),
};

// ── Cases & Suites ─────────────────────────────────────────────────────
export const cases = {
  list:         (params?: Record<string, string>) => req<TestCase[]>(`/cases?${new URLSearchParams(params || {})}`),
  get:          (id: string)  => req<TestCase>(`/cases/${id}`),
  create:       (d: Partial<TestCase>) => req<TestCase>('/cases', { method: 'POST', body: JSON.stringify(d) }),
  update:       (id: string, d: Partial<TestCase>) => req<{success:boolean}>(`/cases/${id}`, { method: 'PATCH', body: JSON.stringify(d) }),
  delete:       (id: string)  => req<{success:boolean}>(`/cases/${id}`, { method: 'DELETE' }),
  suites:       ()            => req<Suite[]>('/cases/suites'),
  createSuite:  (d: Partial<Suite>) => req<Suite>('/cases/suites', { method: 'POST', body: JSON.stringify(d) }),
  updateSuite:  (id: string, d: Partial<Suite>) => req<{success:boolean}>(`/cases/suites/${id}`, { method: 'PATCH', body: JSON.stringify(d) }),
  deleteSuite:  (id: string)  => req<{success:boolean}>(`/cases/suites/${id}`, { method: 'DELETE' }),
};

// ── Runs ───────────────────────────────────────────────────────────────
export const runs = {
  list:   (release_id?: string) => req<TestRun[]>(`/runs${release_id ? `?release_id=${release_id}` : ''}`),
  get:    (id: string) => req<TestRun>(`/runs/${id}`),
  create: (d: { name: string; release_id: string; suite_ids?: string[]; case_ids?: string[] }) =>
    req<TestRun>('/runs', { method: 'POST', body: JSON.stringify(d) }),
  update: (id: string, d: Partial<TestRun>) => req<{success:boolean}>(`/runs/${id}`, { method: 'PATCH', body: JSON.stringify(d) }),
  delete: (id: string) => req<{success:boolean}>(`/runs/${id}`, { method: 'DELETE' }),
  exec:   (runId: string, caseId: string, d: { status: string; actual_result?: string; notes?: string }) =>
    req<{success:boolean}>(`/runs/${runId}/exec/${caseId}`, { method: 'PATCH', body: JSON.stringify(d) }),
};

// ── AI ─────────────────────────────────────────────────────────────────
export const ai = {
  chat:            (message: string, context?: string) => req<{reply: string}>('/ai/chat', { method: 'POST', body: JSON.stringify({ message, context }) }),
  generateCases:   (feature: string, count: number, type: string) => req<{cases: Partial<TestCase>[]}>('/ai/generate-cases', { method: 'POST', body: JSON.stringify({ feature, count, type }) }),
  generateSteps:   (title: string, description?: string) => req<{steps: Step[]; expected_result: string; priority: string}>('/ai/generate-steps', { method: 'POST', body: JSON.stringify({ title, description }) }),
  analyzeFailure:  (d: { title: string; expected_result: string; actual_result: string; steps: Step[] }) => req<{analysis: string}>('/ai/analyze-failure', { method: 'POST', body: JSON.stringify(d) }),
  generateReport:  (d: { release_name: string; release_version: string; stats: Stats; failed_cases: {title:string}[] }) => req<{report: string}>('/ai/generate-report', { method: 'POST', body: JSON.stringify(d) }),
  suggestSuite:    (project_description: string) => req<{suites: {name:string;description:string;test_types:string[]}[]}>('/ai/suggest-suite', { method: 'POST', body: JSON.stringify({ project_description }) }),
};
