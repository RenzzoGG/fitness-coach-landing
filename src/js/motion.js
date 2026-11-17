// Chunk de movimiento: GSAP + ScrollTrigger + SplitText y las animaciones de
// cada sección. Solo lo descarga motion-loader.js, y solo con movimiento permitido.
//
// Todas las animaciones se crean dentro de un gsap.matchMedia(): es un
// "contexto" que recuerda cada tween, ScrollTrigger y SplitText creados dentro.
// stop() llama a revert(), que los destruye y devuelve el DOM y los estilos
// inline a su estado original: la página queda estática y completa, igual que
// sin JS. Además, matchMedia reconstruye las animaciones al cruzar un
// breakpoint (p. ej. el pin horizontal solo existe desde lg).
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(ScrollTrigger, SplitText);

// En móvil, la barra de direcciones cambia el alto del viewport al hacer
// scroll; sin esto, ScrollTrigger recalcularía todo en cada cambio.
ScrollTrigger.config({ ignoreMobileResize: true });

// Breakpoints de Bootstrap ($grid-breakpoints): lg = 992px.
const QUERIES = {
  desktop: '(min-width: 992px)',
  mobile: '(max-width: 991.98px)',
  finePointer: '(hover: hover) and (pointer: fine)',
};

// Cada fase añade aquí su módulo: (conditions) => void, llamado dentro del contexto.
const SECTIONS = [];

let mm = null;

export function start() {
  if (mm) return;
  mm = gsap.matchMedia();
  mm.add(QUERIES, (context) => {
    for (const setup of SECTIONS) setup(context.conditions);
  });
  document.documentElement.classList.add('motion-ready');
}

export function stop() {
  if (!mm) return;
  mm.revert();
  mm = null;
  document.documentElement.classList.remove('motion-ready');
}
