# Pulse Theory: documento de diseño

> Landing page de portafolio para una marca **ficticia** de coaching de fitness online.
> Documentación en español; todo el contenido visible del sitio va en inglés.

---

## 1. Objetivo

- **Conversión principal:** que el visitante **agende una consulta gratuita** (formulario `#book`).
- **Conversión secundaria:** clic en el botón flotante de WhatsApp.
- **Público real del proyecto:** clientes potenciales de Upwork que evalúan mi trabajo. Por eso el sitio tiene que demostrar:
  - un diseño propio que no parezca una plantilla de Bootstrap;
  - código limpio, accesible y rápido (Lighthouse móvil ≥ 95 en todas las categorías);
  - honestidad: la marca es ficticia y se dice claramente (footer, testimonios de ejemplo, formulario simulado).

## 2. Marca: Pulse Theory

| | |
|---|---|
| **Nombre** | Pulse Theory |
| **Tagline** | *Train with intent.* |
| **Coach ficticio** | Coach Mateo Ríos: entrenamiento de fuerza y rendimiento, programas 100 % online |
| **Público del coach** | Personas de 25 a 40 años con trabajo de oficina que quieren ponerse fuertes y constantes sin vivir en el gimnasio |
| **Tono** | Directo, técnico y motivador sin exagerar. Frases cortas, nada de "transform your life in 30 days" |
| **Estilo visual** | Modo oscuro, aspecto de "laboratorio de rendimiento": rejilla técnica de fondo, números grandes en verde volt, tipografía grotesca enorme y botones tipo píldora |

## 3. Paleta

Contrastes calculados con la fórmula WCAG 2.x (AA texto normal ≥ 4.5:1, texto grande y componentes de interfaz ≥ 3:1).

| Token | Hex | Uso | Contraste |
|---|---|---|---|
| `ink` | `#0E0F12` | Fondo del body | — |
| `graphite` | `#1C1E24` | Tarjetas, acordeón, inputs | — |
| `line` | `#2A2D35` | Bordes **decorativos** (tarjetas, divisores) | 1.4:1 (decorativo, no transmite información) |
| `rule` | `#737985` | Borde de **inputs** y del switch | 3.8:1 sobre graphite ✔ (componente de interfaz) |
| `chalk` | `#F4F4F0` | Texto principal | 17.4:1 sobre ink · 15.1:1 sobre graphite ✔ |
| `steel` | `#9AA0AA` | Texto secundario | 7.3:1 sobre ink · 6.3:1 sobre graphite ✔ |
| `volt` | `#C6F432` | Acento, `$primary`, CTA y foco | 15.0:1 sobre ink · 13.0:1 sobre graphite ✔ |
| `danger` | `#FF6B6B` | Errores de validación | 6.9:1 sobre ink · 6.0:1 sobre graphite ✔ |

Reglas de uso:
- **Volt** solo como fondo con texto `ink` encima, o como texto o número sobre `ink`/`graphite`. **Nunca** texto blanco sobre Volt.
- El estado *success* del formulario reutiliza Volt.
- El foco visible es un anillo de Volt (`$focus-ring-color`), que destaca sobre cualquier superficie oscura.

## 4. Tipografía

| Rol | Fuente | Pesos | Notas |
|---|---|---|---|
| Títulos | **Space Grotesk** | 500, 700 | `letter-spacing: -0.03em`, `line-height: 1.05`; el H1 del hero es enorme |
| Texto | **DM Sans** | 400, 500, 700 | `font-size` base de `1.0625rem` (17 px), `line-height: 1.6` |

- **Fuentes locales:** se instalan con `@fontsource/space-grotesk` y `@fontsource/dm-sans`. **No** importamos el CSS de @fontsource, porque trae todos los subconjuntos (cirílico, vietnamita…). En su lugar escribimos nuestros propios `@font-face` en `_fonts.scss`, solo con el subconjunto `latin` en `woff2`, y `scripts/build.mjs` copia únicamente esos archivos a `dist/fonts/`.
- `font-display: swap` y `<link rel="preload">` solo para los 2 archivos críticos (Space Grotesk 700 y DM Sans 400).
- Tamaños fluidos con **RFS**, el motor de Bootstrap (`$enable-rfs: true`, activo por defecto): los `font-size` grandes se escalan con el viewport sin escribir media queries.

## 5. Cómo se personaliza Bootstrap

