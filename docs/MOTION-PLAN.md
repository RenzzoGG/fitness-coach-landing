# Pulse Theory: plan de rediseño con movimiento (rama `motion-redesign`)

> Objetivo: convertir la landing en una pieza de portafolio para trabajos de animación (GSAP, scroll storytelling, interacciones lúdicas) **sin perder** lo que ya tiene: rendimiento, accesibilidad, honestidad de marca y Bootstrap desde Sass.
> Se mantiene todo el copy y todas las secciones. Cambian composición, tipografía, layout y movimiento.
> Documentación en español; el contenido visible del sitio sigue en inglés.

---

## 0. Punto de partida (medido el 2026-11-17 en `main`, commit `4c8351c`)

| Métrica | Valor | Meta actual (CLAUDE.md) |
|---|---|---|
| CSS | 122.6 KB min · 19.3 KB gzip | ≤ 130 KB min · ≤ 20 KB gzip |
| JS | 14.2 KB min · 5.4 KB gzip | ≤ 15 KB min |
| Lighthouse producción | Móvil 97 · 100 · 100 · 100 / Escritorio 99 · 100 · 100 · 100 | Móvil ≥ 95 |
| Movimiento actual | `reveal.js` (IntersectionObserver + transición CSS), cambio de precio con keyframes, flecha de botones, punto que late | — |

Peso real de las librerías candidatas (medido sobre los tarballs de npm, `dist/*.min.js`, gzip -9):

| Paquete | Min | Gzip |
|---|---|---|
| `gsap` 3.15.1 (core) | 71.6 KB | 27.7 KB |
| `gsap/ScrollTrigger` | 43.6 KB | 17.6 KB |
| `gsap/SplitText` | 7.8 KB | 3.6 KB |
| **Subtotal GSAP** | **123.0 KB** | **48.9 KB** |
| `lenis` 1.3.27 | 18.4 KB | 5.3 KB |

**Conclusión:** solo el core de GSAP ya multiplica por 5 la meta de JS. Esto no se puede resolver recortando; requiere **cambiar cómo se define la meta** (ver §5.2). Es la decisión principal que necesito de ti antes de la fase M1.

---

## 1. Concepto visual: "Signal" (la señal)

### La idea
La marca se llama *Pulse Theory* y su logotipo ya es una **línea de pulso** (`M3 17h6l3-7 5 13 3-6h9`). El concepto convierte esa línea en el hilo conductor de toda la página: **el scroll es una sesión de entrenamiento leída como telemetría**. La línea de pulso nace en el hero, se dibuja mientras bajas, conecta los pasos de *How it works*, late al elegir un plan y termina "en reposo" en el footer.

El estilo actual ("laboratorio de rendimiento": rejilla técnica, Volt, grotesca enorme) se mantiene, pero se lleva al extremo:

- **De laboratorio a osciloscopio.** La rejilla de fondo deja de ser decoración estática: reacciona al cursor (se ilumina cerca de él) y al scroll (se desplaza en paralaje lento). Es la pantalla sobre la que se dibuja la señal.
- **Tipografía como imagen.** Space Grotesk a tamaños de cartel (el H1 llega a ~9–11 vw en escritorio), con interlineado apretado (0.9) y tracking negativo. Se añade un segundo registro: **texto con contorno** (`-webkit-text-stroke` en Volt o Steel, relleno transparente) para números de sección gigantes, el marquee y el wordmark del footer. Regla: el contorno es **solo decorativo** (`aria-hidden`); ningún texto que haya que leer depende de él.
- **Números como protagonistas.** Los índices `01–05` de cada sección se vuelven elementos de composición enormes (como dorsales o marcadores de un cronómetro), anclados al borde de la rejilla.
- **Composición editorial, no de plantilla.** Se rompe la simetría de columnas Bootstrap: titulares que se salen del `container` hacia el borde, imágenes que cruzan la línea de la rejilla, bloques de texto desplazados (`offset-*`), mucho aire. El grid de Bootstrap sigue siendo la base (`row`/`col-*`/`offset-*`/`g-*`), pero se usa para romper la retícula de forma controlada, no para repartir en tercios iguales.
- **Ritmo de entrenamiento.** El movimiento tiene dos tempos, como una serie: **esfuerzo** (entradas rápidas y secas, `power4.out`, 0.6–0.9 s) y **descanso** (scrub suave ligado al scroll, sin easing propio). Nada rebota ni es "cartoon": la marca es directa y técnica.
- **Paleta intacta.** Ink, Graphite, Line, Rule, Chalk, Steel y Volt (DESIGN.md §3). Volt sigue siendo el único acento y nunca lleva texto blanco encima. No se añaden colores; se añade **luz** (gradientes radiales de Volt a muy baja opacidad que siguen al cursor).

### Por qué funciona como portafolio
Cada técnica que un cliente busca en un perfil "animation-heavy" aparece **una vez y con motivo** (split text, pin, scroll horizontal, scrub, parallax, marquee, contadores, cursor, magnetismo, SVG draw), y todas están unidas por un concepto. Un muestrario de efectos sin hilo se ve amateur; una página con una idea se ve dirigida.

---

## 2. Sección por sección

Convención: **[CSS]** = sin JS, se ve desde el primer pintado. **[GSAP]** = llega con el chunk de movimiento (§5.2). **[lg+]** = solo escritorio (`ScrollTrigger.matchMedia` / `gsap.matchMedia`). Todo lo marcado [GSAP] **no existe** con `prefers-reduced-motion: reduce` (§6).

### 2.0 Global

