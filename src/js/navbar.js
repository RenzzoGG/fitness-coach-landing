// Menú móvil: Collapse abre y cierra con el botón, pero no cierra al elegir un
// enlace (son anclas, la página no cambia) ni con Esc. Eso lo añadimos aquí.
import Collapse from 'bootstrap/js/src/collapse.js';

export function initNavbar() {
  const menu = document.getElementById('main-nav');
  const toggler = document.querySelector('[data-bs-target="#main-nav"]');
  if (!menu || !toggler) return;

  // .show solo existe con el menú móvil abierto; desde lg nunca está.
  const isOpen = () => menu.classList.contains('show');
  const close = () => Collapse.getOrCreateInstance(menu, { toggle: false }).hide();

  menu.addEventListener('click', (event) => {
    if (event.target.closest('a') && isOpen()) close();
  });

  // Esc cierra y devuelve el foco al botón: si el foco estaba dentro del menú,
  // se perdería al ocultarse.
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !isOpen()) return;
    close();
    toggler.focus();
  });
}