### 5.1 Versión e instalación
- **Bootstrap 5.3.8** (última estable a 2026-10-22) instalado con npm como devDependency. Usamos su **código fuente Sass** (`node_modules/bootstrap/scss`), nunca `bootstrap.min.css`.
- Compilamos con **Dart Sass** (`sass`) usando `--load-path=node_modules` para escribir `@import "bootstrap/scss/..."`.

### 5.2 Orden de importación (`src/scss/main.scss`)

```scss
// 1. Funciones: las necesitan mis variables (tint-color, shade-color…)
@import "bootstrap/scss/functions";

// 2. MIS variables, ANTES que las de Bootstrap
@import "variables";

// 3. Configuración de Bootstrap
@import "bootstrap/scss/variables";
@import "bootstrap/scss/variables-dark";
@import "theme-colors";                // recorta $theme-colors (info, warning, light) antes de maps
@import "bootstrap/scss/maps";
@import "bootstrap/scss/mixins";
@import "bootstrap/scss/utilities";

// 4. Ajustes a la Utility API (añadir y quitar utilidades)
@import "utilities";

// 5. Solo los módulos que usamos
@import "bootstrap/scss/root";
@import "bootstrap/scss/reboot";
@import "bootstrap/scss/type";
@import "bootstrap/scss/images";
@import "bootstrap/scss/containers";
@import "bootstrap/scss/grid";
@import "bootstrap/scss/buttons";
@import "bootstrap/scss/transitions";   // la animación de .collapsing
@import "bootstrap/scss/nav";           // .nav-link, que usa el navbar
@import "bootstrap/scss/navbar";
@import "bootstrap/scss/card";
@import "bootstrap/scss/accordion";
@import "bootstrap/scss/badge";
// forms.scss es solo un índice: importamos los submódulos que usamos
@import "bootstrap/scss/forms/labels";
@import "bootstrap/scss/forms/form-text";
@import "bootstrap/scss/forms/form-control";
@import "bootstrap/scss/forms/form-select";
@import "bootstrap/scss/forms/form-check";   // incluye .form-switch
@import "bootstrap/scss/forms/validation";
@import "bootstrap/scss/helpers";       // .visually-hidden, .ratio, .focus-ring, .stretched-link
@import "bootstrap/scss/utilities/api"; // genera las clases utilitarias; siempre va al final de Bootstrap

// 6. Mis estilos
@import "fonts";
@import "base";
@import "components/...";
```

**¿Por qué mis variables van antes?** Cada variable de Bootstrap está declarada con `!default`, que significa "asigna este valor *solo si la variable aún no existe*". Si yo defino `$primary` primero, Bootstrap respeta mi valor y lo propaga a todo lo que depende de él: botones, foco, enlaces, las variables CSS `--bs-primary`, etc. Si lo definiera después, los componentes ya se habrían calculado con el azul por defecto.

**¿Por qué `functions` va antes que mis variables?** Para poder usar `tint-color()`, `shade-color()` o `rgba()` al definir mis tonos.

**Módulos excluidos** (no se compilan, así que no pesan): `modal`, `dropdown`, `tooltip`, `popover`, `carousel`, `toasts`, `offcanvas`, `tables`, `pagination`, `breadcrumb`, `list-group`, `progress`, `spinners`, `alert`, `close`, `button-group`, `placeholders`. Tampoco los submódulos de forms `form-range`, `floating-labels` ni `input-group`.

**Colores de tema recortados** (`_theme-colors.scss`): `map.remove($theme-colors, "info", "warning", "light")` después de `variables` y antes de `maps`. `maps` deriva de `$theme-colors` el mapa `$theme-colors-rgb`, del que salen `.btn-*`, `.bg-*`, `.text-*`, `.border-*`, `.link-*` y `.text-bg-*`, así que cada color quitado elimina todas esas clases.

### 5.3 Modo oscuro: la vía oficial de la 5.3
- Ponemos `<html data-bs-theme="dark">` y sobrescribimos las variables `*-dark` de Bootstrap: `$body-bg-dark: $ink`, `$body-color-dark: $chalk`, `$body-secondary-color-dark: $steel`, `$body-tertiary-bg-dark: $graphite`, `$border-color-dark: $line`, `$headings-color-dark: $chalk`, `$link-color-dark: $volt`, `$form-invalid-color-dark: $danger`, `$form-valid-color-dark: $volt`, etc.
- **Por qué así y no "pintando encima":** con `data-bs-theme`, Bootstrap genera las variables CSS `--bs-body-bg`, `--bs-border-color`, etc. con los valores oscuros, y **todos** los componentes (acordeón, inputs, navbar, tarjetas) los heredan automáticamente. Así no escribimos CSS de más para corregir cada componente.
- El sitio solo tiene tema oscuro, así que no hay interruptor de tema.

