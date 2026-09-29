import { FormEvent, useEffect, useState } from 'react';
import { Availability, bookingApi, Location, Professional, Specialty } from '../api/booking';

type Notice = { type: 'error' | 'success'; text: string } | null;
type Filters = { locationId: string; specialtyId: string; professionalId: string; date: string };
type Props = { token: string; onSignOut: () => void; onAdmin: () => void; isAdmin: boolean; onAppointments?: () => void };

const stepLabels = ['Filtra tu búsqueda', 'Elige una franja', 'Confirma la cita'];
const emptyFilters = (): Filters => ({ locationId: '', specialtyId: '', professionalId: '', date: tomorrow() });

export function BookingDashboard({ token, onSignOut, onAdmin, isAdmin, onAppointments }: Props) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loadingProfessionals, setLoadingProfessionals] = useState(false);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [slots, setSlots] = useState<Availability[]>([]);
  const [selected, setSelected] = useState<Availability | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [loading, setLoading] = useState(true);
  const [searched, setSearched] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const showError = (error: unknown) => setNotice({ type: 'error', text: error instanceof Error ? error.message : 'No fue posible cargar la información.' });

  useEffect(() => {
    Promise.all([bookingApi.locations(token), bookingApi.specialties(token)])
      .then(([nextLocations, nextSpecialties]) => { setLocations(nextLocations); setSpecialties(nextSpecialties); })
      .catch(showError)
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    setProfessionals([]);
    setFilters((value) => ({ ...value, professionalId: '' }));
    const hasFilters = Boolean(filters.locationId && filters.specialtyId);
    setLoadingProfessionals(hasFilters);
    if (hasFilters) bookingApi.professionals(token, filters.locationId, filters.specialtyId).then(setProfessionals).catch(showError).finally(() => setLoadingProfessionals(false));
  }, [filters.locationId, filters.specialtyId, token]);

  async function search(event: FormEvent) {
    event.preventDefault();
    setLoading(true); setNotice(null); setSelected(null);
    try { setSlots((await bookingApi.availability(token, filters)).items); setSearched(true); }
    catch (error) { showError(error); }
    finally { setLoading(false); }
  }

  async function confirm() {
    if (!selected) return;
    setSubmitting(true); setNotice(null);
    try {
      const appointment = await bookingApi.create(token, { ...filters, startAt: selected.startAt });
      setNotice({ type: 'success', text: appointment.status === 'APPROVED' ? 'Tu cita quedó aprobada automáticamente.' : 'Tu solicitud fue enviada y mantiene la franja reservada.' });
      setSlots((await bookingApi.availability(token, filters)).items);
      setSelected(null);
    } catch (error) {
      showError(error);
      try { setSlots((await bookingApi.availability(token, filters)).items); } catch { /* Keep original error. */ }
    } finally { setSubmitting(false); }
  }

  function clearFilters() {
    setFilters(emptyFilters());
    setSlots([]); setSelected(null); setSearched(false); setNotice(null);
  }

  const location = locations.find((item) => item.id === filters.locationId);
  const specialty = specialties.find((item) => item.id === filters.specialtyId);
  const professional = professionals.find((item) => item.id === filters.professionalId);
  const noProfessionals = Boolean(filters.locationId && filters.specialtyId) && !loadingProfessionals && professionals.length === 0;
  const groups = [
    { label: 'Mañana', icon: '☀', items: slots.filter((slot) => hourOf(slot.startAt) < 12) },
    { label: 'Tarde', icon: '☾', items: slots.filter((slot) => hourOf(slot.startAt) >= 12) },
  ].filter((group) => group.items.length > 0);
  const step = selected ? 2 : searched && slots.length > 0 ? 1 : 0;

  return <div className="portal-shell">
    <header className="topbar">
      <span className="brand"><span className="brand-mark">✚</span><span>MediSchedule</span></span>
      <nav aria-label="Sesión">
        {onAppointments && <button onClick={onAppointments}>Mis citas</button>}
        <button className="nav-active" onClick={() => undefined}>Buscar cita</button>
        {isAdmin && <button onClick={onAdmin}>Bandeja ADMIN</button>}
        <button onClick={onSignOut}>Cerrar sesión</button>
      </nav>
    </header>
    <main className="portal-content booking-page">
      <div className="appointments-hero booking-hero">
        <div className="appointments-hero-copy">
          <p className="eyebrow"><span className="eyebrow-dot" /> AGENDA UNA ATENCIÓN</p>
          <h1>Busca tu cita</h1>
          <p className="intro">Elige sede, especialidad, profesional y fecha. Solo verás franjas completas disponibles.</p>
        </div>
        <div className="appointments-hero-icon" aria-hidden="true"><span>◷</span></div>
      </div>

      <ol className="booking-steps" aria-label="Progreso de la reserva">
        {stepLabels.map((label, index) => <li
          key={label}
          className={`booking-step${index === step ? ' is-current' : index < step ? ' is-done' : ''}`}
          aria-current={index === step ? 'step' : undefined}
        ><span className="booking-step-index" aria-hidden="true">{index < step ? '✓' : index + 1}</span><span>{label}</span></li>)}
      </ol>

      {notice && <div className={`notice ${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>{notice.text}</div>}

      <form className="appointment-filters booking-filters-panel" onSubmit={search}>
        <div className="filter-heading">
          <div><span className="filter-kicker">DEFINE TU BÚSQUEDA</span><strong>Filtrar disponibilidad</strong></div>
          <span className="filter-hint">Los cuatro campos son obligatorios</span>
        </div>
        <label className="field" htmlFor="location"><span>Sede</span><select id="location" required value={filters.locationId} onChange={(event) => setFilters({ ...filters, locationId: event.target.value })}>
          <option value="">Selecciona una sede</option>
          {locations.map((value) => <option key={value.id} value={value.id}>{value.name}</option>)}
        </select></label>
        <label className="field" htmlFor="specialty"><span>Especialidad</span><select id="specialty" required value={filters.specialtyId} onChange={(event) => setFilters({ ...filters, specialtyId: event.target.value })}>
          <option value="">Selecciona una especialidad</option>
          {specialties.map((value) => <option key={value.id} value={value.id}>{value.name} · {value.durationMinutes} min</option>)}
        </select></label>
        <label className="field" htmlFor="professional"><span>Profesional</span><select id="professional" required disabled={!filters.specialtyId || !filters.locationId} value={filters.professionalId} onChange={(event) => setFilters({ ...filters, professionalId: event.target.value })}>
          <option value="">{loadingProfessionals ? 'Cargando profesionales…' : 'Selecciona un profesional'}</option>
          {professionals.map((value) => <option key={value.id} value={value.id}>{value.name}</option>)}
        </select></label>
        <label className="field" htmlFor="date"><span>Fecha</span><input id="date" type="date" min={tomorrow()} required value={filters.date} onChange={(event) => setFilters({ ...filters, date: event.target.value })} /></label>
        <div className="filter-actions">
          <button className="primary-button" disabled={loading || !filters.professionalId}>{loading ? 'Buscando…' : 'Buscar disponibilidad'}</button>
          <button type="button" className="secondary-button" onClick={clearFilters}>Limpiar</button>
        </div>
        {!filters.locationId || !filters.specialtyId
          ? <p className="booking-field-hint" role="status">Elige primero una sede y una especialidad para habilitar el listado de profesionales.</p>
          : noProfessionals
            ? <p className="booking-field-hint is-warning" role="status">No hay profesionales disponibles para esta sede y especialidad.</p>
            : specialty
              ? <p className="booking-field-hint" role="status">{specialty.name} dura {specialty.durationMinutes} minutos y {specialty.requiresAdminApproval ? 'requiere aprobación administrativa.' : 'se aprueba automáticamente.'}</p>
              : null}
      </form>

      <section aria-live="polite" aria-busy={loading} className="appointments-results">
        <div className="results-toolbar">
          <div><span className="filter-kicker">DISPONIBILIDAD</span><h2>Franjas disponibles</h2></div>
          {searched && slots.length > 0 && <span className="slot-total">{slots.length} {slots.length === 1 ? 'franja' : 'franjas'} · {formatLongDate(filters.date)}</span>}
        </div>
        {loading
          ? <div className="booking-skeletons" aria-hidden="true"><span /><span /><span /></div>
          : !searched
            ? <div className="empty-state"><span className="empty-calendar-icon" aria-hidden="true">◷</span><h2>Aún no has buscado franjas</h2><p>Completa los filtros y pulsa «Buscar disponibilidad». Te mostraremos únicamente los horarios que caben completos en la agenda del profesional.</p></div>
            : slots.length === 0
              ? <div className="empty-state"><span className="empty-calendar-icon" aria-hidden="true">◷</span><h2>No hay franjas para esos filtros</h2><p>Prueba con otra fecha, o con otro profesional de la misma especialidad.</p><button type="button" className="secondary-button" onClick={clearFilters}>Limpiar filtros</button></div>
              : <div className="slot-groups">{groups.map((group) => <section className="slot-group" key={group.label}>
                <div className="slot-group-heading"><span className="slot-group-icon" aria-hidden="true">{group.icon}</span><h3>{group.label}</h3><span className="slot-group-count">{group.items.length}</span></div>
                <div className="slot-grid" role="group" aria-label={`Franjas de la ${group.label.toLowerCase()}`}>{group.items.map((slot) => <button
                  type="button"
                  key={slot.startAt}
                  aria-pressed={selected?.startAt === slot.startAt}
                  className={selected?.startAt === slot.startAt ? 'slot selected' : 'slot'}
                  onClick={() => setSelected(slot)}
                >{formatTime(slot.startAt)} – {formatTime(slot.endAt)}</button>)}</div>
              </section>)}</div>}
      </section>

      {selected && <aside className="booking-summary" aria-label="Resumen de la franja elegida">
        <div className="booking-summary-copy">
          <span className="filter-kicker">FRANJA ELEGIDA</span>
          <h3>{formatTime(selected.startAt)} – {formatTime(selected.endAt)} · {formatLongDate(filters.date)}</h3>
          <div className="booking-summary-grid">
            <p><strong>Sede</strong>{location?.name ?? '—'}</p>
            <p><strong>Especialidad</strong>{specialty?.name ?? '—'}</p>
            <p><strong>Profesional</strong>{professional?.name ?? '—'}</p>
            <p><strong>Duración</strong>{specialty ? `${specialty.durationMinutes} minutos` : '—'}</p>
          </div>
          <p className="booking-summary-note">{specialty?.requiresAdminApproval
            ? 'Esta especialidad requiere aprobación administrativa: la franja queda reservada mientras se revisa tu solicitud.'
            : 'Esta cita se aprueba automáticamente al confirmar.'}</p>
        </div>
        <div className="booking-summary-actions">
          <button className="primary-button" onClick={confirm} disabled={submitting}>{submitting ? 'Confirmando…' : 'Confirmar franja'}</button>
          <button type="button" className="secondary-button" disabled={submitting} onClick={() => setSelected(null)}>Elegir otra</button>
        </div>
      </aside>}
    </main>
  </div>;
}

function tomorrow() {
  const value = new Date(Date.now() + 86_400_000);
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(value);
  const part = (type: string) => parts.find((item) => item.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function hourOf(value: string) { return Number(value.slice(11, 13)); }

function formatTime(value: string) {
  return new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(`${value}-05:00`));
}

function formatLongDate(value: string) {
  if (!value) return '';
  const label = new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${value}T12:00:00-05:00`));
  return label.charAt(0).toUpperCase() + label.slice(1);
}
