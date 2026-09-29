import { FormEvent, useCallback, useEffect, useState } from 'react';
import { currentSession, login, registerUser } from './api/auth';
import { bookingApi, PendingAppointment, RescheduleRequest } from './api/booking';
import { MyAppointmentsDashboard } from './components/MyAppointments';
import { ProfessionalAgendaDashboard } from './components/ProfessionalAgenda';
import { BookingDashboard } from './components/BookingSearch';
export { BookingDashboard };

type Screen = 'login' | 'register' | 'booking' | 'appointments' | 'admin' | 'agenda';
type Notice = { type: 'error' | 'success'; text: string } | null;
const initialRegistration = { firstName: '', lastName: '', documentType: 'CC', documentNumber: '', email: '', phone: '', password: '', confirmPassword: '' };

export default function App() {
  const [screen, setScreen] = useState<Screen>('login');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registration, setRegistration] = useState(initialRegistration);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [session, setSession] = useState<{ token: string; roles: string[] } | null>(null);

  function changeScreen(next: Screen) { setScreen(next); setNotice(null); setShowPassword(false); }
  function signOut() { sessionStorage.removeItem('accessToken'); sessionStorage.removeItem('accessExpiresAt'); setSession(null); changeScreen('login'); }
  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSubmitting(true); setNotice(null);
    try {
      const tokenData = await login(loginForm); const profile = await currentSession(tokenData.accessToken);
      sessionStorage.setItem('accessToken', tokenData.accessToken); sessionStorage.setItem('accessExpiresAt', tokenData.accessExpiresAt);
      setSession({ token: tokenData.accessToken, roles: profile.roles });
      if (profile.roles.includes('ROLE_ADMIN')) changeScreen('admin');
      else if (profile.roles.includes('ROLE_PROFESSIONAL')) changeScreen('agenda');
      else if (profile.roles.includes('ROLE_USER')) changeScreen('appointments');
      else setNotice({ type: 'error', text: 'Tu rol no tiene una ruta de reservas disponible.' });
    } catch (error) { setNotice({ type: 'error', text: error instanceof Error ? error.message : 'No fue posible iniciar sesión.' }); }
    finally { setSubmitting(false); }
  }
  async function submitRegistration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (registration.password !== registration.confirmPassword) { setNotice({ type: 'error', text: 'Las contraseñas no coinciden.' }); return; }
    setSubmitting(true); setNotice(null);
    try { const { confirmPassword, ...payload } = registration; await registerUser(payload); setRegistration(initialRegistration); setNotice({ type: 'success', text: 'Cuenta creada. Ya puedes iniciar sesión.' }); setScreen('login'); }
    catch (error) { setNotice({ type: 'error', text: error instanceof Error ? error.message : 'No fue posible crear la cuenta.' }); }
    finally { setSubmitting(false); }
  }
  if (session && screen === 'booking' && session.roles.includes('ROLE_USER')) return <BookingDashboard token={session.token} onSignOut={signOut} onAdmin={() => changeScreen('admin')} onAppointments={() => changeScreen('appointments')} isAdmin={session.roles.includes('ROLE_ADMIN')} />;
  if (session && screen === 'appointments' && session.roles.includes('ROLE_USER')) return <MyAppointmentsDashboard token={session.token} onSignOut={signOut} onBooking={() => changeScreen('booking')} />;
  if (session && screen === 'admin' && session.roles.includes('ROLE_ADMIN')) return <AdminDashboard token={session.token} onSignOut={signOut} onBooking={() => changeScreen('booking')} isUser={session.roles.includes('ROLE_USER')} />;
  if (session && screen === 'agenda' && session.roles.includes('ROLE_PROFESSIONAL')) return <ProfessionalAgendaDashboard token={session.token} onSignOut={signOut} />;
  return <div className="app-shell"><header className="topbar"><button className="brand" onClick={() => changeScreen('login')} aria-label="Ir a inicio"><span className="brand-mark">✚</span><span>MediSchedule</span></button><nav aria-label="Acceso"><button className={screen === 'login' ? 'nav-active' : ''} onClick={() => changeScreen('login')}>Iniciar sesión</button><button className={screen === 'register' ? 'nav-active' : ''} onClick={() => changeScreen('register')}>Crear cuenta</button></nav></header><main className="auth-layout"><section className="form-pane" aria-labelledby="auth-title"><div className="form-content"><p className="eyebrow">PORTAL DE CITAS</p><h1 id="auth-title">{screen === 'login' ? 'Bienvenido' : 'Crea tu cuenta'}</h1><p className="intro">{screen === 'login' ? 'Ingresa para consultar y solicitar tus citas.' : 'Regístrate con datos sintéticos para acceder al sistema de agendamiento.'}</p>{notice && <NoticeBox notice={notice} />}{screen === 'login' ? <form onSubmit={submitLogin} className="auth-form"><Field label="Correo electrónico" htmlFor="login-email"><input id="login-email" type="email" required autoComplete="email" value={loginForm.email} onChange={(event) => setLoginForm({ ...loginForm, email: event.target.value })} placeholder="nombre@ejemplo.com" /></Field><Field label="Contraseña" htmlFor="login-password"><div className="password-wrap"><input id="login-password" type={showPassword ? 'text' : 'password'} required autoComplete="current-password" value={loginForm.password} onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })} placeholder="••••••••" /><button type="button" className="reveal" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>{showPassword ? 'Ocultar' : 'Mostrar'}</button></div></Field><button className="primary-button" disabled={submitting}>{submitting ? 'Autenticando…' : 'Iniciar sesión'} <span>→</span></button><p className="switch-copy">¿No tienes cuenta? <button type="button" onClick={() => changeScreen('register')}>Regístrate</button></p></form> : <form onSubmit={submitRegistration} className="auth-form register-form"><div className="two-columns"><Field label="Nombres" htmlFor="first-name"><input id="first-name" required value={registration.firstName} onChange={(event) => setRegistration({ ...registration, firstName: event.target.value })} /></Field><Field label="Apellidos" htmlFor="last-name"><input id="last-name" required value={registration.lastName} onChange={(event) => setRegistration({ ...registration, lastName: event.target.value })} /></Field></div><div className="two-columns"><Field label="Tipo de documento" htmlFor="document-type"><select id="document-type" value={registration.documentType} onChange={(event) => setRegistration({ ...registration, documentType: event.target.value })}><option value="CC">Cédula de ciudadanía</option><option value="CE">Cédula de extranjería</option><option value="PA">Pasaporte</option></select></Field><Field label="Número de documento" htmlFor="document-number"><input id="document-number" required value={registration.documentNumber} onChange={(event) => setRegistration({ ...registration, documentNumber: event.target.value })} /></Field></div><Field label="Correo electrónico" htmlFor="register-email"><input id="register-email" type="email" required value={registration.email} onChange={(event) => setRegistration({ ...registration, email: event.target.value })} placeholder="nombre@ejemplo.com" /></Field><Field label="Teléfono" htmlFor="phone"><input id="phone" required value={registration.phone} onChange={(event) => setRegistration({ ...registration, phone: event.target.value })} placeholder="300 000 0000" /></Field><div className="two-columns"><Field label="Contraseña" htmlFor="register-password"><input id="register-password" type="password" required minLength={8} value={registration.password} onChange={(event) => setRegistration({ ...registration, password: event.target.value })} /></Field><Field label="Confirmar contraseña" htmlFor="confirm-password"><input id="confirm-password" type="password" required minLength={8} value={registration.confirmPassword} onChange={(event) => setRegistration({ ...registration, confirmPassword: event.target.value })} /></Field></div><button className="primary-button" disabled={submitting}>{submitting ? 'Creando cuenta…' : 'Crear cuenta'} <span>→</span></button><p className="switch-copy">¿Ya tienes cuenta? <button type="button" onClick={() => changeScreen('login')}>Inicia sesión</button></p></form>}<div className="trust-row"><span>✓ Conexión protegida</span><span>•</span><span>Datos sintéticos de laboratorio</span></div></div></section><aside className="visual-pane" aria-label="Información de la plataforma"><div className="visual-copy"><span className="pill">Atención organizada</span><h2>Tu bienestar empieza con una cita bien agendada.</h2><p>Consulta tus opciones y gestiona tus datos de acceso en un entorno académico protegido.</p></div><div className="quote-card"><span className="quote-icon">“</span><p>Una experiencia clara para hacer más simple cada paso de tu atención.</p></div></aside></main><footer><span>© 2026 MediSchedule · Proyecto académico</span><span>Privacidad · Ayuda</span></footer></div>;
}

