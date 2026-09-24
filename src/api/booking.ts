const apiBaseUrl = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';

export type ApiProblem = { title?: string; detail?: string };
export type Location = { id: string; code: string; name: string };
export type Specialty = { id: string; code: string; name: string; durationMinutes: number; general: boolean; requiresAdminApproval: boolean };
export type Professional = { id: string; name: string; code: string };
export type Availability = { startAt: string; endAt: string };
export type Appointment = { id: string; status: 'REQUESTED' | 'APPROVED' | 'REJECTED'; startAt: string; endAt: string; durationMinutes: number };
export type PendingAppointment = Appointment & { patientName: string; professionalName: string; locationName: string; specialtyName: string };

async function request<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    credentials: 'include',
  });
  if (!response.ok) {
    const problem = await response.json().catch(() => ({})) as ApiProblem;
    const error = new Error(problem.detail ?? problem.title ?? 'No fue posible completar la solicitud.');
    Object.assign(error, { status: response.status });
    throw error;
  }
  return response.json() as Promise<T>;
}

export const bookingApi = {
  locations: (token: string) => request<Location[]>('/api/v1/catalogs/locations', token),
  specialties: (token: string) => request<Specialty[]>('/api/v1/catalogs/specialties', token),
  professionals: (token: string, locationId: string, specialtyId: string) => request<Professional[]>(`/api/v1/catalogs/professionals?locationId=${encodeURIComponent(locationId)}&specialtyId=${encodeURIComponent(specialtyId)}`, token),
  availability: (token: string, filters: { locationId: string; specialtyId: string; professionalId: string; date: string }) =>
    request<{ items: Availability[] }>(`/api/v1/availability?locationId=${encodeURIComponent(filters.locationId)}&specialtyId=${encodeURIComponent(filters.specialtyId)}&professionalId=${encodeURIComponent(filters.professionalId)}&date=${encodeURIComponent(filters.date)}`, token),
  create: (token: string, requestBody: { locationId: string; specialtyId: string; professionalId: string; startAt: string }) =>
    request<Appointment>('/api/v1/appointments', token, { method: 'POST', body: JSON.stringify(requestBody) }),
  pending: (token: string) => request<PendingAppointment[]>('/api/v1/admin/appointments?status=REQUESTED', token),
  decide: (token: string, id: string, decision: 'APPROVE' | 'REJECT', reason?: string) =>
    request<Appointment>(`/api/v1/admin/appointments/${encodeURIComponent(id)}/decision`, token, { method: 'POST', body: JSON.stringify({ decision, ...(reason ? { reason } : {}) }) }),
};
