# Design

## Color

Estrategia: **Restrained** (piso product). Base neutra limpia + un acento cálido con intención.

```css
:root {
  /* Superficies */
  --bg: #faf9f7;          /* fondo cálido neutro (chroma hacia el acento, no crema genérica) */
  --surface: #ffffff;     /* cards, tablas */
  --surface-sunk: #f3f1ec; /* sidebar, toolbar (capa neutral secundaria) */
  --border: #e5e2da;

  /* Tinta */
  --ink: #1c1917;         /* texto principal */
  --ink-muted: #57534e;   /* texto secundario (≥4.5:1 sobre --bg) */
  --ink-faint: #78716c;   /* placeholders, deshabilitado */

  /* Acento (acciones primarias, selección, estado) */
  --accent: #b45309;      /* ámbar cálido (terracota tostada) */
  --accent-hover: #92400e;
  --accent-soft: #fef3c7; /* tinte para selección/estado */

  /* Semántico */
  --success: #15803d;
  --success-soft: #dcfce7;
  --error: #b91c1c;
  --error-soft: #fee2e2;
  --warning: #b45309;
  --warning-soft: #fef3c7;
  --info: #1d4ed8;
  --info-soft: #dbeafe;
}
```

## Typography

- Familia: `system-ui, -apple-system, "Segoe UI", sans-serif` (una familia, pesos variados)
- Escala fija, ratio 1.125–1.2:
  - `text-xs`: 0.75rem (12px) — etiquetas tiny
  - `text-sm`: 0.875rem (14px) — cuerpo denso, tablas
  - `text-base`: 1rem (16px) — cuerpo
  - `text-lg`: 1.125rem (18px) — subtítulos
  - `text-xl`: 1.25rem (20px) — títulos de sección
  - `text-2xl`: 1.5rem (24px) — títulos de página
- Line-height: 1.4 cuerpo, 1.2 títulos
- Longitud de línea: 65–75ch para prosa; tablas pueden ser densas

## Spacing

Escala 4px: `4, 8, 12, 16, 20, 24, 32, 48`. Cards con padding 16–20px. Gap entre secciones 16–24px.

## Shape

- Radio: `6px` cards y controles, `999px` badges y botones pill
- Bordes: 1px sólido `--border`. **Sin side-stripe** (nunca border-left/right de acento como decoración)

## Componentes

- **Button**: variantes primary (accent), secondary (borde), danger (error), ghost (sin fondo). Estados: hover, focus (ring 2px accent), active, disabled (opacity 0.5, cursor not-allowed), loading (spinner + texto).
- **Input/Select/Textarea**: borde `--border`, focus ring accent, estado error con borde `--error` + mensaje.
- **Card**: `--surface`, borde 1px, radio 6px, padding 16–20px.
- **Badge**: pill 999px, tinte semántico + texto del mismo tono oscuro.
- **DataTable**: header sticky, filas con hover, ordenación por columna, paginación, skeleton loading, empty state.
- **Modal**: `<dialog>` nativo o portal, backdrop oscuro, focus trap, cierre con Escape.
- **Toast/Alert**: esquina superior derecha, auto-dismiss, icono + mensaje, variante semántica.
- **Skeleton**: bloques grises con shimmer para loading.
- **EmptyState**: icono + título + descripción que enseña qué hacer.

## Motion

- Transiciones 150–250ms, ease-out (cubic-bezier 0.16, 1, 0.3, 1)
- Solo `transform` y `opacity` (nunca layout)
- `prefers-reduced-motion`: crossfade o instantáneo
- Motion transmite estado (loading, éxito, cambio), nunca decoración

## Layout

- Sidebar fijo 220px + contenido flexible
- Responsive: sidebar colapsable en <768px (hamburger o overlay)
- Z-index scale: dropdown 10, sticky 20, modal-backdrop 30, modal 40, toast 50