export function AdminDashboard({ token, onSignOut, onBooking, isUser }: { token: string; onSignOut: () => void; onBooking: () => void; isUser: boolean }) {
  const [items, setItems] = useState<PendingAppointment[]>([]); const [notice, setNotice] = useState<Notice>(null); const [loading, setLoading] = useState(true); const [reasons, setReasons] = useState<Record<string, string>>({});
  const load = () => { setLoading(true); bookingApi.pending(token).then(setItems).catch((error) => setNotice({ type: 'error', text: error instanceof Error ? error.message : 'No fue posible cargar solicitudes.' })).finally(() => setLoading(false)); };
  useEffect(load, [token]);
  async function decide(item: PendingAppointment, decision: 'APPROVE' | 'REJECT') { const reason = reasons[item.id]?.trim(); if (decision === 'REJECT' && !reason) { setNotice({ type: 'error', text: 'El motivo es obligatorio para rechazar.' }); return; } try { await bookingApi.decide(token, item.id, decision, reason); setNotice({ type: 'success', text: decision === 'APPROVE' ? 'Solicitud aprobada.' : 'Solicitud rechazada y franja liberada.' }); load(); } catch (error) { setNotice({ type: 'error', text: error instanceof Error ? error.message : 'No fue posible decidir la solicitud.' }); } }
  return <PortalLayout title="Solicitudes pendientes" onSignOut={onSignOut} action={isUser ? <button onClick={onBooking}>Buscar cita</button> : undefined}>{notice && <NoticeBox notice={notice} />}<section aria-labelledby="specialized-heading"><h2 id="specialized-heading">Solicitudes de cita especializada</h2>{loading ? <p>Cargando solicitudes…</p> : items.length === 0 ? <p>No hay solicitudes especializadas pendientes.</p> : <div className="pending-list">{items.map((item) => <article className="pending-card" key={item.id}><h3>{item.specialtyName}</h3><p>{item.patientName} · {item.professionalName}</p><p>{item.locationName} · {formatDateTime(item.startAt)} · {item.durationMinutes} min</p><div className="decision-row"><button className="primary-button" onClick={() => decide(item, 'APPROVE')}>Aprobar</button><label className="inline-field">Motivo de rechazo<input aria-label={`Motivo de rechazo para ${item.id}`} value={reasons[item.id] ?? ''} onChange={(event) => setReasons({ ...reasons, [item.id]: event.target.value })} /></label><button className="danger-button" disabled={!reasons[item.id]?.trim()} onClick={() => decide(item, 'REJECT')}>Rechazar</button></div></article>)}</div>}</section><RescheduleInbox token={token} /></PortalLayout>;
}

