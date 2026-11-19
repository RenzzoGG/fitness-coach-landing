// Book + footer + WhatsApp (M9).
// - Titular "20 minutes, no pressure." revelado por líneas (SplitText + máscara).
// - Envío correcto: la línea de pulso se dibuja y termina en un check. El aviso
//   "Demo form — no data is sent anywhere" no se toca.
// - Wordmark del footer: se rellena de Chalk de izquierda a derecha (scrub).
// - WhatsApp: entra al pasar el hero, para no competir con sus CTA.
// La línea Volt de los campos al enfocar es CSS (_form.scss).
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { afterFonts, combine, enter } from './utils.js';

// mask: 'lines' envuelve cada línea en un contenedor con overflow: clip, así la
// línea sube "desde dentro" (como la intro del hero). Al terminar se revierte
// el corte: el DOM vuelve a ser el original y un resize no deja líneas viejas.
function bookTitle(context) {
  return afterFonts(context, () => {
    const title = document.getElementById('book-title');
    if (title.getBoundingClientRect().top < innerHeight * 0.9) return;
    const split = SplitText.create(title, { type: 'lines', mask: 'lines', aria: 'auto' });
    enter(split.lines, { yPercent: 110, duration: 0.9, stagger: 0.1, onComplete: () => split.revert() }, title);
  });
}

// Pulso que acaba en check, dibujado al enviar con éxito. Va FUERA de la región
// role="status" (justo antes): así no altera lo que anuncia el lector de pantalla.
function successMark() {
  const form = document.getElementById('book-form');
  const status = document.getElementById('book-status');
  let mark = null;
  const clear = () => {
    if (!mark) return;
    gsap.killTweensOf(mark.firstChild);
    mark.remove();
    mark = null;
  };
  // form-validation.js (bundle crítico) registró su submit antes: aquí el
  // estado ya está escrito (texto en #book-status = envío correcto).
  const submit = () => {
    clear();
    if (!status.textContent) return;
    status.insertAdjacentHTML('beforebegin', '<svg class="book-success-mark" viewBox="0 0 150 40" aria-hidden="true"><path pathLength="1" d="M2 22H52l6-14 10 28 6-14H104l10 10 22-24"/></svg>');
    mark = status.previousElementSibling;
    gsap.fromTo(mark.firstChild, { strokeDasharray: '1 2', strokeDashoffset: 1 }, { strokeDashoffset: 0, autoRound: false, duration: 1.1, ease: 'power2.inOut' });
  };
  form.addEventListener('submit', submit);
  return () => {
    form.removeEventListener('submit', submit);
    clear();
  };
}

function wordmark() {
  const mark = document.querySelector('.footer-wordmark');
  gsap.fromTo(mark, { backgroundPosition: '100% 0' }, { backgroundPosition: '0% 0', ease: 'none', scrollTrigger: { trigger: mark, start: 'top bottom', end: 'bottom 92%', scrub: 0.6 } });
}

// autoAlpha = opacity + visibility: oculto, el botón tampoco recibe el foco.
function whatsapp() {
  const button = document.querySelector('.whatsapp-float');
  const show = () => gsap.to(button, { autoAlpha: 1, scale: 1, duration: 0.6, ease: 'back.out(2.2)', overwrite: true });
  const hide = () => gsap.to(button, { autoAlpha: 0, scale: 0.6, duration: 0.3, ease: 'power2.in', overwrite: true });
  const trigger = ScrollTrigger.create({ trigger: '.hero', start: 'bottom 60%', onEnter: show, onLeaveBack: hide });
  if (trigger.progress === 0) gsap.set(button, { autoAlpha: 0, scale: 0.6 }); // aún dentro del hero
  return () => {
    gsap.killTweensOf(button);
    gsap.set(button, { clearProps: 'opacity,visibility,transform' });
  };
}

export function setupBookFooter(conditions, context) {
  wordmark();
  return combine(bookTitle(context), successMark(), whatsapp());
}
