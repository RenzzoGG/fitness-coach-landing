// How it works (M7): la pieza central.
// - lg+: la sección se fija (pin) y los cuatro pasos avanzan en horizontal con
//   el scroll. La línea de pulso recorre los paneles y se dibuja con el avance;
//   cada paso se "enciende" (número relleno de Volt, línea superior completa)
//   al cruzar el centro. containerAnimation hace que esos ScrollTriggers internos
//   midan el avance HORIZONTAL del timeline, no el scroll vertical.
// - < lg: sin pin (en móvil sufre con la barra de direcciones). La línea Volt de
//   cada paso se completa con el scroll y el paso se enciende al cruzarla.
// El DOM sigue siendo la misma <ol> en orden: el pin es solo presentación.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { enter } from './utils.js';

const SVG = 'http://www.w3.org/2000/svg';

// Con pathLength="1" el trazo mide 1: hace falta autoRound: false en el tween,
// porque GSAP redondea los px a enteros y saltaría de 1 a 0 de golpe.
// Línea de pulso a lo ancho de la pista, con un latido bajo cada número.
function signal(track, list, steps) {
  const svg = document.createElementNS(SVG, 'svg');
  const path = document.createElementNS(SVG, 'path');
  svg.classList.add('how-signal');
  svg.setAttribute('aria-hidden', 'true');
  path.setAttribute('pathLength', '1');
  svg.append(path);
  track.prepend(svg);

  const width = list.scrollWidth;
  const left = list.getBoundingClientRect().left;
  svg.style.left = `${left - track.getBoundingClientRect().left}px`; // la fila tiene margen negativo (gutter)
  const beats = steps.map((step) => {
    const r = step.querySelector('.step-number').getBoundingClientRect();
    return Math.min(r.right - left + 32, width - 60); // el latido, justo después del número
  });
  svg.setAttribute('viewBox', `0 0 ${width} 80`);
  svg.style.width = `${width}px`;
  path.setAttribute('d', `M0 40${beats.map((x) => ` H${x} l10 -26 l16 60 l12 -48 l8 14`).join('')} H${width}`);
  return { svg, path };
}

// Paso encendido: clase .is-lit (número Volt en CSS) y --fill (línea superior).
const light = (step, on) => step.classList.toggle('is-lit', on);

function horizontal(section) {
  const pin = section.querySelector('.how-pin');
  const track = section.querySelector('.how-track');
  const list = track.querySelector('ol');
  const steps = gsap.utils.toArray('.step', list);

  section.classList.add('how-horizontal'); // paneles anchos (CSS) antes de medir
  const distance = () => list.scrollWidth - track.clientWidth;
  const { svg, path } = signal(track, list, steps);

  const tl = gsap.timeline({
    defaults: { ease: 'none' }, // containerAnimation exige avance lineal
    scrollTrigger: { trigger: pin, pin: true, start: 'center center', end: () => `+=${distance()}`, scrub: 0.6, invalidateOnRefresh: true },
  });
  tl.to([list, svg], { x: () => -distance() }, 0).fromTo(path, { strokeDasharray: '1 2', strokeDashoffset: 1 }, { strokeDashoffset: 0, autoRound: false }, 0);

  for (const step of steps) {
    const at = { trigger: step, containerAnimation: tl };
    gsap.fromTo(step, { '--fill': 0 }, { '--fill': 1, ease: 'none', scrollTrigger: { ...at, start: 'left 85%', end: 'left 45%', scrub: true } });
    ScrollTrigger.create({ ...at, start: 'left 60%', onEnter: () => light(step, true), onLeaveBack: () => light(step, false) });
  }

  return () => {
    // El scrub persigue el progreso con un tween propio, creado fuera del
    // contexto: si sigue vivo, vuelve a pintar el timeline después de revert().
    tl.scrollTrigger?.kill();
    tl.kill();
    gsap.set(list, { clearProps: 'transform,translate,rotate,scale' });
    section.classList.remove('how-horizontal');
    svg.remove();
    steps.forEach((step) => light(step, false));
  };
}

function vertical(section) {
  const steps = gsap.utils.toArray('.step', section);
  for (const step of steps) {
    enter(step, { y: 40, opacity: 0 });
    gsap.fromTo(step, { '--fill': 0 }, { '--fill': 1, ease: 'none', scrollTrigger: { trigger: step, start: 'top 85%', end: 'top 50%', scrub: true } });
    ScrollTrigger.create({ trigger: step, start: 'top 60%', onEnter: () => light(step, true), onLeaveBack: () => light(step, false) });
  }
  return () => steps.forEach((step) => light(step, false));
}

export function setupHow({ desktop }) {
  const section = document.getElementById('how');
  return desktop ? horizontal(section) : vertical(section);
}
