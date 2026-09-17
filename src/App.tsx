import { FormEvent, useState } from 'react';
import { login, registerUser } from './api/auth';

type Screen = 'login' | 'register';
type Notice = { type: 'error' | 'success'; text: string } | null;

const initialRegistration = { firstName: '', lastName: '', documentType: 'CC', documentNumber: '', email: '', phone: '', password: '', confirmPassword: '' };

export default function App() {
  const [screen, setScreen] = useState<Screen>('login');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registration, setRegistration] = useState(initialRegistration);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  function changeScreen(next: Screen) {
    setScreen(next); setNotice(null); setShowPassword(false);
  }

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSubmitting(true); setNotice(null);
    try {
      const session = await login(loginForm);
      sessionStorage.setItem('accessToken', session.accessToken);
      sessionStorage.setItem('accessExpiresAt', session.accessExpiresAt);
      setNotice({ type: 'success', text: 'Sesión iniciada. El acceso fue verificado correctamente.' });
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'No fue posible iniciar sesión.' });
    } finally { setSubmitting(false); }
  }

  async function submitRegistration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (registration.password !== registration.confirmPassword) {
      setNotice({ type: 'error', text: 'Las contraseñas no coinciden.' }); return;
    }
    setSubmitting(true); setNotice(null);
    try {
      const { confirmPassword, ...payload } = registration;
      await registerUser(payload);
      setRegistration(initialRegistration);
      setNotice({ type: 'success', text: 'Cuenta creada. Ya puedes iniciar sesión.' });
      setScreen('login');
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'No fue posible crear la cuenta.' });
    } finally { setSubmitting(false); }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => changeScreen('login')} aria-label="Ir a inicio">
          <span className="brand-mark">✚</span><span>MediSchedule</span>
        </button>
        <nav aria-label="Acceso">
          <button className={screen === 'login' ? 'nav-active' : ''} onClick={() => changeScreen('login')}>Iniciar sesión</button>
          <button className={screen === 'register' ? 'nav-active' : ''} onClick={() => changeScreen('register')}>Crear cuenta</button>
        </nav>
      </header>

      <main className="auth-layout">
        <section className="form-pane" aria-labelledby="auth-title">
          <div className="form-content">
            <p className="eyebrow">PORTAL DE CITAS</p>
            <h1 id="auth-title">{screen === 'login' ? 'Bienvenido' : 'Crea tu cuenta'}</h1>
            <p className="intro">{screen === 'login' ? 'Ingresa para gestionar tus citas de forma sencilla y segura.' : 'Regístrate con datos sintéticos para acceder al sistema de agendamiento.'}</p>

            {notice && <div className={`notice ${notice.type}`} role="status">{notice.text}</div>}

            {screen === 'login' ? (
              <form onSubmit={submitLogin} className="auth-form">
                <Field label="Correo electrónico" htmlFor="login-email">
                  <input id="login-email" type="email" required autoComplete="email" value={loginForm.email} onChange={(event) => setLoginForm({ ...loginForm, email: event.target.value })} placeholder="nombre@ejemplo.com" />
                </Field>
                <Field label="Contraseña" htmlFor="login-password">
                  <div className="password-wrap"><input id="login-password" type={showPassword ? 'text' : 'password'} required autoComplete="current-password" value={loginForm.password} onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })} placeholder="••••••••" />
                    <button type="button" className="reveal" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>{showPassword ? 'Ocultar' : 'Mostrar'}</button>
                  </div>
                </Field>
                <button className="text-link" type="button" onClick={() => setNotice({ type: 'error', text: 'La recuperación de contraseña aún no está disponible.' })}>¿Olvidaste tu contraseña?</button>
                <button className="primary-button" disabled={submitting}>{submitting ? 'Autenticando…' : 'Iniciar sesión'} <span>→</span></button>
                <p className="switch-copy">¿No tienes cuenta? <button type="button" onClick={() => changeScreen('register')}>Regístrate</button></p>
              </form>
            ) : (
              <form onSubmit={submitRegistration} className="auth-form register-form">
                <div className="two-columns">
                  <Field label="Nombres" htmlFor="first-name"><input id="first-name" required value={registration.firstName} onChange={(event) => setRegistration({ ...registration, firstName: event.target.value })} /></Field>
                  <Field label="Apellidos" htmlFor="last-name"><input id="last-name" required value={registration.lastName} onChange={(event) => setRegistration({ ...registration, lastName: event.target.value })} /></Field>
                </div>
                <div className="two-columns">
                  <Field label="Tipo de documento" htmlFor="document-type"><select id="document-type" value={registration.documentType} onChange={(event) => setRegistration({ ...registration, documentType: event.target.value })}><option value="CC">Cédula de ciudadanía</option><option value="CE">Cédula de extranjería</option><option value="PA">Pasaporte</option></select></Field>
                  <Field label="Número de documento" htmlFor="document-number"><input id="document-number" required value={registration.documentNumber} onChange={(event) => setRegistration({ ...registration, documentNumber: event.target.value })} /></Field>
                </div>
                <Field label="Correo electrónico" htmlFor="register-email"><input id="register-email" type="email" required value={registration.email} onChange={(event) => setRegistration({ ...registration, email: event.target.value })} placeholder="nombre@ejemplo.com" /></Field>
                <Field label="Teléfono" htmlFor="phone"><input id="phone" required value={registration.phone} onChange={(event) => setRegistration({ ...registration, phone: event.target.value })} placeholder="300 000 0000" /></Field>
                <div className="two-columns">
                  <Field label="Contraseña" htmlFor="register-password"><input id="register-password" type="password" required minLength={8} value={registration.password} onChange={(event) => setRegistration({ ...registration, password: event.target.value })} /></Field>
                  <Field label="Confirmar contraseña" htmlFor="confirm-password"><input id="confirm-password" type="password" required minLength={8} value={registration.confirmPassword} onChange={(event) => setRegistration({ ...registration, confirmPassword: event.target.value })} /></Field>
                </div>
                <button className="primary-button" disabled={submitting}>{submitting ? 'Creando cuenta…' : 'Crear cuenta'} <span>→</span></button>
                <p className="switch-copy">¿Ya tienes cuenta? <button type="button" onClick={() => changeScreen('login')}>Inicia sesión</button></p>
              </form>
            )}
            <div className="trust-row"><span>✓ Conexión protegida</span><span>•</span><span>Datos sintéticos de laboratorio</span></div>
          </div>
        </section>
        <aside className="visual-pane" aria-label="Información de la plataforma">
          <div className="visual-copy">
            <span className="pill">Atención organizada</span>
            <h2>Tu bienestar empieza con una cita bien agendada.</h2>
            <p>Consulta tus opciones y gestiona tus datos de acceso en un entorno académico protegido.</p>
          </div>
          <div className="quote-card"><span className="quote-icon">“</span><p>Una experiencia clara para hacer más simple cada paso de tu atención.</p></div>
        </aside>
      </main>
      <footer><span>© 2026 MediSchedule · Proyecto académico</span><span>Privacidad · Ayuda</span></footer>
    </div>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return <label className="field" htmlFor={htmlFor}><span>{label}</span>{children}</label>;
}
