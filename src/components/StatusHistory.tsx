import { useState } from 'react';
import { bookingApi, StatusHistoryEvent } from '../api/booking';

const statusLabels: Record<string, string> = {
  REQUESTED: 'Solicitada', APPROVED: 'Aprobada', REJECTED: 'Rechazada',
  CANCELLED: 'Cancelada', COMPLETED: 'Atendida', NO_SHOW: 'No asistió',
};
const sourceLabels: Record<string, string> = { SYSTEM: 'Sistema', USER: 'Usuario', ADMIN: 'Administrador' };

/**
 * HU-025. El backend es la autoridad de ownership (DEC-007); este componente
 * solo muestra lo que la API autoriza para el rol de quien consulta.
 */
export function StatusHistoryToggle({ token, appointmentId }: { token: string; appointmentId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<StatusHistoryEvent[] | null>(null);

  function toggle() {
    if (open) { setOpen(false); return; }
    setOpen(true);
    if (items !== null) return;
    setLoading(true); setError(null);
    bookingApi.statusHistory(token, appointmentId).then((response) => setItems(response.items))
      .catch((err) => setError(err instanceof Error ? err.message : 'No fue posible cargar el historial.'))
      .finally(() => setLoading(false));
  }

  return <div className="status-history">
    <button type="button" className="link-button" onClick={toggle} aria-expanded={open}>
      {open ? 'Ocultar historial' : 'Ver historial'}
    </button>
    {open && <div role="region" aria-label={`Historial de estados de la cita ${appointmentId}`}>
      {loading ? <p>Cargando historial…</p>
        : error ? <p role="alert" className="notice error">{error}</p>
        : items && items.length === 0 ? <p>Sin eventos registrados.</p>
        : <ul className="status-history-list">
            {items?.map((event) => <li key={event.id}>
              <strong>{statusLabels[event.status] ?? event.status}</strong>
              {' · '}{sourceLabels[event.source] ?? event.source}
              {event.actor ? ` (${event.actor.name})` : ''}
              {' · '}{formatDateTime(event.changedAt)}
              {event.reason ? <em> — {event.reason}</em> : null}
            </li>)}
          </ul>}
    </div>}
  </div>;
}

function formatDateTime(value: string) { return new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(`${value}-05:00`)); }
