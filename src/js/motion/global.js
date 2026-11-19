// Capa global (M3): navbar que se oculta al bajar, sección activa en el menú,
// cursor que acompaña, botones magnéticos y rejilla del hero que sigue al puntero.
// La barra de progreso de scroll es solo CSS (animation-timeline), no está aquí.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Navbar: se esconde al bajar (deja ver más contenido) y vuelve al subir.
// Nunca se esconde con el foco dentro ni con el menú móvil abierto.
function smartNavbar() {
  const header = document.querySelector('.site-header');
  const menu = document.getElementById('main-nav');
  const show = () => gsap.to(header, { yPercent: 0, duration: 0.35, ease: 'power3.out', overwrite: true });
  const hide = () => gsap.to(header, { yPercent: -100, duration: 0.35, ease: 'power3.in', overwrite: true });

  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate(self) {
      const keep = header.matches(':focus-within') || menu.classList.contains('show');
      if (self.direction === 1 && self.scroll() > 200 && !keep) hide();
      else if (self.direction === -1) show();
    },
  });
  header.addEventListener('focusin', show);
  // Los tweens creados en onUpdate/eventos nacen fuera del contexto de
  // matchMedia y revert() no los conoce: se paran y limpian a mano.
  return () => {
    header.removeEventListener('focusin', show);
    gsap.killTweensOf(header);
    gsap.set(header, { clearProps: 'transform' });
  };
}

// Menú: marca con aria-current="location" el enlace de la sección visible
// (el CSS lo subraya en Volt). Es el valor de ARIA para "dónde estoy" en una
// página: los lectores de pantalla lo anuncian como "current location".
function activeSection() {
  for (const link of document.querySelectorAll('.navbar-nav .nav-link')) {
    const section = document.querySelector(link.hash);
    ScrollTrigger.create({
      trigger: section,
      start: 'top 50%',
      end: 'bottom 50%',
      onToggle: ({ isActive }) => (isActive ? link.setAttribute('aria-current', 'location') : link.removeAttribute('aria-current')),
    });
  }
  return () => document.querySelectorAll('.navbar-nav [aria-current]').forEach((link) => link.removeAttribute('aria-current'));
}

// Cursor: un anillo que sigue al puntero con un poco de inercia. El cursor del
// sistema sigue visible; el anillo crece sobre lo interactivo y, en los enlaces
// de texto que llevan al formulario, muestra "Book". aria-hidden y sin eventos de puntero.
function cursor() {
  const ring = document.createElement('div');
  ring.className = 'cursor';
  ring.setAttribute('aria-hidden', 'true');
  ring.innerHTML = '<span class="cursor-label"></span>';
  document.body.append(ring);
  const label = ring.firstChild;

  // quickTo: una sola función que reutiliza el mismo tween en cada movimiento,
  // en lugar de crear un tween nuevo por evento pointermove.
  const x = gsap.quickTo(ring, 'x', { duration: 0.35, ease: 'power3.out' });
  const y = gsap.quickTo(ring, 'y', { duration: 0.35, ease: 'power3.out' });

  // Solo el ratón mueve el anillo. En un portátil táctil (puntero principal
  // fino, así que el anillo existe) tocar la pantalla también genera eventos de
  // puntero: con el dedo el anillo se oculta y no reacciona.
  const touch = (event) => event.pointerType === 'touch' && (ring.classList.remove('is-visible'), true);
  const move = (event) => {
    if (touch(event)) return;
    x(event.clientX);
    y(event.clientY);
    ring.classList.add('is-visible');
  };
  const over = (event) => {
    if (touch(event)) return;
    const target = event.target.closest('a, button, label, summary, select, input, textarea');
    ring.classList.toggle('is-active', Boolean(target));
    // En un botón la etiqueta sería redundante y taparía su texto: solo en enlaces de texto.
    label.textContent = target?.matches('a[href="#book"]:not(.btn)') ? 'Book' : '';
  };
  const leave = () => ring.classList.remove('is-visible');

  addEventListener('pointermove', move, { passive: true });
  addEventListener('pointerdown', touch, { passive: true });
  document.addEventListener('pointerover', over);
  document.documentElement.addEventListener('pointerleave', leave);
  return () => {
    removeEventListener('pointermove', move);
    removeEventListener('pointerdown', touch);
    document.removeEventListener('pointerover', over);
    document.documentElement.removeEventListener('pointerleave', leave);
    ring.remove();
  };
}

// Botones magnéticos: los CTA grandes se desplazan hacia el puntero (30 % de la
// distancia al centro) y vuelven con un rebote suave al salir.
function magnetic() {
  const offs = [];
  for (const button of document.querySelectorAll('.btn-lg')) {
    const x = gsap.quickTo(button, 'x', { duration: 0.4, ease: 'power3.out' });
    const y = gsap.quickTo(button, 'y', { duration: 0.4, ease: 'power3.out' });
    const move = (event) => {
      if (event.pointerType === 'touch') return; // con el dedo, el botón no se mueve
      const r = button.getBoundingClientRect();
      x((event.clientX - r.left - r.width / 2) * 0.3);
      y((event.clientY - r.top - r.height / 2) * 0.4);
    };
    const leave = () => gsap.to(button, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.4)' });
    button.addEventListener('pointermove', move);
    button.addEventListener('pointerleave', leave);
    offs.push(() => {
      button.removeEventListener('pointermove', move);
      button.removeEventListener('pointerleave', leave);
      gsap.killTweensOf(button);
      gsap.set(button, { clearProps: 'transform' });
    });
  }
  return () => offs.forEach((off) => off());
}

// Rejilla viva: el hero recibe la posición del puntero en --mx/--my y el CSS
// dibuja un halo Volt ahí (.bg-grid::after). Solo se escriben dos variables.
function liveGrid() {
  const hero = document.querySelector('.hero');
  const move = (event) => {
    const r = hero.getBoundingClientRect();
    hero.style.setProperty('--mx', `${event.clientX - r.left}px`);
    hero.style.setProperty('--my', `${event.clientY - r.top}px`);
  };
  hero.addEventListener('pointermove', move, { passive: true });
  return () => {
    hero.removeEventListener('pointermove', move);
    hero.style.removeProperty('--mx');
    hero.style.removeProperty('--my');
  };
}

// Números de sección gigantes (01–06, decorativos): suben más despacio que la
// página mientras se cruza su sección (parallax, scrub).
function sectionIndexes() {
  for (const index of document.querySelectorAll('.section-index')) {
    gsap.fromTo(index, { yPercent: 25 }, { yPercent: -25, ease: 'none', scrollTrigger: { trigger: index.closest('.section'), start: 'top bottom', end: 'bottom top', scrub: 0.6 } });
  }
}

export function setupGlobal({ finePointer }) {
  sectionIndexes();
  const cleanups = [smartNavbar(), activeSection()];
  if (finePointer) cleanups.push(cursor(), magnetic(), liveGrid());
  return () => cleanups.forEach((cleanup) => cleanup());
}
