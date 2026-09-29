import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MyAppointment } from '../api/booking';
import { MyAppointmentsDashboard } from './MyAppointments';

const sample: MyAppointment = {
  id: '84', location: { id: '1', name: 'Hospital Internacional de Colombia (HIC)' },
  professional: { id: '12', name: 'Dra. Ejemplo' }, specialty: { id: '1', name: 'Medicina General' },
  startAt: '2026-10-01T09:00:00', endAt: '2026-10-01T09:30:00', durationMinutes: 30,
  status: 'APPROVED', rejectionReason: null, cancellationAllowed: true,
  rescheduleAllowed: true, rescheduleRequest: null,
};

const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('MyAppointmentsDashboard', () => {
  beforeEach(() => { vi.restoreAllMocks(); });
  afterEach(() => { cleanup(); });

  it('loads only the authenticated user list and shows appointment details and rejection reason', async () => {
    const rejected: MyAppointment = { ...sample, id: '85', status: 'REJECTED', cancellationAllowed: false, rejectionReason: 'El profesional no está disponible.' };
    const fetchMock = vi.fn(() => response({ items: [sample, rejected] }));
    vi.stubGlobal('fetch', fetchMock);
    render(<MyAppointmentsDashboard token="access-token" onSignOut={vi.fn()} onBooking={vi.fn()} />);

    expect(await screen.findAllByText('Dra. Ejemplo')).toHaveLength(2);
    expect(screen.getAllByText(sample.location.name)).toHaveLength(2);
    expect(screen.getAllByText('30 minutos')).toHaveLength(2);
    expect(screen.getByText(/Motivo de rechazo/)).toBeInTheDocument();
    expect(screen.getByText('El profesional no está disponible.')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/\/api\/v1\/appointments$/), expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer access-token' }) }));
  });

  it('applies status and date filters through the approved REST query', async () => {
    const fetchMock = vi.fn(() => response({ items: [] }));
    vi.stubGlobal('fetch', fetchMock);
    render(<MyAppointmentsDashboard token="access-token" onSignOut={vi.fn()} onBooking={vi.fn()} />);
    await screen.findByText('No tienes citas para estos filtros');
    fireEvent.change(screen.getByLabelText('Estado'), { target: { value: 'APPROVED' } });
    fireEvent.change(screen.getByLabelText('Fecha'), { target: { value: '2026-10-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('status=APPROVED&date'), expect.anything()));
  });

  it('cancels once, updates the status and removes the cancel action', async () => {
    const updated = { ...sample, status: 'CANCELLED' as const, cancellationAllowed: false };
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'POST') return response(updated);
      return response({ items: [sample] });
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<MyAppointmentsDashboard token="access-token" onSignOut={vi.fn()} onBooking={vi.fn()} />);
    await screen.findAllByText('Dra. Ejemplo');
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar cita' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    const confirmButton = screen.getByRole('button', { name: 'Confirmar cancelación' });
    fireEvent.click(confirmButton);
    fireEvent.click(confirmButton);
    expect(await screen.findByText('El estado ahora es CANCELLED.')).toBeInTheDocument();
    expect(screen.getByText('Cancelada', { selector: '.status-badge' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancelar cita' })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenLastCalledWith(expect.stringContaining('/api/v1/appointments/84/cancellation'), expect.objectContaining({ method: 'POST' }));
  });

  it('keeps the current appointment state when cancellation fails', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'POST') return response({ status: 409, title: 'Conflicto', detail: 'La cita ya no se puede cancelar.' }, 409);
      return response({ items: [sample] });
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<MyAppointmentsDashboard token="access-token" onSignOut={vi.fn()} onBooking={vi.fn()} />);
    await screen.findAllByText('Dra. Ejemplo');
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar cita' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cancelación' }));
    expect(await screen.findByText('No se pudo cancelar')).toBeInTheDocument();
    expect(screen.getByText('Aprobada', { selector: '.status-badge' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(screen.getByRole('button', { name: 'Cancelar cita' })).toBeInTheDocument();
    expect(screen.getAllByRole('alert').some((element) => element.textContent?.includes('La cita ya no se puede cancelar.'))).toBe(true);
  });

  it('requests a reschedule keeping professional and specialty and prevents double submit', async () => {
    const slots = { items: [{ startAt: '2026-10-02T09:00:00', endAt: '2026-10-02T09:30:00' }] };
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (init?.method === 'POST') return response({ id: '5', appointmentId: '84', status: 'PENDING' }, 201);
      if (url.includes('/catalogs/locations')) return response([{ id: '1', code: 'HIC', name: 'Hospital Internacional de Colombia (HIC)' }]);
      if (url.includes('/catalogs/professionals')) return response([{ id: '12', name: 'Dra. Ejemplo', code: 'P-12' }]);
      if (url.includes('/availability')) return response(slots);
      return response({ items: [sample] });
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<MyAppointmentsDashboard token="access-token" onSignOut={vi.fn()} onBooking={vi.fn()} />);
    await screen.findAllByText('Dra. Ejemplo');

    fireEvent.click(screen.getByRole('button', { name: 'Reprogramar' }));
    expect(await screen.findByText(/Se mantiene el mismo profesional y la misma especialidad/)).toBeInTheDocument();
    const submit = screen.getByRole('button', { name: 'Solicitar reprogramación' });
    expect(submit).toBeDisabled();
    fireEvent.click(await screen.findByRole('button', { name: '09:00 – 09:30' }));
    expect(submit).toBeEnabled();
    fireEvent.click(submit);
    fireEvent.click(submit);

    expect(await screen.findByText('Solicitud enviada. Queda pendiente de aprobación.')).toBeInTheDocument();
    const posts = fetchMock.mock.calls.filter((call) => (call[1] as RequestInit | undefined)?.method === 'POST');
    expect(posts).toHaveLength(1);
    expect(String(posts[0][0])).toContain('/api/v1/appointments/84/reschedule-requests');
    expect(JSON.parse(String((posts[0][1] as RequestInit).body))).toEqual({
      locationId: '1', specialtyId: '1', professionalId: '12', startAt: '2026-10-02T09:00:00',
    });
  });

  it('shows the pending reschedule without losing the original slot and hides the action', async () => {
    const pending: MyAppointment = {
      ...sample, rescheduleAllowed: false,
      rescheduleRequest: { id: '5', status: 'PENDING', requestedStartAt: '2026-10-02T09:00:00', requestedEndAt: '2026-10-02T09:30:00', decisionReason: null, decidedAt: null },
    };
    vi.stubGlobal('fetch', vi.fn(() => response({ items: [pending] })));
    render(<MyAppointmentsDashboard token="access-token" onSignOut={vi.fn()} onBooking={vi.fn()} />);
    expect(await screen.findByText(/Reprogramación pendiente/)).toBeInTheDocument();
    expect(screen.getByText(/Tu cita actual se mantiene hasta que se decida/)).toBeInTheDocument();
    expect(screen.getByText('Aprobada', { selector: '.status-badge' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reprogramar' })).not.toBeInTheDocument();
  });

  it('shows the rejection reason of a reschedule and offers the action again', async () => {
    const rejected: MyAppointment = {
      ...sample, rescheduleAllowed: true,
      rescheduleRequest: { id: '5', status: 'REJECTED', requestedStartAt: '2026-10-02T09:00:00', requestedEndAt: '2026-10-02T09:30:00', decisionReason: 'El profesional no estará disponible ese día.', decidedAt: '2026-09-29T10:00:00' },
    };
    vi.stubGlobal('fetch', vi.fn(() => response({ items: [rejected] })));
    render(<MyAppointmentsDashboard token="access-token" onSignOut={vi.fn()} onBooking={vi.fn()} />);
    expect(await screen.findByText(/Reprogramación rechazada/)).toBeInTheDocument();
    expect(screen.getByText('El profesional no estará disponible ese día.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reprogramar' })).toBeInTheDocument();
  });

  it('keeps the appointment untouched and reports the error when the reschedule fails', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (init?.method === 'POST') return response({ status: 409, title: 'Conflicto', detail: 'La nueva franja ya no está disponible.' }, 409);
      if (url.includes('/catalogs/locations')) return response([{ id: '1', code: 'HIC', name: 'Hospital Internacional de Colombia (HIC)' }]);
      if (url.includes('/catalogs/professionals')) return response([{ id: '12', name: 'Dra. Ejemplo', code: 'P-12' }]);
      if (url.includes('/availability')) return response({ items: [{ startAt: '2026-10-02T09:00:00', endAt: '2026-10-02T09:30:00' }] });
      return response({ items: [sample] });
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<MyAppointmentsDashboard token="access-token" onSignOut={vi.fn()} onBooking={vi.fn()} />);
    await screen.findAllByText('Dra. Ejemplo');
    fireEvent.click(screen.getByRole('button', { name: 'Reprogramar' }));
    fireEvent.click(await screen.findByRole('button', { name: '09:00 – 09:30' }));
    fireEvent.click(screen.getByRole('button', { name: 'Solicitar reprogramación' }));
    expect(await screen.findByText('La nueva franja ya no está disponible.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));
    expect(screen.getByText('Aprobada', { selector: '.status-badge' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reprogramar' })).toBeInTheDocument();
  });

  it('communicates list errors and allows retry', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(response({ title: 'Servicio no disponible' }, 500)).mockResolvedValueOnce(response({ items: [] }));
    vi.stubGlobal('fetch', fetchMock);
    render(<MyAppointmentsDashboard token="access-token" onSignOut={vi.fn()} onBooking={vi.fn()} />);
    expect(await screen.findByText('Servicio no disponible')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('No tienes citas para estos filtros')).toBeInTheDocument();
  });
});

