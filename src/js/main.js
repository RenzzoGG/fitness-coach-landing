// Punto de entrada del JS.
// Importar Collapse activa su data API: cualquier [data-bs-toggle="collapse"]
// (botón del navbar, acordeón del FAQ) funciona sin instanciarlo a mano.
import 'bootstrap/js/src/collapse.js';
import { initNavbar } from './navbar.js';
import { initPricingToggle } from './pricing-toggle.js';
import { initBookingForm } from './form-validation.js';
import { initReveal } from './reveal.js';

initNavbar();
initPricingToggle();
initBookingForm();
initReveal();