### 5.4 Variables clave (`src/scss/_variables.scss`)

| Variable | Valor | Por qué |
|---|---|---|
| `$primary` | `$volt` | Botones, foco, enlaces y `--bs-primary` toman el color de la marca |
| `$color-contrast-dark` | `$ink` | `color-contrast()` elige automáticamente el color del texto sobre `$primary`. Con Volt elige el "oscuro", y así ese oscuro es nuestro Ink y no `#000` |
| `$font-family-sans-serif` | `"DM Sans", system-ui, sans-serif` | Texto base |
| `$headings-font-family` / `$headings-font-weight` | Space Grotesk / 700 | Títulos |
| `$font-size-base` | `1.0625rem` | Texto más legible sobre fondo oscuro |
| `$border-radius` / `-lg` / `-sm` | `.75rem` / `1.25rem` / `.5rem` | Tarjetas suaves (1.25rem), inputs a .75rem |
| `$btn-border-radius` (y `-lg`, `-sm`) | `50rem` | **Botones píldora**, el rasgo distintivo de la marca |
| `$btn-padding-y/x`, `$btn-font-weight` | más generosos, 500 | Botones con más presencia |
| `$spacers` | se añaden `6: 4.5rem`, `7: 6rem` | Ritmo vertical entre secciones (`py-6`, `py-lg-7`). Las utilidades `p-*`/`m-*` leen este mapa, así que las clases nuevas aparecen solas |
| `$grid-gutter-width` | `2rem` | Más aire entre columnas |
| `$focus-ring-color` / `$focus-ring-width` | Volt al 50 % / `.25rem` | Foco visible y de marca |
| `$enable-shadows` | `false` | Usamos bordes de 1px en lugar de sombras: look más técnico |
| `$enable-negative-margins` | `true` | Para superponer elementos en el hero |
| `$link-decoration` | `none` | Enlaces sin subrayado en la navegación. En el texto corrido se subrayan con una clase propia, para no depender solo del color |
| `$card-bg`, `$card-border-color`, `$card-spacer-y/x` | graphite, line, más padding | Tarjetas de la marca |
| `$accordion-*` | fondo graphite, botón activo con texto Volt e ícono personalizado (+/−) | El FAQ no parece el acordeón por defecto |
| `$form-switch-*` | tamaño mayor, colores Volt | El interruptor de precios es un `.form-switch` nativo de Bootstrap |
| `$input-*` | fondo graphite, borde `rule`, radio de .75rem | Inputs con contraste suficiente |

### 5.5 Utility API (`src/scss/_utilities.scss`)
- Bootstrap genera las utilidades a partir del mapa `$utilities`. Lo modificamos **entre** `@import "bootstrap/scss/utilities"` y `@import "bootstrap/scss/utilities/api"`:
  - **Añadir** con `map-merge`, por ejemplo una utilidad `ls` (letter-spacing: `.ls-tight`, `.ls-wide`).
  - **Quitar** con `map.remove` las familias que no usamos: `align` (vertical-align), `float`, `object-fit`, `shadow`, `translate-middle`, `subtle-border-color`, `border-opacity`, `viewport-width`, `min-viewport-width`, `viewport-height`, `min-viewport-height`, `font-family`, `word-wrap`, `text-opacity`, `link-opacity`, `link-offset`, `link-underline`, `link-underline-opacity`, `bg-opacity`, `subtle-background-color`, `gradient`, `user-select`, `pointer-events`, `rounded-top`, `rounded-end`, `rounded-bottom`, `rounded-start`.
  - **Quitar `.text-secondary`** del valor `color`: pinta con el color de tema `$secondary` (Graphite, 1.15:1 sobre Ink). Para el texto secundario se usa `.text-body-secondary`, que lee `--bs-secondary-color` (Steel en modo oscuro, 7.3:1). Son dos conceptos distintos en Bootstrap 5.3: el *color de tema* `secondary` y el *color de texto secundario del body*.
  - **Variantes responsive solo para el layout:** cada familia responsive se repite en los 5 breakpoints (~12 KB por breakpoint). Un `@each` pone `responsive: false` en todas menos `display`, `flex-direction`, `justify-content`, `align-items`, `order`, `text-align`, `margin-x`, `margin-bottom`, `padding-y` y `gap`. Ejemplo: existe `.py-lg-7`, pero no `.mt-md-3`. Si más adelante hace falta otra, se añade a `$responsive-utilities`.
  - Usamos `@use "sass:map"` y `@use "sass:list"` (`map.merge`, `map.remove`, `list.index`): las funciones globales `map-merge`, etc. están obsoletas y darían avisos en nuestro propio código.