/**
 * HU-021. Compara la franja actual con la solicitada y exige motivo para rechazar (DEC-005);
 * el backend revalida y es la autoridad de la transición.
 */
export function RescheduleInbox({ token }: { token: string }) {
  const [items, setItems] = useState<RescheduleRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<Notice>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [deciding, setDeciding] = useState<string | null>(null);
  const load = useCallback(() => {
    setLoading(true);
    bookingApi.rescheduleRequests(token).then((response) => setItems(response.items))
      .catch((error) => setNotice({ type: 'error', text: error instanceof Error ? error.message : 'No fue posible cargar las reprogramaciones.' }))
      .finally(() => setLoading(false));
  }, [token]);
  useEffect(load, [load]);

  async function decide(item: RescheduleRequest, decision: 'APPROVE' | 'REJECT') {
    const reason = reasons[item.id]?.trim();
    if (decision === 'REJECT' && !reason) { setNotice({ type: 'error', text: 'El motivo es obligatorio para rechazar una reprogramación.' }); return; }
    if (deciding) return;
    setDeciding(item.id);
    setNotice(null);
    try {
      await bookingApi.decideReschedule(token, item.id, decision, reason);
      setNotice({ type: 'success', text: decision === 'APPROVE' ? 'Reprogramación aprobada. La cita quedó en la nueva franja.' : 'Reprogramación rechazada. La cita conserva su franja original.' });
      load();
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'No fue posible decidir la reprogramación.' });
      load();
    } finally {
      setDeciding(null);
    }
  }

  return <section aria-labelledby="reschedule-heading" className="reschedule-inbox">
    <h2 id="reschedule-heading">Reprogramaciones pendientes</h2>
    {notice && <NoticeBox notice={notice} />}
    {loading ? <p>Cargando reprogramaciones…</p> : items.length === 0 ? <p>No hay reprogramaciones pendientes.</p> : <div className="pending-list">
      {items.map((item) => <article className="pending-card reschedule-card" key={item.id}>
        <h3>{item.specialtyName}</h3>
        <p>{item.patientName} · {item.professionalName}</p>
        <div className="reschedule-windows">
          <p><strong>Franja actual</strong>{formatDateTime(item.previousStartAt)}</p>
          <span aria-hidden="true" className="reschedule-arrow">→</span>
          <p><strong>Franja solicitada</strong>{formatDateTime(item.requestedStartAt)}</p>
        </div>
        <p>{item.location.name} · {item.durationMinutes} min</p>
        <div className="decision-row">
          <button className="primary-button" disabled={deciding === item.id} onClick={() => void decide(item, 'APPROVE')}>{deciding === item.id ? 'Procesando…' : 'Aprobar'}</button>
          <label className="inline-field">Motivo<input aria-label={`Motivo de rechazo para la reprogramación ${item.id}`} value={reasons[item.id] ?? ''} onChange={(event) => setReasons({ ...reasons, [item.id]: event.target.value })} /><small>Obligatorio para rechazar</small></label>
          <button className="danger-button" disabled={deciding === item.id || !reasons[item.id]?.trim()} onClick={() => void decide(item, 'REJECT')}>Rechazar</button>
        </div>
      </article>)}
    </div>}
  </section>;
}

function PortalLayout({ title, onSignOut, action, children }: { title: string; onSignOut: () => void; action?: React.ReactNode; children: React.ReactNode }) { return <div className="portal-shell"><header className="topbar"><span className="brand"><span className="brand-mark">✚</span><span>MediSchedule</span></span><nav aria-label="Sesión">{action}<button onClick={onSignOut}>Cerrar sesión</button></nav></header><main className="portal-content"><p className="eyebrow">PORTAL DE CITAS</p><h1>{title}</h1>{children}</main></div>; }
function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) { return <label className="field" htmlFor={htmlFor}><span>{label}</span>{children}</label>; }
function NoticeBox({ notice }: { notice: NonNullable<Notice> }) { return <div className={`notice ${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>{notice.text}</div>; }
function formatDateTime(value: string) { return new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(`${value}-05:00`)); }
