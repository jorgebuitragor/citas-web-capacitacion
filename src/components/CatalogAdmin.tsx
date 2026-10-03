import { FormEvent, useCallback, useEffect, useState } from 'react';
import { catalogApi, Eps, InsuranceRegime, Plan, SpecialtyAdmin } from '../api/catalog';
import { Field, NoticeBox, Notice, PortalLayout } from '../App';

/**
 * HU-006/HU-007/HU-008 (DEC-009). code (y, para especialidades, durationMinutes/
 * general/requiresAdminApproval) son inmutables tras crear: estos formularios no
 * ofrecen editarlos, solo nombre y activo/inactivo, igual que permite el contrato.
 */
export function CatalogsDashboard({ token, onSignOut, onBack }: { token: string; onSignOut: () => void; onBack: () => void }) {
  return <PortalLayout title="Catálogos configurables" onSignOut={onSignOut} action={<button onClick={onBack}>Volver a solicitudes</button>}>
    <EpsAndPlansSection token={token} />
    <SpecialtiesSection token={token} />
  </PortalLayout>;
}

function EpsAndPlansSection({ token }: { token: string }) {
  const [epsList, setEpsList] = useState<Eps[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<Notice>(null);
  const [form, setForm] = useState({ code: '', name: '' });
  const [submitting, setSubmitting] = useState(false);
  const [selected, setSelected] = useState<Eps | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    catalogApi.listEps(token).then(setEpsList)
      .catch((error) => setNotice({ type: 'error', text: error instanceof Error ? error.message : 'No fue posible cargar las EPS.' }))
      .finally(() => setLoading(false));
  }, [token]);
  useEffect(load, [load]);

  async function createEps(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true); setNotice(null);
    try {
      await catalogApi.createEps(token, form);
      setForm({ code: '', name: '' });
      setNotice({ type: 'success', text: 'EPS creada.' });
      load();
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'No fue posible crear la EPS.' });
    } finally { setSubmitting(false); }
  }

  async function toggleActive(eps: Eps) {
    try {
      await catalogApi.updateEps(token, eps.id, { active: !eps.active });
      load();
      if (selected?.id === eps.id) setSelected({ ...eps, active: !eps.active });
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'No fue posible actualizar la EPS.' });
    }
  }

  return <section aria-labelledby="eps-heading" className="reschedule-inbox">
    <h2 id="eps-heading">EPS</h2>
    {notice && <NoticeBox notice={notice} />}
    <form onSubmit={createEps} className="filter-row" aria-label="Crear EPS">
      <Field label="Código" htmlFor="eps-code"><input id="eps-code" required maxLength={30} value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} /></Field>
      <Field label="Nombre" htmlFor="eps-name"><input id="eps-name" required maxLength={150} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
      <button className="primary-button" disabled={submitting}>{submitting ? 'Creando…' : 'Crear EPS'}</button>
    </form>
    {loading ? <p>Cargando EPS…</p> : epsList.length === 0 ? <p>No hay EPS registradas.</p> : <div className="pending-list">
      {epsList.map((eps) => <article className="pending-card" key={eps.id}>
        <h3>{eps.name}</h3>
        <p>{eps.code} · {eps.active ? 'Activa' : 'Inactiva'}</p>
        <div className="decision-row">
          <button className="secondary-button" onClick={() => setSelected(selected?.id === eps.id ? null : eps)}>{selected?.id === eps.id ? 'Ocultar planes' : 'Ver planes'}</button>
          <button className={eps.active ? 'danger-button' : 'primary-button'} onClick={() => toggleActive(eps)}>{eps.active ? 'Desactivar' : 'Activar'}</button>
        </div>
        {selected?.id === eps.id && <PlansSubsection token={token} eps={eps} />}
      </article>)}
    </div>}
  </section>;
}

