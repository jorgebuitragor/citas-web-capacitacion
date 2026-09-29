# Propuesta de diseño — Solicitar y decidir reprogramación (HU-020 / HU-021)

**Estado:** APROBADA e implementada — 2026-09-29. El usuario aprobó la propuesta junto con el contrato REST y confirmó que la reprogramación puede cambiar de sede entre las habilitadas del mismo profesional.
**Base visual:** continuidad con las pantallas ya implementadas y aprobadas: la línea base de autenticación (DEC-002) y la vista «Mis citas» adaptada de la referencia `medischedule` que el usuario compartió y aprobó para guiar HU-018/HU-019. No se introduce una segunda paleta ni un rediseño de lo aprobado.
**Alcance:** dos flujos dentro de pantallas existentes, no dos pantallas nuevas desde cero. Cubre las pantallas obligatorias del PRD §6 «solicitar reprogramación» y «aprobar/rechazar reprogramaciones».

## Tokens visuales reutilizados

Los mismos ya presentes en `src/styles.css`: Poppins con respaldo Arial/sans-serif; azul marino `#001549` en títulos; azul primario `#002777`; acento `#006398` para enlaces y foco; fondo `#f9f9ff`; superficies blancas; controles `#f8faff`; borde neutro `#c5c6d3`; radios de 8–14 px; sombra azul tenue solo en la acción primaria. Se reutilizan las clases existentes `appointment-card`, `status-badge`, `confirm-dialog`, `notice`, `empty-state`, `slot-grid`, `primary-button`, `secondary-button` y `danger-button`.

## Flujo 1 — USER solicita reprogramación (HU-020)

Se integra en la vista «Mis citas» ya implementada (`src/components/MyAppointments.tsx`), sin cambiar su estructura aprobada.

1. **Punto de entrada.** En la tarjeta de cita, junto a «Cancelar cita», aparece una acción secundaria **«Reprogramar»** únicamente cuando el backend marca `rescheduleAllowed: true`. No se muestra para citas no aprobadas, pasadas, terminales ni con una solicitud ya pendiente. La misma acción se ofrece en el panel de día de la vista calendario, con la misma condición.
2. **Estado de solicitud pendiente.** Cuando la cita trae `rescheduleRequest.status === 'PENDING'`, la tarjeta muestra un bloque diferenciado **«Reprogramación pendiente»** con la franja solicitada y el texto «Tu cita actual se mantiene hasta que se decida». La acción «Reprogramar» queda oculta y la cita conserva visiblemente su fecha y hora originales. Esto comunica RN-10 sin depender solo del color.
3. **Diálogo de solicitud.** «Reprogramar» abre un diálogo modal, del mismo tipo que el de cancelación, con:
   - resumen de la cita actual: fecha/hora, especialidad, profesional y sede, presentados como datos fijos;
   - aviso explícito **«Se mantiene el mismo profesional y la misma especialidad»**, coherente con RF-15;
   - selector de **sede** limitado a las sedes habilitadas de ese profesional y especialidad, con la sede actual preseleccionada;
   - control de **fecha** que no admite días pasados;
   - rejilla de **franjas disponibles** reutilizando `slot-grid`, con la duración de la especialidad ya resuelta por el backend;
   - acciones «Volver» y «Solicitar reprogramación», deshabilitada hasta elegir franja.
4. **Resultado.** Al éxito, el diálogo muestra «Solicitud enviada», se refresca la lista y la tarjeta pasa a mostrar el bloque de reprogramación pendiente conservando la franja original. Al error, se anuncia el mensaje del backend, la cita no cambia y se permite reintentar deliberadamente.
5. **Motivo de rechazo.** Cuando `rescheduleRequest.status === 'REJECTED'`, la tarjeta muestra un bloque **«Reprogramación rechazada»** con `decisionReason` completo y sin truncar, y vuelve a habilitar «Reprogramar». Este bloque es distinto del de «Motivo de rechazo» de una cita `REJECTED`, para no confundir el rechazo de la cita con el rechazo de la reprogramación.
6. **Tras el rechazo no se fuerza nada.** La cita original sigue intacta y con su acción «Cancelar cita» disponible si aplica. No se ofrece ninguna cancelación automática ni recordatorio de decidir.

## Flujo 2 — ADMIN decide reprogramación (HU-021)

Se integra en la bandeja ADMIN ya implementada (`AdminDashboard` en `src/App.tsx`), que hoy resuelve solicitudes de cita especializada.