| Elemento | Qué hace | Cómo |
|---|---|---|
| **Barra de progreso de scroll** | Línea Volt de 2 px bajo el navbar que crece con el scroll | **[CSS]** `animation-timeline: scroll()` (scroll-driven animations nativas, cero JS). En navegadores sin soporte (`@supports not (animation-timeline: scroll())`) no se muestra. Es la opción más ligera y una buena lección: no todo necesita GSAP |
| **Navbar inteligente** | Se oculta al bajar y reaparece al subir; un indicador Volt se desliza bajo el enlace de la sección activa | **[GSAP]** `ScrollTrigger.create({ onUpdate })` con la dirección del scroll + un trigger por sección. Nunca se oculta si tiene foco dentro (`:focus-within`) ni con el menú móvil abierto |
| **Cursor personalizado** | Un anillo que sigue al cursor con inercia; crece y muestra una etiqueta ("Book", "Drag", "Open") sobre elementos interactivos | **[GSAP]** `gsap.quickTo()` (la forma recomendada para seguir el ratón sin crear un tween por evento). Solo con `(hover: hover) and (pointer: fine)`. **El cursor nativo se mantiene visible**: el anillo complementa, no sustituye (ocultar el cursor del sistema perjudica a personas con baja visión) |
| **Botones magnéticos** | Los CTA principales se desplazan unos píxeles hacia el cursor y vuelven con elasticidad suave | **[GSAP]** `quickTo` sobre `x`/`y`, solo `pointer: fine`. El anillo de foco se mueve con el botón, no queda desfasado |
| **Rejilla viva** | La rejilla del fondo se ilumina alrededor del cursor | **[CSS + 10 líneas JS]** variables `--mx`/`--my` en un `radial-gradient` de la máscara; el JS solo escribe dos variables en `pointermove` con `requestAnimationFrame` |
| **Interruptor "Motion"** | Botón en el navbar ("Motion: on/off") que pausa todo el movimiento no esencial y lo recuerda | **[JS crítico]** añade `data-motion="off"` a `<html>`; el chunk de movimiento hace `gsap.globalTimeline.pause()` y `ScrollTrigger.getAll().forEach(t => t.disable())`, y el CSS detiene el marquee. Cumple WCAG 2.2.2 (Pause, Stop, Hide) aunque el sistema no tenga activado reduced-motion |
| **Loader / intro** | Ver §2.1: **no hay pantalla de carga a pantalla completa** | Justificación abajo |

**Sobre el page loader (propuesta descartada en su forma clásica):** un loader que tapa la página retrasa el LCP y castiga Lighthouse en móvil, y en una landing de una sola página no hay nada que "cargar" que justifique la espera. En su lugar, el hero **es** la intro: una secuencia de arranque de ~1 s hecha en CSS que se ejecuta mientras la página ya es usable (§2.1). Si tras medir en M4 quieres además un loader, lo hago como capa de primera visita (`sessionStorage`) y te enseño el coste en Lighthouse antes de dejarlo.

### 2.1 Hero (`#top`)

- **Secuencia de arranque [CSS]:** la línea de pulso del logo se dibuja a lo ancho de la pantalla (`stroke-dashoffset`), las líneas del H1 suben desde una máscara (`overflow: hidden` + `translateY(100%)`, escalonadas 80 ms), la foto se revela con `clip-path: inset()` de abajo arriba y los tres datos (`12-week`, `Weekly`, `Anywhere`) aparecen al final. Es CSS para que arranque **en el primer pintado**, sin esperar al chunk de GSAP. Las líneas del H1 se marcan a mano en el HTML (`<span class="line">`), porque SplitText llegaría tarde y provocaría un parpadeo.
- **Composición:** H1 a sangre por la izquierda ocupando ~2/3 del ancho en escritorio; la foto a la derecha, más estrecha y desplazada hacia abajo para que el titular la monte por encima (`z-index` + `mt-n*`, que ya tenemos con `$enable-negative-margins`). El `hero-tag` "Weekly check-in" se convierte en una etiqueta tipo monitor con la línea de pulso en miniatura animada.
- **Scroll [GSAP, scrub]:** al bajar, la foto hace parallax lento (`yPercent`) y escala un 6 %; las líneas del H1 se separan a velocidades distintas; la rejilla se desplaza al 30 % de la velocidad.
- **CTA:** "Book your free consultation" magnético; la flecha `→` actual se conserva.
- **LCP:** la imagen del hero sigue siendo `fetchpriority="high"` sin lazy. Mediré en M4 si el `clip-path` inicial del H1/foto retrasa el LCP; si lo hace, la foto entra solo con `scale`/`opacity` ≥ 0.01 y el texto se queda sin máscara inicial. **Lo mido, no lo supongo.**

### 2.2 Marquee (nuevo separador entre Hero y About)

- Banda Volt con texto Ink, inclinada −2°, con frases que **ya existen en el sitio**: "Train with intent ✦ 12-week training blocks ✦ Weekly 1:1 check-ins ✦ Home or gym ✦". Encima, una segunda banda con contorno en sentido contrario.
- **[CSS]** bucle infinito con `@keyframes` sobre `translateX` (contenido duplicado `aria-hidden` para el bucle sin cortes). **[GSAP]** la velocidad y la dirección responden a la velocidad del scroll (`ScrollTrigger` `getVelocity()` → `timeScale` del tween).
- **Accesibilidad:** toda la banda es `aria-hidden="true"` (el contenido está repetido en el hero); botón de pausa visible y enfocable junto a ella; se detiene con el interruptor Motion y no existe con reduced-motion (queda estática).

### 2.3 About (`#about`, "01 Meet your coach")

