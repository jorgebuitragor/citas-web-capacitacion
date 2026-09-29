import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Availability, AppointmentStatus, bookingApi, Location, MyAppointment } from '../api/booking';

type Notice = { type: 'error' | 'success'; text: string } | null;
type Props = { token: string; onSignOut: () => void; onBooking: () => void };
type Filters = { status: AppointmentStatus | ''; date: string };
type CancelMode = 'confirm' | 'submitting' | 'success' | 'error' | null;

const statusLabels: Record<AppointmentStatus, string> = {
  REQUESTED: 'Solicitada',
  APPROVED: 'Aprobada',
  REJECTED: 'Rechazada',
  CANCELLED: 'Cancelada',
  COMPLETED: 'Completada',
  NO_SHOW: 'No asistió',
};

const initialFilters: Filters = { status: '', date: '' };

export function MyAppointmentsDashboard({ token, onSignOut, onBooking }: Props) {
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(initialFilters);
  const [items, setItems] = useState<MyAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState<Notice>(null);
  const [cancelTarget, setCancelTarget] = useState<MyAppointment | null>(null);
  const [cancelMode, setCancelMode] = useState<CancelMode>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<MyAppointment | null>(null);
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [calendarMonth, setCalendarMonth] = useState(() => monthStart(new Date()));
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(() => dateKey(new Date()));
  const cancelLock = useRef(false);
  const cancelTrigger = useRef<HTMLButtonElement | null>(null);
  const rescheduleTrigger = useRef<HTMLButtonElement | null>(null);
  const dialog = useRef<HTMLElement | null>(null);

  const load = useCallback(async (nextFilters: Filters) => {
    setLoading(true);
    setLoadError('');
    try {
      const response = await bookingApi.myAppointments(token, nextFilters);
      setItems(response.items);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'No fue posible cargar tus citas.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void load(appliedFilters); }, [appliedFilters, load]);
  useEffect(() => {
    if (cancelMode) {
      const firstButton = dialog.current?.querySelector<HTMLButtonElement>('button:not(:disabled)');
      (firstButton ?? dialog.current)?.focus();
    } else {
      cancelTrigger.current?.focus();
    }
  }, [cancelMode]);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    if (filters.status === appliedFilters.status && filters.date === appliedFilters.date) void load(filters);
    else setAppliedFilters({ ...filters });
  }

  function clearFilters() {
    setFilters(initialFilters);
    setNotice(null);
    if (!appliedFilters.status && !appliedFilters.date) void load(initialFilters);
    else setAppliedFilters(initialFilters);
  }

  async function confirmCancellation() {
    if (!cancelTarget || cancelLock.current || !cancelTarget.cancellationAllowed) return;
    cancelLock.current = true;
    setCancelMode('submitting');
    setNotice(null);
    try {
      const cancelled = await bookingApi.cancel(token, cancelTarget.id);
      setItems((current) => current.flatMap((item) => {
        if (item.id !== cancelled.id) return [item];
        if (appliedFilters.status && appliedFilters.status !== cancelled.status) return [];
        return [cancelled];
      }));
      setCancelTarget(cancelled);
      setCancelMode('success');
      setNotice({ type: 'success', text: 'Cita cancelada.' });
    } catch (error) {
      setCancelMode('error');
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'No fue posible cancelar la cita. La cita conserva su estado actual.' });
    } finally {
      cancelLock.current = false;
    }
  }

  function closeCancellation() {
    if (cancelMode === 'submitting') return;
    setCancelTarget(null);
    setCancelMode(null);
  }

  function handleDialogKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    if (event.key === 'Escape' && cancelMode !== 'submitting') {
      event.preventDefault();
      closeCancellation();
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
      <nav aria-label="Sesión"><button className="nav-active" onClick={() => undefined}>Mis citas</button><button onClick={onBooking}>Buscar cita</button><button onClick={onSignOut}>Cerrar sesión</button></nav>
    </header>
    <main className="portal-content appointments-page">
      <div className="appointments-hero">
        <div className="appointments-hero-copy">
          <p className="eyebrow"><span className="eyebrow-dot" /> TU ESPACIO DE SALUD</p>
          <h1>Mis citas</h1>
          <p className="intro">Organiza tus próximas atenciones y mantén todo bajo control.</p>
        </div>
        <div className="appointments-hero-icon" aria-hidden="true"><span>✚</span></div>
      </div>
      {notice && <div className={`notice ${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>{notice.text}</div>}
      <div className="appointments-summary" aria-label="Resumen de citas">
        <div className="summary-card"><span className="summary-icon summary-blue" aria-hidden="true">▦</span><span className="summary-label">Citas en esta vista</span><strong>{loading ? '—' : items.length}</strong></div>
        <div className="summary-card"><span className="summary-icon summary-green" aria-hidden="true">✓</span><span className="summary-label">Confirmadas</span><strong>{loading ? '—' : items.filter((item) => item.status === 'APPROVED').length}</strong></div>
        <div className="summary-card"><span className="summary-icon summary-amber" aria-hidden="true">◷</span><span className="summary-label">Por confirmar</span><strong>{loading ? '—' : items.filter((item) => item.status === 'REQUESTED').length}</strong></div>
      </div>
      <form className="appointment-filters" onSubmit={applyFilters}>
        <div className="filter-heading"><div><span className="filter-kicker">ENCUENTRA UNA CITA</span><strong>Filtrar resultados</strong></div><span className="filter-hint">Elige estado o fecha</span></div>
        <label className="field" htmlFor="appointment-status"><span>Estado</span><select id="appointment-status" value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value as Filters['status'] })}>
          <option value="">Todos los estados</option>
          {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select></label>
        <label className="field" htmlFor="appointment-date"><span>Fecha</span><input id="appointment-date" type="date" value={filters.date} onChange={(event) => setFilters({ ...filters, date: event.target.value })} /></label>
        <div className="filter-actions"><button className="primary-button" disabled={loading}>{loading ? 'Cargando…' : 'Aplicar filtros'}</button><button type="button" className="secondary-button" onClick={clearFilters}>Limpiar</button></div>
      </form>
      <section aria-live="polite" aria-busy={loading} className="appointments-results">
        <div className="results-toolbar"><div><span className="filter-kicker">TU AGENDA</span><h2>Resumen de citas</h2></div><div className="view-switch" role="group" aria-label="Vista de citas"><button className={view === 'list' ? 'selected' : ''} aria-pressed={view === 'list'} onClick={() => setView('list')}><span aria-hidden="true">☷</span> Lista</button><button className={view === 'calendar' ? 'selected' : ''} aria-pressed={view === 'calendar'} onClick={() => setView('calendar')}><span aria-hidden="true">▦</span> Calendario</button></div></div>
        {loading ? <div className="appointments-list"><AppointmentSkeleton /><AppointmentSkeleton /></div> : loadError ? <div className="empty-state error-panel" role="alert"><h2>No pudimos cargar tus citas</h2><p>{loadError}</p><button className="primary-button" onClick={() => void load(appliedFilters)}>Reintentar</button></div> : items.length === 0 ? <div className="empty-state"><span className="empty-calendar-icon" aria-hidden="true">▦</span><h2>No tienes citas para estos filtros</h2><p>Cuando tengas una cita, aparecerá aquí. También puedes probar con otros filtros.</p><button className="secondary-button" onClick={clearFilters}>Limpiar filtros</button></div> : view === 'calendar' ? <AppointmentCalendar items={items} month={calendarMonth} selectedDate={selectedCalendarDate} onMonthChange={setCalendarMonth} onSelectDate={setSelectedCalendarDate} onCancel={(item, button) => { cancelTrigger.current = button; setCancelTarget(item); setCancelMode('confirm'); }} onReschedule={(item, button) => { rescheduleTrigger.current = button; setRescheduleTarget(item); }} /> : <div className="appointments-list">{items.map((item) => <AppointmentCard key={item.id} item={item} onCancel={(button) => { cancelTrigger.current = button; setCancelTarget(item); setCancelMode('confirm'); }} onReschedule={(button) => { rescheduleTrigger.current = button; setRescheduleTarget(item); }} />)}</div>}
      </section>
    </main>
    {rescheduleTarget && <RescheduleDialog token={token} appointment={rescheduleTarget}
      onClose={() => { setRescheduleTarget(null); rescheduleTrigger.current?.focus(); }}
      onDone={(message) => { setNotice({ type: 'success', text: message }); void load(appliedFilters); }} />}
    {cancelTarget && cancelMode && <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeCancellation(); }}><section ref={dialog} tabIndex={-1} onKeyDown={handleDialogKeyDown} className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="cancel-title" aria-describedby="cancel-description">
      {cancelMode === 'confirm' && <><div className="modal-icon" aria-hidden="true">!</div><h2 id="cancel-title">¿Cancelar esta cita?</h2><p id="cancel-description">{formatDateTime(cancelTarget.startAt)} · {cancelTarget.specialty.name} con {cancelTarget.professional.name}</p><p className="dialog-warning">La cancelación no se puede reactivar directamente.</p><div className="dialog-actions"><button className="secondary-button" onClick={closeCancellation}>Volver</button><button className="danger-button" onClick={() => void confirmCancellation()}>Confirmar cancelación</button></div></>}
      {cancelMode === 'submitting' && <div role="status"><div className="modal-spinner" aria-hidden="true"/><h2 id="cancel-title">Cancelando…</h2><p id="cancel-description">Estamos actualizando tu cita.</p></div>}
      {cancelMode === 'success' && <div role="status"><div className="modal-success-icon" aria-hidden="true">✓</div><h2 id="cancel-title">Cita cancelada</h2><p id="cancel-description">El estado ahora es CANCELLED.</p><button className="primary-button modal-close" onClick={closeCancellation}>Entendido</button></div>}
      {cancelMode === 'error' && <div role="alert"><div className="modal-error-icon" aria-hidden="true">!</div><h2 id="cancel-title">No se pudo cancelar</h2><p id="cancel-description">{notice?.text}</p><div className="dialog-actions"><button className="secondary-button" onClick={closeCancellation}>Cerrar</button><button className="danger-button" onClick={() => setCancelMode('confirm')}>Reintentar</button></div></div>}
    </section></div>}
  </div>;
}

function AppointmentCard({ item, onCancel, onReschedule }: {
  item: MyAppointment; onCancel: (button: HTMLButtonElement) => void; onReschedule: (button: HTMLButtonElement) => void;
}) {
  return <article className="appointment-card">
    <div className="appointment-heading"><div><p className="appointment-date">{formatDateTime(item.startAt)}</p><p className="appointment-duration">{item.durationMinutes} minutos</p></div><span className={`status-badge status-${item.status.toLowerCase()}`}><span aria-hidden="true">{statusSymbol(item.status)}</span> {statusLabels[item.status]}</span></div>
    <div className="appointment-details"><p><strong>Especialidad</strong>{item.specialty.name}</p><p><strong>Profesional</strong>{item.professional.name}</p><p><strong>Sede</strong>{item.location.name}</p></div>
    {item.status === 'REJECTED' && item.rejectionReason && <p className="rejection-reason"><strong>Motivo de rechazo</strong>{item.rejectionReason}</p>}
    <RescheduleNotice item={item} />
    <div className="appointment-actions">
      {item.rescheduleAllowed && <button className="secondary-button" onClick={(event) => onReschedule(event.currentTarget)}>Reprogramar</button>}
      {item.cancellationAllowed && <button className="danger-button" onClick={(event) => onCancel(event.currentTarget)}>Cancelar cita</button>}
    </div>
  </article>;
}

function RescheduleNotice({ item }: { item: MyAppointment }) {
  const request = item.rescheduleRequest;
  if (!request || request.status === 'CANCELLED') return null;
  if (request.status === 'PENDING') {
    return <div className="reschedule-notice reschedule-pending" role="status">
      <strong><span aria-hidden="true">◷</span> Reprogramación pendiente</strong>
      <p>Solicitaste {formatDateTime(request.requestedStartAt)}. Tu cita actual se mantiene hasta que se decida.</p>
    </div>;
  }
  if (request.status === 'REJECTED') {
    return <div className="reschedule-notice reschedule-rejected">
      <strong><span aria-hidden="true">!</span> Reprogramación rechazada</strong>
      <p>La franja solicitada ({formatDateTime(request.requestedStartAt)}) no fue aprobada. Tu cita original se conserva.</p>
      {request.decisionReason && <p className="reschedule-reason"><strong>Motivo</strong>{request.decisionReason}</p>}
    </div>;
  }
  return <div className="reschedule-notice reschedule-approved" role="status">
    <strong><span aria-hidden="true">✓</span> Reprogramación aprobada</strong>
    <p>Tu cita quedó en la nueva franja.</p>
  </div>;
}

function AppointmentCalendar({ items, month, selectedDate, onMonthChange, onSelectDate, onCancel, onReschedule }: {
  items: MyAppointment[]; month: Date; selectedDate: string; onMonthChange: (date: Date) => void;
  onSelectDate: (date: string) => void; onCancel: (item: MyAppointment, button: HTMLButtonElement) => void;
  onReschedule: (item: MyAppointment, button: HTMLButtonElement) => void;
}) {
  const firstOfGrid = new Date(month.getFullYear(), month.getMonth(), 1 - ((month.getDay() + 6) % 7));
  const days = Array.from({ length: 42 }, (_, index) => new Date(firstOfGrid.getFullYear(), firstOfGrid.getMonth(), firstOfGrid.getDate() + index));
  const selectedItems = items.filter((item) => dateKeyFromValue(item.startAt) === selectedDate).sort((a, b) => a.startAt.localeCompare(b.startAt));
  const monthLabel = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric', timeZone: 'America/Bogota' }).format(month);
  const weekdays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  return <div className="calendar-layout">
    <section className="calendar-panel" aria-label="Calendario mensual de citas">
      <div className="calendar-heading"><div><span className="calendar-kicker">CALENDARIO</span><h3>{capitalize(monthLabel)}</h3></div><div className="calendar-controls"><button aria-label="Mes anterior" onClick={() => { const next = new Date(month.getFullYear(), month.getMonth() - 1, 1); onMonthChange(next); onSelectDate(dateKey(next)); }}>‹</button><button className="calendar-today" onClick={() => { const today = new Date(); onMonthChange(monthStart(today)); onSelectDate(dateKey(today)); }}>Hoy</button><button aria-label="Mes siguiente" onClick={() => { const next = new Date(month.getFullYear(), month.getMonth() + 1, 1); onMonthChange(next); onSelectDate(dateKey(next)); }}>›</button></div></div>
      <div className="calendar-grid" role="grid" aria-label={monthLabel}>
        {weekdays.map((day) => <div key={day} className="calendar-weekday" role="columnheader">{day}</div>)}
        {days.map((day) => {
          const key = dateKey(day);
          const dayItems = items.filter((item) => dateKeyFromValue(item.startAt) === key);
          const inMonth = day.getMonth() === month.getMonth();
          const today = key === dateKey(new Date());
          return <button key={key} role="gridcell" aria-selected={key === selectedDate} aria-label={`${day.getDate()} ${new Intl.DateTimeFormat('es-CO', { month: 'long' }).format(day)}${dayItems.length ? `, ${dayItems.length} citas` : ''}`} className={`calendar-day${inMonth ? '' : ' outside-month'}${today ? ' is-today' : ''}${key === selectedDate ? ' is-selected' : ''}`} onClick={() => onSelectDate(key)}>
            <span className="calendar-day-number">{day.getDate()}</span>{dayItems.length > 0 && <span className="calendar-day-meta"><i />{dayItems.length} {dayItems.length === 1 ? 'cita' : 'citas'}</span>}
          </button>;
        })}
      </div>
      <div className="calendar-legend"><span><i className="legend-dot" /> Día con citas</span><span><i className="legend-ring" /> Hoy</span></div>
    </section>
    <aside className="calendar-day-panel" aria-live="polite">
      <div className="selected-day-heading"><span className="calendar-kicker">AGENDA DEL DÍA</span><h3>{selectedDateLabel(selectedDate)}</h3><p>{selectedItems.length ? `${selectedItems.length} ${selectedItems.length === 1 ? 'atención programada' : 'atenciones programadas'}` : 'Sin citas programadas'}</p></div>
      {selectedItems.length ? <div className="day-appointments">{selectedItems.map((item) => <article className="day-appointment" key={item.id}><div className="day-appointment-time"><strong>{formatTime(item.startAt)}</strong><span>{item.durationMinutes} min</span></div><div className="day-appointment-copy"><span className={`status-badge status-${item.status.toLowerCase()}`}>{statusLabels[item.status]}</span><h4>{item.specialty.name}</h4><p>{item.professional.name}</p><small>{item.location.name}</small>{item.status === 'REJECTED' && item.rejectionReason && <p className="day-rejection">Motivo: {item.rejectionReason}</p>}{item.rescheduleRequest?.status === 'PENDING' && <p className="day-reschedule" role="status">Reprogramación pendiente para {formatDateTime(item.rescheduleRequest.requestedStartAt)}. La cita actual se mantiene.</p>}{item.rescheduleRequest?.status === 'REJECTED' && item.rescheduleRequest.decisionReason && <p className="day-reschedule">Reprogramación rechazada: {item.rescheduleRequest.decisionReason}</p>}{item.rescheduleAllowed && <button className="calendar-reschedule" onClick={(event) => onReschedule(item, event.currentTarget)}>Reprogramar</button>}{item.cancellationAllowed && <button className="calendar-cancel" onClick={(event) => onCancel(item, event.currentTarget)}>Cancelar cita</button>}</div></article>)}</div> : <div className="calendar-day-empty"><span aria-hidden="true">◷</span><p>Este día está libre. Puedes elegir otra fecha en el calendario.</p></div>}
    </aside>
  </div>;
}

function AppointmentSkeleton() { return <div className="appointment-card skeleton-card" aria-label="Cargando cita"><span /><span /><span /></div>; }

type RescheduleMode = 'form' | 'submitting' | 'success' | 'error';

/**
 * HU-020. Conserva profesional y especialidad; solo permite elegir una sede habilitada
 * para ese profesional y una franja completa que el backend ofrezca como disponible.
 */
function RescheduleDialog({ token, appointment, onClose, onDone }: {
  token: string; appointment: MyAppointment; onClose: () => void; onDone: (message: string) => void;
}) {
  const [mode, setMode] = useState<RescheduleMode>('form');
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationId, setLocationId] = useState(appointment.location.id);
  const [date, setDate] = useState(tomorrowKey());
  const [slots, setSlots] = useState<Availability[]>([]);
  const [selected, setSelected] = useState<Availability | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState('');
  const dialog = useRef<HTMLElement | null>(null);
  const lock = useRef(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const all = await bookingApi.locations(token);
        const enabled: Location[] = [];
        for (const location of all) {
          const professionals = await bookingApi.professionals(token, location.id, appointment.specialty.id);
          if (professionals.some((value) => value.id === appointment.professional.id)) enabled.push(location);
        }
        if (active) setLocations(enabled.length > 0 ? enabled : all.filter((value) => value.id === appointment.location.id));
      } catch {
        if (active) setLocations([appointment.location as Location]);
      }
    })();
    return () => { active = false; };
  }, [token, appointment]);

  const loadSlots = useCallback(async () => {
    setLoadingSlots(true);
    setError('');
    setSelected(null);
    try {
      const response = await bookingApi.availability(token, {
        locationId, specialtyId: appointment.specialty.id, professionalId: appointment.professional.id, date,
      });
      setSlots(response.items);
    } catch (problem) {
      setSlots([]);
      setError(problem instanceof Error ? problem.message : 'No fue posible cargar las franjas disponibles.');
    } finally {
      setLoadingSlots(false);
    }
  }, [token, locationId, date, appointment]);

  useEffect(() => { void loadSlots(); }, [loadSlots]);
  useEffect(() => { (dialog.current?.querySelector<HTMLElement>('select, button:not(:disabled)') ?? dialog.current)?.focus(); }, [mode]);

  async function submit() {
    if (!selected || lock.current) return;
    lock.current = true;
    setMode('submitting');
    setError('');
    try {
      await bookingApi.requestReschedule(token, appointment.id, {
        locationId, specialtyId: appointment.specialty.id, professionalId: appointment.professional.id, startAt: selected.startAt,
      });
      setMode('success');
      onDone('Solicitud de reprogramación enviada. Tu cita actual se mantiene hasta la decisión.');
    } catch (problem) {
      setMode('error');
      setError(problem instanceof Error ? problem.message : 'No fue posible solicitar la reprogramación.');
    } finally {
      lock.current = false;
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    if (event.key === 'Escape' && mode !== 'submitting') { event.preventDefault(); onClose(); }
  }

  return <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && mode !== 'submitting') onClose(); }}>
    <section ref={dialog} tabIndex={-1} onKeyDown={handleKeyDown} className="confirm-dialog reschedule-dialog" role="dialog" aria-modal="true"
             aria-labelledby="reschedule-title" aria-describedby="reschedule-description">
      <h2 id="reschedule-title">Reprogramar cita</h2>
      <p id="reschedule-description">{formatDateTime(appointment.startAt)} · {appointment.specialty.name} con {appointment.professional.name}</p>
      <p className="dialog-warning">Se mantiene el mismo profesional y la misma especialidad. Tu cita actual se conserva hasta que se decida la solicitud.</p>
      {mode === 'success' ? <div role="status"><div className="modal-success-icon" aria-hidden="true">✓</div><p>Solicitud enviada. Queda pendiente de aprobación.</p><button className="primary-button modal-close" onClick={onClose}>Entendido</button></div> : <>
        <label className="field" htmlFor="reschedule-location"><span>Sede</span>
          <select id="reschedule-location" value={locationId} disabled={mode === 'submitting'} onChange={(event) => setLocationId(event.target.value)}>
            {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
          </select>
        </label>
        <label className="field" htmlFor="reschedule-date"><span>Nueva fecha</span>
          <input id="reschedule-date" type="date" min={tomorrowKey()} value={date} disabled={mode === 'submitting'}
                 onChange={(event) => setDate(event.target.value)} />
        </label>
        <div className="reschedule-slots" aria-live="polite" aria-busy={loadingSlots}>
          <span className="filter-kicker">FRANJAS DISPONIBLES</span>
          {loadingSlots ? <p>Cargando franjas…</p> : error && slots.length === 0 ? <p role="alert">{error}</p>
            : slots.length === 0 ? <p>No hay franjas disponibles para esa fecha. Prueba con otro día o sede.</p>
            : <div className="slot-grid">{slots.map((slot) => <button type="button" key={slot.startAt} disabled={mode === 'submitting'}
                aria-pressed={selected?.startAt === slot.startAt} className={selected?.startAt === slot.startAt ? 'slot selected' : 'slot'}
                onClick={() => setSelected(slot)}>{slot.startAt.slice(11, 16)} – {slot.endAt.slice(11, 16)}</button>)}</div>}
        </div>
        {mode === 'error' && error && <p className="notice error" role="alert">{error}</p>}
        <div className="dialog-actions">
          <button className="secondary-button" disabled={mode === 'submitting'} onClick={onClose}>Volver</button>
          <button className="primary-button" disabled={!selected || mode === 'submitting'} onClick={() => void submit()}>
            {mode === 'submitting' ? 'Enviando…' : 'Solicitar reprogramación'}
          </button>
        </div>
      </>}
    </section>
  </div>;
}

function tomorrowKey() {
  const value = new Date();
  value.setDate(value.getDate() + 1);
  return dateKey(value);
}

function statusSymbol(status: AppointmentStatus) { return status === 'APPROVED' ? '✓' : status === 'REJECTED' ? '!' : status === 'CANCELLED' ? '×' : '•'; }

function formatDateTime(value: string) {
  const date = new Date(/[zZ]|[+-]\d\d:\d\d$/.test(value) ? value : `${value}-05:00`);
  return new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', dateStyle: 'full', timeStyle: 'short' }).format(date);
}

function formatTime(value: string) { return value.slice(11, 16); }
function dateKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
function dateKeyFromValue(value: string) { return value.slice(0, 10); }
function monthStart(date: Date) { return new Date(date.getFullYear(), date.getMonth(), 1); }
function capitalize(value: string) { return value.charAt(0).toLocaleUpperCase('es-CO') + value.slice(1); }
function selectedDateLabel(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Bogota' }).format(new Date(year, month - 1, day, 12));
}
