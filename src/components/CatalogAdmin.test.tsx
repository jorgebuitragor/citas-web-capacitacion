import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CatalogsDashboard } from './CatalogAdmin';

const response = (body: unknown, status = 200) => Promise.resolve(new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));

const eps = { id: '1', code: 'EPS_DEMO_A', name: 'EPS Demo Salud', active: true };
const regime = { id: '1', code: 'CONTRIBUTIVO', name: 'Contributivo' };
const specialty = { id: '1', code: 'MEDICINA_GENERAL', name: 'Medicina General', durationMinutes: 30, general: true, requiresAdminApproval: false, active: true };

function mockFetch(handlers: { [pattern: string]: (init?: RequestInit) => Promise<Response> }) {
  return vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    for (const [pattern, handler] of Object.entries(handlers)) if (url.includes(pattern)) return handler(init);
    return response({ title: 'Unexpected request: ' + url }, 500);
  });
}

describe('CatalogsDashboard', () => {
  beforeEach(() => { vi.restoreAllMocks(); });
  afterEach(() => { cleanup(); });

  it('lists EPS and specialties on load', async () => {
    vi.stubGlobal('fetch', mockFetch({
      '/admin/catalogs/eps': () => response([eps]),
      '/admin/catalogs/specialties': () => response([specialty]),
    }));
    render(<CatalogsDashboard token="admin-token" onSignOut={vi.fn()} onBack={vi.fn()} />);
    expect(await screen.findByText('EPS Demo Salud')).toBeInTheDocument();
    expect(await screen.findByText('Medicina General')).toBeInTheDocument();
  });

  it('creates an EPS and reloads the list', async () => {
    let created = false;
    const fetchMock = mockFetch({
      '/admin/catalogs/eps': (init) => {
        if (init?.method === 'POST') { created = true; return response({ id: '2', code: 'EPS_NEW', name: 'EPS Nueva', active: true }, 201); }
        return response(created ? [eps, { id: '2', code: 'EPS_NEW', name: 'EPS Nueva', active: true }] : [eps]);
      },
      '/admin/catalogs/specialties': () => response([]),
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<CatalogsDashboard token="admin-token" onSignOut={vi.fn()} onBack={vi.fn()} />);
    await screen.findByText('EPS Demo Salud');
    const epsForm = within(screen.getByRole('form', { name: 'Crear EPS' }));
    fireEvent.change(epsForm.getByLabelText('Código'), { target: { value: 'EPS_NEW' } });
    fireEvent.change(epsForm.getByLabelText('Nombre'), { target: { value: 'EPS Nueva' } });
    fireEvent.click(epsForm.getByRole('button', { name: 'Crear EPS' }));
    expect(await screen.findByText('EPS creada.')).toBeInTheDocument();
    expect(await screen.findByText('EPS Nueva')).toBeInTheDocument();
  });

  it('deactivates an EPS', async () => {
    const fetchMock = mockFetch({
      '/admin/catalogs/eps/1': (init) => {
        if (init?.method === 'PATCH') return response({ ...eps, active: false });
        return response({ title: 'Unexpected' }, 500);
      },
      '/admin/catalogs/eps': () => response([eps]),
      '/admin/catalogs/specialties': () => response([]),
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<CatalogsDashboard token="admin-token" onSignOut={vi.fn()} onBack={vi.fn()} />);
    await screen.findByText('EPS Demo Salud');
    fireEvent.click(screen.getByRole('button', { name: 'Desactivar' }));
    await waitFor(() => expect(fetchMock.mock.calls.some((call) => String(call[0]).includes('/admin/catalogs/eps/1') && (call[1] as RequestInit)?.method === 'PATCH')).toBe(true));
  });

  it('shows plans for an EPS and creates a new one', async () => {
    const fetchMock = mockFetch({
      '/admin/catalogs/eps/1/plans': (init) => {
        if (init?.method === 'POST') return response({ id: '9', epsId: '1', code: 'PLAN_NEW', name: 'Plan Nuevo', active: true, regime }, 201);
        return response([]);
      },
      '/admin/catalogs/eps': () => response([eps]),
      '/admin/catalogs/specialties': () => response([]),
      '/catalogs/insurance-regimes': () => response([regime]),
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<CatalogsDashboard token="admin-token" onSignOut={vi.fn()} onBack={vi.fn()} />);
    await screen.findByText('EPS Demo Salud');
    fireEvent.click(screen.getByRole('button', { name: 'Ver planes' }));
    expect(await screen.findByText('Esta EPS no tiene planes.')).toBeInTheDocument();

    const planForm = within(screen.getByRole('form', { name: 'Crear plan' }));
    fireEvent.change(planForm.getByLabelText('Régimen'), { target: { value: '1' } });
    fireEvent.change(planForm.getByLabelText('Código'), { target: { value: 'PLAN_NEW' } });
    fireEvent.change(planForm.getByLabelText('Nombre'), { target: { value: 'Plan Nuevo' } });
    fireEvent.click(planForm.getByRole('button', { name: 'Crear plan' }));
    expect(await screen.findByText('Plan creado.')).toBeInTheDocument();
  });

  it('shows a server error when a specialty duration is rejected', async () => {
    vi.stubGlobal('fetch', mockFetch({
      '/admin/catalogs/specialties': (init) => {
        if (init?.method === 'POST') return response({ title: 'Bad Request', detail: 'La duración debe ser 30 o 60 minutos.' }, 400);
        return response([]);
      },
      '/admin/catalogs/eps': () => response([]),
    }));
    render(<CatalogsDashboard token="admin-token" onSignOut={vi.fn()} onBack={vi.fn()} />);
    await screen.findByText('No hay especialidades registradas.');
    const specialtyForm = within(screen.getByRole('form', { name: 'Crear especialidad' }));
    fireEvent.change(specialtyForm.getByLabelText('Código'), { target: { value: 'ESP_X' } });
    fireEvent.change(specialtyForm.getByLabelText('Nombre'), { target: { value: 'Especialidad X' } });
    fireEvent.click(specialtyForm.getByRole('button', { name: 'Crear especialidad' }));
    expect(await screen.findByText('La duración debe ser 30 o 60 minutos.')).toBeInTheDocument();
  });
});
