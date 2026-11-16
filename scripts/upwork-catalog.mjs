// Genera las imágenes del Project Catalog de Upwork ("Responsive landing page")
// en docs/upwork-catalog/ (no versionadas). Sirve dist/, saca capturas con
// Playwright y compone 4 PNG de 1600×1200 renderizando HTML con las fuentes del sitio.
//
// Playwright NO es dependencia del proyecto: se instala aparte y se indica su carpeta.
//   npm run build
//   npm i --prefix /ruta/temporal playwright
//   PLAYWRIGHT_DIR=/ruta/temporal node scripts/upwork-catalog.mjs
// Solo una imagen, reutilizando las capturas de shots/: añade --only=4-what-you-get
// Opcional: CHROMIUM_PATH=/ruta/al/chrome para reutilizar un Chromium ya descargado.
//
// Las capturas evitan a propósito el footer (nombre y dominio del autor) y cualquier
// dato de contacto: las imágenes no deben llevar información personal ni URLs.
import { createRequire } from 'node:module';
import { mkdir, readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist');
const out = join(root, 'docs/upwork-catalog');
const shots = join(out, 'shots');
const only = process.argv.find((arg) => arg.startsWith('--only='))?.slice('--only='.length);

async function loadPlaywright() {
  try {
    return await import('playwright');
  } catch {
    if (!process.env.PLAYWRIGHT_DIR) {
      throw new Error('Playwright no encontrado: instálalo aparte y define PLAYWRIGHT_DIR (ver cabecera).');
    }
    return createRequire(join(process.env.PLAYWRIGHT_DIR, 'noop.js'))('playwright');
  }
}

const { chromium } = await loadPlaywright();
await mkdir(shots, { recursive: true });

const ctx = await esbuild.context({});
const { port } = await ctx.serve({ servedir: dist, port: 4181, host: '127.0.0.1' });
const site = `http://127.0.0.1:${port}/`;
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});

// ---------- 1. Capturas ----------
// reducedMotion: las secciones .reveal se muestran sin esperar a la animación.
async function openPage(width, height, scale) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: scale, reducedMotion: 'reduce' });
  await page.goto(site, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  // Sin el botón flotante de WhatsApp: tapa contenido en los recortes.
  await page.addStyleTag({ content: '.whatsapp-float{display:none!important}' });
  return page;
}

// Desplaza hasta la sección dejando su inicio justo debajo del header fijo.
async function scrollToSection(page, id, extra = 0) {
  await page.evaluate(
    ([sel, extraPx]) => {
      const header = document.querySelector('.site-header').offsetHeight;
      const top = document.querySelector(sel).getBoundingClientRect().top + window.scrollY;
      window.scrollTo(0, top - header + extraPx);
    },
    [id, extra],
  );
  await page.waitForTimeout(300); // lazy-load de imágenes
  await page.waitForLoadState('networkidle');
}

if (!only) {
  const desktop = await openPage(1440, 900, 2);
  await desktop.screenshot({ path: join(shots, 'desktop-hero.png') });
  // Secciones a 1440 de ancho; el desplazamiento extra salta el padding superior.
  for (const [id, extra] of [['#programs', 40], ['#how', 40], ['#results', 40], ['#book', 40]]) {
    await scrollToSection(desktop, id, extra);
    // Recorte al ancho del contenedor: el texto se ve más grande en la composición.
    await desktop.screenshot({ path: join(shots, `desktop-${id.slice(1)}.png`), clip: { x: 60, y: 0, width: 1320, height: 800 } });
  }
  await desktop.close();

  const mobile = await openPage(390, 844, 2);
  await mobile.screenshot({ path: join(shots, 'mobile-hero.png') });
  for (const [id, extra] of [['#programs', 20], ['#faq', 20], ['#book', 20]]) {
    await scrollToSection(mobile, id, extra);
    await mobile.screenshot({ path: join(shots, `mobile-${id.slice(1)}.png`) });
  }
  // Menú desplegado (Collapse de Bootstrap).
  await mobile.evaluate(() => window.scrollTo(0, 0));
  await mobile.click('.navbar-toggler');
  await mobile.waitForTimeout(500);
  await mobile.screenshot({ path: join(shots, 'mobile-menu.png') });
  await mobile.close();
}

