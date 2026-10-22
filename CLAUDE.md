# CLAUDE.md: Pulse Theory landing

Landing page de portafolio para **Pulse Theory**, una marca **ficticia** de coaching de fitness online. Bootstrap 5.3 personalizado con Sass y JS vanilla. El diseño completo y el plan por fases están en `docs/DESIGN.md`: léelo antes de trabajar y sigue sus decisiones.

## Contexto del usuario
- Estudiante de Ingeniería de Software y freelance. Este proyecto es para **aprender Bootstrap 5 a fondo**.
- **Explica cada decisión de Bootstrap** que tomes: qué variable, mixin o módulo usas, por qué, y qué alternativa descartaste.
- Conversación y documentación en **español**; contenido visible del sitio (textos, `alt`, `aria-label`, meta tags) en **inglés**.

## Flujo de trabajo
- Trabaja **una fase de `docs/DESIGN.md` a la vez**. Al terminar una fase, ejecuta su verificación, informa del resultado y espera antes de empezar la siguiente.
- **Commits locales pequeños** con Conventional Commits (`feat:`, `fix:`, `style:`, `docs:`, `chore:`, `build:`, `refactor:`).
- **NUNCA hagas `git push`** ni agregues remotos.
- Si cambia una decisión de diseño, actualiza `docs/DESIGN.md` en el mismo commit.

## Comandos
- `npm run dev`: watch de Sass y JS más un servidor local sobre `dist/`.
- `npm run build`: build de producción en `dist/`.
- `npm run images` / `npm run og`: regeneran las imágenes optimizadas y la imagen OG (solo cuando cambian los originales).

## Reglas de Bootstrap y Sass
- Bootstrap **solo desde su fuente Sass** (`bootstrap/scss/*`). Nunca `bootstrap.min.css` ni CDNs.
- Respeta el orden de imports de `src/scss/main.scss` (DESIGN.md §5.2): `functions` → `_variables.scss` → variables, maps, mixins y utilities de Bootstrap → `_utilities.scss` → módulos → `utilities/api` → estilos propios.
- **Personaliza con variables antes que con CSS.** Si existe una variable de Bootstrap (`$btn-*`, `$card-*`, `$accordion-*`, `$input-*`, `$form-switch-*`…), úsala en lugar de sobrescribir la clase. CSS propio solo para lo que Bootstrap no cubre, en `src/scss/components/`.
- **Importa solo los módulos que se usan.** Añadir un módulo requiere justificarlo y reflejarlo en DESIGN.md.
- Modo oscuro con `data-bs-theme="dark"` y las variables `*-dark` (no "pintar encima").
- Utilidades nuevas o eliminadas: siempre mediante la Utility API en `_utilities.scss`.
- JS de Bootstrap: **solo Collapse** (`import Collapse from 'bootstrap/js/dist/collapse'`). Nada de Popper ni del bundle completo.
- Compilar con `--quiet-deps --silence-deprecation=import`; no se migra a `@use` (Bootstrap 5.3 no lo soporta).
- **No usar PurgeCSS** (rompe `.show`, `.collapsing` y otras clases que añade el JS).

## JavaScript propio
- Vanilla, módulos ES en `src/js/`, un módulo por funcionalidad, inicializados desde `main.js`.
- Mejora progresiva: el contenido debe verse y entenderse sin JS (precios mensuales en el HTML, secciones visibles).
- Animaciones: respetar siempre `prefers-reduced-motion`.

## Dependencias
- Aprobadas: `bootstrap`, `sass`, `postcss`, `postcss-cli`, `autoprefixer`, `esbuild`, `@fontsource/space-grotesk`, `@fontsource/dm-sans`, `sharp`.
- **Cualquier dependencia nueva requiere preguntar antes** y explicar para qué sirve.

## Calidad
- **Mobile first:** estilos base para móvil y breakpoints hacia arriba (`media-breakpoint-up`). Sin scroll horizontal a 320 px.
- **Accesibilidad:** contraste AA (la paleta está en DESIGN.md §3; nunca texto blanco sobre Volt), `<label>` en todos los inputs, foco visible, navegación completa con teclado, landmarks, un solo `h1`, `alt` descriptivos.
- **Rendimiento:** fuentes locales woff2 (solo latin), imágenes AVIF/WebP con `width`/`height` y lazy-load (menos el hero), sin peticiones a terceros.
- Nunca edites `dist/` a mano: es generado e ignorado por git.

## Honestidad (marca ficticia)
- El footer siempre incluye: "Pulse Theory is a fictional brand. This is a demo project by Renzzo G. — renzzogg.com".
- Los testimonios llevan el badge visible **"Sample testimonial"** y una nota aclaratoria. Sin fotos de personas reales como clientes.
- Sin cifras inventadas presentadas como reales (clientes, kilos perdidos, etc.).
- El formulario es simulado y lo dice ("Demo form — no data is sent anywhere").
- WhatsApp con número ficticio `+1 555…`.
