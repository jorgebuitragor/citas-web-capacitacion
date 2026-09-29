# Propuesta Stitch — Mis citas y cancelar cita (HU-018 / HU-019)

**Estado:** propuesta pendiente de generación/revisión en Stitch y aprobación explícita.
**Ejecución:** manual; Stitch MCP no está disponible en este entorno.
**Modo recomendado:** Equilibrado / Gemini 3.8, según el routing documentado por la skill para una primera pantalla con estructura, estados y responsive.

## Contrato de diseño

- **Producto:** MediSchedule, aplicación web académica para consultar y gestionar citas ficticias.
- **Usuario principal:** USER autenticado que revisa solo sus propias citas.
- **Tarea:** filtrar citas por estado y fecha, revisar sus datos y cancelar una cita propia futura no terminal.
- **Plataforma:** web responsive; el proyecto existente usa React + TypeScript. Este entregable define diseño, no implementación ni contrato API.
- **Alcance visible:** una pantalla “Mis citas”, detalle en línea de cada cita y diálogo de confirmación de cancelación.
- **Acciones:** filtrar/limpiar filtros; cancelar una cita cuando aplique; confirmar o volver del diálogo.
- **Datos:** ejemplos sintéticos y claramente ficticios.

## Dirección visual propuesta

- Continuar el lenguaje observado en el portal existente: Poppins con respaldo Arial/sans-serif; azul marino `#001549` para títulos; azul `#002777` para acción primaria; acento `#006398` para enlaces y foco; fondo `#f9f9ff`; superficies blancas; controles `#f8faff`; borde neutro `#c5c6d3`.
- Estos valores son referencia de continuidad observada, no aprobación previa de esta pantalla. Mantener radios de 8–14 px, sombra azul tenue solo en la acción primaria, densidad aireada y controles táctiles altos.
- Tesis visual: interfaz tranquila y práctica; primero fecha, hora y estado para reconocer cada cita; los datos contextuales y la acción secundaria quedan en segundo plano.
- Usar iconos lineales pequeños junto a texto. No depender del color para diferenciar estados. No añadir fotografía clínica, métricas, testimonios, gráficos ni elementos comerciales.

## Estructura de pantalla

1. **Cabecera:** marca MediSchedule; navegación del portal con “Mis citas” activo, acceso a “Buscar cita” si la estructura existente lo permite y acción “Cerrar sesión”. En móvil, reducir la navegación sin ocultar la ubicación actual ni la sesión.
2. **Encabezado:** eyebrow “PORTAL DE CITAS”, título “Mis citas” y texto breve “Consulta tus citas y revisa su estado”. No incluir datos médicos ni resúmenes inventados.
3. **Filtros:** superficie clara y compacta con selector “Estado” (opción inicial “Todos los estados”), entrada “Fecha” y acciones “Aplicar filtros” y “Limpiar”. El control de fecha representa el día consultado; no mostrar paginación ni ordenar por reglas no definidas. La semántica exacta queda por confirmar en el contrato REST.
4. **Resultados:** lista vertical de citas en superficies blancas separadas por borde fino. Cada elemento prioriza fecha y hora, acompañado por una etiqueta textual de estado y un símbolo accesible.
5. **Detalle por cita:** especialidad; profesional; sede; fecha/hora; duración; estado. Para `REJECTED`, agregar un bloque “Motivo de rechazo” con texto de la API, sin truncarlo en móvil.
6. **Acción de cancelación:** mostrar “Cancelar cita” solo para una cita futura no terminal, conforme a la regla del producto. No ofrecerla para una cita pasada o terminal. Abrir diálogo con resumen de fecha/hora y acciones “Volver” y “Confirmar cancelación”. Avisar que la cancelación no se reactiva directamente. No añadir plazo mínimo ni ventana de cancelación.
7. **Resultado:** al éxito, mostrar aviso “Cita cancelada” y actualizar el estado a `CANCELLED`; la acción deja de estar disponible. El manejo final del resultado/error se alineará con el contrato REST aprobado.

## Estados e interacciones

- **Loading inicial/filtrado:** conservar filtros visibles, deshabilitar “Aplicar filtros” mientras se consulta y mostrar esqueletos con proporciones de cita.
- **Empty:** mensaje “No tienes citas para estos filtros” y acción “Limpiar filtros”.
- **Error:** mensaje comprensible en región de alerta y botón “Reintentar”; conservar filtros seleccionados.
- **Success de listado:** mostrar resultados y filtros activos con jerarquía estable.
- **Success de cancelación:** aviso accesible de éxito; reflejar `CANCELLED` sin duplicar la petición.
- **Cancelación en curso:** deshabilitar confirmación y mostrar “Cancelando…” para prevenir doble envío; mantener “Volver” solo antes de enviar.
- **Error de cancelación:** conservar el contexto, anunciar el error, habilitar reintento y no cambiar el estado de la cita.
- **Filtros sin coincidencias:** distinguir el empty filtrado del empty inicial sin inventar cantidades.
- Mostrar `REQUESTED`, `APPROVED`, `REJECTED` y `CANCELLED` con texto y símbolo. Reservar tratamiento coherente para estados terminales que defina el backend, sin inventar operaciones.

## Responsive y accesibilidad

- **Escritorio:** ancho de lectura centrado; filtros en una fila cuando quepan; citas en lista de una columna.
- **Tablet:** filtros en dos columnas; evitar scroll horizontal.
- **Móvil:** filtros apilados con controles de ancho completo; cada cita como tarjeta compacta; fecha/hora y estado primero; detalle legible; acción de cancelar con tamaño táctil suficiente y separada del contenido.
- Mantener foco visible; etiquetas persistentes; encabezados semánticos; contraste suficiente; controles operables por teclado; nombres accesibles en iconos; región viva para éxito y alerta para error; diálogo con título, foco contenido, Escape para volver antes de enviar y retorno del foco al control de origen. Respetar `prefers-reduced-motion`.