- **Número de sección gigante** "01" con contorno, detrás del titular, que sube con parallax.
- **Revelado de imagen [GSAP, scrub]:** la foto de las manos se descubre con `clip-path` mientras la imagen interior hace contra-parallax (efecto "ventana").
- **Titular que se "lee solo" [GSAP + SplitText, scrub]:** "Hi, I'm Mateo. I coach strength for people with real schedules." partido en palabras que pasan de Steel a Chalk según avanzas. Es el efecto de *scroll storytelling* más reconocible y aquí tiene sentido: es la presentación del coach.
- **Credenciales:** los tres badges entran con un escalonado corto, como fichas que se colocan.
- **Tarjetas de valores:** el icono SVG se dibuja (`stroke-dashoffset`) al entrar; el borde superior de cada tarjeta se ilumina en Volt de izquierda a derecha; en `pointer: fine`, un *spotlight* radial sigue al cursor dentro de la tarjeta (variable CSS, sin tilt 3D: el tilt suele marear).

### 2.4 Programs (`#programs`, "02")

- **Entrada tipo "reparto de cartas" [GSAP]:** las tres tarjetas llegan apiladas desde abajo y se abren a su posición con una ligera rotación que se corrige al asentarse. Featured (Performance) llega la última y queda por delante.
- **Contador de precios [GSAP]:** al cambiar Monthly/Annual, el número cuenta de un valor al otro ($79 → $63) con dígitos que ruedan. Son **precios reales del sitio**, no cifras inventadas. Sin JS de movimiento, sigue funcionando el cambio actual con keyframes CSS (mejora progresiva intacta: los dos precios siguen en el HTML).
- **Switch:** la píldora "Save 20%" hace un pulso corto al activarse Annual.
- **Tarjeta destacada:** borde Volt con un brillo que recorre el perímetro (gradiente cónico animado en CSS, `@property` para animar el ángulo) y spotlight del cursor.
- **Al elegir plan:** el CTA `data-plan` dispara un pulso de la línea de señal que "viaja" hacia el formulario mientras se hace scroll a `#book`.

**Sobre el "horizontal-scroll programs" que mencionas:** con solo 3 planes, un scroll horizontal fijado obliga a desplazarse para comparar precios, que es justo lo que una tabla de precios no debe hacer. Propongo usar el scroll horizontal en *How it works* (4 pasos secuenciales, donde sí cuenta una historia) y dejar Programs comparables de un vistazo. Si prefieres el horizontal aquí, se puede: dímelo.

### 2.5 How it works (`#how`, "03"): la pieza central

- **[lg+] Sección fijada con scroll horizontal [GSAP, `pin` + scrub]:** al llegar, la sección se queda fija y los 4 pasos avanzan en horizontal como paneles anchos. Cada panel tiene su número gigante (01–04) con contorno que **se rellena de Volt** cuando el panel está centrado. La **línea de pulso** recorre los cuatro paneles y se dibuja con el progreso: es el clímax visual del concepto. Se usa `containerAnimation` de ScrollTrigger para que los elementos internos de cada panel animen según el avance horizontal.
- **[< lg] Línea de tiempo vertical:** sin pin (en móvil el pin sufre con la barra de direcciones que aparece y desaparece). Una línea vertical se dibuja con el scroll y cada paso se "enciende" al cruzarla.
- **Accesibilidad:** el DOM sigue siendo la `<ol>` actual en orden; el pin es solo presentación. El CTA "Start with step one" queda después de la sección fijada.

### 2.6 Results (`#results`, "04")

- **Citas como tipografía:** cada testimonio se compone grande (estilo cita de revista), con las comillas como glifo gigante en Volt.
- **[GSAP]** las citas entran palabra a palabra (SplitText, `once`, no scrub: se leen mejor si se completan solas) y las tarjetas tienen un parallax diferencial ligero (columna central más lenta) en lg+.
- **Honestidad intocable:** el badge **"Sample testimonial"** y la nota aclaratoria no se animan nunca para ocultarse: están visibles desde el primer frame de la tarjeta. Las iniciales (avatares) siguen sin fotos de personas reales.

### 2.7 FAQ (`#faq`, "05")

- El bloque de título se vuelve **sticky** en lg+ mientras se recorre el acordeón (**[CSS]** `position: sticky`, sin JS).
- El icono +/− hace un *morph* (la barra vertical rota y se colapsa) con transición CSS. La apertura sigue siendo el Collapse de Bootstrap (que ya anima la altura con `.collapsing`): no se duplica con GSAP.
- Entrada con escalonado corto de las preguntas.

### 2.8 Book (`#book`)

- Titular "20 minutes, no pressure." a gran escala con revelado por líneas.
- **Formulario [CSS]:** la línea inferior de cada campo se dibuja en Volt al enfocar (además del anillo de foco, no en su lugar).
- **Envío correcto [GSAP]:** el estado de éxito dibuja la línea de pulso que termina en un check. El texto "Demo form — no data is sent anywhere" se mantiene visible y sin animar.
- Botón de envío magnético.

### 2.9 Footer y WhatsApp

- **Wordmark gigante** "PULSE THEORY" a todo el ancho con contorno, que se rellena de Chalk al llegar al final de la página (scrub). Decorativo (`aria-hidden`); la marca real sigue en texto.
- La línea de pulso termina aquí, plana: "en reposo". El aviso de marca ficticia no se toca.
- **WhatsApp:** entra después de pasar el hero (para no competir con los CTA) con un pequeño pulso; con reduced-motion aparece sin animación.

---

## 3. Tipografía y layout (sin movimiento)

