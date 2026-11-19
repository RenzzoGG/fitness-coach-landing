// Verificación visual y de comportamiento con Playwright contra dist/.
// Uso: npm run shots [-- etiqueta]   → .cache/shots/<etiqueta>/
//
// Por cada dispositivo (escritorio 1440, móvil 390, estrecho 320):
// - con movimiento: recorre la página (dispara las animaciones "once") y hace
//   una captura del viewport por sección;
// - con prefers-reduced-motion: página completa, y comprueba que NO se pide el
//   chunk de movimiento;
// - sin JS (móvil): página completa.
// Comprobaciones: scroll horizontal, errores de consola, chunk de movimiento,
// recorrido con Tab (cada elemento enfocado visible y dentro del viewport) y
// que el árbol de accesibilidad sea el mismo con y sin movimiento.
// Sale con código 1 si alguna comprobación falla.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch } from './browser.mjs';
import { serve } from './static-server.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const label = process.argv[2] ?? 'latest';
const out = `${root}.cache/shots/${label}`;
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const DEVICES = {
  desktop: { viewport: { width: 1440, height: 900 } },
  mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  narrow: { viewport: { width: 320, height: 640 }, isMobile: true, hasTouch: true },
};
const SECTIONS = ['top', 'about', 'programs', 'how', 'results', 'faq', 'book', 'site-footer'];
const MOTION_CHUNK = /\/js\/motion\.[0-9a-f]{8}\.js$/;

const failures = [];
const fail = (msg) => {
  failures.push(msg);
  console.log(`  ✘ ${msg}`);
};

const server = await serve(`${root}dist`);
const browser = await launch();

async function open(device, options = {}) {
  const context = await browser.newContext({ ...DEVICES[device], ...options });
  const page = await context.newPage();
  const errors = [];
  const requests = [];
  page.on('console', (msg) => msg.type() === 'error' && errors.push(msg.text()));
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('request', (req) => requests.push(req.url()));
  await page.goto(`${server.url}/`, { waitUntil: 'load' });
  return { context, page, errors, requests };
}

// El chunk de movimiento se pide con la primera interacción (motion-loader.js):
// se mueve el ratón y se espera a que añada .motion-ready a <html>.
const motionReady = (page) =>
  page.mouse.move(5, 5).then(() => page.waitForFunction(() => document.documentElement.classList.contains('motion-ready'), null, { timeout: 8000 })).then(
    () => true,
    () => false,
  );

const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

// Recorre la página en pasos de 60 % del viewport, comprobando el scroll horizontal en cada paso.
async function scrollThrough(page, tag) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  const step = Math.round(DEVICES[tag.split('/')[0]].viewport.height * 0.6);
  let worst = 0;
  for (let y = 0; y <= height; y += step) {
    await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
    await page.waitForTimeout(120);
    worst = Math.max(worst, await overflow(page));
  }
  if (worst > 0) fail(`${tag}: horizontal scroll of ${worst}px`);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForTimeout(300);
}

