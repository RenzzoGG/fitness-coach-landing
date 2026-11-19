// Hero (M4): parallax al hacer scroll. La intro es CSS (_hero.scss).
// - Las líneas del titular se separan a velocidades distintas y se abren en abanico.
// - La foto se mueve dentro de su marco (efecto ventana) y la rejilla va más lenta.
// - El marquee acelera con la velocidad del scroll y cambia de sentido al subir.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

function heroParallax() {
  // scrub: 0.6 → la animación persigue a la posición del scroll con 0.6 s de
  // retraso: suaviza el movimiento sin secuestrar el scroll (la razón para no usar Lenis).
  const scroll = { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.6 };
  const lines = gsap.utils.toArray('.hero-title .line');

  gsap.to(lines, {
    y: (i) => [-90, -40, 0][i],
    xPercent: (i) => [-4, 0, 4][i],
    ease: 'none',
    scrollTrigger: scroll,
  });
  gsap.fromTo('.hero-media img', { scale: 1.15, yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: scroll });
  gsap.to('.hero .bg-grid', { yPercent: 30, ease: 'none', scrollTrigger: scroll });
}

// La animación CSS del marquee sigue corriendo; aquí solo se cambia su
// playbackRate (Web Animations API: getAnimations() devuelve también las
// animaciones CSS). Al dejar de hacer scroll, el impulso se disipa con un tween.
function marqueeVelocity() {
  const animations = gsap.utils.toArray('.marquee-track').flatMap((track) => track.getAnimations());
  // Con playbackRate negativo una animación termina al llegar a currentTime 0
  // (aunque sea infinita, solo lo es hacia delante). Se adelanta 100 vueltas
  // para que al subir pueda ir hacia atrás. Mismo fotograma: el salto no se ve.
  animations.forEach((a) => (a.currentTime += 100 * a.effect.getComputedTiming().duration));
  const state = { boost: 0, direction: 1 };
  const apply = () => animations.forEach((a) => (a.playbackRate = state.direction * (1 + state.boost)));

  ScrollTrigger.create({
    trigger: '.marquee',
    start: 'top bottom',
    end: 'bottom top',
    onUpdate(self) {
      state.direction = self.direction;
      state.boost = Math.min(Math.abs(self.getVelocity()) / 300, 5);
      apply();
      gsap.to(state, { boost: 0, duration: 0.8, ease: 'power2.out', overwrite: true, onUpdate: apply });
    },
  });
  return () => {
    gsap.killTweensOf(state);
    animations.forEach((a) => (a.playbackRate = 1));
  };
}

export function setupHero() {
  heroParallax();
  return marqueeVelocity();
}