### 5.6 Qué evita el "look de plantilla Bootstrap"
1. Rejilla técnica de fondo en el hero, hecha con `linear-gradient` (sin imágenes).
2. Números de sección grandes en Volt (`01`, `02`…) junto a títulos con tracking negativo.
3. Botones píldora con flecha `→` que se desplaza al hacer hover (con `prefers-reduced-motion`, sin movimiento).
4. Bordes de 1px en vez de sombras, y la tarjeta del plan destacado con borde Volt.
5. Acordeón, switch e inputs reestilizados **desde las variables de Bootstrap**, no sobrescribiendo clases.
6. Anillo de foco de marca en todos los elementos interactivos.

### 5.7 Deprecaciones de Sass
- Bootstrap 5.3 usa `@import` y funciones globales (`mix()`, `unit()`…), que Dart Sass 1.8x+ marca como obsoletas. **Todavía no se puede usar `@use` con Bootstrap 5.3**: su Sass depende de variables globales compartidas entre archivos, que es justo lo que `@use` elimina. La migración llegará con Bootstrap 6.
- Solución: compilar con `--quiet-deps` (silencia los avisos que vienen de `node_modules`) y `--silence-deprecation=import` (para nuestros propios `@import` de Bootstrap). Los errores reales se siguen mostrando.

### 5.8 JavaScript de Bootstrap: solo Collapse
- Lo único interactivo de Bootstrap que usamos es **Collapse**: el menú hamburguesa del navbar y el acordeón del FAQ.
- `import 'bootstrap/js/src/collapse.js'` en `src/js/main.js`. Al importarlo se activa su *data API* (`data-bs-toggle="collapse"`), así que no hace falta instanciarlo a mano.
- **Por qué `js/src` y no `js/dist`** (medido en F3): `js/dist/collapse.js` es un módulo UMD que trae sus dependencias envueltas en CommonJS, y esbuild no puede descartar nada, así que el bundle queda en 18.0 KB min. `js/src` es el mismo código en módulos ES: 12.0 KB min (4.6 KB gzip). La contrapartida es que `js/src` no es la ruta de importación documentada y su estructura interna podría cambiar entre versiones menores, por eso `bootstrap` se mantiene con versión exacta (`5.3.8`).
- `src/js/navbar.js` usa la API de Collapse (`Collapse.getOrCreateInstance(menu, { toggle: false }).hide()`) para cerrar el menú móvil al elegir un enlace.
- **Por qué no `import { Collapse } from 'bootstrap'`:** cada plugin de Bootstrap ejecuta código al cargarse (registra listeners), así que esbuild no puede descartar los que no usamos y terminaríamos con todo el bundle.
- **No necesitamos Popper:** solo lo usan dropdowns, tooltips y popovers.

## 6. Estructura de secciones y contenido

Orden en la página (anclas entre paréntesis). Los textos son borradores en inglés.

### 6.0 Skip link + Navbar
- `<a class="visually-hidden-focusable" href="#main">Skip to content</a>`.
- Navbar `sticky-top navbar-expand-lg`: logo (wordmark SVG "PULSE THEORY"), enlaces *About · Programs · How it works · Results · FAQ*, y el CTA píldora **"Book a free call"**.
- En móvil, botón hamburguesa con `aria-controls`, `aria-expanded` y `aria-label="Toggle navigation"`, que Collapse actualiza solo.
- `scroll-padding-top` en `html` para que las anclas no queden bajo el navbar.