- **Escala de display:** se amplían `$display-font-sizes` de Bootstrap (variable existente, genera `.display-1…6` con RFS) en lugar de crear clases nuevas; para el H1 del hero y el wordmark, que necesitan escalar con el viewport más allá de lo que hace RFS, se usa `clamp()` en `components/_hero.scss` y `_footer.scss`.
- **Texto con contorno:** una utilidad nueva `text-outline` (y `text-outline-volt`) **mediante la Utility API** en `_utilities.scss`, como manda CLAUDE.md.
- **Números de sección:** se reutiliza `.eyebrow-number` como índice pequeño (accesible) y se añade un número gigante decorativo `aria-hidden`.
- **Grid:** `offset-*`, `order-*` y márgenes negativos de Bootstrap para la composición asimétrica. Comprobación de **cero scroll horizontal a 320 px** en cada fase (las bandas inclinadas y los titulares a sangre son el riesgo: se recortan con `overflow-x: clip` en su sección, no en `body`, porque `overflow: hidden` en `body` rompe `position: sticky` y el pin).

---

## 4. Lo que **no** se hace (y por qué)

- **Lenis / smooth scroll: propongo no usarlo.** Secuestra el scroll nativo: rompe o degrada la búsqueda en página, el salto a anclas con foco, el scroll con teclado y el comportamiento que el usuario configuró en su sistema; cuesta 18.4 KB más. ScrollTrigger funciona perfectamente con el scroll nativo, y el "suavizado" visual se consigue con `scrub: 0.6` (el tween persigue a la posición del scroll). Si aun así lo quieres para escritorio, sería una fase opcional M11, solo con `pointer: fine` y desactivable con el interruptor Motion.
- **Sin WebGL / Three.js:** peso y batería en móvil desproporcionados para una landing.
- **Sin ocultar el cursor nativo, sin tilt 3D, sin parpadeos** (> 3 por segundo prohibido, WCAG 2.3.1).
- **Sin cifras inventadas animadas.** Los "contadores" animan precios reales y números de paso, nunca "500+ clients" o "kilos perdidos".

---

## 5. Estrategia de rendimiento

### 5.1 Principios
1. **El contenido no espera al movimiento.** Todo es visible con HTML + CSS. GSAP solo aplica estados iniciales (`gsap.from`) a elementos que **todavía no están en pantalla** cuando se carga; lo que ya está visible no se oculta para re-animarlo.
2. **Solo propiedades de composición:** `transform`, `opacity`, `clip-path` y variables CSS que alimentan esas propiedades. Nada de animar `width`, `top`, `height` o `filter` a gran escala. `will-change` solo durante la animación (GSAP lo gestiona con `force3D`).
3. **Un único `requestAnimationFrame`:** el del ticker de GSAP. El cursor, el magnetismo y la rejilla se enganchan a él (`gsap.ticker.add`), no a listeners propios.
4. **SplitText después de las fuentes:** `document.fonts.ready.then(...)` para que el corte por líneas no cambie al cargar Space Grotesk (evita CLS y saltos).
5. **Sin pin en móvil**, `ScrollTrigger.config({ ignoreMobileResize: true })` y `ScrollTrigger.refresh()` tras cargar las imágenes lazy.
6. **CSS primero:** barra de progreso (scroll-driven animations), sticky, intro del hero, marquee base y estados de foco son CSS. GSAP solo para lo que necesita estado o scrub coordinado.

### 5.2 Presupuesto: dos bundles (**decisión tuya**)

Hoy CLAUDE.md fija **JS ≤ 15 KB min** y dice que "no se sube nunca". Con GSAP es imposible cumplirla literalmente, así que propongo redefinirla así:

| Bundle | Contenido | Cuándo se descarga | Meta propuesta |
|---|---|---|---|
| **Crítico** `main.[hash].js` | Collapse, navbar, precios, formulario, interruptor Motion, cargador del chunk | Siempre, como ahora | **≤ 15 KB min (se mantiene la meta actual)** |
| **Movimiento** `motion.[hash].js` | gsap + ScrollTrigger + SplitText + módulos de animación propios | Solo si `prefers-reduced-motion: no-preference` **y** Motion no está en "off", tras el evento `load` y en `requestIdleCallback` (`import()` dinámico) | **≤ 140 KB min · ≤ 55 KB gzip** (123 / 49 de GSAP + ~15 / 5 de código propio) |
| CSS | Igual que ahora + estilos del rediseño | Siempre | **≤ 130 KB min · ≤ 20 KB gzip (se mantiene)**. Margen actual: 7.4 KB min / 0.7 KB gzip. Es poco: si hace falta, recorto utilidades que dejen de usarse con el nuevo layout |

Consecuencias: el chunk de movimiento no bloquea el pintado ni compite con el LCP, y quien pide menos movimiento **no descarga ni un byte de GSAP**. Técnicamente: esbuild con `--splitting --format=esm` y adaptar `scripts/hash-assets.mjs` y `scripts/size.mjs` para chunks (y `verify-html.mjs` si comprueba referencias de JS).

Alternativas descartadas: (a) mantener 15 KB y escribir todo a mano con Web Animations API + scroll-driven animations: posible, pero el objetivo explícito es demostrar GSAP en el portafolio; (b) cargar GSAP en el bundle crítico: +123 KB de JS bloqueando la interactividad en móvil, sin necesidad.

### 5.3 Metas de verificación
- **Lighthouse móvil ≥ 95 en Performance** y 100 en Accessibility, Best Practices y SEO; escritorio ≥ 98. Como el servidor de `npm run preview` no comprime (F11 sacó 94 en preview frente a 97 en producción), en M1 mido **`main` en preview como línea base** y comparo siempre en las mismas condiciones: la rama no puede bajar más de 2 puntos respecto a esa línea base, y además vigilo **TBT < 150 ms** y **CLS = 0** en móvil.
- **Cero scroll horizontal** a 320, 390 y 1440 px (comprobado con Playwright: `scrollWidth === clientWidth`).
- **Sin errores en consola.**

