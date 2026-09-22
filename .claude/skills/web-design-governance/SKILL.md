---
name: web-design-governance
description: Preserve and consistently evolve the approved citas-web visual system when adjusting its UI, components, responsive behavior, or interaction states. Use for ordinary frontend design adjustments; use stitch-design-to-frontend when the work needs a Stitch-to-AI-Studio design workflow or a redesign.
metadata:
  short-description: Govern consistent citas-web UI adjustments
---

# Diseño de citas-web

## Propósito

Al ajustar la interfaz de `citas-web`, conservar una experiencia visual coherente con la referencia aprobada y con el código existente. Esta skill gobierna ajustes cotidianos de UI; no sustituye una aprobación de diseño ni abre un rediseño por iniciativa propia.

## Fuente de verdad y límites

1. Localiza primero la HU aprobada, sus criterios y su DoD cuando existan.
2. La fuente de verdad visual es, por este orden: diseño Stitch/AI Studio aprobado y sus artefactos; documentación de diseño; sistema visual implementado. No inventes un diseño aprobado cuando no exista evidencia.
3. Para el estado actual, consulta `references/current-web-baseline.md` y comprueba los archivos reales antes de tomar decisiones. Si hay discrepancia, el código y artefactos aprobados más recientes prevalecen sobre esa referencia.
4. Mantén el alcance en `citas-web`. No cambies contratos REST, backend, framework ni arquitectura para una modificación visual. Si el ajuste revela una carencia de contrato, documenta el impacto y elévalo como cambio cross-repo.
5. Usa `stitch-design-to-frontend` si se pide crear/rediseñar una experiencia, reconciliar contra Stitch/AI Studio o falta una fuente de verdad que el usuario quiera establecer mediante ese flujo.

## Flujo de ajuste

Antes de editar, identifica las rutas, componentes, estilos compartidos, tokens y breakpoints afectados. Clasifica el cambio:

- **Local:** una pantalla o componente; cambia la regla mínima responsable.
- **Sistémico:** un patrón repetido; actualiza la regla, token o componente compartido y revisa sus consumidores.
- **Rediseño:** altera jerarquía, lenguaje visual o navegación aprobados; detente y solicita una decisión explícita o usa el flujo Stitch.

Preserva lo que ya funciona: jerarquía de la acción principal, tipografía, roles de color, espaciado, radios, superficies, mensajes y comportamiento. No introduzcas una nueva biblioteca de UI ni dupliques estilos si existe una regla compartida adecuada.

En cualquier flujo afectado, contempla los estados que correspondan: `loading`, `empty`, `error`, `success`, `disabled`, foco, hover y móvil. Mantén etiquetas asociadas, foco visible, contraste suficiente, navegación por teclado, nombres accesibles y prevención de doble envío.

Comprueba el reflow en la pauta móvil existente antes de añadir un breakpoint. Para información densa, prioriza legibilidad y acciones alcanzables sobre conservar la geometría de escritorio.

## Validación y entrega

Ejecuta los scripts reales disponibles en `citas-web/package.json` para build, typecheck o pruebas. Revisa visualmente cuando el entorno permita una preview. Resume: qué se cambió, qué parte del sistema se preservó, validaciones ejecutadas y cualquier aspecto no verificable.

No declares fidelidad visual, accesibilidad completa ni aprobación de diseño sin evidencia observada.
