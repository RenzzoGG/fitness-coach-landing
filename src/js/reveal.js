// Animaciones al hacer scroll: IntersectionObserver marca cada .reveal como
// visible la primera vez que entra en pantalla (sin listeners de scroll).
// El estado oculto y la transición viven en _base.scss, solo con movimiento permitido.
export function initReveal() {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target); // una sola vez
      }
    },
    { rootMargin: '0px 0px -10% 0px' }, // un poco antes de llegar al borde inferior
  );

  for (const element of document.querySelectorAll('.reveal')) observer.observe(element);
  document.documentElement.classList.add('reveal-ready'); // desactiva el failsafe del CSS
}
