# Línea base visual actual de `citas-web`

Esta referencia describe el estado observado el 2026-09-22. Sirve para conservar coherencia mientras no haya una fuente de verdad de diseño aprobada más reciente; no convierte sus decisiones en requisitos inmutables.

## Evidencia observada

- Implementación React + TypeScript + Vite en `citas-web`.
- Pantalla de autenticación en `src/App.tsx` y estilos globales en `src/styles.css`.
- Tipografía: Poppins, con respaldo Arial/sans-serif.
- Composición de escritorio: barra superior clara, panel de formulario blanco a la izquierda y panel informativo azul a la derecha; pie de página de tono azul muy claro.
- Composición móvil (hasta 800 px): formulario de una columna, panel visual oculto, barra superior ajustable y pie apilado.

## Roles visuales actuales

| Rol | Valor observado | Uso |
| --- | --- | --- |
| Azul marino | `#001549` | Títulos y marca |
| Azul principal | `#002777` | Acción primaria y marca |
| Azul de acento | `#006398` | Enlaces, foco y hover |
| Fondo de aplicación | `#f9f9ff` | Superficie general |
| Fondo de control | `#f8faff` | Campos de formulario |
| Borde neutro | `#c5c6d3` | Controles |
| Éxito | verde claro / `#116538` | Avisos de éxito |
| Error | rosa claro / `#9c2420` | Avisos de error |

## Patrones que conviene conservar

- Radio aproximado de 8–14 px y sombra azul tenue para la acción primaria.
- Formularios con etiqueta visible, control de al menos 48 px de alto y foco azul perceptible.
- Acción primaria de alto contraste; enlaces y acciones secundarias de bajo peso visual.
- Mensajes de estado en una superficie con borde y color semántico, sin perder el contenido del formulario cuando sea seguro.
- Densidad aireada, textos de apoyo en gris azulado y jerarquía clara entre eyebrow, título y descripción.

## Límites conocidos

No se ha encontrado un archivo de diseño aprobado, tokens separados ni un inventario de componentes. Antes de normalizar o ampliar el sistema, inspecciona el código actualizado y los artefactos de diseño disponibles.
