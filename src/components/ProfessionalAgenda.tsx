import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { AgendaAppointment, AppointmentStatus, bookingApi, Location } from '../api/booking';
import { StatusHistoryToggle } from './StatusHistory';

type Notice = { type: 'error' | 'success'; text: string } | null;
type Props = { token: string; onSignOut: () => void };
type Range = 'day' | 'week';
type Filters = { range: Range; date: string; locationId: string };
type CloseMode = 'confirm' | 'submitting' | 'success' | 'error' | null;

const statusLabels: Record<AppointmentStatus, string> = {
  REQUESTED: 'Solicitada',
  APPROVED: 'Aprobada',
  REJECTED: 'Rechazada',
  CANCELLED: 'Cancelada',
  COMPLETED: 'Completada',
  NO_SHOW: 'No asistió',
};

function today() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const part = (type: string) => parts.find((item) => item.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function ProfessionalAgendaDashboard({ token, onSignOut }: Props) {
  const initialFilters: Filters = { range: 'day', date: today(), locationId: '' };
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(initialFilters);
  const [locations, setLocations] = useState<Location[]>([]);
  const [items, setItems] = useState<AgendaAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState<Notice>(null);
  const [closeTarget, setCloseTarget] = useState<AgendaAppointment | null>(null);
  const [closeMode, setCloseMode] = useState<CloseMode>(null);
  const closeLock = useRef(false);
  const closeTrigger = useRef<HTMLButtonElement | null>(null);
  const dialog = useRef<HTMLElement | null>(null);

  const load = useCallback(async (nextFilters: Filters) => {
    setLoading(true);
    setLoadError('');
    try {
      const response = await bookingApi.agenda(token, nextFilters.locationId ? nextFilters : { range: nextFilters.range, date: nextFilters.date });
      setItems(response.items);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'No fue posible cargar tu agenda.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { bookingApi.locations(token).then(setLocations).catch(() => undefined); }, [token]);
  useEffect(() => { void load(appliedFilters); }, [appliedFilters, load]);
  useEffect(() => {
    if (closeMode) {
      const firstButton = dialog.current?.querySelector<HTMLButtonElement>('button:not(:disabled)');
      (firstButton ?? dialog.current)?.focus();
    } else {
      closeTrigger.current?.focus();
    }
  }, [closeMode]);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    setAppliedFilters({ ...filters });
  }

  function clearFilters() {
    setFilters(initialFilters);
    setNotice(null);
    setAppliedFilters(initialFilters);
  }

  async function confirmClosure(outcome: 'COMPLETED' | 'NO_SHOW') {
    if (!closeTarget || closeLock.current || !closeTarget.closureAllowed) return;
    closeLock.current = true;
    setCloseMode('submitting');
    setNotice(null);
    try {
      const closed = await bookingApi.closeAppointment(token, closeTarget.id, outcome);
      setItems((current) => current.flatMap((item) => (item.id === closed.id ? [closed] : [item])));
      setCloseTarget(closed);
      setCloseMode('success');
      setNotice({ type: 'success', text: outcome === 'COMPLETED' ? 'Cita marcada como completada.' : 'Cita marcada como no asistió.' });
    } catch (error) {
      setCloseMode('error');
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'No fue posible registrar el resultado. La cita conserva su estado actual.' });
    } finally {
      closeLock.current = false;
    }
  }

  function closeDialog() {
    if (closeMode === 'submitting') return;
    setCloseTarget(null);
    setCloseMode(null);
  }

  function handleDialogKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    if (event.key === 'Escape' && closeMode !== 'submitting') {
      event.preventDefault();
      closeDialog();
      return;
    }
    if (event.key !== 'Tab') return;
    const buttons = Array.from(dialog.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []);
    if (buttons.length === 0) { event.preventDefault(); dialog.current?.focus(); return; }
    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  return <div className="portal-shell">
    <header className="topbar">
      <span className="brand"><span className="brand-mark">✚</span><span>MediSchedule</span></span>
      <nav aria-label="Sesión"><button className="nav-active" onClick={() => undefined}>Mi agenda</button><button onClick={onSignOut}>Cerrar sesión</button></nav>
    </header>
    <main className="portal-content appointments-page">
      <div className="appointments-hero">
        <div className="appointments-hero-copy">
          <p className="eyebrow"><span className="eyebrow-dot" /> AGENDA PROFESIONAL</p>
          <h1>Mi agenda</h1>
          <p className="intro">Consulta tus citas aprobadas y registra el resultado de la atención.</p>
        </div>
        <div className="appointments-hero-icon" aria-hidden="true"><span>✚</span></div>
      </div>
      {notice && <div className={`notice ${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>{notice.text}</div>}
      <form className="appointment-filters" onSubmit={applyFilters}>
        <div className="filter-heading"><div><span className="filter-kicker">TU AGENDA</span><strong>Filtrar por periodo y sede</strong></div><span className="filter-hint">Elige día o semana</span></div>
        <label className="field" htmlFor="agenda-range"><span>Periodo</span><select id="agenda-range" value={filters.range} onChange={(event) => setFilters({ ...filters, range: event.target.value as Range })}>
          <option value="day">Día</option>
          <option value="week">Semana</option>
        </select></label>
        <label className="field" htmlFor="agenda-date"><span>Fecha</span><input id="agenda-date" type="date" required value={filters.date} onChange={(event) => setFilters({ ...filters, date: event.target.value })} /></label>
        <label className="field" htmlFor="agenda-location"><span>Sede</span><select id="agenda-location" value={filters.locationId} onChange={(event) => setFilters({ ...filters, locationId: event.target.value })}>
          <option value="">Todas mis sedes</option>
          {locations.map((value) => <option key={value.id} value={value.id}>{value.name}</option>)}
        </select></label>
        <div className="filter-actions"><button className="primary-button" disabled={loading}>{loading ? 'Cargando…' : 'Aplicar filtros'}</button><button type="button" className="secondary-button" onClick={clearFilters}>Limpiar</button></div>
      </form>
      <section aria-live="polite" aria-busy={loading} className="appointments-results">
        <div className="results-toolbar"><div><span className="filter-kicker">RESULTADOS</span><h2>Citas aprobadas</h2></div></div>
        {loading
          ? <div className="appointments-list"><AgendaSkeleton /><AgendaSkeleton /></div>
          : loadError
            ? <div className="empty-state error-panel" role="alert"><h2>No pudimos cargar tu agenda</h2><p>{loadError}</p><button className="primary-button" onClick={() => void load(appliedFilters)}>Reintentar</button></div>
            : items.length === 0
              ? <div className="empty-state"><span className="empty-calendar-icon" aria-hidden="true">▦</span><h2>No tienes citas para estos filtros</h2><p>Cuando tengas una cita aprobada en este periodo, aparecerá aquí.</p><button className="secondary-button" onClick={clearFilters}>Limpiar filtros</button></div>
              : <div className="appointments-list">{items.map((item) => <AgendaCard key={item.id} token={token} item={item} onClose={(button) => { closeTrigger.current = button; setCloseTarget(item); setCloseMode('confirm'); }} />)}</div>}
      </section>
    </main>
    {closeTarget && closeMode && <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDialog(); }}><section ref={dialog} tabIndex={-1} onKeyDown={handleDialogKeyDown} className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="close-title" aria-describedby="close-description">
      {closeMode === 'confirm' && <><div className="modal-icon" aria-hidden="true">✚</div><h2 id="close-title">Registrar resultado de la atención</h2><p id="close-description">{formatDateTime(closeTarget.startAt)} · {closeTarget.specialty.name} · {closeTarget.patientName}</p><div className="dialog-actions"><button className="secondary-button" onClick={closeDialog}>Volver</button><button className="danger-button" onClick={() => void confirmClosure('NO_SHOW')}>No asistió</button><button className="primary-button" onClick={() => void confirmClosure('COMPLETED')}>Completada</button></div></>}
      {closeMode === 'submitting' && <div role="status"><div className="modal-spinner" aria-hidden="true"/><h2 id="close-title">Guardando…</h2><p id="close-description">Estamos actualizando la cita.</p></div>}
      {closeMode === 'success' && <div role="status"><div className="modal-success-icon" aria-hidden="true">✓</div><h2 id="close-title">Atención registrada</h2><p id="close-description">El estado ahora es {closeTarget.status === 'COMPLETED' ? 'Completada' : 'No asistió'}.</p><button className="primary-button modal-close" onClick={closeDialog}>Entendido</button></div>}
      {closeMode === 'error' && <div role="alert"><div className="modal-error-icon" aria-hidden="true">!</div><h2 id="close-title">No se pudo registrar</h2><p id="close-description">{notice?.text}</p><div className="dialog-actions"><button className="secondary-button" onClick={closeDialog}>Cerrar</button><button className="primary-button" onClick={() => setCloseMode('confirm')}>Reintentar</button></div></div>}
    </section></div>}
  </div>;
}

function AgendaCard({ token, item, onClose }: { token: string; item: AgendaAppointment; onClose: (button: HTMLButtonElement) => void }) {
  return <article className="appointment-card">
    <div className="appointment-heading"><div><p className="appointment-date">{formatDateTime(item.startAt)}</p><p className="appointment-duration">{item.durationMinutes} minutos</p></div><span className={`status-badge status-${item.status.toLowerCase()}`}><span aria-hidden="true">{statusSymbol(item.status)}</span> {statusLabels[item.status]}</span></div>
    <div className="appointment-details"><p><strong>Paciente</strong>{item.patientName}</p><p><strong>Especialidad</strong>{item.specialty.name}</p><p><strong>Sede</strong>{item.location.name}</p></div>
    {item.closureAllowed && <button className="primary-button" onClick={(event) => onClose(event.currentTarget)}>Marcar atención</button>}
    <StatusHistoryToggle token={token} appointmentId={item.id} />
  </article>;
}

function AgendaSkeleton() { return <div className="appointment-card skeleton-card" aria-label="Cargando cita"><span /><span /><span /></div>; }

function statusSymbol(status: AppointmentStatus) { return status === 'APPROVED' ? '✓' : status === 'COMPLETED' ? '✓' : status === 'NO_SHOW' ? '!' : '•'; }

function formatDateTime(value: string) {
  const date = new Date(/[zZ]|[+-]\d\d:\d\d$/.test(value) ? value : `${value}-05:00`);
  return new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', dateStyle: 'full', timeStyle: 'short' }).format(date);
}
