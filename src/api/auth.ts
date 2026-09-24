// Keep the browser client aligned with the public Vite environment contract.
const apiBaseUrl = import.meta.env.VITE_API_URL as string | undefined;
const API_BASE_URL = apiBaseUrl?.replace(/\/$/, '') ?? '';

export type ApiProblem = { title?: string; detail?: string; errors?: Array<{ field: string; message: string }> };
export type LoginResponse = { accessToken: string; tokenType: 'Bearer'; accessExpiresAt: string; csrfToken: string };

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    ...init,
  });
  if (!response.ok) {
    const problem = await response.json().catch(() => ({})) as ApiProblem;
    throw new Error(problem.detail ?? problem.title ?? 'No fue posible completar la solicitud.');
  }
  return response.status === 204 ? undefined as T : response.json() as Promise<T>;
}

export function registerUser(payload: { firstName: string; lastName: string; documentType: string; documentNumber: string; email: string; phone: string; password: string }) {
  return request<{ id: string; email: string; roles: string[] }>('/api/v1/auth/register', { method: 'POST', body: JSON.stringify(payload) });
}

export function login(payload: { email: string; password: string }) {
  return request<LoginResponse>('/api/v1/auth/login', { method: 'POST', body: JSON.stringify(payload) });
}

export function currentSession(accessToken: string) {
  return request<{ subject: string; roles: string[] }>('/api/v1/auth/me', { method: 'GET', headers: { Authorization: `Bearer ${accessToken}` } });
}
