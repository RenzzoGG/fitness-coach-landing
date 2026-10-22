// Interruptor mensual/anual de Programs.
// El HTML trae los precios mensuales (funciona sin JS); aquí se muestra el
// interruptor y se alternan los importes leyendo data-price-monthly/annual.

const usd = (value) => `$${value.toLocaleString('en-US')}`;

// Pura (sin DOM) para poder probarla en Node.
export function priceFor(period, { monthly, annual, monthlyNote }) {
  if (period === 'annual') {
    return { amount: usd(annual), note: `${usd(annual * 12)} billed yearly.` };
  }
  return { amount: usd(monthly), note: monthlyNote };
}

export const STATUS = {
  monthly: 'Showing monthly prices.',
  annual: 'Showing annual prices, billed yearly.',
};

export function initPricingToggle() {
  const toggle = document.querySelector('.billing-toggle');
  const input = document.getElementById('billing-switch');
  const status = document.getElementById('billing-status');
  if (!toggle || !input || !status) return;

  // Cada tarjeta: su importe, su nota y el texto mensual original del HTML.
  const plans = [...document.querySelectorAll('[data-price-monthly]')].map((amountEl) => {
    const noteEl = amountEl.closest('.card').querySelector('[data-price-note]');
    return {
      amountEl,
      noteEl,
      monthly: Number(amountEl.dataset.priceMonthly),
      annual: Number(amountEl.dataset.priceAnnual),
      monthlyNote: noteEl.textContent,
    };
  });

  const render = () => {
    const period = input.checked ? 'annual' : 'monthly';
    for (const plan of plans) {
      const { amount, note } = priceFor(period, plan);
      plan.amountEl.textContent = amount;
      plan.noteEl.textContent = note;
    }
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