// ---------- 2. Composición ----------
const img = async (name) => `data:image/png;base64,${(await readFile(join(shots, name))).toString('base64')}`;
const fontFile = async (prefix) => {
  const file = (await readdir(join(dist, 'fonts'))).find((f) => f.startsWith(prefix) && f.endsWith('.woff2'));
  return `data:font/woff2;base64,${(await readFile(join(dist, 'fonts', file))).toString('base64')}`;
};
const fonts = `
  @font-face{font-family:SG;font-weight:700;src:url(${await fontFile('space-grotesk-latin-700')})}
  @font-face{font-family:SG;font-weight:500;src:url(${await fontFile('space-grotesk-latin-500')})}
  @font-face{font-family:DM;font-weight:400;src:url(${await fontFile('dm-sans-latin-400')})}
  @font-face{font-family:DM;font-weight:500;src:url(${await fontFile('dm-sans-latin-500')})}`;

// Paleta de la marca (DESIGN.md §3).
const css = `${fonts}
  :root{--ink:#0E0F12;--graphite:#1C1E24;--line:#2A2D35;--chalk:#F4F4F0;--steel:#9AA0AA;--volt:#C6F432}
  *{box-sizing:border-box;margin:0}
  body{width:1600px;height:1200px;overflow:hidden;background:var(--ink);color:var(--chalk);font-family:DM,sans-serif;position:relative}
  .glow{position:absolute;inset:0;background:radial-gradient(900px 600px at 85% 100%,rgba(198,244,50,.13),transparent 70%),radial-gradient(700px 500px at 0% 0%,rgba(198,244,50,.06),transparent 70%)}
  .grid-bg{position:absolute;inset:0;background-image:linear-gradient(var(--line) 1px,transparent 1px),linear-gradient(90deg,var(--line) 1px,transparent 1px);background-size:80px 80px;opacity:.35;mask-image:radial-gradient(circle at 50% 40%,#000,transparent 75%)}
  h1,h2,h3{font-family:SG,sans-serif;font-weight:700;letter-spacing:-.03em;line-height:1.02}
  .eyebrow{font-family:SG;font-weight:500;font-size:22px;letter-spacing:.14em;text-transform:uppercase;color:var(--volt)}
  .sub{color:var(--steel);font-size:30px}
  .browser{background:var(--graphite);border:1px solid var(--line);border-radius:18px;overflow:hidden;box-shadow:0 40px 90px rgba(0,0,0,.55)}
  .bar{height:40px;display:flex;align-items:center;gap:9px;padding:0 18px;border-bottom:1px solid var(--line)}
  .bar i{width:12px;height:12px;border-radius:50%;background:#3a3d46}
  .bar b{margin-left:18px;height:20px;flex:0 0 38%;border-radius:10px;background:#262931}
  .browser img{display:block;width:100%}
  .phone{background:#050506;border-radius:52px;padding:13px;box-shadow:0 40px 90px rgba(0,0,0,.6),0 0 0 2px #2f323a}
  /* Barra de estado propia encima de la captura: el notch no tapa el header del sitio. */
  .phone .screen{border-radius:40px;overflow:hidden;position:relative;padding-top:38px;background:var(--ink)}
  .phone .screen::before{content:'';position:absolute;top:8px;left:50%;transform:translateX(-50%);width:96px;height:24px;border-radius:14px;background:#050506}
  .phone img{display:block;width:100%}
  .chip{display:inline-flex;align-items:center;gap:10px;background:var(--graphite);border:1px solid var(--line);border-radius:999px;padding:10px 20px;font-family:SG;font-weight:500;font-size:22px}
  .chip::before{content:'';width:10px;height:10px;border-radius:50%;background:var(--volt)}`;

const phone = (src, width) => `<div class="phone" style="width:${width}px"><div class="screen"><img src="${src}"></div></div>`;
const browserFrame = (src, width) => `<div class="browser" style="width:${width}px"><div class="bar"><i></i><i></i><i></i><b></b></div><img src="${src}"></div>`;