1. **Estructura.** La bandeja se organiza en dos secciones con encabezados propios: «Solicitudes de cita especializada» (existente, sin cambios) y **«Reprogramaciones pendientes»** (nueva). Cada sección conserva su propio estado de carga, vacío y error.
2. **Tarjeta de reprogramación.** Muestra paciente, profesional, especialidad, sede, duración y, en dos bloques claramente contrastados y etiquetados, **«Franja actual»** y **«Franja solicitada»**, con una flecha o separador textual entre ambas. La comparación entre las dos franjas es la información principal de la tarjeta.
3. **Decisión.** Un campo **«Motivo»** con etiqueta persistente y un texto de ayuda «Obligatorio para rechazar», más las acciones «Aprobar» y «Rechazar». El botón «Rechazar» valida el motivo en el cliente antes de enviar y explica el requisito en línea; el backend revalida y es la autoridad (DEC-005). En la aprobación, el motivo es opcional y se envía solo si el ADMIN lo escribió.
4. **Resultado.** Tras aprobar: aviso «Reprogramación aprobada. La cita quedó en la nueva franja». Tras rechazar: aviso «Reprogramación rechazada. La cita conserva su franja original». En ambos casos se recarga la sección y la solicitud desaparece de las pendientes. Las dos acciones se deshabilitan mientras la petición está en curso, para prevenir doble envío.
5. **Errores.** Un `409` por solicitud ya decidida o franja ocupada se comunica con el mensaje del backend y recarga la bandeja, sin dejar la tarjeta en un estado inconsistente.

## Estados de interfaz por flujo

| Estado | Solicitud USER | Bandeja ADMIN |
|---|---|---|
| `loading` | Franjas con esqueletos dentro del diálogo; «Solicitar reprogramación» deshabilitada | Esqueletos de tarjeta por sección; acciones deshabilitadas |
| `empty` | «No hay franjas disponibles para esa fecha» con opción de elegir otra fecha | «No hay reprogramaciones pendientes» |
| `error` | Región de alerta con el mensaje del backend, filtros y selección conservados, botón de reintento | Región de alerta por sección con reintento; no altera la otra sección |
| `success` | «Solicitud enviada» y bloque de pendiente en la tarjeta | Aviso de aprobación o rechazo y recarga de la sección |
| `disabled` | Acción principal deshabilitada sin franja elegida o mientras se envía; «Reprogramar» ausente cuando `rescheduleAllowed` es `false` | «Rechazar» bloqueado sin motivo; ambas acciones bloqueadas mientras se envía |

## Responsive

- **Escritorio:** diálogo centrado de ancho contenido; rejilla de franjas en varias columnas; en la bandeja, «Franja actual» y «Franja solicitada» en dos columnas contiguas.
- **Tablet:** rejilla de franjas en dos o tres columnas; la tarjeta ADMIN mantiene las dos franjas en columnas si caben.
- **Móvil:** diálogo a ancho completo con scroll interno y acciones fijas al pie; franjas en una o dos columnas con tamaño táctil suficiente; en la bandeja, las franjas se apilan con sus etiquetas visibles y el campo de motivo ocupa el ancho completo. Sin scroll horizontal.

## Accesibilidad

- Diálogo con `role="dialog"`, `aria-modal`, título asociado, foco contenido, Escape para volver antes de enviar y retorno del foco al botón que lo abrió, igual que el diálogo de cancelación existente.
- Las franjas son botones con nombre accesible que incluye hora de inicio y fin; la selección se comunica con `aria-pressed`, no solo con color.
- El estado de la reprogramación se transmite con texto y símbolo, nunca por color únicamente.
- Región `status` para éxito y carga, región `alert` para errores; el campo de motivo declara su obligatoriedad de forma perceptible y su error se asocia al control.
- Etiquetas persistentes, contraste suficiente, foco visible y respeto de `prefers-reduced-motion`.

## Límites de alcance del diseño

No se diseña: cambio de profesional o especialidad, cancelación automática de la cita tras un rechazo, elección posterior del paciente entre conservar o cancelar, expiración de la retención, historial de auditoría visible al USER, notificaciones, cierre de atención ni agenda del profesional.

## Aprobación

Los tres puntos de confirmación quedaron resueltos el 2026-09-29 y así se implementaron:
1. **Integración en pantallas existentes** en lugar de rutas nuevas: adoptado. Se preservó la estructura aprobada de «Mis citas» y de la bandeja ADMIN.
2. **Sede modificable** entre las habilitadas del mismo profesional y especialidad: aprobado explícitamente por el usuario y registrado en DEC-005.
3. **Distinción visual** entre «Motivo de rechazo» de la cita y «Reprogramación rechazada» de la solicitud: adoptado con dos bloques de estilo y encabezado distintos.

Implementación verificada con `npm run typecheck`, 23 pruebas Vitest y `npm run build` correctos. Evidencia en `../../../citas-api/docs/evidence/goals-loops/S4/HU-020-HU-021-preflight-checkpoint.md`.
