// Utilidades compartidas por los módulos de sección del chunk de movimiento.
import { gsap } from 'gsap';

// Entrada "una vez" al llegar al elemento (tempo "esfuerzo" del plan: seca,
// power4.out). Principio del plan (§5.1): lo que ya está en pantalla, o ya
// pasó, cuando arranca el chunk NO se oculta para re-animarlo. Como el chunk
// llega con la primera interacción, el usuario puede estar ya a mitad de página.
export function enter(targets, vars, trigger = targets) {
  const el = gsap.utils.toArray(trigger)[0];
  if (!el || el.getBoundingClientRect().top < innerHeight * 0.9) return null;
  return gsap.from(targets, {
    duration: 0.8,
    ease: 'power4.out',
    ...vars,
    scrollTrigger: { trigger: el, start: 'top 85%', once: true, ...vars.scrollTrigger },
  });
}

// Ejecuta fn cuando las fuentes ya cargaron (SplitText debe cortar con la
// fuente final, si no el corte cambia y hay saltos), DENTRO del contexto de
// matchMedia (context.add) para que revert() también deshaga lo creado.
// Si el contexto se revirtió mientras esperaba, no hace nada.
export function afterFonts(context, fn) {
  let cancelled = false;
  document.fonts.ready.then(() => cancelled || context.add(fn));
  return () => (cancelled = true);
}

// Spotlight: escribe la posición del puntero dentro de cada elemento en
// --mx/--my; el CSS (.spotlight) dibuja ahí un halo. Solo con puntero fino.
export function spotlight(selector) {
  const offs = [];
  for (const el of document.querySelectorAll(selector)) {
    const move = (event) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${event.clientX - r.left}px`);
      el.style.setProperty('--my', `${event.clientY - r.top}px`);
    };
    el.addEventListener('pointermove', move, { passive: true });
    offs.push(() => {
      el.removeEventListener('pointermove', move);
      el.style.removeProperty('--mx');
      el.style.removeProperty('--my');
    });
  }
  return () => offs.forEach((off) => off());
}

// Une varios cleanups (algunos pueden ser null) en uno.
export const combine = (...cleanups) => () => cleanups.forEach((cleanup) => cleanup?.());
