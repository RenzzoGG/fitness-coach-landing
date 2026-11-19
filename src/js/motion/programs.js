// Programs (M6): reparto de cartas, contador de precios, pulso de la píldora
// "Save 20%", spotlight y la señal que viaja hacia el formulario al elegir plan.
// El brillo del borde de la tarjeta destacada es CSS (_pricing.scss).
import { gsap } from 'gsap';
import { combine, enter, spotlight } from './utils.js';

// Reparto de cartas: en lg+ las tres tarjetas salen apiladas en el centro de la
// fila, desde abajo y giradas, y se abren a su sitio. La destacada (centro) llega
// la última y queda delante (z-index en el CSS). En móvil, una entrada simple:
// las tarjetas van en columna y "repartirlas" no tendría sentido.
function dealCards(desktop) {
  const cards = gsap.utils.toArray('#programs .card');
  const row = cards[0].closest('.row');
  if (!desktop) return enter(cards, { y: 60, opacity: 0, stagger: 0.12 }, row);

  const center = (el) => {
    const r = el.getBoundingClientRect();
    return r.left + r.width / 2;
  };
  const order = [0, 2, 1]; // laterales primero, la destacada al final
  return enter(
    cards,
    {
      x: (i) => center(row) - center(cards[i]),
      y: 220,
      rotation: (i) => [-9, 0, 9][i],
      opacity: 0,
      duration: 1,
      stagger: (i) => order.indexOf(i) * 0.12, // stagger como función: orden propio
      scrollTrigger: { start: 'top 75%' },
    },
    row,
  );
}

// Contador: el número cuenta del precio anterior al nuevo ($79 → $63). Son los
// precios reales del HTML. Los dos <span data-period> siguen ahí: el CSS los hace
// transparentes con .has-counter (el lector de pantalla sigue leyendo el visible,
// que conserva visibility: visible) y un <span> aria-hidden en la misma celda
// del grid muestra el número animado. Sin el chunk, el cambio es el de CSS.
function priceCounter() {
  const section = document.getElementById('programs');
  const input = document.getElementById('billing-switch');
  const badge = section.querySelector('.billing-toggle .badge');
  const amounts = [...section.querySelectorAll('.price-amount')].map((amount) => {
    const value = (period) => Number(amount.querySelector(`[data-period="${period}"]`).textContent.replace(/\D/g, ''));
    const counter = document.createElement('span');
    counter.className = 'price-counter';
    counter.setAttribute('aria-hidden', 'true');
    const state = { value: value(section.dataset.billing ?? 'monthly') };
    const render = () => (counter.textContent = `$${Math.round(state.value)}`);
    render();
    amount.append(counter);
    amount.classList.add('has-counter');
    return { amount, counter, state, value, render };
  });

  // pricing-toggle.js (bundle crítico) ya cambió data-billing: su listener se
  // registró antes que este, así que aquí se lee el estado nuevo.
  const change = () => {
    const period = section.dataset.billing;
    amounts.forEach(({ state, value, render }, i) => {
      gsap.to(state, { value: value(period), duration: 0.7, delay: i * 0.06, ease: 'power3.out', overwrite: true, onUpdate: render });
    });
    if (period === 'annual') gsap.fromTo(badge, { scale: 1 }, { scale: 1.18, duration: 0.16, ease: 'power2.out', yoyo: true, repeat: 1, overwrite: true });
  };
  input.addEventListener('change', change);

  return () => {
    input.removeEventListener('change', change);
    amounts.forEach(({ amount, counter, state }) => {
      gsap.killTweensOf(state);
      counter.remove();
      amount.classList.remove('has-counter');
    });
    gsap.killTweensOf(badge);
    gsap.set(badge, { clearProps: 'transform' });
  };
}

// Al elegir plan: la línea de pulso del logo sale del botón y baja hacia el
// formulario mientras el navegador hace el scroll suave hasta #book. Es un
// nodo decorativo temporal (aria-hidden, sin eventos de puntero).
const PULSE = '<svg viewBox="0 0 32 24" preserveAspectRatio="none"><path d="M3 17h6l3-7 5 13 3-6h9" fill="none" stroke="currentColor" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/></svg>';

function planSignal() {
  const nodes = new Set();
  const click = (event) => {
    const link = event.target.closest('#programs [data-plan]');
    if (!link) return;
    const r = link.getBoundingClientRect();
    const signal = document.createElement('div');
    signal.className = 'plan-signal';
    signal.setAttribute('aria-hidden', 'true');
    signal.innerHTML = PULSE;
    document.body.append(signal);
    nodes.add(signal);
    gsap
      .timeline({ onComplete: () => (signal.remove(), nodes.delete(signal)) })
      .set(signal, { left: r.left, top: r.top + r.height / 2, width: r.width })
      .fromTo(signal, { scaleX: 0.2, opacity: 1 }, { scaleX: 1.6, duration: 0.35, ease: 'power3.out' })
      .to(signal, { y: innerHeight, opacity: 0, duration: 0.8, ease: 'power2.in' }, 0.2);
  };
  document.addEventListener('click', click);
  return () => {
    document.removeEventListener('click', click);
    nodes.forEach((node) => (gsap.killTweensOf(node), node.remove()));
  };
}

export function setupPrograms({ desktop, finePointer }) {
  dealCards(desktop);
  return combine(priceCounter(), planSignal(), finePointer ? spotlight('#programs .card') : null);
}
