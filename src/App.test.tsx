import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminDashboard, BookingDashboard } from './App';

const response = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));

describe('S3 booking screens', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('filters availability and confirms a general appointment', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = input.toString();
      if (url.includes('/locations')) return response([{ id: '1', code: 'HIC', name: 'HIC' }]);
      if (url.includes('/specialties')) return response([{ id: '1', code: 'MEDICINA_GENERAL', name: 'Medicina General', durationMinutes: 30, general: true, requiresAdminApproval: false }]);
      if (url.includes('/professionals')) return response([{ id: '10', name: 'Dra. Prueba', code: 'PROF-10' }]);
      if (url.includes('/availability')) return response({ items: [{ startAt: '2026-10-01T08:00:00', endAt: '2026-10-01T08:30:00' }] });
      if (url.endsWith('/appointments') && init?.method === 'POST') return response({ id: '8', status: 'APPROVED', startAt: '2026-10-01T08:00:00', endAt: '2026-10-01T08:30:00', durationMinutes: 30 }, 201);
      return response({ title: 'Unexpected request' }, 500);
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<BookingDashboard token="token" isAdmin={false} onAdmin={vi.fn()} onSignOut={vi.fn()} />);
    await screen.findByRole('option', { name: 'HIC' });
    fireEvent.change(screen.getByLabelText('Sede'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Especialidad'), { target: { value: '1' } });
    await screen.findByRole('option', { name: 'Dra. Prueba' });
    fireEvent.change(screen.getByLabelText('Profesional'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar disponibilidad' }));
    await screen.findByRole('button', { name: /08:00/ });
    fireEvent.click(screen.getByRole('button', { name: /08:00/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar franja' }));
    expect(await screen.findByText('Tu cita quedó aprobada automáticamente.')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/api/v1/appointments'), expect.objectContaining({ method: 'POST' }));
  });

  it('requires a reason before rejecting a pending specialized appointment', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = input.toString();
      if (url.includes('/admin/appointments?')) return response([{ id: '9', status: 'REQUESTED', patientName: 'Ana', professionalName: 'Dr. Uno', locationName: 'HIC', specialtyName: 'Cardiología', durationMinutes: 30, startAt: '2026-10-01T09:00:00', endAt: '2026-10-01T09:30:00' }]);
      if (url.includes('/decision') && init?.method === 'POST') return response({ id: '9', status: 'REJECTED', startAt: '2026-10-01T09:00:00', endAt: '2026-10-01T09:30:00', durationMinutes: 30 });
      return response({ title: 'Unexpected request' }, 500);
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<AdminDashboard token="token" isUser={false} onBooking={vi.fn()} onSignOut={vi.fn()} />);
    await screen.findByText('Cardiología');
    expect(screen.getByRole('button', { name: 'Rechazar' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Motivo de rechazo para 9'), { target: { value: 'Motivo válido' } });
    fireEvent.click(screen.getByRole('button', { name: 'Rechazar' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/decision'), expect.objectContaining({ method: 'POST' })));
  });
});