### 6.1 Hero (`#top`)
- Eyebrow: `ONLINE STRENGTH & PERFORMANCE COACHING`
- H1: **"Train with intent. Get strong for real life."**
- Subtítulo: *"Personalized programs, weekly check-ins and a coach in your pocket — built around your schedule, not the other way around."*
- CTA principal: **Book your free consultation →** (lleva a `#book`). CTA secundario (outline): *See programs*.
- 3 datos **sin cifras inventadas**: `12-week blocks` · `Weekly 1:1 check-ins` · `Train at home or at the gym`.
- Imagen del coach con la rejilla de fondo. Es la única imagen sin lazy-load y con `fetchpriority="high"`.

### 6.2 About (`#about`)
- `01 — Meet your coach`. Foto, bio corta de Mateo Ríos (ficticio): *"I spent 8 years coaching in-person before moving online. My approach is simple: progressive strength training, sustainable nutrition habits and honest feedback every week."*
- Credenciales genéricas en badges ("Certified strength coach", "Nutrition coaching certified", "8 years coaching"), sin nombres de certificaciones reales.
- **Foto sin persona identificable** (manos del coach guiando el agarre de un cliente). Las fotos del sitio nunca muestran caras reconocibles, para no dar a entender que alguien real respalda la marca ficticia (ver `docs/CREDITS.md`).
- 3 valores en mini-tarjetas: **Evidence-based**, **Built around you**, **Accountability that sticks**.

### 6.3 Programs (`#programs`)
- `02 — Programs`. Switch **Monthly / Annual** (`.form-check.form-switch` de Bootstrap, que ya incluye `role="switch"`) con badge `Save 20%`.
- Región `aria-live="polite"` visualmente oculta que anuncia: *"Showing annual prices, billed yearly."*
- El nombre accesible del switch es su `<label>` "Annual" (encendido = precios anuales); el texto "Monthly" a la izquierda es decorativo (`aria-hidden`).
- El contenedor lleva `hidden` y lo muestra `pricing-toggle.js`: sin JS no aparece un control que no hace nada. **No usa `.d-flex`**: las utilidades llevan `!important` y se compilan después de `[hidden]{display:none !important}` de reboot, así que lo dejarían visible. El `display: flex` va en `_pricing.scss`.
- Space alterna el switch de forma nativa; el JS añade Enter (`input.click()`, que dispara `change` igual que el ratón).
- La nota anual se calcula (`annual × 12`), no se repite en el HTML. `priceFor()` es una función pura probada en Node.

| Plan | Mensual | Anual (por mes, facturado al año) | Para quién |
|---|---|---|---|
| **Foundation** | $79 | $63 ($756/yr) | Programa personalizado + revisión mensual |
| **Performance** ★ destacado | $149 | $119 ($1,428/yr) | + check-ins semanales, guía de nutrición y chat |
| **Elite 1:1** | $299 | $239 ($2,868/yr) | + videollamadas quincenales, análisis técnico por video |

- Precios en atributos `data-price-monthly` y `data-price-annual`. El HTML trae los mensuales, así que el contenido funciona sin JS.
- Cada tarjeta tiene su lista de beneficios y un botón "Start with a free call" (lleva a `#book` y preselecciona el plan en el formulario, como mejora progresiva).

### 6.4 How it works (`#how`)
`03 — How it works`. 4 pasos numerados en línea (vertical en móvil):
1. **Free call**: 20 min to talk goals, schedule and history.
2. **Assessment**: movement screen and baseline numbers.
3. **Your plan**: a program built for your week, delivered in the app.
4. **Weekly check-ins**: we review, adjust and keep you moving.

### 6.5 Results (`#results`)
- `04 — Results`. 3 testimonios en tarjetas, cada uno con un badge visible **"Sample testimonial"**, avatar con iniciales (no fotos de personas reales) y nombre de ejemplo.
- Nota bajo la sección: *"These are sample testimonials for demo purposes. Pulse Theory is a fictional brand."*

### 6.6 FAQ (`#faq`)
`05 — FAQ`. Acordeón de Bootstrap (`.accordion-flush` reestilizado) con 6 preguntas:
1. Do I need a gym membership?
2. I'm a complete beginner — is this for me?
3. How do the weekly check-ins work?
4. Do you create meal plans?
5. Can I switch plans or cancel?
6. What happens on the free consultation?

Botones con `aria-expanded` y `aria-controls`, que gestiona Collapse. El primer ítem abierto por defecto.