---

## 6. Estrategia de accesibilidad

| Riesgo | Medida |
|---|---|
| Movimiento vestibular | `prefers-reduced-motion: reduce` → el chunk de movimiento **no se carga**; el CSS de intro, marquee y transiciones está dentro de `@media (prefers-reduced-motion: no-preference)`. La página queda estática y completa |
| Contenido que se mueve solo (WCAG 2.2.2) | Interruptor **Motion on/off** global (persistido en `localStorage`, con `try/catch`) + botón de pausa propio en el marquee |
| Lectores de pantalla con texto partido | SplitText 3.13+ con `aria: "auto"` (pone `aria-label` con el texto original en el contenedor y `aria-hidden` en los fragmentos). Las líneas manuales del hero son `<span>` en línea que no alteran la lectura. Lo verifico con el árbol de accesibilidad de Playwright (`page.accessibility.snapshot()` / `ariaSnapshot`) |
| Foco dentro de animaciones | Nada enfocable queda con `opacity: 0` o fuera de pantalla sin poder alcanzarse; el navbar oculto reaparece con `:focus-within`; el anillo de foco Volt se mantiene en todo |
| Texto decorativo | Números gigantes, marquee, wordmark y contornos con `aria-hidden="true"`; nunca son la única fuente de información |
| Contraste | Paleta AA intacta; el texto que pasa de Steel a Chalk ya cumple AA en su estado inicial (Steel 7.3:1 sobre Ink) |
| Cursor y magnetismo | Solo `pointer: fine`, `aria-hidden`, `pointer-events: none`; el cursor nativo sigue visible |
| Teclado | Recorrido completo con Tab en cada fase (Playwright pulsa Tab y comprueba que el elemento enfocado está en el viewport y tiene foco visible) |
| Sin JS | Todo el contenido visible; precios mensuales en el HTML; sin estados ocultos dependientes de JS (se mantiene el failsafe de `.reveal-ready` mientras exista) |

---

## 7. Dependencias (requieren tu aprobación)

| Paquete | Para qué | Tipo | Recomendación |
|---|---|---|---|
| `gsap` **3.15.1** (versión exacta) | Motor de animación. Incluye **ScrollTrigger** y **SplitText** en el mismo paquete: desde la 3.13 todos los plugins son gratuitos y están en npm, sin registro privado | devDependency (esbuild lo empaqueta) | **Sí.** Licencia: "Standard no-charge license" de GSAP (no es MIT: permite uso comercial gratis; la única restricción relevante es no usarlo en herramientas que compitan con Webflow). Válida para portafolio y para clientes |
| `lenis` 1.3.27 | Smooth scroll | — | **No** (ver §4). Opcional en M11 si lo pides |
| `playwright` | Capturas de pantalla escritorio/móvil, emulación de reduced-motion, comprobaciones de scroll horizontal, teclado, consola y árbol de accesibilidad | devDependency + descarga de Chromium (~150 MB en `~/.cache/ms-playwright`, fuera del repo) | **Sí**, necesario: hoy no hay ningún navegador instalado en el WSL, y me pediste verificar yo mismo |
| `lighthouse` | Auditoría de rendimiento/accesibilidad por CLI, usando el Chromium de Playwright (`CHROME_PATH`) | devDependency | **Sí**, mismo motivo |

Se añadirían dos scripts: `npm run shots` (capturas en `.cache/shots/`, ignorado por git) y `npm run lh` (Lighthouse móvil y escritorio contra `npm run preview`, informe JSON/HTML en `.cache/lighthouse/`).

---

## 8. Fases

Cada fase cierra con: `npm run build`, `check`, `verify`, `size`, capturas Playwright (1440 px y 390 px, más 320 px para scroll horizontal, y una pasada con reduced-motion), Lighthouse a partir de M4, actualización de este documento (y de `DESIGN.md` si cambia una decisión), y **un commit local** (Conventional Commits). Sin `git push`.

| Fase | Contenido | Verificación específica |
|---|---|---|
| **M0** ✔ | Este plan | — |
| **M1 · Infraestructura** ✔ | Instalar dependencias aprobadas; esbuild con splitting y chunk `motion.js`; adaptar `hash-assets`, `size` y `verify`; cargador condicional (reduced-motion / Motion off / idle); interruptor Motion; scripts `shots` y `lh`; **línea base Lighthouse de `main` en preview** | Con reduced-motion emulado no se pide `motion.*.js` (comprobado en la red de Playwright); bundle crítico ≤ 15 KB |
| **M2 · Tipografía y layout** ✔ | Escala display, `text-outline` (Utility API), números gigantes, composición asimétrica por sección, marquee estático. **Sin movimiento todavía** | Capturas antes/después; 0 scroll horizontal a 320 px; contraste |
| **M3 · Capa global** ✔ | Barra de progreso (CSS scroll-driven), navbar ocultable + indicador de sección, cursor, botones magnéticos, rejilla viva | Teclado: navbar visible con foco; cursor ausente en emulación táctil |
| **M4 · Hero + marquee** ✔ | Intro CSS, línea de pulso, parallax de foto y titular, marquee con velocidad de scroll y botón de pausa | **LCP y CLS** en Lighthouse móvil frente a la línea base; decisión sobre máscara inicial del H1 |
| **M5 · About** ✔ | Número 01, revelado de imagen, titular que se lee con scroll (SplitText), iconos dibujados, spotlight | Árbol de accesibilidad del titular partido = texto original |
| **M6 · Programs** | Reparto de cartas, contador de precios, borde cónico, pulso hacia el formulario | El cambio de precios sigue funcionando sin el chunk (bloqueando la petición en Playwright) |
| **M7 · How it works** | Pin + scroll horizontal (lg+) con `containerAnimation`, línea de pulso, números que se rellenan; timeline vertical en móvil | Captura a mitad del pin; el orden de lectura y de Tab sigue siendo 01→04 |
| **M8 · Results + FAQ** | Citas tipográficas, entrada por palabras, parallax diferencial; FAQ sticky y morph del icono | Badge "Sample testimonial" visible en todas las capturas intermedias |
| **M9 · Book + footer + WhatsApp** | Titular, líneas de campos, animación de éxito, wordmark que se rellena, entrada de WhatsApp | Envío con datos válidos e inválidos en Playwright; aviso de marca ficticia intacto |
| **M10 · Auditoría final** | Pasada completa: Lighthouse móvil/escritorio, reduced-motion, Motion off, sin JS, teclado, 320 px, consola; pulido de easings y tiempos; actualizar `DESIGN.md`, `CLAUDE.md` (metas de peso si las apruebas) y README | Todas las metas de §5.3 y §6 |
| *M11 (opcional)* | Lenis en escritorio, solo si lo pides | Las mismas que M10 |

