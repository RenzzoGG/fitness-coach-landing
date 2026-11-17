// Cargador del chunk de movimiento (GSAP) e interruptor "Motion".
// Va en el bundle crítico y pesa muy poco: decide SI y CUÁNDO descargar
// motion.js (~48 KB gzip), que esbuild separa en otro archivo por el import().
//
// - Con prefers-reduced-motion: reduce, o con Motion en "off", no se descarga.
// - Si se descarga, es después del evento load y en un momento libre del hilo
//   principal: no compite con el LCP ni con la interactividad inicial.
// - El estado "off" se guarda en localStorage; el script inline del <head> lo
//   aplica (data-motion="off" en <html>) antes de pintar, para que las
//   animaciones CSS ni siquiera empiecen.

const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const html = document.documentElement;
const allowed = () => !reduce.matches && html.dataset.motion !== 'off';

let motion; // promesa del módulo: se pide una sola vez

// Arranca o para según el estado actual (sistema + interruptor). Se vuelve a
// comprobar tras la descarga: el usuario pudo apagarlo mientras tanto.
async function sync() {
  if (allowed()) motion ??= import('./motion.js');
  const module = await motion;
  if (module) allowed() ? module.start() : module.stop();
}

export function initMotion() {
  const toggle = document.querySelector('.motion-toggle');
  toggle?.setAttribute('aria-pressed', allowed());
  toggle?.addEventListener('click', () => {
    const off = html.dataset.motion !== 'off';
    html.dataset.motion = off ? 'off' : 'on';
    toggle.setAttribute('aria-pressed', !off);
    try {
      localStorage.motion = html.dataset.motion;
    } catch {
      // modo privado o almacenamiento bloqueado: funciona igual en esta visita
    }
    sync();
  });

  // Si el usuario cambia la preferencia del sistema con la página abierta.
  reduce.addEventListener('change', sync);

  if (!allowed()) return;
  const idle = () => ('requestIdleCallback' in window ? requestIdleCallback(sync, { timeout: 2000 }) : setTimeout(sync, 200));
  if (document.readyState === 'complete') idle();
  else addEventListener('load', idle, { once: true });
}