const slides = {
  '1-cover': `
    <div class="glow"></div><div class="grid-bg"></div>
    <div style="position:absolute;top:84px;left:100px">
      <p class="eyebrow" style="margin-bottom:22px">Web design &amp; development</p>
      <h1 style="font-size:104px">Responsive Landing Pages</h1>
      <p class="sub" style="margin-top:22px;font-size:38px">HTML <span style="color:var(--volt)">·</span> Tailwind <span style="color:var(--volt)">·</span> Bootstrap</p>
    </div>
    <div style="position:absolute;left:100px;top:420px">${browserFrame(await img('desktop-hero.png'), 1080)}</div>
    <div style="position:absolute;left:1150px;top:395px">${phone(await img('mobile-hero.png'), 350)}</div>`,

  '2-mobile': `
    <div class="glow"></div>
    <div style="position:absolute;top:80px;left:100px;right:100px;display:flex;justify-content:space-between;align-items:flex-end">
      <div>
        <p class="eyebrow" style="margin-bottom:18px">Mobile view</p>
        <h2 style="font-size:76px">Built mobile-first</h2>
      </div>
      <p class="sub" style="font-size:28px;max-width:560px;text-align:right">Thumb-friendly navigation, readable type<br>and no horizontal scroll down to 320&nbsp;px.</p>
    </div>
    <div style="position:absolute;top:330px;left:0;right:0;display:flex;justify-content:center;gap:56px;align-items:flex-start">
      ${phone(await img('mobile-menu.png'), 330)}
      <div style="margin-top:60px">${phone(await img('mobile-programs.png'), 330)}</div>
      ${phone(await img('mobile-book.png'), 330)}
    </div>`,

  '3-sections': `
    <div class="glow"></div>
    <div style="position:absolute;top:70px;left:100px">
      <p class="eyebrow" style="margin-bottom:16px">Sections &amp; details</p>
      <h2 style="font-size:68px">Every section has a job</h2>
    </div>
    <div style="position:absolute;top:250px;left:100px;right:100px;display:grid;grid-template-columns:1fr 1fr;gap:56px 40px">
      ${[
        ['desktop-programs.png', 'Pricing with monthly / yearly toggle'],
        ['desktop-how.png', 'Step-by-step process'],
        ['desktop-results.png', 'Testimonials'],
        ['desktop-book.png', 'Validated booking form'],
      ]
        .map(
          ([file, label]) => `<div style="position:relative">
            <div class="browser" style="border-radius:14px"><img src="__${file}__" style="display:block;width:100%;aspect-ratio:1320/800"></div>
            <span class="chip" style="position:absolute;left:18px;bottom:-22px;font-size:19px;padding:8px 16px">${label}</span>
          </div>`,
        )
        .join('')}
    </div>`,

  '4-what-you-get': `
    <div class="glow"></div><div class="grid-bg"></div>
    <div style="position:absolute;top:84px;left:100px">
      <p class="eyebrow" style="margin-bottom:18px">What you get</p>
      <h2 style="font-size:80px">A landing page ready to launch</h2>
    </div>
    <div style="position:absolute;top:380px;left:100px;right:100px;display:grid;grid-template-columns:1fr 1fr;gap:36px">
      ${[
        ['M4 5h16v11H4zM8 20h8M12 16v4', 'Responsive design', 'Mobile-first layouts that look sharp on phones, tablets and desktops.'],
        ['M4 6h16v12H4zM4 7l8 6 8-6', 'Contact form with spam protection', 'Accessible, validated form with Formspree&nbsp;+&nbsp;Cloudflare Turnstile.'],
        ['M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4', 'Basic SEO', 'Semantic HTML, titles, meta descriptions and social preview tags.'],
        ['M13 3 5 14h6l-1 7 8-11h-6z', 'Fast loading', 'Optimized images, local fonts and lean CSS / JS for a quick first view.'],
      ]
        .map(
          ([d, title, text]) => `<div style="background:var(--graphite);border:1px solid var(--line);border-radius:24px;padding:44px 44px 48px;display:flex;gap:30px;align-items:flex-start">
            <div style="flex:0 0 76px;height:76px;border-radius:20px;background:var(--volt);color:var(--ink);display:grid;place-items:center">
              <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>
            </div>
            <div><h3 style="font-size:36px;margin-bottom:14px;line-height:1.1">${title}</h3><p class="sub" style="font-size:24px;line-height:1.45">${text}</p></div>
          </div>`,
        )
        .join('')}
    </div>
    <p style="position:absolute;bottom:80px;left:100px;font-family:SG;font-weight:500;font-size:26px;color:var(--steel)">Built with <span style="color:var(--chalk)">HTML</span>, <span style="color:var(--chalk)">Tailwind</span> or <span style="color:var(--chalk)">Bootstrap</span> — your choice.</p>`,
};

// Los recortes de la diapositiva 3 se insertan después para no repetir await en el map.
for (const file of ['desktop-programs.png', 'desktop-how.png', 'desktop-results.png', 'desktop-book.png']) {
  slides['3-sections'] = slides['3-sections'].replace(`__${file}__`, await img(file));
}

const canvas = await browser.newPage({ viewport: { width: 1600, height: 1200 }, deviceScaleFactor: 1 });
for (const [name, body] of Object.entries(slides)) {
  if (only && name !== only) continue;
  await canvas.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${body}</body></html>`, { waitUntil: 'load' });
  await canvas.evaluate(() => document.fonts.ready);
  await canvas.screenshot({ path: join(out, `${name}.png`) });
  console.log(`✓ docs/upwork-catalog/${name}.png`);
}

await browser.close();
await ctx.dispose();