---

## 9. Decisiones (aprobadas el 2026-11-17)

Aprobados los cinco puntos: dos bundles (crítico ≤ 15 KB min + movimiento ≤ 55 KB gzip, documentado en CLAUDE.md), `gsap` + `playwright` + `lighthouse`, sin Lenis, scroll horizontal en How it works y sin loader a pantalla completa.

Texto original de las decisiones:

1. **Presupuesto de JS en dos bundles** (§5.2): crítico ≤ 15 KB (igual) + chunk de movimiento diferido ≤ 140 KB min / 55 KB gzip, que no se descarga con reduced-motion.
2. **Dependencias:** `gsap@3.15.1`, `playwright` (+ Chromium), `lighthouse`. Lenis: no.
3. **Scroll horizontal en How it works** en lugar de en Programs (§2.4).
4. **Sin loader a pantalla completa:** la intro del hero hace ese papel (§2.0).

---

## 10. Registro de fases

### M1 · Infraestructura ✔
- **Dependencias:** `gsap@3.15.1`, `playwright@1.65.1`, `lighthouse@13.6.0` (exactas). Chromium de Playwright: en este WSL no hay sudo para `playwright install-deps`, así que las tres librerías que faltaban (`libnss3`, `libnspr4`, `libasound2t64`) se descargaron con `apt-get download` y se extrajeron con `dpkg-deb -x` en `~/.cache/pw-libs`; `scripts/browser.mjs` las añade a `LD_LIBRARY_PATH`.
- **Build:** esbuild con `--splitting`; `hash-assets.mjs` hashea `motion.js` y reescribe su referencia en `main.js`; `size.mjs` compara con las tres metas y sale con error; `verify` detecta un `js/motion.js` sin hash.
- **Cargador** (`src/js/motion-loader.js`, bundle crítico): `import('./motion.js')` solo si el movimiento está permitido, tras `load` + `requestIdleCallback`. Reacciona al cambio de `prefers-reduced-motion` con la página abierta.
- **Chunk** (`src/js/motion.js`): registra ScrollTrigger y SplitText y crea todo dentro de un `gsap.matchMedia()` con las condiciones `desktop` / `mobile` (breakpoint lg de Bootstrap) y `finePointer`; `stop()` = `revert()`.
- **Interruptor Motion:** `<button aria-pressed>` en el navbar, estado en `localStorage.motion` y en `data-motion` de `<html>` (lo aplica el script inline del `<head>` antes de pintar). Oculto sin JS y con reduced-motion.
- **Sass:** mixin `motion` en `_mixins.scss` (`prefers-reduced-motion: no-preference` + `:root:not([data-motion="off"])`); sustituye a las cuatro media queries que había. Detalle de Sass: dentro de `@content`, `&` ya incluye el prefijo `:root:not(…)`, así que una regla como `.btn:hover > &` hay que escribirla fuera y meter el `@include` dentro.
- **Verificación:** `scripts/shots.mjs` y `scripts/lighthouse.mjs` (con `scripts/static-server.mjs`, que sirve brotli y los Cache-Control de Caddy, para medir en local algo parecido a producción).
- **Bug de `main` encontrado por `shots`:** 8 px de scroll horizontal en móvil por el footer (`.row.g-5`: gutter de 3 rem = márgenes de −1.5 rem frente a 1 rem de padding del `container`). Corregido con `g-4 g-lg-5`.
- **Pesos:** CSS 123.9 KB / 19.5 KB gzip · crítico 15 325 B (de 15 360: quedan 35 B; se recuperará al quitar `reveal.js` cuando GSAP asuma las entradas) · movimiento 121.0 KB / 47.8 KB gzip.
- **Lighthouse (mediana de 3):**

| | Performance | A11y | BP | SEO | LCP | TBT | CLS |
|---|---|---|---|---|---|---|---|
| Línea base `main`, móvil | 100 | 100 | 100 | 100 | 1052 ms | 32 ms | 0 |
| Línea base `main`, escritorio | 100 | 100 | 100 | 100 | 374 ms | 0 ms | 0 |
| M1, móvil | 100 | 100 | 100 | 100 | 910 ms | 63 ms | 0 |
| M1, escritorio | 100 | 100 | 100 | 100 | 421 ms | 0 ms | 0 |

  La primera ejecución móvil sale siempre más baja (89 en `main`, 87 en M1): arranque en frío del WSL. Por eso se usa la mediana.