function PlansSubsection({ token, eps }: { token: string; eps: Eps }) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [regimes, setRegimes] = useState<InsuranceRegime[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<Notice>(null);
  const [form, setForm] = useState({ regimeId: '', code: '', name: '' });
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([catalogApi.listPlans(token, eps.id), catalogApi.insuranceRegimes(token)])
      .then(([nextPlans, nextRegimes]) => { setPlans(nextPlans); setRegimes(nextRegimes); })
      .catch((error) => setNotice({ type: 'error', text: error instanceof Error ? error.message : 'No fue posible cargar los planes.' }))
      .finally(() => setLoading(false));
  }, [token, eps.id]);
  useEffect(load, [load]);

  async function createPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.regimeId) { setNotice({ type: 'error', text: 'Elige un régimen.' }); return; }
    setSubmitting(true); setNotice(null);
    try {
      await catalogApi.createPlan(token, eps.id, form);
      setForm({ regimeId: '', code: '', name: '' });
      setNotice({ type: 'success', text: 'Plan creado.' });
      load();
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'No fue posible crear el plan.' });
    } finally { setSubmitting(false); }
  }

  async function togglePlan(plan: Plan) {
    try { await catalogApi.updatePlan(token, eps.id, plan.id, { active: !plan.active }); load(); }
    catch (error) { setNotice({ type: 'error', text: error instanceof Error ? error.message : 'No fue posible actualizar el plan.' }); }
  }

  return <div className="reschedule-windows" aria-label={`Planes de ${eps.name}`} style={{ display: 'block', marginTop: '1rem' }}>
    <h4>Planes de {eps.name}</h4>
    {notice && <NoticeBox notice={notice} />}
    <form onSubmit={createPlan} className="filter-row" aria-label="Crear plan">
      <Field label="Régimen" htmlFor={`plan-regime-${eps.id}`}>
        <select id={`plan-regime-${eps.id}`} required value={form.regimeId} onChange={(event) => setForm({ ...form, regimeId: event.target.value })}>
          <option value="">Selecciona un régimen</option>
          {regimes.map((regime) => <option key={regime.id} value={regime.id}>{regime.name}</option>)}
        </select>
      </Field>
      <Field label="Código" htmlFor={`plan-code-${eps.id}`}><input id={`plan-code-${eps.id}`} required maxLength={50} value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} /></Field>
      <Field label="Nombre" htmlFor={`plan-name-${eps.id}`}><input id={`plan-name-${eps.id}`} required maxLength={150} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
      <button className="primary-button" disabled={submitting}>{submitting ? 'Creando…' : 'Crear plan'}</button>
    </form>
    {loading ? <p>Cargando planes…</p> : plans.length === 0 ? <p>Esta EPS no tiene planes.</p> : <ul className="status-history-list">
      {plans.map((plan) => <li key={plan.id}>
        <strong>{plan.name}</strong> · {plan.code} · {plan.regime.name} · {plan.active ? 'Activo' : 'Inactivo'}{' '}
        <button className={plan.active ? 'danger-button' : 'primary-button'} onClick={() => togglePlan(plan)}>{plan.active ? 'Desactivar' : 'Activar'}</button>
      </li>)}
    </ul>}
  </div>;
}

function SpecialtiesSection({ token }: { token: string }) {
  const [specialties, setSpecialties] = useState<SpecialtyAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<Notice>(null);
  const [form, setForm] = useState({ code: '', name: '', durationMinutes: '30', general: false, requiresAdminApproval: true });
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    catalogApi.listSpecialties(token).then(setSpecialties)
      .catch((error) => setNotice({ type: 'error', text: error instanceof Error ? error.message : 'No fue posible cargar las especialidades.' }))
      .finally(() => setLoading(false));
  }, [token]);
  useEffect(load, [load]);

  async function createSpecialty(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true); setNotice(null);
    try {
      await catalogApi.createSpecialty(token, { ...form, durationMinutes: Number(form.durationMinutes) });
      setForm({ code: '', name: '', durationMinutes: '30', general: false, requiresAdminApproval: true });
      setNotice({ type: 'success', text: 'Especialidad creada.' });
      load();
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'No fue posible crear la especialidad.' });
    } finally { setSubmitting(false); }
  }

  async function toggleActive(specialty: SpecialtyAdmin) {
    try { await catalogApi.updateSpecialty(token, specialty.id, { active: !specialty.active }); load(); }
    catch (error) { setNotice({ type: 'error', text: error instanceof Error ? error.message : 'No fue posible actualizar la especialidad.' }); }
  }

  return <section aria-labelledby="specialties-heading" className="reschedule-inbox">
    <h2 id="specialties-heading">Especialidades</h2>
    {notice && <NoticeBox notice={notice} />}
    <form onSubmit={createSpecialty} className="filter-row" aria-label="Crear especialidad">
      <Field label="Código" htmlFor="specialty-code"><input id="specialty-code" required maxLength={50} value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} /></Field>
      <Field label="Nombre" htmlFor="specialty-name"><input id="specialty-name" required maxLength={150} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
      <Field label="Duración" htmlFor="specialty-duration">
        <select id="specialty-duration" value={form.durationMinutes} onChange={(event) => setForm({ ...form, durationMinutes: event.target.value })}>
          <option value="30">30 minutos</option>
          <option value="60">60 minutos</option>
        </select>
      </Field>
      <label className="inline-field"><input type="checkbox" checked={form.general} onChange={(event) => setForm({ ...form, general: event.target.checked })} /> Medicina general</label>
      <label className="inline-field"><input type="checkbox" checked={form.requiresAdminApproval} onChange={(event) => setForm({ ...form, requiresAdminApproval: event.target.checked })} /> Requiere aprobación ADMIN</label>
      <button className="primary-button" disabled={submitting}>{submitting ? 'Creando…' : 'Crear especialidad'}</button>
    </form>
    {loading ? <p>Cargando especialidades…</p> : specialties.length === 0 ? <p>No hay especialidades registradas.</p> : <div className="pending-list">
      {specialties.map((specialty) => <article className="pending-card" key={specialty.id}>
        <h3>{specialty.name}</h3>
        <p>{specialty.code} · {specialty.durationMinutes} min · {specialty.active ? 'Activa' : 'Inactiva'}</p>
        <p>{specialty.general ? 'Medicina general' : 'Especializada'} · {specialty.requiresAdminApproval ? 'Requiere aprobación ADMIN' : 'Aprobación automática'}</p>
        <div className="decision-row">
          <button className={specialty.active ? 'danger-button' : 'primary-button'} onClick={() => toggleActive(specialty)}>{specialty.active ? 'Desactivar' : 'Activar'}</button>
        </div>
      </article>)}
    </div>}
  </section>;
}
