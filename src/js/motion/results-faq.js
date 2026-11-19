// Results + FAQ (M8).
// - Results: las citas entran palabra a palabra (SplitText, una vez: se leen
//   mejor si se completan solas) y, en lg+, las columnas hacen parallax
//   diferencial. La tarjeta, el badge "Sample testimonial" y la nota NO se animan:
//   la honestidad de la marca es visible desde el primer fotograma.
// - FAQ: las preguntas entran con un escalonado corto. El título sticky y el
//   morph del icono son CSS; la apertura sigue siendo el Collapse de Bootstrap.
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { afterFonts, combine, enter } from './utils.js';

// aria: 'none' y no 'auto': 'auto' pondría aria-label en el <p>, y ARIA prohíbe
// nombrar un párrafo. Las palabras quedan como <span> en línea con sus espacios:
// el texto accesible es el mismo (lo comprueba el diff del árbol en shots).
function quoteWords(context) {
  return afterFonts(context, () => {
    for (const quote of document.querySelectorAll('.testimonial-quote p')) {
      if (quote.getBoundingClientRect().top < innerHeight * 0.9) continue; // ya visible: no se re-anima
      const split = SplitText.create(quote, { type: 'words', aria: 'none' });
      enter(split.words, { opacity: 0, y: 14, duration: 0.6, ease: 'power3.out', stagger: 0.025 }, quote);
    }
  });
}

function parallaxColumns() {
  const cols = gsap.utils.toArray('.results-grid > .col');
  gsap.fromTo(cols, { y: 0 }, { y: (i) => [-30, 30, -90][i], ease: 'none', scrollTrigger: { trigger: '.results-grid', start: 'top bottom', end: 'bottom top', scrub: 0.6 } });
}

function faqItems() {
  const items = gsap.utils.toArray('#faq-accordion .accordion-item');
  enter(items, { opacity: 0, y: 24, duration: 0.6, stagger: 0.06 }, items[0]);
}

export function setupResultsFaq({ desktop }, context) {
  if (desktop) parallaxColumns();
  faqItems();
  return combine(quoteWords(context));
}
