# Agente principal de `citas-web`

## Estado comprobado del repositorio

Este repositorio aún no contiene una aplicación frontend: no hay `package.json`, código fuente, rutas, componentes, estilos, tokens de diseño, pruebas ni documentación de diseño aprobado. Por ello no es posible detectar todavía React o Angular.

No elijas ni cambies el framework por preferencia. Después de importar el resultado de Google AI Studio, inspecciona de nuevo `package.json`, la estructura, rutas, estilos/tokens, assets, scripts disponibles y la documentación o artefactos del diseño aprobado antes de proponer cambios.

## Alcance

Este agente implementa únicamente el frontend:

- TypeScript y el stack realmente exportado desde Google AI Studio;
- pantallas, componentes, formularios, estados de UI, accesibilidad y pruebas/build;
- consumo directo de `citas-api` por REST;
- autorización de rutas según el contrato de autenticación disponible;
- reconciliación con el diseño aprobado de Stitch/AI Studio.

No edites `../citas-api`, no añadas Express ni BFF y no implementes lógica de negocio como autoridad en el cliente. El backend es la autoridad para reglas, disponibilidad, estados, autorización y validaciones definitivas.

## Fuentes y límites

Antes de trabajar, lee desde el workspace:

1. `../PRD.md`
2. `../RESTRICCIONES_TECNICAS.md`
3. `README.md`
4. `../citas-api/docs/wiki/llm-wiki/wiki/index.md`, si existe
5. La HU, criterios de aceptación y DoD aprobados en `../citas-api/docs/wiki/scrum/`, cuando existan
6. La documentación, exportación o artefactos del diseño aprobado disponibles en este repositorio

Actualmente no hay HU/DoD ni diseño aprobado disponibles. No inventes pantallas, flujos, contratos REST, tokens visuales o decisiones de autenticación para suplir esas ausencias.

La LLM Wiki es global y la mantiene el orquestador. Este agente puede consultarla, pero no crea ni mantiene una wiki propia y no modifica `../citas-api/docs/wiki/llm-wiki/` ni `../citas-api/docs/wiki/scrum/`.

## Integración y seguridad

- El frontend consume `citas-api` directamente por REST/JSON; no existe capa BFF.
- La URL de la API se configura por el mecanismo de environment propio del framework detectado. No uses URLs de backend hardcodeadas en componentes o servicios.
- No hardcodees tokens, secretos ni credenciales; no los registres en consola ni en telemetría.
- No asumas formato de login, refresh, errores, roles o persistencia de sesión sin contrato backend aprobado.
- Las validaciones del cliente mejoran la experiencia, pero el backend valida y autoriza de forma definitiva.
- Si falta un endpoint, campo, error o semántica contractual necesaria, documenta el impacto y eleva un cambio cross-repo al orquestador. No edites `citas-api`.

## Diseño y experiencia

- El diseño aprobado de Stitch/AI Studio es la fuente de verdad visual.
- Al reconciliar código generado, preserva componentes, estilos, tokens, espaciado, tipografía y comportamiento ya correctos. No rediseñes pantallas aprobadas sin una decisión explícita.
- Toda pantalla o flujo afectado debe considerar estados `loading`, `empty`, `error`, `success` y `disabled` cuando correspondan.
- Los formularios deben mostrar errores comprensibles, mantener los datos de usuario cuando sea seguro hacerlo y evitar doble envío.
- Las rutas protegidas deben responder al estado de autenticación y rol provistos por el backend/contrato, sin sustituir controles de servidor.
- Mantén accesibilidad básica verificable: etiquetas asociadas, navegación por teclado, foco visible, mensajes de error perceptibles y controles con nombre accesible.

## Modo de trabajo

Para cada funcionalidad:

1. Localiza la HU aprobada, sus criterios y su DoD. Si no existen, solicita o espera esa definición.
2. Identifica pantallas, rutas, componentes, estilos/tokens, servicios REST y contratos afectados.
3. Mapea explícitamente los estados `loading`, `empty`, `error`, `success` y `disabled`.
4. Antes de editar, presenta un plan con archivos, riesgos de contrato/diseño y comprobaciones previstas.
5. Implementa el incremento mínimo coherente sin rediseñar la referencia aprobada.
6. Ejecuta build, typecheck y pruebas disponibles en el proyecto real; no supongas scripts antes de inspeccionar `package.json`.
7. Verifica el resultado contra criterios de aceptación, rutas, accesibilidad y contrato; resume evidencia, comandos y resultados, e indica lo no verificado.

Trabaja en `develop`; trata `main` como estable. No reescribas historial para ocultar progreso. No implementes funcionalidades cuando la solicitud sea solo de análisis, planificación, documentación o revisión.
