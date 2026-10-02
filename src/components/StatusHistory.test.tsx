import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StatusHistoryToggle } from './StatusHistory';

const response = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));

describe('StatusHistoryToggle', () => {
  beforeEach(() => { vi.restoreAllMocks(); });
  afterEach(() => { cleanup(); });

  it('is collapsed by default and fetches only when expanded', async () => {
    const fetchMock = vi.fn(() => response({ items: [] }));
    vi.stubGlobal('fetch', fetchMock);
    render(<StatusHistoryToggle token="token" appointmentId="84" />);
    expect(screen.getByRole('button', { name: 'Ver historial' })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows events with actor and source once expanded', async () => {
    vi.stubGlobal('fetch', vi.fn(() => response({
      items: [
        { id: '1', appointmentId: '84', status: 'REQUESTED', actor: { id: '27', name: 'Paciente Sintético' }, source: 'USER', changedAt: '2026-09-29T14:05:00', reason: 'Solicitud especializada creada' },
        { id: '2', appointmentId: '84', status: 'REJECTED', actor: { id: '1', name: 'Administrador Sintético' }, source: 'ADMIN', changedAt: '2026-09-29T15:10:00', reason: 'El profesional no estará disponible.' },
      ],
    })));
    render(<StatusHistoryToggle token="token" appointmentId="84" />);
    fireEvent.click(screen.getByRole('button', { name: 'Ver historial' }));
    expect(await screen.findByText(/Paciente Sintético/)).toBeInTheDocument();
    expect(screen.getByText(/Administrador Sintético/)).toBeInTheDocument();
    expect(screen.getByText(/El profesional no estará disponible\./)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ocultar historial' })).toBeInTheDocument();
  });

  it('shows an event with no actor for SYSTEM-sourced transitions', async () => {
    vi.stubGlobal('fetch', vi.fn(() => response({
      items: [{ id: '1', appointmentId: '84', status: 'APPROVED', actor: null, source: 'SYSTEM', changedAt: '2026-09-29T14:05:00', reason: null }],
    })));
    render(<StatusHistoryToggle token="token" appointmentId="84" />);
    fireEvent.click(screen.getByRole('button', { name: 'Ver historial' }));
    expect(await screen.findByText(/Sistema/)).toBeInTheDocument();
  });

  it('shows an empty state when there are no events', async () => {
    vi.stubGlobal('fetch', vi.fn(() => response({ items: [] })));
    render(<StatusHistoryToggle token="token" appointmentId="84" />);
    fireEvent.click(screen.getByRole('button', { name: 'Ver historial' }));
    expect(await screen.findByText('Sin eventos registrados.')).toBeInTheDocument();
  });

  it('shows an error when the API denies access', async () => {
    vi.stubGlobal('fetch', vi.fn(() => response({ title: 'Not Found', detail: 'La cita no existe.' }, 404)));
    render(<StatusHistoryToggle token="token" appointmentId="999" />);
    fireEvent.click(screen.getByRole('button', { name: 'Ver historial' }));
    expect(await screen.findByText('La cita no existe.')).toBeInTheDocument();
  });

  it('does not refetch when collapsing and expanding again', async () => {
    const fetchMock = vi.fn(() => response({ items: [] }));
    vi.stubGlobal('fetch', fetchMock);
    render(<StatusHistoryToggle token="token" appointmentId="84" />);
    fireEvent.click(screen.getByRole('button', { name: 'Ver historial' }));
    await screen.findByText('Sin eventos registrados.');
    fireEvent.click(screen.getByRole('button', { name: 'Ocultar historial' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Ver historial' }));
    await screen.findByText('Sin eventos registrados.');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