### 6.7 Book a free consultation (`#book`)
- `06 — Book your free call`. Texto: *"20 minutes, no pressure. We'll see if we're a good fit."*
- Campos: **Full name** (requerido), **Email** (requerido, formato), **Main goal** (`select`: Build strength · Lose fat · Improve performance · Get back into training), **Preferred plan** (`select`, opcional), **Best time to call** (`select`: Morning · Afternoon · Evening), **Anything else?** (`textarea`, opcional, máx. 500 caracteres) y **casilla de consentimiento** (requerida).
- Validación propia en JS: `novalidate` en el `<form>`, la Constraint Validation API (`checkValidity`, `validity.*`) para la lógica, y las clases de Bootstrap `.is-invalid` y `.invalid-feedback` para el estilo. **Por qué no el patrón `.was-validated` de Bootstrap:** marca todos los campos a la vez y no controla los mensajes ni el foco. Aquí validamos al salir de cada campo (`blur`) y al enviar, ponemos mensajes específicos, enlazamos cada error con `aria-describedby` y llevamos el foco al primer campo con error.
- Envío **simulado**: mensaje de éxito en una región `role="status"` y la aclaración *"Demo form — no data is sent anywhere."*

### 6.8 Footer
- Wordmark, enlaces de las secciones y redes ficticias (`href="#"` con `aria-disabled`, o mejor omitirlas).
- Aviso obligatorio: **"Pulse Theory is a fictional brand. This is a demo project by Renzzo G. — renzzogg.com"** (con enlace a renzzogg.com).
- Créditos de las fotos de stock (Unsplash o Pexels): autor y enlace a la foto original.

### 6.9 Botón flotante de WhatsApp
- `<a href="https://wa.me/15555550123?text=Hi%20Pulse%20Theory%21%20I%27d%20like%20to%20book%20a%20free%20consultation." target="_blank" rel="noopener" aria-label="Chat on WhatsApp (opens in a new tab)">` con SVG en línea (`aria-hidden="true"`).
- El número **555** está reservado para ficción en EE. UU., así que no contacta a nadie real.
- Posición `fixed` abajo a la derecha, con área táctil ≥ 48×48 px, que respeta el área segura (`env(safe-area-inset-bottom)`) y no tapa el botón de envío del formulario en móvil.

## 7. Estructura de archivos

```
fitness-coach-landing/
├── CLAUDE.md
├── package.json
├── docs/
│   └── DESIGN.md
├── scripts/
│   ├── build.mjs        # limpia dist/ y copia HTML, static, fuentes e imágenes optimizadas
│   ├── dev.mjs          # watch de Sass + esbuild + servidor local (esbuild serve)
│   ├── images.mjs       # sharp: originales → AVIF/WebP en varios anchos
│   └── og.mjs           # sharp: genera og-image.png de 1200×630
├── src/
│   ├── index.html
│   ├── scss/
│   │   ├── main.scss        # orden de imports (sección 5.2)
│   │   ├── _variables.scss  # tokens de marca + variables de Bootstrap
│   │   ├── _utilities.scss  # ajustes a la Utility API
│   │   ├── _fonts.scss      # @font-face locales
│   │   ├── _base.scss       # estilos globales propios (rejilla, foco, reveal)
│   │   └── components/      # _navbar, _hero, _pricing, _steps, _testimonials, _faq, _form, _whatsapp, _footer
│   ├── js/
│   │   ├── main.js            # punto de entrada: importa Collapse e inicializa módulos
│   │   ├── pricing-toggle.js
│   │   ├── form-validation.js
│   │   └── reveal.js
│   ├── img/                 # originales (alta resolución)
│   └── static/              # favicon.svg, apple-touch-icon.png, robots.txt, site.webmanifest
└── dist/                    # GENERADO (ignorado por git)
    ├── index.html
    ├── css/main.css
    ├── js/main.js
    ├── fonts/*.woff2
    ├── img/*.{avif,webp,jpg}
    └── og-image.png
```

## 8. Decisiones técnicas

### Dependencias (todas devDependencies, aprobadas)
| Paquete | Para qué |
|---|---|
| `bootstrap` | Fuente Sass y plugin Collapse |
| `sass` | Compilar y minificar el SCSS (`--style=compressed`) |
| `postcss` + `postcss-cli` + `autoprefixer` | Prefijos de navegador según `browserslist`. `postcss-cli` es solo el comando para ejecutar PostCSS desde npm |
| `esbuild` | Empaquetar y minificar el JS (Collapse + módulos propios) y servidor de desarrollo |
| `@fontsource/space-grotesk`, `@fontsource/dm-sans` | Archivos woff2 autoalojados con su licencia (OFL) |
| `sharp` | Optimizar imágenes y generar la imagen OG |