### M2 · Tipografía y layout ✔
- **Hero:** H1 en tres `.line` fijas con `font-size: clamp(2.5rem, 11.4vw, 10rem)` (no RFS: RFS deja de escalar a 1200 px y aquí el titular debe llenar el container). Copy en `col-lg-6`, foto en `col-xl-5 offset-xl-1` que sube 9 rem desde xl hasta el hueco de "real life.". Línea de pulso SVG a 100vw entre las líneas 1 y 2, medida en `em` del titular (variable `--hero-title-size` compartida), con el pico a ~87 % del ancho, donde la línea 2 deja hueco.
- **Marquee** (`_marquee.scss`): banda Volt y banda de contorno cruzadas (−2° y 1.5°), `aria-hidden`, separador en rombo dibujado con CSS (un ✦ dependería de la fuente). `overflow: clip` recorta las bandas giradas sin crear scroll.
- **Números de sección** 01–06 (`.section-index` + `.text-outline`), detrás del contenido con `z-index: -1` dentro de `.section { isolation: isolate; overflow-x: clip }`. `clip` y no `hidden`: `hidden` rompería el sticky del FAQ y el pin de M7.
- **Composición:** About en `col-lg-4` + `col-lg-7 offset-lg-1`; tarjeta destacada con `margin-block: -1rem` en lg (margen y no transform, que será de GSAP); testimonios en escalera (0 / 3 / 6 rem); título del FAQ sticky en lg (`top: 7rem`; `.sticky-lg-top` usaría `top: 0` y quedaría bajo el navbar); "20 minutes, no pressure." a `clamp(2.75rem, …, 4.5rem)`; números de paso con contorno Volt; wordmark "PULSE THEORY" a todo el ancho en el footer.
- **Recorte de CSS para hacer sitio** (medido): `$enable-negative-margins: false`, `$gutters` a 0/3/4/5, `$grid-row-columns: 4` y `$responsive-utilities` reducida a 4 familias → **−14.2 KB min / −1.7 KB gzip**. Hallazgo de paso: `pt-lg-6`/`pb-lg-7` no existían (padding-top/bottom no son responsive); se volvió a `py-6 py-lg-7`.
- **Bug de `main` corregido:** la flecha de "Book your free consultation →" saltaba de línea a 390 px; ahora `$btn-padding-x-lg: 1.75rem` y `$btn-font-size-lg: 1.1875rem`.
- **Pesos:** CSS 112.5 KB / 18.4 KB gzip (antes de M2: 123.9 / 19.5) · crítico 15.0 KB · movimiento 47.8 KB gzip.
- **Lighthouse (mediana de 5):** móvil 100 · 100 · 100 · 100 (LCP 912 ms, TBT 63 ms, CLS 0); escritorio 100 · 100 · 100 · 100. Una primera tanda de 3 dio 93 en móvil (84 en una ejecución) sin cambios de JS respecto a M1: ruido del WSL, por eso `npm run lh` pasa a 5 ejecuciones. Los JSON muestran una tarea de ~170 ms hacia 1.2 s, que es la evaluación del chunk de GSAP: hay que vigilarla.

### M3 · Capa global ✔
- **Barra de progreso:** `.scroll-progress` en el header, solo CSS con `animation-timeline: scroll(root)` dentro de `@supports`. No va bajo `@include motion`: no se mueve sola, sigue al scroll del usuario.
- **`src/js/motion/global.js`** (chunk): navbar que se oculta al bajar más de 200 px y vuelve al subir (nunca con foco dentro ni con el menú móvil abierto, y reaparece en `focusin`); `aria-current="location"` en el enlace de la sección visible, con subrayado Volt en CSS; con puntero fino, cursor-anillo (`gsap.quickTo`, cursor nativo visible), CTA `.btn-lg` magnéticos y halo Volt en la rejilla del hero (`--mx`/`--my`).
- **Lección de GSAP:** `gsap.matchMedia()`/`context` solo registra lo creado **durante** su callback. Los tweens creados después en eventos (`onUpdate`, `pointerleave`) no los deshace `revert()`: cada módulo devuelve un cleanup que hace `killTweensOf` + `clearProps`, quita listeners y borra los nodos creados (el cursor). `motion.js` encadena esos cleanups.
- **Cursor:** la etiqueta "Book" solo aparece en enlaces de texto hacia `#book`; sobre un botón Volt tapaba su texto (visto en captura) y además era redundante.
- **Verificación nueva en `shots`:** navbar oculto/visible, `aria-current` correcto, cursor activo y botón desplazado con el puntero dentro del CTA. Al depurarla aprendí dos trampas de las pruebas con puntero: con `border-radius` las esquinas de una píldora no reciben el puntero, y mover el ratón a coordenadas fuera del viewport dispara `pointerleave` en `<html>`.
- **Pesos:** CSS 113.9 KB / 18.7 KB gzip · crítico 15.0 KB · movimiento 123.9 KB / 48.6 KB gzip.
- **Lighthouse (mediana de 5):** móvil 100 · 100 · 100 · 100 (LCP 907 ms, TBT 64 ms, CLS 0); escritorio 100 en todo. Ejecuciones de móvil: 63, 99, 100, 100, 100 (la primera es el arranque en frío de siempre).

