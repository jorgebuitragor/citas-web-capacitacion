import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RescheduleRequest } from './api/booking';
import { RescheduleInbox } from './App';

const pending: RescheduleRequest = {
  id: '5', appointmentId: '84', status: 'PENDING', patientName: 'Paciente Sintético',
  professionalName: 'Dra. Ejemplo', specialtyName: 'Medicina General',
  location: { id: '1', name: 'Hospital Internacional de Colombia (HIC)' }, durationMinutes: 30,
  previousStartAt: '2026-10-01T09:00:00', previousEndAt: '2026-10-01T09:30:00',
  requestedStartAt: '2026-10-02T09:00:00', requestedEndAt: '2026-10-02T09:30:00',
  decisionReason: null, decidedAt: null,
};

const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('RescheduleInbox', () => {
  beforeEach(() => { vi.restoreAllMocks(); });
  afterEach(() => { cleanup(); });

  it('lists the pending requests comparing both slots', async () => {
    vi.stubGlobal('fetch', vi.fn(() => response({ items: [pending] })));
    render(<RescheduleInbox token="admin-token" />);
    expect(await screen.findByText(/Franja actual/)).toBeInTheDocument();
    expect(screen.getByText(/Franja solicitada/)).toBeInTheDocument();
    expect(screen.getByText('Paciente Sintético · Dra. Ejemplo')).toBeInTheDocument();
  });

  it('blocks a rejection without reason and sends it once filled', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'POST') return response({ ...pending, status: 'REJECTED', decisionReason: 'Sin disponibilidad.' });
      return response({ items: [pending] });
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<RescheduleInbox token="admin-token" />);
    const reject = await screen.findByRole('button', { name: 'Rechazar' });
    expect(reject).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Motivo de rechazo para la reprogramación 5'), { target: { value: 'Sin disponibilidad.' } });
    expect(reject).toBeEnabled();
    fireEvent.click(reject);
    expect(await screen.findByText(/La cita conserva su franja original/)).toBeInTheDocument();
    const posts = fetchMock.mock.calls.filter((call) => (call[1] as RequestInit | undefined)?.method === 'POST');
    expect(posts).toHaveLength(1);
    expect(String(posts[0][0])).toContain('/api/v1/admin/reschedule-requests/5/decision');
    expect(JSON.parse(String((posts[0][1] as RequestInit).body))).toEqual({ decision: 'REJECT', reason: 'Sin disponibilidad.' });
  });

  it('approves without a reason and reports the new slot', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'POST') return response({ ...pending, status: 'APPROVED' });
      return response({ items: [pending] });
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<RescheduleInbox token="admin-token" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Aprobar' }));
    expect(await screen.findByText(/La cita quedó en la nueva franja/)).toBeInTheDocument();
    const posts = fetchMock.mock.calls.filter((call) => (call[1] as RequestInit | undefined)?.method === 'POST');
    expect(JSON.parse(String((posts[0][1] as RequestInit).body))).toEqual({ decision: 'APPROVE' });
  });

  it('reports a decision error and reloads the inbox', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'POST') return response({ status: 409, title: 'Conflicto', detail: 'La solicitud ya fue decidida.' }, 409);
      return response({ items: [pending] });
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<RescheduleInbox token="admin-token" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Aprobar' }));
    expect(await screen.findByText('La solicitud ya fue decidida.')).toBeInTheDocument();
    await waitFor(() => expect(fetchMock.mock.calls.filter((call) => (call[1] as RequestInit | undefined)?.method !== 'POST')).toHaveLength(2));
  });

  it('shows an empty state when there is nothing pending', async () => {
    vi.stubGlobal('fetch', vi.fn(() => response({ items: [] })));
    render(<RescheduleInbox token="admin-token" />);
    expect(await screen.findByText('No hay reprogramaciones pendientes.')).toBeInTheDocument();
  });
});
