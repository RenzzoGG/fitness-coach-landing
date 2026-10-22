// Validación del formulario de consulta.
// Las reglas son HTML nativo (required, type="email", maxlength); el navegador
// las evalúa con la Constraint Validation API y aquí solo mostramos el
// resultado con los estilos de Bootstrap (.is-invalid + .invalid-feedback).

// Pura (sin DOM) para poder probarla en Node: el mensaje por defecto está en el
// HTML; el email mal formado tiene uno propio en data-type-mismatch.
export function messageFor(validity, dataset, fallback) {
  return (validity.typeMismatch && dataset.typeMismatch) || fallback;
}

export function initBookingForm() {
  const form = document.getElementById('book-form');
  const status = document.getElementById('book-status');
  if (!form || !status) return;

  const FIELDS = 'input, select, textarea'; // no el botón: también tiene willValidate
  const fields = form.querySelectorAll(FIELDS);
  let submitted = false;

  const validate = (field) => {
    const valid = field.checkValidity();
    field.classList.toggle('is-invalid', !valid);
    field.setAttribute('aria-invalid', !valid);
    const feedback = field.parentElement.querySelector('.invalid-feedback');
    if (feedback && !valid) {
      feedback.dataset.default ??= feedback.textContent;
      feedback.textContent = messageFor(field.validity, field.dataset, feedback.dataset.default);
    }
    return valid;
  };

  // Al salir del campo: solo si ya se intentó enviar o si escribió algo
  // (no regañamos a quien solo está recorriendo el formulario con Tab).
  form.addEventListener('focusout', ({ target }) => {
    if (target.matches(FIELDS) && (submitted || (target.type !== 'checkbox' && target.value))) validate(target);
  });

  // Mientras corrige un campo con error, el mensaje desaparece en cuanto es válido.
  form.addEventListener('input', ({ target }) => {
    if (target.classList.contains('is-invalid')) validate(target);
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    submitted = true;
    const invalid = [...fields].filter((field) => !validate(field));
    if (invalid.length) {
      status.textContent = '';
      invalid[0].focus(); // el lector de pantalla lee su label y su error (aria-describedby)
      return;
    }
    status.textContent = "Thanks! This is a demo, so nothing was sent — on a real site, you'd get a reply within one business day.";
    form.reset();
    submitted = false;
    for (const field of fields) {
      field.classList.remove('is-invalid');
      field.removeAttribute('aria-invalid');
    }
  });
}