**Descartado: PurgeCSS.** Elimina las clases que no aparecen en el HTML, pero el JS de Bootstrap agrega clases en tiempo de ejecución (`.show`, `.collapsing`, `.collapsed`), y PurgeCSS las borraría, lo que rompería el menú y el acordeón sin que se note hasta probar. Como ya importamos solo los módulos que usamos, el ahorro extra sería pequeño.

### Build
- `npm run build` ejecuta, en orden:
  1. `node scripts/build.mjs`: limpia `dist/` y copia `index.html`, `static/`, las fuentes `woff2` necesarias y las imágenes optimizadas.
  2. `sass --load-path=node_modules --style=compressed --no-source-map --quiet-deps --silence-deprecation=import src/scss/main.scss dist/css/main.css`
  3. `postcss dist/css/main.css --replace --no-map --use autoprefixer`
  4. `esbuild src/js/main.js --bundle --minify --format=esm --target=es2020 --outfile=dist/js/main.js`
- `npm run images` y `npm run og` se ejecutan aparte (solo cuando cambian los originales) y escriben en `src/img/optimized/`. Así el build normal es rápido y no depende de sharp.
- `npm run dev`: `scripts/dev.mjs` usa la API de esbuild (watch + `serve` sobre `dist/`), lanza `sass --watch` y vuelve a copiar `index.html` al detectar cambios. Sin dependencias extra (nada de `concurrently` ni `browser-sync`).
- `browserslist` en `package.json`: `"> 0.5%, last 2 versions, not dead"`, igual que Bootstrap.
- Script cargado con `<script type="module" src="js/main.js">` (diferido por naturaleza).

### Rendimiento
- **Imágenes:** `<picture>` con AVIF → WebP → JPG de respaldo, `srcset`/`sizes`, `width`/`height` explícitos (evita CLS), `loading="lazy"` y `decoding="async"` en todo menos el hero.
- **Fuentes:** locales, solo latin, `preload` de las 2 críticas y `font-display: swap`.
- **Metas de peso (FINALES):** CSS **≤ 130 KB minificado / ≤ 20 KB gzip** y JS **≤ 15 KB minificado**.
  - **Esta meta no se vuelve a subir.** Si una fase la supera, se detiene el trabajo y se propone qué recortar (utilidades, submódulos, CSS propio) antes de continuar. `npm run size` se ejecuta al cerrar cada fase.
  - Historial: 60/12 KB (estimación sin medir, F0) → 120/18 KB (F1, se superó por 0.2 KB en F2 al añadir los estilos base) → 130/20 KB (final, fijada por el usuario antes de F3).
  - La meta inicial de CSS (60 KB / 12 KB) era una estimación hecha sin medir. En F1 se comprobó que solo podía alcanzarse quitando componentes que usamos o con PurgeCSS (descartado). Mediciones de F1: Bootstrap completo 231.8 KB / 30.9 KB → módulos selectivos 166 KB / 22.4 KB → con submódulos de forms y utilidades responsive limitadas, 117.9 KB / 17.7 KB.
- Sin CDNs ni peticiones a terceros.

### Accesibilidad
- `lang="en"`, landmarks (`header`, `nav`, `main`, `footer`), un solo `h1` y jerarquía de títulos correcta.
- Contraste AA verificado (sección 3); foco visible en todo; navegación completa con teclado.
- Todos los inputs con `<label>` visible; errores enlazados con `aria-describedby` y `aria-invalid`.
- **Animaciones de scroll:** `IntersectionObserver` añade `.is-visible`. El estado oculto inicial solo se aplica si hay JS y el usuario no pidió menos movimiento:
  ```css
  @media (prefers-reduced-motion: no-preference) {
    .js .reveal:not(.is-visible) { opacity: 0; transform: translateY(1.5rem); }
  }
  ```
  Una línea inline en el `<head>` añade la clase `js` a `<html>`. Sin JS o con reduced-motion, todo el contenido se ve desde el inicio.

