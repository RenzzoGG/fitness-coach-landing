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
import { setupGlobal } from './motion/global.js';
import { setupHero } from './motion/hero.js';
import { setupAbout } from './motion/about.js';
import { setupPrograms } from './motion/programs.js';
import { setupHow } from './motion/how.js';
import { setupResultsFaq } from './motion/results-faq.js';

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

// Un módulo por sección: (conditions, context) => cleanup opcional. context sirve
// para crear animaciones más tarde dentro del mismo contexto (context.add). Se llaman dentro del
// contexto de matchMedia, así que revert() deshace sus tweens y ScrollTriggers;
// el cleanup devuelto se encarga de lo que GSAP no conoce (listeners, nodos creados).
const SECTIONS = [setupGlobal, setupHero, setupAbout, setupPrograms, setupHow, setupResultsFaq];

let mm = null;

export function start() {
  if (mm) return;
  // La clase va ANTES de crear las animaciones: activa las animaciones CSS que
  // dependen de ella (marquee) y los módulos las leen con getAnimations().
  document.documentElement.classList.add('motion-ready');
  mm = gsap.matchMedia();
  mm.add(QUERIES, (context) => {
    const cleanups = SECTIONS.map((setup) => setup(context.conditions, context)).filter(Boolean);
    return () => cleanups.forEach((cleanup) => cleanup());
  });
}

export function stop() {
  if (!mm) return;
  mm.revert();
  mm = null;
  document.documentElement.classList.remove('motion-ready');
}
