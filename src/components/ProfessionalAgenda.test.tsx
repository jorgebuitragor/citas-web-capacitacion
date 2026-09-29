import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AgendaAppointment } from '../api/booking';
import { ProfessionalAgendaDashboard } from './ProfessionalAgenda';

const sample: AgendaAppointment = {
  id: '84', patientName: 'Paciente Sintético', location: { id: '1', name: 'Hospital Internacional de Colombia (HIC)' },
  specialty: { id: '1', name: 'Medicina General' }, startAt: '2026-10-01T09:00:00', endAt: '2026-10-01T09:30:00',
  durationMinutes: 30, status: 'APPROVED', closureAllowed: true,
};

const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function mockFetch(agendaBody: unknown, closeHandler?: (init?: RequestInit) => Response) {
  return vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes('/api/v1/catalogs/locations')) return response([{ id: '1', code: 'HIC', name: 'Hospital Internacional de Colombia (HIC)' }]);
    if (url.includes('/closure')) return closeHandler ? closeHandler(init) : response(agendaBody);
    return response(agendaBody);
  });
}

describe('ProfessionalAgendaDashboard', () => {
  beforeEach(() => { vi.restoreAllMocks(); });
  afterEach(() => { cleanup(); });

  it('loads only the authenticated professional agenda and shows appointment details', async () => {
    const fetchMock = mockFetch({ items: [sample] });
    vi.stubGlobal('fetch', fetchMock);
    render(<ProfessionalAgendaDashboard token="access-token" onSignOut={vi.fn()} />);

    expect(await screen.findByText('Paciente Sintético')).toBeInTheDocument();
    expect(screen.getByText('Medicina General')).toBeInTheDocument();
    expect(screen.getAllByText(sample.location.name).length).toBeGreaterThan(0);
    expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/\/api\/v1\/professional\/agenda\?range=day&date=/), expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer access-token' }) }));
  });

  it('applies range, date and location filters through the approved REST query', async () => {
    const fetchMock = mockFetch({ items: [] });
    vi.stubGlobal('fetch', fetchMock);
    render(<ProfessionalAgendaDashboard token="access-token" onSignOut={vi.fn()} />);
    await screen.findByText('No tienes citas para estos filtros');
    fireEvent.change(screen.getByLabelText('Periodo'), { target: { value: 'week' } });
    fireEvent.change(screen.getByLabelText('Fecha'), { target: { value: '2026-10-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('range=week&date=2026-10-01'), expect.anything()));
  });

  it('closes an eligible appointment as completed and hides the action', async () => {
    const closed: AgendaAppointment = { ...sample, status: 'COMPLETED', closureAllowed: false };
    const fetchMock = mockFetch({ items: [sample] }, () => response(closed));
    vi.stubGlobal('fetch', fetchMock);
    render(<ProfessionalAgendaDashboard token="access-token" onSignOut={vi.fn()} />);
    await screen.findByText('Paciente Sintético');
    fireEvent.click(screen.getByRole('button', { name: 'Marcar atención' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Completada' }));
    expect(await screen.findByText('El estado ahora es Completada.')).toBeInTheDocument();
    expect(screen.getByText('Completada', { selector: '.status-badge' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Marcar atención' })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith(expect.stringContaining('/api/v1/appointments/84/closure'),
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ outcome: 'COMPLETED' }) }));
  });

  it('keeps the current appointment state when closure fails', async () => {
    const fetchMock = mockFetch({ items: [sample] }, () => response({ status: 409, title: 'Conflicto', detail: 'La cita ya no es elegible para cierre.' }, 409));
    vi.stubGlobal('fetch', fetchMock);
    render(<ProfessionalAgendaDashboard token="access-token" onSignOut={vi.fn()} />);
    await screen.findByText('Paciente Sintético');
    fireEvent.click(screen.getByRole('button', { name: 'Marcar atención' }));
    fireEvent.click(screen.getByRole('button', { name: 'No asistió' }));
    expect(await screen.findByText('No se pudo registrar')).toBeInTheDocument();
    expect(screen.getByText('Aprobada', { selector: '.status-badge' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(screen.getByRole('button', { name: 'Marcar atención' })).toBeInTheDocument();
  });

  it('communicates agenda load errors and allows retry', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/v1/catalogs/locations')) return response([]);
      return response({ title: 'Servicio no disponible' }, 500);
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<ProfessionalAgendaDashboard token="access-token" onSignOut={vi.fn()} />);
    expect(await screen.findByText('Servicio no disponible')).toBeInTheDocument();
  });
});