## Límites de alcance

No diseñar reprogramación, cierre de atención, consulta de auditoría general, ventana adicional de cancelación, aprobación/rechazo administrativa, filtros no solicitados ni acciones sobre citas de otros usuarios.

## Prompt listo para Stitch

```text
Design one high-fidelity responsive web application screen called “Mis citas” for MediSchedule, a Spanish-language academic appointment scheduling portal using synthetic data. This is a design proposal for HU-018 (view my appointments) and HU-019 (cancel an appointment). Do not implement frontend code or invent backend/API details.

PRODUCT AND USER
- Primary user: an authenticated USER/patient reviewing only their own appointments.
- Main task: filter appointments by status and date, review required appointment details, and cancel an eligible future non-terminal appointment.
- Keep all interface copy in Spanish. Use fictional sample data only; do not use real FCV patient or professional information.

SCREEN STRUCTURE
1. Portal header with the MediSchedule wordmark, “Mis citas” as the active destination, a secondary “Buscar cita” destination if it fits the existing portal navigation, and “Cerrar sesión”. Keep the current destination clear on mobile.
2. Page intro: eyebrow “PORTAL DE CITAS”, title “Mis citas”, and the short description “Consulta tus citas y revisa su estado”.
3. A compact filter region with a labeled status selector defaulted to “Todos los estados”, a labeled date control for a specific day, and “Aplicar filtros” / “Limpiar” actions. Treat these as visual controls only; do not specify request parameters or API behavior.
4. A single-column list of appointment rows/cards. Each item visibly includes date, start time, duration, site/location, professional, specialty, and status. Give date/time and status the strongest hierarchy. For REJECTED appointments, show a clearly labeled, fully readable “Motivo de rechazo” text block.
5. Show “Cancelar cita” only for a future non-terminal appointment. There is no extra cancellation window. On activation, show a focused confirmation dialog with a concise appointment summary, the notice “La cancelación no se puede reactivar directamente”, and “Volver” / “Confirmar cancelación”. Never show a reactivation action. After success, represent status CANCELLED and show an accessible success notice.

INTERACTION STATES TO DESIGN
- Loading: filters remain visible; show appointment skeletons; disable apply and confirm actions while their operation is in progress.
- Empty results: “No tienes citas para estos filtros” with “Limpiar filtros”.
- Loading error: clear error message, retry action, and preserved filter values.
- Results: distinguish REQUESTED, APPROVED, REJECTED, and CANCELLED with text and icon plus semantic color; never rely on color alone.
- Rejected result: include a short, clearly fictional reason, visible without opening another screen.
- Confirmation in progress: disable confirm and label it “Cancelando…” to prevent duplicate submission.
- Cancellation error: announce the error, retain the appointment and its original state, and allow deliberate retry.
- Cancellation success: announce “Cita cancelada”, show CANCELLED, and remove the cancel action for that item.

VISUAL DIRECTION
- Use a calm, practical tone with spacious but information-efficient appointment rows. Build a clear hierarchy around appointment date/time and status.
- Continue the existing MediSchedule portal reference: Poppins with Arial/sans-serif fallback; navy #001549 for headings; primary blue #002777; accent blue #006398; app background #f9f9ff; white surfaces; control background #f8faff; neutral border #c5c6d3. Use 8–14 px corner radii, restrained blue shadow only for primary actions, and visible blue focus treatment.
- These are continuity references from the existing authentication UI, not an already approved design for this screen. Do not introduce a second palette or unrelated brand assets.
- Use simple line icons paired with labels. Use no photography, medical imagery, dashboard metrics, charts, testimonials, marketing content, or invented counts.
- Keep rejected-reason text readable and do not truncate it on narrow screens.

RESPONSIVE BEHAVIOR
- Desktop: centered readable content width; filters in one row when space permits; appointment list remains one column.
- Tablet: filters reflow to two columns without horizontal scrolling.
- Mobile: stack full-width filters; each appointment becomes a compact card with date/time and status first, followed by specialty, professional, site, duration, reason, and a comfortably sized cancel action. Preserve reading order and action separation.

ACCESSIBILITY
- Use semantic headings, persistent field labels, keyboard-operable controls, visible focus, sufficient contrast, and accessible names for icon buttons.
- Design a dialog with a clear title, contained focus, Escape/back behavior before submission, and focus return to the originating cancel button.
- Announce loading/success with a status region and errors with an alert region. Do not communicate appointment status by color alone. Respect reduced-motion preferences.

SCOPE LIMITS
- Do not design rescheduling, appointment completion, general audit history, administrative approval/rejection, cancellation deadlines/windows, or actions on other users’ appointments.
- Do not define endpoint paths, payload fields, error codes, sorting, pagination, authentication, or server behavior. Those await a separately approved REST contract.

OUTPUT
Create a coherent high-fidelity desktop and mobile design for this single screen and its empty/loading/error/success/cancellation-dialog states. Keep all copy in Spanish. Return the editable Stitch screen and preview so the user can review and explicitly approve it before any implementation handoff.
```

## Revisión pendiente

1. Pegar el prompt en Stitch usando el modo recomendado disponible.
2. Compartir el enlace, export o capturas de escritorio/móvil y de estados relevantes para revisión visual.
3. Iterar hasta cerrar criterios y obtener aprobación explícita. Esta propuesta por sí sola no constituye aprobación ni habilita handoff a Google AI Studio.
