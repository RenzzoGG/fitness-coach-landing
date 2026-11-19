// About (M5): foto que se descubre como una ventana, titular que "se lee solo"
// con el scroll (SplitText), credenciales que se colocan como fichas y tarjetas
// de valores con el icono dibujándose, el borde superior en Volt y spotlight.
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { afterFonts, combine, enter, spotlight } from './utils.js';

// Efecto ventana: el marco (.about-media, con su borde) queda fijo y la imagen
// se descubre desde dentro con clip-path mientras se mueve en sentido contrario.
// Es scrub (ligado al scroll), así que su estado siempre corresponde a la
// posición actual: no oculta nada que el usuario ya estuviera mirando.
function imageWindow() {
  const media = document.querySelector('.about-media');
  gsap.fromTo(
    media.querySelector('picture'),
    { clipPath: 'inset(14% 14% 14% 14% round 1rem)' },
    { clipPath: 'inset(0% 0% 0% 0% round 0rem)', ease: 'none', scrollTrigger: { trigger: media, start: 'top 95%', end: 'center 55%', scrub: 0.6 } },
  );
  gsap.fromTo(
    media.querySelector('img'),
    { scale: 1.2, yPercent: -8 },
    { yPercent: 8, ease: 'none', scrollTrigger: { trigger: media, start: 'top bottom', end: 'bottom top', scrub: 0.6 } },
  );
}

// El titular se parte en palabras y cada una pasa de Steel a Chalk según avanza
// el scroll. aria: 'auto' (por defecto en SplitText 3.13+): el <h2> recibe un
// aria-label con el texto original y las palabras, aria-hidden, así que el
// lector de pantalla sigue leyendo la frase entera. Steel ya cumple AA sobre Ink
// (7.3:1): el texto es legible en cualquier punto de la animación.
function readingHeadline(context) {
  return afterFonts(context, () => {
    const title = document.getElementById('about-title');
    const chalk = getComputedStyle(title).color;
    const steel = getComputedStyle(document.documentElement).getPropertyValue('--bs-secondary-color').trim();
    const split = SplitText.create(title, { type: 'words', aria: 'auto' });
    gsap.fromTo(split.words, { color: steel }, { color: chalk, ease: 'none', stagger: 0.1, scrollTrigger: { trigger: title, start: 'top 85%', end: 'bottom 40%', scrub: true } });
  });
}

function credentials() {
  const list = document.querySelector('.about-credentials');
  enter(list.children, { y: 18, opacity: 0, scale: 0.92, duration: 0.5, stagger: 0.07, ease: 'back.out(1.6)' }, list);
}

// Tarjetas: entran escalonadas; con ellas se dibuja el icono (stroke-dashoffset
// con pathLength="1" en el HTML) y crece la línea Volt superior (--line, que el
// CSS usa en un scaleX). Si ya estaban en pantalla, solo se enciende la línea.
function valueCards() {
  const cards = gsap.utils.toArray('.value-card');
  const icons = cards.map((card) => card.querySelector('.value-icon path'));
  const tween = enter(cards, { y: 48, opacity: 0, stagger: 0.12 }, cards[0]);
  if (!tween) {
    gsap.set(cards, { '--line': 1 });
    return;
  }
  gsap
    .timeline({ scrollTrigger: { trigger: cards[0], start: 'top 85%', once: true } })
    .fromTo(icons, { strokeDasharray: '1 2', strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.9, ease: 'power2.inOut', stagger: 0.12 }, 0.25)
    .fromTo(cards, { '--line': 0 }, { '--line': 1, duration: 0.7, ease: 'power3.inOut', stagger: 0.12 }, 0.35);
}

export function setupAbout({ finePointer }, context) {
  imageWindow();
  credentials();
  valueCards();
  return combine(readingHeadline(context), finePointer ? spotlight('.value-card') : null);
}