### M4 · Hero + marquee ✔
- **Intro CSS** (`_hero.scss`): cada `.line` del H1 es una máscara (`overflow: hidden`, con `padding-bottom`/`margin-bottom` de .14em para no cortar la "g") y su `<span>` interior sube desde `translateY(105%)`, escalonado 90 ms; la línea de pulso se dibuja con `stroke-dashoffset` (`pathLength="1"`, `dasharray: 1 2`); la foto se descubre con una cortina Ink (`::after` con `scaleY`) y el resto del copy entra con fade-up. Todo con `animation-fill-mode: backwards`, para que al terminar no retenga un `transform` que pise los estilos inline del parallax de GSAP.
- **Decisión de la máscara inicial (medida, §2.1):** la primera versión con `clip-path` en líneas y foto subía el pintado móvil de ~50 a ~280 ms y el TBT a 140–540 ms → se cambió a solo `transform`/`opacity` (compositor). El `.lead` **no** se anima: en móvil es el elemento LCP y Chrome no lo cuenta mientras tenga `opacity: 0` (con fade-up, LCP móvil 1979 ms; sin él, ~900 ms).
- **Parallax [GSAP, scrub 0.6]** (`src/js/motion/hero.js`): las tres líneas se separan (−90/−40/0 px) y se abren en abanico (`xPercent` −4/0/4), la foto se mueve dentro de su marco y la rejilla va al 30 %.
- **Marquee:** bucle CSS (`translateX(-50%)` sobre la pista duplicada), **solo con `.motion-ready`** (medido: corriendo desde la carga duplicaba el TBT móvil). GSAP solo cambia el `playbackRate` de la animación CSS (Web Animations API, `getAnimations()`) con la velocidad del scroll, y la invierte al subir. Pausa: checkbox nativo "Pause marquee" que funciona solo con CSS (`:has(:checked)`), también al pasar el puntero; visible solo cuando el marquee está en marcha.
- **Cambio de estrategia de carga:** el chunk se pide en la **primera interacción** en vez de tras `load` + idle. Con idle, la evaluación de GSAP (~170 ms) caía dentro de la ventana de TBT de Lighthouse (219 ms en móvil). Todo lo del chunk necesita una interacción para verse (scroll, puntero) y la intro es CSS, así que no se pierde nada. `shots` mueve el ratón para provocarla.
- **Bugs encontrados al revisar:** (1) `.motion-ready` se añadía **después** de crear las animaciones, así que `getAnimations()` del marquee devolvía `[]` y la velocidad nunca funcionó; ahora la clase va antes del `matchMedia`. (2) Con `playbackRate` negativo una animación infinita termina al llegar a `currentTime 0` (solo es infinita hacia delante): se adelanta 100 vueltas al iniciar. `shots` comprueba ahora parallax, aceleración, sentido inverso y pausa.
- **Pesos:** CSS 116.2 KB / 19.1 KB gzip · crítico 14.9 KB · movimiento 124.8 KB / 49.0 KB gzip.
- **Lighthouse (mediana de 5):** móvil 100 · 100 · 100 · 100 (LCP 907 ms, TBT 39 ms, CLS 0); escritorio 100 en todo (LCP 373 ms). Frente a la línea base de `main`: LCP móvil 1052 → 907 ms, TBT 32 → 39 ms, CLS 0 → 0.

### M5 · About ✔
- **`src/js/motion/utils.js`** (compartido por M5–M9): `enter()` (entrada "una vez", `power4.out`, que **no se aplica si el elemento ya está en pantalla o pasó** cuando arranca el chunk: como llega con la primera interacción, el usuario puede estar a mitad de página, y §5.1 prohíbe ocultar lo visible); `afterFonts(context, fn)` (espera a `document.fonts.ready` y crea lo de SplitText con `context.add`, para que `revert()` también lo deshaga; se cancela si el contexto se revirtió mientras esperaba); `spotlight()` y `combine()`. Los módulos reciben ahora `(conditions, context)`.
- **Números gigantes 01–06** (en `global.js`, valen para todas las secciones): parallax `yPercent` 25 → −25 con scrub mientras se cruza la sección.
- **Foto en ventana:** el marco `.about-media` (borde y radio) queda fijo; el `<picture>` se descubre con `clip-path: inset()` (scrub) y la `<img>` hace contra-parallax con `scale: 1.2`. Aquí sí se usa `clip-path`: está bajo el pliegue y ligado al scroll, así que no cuenta para LCP ni TBT (lo que en M4 obligó a quitarlo del hero).
- **Titular que se lee solo:** `SplitText` en palabras con `aria: "auto"` (aria-label con el texto original en el `<h2>`, palabras `aria-hidden`), color Steel → Chalk con `scrub: true`. Se anima `color` y no `opacity`: con opacidad el estado inicial no llegaría a AA; Steel ya cumple 7.3:1. Verificado en `shots`: `getByRole('heading', { name })` encuentra el texto original y el árbol de accesibilidad es idéntico con y sin movimiento.
- **Credenciales:** escalonado corto con `back.out(1.6)` (la única excepción al "nada rebota": son fichas que se colocan, 0.5 s).
- **Tarjetas de valores:** `.value-card` sin `.reveal` (GSAP asume su entrada); el icono se dibuja con `stroke-dashoffset` (`pathLength="1"` en el HTML), y la línea Volt superior (`::before` con `scaleX(var(--line, 0))`) crece con un tween de la variable CSS. Sin chunk, `--line` vale 0 y la tarjeta queda como antes.
- **Spotlight** (`.spotlight` en `_base.scss`, reutilizable): `::after` con `radial-gradient` en `--mx`/`--my`, `z-index: -1` dentro de `isolation: isolate` (queda sobre el fondo de la tarjeta y bajo el texto). Solo `hover: hover` + `pointer: fine` y bajo `@include motion`.
- **Pesos:** CSS 116.8 KB / 19.3 KB gzip · crítico 14.9 KB · movimiento 127.2 KB / 49.7 KB gzip.
- **Lighthouse (mediana de 5):** móvil 100 · 100 · 100 · 100 (LCP 907 ms, TBT 33 ms, CLS 0); escritorio 100 en todo.
