const apiBaseUrl = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';

export type ApiProblem = { title?: string; detail?: string };
export type InsuranceRegime = { id: string; code: string; name: string };
export type Eps = { id: string; code: string; name: string; active: boolean };
export type Plan = { id: string; epsId: string; code: string; name: string; active: boolean; regime: InsuranceRegime };
export type SpecialtyAdmin = { id: string; code: string; name: string; durationMinutes: number; general: boolean; requiresAdminApproval: boolean; active: boolean };

async function request<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    credentials: 'include',
  });
  if (!response.ok) {
    const problem = await response.json().catch(() => ({})) as ApiProblem;
    throw new Error(problem.detail ?? problem.title ?? 'No fue posible completar la solicitud.');
  }
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const catalogApi = {
  insuranceRegimes: (token: string) => request<InsuranceRegime[]>('/api/v1/catalogs/insurance-regimes', token),

  listEps: (token: string) => request<Eps[]>('/api/v1/admin/catalogs/eps', token),
  createEps: (token: string, body: { code: string; name: string }) =>
    request<Eps>('/api/v1/admin/catalogs/eps', token, { method: 'POST', body: JSON.stringify(body) }),
  updateEps: (token: string, id: string, body: { name?: string; active?: boolean }) =>
    request<Eps>(`/api/v1/admin/catalogs/eps/${encodeURIComponent(id)}`, token, { method: 'PATCH', body: JSON.stringify(body) }),

  listPlans: (token: string, epsId: string) => request<Plan[]>(`/api/v1/admin/catalogs/eps/${encodeURIComponent(epsId)}/plans`, token),
  createPlan: (token: string, epsId: string, body: { regimeId: string; code: string; name: string }) =>
    request<Plan>(`/api/v1/admin/catalogs/eps/${encodeURIComponent(epsId)}/plans`, token, { method: 'POST', body: JSON.stringify(body) }),
  updatePlan: (token: string, epsId: string, planId: string, body: { name?: string; active?: boolean }) =>
    request<Plan>(`/api/v1/admin/catalogs/eps/${encodeURIComponent(epsId)}/plans/${encodeURIComponent(planId)}`, token, { method: 'PATCH', body: JSON.stringify(body) }),

  listSpecialties: (token: string) => request<SpecialtyAdmin[]>('/api/v1/admin/catalogs/specialties', token),
  createSpecialty: (token: string, body: { code: string; name: string; durationMinutes: number; general: boolean; requiresAdminApproval: boolean }) =>
    request<SpecialtyAdmin>('/api/v1/admin/catalogs/specialties', token, { method: 'POST', body: JSON.stringify(body) }),
  updateSpecialty: (token: string, id: string, body: { name?: string; active?: boolean }) =>
    request<SpecialtyAdmin>(`/api/v1/admin/catalogs/specialties/${encodeURIComponent(id)}`, token, { method: 'PATCH', body: JSON.stringify(body) }),
};
