// Cierra el menú móvil al elegir un enlace. Collapse no lo hace por sí solo:
// la página no cambia (son anclas) y el menú abierto taparía la sección.
import Collapse from 'bootstrap/js/src/collapse.js';

export function initNavbar() {
  const menu = document.getElementById('main-nav');
  if (!menu) return;

  menu.addEventListener('click', (event) => {
    if (!event.target.closest('a') || !menu.classList.contains('show')) return;
    Collapse.getOrCreateInstance(menu, { toggle: false }).hide();
  });
}
