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

// El chunk de movimiento añade .motion-ready a <html> al terminar de iniciarse.
const motionReady = (page) =>
  page.waitForFunction(() => document.documentElement.classList.contains('motion-ready'), null, { timeout: 8000 }).then(
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
      await page.waitForTimeout(1500); // margen por si el cargador lo pidiera en idle
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
      await page.click('.motion-toggle');
      const off = await page.evaluate(() => [document.documentElement.dataset.motion, document.documentElement.classList.contains('motion-ready'), document.querySelector('.motion-toggle').getAttribute('aria-pressed')]);
      if (off.join() !== 'off,false,false') fail(`motion toggle off: got ${off.join()}`);
      const requests = [];
      page.on('request', (req) => requests.push(req.url()));
      await page.reload({ waitUntil: 'load' });
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

    // 5. Sin JS
    if (device === 'mobile') {
      const { context, page } = await open(device, { javaScriptEnabled: false });
      await scrollThrough(page, `${device}/no-js`);
      await page.screenshot({ path: `${out}/${device}-full-nojs.png`, fullPage: true });
      await context.close();
    }
  }

  writeFileSync(`${out}/aria-motion.yml`, aria.motion);
  writeFileSync(`${out}/aria-reduced.yml`, aria.reduced);
  if (aria.motion !== aria.reduced) fail('accessibility tree differs between motion and reduced motion (see aria-*.yml)');
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
