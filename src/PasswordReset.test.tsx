import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ForgotPasswordScreen, ResetPasswordScreen } from './App';

const response = (body: unknown, status = 200) => new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('ForgotPasswordScreen', () => {
  beforeEach(() => { vi.restoreAllMocks(); });
  afterEach(() => { cleanup(); });

  it('requests a reset and offers to continue without revealing whether the email exists', async () => {
    const fetchMock = vi.fn((_input: RequestInfo | URL, _init?: RequestInit) => Promise.resolve(response(undefined, 202)));
    vi.stubGlobal('fetch', fetchMock);
    const onRequested = vi.fn();
    render(<ForgotPasswordScreen onBack={vi.fn()} onRequested={onRequested} />);
    fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'ana@example.test' } });
    fireEvent.click(screen.getByRole('button', { name: /Solicitar recuperación/ }));
    expect(await screen.findByText(/se generó un token de recuperación/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/api/v1/auth/password-reset/request'), expect.objectContaining({ method: 'POST' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(onRequested).toHaveBeenCalledOnce();
  });

  it('shows a server error without crashing on the empty success body', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(response({ title: 'Error', detail: 'Servicio no disponible.' }, 500))));
    render(<ForgotPasswordScreen onBack={vi.fn()} onRequested={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'ana@example.test' } });
    fireEvent.click(screen.getByRole('button', { name: /Solicitar recuperación/ }));
    expect(await screen.findByText('Servicio no disponible.')).toBeInTheDocument();
  });
});

describe('ResetPasswordScreen', () => {
  beforeEach(() => { vi.restoreAllMocks(); });
  afterEach(() => { cleanup(); });

  it('rejects mismatched passwords before calling the API', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(<ResetPasswordScreen onBack={vi.fn()} onDone={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Token de recuperación'), { target: { value: 'abc123' } });
    fireEvent.change(screen.getByLabelText('Nueva contraseña'), { target: { value: 'NewSecret123!' } });
    fireEvent.change(screen.getByLabelText('Confirmar contraseña'), { target: { value: 'Different123!' } });
    fireEvent.click(screen.getByRole('button', { name: /Actualizar contraseña/ }));
    expect(await screen.findByText('Las contraseñas no coinciden.')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('confirms the reset and offers to go back to login', async () => {
    const fetchMock = vi.fn((_input: RequestInfo | URL, _init?: RequestInit) => Promise.resolve(response(undefined, 200)));
    vi.stubGlobal('fetch', fetchMock);
    render(<ResetPasswordScreen onBack={vi.fn()} onDone={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Token de recuperación'), { target: { value: 'abc123' } });
    fireEvent.change(screen.getByLabelText('Nueva contraseña'), { target: { value: 'NewSecret123!' } });
    fireEvent.change(screen.getByLabelText('Confirmar contraseña'), { target: { value: 'NewSecret123!' } });
    fireEvent.click(screen.getByRole('button', { name: /Actualizar contraseña/ }));
    expect(await screen.findByText(/Contraseña actualizada/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/api/v1/auth/password-reset/confirm'), expect.objectContaining({ method: 'POST' }));
    expect(JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body))).toEqual({ token: 'abc123', newPassword: 'NewSecret123!' });
    expect(screen.getByRole('button', { name: 'Ir a iniciar sesión' })).toBeInTheDocument();
  });

  it('shows a generic error for an invalid or expired token', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(response({ title: 'Authentication failed' }, 401))));
    render(<ResetPasswordScreen onBack={vi.fn()} onDone={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Token de recuperación'), { target: { value: 'expired-token' } });
    fireEvent.change(screen.getByLabelText('Nueva contraseña'), { target: { value: 'NewSecret123!' } });
    fireEvent.change(screen.getByLabelText('Confirmar contraseña'), { target: { value: 'NewSecret123!' } });
    fireEvent.click(screen.getByRole('button', { name: /Actualizar contraseña/ }));
    expect(await screen.findByText('Authentication failed')).toBeInTheDocument();
  });
});