### SEO y Open Graph
- `<title>Pulse Theory — Online Strength & Performance Coaching (Demo)</title>`, `meta description`, `canonical`, `theme-color: #0E0F12`, `og:type/title/description/url/image/image:width/image:height/image:alt`, `twitter:card=summary_large_image`, favicon SVG, `apple-touch-icon` y `site.webmanifest`.
- `og-image.png` de **1200×630**, generada con sharp a partir de una plantilla SVG con la marca. **Riesgo:** librsvg (el motor de sharp para SVG) no lee woff2. Plan B: convertir el wordmark a trazados (paths) en el SVG.
- **No** agregamos JSON-LD de tipo `LocalBusiness`/`Person`, porque describiría un negocio que no existe ante los buscadores.

### Deploy (decisión pendiente, fase F12)
- Railway con el subdominio provisional `pulse.renzzogg.com`. La forma de servir `dist/` (sitio estático de Railpack u otra opción) se decide en F12, con confirmación previa.

## 9. Plan por fases

Cada fase termina con una verificación concreta y uno o más commits pequeños (Conventional Commits). **Nunca se hace push.**

| Fase | Alcance | Verificación ✔ |
|---|---|---|
| **F0 · Scaffolding** | `npm init`, instalar las dependencias aprobadas, `browserslist`, scripts `build`/`dev`, `scripts/build.mjs`, `scripts/dev.mjs`, `index.html` mínimo y `main.scss` que importa todo Bootstrap (para tener un tamaño de referencia) | `npm run build` genera `dist/`; `npm run dev` sirve la página; tamaño de referencia del CSS anotado |
| **F1 · Tokens de Sass** | `_variables.scss` (paleta, tipografía, radios, spacers, modo oscuro), imports selectivos y `_utilities.scss` | Compila sin errores ni avisos propios; un botón `.btn-primary` de prueba sale Volt con texto Ink y forma de píldora; CSS ≤ 130 KB min / ≤ 20 KB gzip (meta final) |
| **F2 · Fuentes y base** | `_fonts.scss`, copia de woff2 en el build, `preload`, `_base.scss` (rejilla, foco, tipografía de títulos) y skip link | En la pestaña Network solo hay fuentes de `localhost`; el skip link aparece con Tab |
| **F3 · Navbar + Hero** | Marcado y estilos del navbar y el hero; `main.js` con Collapse | El menú móvil abre y cierra con teclado y `aria-expanded` cambia; JS ≤ 15 KB; sin scroll horizontal a 320 px |
| **F4 · About + How it works** | Secciones 01 y 03, con fotos de stock gratuito (Unsplash o Pexels) acreditadas en el footer | Se revisa en 375, 768 y 1280 px; la jerarquía de títulos es correcta (comprobada con extensión o axe) |
| **F5 · Programs + switch** | Tarjetas de precios, `.form-switch` reestilizado y `pricing-toggle.js` | El switch alterna los precios con clic y con Space; `aria-live` anuncia el cambio; sin JS se ven los mensuales |
| **F6 · Results + FAQ** | Testimonios con el badge "Sample testimonial" y la nota; acordeón reestilizado | Los badges y la nota se ven; el acordeón funciona con Tab, Enter y Space |
| **F7 · Formulario** | Campos, `form-validation.js` y éxito simulado; preselección del plan desde las tarjetas | Enviar vacío muestra los errores y enfoca el primero; un email inválido da un mensaje específico; un envío válido muestra el estado de éxito y el aviso de demo |
| **F8 · WhatsApp + Footer** | Botón flotante y footer con el aviso de demo | El enlace abre wa.me con el mensaje prellenado; el botón no tapa el CTA del formulario a 375 px; aviso visible |
| **F9 · Animaciones de scroll** | `reveal.js` y estilos `.reveal` | Animación al hacer scroll; con "prefers-reduced-motion: reduce" en DevTools no hay movimiento y el contenido se ve; sin JS se ve todo |
| **F10 · Imágenes, OG y meta** | `images.mjs`, `og.mjs`, `<picture>`, meta tags completos, favicon y manifest | `og-image.png` mide 1200×630 (comprobado con sharp metadata); un validador de OG muestra la vista previa; sin CLS en Lighthouse |
| **F11 · Auditoría** | Lighthouse móvil, axe, recorrido completo con teclado y ajustes finales | Lighthouse ≥ 95 en las 4 categorías; 0 errores de axe; README del proyecto |
| **F12 · Deploy** | Railway + subdominio (**con confirmación previa del usuario**) | El sitio carga en el subdominio con HTTPS; la OG se ve al compartir el enlace |