async function sectionShots(page, device) {
  for (const id of SECTIONS) {
    const exists = await page.evaluate((sid) => {
      const el = document.getElementById(sid) ?? document.querySelector(`.${sid}`);
      if (!el) return false;
      const header = document.querySelector('.site-header')?.offsetHeight ?? 0; // el navbar sticky tapa lo de arriba
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - header, behavior: 'instant' });
      return true;
    }, id);
    if (!exists) continue;
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${out}/${device}-${id}.png` });
  }
}

// Tab por toda la página: el elemento enfocado debe verse (opacidad, tamaño) y estar en el viewport.
async function keyboardWalk(page, tag) {
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.locator('body').focus();
  const seen = new Set();
  for (let i = 0; i < 120; i++) {
    await page.keyboard.press('Tab');
    // El scroll al elemento enfocado es suave (scroll-behavior de Bootstrap): esperar a que se detenga.
    await page.evaluate(
      () =>
        new Promise((resolve) => {
          let last = -1;
          let still = 0;
          const tick = () => (scrollY === last && ++still > 3 ? resolve() : ((still = scrollY === last ? still : 0), (last = scrollY), requestAnimationFrame(tick)));
          requestAnimationFrame(tick);
          setTimeout(resolve, 2000);
        }),
    );
    const info = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      if (el.dataset.tabSeen) return { loop: true };
      el.dataset.tabSeen = '1';
      const r = el.getBoundingClientRect();
      let opacity = 1;
      for (let n = el; n && n.nodeType === 1; n = n.parentElement) opacity *= Number(getComputedStyle(n).opacity);
      const name = `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''} "${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 40)}"`;
      const inView = r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
      return { name, key: name + r.top, opacity, inView, size: r.width * r.height };
    });
    if (!info || info.loop) break; // fin de la página o dio la vuelta
    seen.add(info.key);
    if (info.opacity < 0.5 || info.size === 0) fail(`${tag}: focused ${info.name} is not visible (opacity ${info.opacity.toFixed(2)})`);
    else if (!info.inView) fail(`${tag}: focused ${info.name} is outside the viewport`);
  }
  return seen.size;
}

try {
  const aria = {};
  for (const device of Object.keys(DEVICES)) {
    console.log(`\n${device}`);

    // 1. Con movimiento
    {
      const { context, page, errors, requests } = await open(device);
      const ready = await motionReady(page);
      await scrollThrough(page, `${device}/motion`);
      if (device !== 'narrow') await sectionShots(page, device);
      if (device === 'desktop') console.log(`  Tab stops: ${await keyboardWalk(page, `${device}/motion`)}`);
      if (device === 'desktop') aria.motion = await page.locator('main').ariaSnapshot();
      const chunk = requests.some((u) => MOTION_CHUNK.test(u));
      console.log(`  motion chunk: ${chunk ? 'loaded' : 'not loaded'}${ready ? ', motion-ready' : ''}`);
      if (chunk && !ready) fail(`${device}/motion: chunk loaded but .motion-ready never set`);
      if (errors.length) fail(`${device}/motion: console errors: ${errors.join(' | ')}`);
      await context.close();
    }

    // 2. prefers-reduced-motion: reduce
    {
      const { context, page, errors, requests } = await open(device, { reducedMotion: 'reduce' });
      await page.mouse.move(5, 5); // la interacción que pediría el chunk si el movimiento estuviera permitido
      await page.waitForTimeout(1500);
      await scrollThrough(page, `${device}/reduced`);
      await page.screenshot({ path: `${out}/${device}-full-reduced.png`, fullPage: true });
      if (requests.some((u) => MOTION_CHUNK.test(u))) fail(`${device}/reduced: motion chunk was downloaded`);
      if (device === 'desktop') {
        console.log(`  Tab stops (reduced): ${await keyboardWalk(page, `${device}/reduced`)}`);
        aria.reduced = await page.locator('main').ariaSnapshot();
      }
      if (errors.length) fail(`${device}/reduced: console errors: ${errors.join(' | ')}`);
      await context.close();
    }

    // 3. Interruptor "Motion": apagar revierte GSAP; tras recargar sigue apagado y no se descarga el chunk.
    if (device === 'desktop') {
      const { context, page } = await open(device);
      await motionReady(page);
      // M10: recorrer la página para que se creen todas las animaciones "once",
      // SplitText y el pin, y comprobar que apagar Motion lo deshace todo.
      await scrollThrough(page, `${device}/toggle`);
      await page.waitForTimeout(800);
      await page.click('.motion-toggle');
      await page.waitForTimeout(300);
      const leftovers = await page.evaluate(() => {
        const found = ['.price-counter', '.has-counter', '.how-signal', '.how-horizontal', '.pin-spacer', '.plan-signal', '.book-success-mark', '.is-lit', '.cursor', '#about-title[aria-label]', '.testimonial-quote p > div, .testimonial-quote p > span']
          .filter((sel) => document.querySelector(sel));
        const styled = [...document.querySelectorAll('main [style], .whatsapp-float[style], .site-header[style]')].filter((el) => !/^--card-index: \d$/.test(el.getAttribute('style')) && el.getAttribute('style').trim() !== '');
        return [...found, ...styled.map((el) => `${el.tagName.toLowerCase()}.${[...el.classList].join('.')} style="${el.getAttribute('style')}"`)];
      });
      if (leftovers.length) fail(`motion toggle off left motion state behind: ${leftovers.join(' | ')}`);
      const offTree = await page.locator('main').ariaSnapshot();
      const MOTION_ONLY_LINE = /Pause marquee/;
      const strip = (yml) => yml.split('\n').filter((line) => !MOTION_ONLY_LINE.test(line)).join('\n');
      if (aria.reduced && strip(offTree) !== strip(aria.reduced)) fail('motion toggle off: accessibility tree differs from reduced motion');
      await page.click('.motion-toggle');
      if (!(await motionReady(page))) fail('motion toggle on again: motion did not restart');
      await page.evaluate(() => window.scrollTo({ top: document.getElementById('about').offsetTop, behavior: 'instant' }));
      await page.waitForTimeout(800);
      const again = await page.evaluate(() => [document.querySelectorAll('.price-counter').length, document.getElementById('about-title').hasAttribute('aria-label')]);
      if (again[0] !== 3 || !again[1]) fail(`motion toggle on again: modules not rebuilt (${again})`);
      await page.click('.motion-toggle');
      const off =await page.evaluate(() => [document.documentElement.dataset.motion, document.documentElement.classList.contains('motion-ready'), document.querySelector('.motion-toggle').getAttribute('aria-pressed')]);
      if (off.join() !== 'off,false,false') fail(`motion toggle off: got ${off.join()}`);
      const requests = [];
      page.on('request', (req) => requests.push(req.url()));
      await page.reload({ waitUntil: 'load' });
      await page.mouse.move(20, 20);
      await page.waitForTimeout(1500);
      const pressed = await page.getAttribute('.motion-toggle', 'aria-pressed');
      if (pressed !== 'false' || requests.some((u) => MOTION_CHUNK.test(u))) fail(`motion toggle after reload: aria-pressed=${pressed}, chunk requested=${requests.some((u) => MOTION_CHUNK.test(u))}`);
      await page.click('.motion-toggle');
      if (!(await motionReady(page))) fail('motion toggle on: motion did not start');
      console.log('  motion toggle: ok');
      await context.close();
    }

    // 4. Capa global (M3): navbar oculto al bajar y visible al subir, sección activa,
    // cursor y botón magnético con el puntero dentro del CTA.
    if (device === 'desktop') {
      const { context, page } = await open(device);
      await motionReady(page);
      const headerY = () => page.evaluate(() => new DOMMatrix(getComputedStyle(document.querySelector('.site-header')).transform).m42);
      await page.mouse.wheel(0, 1500);
      await page.waitForTimeout(800);
      if ((await headerY()) >= 0) fail('global: header did not hide on scroll down');
      await page.evaluate(() => window.scrollTo({ top: document.getElementById('programs').offsetTop, behavior: 'instant' }));
      await page.waitForTimeout(600);
      const current = await page.evaluate(() => document.querySelector('.navbar-nav [aria-current="location"]')?.hash);
      if (current !== '#programs') fail(`global: aria-current is ${current}, expected #programs`);
      await page.mouse.wheel(0, -300);
      await page.waitForTimeout(800);
      if ((await headerY()) !== 0) fail('global: header did not come back on scroll up');
      const cta = page.locator('.hero .btn-lg').first();
      await cta.scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
      const box = await cta.boundingBox();
      await page.mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2, { steps: 8 });
      await page.waitForTimeout(600);
      const state = await page.evaluate(() => [document.querySelector('.cursor')?.className, getComputedStyle(document.querySelector('.hero .btn-lg')).transform]);
      if (state[0] !== 'cursor is-visible is-active') fail(`global: cursor state "${state[0]}"`);
      if (state[1] === 'none') fail('global: magnetic button did not move');
      console.log('  global layer: ok');
      await context.close();
    }

    // 4b. Hero + marquee (M4): parallax del titular, marquee en marcha, acelera al
    // bajar, va hacia atrás al subir y se detiene con su checkbox de pausa.
    if (device === 'desktop') {
      const { context, page } = await open(device);
      await motionReady(page);
      const marquee = () =>
        page.evaluate(() => {
          const a = document.querySelector('.marquee-track').getAnimations()[0];
          return a ? { state: a.playState, rate: a.playbackRate } : null;
        });
      const before = await marquee();
      if (before?.state !== 'running') fail(`hero: marquee not running (${JSON.stringify(before)})`);
      await page.mouse.move(700, 400);
      await page.mouse.wheel(0, 500);
      await page.waitForTimeout(150);
      const down = await marquee();
      if (!(down?.rate > 1)) fail(`hero: marquee did not speed up on scroll (rate ${down?.rate})`);
      await page.waitForTimeout(600);
      const line = await page.evaluate(() => getComputedStyle(document.querySelector('.hero-title .line')).transform);
      if (line === 'none') fail('hero: headline parallax did not move');
      await page.mouse.wheel(0, -300);
      await page.waitForTimeout(150);
      const up = await marquee();
      if (!(up?.rate < 0) || up.state !== 'running') fail(`hero: marquee did not reverse on scroll up (${JSON.stringify(up)})`);
      await page.locator('.marquee-pause label').click();
      await page.waitForTimeout(100);
      const paused = await marquee();
      if (paused?.state !== 'paused') fail(`hero: pause checkbox did not pause (${paused?.state})`);
      console.log('  hero + marquee: ok');
      await context.close();
    }

    // 4c. About (M5): titular partido en palabras con el texto original como nombre
    // accesible, palabras que cambian de color con el scroll, ventana de la foto,
    // tarjetas con línea Volt y spotlight bajo el puntero.
    if (device === 'desktop') {
      const { context, page } = await open(device);
      await motionReady(page);
      const ORIGINAL = "Hi, I'm Mateo. I coach strength for people with real schedules.";
      await page.evaluate(() => window.scrollTo({ top: document.getElementById('about').offsetTop - innerHeight * 0.6, behavior: 'instant' }));
      await page.waitForTimeout(1200);
      const title = await page.evaluate(() => {
        const h = document.getElementById('about-title');
        return { label: h.getAttribute('aria-label'), words: h.querySelectorAll('[aria-hidden="true"]').length, first: getComputedStyle(h.firstElementChild).color, last: getComputedStyle(h.lastElementChild).color };
      });
      const name = await page.getByRole('heading', { level: 2, name: ORIGINAL, exact: true }).count();
      if (title.label !== ORIGINAL || name !== 1) fail(`about: split heading name is "${title.label}" (role query matched ${name})`);
      if (title.words < 10) fail(`about: heading not split into words (${title.words})`);
      if (title.first === title.last) fail('about: heading words do not change colour with scroll');
      await page.evaluate(() => window.scrollTo({ top: document.querySelector('.value-card').getBoundingClientRect().top + scrollY - innerHeight * 0.5, behavior: 'instant' }));
      await page.waitForTimeout(1800);
      const cards = await page.evaluate(() => {
        const card = document.querySelector('.value-card');
        return { line: getComputedStyle(card, '::before').transform, opacity: getComputedStyle(card).opacity, clip: getComputedStyle(document.querySelector('.about-media picture')).clipPath };
      });
      if (cards.line === 'none' || cards.line.startsWith('matrix(0,')) fail(`about: value card line did not grow (${cards.line})`);
      if (cards.opacity !== '1') fail(`about: value card opacity ${cards.opacity} after entering`);
      const box = await page.locator('.value-card').first().boundingBox();
      await page.mouse.move(box.x + 60, box.y + 60, { steps: 4 });
      await page.waitForTimeout(500);
      const spot = await page.evaluate(() => [document.querySelector('.value-card').style.getPropertyValue('--mx'), getComputedStyle(document.querySelector('.value-card'), '::after').opacity]);
      if (!spot[0] || spot[1] !== '1') fail(`about: spotlight not following pointer (${spot.join()})`);
      await page.screenshot({ path: `${out}/desktop-about-cards.png` });
      console.log(`  about: ok (image clip at mid-scroll: ${cards.clip})`);
      await context.close();
    }

    // 4d. Programs (M6): el cambio de precios funciona sin el chunk (petición
    // bloqueada) y con él (contador); reparto de cartas, borde y señal del plan.
    if (device === 'desktop') {
      const visiblePrice = (page) =>
        page.evaluate(() => [...document.querySelectorAll('#programs .price-amount [data-period]')].filter((s) => getComputedStyle(s).visibility === 'visible').map((s) => s.textContent).join(' '));
      {
        const { context, page } = await open(device);
        await page.route(MOTION_CHUNK, (route) => route.abort());
        await page.mouse.move(5, 5);
        await page.locator('#billing-switch').scrollIntoViewIfNeeded();
        await page.locator('#billing-switch').check();
        await page.waitForTimeout(800);
        const prices = await visiblePrice(page);
        if (prices !== '$63 $119 $239') fail(`programs without chunk: visible prices "${prices}"`);
        await context.close();
      }
      const { context, page } = await open(device);
      await motionReady(page);
      await page.evaluate(() => window.scrollTo({ top: document.querySelector('#programs .row-cols-lg-3').getBoundingClientRect().top + scrollY - innerHeight * 0.5, behavior: 'instant' }));
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${out}/desktop-programs-deal.png` }); // a mitad del reparto
      await page.waitForTimeout(1400);
      const dealt = await page.evaluate(() => [...document.querySelectorAll('#programs .card')].map((c) => `${getComputedStyle(c).opacity}|${getComputedStyle(c).transform}`));
      if (dealt.some((d) => !/^1\|(none|matrix\(1, 0, 0, 1, 0, 0\))$/.test(d))) fail(`programs: cards not settled after dealing (${dealt.join(' ; ')})`);
      const shine = await page.evaluate(() => getComputedStyle(document.querySelector('.pricing-card-featured'), '::before').animationName);
      if (shine !== 'border-spin') fail(`programs: featured border shine is "${shine}"`);
      await page.locator('#billing-switch').check();
      await page.waitForTimeout(250);
      const counting = await page.evaluate(() => [...document.querySelectorAll('.price-counter')].map((c) => c.textContent).join(' '));
      await page.waitForTimeout(900);
      const counters = await page.evaluate(() => [...document.querySelectorAll('.price-counter')].map((c) => c.textContent).join(' '));
      const prices = await visiblePrice(page);
      if (counters !== '$63 $119 $239' || prices !== '$63 $119 $239') fail(`programs: counters "${counters}", accessible prices "${prices}"`);
      await page.locator('#programs [data-plan="elite"]').click();
      await page.waitForTimeout(150);
      const signal = await page.locator('.plan-signal').count();
      await page.waitForTimeout(1500);
      const plan = await page.evaluate(() => [document.querySelector('#book form').elements.plan.value, document.querySelectorAll('.plan-signal').length]);
      if (signal !== 1 || plan[0] !== 'elite' || plan[1] !== 0) fail(`programs: plan signal ${signal}, plan "${plan[0]}", leftover signals ${plan[1]}`);
      console.log(`  programs: ok (mid-count: ${counting})`);
      await context.close();
    }

    // 4e. How it works (M7): en escritorio, pin + scroll horizontal (captura a
    // mitad del pin, pista desplazada, pasos encendidos); en móvil, sin pin y
    // los cuatro pasos encendidos al pasar. En ambos, el orden del DOM es 01→04.
    if (device !== 'narrow') {
      const { context, page } = await open(device);
      await motionReady(page);
      const order = await page.evaluate(() => [...document.querySelectorAll('#how ol > li h3')].map((h) => h.textContent).join(' → '));
      if (order !== 'Free call → Assessment → Your plan → Weekly check-ins') fail(`${device}/how: step order is ${order}`);
      const state = () =>
        page.evaluate(() => ({
          pinned: Boolean(document.querySelector('#how .pin-spacer')),
          x: new DOMMatrix(getComputedStyle(document.querySelector('#how ol')).transform).m41,
          lit: document.querySelectorAll('#how .step.is-lit').length,
          top: Math.round(document.querySelector('.how-pin').getBoundingClientRect().top),
        }));
      if (device === 'desktop') {
        // Inicio del pin: centro de .how-pin en el centro de la ventana; se avanza por la mitad del recorrido.
        const start = await page.evaluate(() => {
          const r = document.querySelector('.how-pin').getBoundingClientRect();
          return r.top + scrollY + r.height / 2 - innerHeight / 2;
        });
        const spacer = await page.evaluate(() => document.querySelector('#how .pin-spacer')?.offsetHeight - document.querySelector('.how-pin').offsetHeight);
        await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), start + 10);
        await page.waitForTimeout(400);
        const first = await state();
        await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), start + spacer * 0.55);
        await page.waitForTimeout(1200);
        const mid = await state();
        await page.screenshot({ path: `${out}/desktop-how-pin.png` });
        if (!mid.pinned || !(spacer > 0)) fail(`desktop/how: section not pinned (spacer ${spacer})`);
        if (Math.abs(mid.top - first.top) > 2) fail(`desktop/how: pinned block moved vertically (${first.top} → ${mid.top})`);
        if (!(mid.x < -100)) fail(`desktop/how: track did not move horizontally (x ${mid.x})`);
        if (mid.lit < 1 || mid.lit > 3) fail(`desktop/how: ${mid.lit} steps lit at mid-pin`);
        if (await overflow(page)) fail('desktop/how: horizontal scroll during pin');
        await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), start + spacer + 50);
        // El scrub (0.6 s) termina de llevar el timeline al final; en un WSL cargado
        // una espera fija de 1.2 s se quedó corta una vez: se espera la condición.
        await page.waitForFunction(() => document.querySelectorAll('#how .step.is-lit').length === 4, null, { timeout: 3000 }).catch(() => {});
        const end = await state();
        if (end.lit !== 4) fail(`desktop/how: ${end.lit} steps lit after the pin`);
        console.log(`  how: ok (pin ${spacer}px, mid x ${Math.round(mid.x)}px, lit ${mid.lit}/4)`);
      } else {
        await page.evaluate(() => window.scrollTo({ top: document.querySelector('#how .btn-lg').getBoundingClientRect().top + scrollY - innerHeight * 0.3, behavior: 'instant' }));
        await page.waitForTimeout(1200);
        const end = await state();
        if (end.pinned) fail('mobile/how: section is pinned on mobile');
        if (end.lit !== 4) fail(`mobile/how: ${end.lit} steps lit after scrolling past`);
        console.log(`  how: ok (no pin, lit ${end.lit}/4)`);
      }
      await context.close();
    }

    // 4f. Results + FAQ (M8): badges "Sample testimonial" y nota visibles en
    // mitad de la entrada de las citas; citas partidas sin cambiar el texto;
    // morph del icono del acordeón y título del FAQ sticky.
    if (device === 'desktop') {
      const { context, page } = await open(device);
      await motionReady(page);
      const opacityChain = (sel) =>
        page.evaluate(
          (s) =>
            [...document.querySelectorAll(s)].map((el) => {
              let o = 1;
              for (let n = el; n && n.nodeType === 1; n = n.parentElement) o *= Number(getComputedStyle(n).opacity);
              return Number(o.toFixed(2));
            }),
          sel,
        );
      await page.evaluate(() => window.scrollTo({ top: document.querySelector('.results-grid').getBoundingClientRect().top + scrollY - innerHeight * 0.6, behavior: 'instant' }));
      await page.waitForTimeout(250);
      await page.screenshot({ path: `${out}/desktop-results-entering.png` });
      const badges = await opacityChain('.results-grid .badge');
      const note = await opacityChain('#results > .container > p.small');
      const words = await page.evaluate(() => document.querySelectorAll('.testimonial-quote p > *').length);
      if (badges.length !== 3 || badges.some((o) => o !== 1) || note[0] !== 1) fail(`results: honesty labels not fully visible mid-animation (badges ${badges}, note ${note})`);
      if (words < 30) fail(`results: quotes not split into words (${words})`);
      await page.waitForTimeout(1500);
      const quote = await page.evaluate(() => document.querySelector('.testimonial-quote p').textContent.replace(/\s+/g, ' ').trim());
      if (!quote.startsWith('“The weekly check-ins are what made it stick.')) fail(`results: quote text changed: ${quote}`);
      await page.locator('#faq').scrollIntoViewIfNeeded();
      await page.waitForTimeout(1200);
      const items = await opacityChain('#faq-accordion .accordion-item');
      if (items.some((o) => o !== 1)) fail(`faq: items not visible after entering (${items})`);
      await page.locator('[data-bs-target="#faq-2"]').click();
      await page.waitForTimeout(600);
      const icons = await page.evaluate(() => ['#faq-1', '#faq-2'].map((id) => getComputedStyle(document.querySelector(`[data-bs-target="${id}"]`), '::before').transform));
      if (icons[0] !== 'matrix(1, 0, 0, 1, 0, -5)' && !icons[0].startsWith('matrix(1, 0, 0, 1')) fail(`faq: closed icon is not a plus (${icons[0]})`);
      if (!icons[1].startsWith('matrix(0, ')) fail(`faq: open icon did not morph to minus (${icons[1]})`);
      const sticky = await page.evaluate(() => getComputedStyle(document.querySelector('.faq-intro')).position);
      if (sticky !== 'sticky') fail(`faq: intro position is ${sticky}`);
      await page.screenshot({ path: `${out}/desktop-faq-open.png` });
      console.log(`  results + faq: ok (${words} words, badges visible mid-animation)`);
      await context.close();
    }

    // 4g. Book + footer + WhatsApp (M9): envío inválido (foco en el primer error,
    // con anillo de foco) y válido (mensaje + marca de éxito), línea del campo,
    // avisos de demo y de marca ficticia intactos, wordmark relleno al final y
    // WhatsApp oculto en el hero y visible después.
    if (device === 'desktop') {
      const { context, page } = await open(device);
      await motionReady(page);
      const wa = () => page.evaluate(() => getComputedStyle(document.querySelector('.whatsapp-float')).visibility);
      if ((await wa()) !== 'hidden') fail('whatsapp: visible inside the hero');
      await page.locator('#book-form').scrollIntoViewIfNeeded();
      await page.waitForTimeout(900);
      if ((await wa()) !== 'visible') fail('whatsapp: not visible after the hero');
      await page.locator('#book-form button[type="submit"]').click();
      await page.waitForTimeout(600);
      const invalid = await page.evaluate(() => {
        const el = document.activeElement;
        return { id: el.id, invalid: el.classList.contains('is-invalid'), ring: getComputedStyle(el).boxShadow, line: getComputedStyle(el.nextElementSibling).transform, status: document.getElementById('book-status').textContent };
      });
      if (invalid.id !== 'name' || !invalid.invalid || invalid.status) fail(`book invalid submit: focus on #${invalid.id}, invalid ${invalid.invalid}, status "${invalid.status}"`);
      if (!invalid.ring || invalid.ring === 'none') fail('book: invalid field has no focus ring');
      if (invalid.line !== 'none' && invalid.line !== 'matrix(1, 0, 0, 1, 0, 0)') fail(`book: field line not drawn on focus (${invalid.line})`);
      await page.fill('#name', 'Sam Example');
      await page.fill('#email', 'sam@example.com');
      await page.selectOption('#goal', { index: 1 });
      await page.check('#consent');
      await page.locator('#book-form button[type="submit"]').click();
      await page.waitForTimeout(1300);
      const ok = await page.evaluate(() => ({
        status: document.getElementById('book-status').textContent,
        mark: getComputedStyle(document.querySelector('.book-success-mark path')).strokeDashoffset,
        demo: [...document.querySelectorAll('#book-form p')].some((p) => p.textContent === 'Demo form — no data is sent anywhere.'),
      }));
      if (!ok.status.startsWith('Thanks!') || ok.mark !== '0px' || !ok.demo) fail(`book valid submit: ${JSON.stringify(ok)}`);
      await page.screenshot({ path: `${out}/desktop-book-success.png` });
      await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
      await page.waitForTimeout(1500);
      const footer = await page.evaluate(() => ({ fill: getComputedStyle(document.querySelector('.footer-wordmark')).backgroundPosition, notice: document.querySelector('.footer-notice').textContent.replace(/\s+/g, ' ').trim() }));
      if (!footer.fill.startsWith('0%')) fail(`footer: wordmark not filled at the end (${footer.fill})`);
      if (footer.notice !== 'Pulse Theory is a fictional brand. This is a demo project by Renzzo Gracia Gomez — renzzogg.com') fail(`footer: notice changed: ${footer.notice}`);
      await page.screenshot({ path: `${out}/desktop-footer-end.png` });
      console.log('  book + footer + whatsapp: ok');
      await context.close();
    }

    // 5. Sin JS
    if (device === 'mobile') {
      const { context, page } = await open(device, { javaScriptEnabled: false });
      await scrollThrough(page, `${device}/no-js`);
      await page.screenshot({ path: `${out}/${device}-full-nojs.png`, fullPage: true });
      await context.close();
    }
  }

  // 6. Hero sobre el pliegue en escritorio: H1, línea de pulso, los dos CTA y la
  // zona de la mano y la mancuerna (50–93 % del alto y 18–86 % del ancho de la
  // foto original) dentro de la ventana. Con movimiento (intro terminada y
  // parallax de GSAP aplicado) y con reduced-motion.
  console.log('\nhero above the fold');
  for (const [width, height] of [[1440, 900], [1366, 768], [1280, 720]]) {
    for (const reducedMotion of ['no-preference', 'reduce']) {
      const context = await browser.newContext({ viewport: { width, height }, reducedMotion });
      const page = await context.newPage();
      await page.goto(`${server.url}/`, { waitUntil: 'load' });
      if (reducedMotion === 'no-preference' && !(await motionReady(page))) fail(`fold ${width}x${height}: motion did not start`);
      await page.waitForTimeout(1800); // intro CSS (≈1.4 s) terminada
      const r = await page.evaluate(() => {
        const box = (sel) => document.querySelector(sel).getBoundingClientRect();
        const media = box('.hero-media');
        const img = document.querySelector('.hero-media img');
        const ir = img.getBoundingClientRect();
        // object-fit: cover + object-position (lg+), sobre la caja ya transformada por GSAP
        const scale = Math.max(ir.width / img.naturalWidth, ir.height / img.naturalHeight);
        const cw = img.naturalWidth * scale;
        const ch = img.naturalHeight * scale;
        const [px, py] = getComputedStyle(img).objectPosition.split(' ').map((v) => parseFloat(v) / 100);
        const left = ir.left + (ir.width - cw) * px;
        const top = ir.top + (ir.height - ch) * py;
        const subject = { top: top + ch * 0.5, bottom: top + ch * 0.93, left: left + cw * 0.18, right: left + cw * 0.86 };
        return {
          h1: box('.hero-title').bottom,
          pulse: box('.hero-pulse').bottom,
          lines: Math.round(box('.hero-title').height / parseFloat(getComputedStyle(document.querySelector('.hero-title')).fontSize) / 0.92),
          ctas: Math.max(box('.hero .btn-primary').bottom, box('.hero .btn-outline-primary').bottom),
          media: media.bottom,
          subjectInFrame: subject.top >= media.top - 1 && subject.bottom <= media.bottom + 1 && subject.left >= media.left - 1 && subject.right <= media.right + 1,
          subjectBottom: subject.bottom,
        };
      });
      const tag = `fold ${width}x${height}${reducedMotion === 'reduce' ? ' reduced' : ''}`;
      const over = Object.entries({ h1: r.h1, pulse: r.pulse, ctas: r.ctas, photo: r.media, subject: r.subjectBottom }).filter(([, bottom]) => bottom > height);
      if (over.length) fail(`${tag}: below the fold: ${over.map(([k, v]) => `${k} ${Math.round(v)}px`).join(', ')}`);
      if (r.lines !== 3) fail(`${tag}: H1 has ${r.lines} lines`);
      if (!r.subjectInFrame) fail(`${tag}: hand + dumbbell not inside the photo crop`);
      await page.screenshot({ path: `${out}/hero-${width}x${height}${reducedMotion === 'reduce' ? '-reduced' : ''}.png` });
      console.log(`  ${tag}: CTAs ${Math.round(r.ctas)} · photo ${Math.round(r.media)} / ${height}`);
      await context.close();
    }
  }

  // 7. WhatsApp no tapa las tarjetas de precios: en cada paso del recorrido por
  // Programs, o el botón no se ve (lo cubre la sección) o no se cruza con ninguna tarjeta.
  console.log('\nwhatsapp vs pricing');
  for (const [name, options] of [['mobile', DEVICES.mobile], ['narrow', DEVICES.narrow], ['1280x720', { viewport: { width: 1280, height: 720 } }]]) {
    for (const reducedMotion of ['no-preference', 'reduce']) {
      const context = await browser.newContext({ ...options, reducedMotion });
      const page = await context.newPage();
      await page.goto(`${server.url}/`, { waitUntil: 'load' });
      if (reducedMotion === 'no-preference') await motionReady(page);
      const [from, to] = await page.evaluate(() => {
        const r = document.getElementById('programs').getBoundingClientRect();
        return [r.top + scrollY - innerHeight, r.bottom + scrollY];
      });
      let covered = 0;
      for (let y = Math.max(0, from); y <= to; y += 40) {
        await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
        await page.waitForTimeout(40);
        const hit = await page.evaluate(() => {
          const button = document.querySelector('.whatsapp-float');
          const b = button.getBoundingClientRect();
          const top = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
          if (!button.contains(top)) return null; // tapado por la sección: no se ve
          const card = [...document.querySelectorAll('#programs .card')].find((c) => {
            const r = c.getBoundingClientRect();
            return r.left < b.right && r.right > b.left && r.top < b.bottom && r.bottom > b.top;
          });
          return card ? card.querySelector('h3').textContent : null;
        });
        if (hit) covered++;
        if (hit && covered === 1) fail(`whatsapp ${name}${reducedMotion === 'reduce' ? ' reduced' : ''}: covers the "${hit}" card at scroll ${y}`);
      }
      if (!covered) console.log(`  ${name}${reducedMotion === 'reduce' ? ' reduced' : ''}: never over a pricing card`);
      await context.close();
    }
  }

  // 8. Cursor y táctil. Chromium con hasTouch emula pointer: coarse, así que en
  // un móvil el anillo ni se crea. El caso difícil es el portátil táctil: puntero
  // principal fino (el anillo existe) y pantalla táctil; se reproduce disparando
  // PointerEvent con pointerType "touch" en un contexto de escritorio.
  {
    const mobile = await browser.newContext({ ...DEVICES.mobile });
    const mpage = await mobile.newPage();
    await mpage.goto(`${server.url}/`, { waitUntil: 'load' });
    await mpage.touchscreen.tap(200, 400);
    await mpage.evaluate(() => window.scrollTo({ top: 600, behavior: 'instant' }));
    await mpage.waitForFunction(() => document.documentElement.classList.contains('motion-ready'), null, { timeout: 8000 }).catch(() => fail('mobile: motion did not start after touch'));
    await mpage.touchscreen.tap(200, 400);
    await mpage.waitForTimeout(400);
    if (await mpage.locator('.cursor').count()) fail('mobile: cursor ring created on a touch-only device');
    await mobile.close();

    const { context, page } = await open('desktop');
    await motionReady(page);
    await page.mouse.move(400, 300);
    await page.waitForTimeout(300);
    const ring = () => page.evaluate(() => document.querySelector('.cursor').classList.contains('is-visible'));
    const withMouse = await ring();
    const touch = (type, x, y) => page.evaluate(([t, cx, cy]) => {
      const target = document.elementFromPoint(cx, cy);
      target.dispatchEvent(new PointerEvent(t, { pointerType: 'touch', clientX: cx, clientY: cy, bubbles: true }));
    }, [type, x, y]);
    await touch('pointerdown', 640, 500);
    await touch('pointermove', 660, 520);
    const btn = await page.locator('.hero .btn-lg').first().boundingBox();
    await touch('pointerover', btn.x + 20, btn.y + 20);
    await touch('pointermove', btn.x + 20, btn.y + 20);
    await page.waitForTimeout(500);
    const afterTouch = await ring();
    const magnet = await page.evaluate(() => getComputedStyle(document.querySelector('.hero .btn-lg')).transform);
    if (!withMouse) fail('touch laptop: cursor ring does not follow the mouse');
    if (afterTouch) fail('touch laptop: cursor ring visible after touch input');
    if (magnet !== 'none' && magnet !== 'matrix(1, 0, 0, 1, 0, 0)') fail(`touch laptop: magnetic button moved with touch (${magnet})`);
    console.log(`\ncursor on touch: ${!withMouse || afterTouch ? 'FAILED' : 'ok (phone never creates it, touch laptop hides it on touch)'}`);
    await context.close();
  }

  writeFileSync(`${out}/aria-motion.yml`, aria.motion);
  writeFileSync(`${out}/aria-reduced.yml`, aria.reduced);
  // Única diferencia esperada: el control de pausa del marquee solo existe con movimiento.
  const MOTION_ONLY = /Pause marquee/;
  const tree = (yml) => yml.split('\n').filter((line) => !MOTION_ONLY.test(line)).join('\n');
  if (tree(aria.motion) !== tree(aria.reduced)) fail('accessibility tree differs between motion and reduced motion (see aria-*.yml)');
} finally {
  await browser.close();
  server.close();
}

console.log(`\nScreenshots → .cache/shots/${label}/`);
if (failures.length) {
  console.log(`${failures.length} check(s) failed`);
  process.exit(1);
}
console.log('All checks passed');
