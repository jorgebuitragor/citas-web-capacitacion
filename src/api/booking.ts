const apiBaseUrl = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';

export type ApiProblem = { title?: string; detail?: string };
export type Location = { id: string; code: string; name: string };
export type Specialty = { id: string; code: string; name: string; durationMinutes: number; general: boolean; requiresAdminApproval: boolean };
export type Professional = { id: string; name: string; code: string };
export type Availability = { startAt: string; endAt: string };
export type AppointmentStatus = 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';
export type Appointment = { id: string; status: AppointmentStatus; startAt: string; endAt: string; durationMinutes: number };
export type PendingAppointment = Appointment & { patientName: string; professionalName: string; locationName: string; specialtyName: string };
export type RescheduleStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type RescheduleSummary = {
  id: string;
  status: RescheduleStatus;
  requestedStartAt: string;
  requestedEndAt: string;
  decisionReason: string | null;
  decidedAt: string | null;
};
export type RescheduleRequest = {
  id: string;
  appointmentId: string;
  status: RescheduleStatus;
  patientName: string;
  professionalName: string;
  specialtyName: string;
  location: { id: string; name: string };
  durationMinutes: number;
  previousStartAt: string;
  previousEndAt: string;
  requestedStartAt: string;
  requestedEndAt: string;
  decisionReason: string | null;
  decidedAt: string | null;
};
export type MyAppointment = Appointment & {
  location: { id: string; name: string };
  professional: { id: string; name: string };
  specialty: { id: string; name: string };
  rejectionReason: string | null;
  cancellationAllowed: boolean;
  rescheduleAllowed: boolean;
  rescheduleRequest: RescheduleSummary | null;
};
export type AgendaAppointment = Appointment & {
  patientName: string;
  location: { id: string; name: string };
  specialty: { id: string; name: string };
  closureAllowed: boolean;
};

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
  myAppointments: (token: string, filters: { status: AppointmentStatus | ''; date: string }) => {
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status);
    if (filters.date) params.set('date', filters.date);
    const query = params.toString();
    return request<{ items: MyAppointment[] }>(`/api/v1/appointments${query ? `?${query}` : ''}`, token);
  },
  cancel: (token: string, id: string) =>
    request<MyAppointment>(`/api/v1/appointments/${encodeURIComponent(id)}/cancellation`, token, { method: 'POST' }),
  requestReschedule: (token: string, appointmentId: string, body: { locationId: string; specialtyId: string; professionalId: string; startAt: string }) =>
    request<RescheduleRequest>(`/api/v1/appointments/${encodeURIComponent(appointmentId)}/reschedule-requests`, token,
      { method: 'POST', body: JSON.stringify(body) }),
  rescheduleRequests: (token: string, status: RescheduleStatus = 'PENDING') =>
    request<{ items: RescheduleRequest[] }>(`/api/v1/admin/reschedule-requests?status=${encodeURIComponent(status)}`, token),
  decideReschedule: (token: string, id: string, decision: 'APPROVE' | 'REJECT', reason?: string) =>
    request<RescheduleRequest>(`/api/v1/admin/reschedule-requests/${encodeURIComponent(id)}/decision`, token,
      { method: 'POST', body: JSON.stringify({ decision, ...(reason ? { reason } : {}) }) }),
  agenda: (token: string, filters: { range: 'day' | 'week'; date: string; locationId?: string }) => {
    const params = new URLSearchParams({ range: filters.range, date: filters.date });
    if (filters.locationId) params.set('locationId', filters.locationId);
    return request<{ items: AgendaAppointment[] }>(`/api/v1/professional/agenda?${params.toString()}`, token);
  },
  closeAppointment: (token: string, id: string, outcome: 'COMPLETED' | 'NO_SHOW') =>
    request<AgendaAppointment>(`/api/v1/appointments/${encodeURIComponent(id)}/closure`, token, { method: 'POST', body: JSON.stringify({ outcome }) }),
};
