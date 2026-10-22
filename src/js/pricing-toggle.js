// Interruptor mensual/anual de Programs.
// Los dos precios ya están en el HTML; el CSS muestra uno u otro (y anima el
// cambio) según data-billing en la sección. Aquí solo cambiamos ese estado.

const STATUS = {
  monthly: 'Showing monthly prices.',
  annual: 'Showing annual prices, billed yearly.',
};

export function initPricingToggle() {
  const input = document.getElementById('billing-switch');
  const status = document.getElementById('billing-status');
  if (!input || !status) return;

  const toggle = input.closest('.billing-toggle');
  const section = input.closest('section');

  const render = () => {
    const period = input.checked ? 'annual' : 'monthly';
    section.dataset.billing = period;
    status.textContent = STATUS[period]; // lo anuncia el aria-live
  };

  input.addEventListener('change', render);

  // Space alterna un checkbox de forma nativa; Enter no. Lo añadimos porque
  // el patrón "switch" de ARIA admite ambas teclas.
  input.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    input.click(); // dispara change, igual que el ratón
  });

  // Si el navegador restauró el estado del checkbox (atrás/adelante), lo respetamos.
  if (input.checked) render();
  toggle.hidden = false;
}
