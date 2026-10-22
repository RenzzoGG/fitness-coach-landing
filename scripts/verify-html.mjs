// Auditoría estática del build de producción (dist/), sin navegador.
// npm run verify ejecuta antes html-validate (reglas del estándar HTML); este
// script añade lo propio del proyecto: anclas y referencias ARIA, landmarks,
// skip link, meta/OG con URLs absolutas y referencias rotas en el build.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { distFile } from './dist-files.mjs';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const html = readFileSync(`${dist}index.html`, 'utf8');
const cssPath = distFile('css', 'css');
const css = readFileSync(cssPath, 'utf8');
const SITE = 'https://pulse.renzzogg.com';

const errors = [];
const warnings = [];
let passed = 0;
const check = (ok, message, level = errors) => (ok ? passed++ : level.push(message));

// ---------------------------------------------------------------------------
// Tokenizador mínimo: etiquetas con atributos, sin comentarios ni <script>.
// ---------------------------------------------------------------------------
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr', 'path', 'circle', 'rect']);
const clean = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '<script></script>');

const elements = []; // { tag, attrs, raw, parent, children, text, line }
const stack = [];
const root = { tag: '#root', children: [], attrs: {} };
const lineOf = (index) => clean.slice(0, index).split('\n').length;

for (const m of clean.matchAll(/<(\/?)([a-zA-Z][\w-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>|([^<]+)/g)) {
  const [raw, closing, rawTag, rawAttrs, selfClosing, text] = m;
  const parent = stack.at(-1) ?? root;
  if (text !== undefined) {
    if (text.trim()) parent.children.push({ text });
    continue;
  }
  const tag = rawTag.toLowerCase();
  if (closing) {
    const open = stack.pop();
    check(open?.tag === tag, `Línea ${lineOf(m.index)}: </${tag}> cierra <${open?.tag ?? 'nada'}>`);
    continue;
  }
  const attrs = {};
  for (const a of rawAttrs.matchAll(/([^\s=]+)(?:\s*=\s*("([^"]*)"|'([^']*)'|[^\s>]+))?/g)) {
    const name = a[1].toLowerCase();
    check(!(name in attrs), `Línea ${lineOf(m.index)}: atributo duplicado "${name}" en <${tag}>`);
    attrs[name] = a[3] ?? a[4] ?? a[2] ?? '';
  }
  const el = { tag, attrs, raw, parent, children: [], line: lineOf(m.index) };
  parent.children.push(el);
  elements.push(el);
  if (!VOID.has(tag) && !selfClosing) stack.push(el);
}
check(stack.length === 0, `Etiquetas sin cerrar: ${stack.map((e) => `<${e.tag}> (línea ${e.line})`).join(', ')}`);

const textOf = (el) => (el.text ?? '') + (el.children ?? []).map((c) => (c.attrs?.['aria-hidden'] === 'true' ? '' : textOf(c))).join('');
const accessibleName = (el) =>
  (el.attrs['aria-label'] ?? '').trim() ||
  (el.attrs['aria-labelledby'] ? 'labelledby' : '') ||
  textOf(el).replace(/\s+/g, ' ').trim() ||
  el.children.filter((c) => c.tag === 'img').map((c) => c.attrs.alt).join('').trim();
const byTag = (tag) => elements.filter((e) => e.tag === tag);
const ancestors = (el) => { const list = []; for (let p = el.parent; p && p.tag !== '#root'; p = p.parent) list.push(p); return list; };
const ids = new Map();

// ---------------------------------------------------------------------------
// 1. Estructura del documento
// ---------------------------------------------------------------------------
check(/^<!doctype html>/i.test(html.trim()), 'Falta <!doctype html>');
check(byTag('html')[0]?.attrs.lang === 'en', '<html> sin lang="en"');
check(byTag('meta').some((m) => m.attrs.charset?.toLowerCase() === 'utf-8'), 'Falta <meta charset="utf-8">');
check(byTag('meta').some((m) => m.attrs.name === 'viewport' && /width=device-width/.test(m.attrs.content)), 'Falta meta viewport');
check(byTag('title').length === 1 && textOf(byTag('title')[0]).trim().length > 0, 'Debe haber un <title> no vacío');
for (const tag of ['header', 'main', 'footer']) check(byTag(tag).length === 1, `Debe haber exactamente un <${tag}>`);
check(byTag('nav').every((n) => n.attrs['aria-label'] || n.attrs['aria-labelledby']), 'Cada <nav> necesita aria-label o aria-labelledby (hay varios)');

// IDs únicos
for (const el of elements) {
  const id = el.attrs.id;
  if (!id) continue;
  check(!ids.has(id), `id duplicado "${id}" (líneas ${ids.get(id)?.line} y ${el.line})`);
  ids.set(id, el);
}

// Modelo de contenido básico
const PHRASING_ONLY = new Set(['p', 'span', 'a', 'button', 'label', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'em', 'small', 'dt']);
const BLOCK = new Set(['div', 'p', 'ul', 'ol', 'dl', 'section', 'article', 'header', 'footer', 'nav', 'form', 'figure', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'main']);
for (const el of elements) {
  if (PHRASING_ONLY.has(el.tag)) {
    const bad = el.children.find((c) => c.tag && BLOCK.has(c.tag));
    check(!bad, `Línea ${el.line}: <${bad?.tag}> no puede ir dentro de <${el.tag}>`);
  }
  if (el.tag === 'ul' || el.tag === 'ol') check(el.children.every((c) => !c.tag || c.tag === 'li'), `Línea ${el.line}: <${el.tag}> solo admite <li> como hijos`);
  if (el.tag === 'li') check(['ul', 'ol', 'menu'].includes(el.parent.tag), `Línea ${el.line}: <li> fuera de una lista`);
  if (el.tag === 'dl') check(el.children.every((c) => !c.tag || ['dt', 'dd', 'div'].includes(c.tag)), `Línea ${el.line}: <dl> solo admite dt, dd o div`);
  if (el.tag === 'a' || el.tag === 'button') {
    const nested = ancestors(el).find((a) => a.tag === 'a' || a.tag === 'button');
    check(!nested, `Línea ${el.line}: <${el.tag}> dentro de <${nested?.tag}> (interactivo anidado)`);
  }
  if (el.tag === 'source') check(el.parent.tag === 'picture', `Línea ${el.line}: <source> fuera de <picture>`);
  if (el.tag === 'figcaption') check(el.parent.tag === 'figure', `Línea ${el.line}: <figcaption> debe ser hijo directo de <figure>`);
}

// ---------------------------------------------------------------------------
// 2. Títulos
// ---------------------------------------------------------------------------
const headings = elements.filter((e) => /^h[1-6]$/.test(e.tag));
check(headings.filter((h) => h.tag === 'h1').length === 1, 'Debe haber exactamente un <h1>');
headings.forEach((h, i) => {
  const level = Number(h.tag[1]);
  const prev = i ? Number(headings[i - 1].tag[1]) : 0;
  check(level <= prev + 1, `Línea ${h.line}: salto de nivel h${prev} → h${level}`);
  check(textOf(h).trim().length > 0, `Línea ${h.line}: título vacío`);
});

// ---------------------------------------------------------------------------
// 3. Referencias internas: anclas y atributos ARIA/for
// ---------------------------------------------------------------------------
for (const el of elements) {
  const href = el.attrs.href;
  if (el.tag === 'a' && href?.startsWith('#') && href.length > 1) check(ids.has(href.slice(1)), `Línea ${el.line}: ancla ${href} sin destino`);
  for (const attr of ['aria-labelledby', 'aria-describedby', 'aria-controls']) {
    for (const ref of (el.attrs[attr] ?? '').split(/\s+/).filter(Boolean)) check(ids.has(ref), `Línea ${el.line}: ${attr}="${ref}" no existe`);
  }
  if (el.tag === 'label' && el.attrs.for) check(ids.has(el.attrs.for), `Línea ${el.line}: <label for="${el.attrs.for}"> sin control`);
  if (el.attrs['data-bs-target']) check(ids.has(el.attrs['data-bs-target'].slice(1)), `Línea ${el.line}: data-bs-target sin destino`);
  if (el.attrs['data-bs-parent']) check(ids.has(el.attrs['data-bs-parent'].slice(1)), `Línea ${el.line}: data-bs-parent sin destino`);
}

// ---------------------------------------------------------------------------
// 4. Accesibilidad de controles, enlaces e imágenes
// ---------------------------------------------------------------------------
for (const a of byTag('a')) {
  check(a.attrs.href !== undefined && a.attrs.href !== '' && a.attrs.href !== '#', `Línea ${a.line}: <a> sin href útil`);
  check(accessibleName(a).length > 0, `Línea ${a.line}: enlace sin nombre accesible`);
  if (a.attrs.target === '_blank') {
    check(/\bnoopener\b/.test(a.attrs.rel ?? ''), `Línea ${a.line}: target="_blank" sin rel="noopener"`);
    check(/new tab|new window/i.test(accessibleName(a)), `Línea ${a.line}: target="_blank" sin avisar de la pestaña nueva`, warnings);
  }
}
for (const b of byTag('button')) {
  check(['button', 'submit', 'reset'].includes(b.attrs.type), `Línea ${b.line}: <button> sin type explícito`);
  check(accessibleName(b).length > 0, `Línea ${b.line}: botón sin nombre accesible`);
}
const labelled = new Set(byTag('label').map((l) => l.attrs.for));
for (const c of elements.filter((e) => ['input', 'select', 'textarea'].includes(e.tag) && e.attrs.type !== 'hidden')) {
  check(labelled.has(c.attrs.id) || c.attrs['aria-label'] || c.attrs['aria-labelledby'], `Línea ${c.line}: <${c.tag}#${c.attrs.id}> sin etiqueta`);
  check(!!c.attrs.name || c.attrs.id === 'billing-switch', `Línea ${c.line}: <${c.tag}#${c.attrs.id}> sin name (no se enviaría)`, warnings);
}
for (const img of byTag('img')) {
  check('alt' in img.attrs, `Línea ${img.line}: <img> sin alt`);
  check(/^\d+$/.test(img.attrs.width ?? '') && /^\d+$/.test(img.attrs.height ?? ''), `Línea ${img.line}: <img> sin width/height (CLS)`);
}
for (const svg of byTag('svg')) {
  const decorative = svg.attrs['aria-hidden'] === 'true';
  check(decorative || svg.attrs.role === 'img', `Línea ${svg.line}: <svg> sin aria-hidden ni role="img"`);
  if (decorative) check(svg.attrs.focusable === 'false', `Línea ${svg.line}: <svg> decorativo sin focusable="false"`, warnings);
}
const tabindexes = elements.filter((e) => Number(e.attrs.tabindex) > 0);
check(tabindexes.length === 0, `tabindex positivo en: ${tabindexes.map((e) => `línea ${e.line}`).join(', ')}`);

// Skip link: primer elemento enfocable del body
const body = byTag('body')[0];
const firstFocusable = elements.find((e) => ancestors(e).includes(body) && (e.tag === 'a' || e.tag === 'button' || e.tag === 'input'));
check(firstFocusable?.attrs.href === '#main' && /visually-hidden-focusable/.test(firstFocusable.attrs.class), 'El primer enfocable del <body> debe ser el skip link a #main');

// Todo el contenido dentro de landmarks (regla "region" de axe); el skip link es la excepción.
for (const child of body.children.filter((c) => c.tag)) {
  const allowed = ['header', 'main', 'footer', 'script'].includes(child.tag) || child.attrs.href === '#main';
  check(allowed, `Línea ${child.line}: <${child.tag}> fuera de header/main/footer (regla "region")`);
}

// Una sola imagen con prioridad alta y sin lazy
const lazyHero = byTag('img').filter((i) => i.attrs.fetchpriority === 'high');
check(lazyHero.length === 1 && !lazyHero[0].attrs.loading, 'Debe haber una sola imagen con fetchpriority="high" y sin loading="lazy"');

// ---------------------------------------------------------------------------
// 5. Meta tags
// ---------------------------------------------------------------------------
const meta = (attr, key) => byTag('meta').find((m) => m.attrs[attr] === key)?.attrs.content;
const description = meta('name', 'description') ?? '';
check(description.length >= 50 && description.length <= 160, `meta description de ${description.length} caracteres (50–160)`);
const ogDesc = meta('property', 'og:description') ?? '';
check(ogDesc.length >= 100 && ogDesc.length <= 160, `og:description de ${ogDesc.length} caracteres (100–160)`);
for (const key of ['og:type', 'og:site_name', 'og:title', 'og:url', 'og:image', 'og:image:width', 'og:image:height', 'og:image:alt']) check(meta('property', key), `Falta ${key}`);
for (const key of ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image', 'twitter:image:alt']) check(meta('name', key), `Falta ${key}`);
const canonical = byTag('link').find((l) => l.attrs.rel === 'canonical')?.attrs.href ?? '';
for (const [key, value] of [['canonical', canonical], ['og:url', meta('property', 'og:url')], ['og:image', meta('property', 'og:image')], ['twitter:image', meta('name', 'twitter:image')]]) {
  check(value?.startsWith(`${SITE}/`), `${key} no es absoluta con ${SITE}: ${value}`);
}
check(!html.includes('%SITE_URL%'), 'Queda %SITE_URL% sin reemplazar');

// ---------------------------------------------------------------------------
// 6. Build de producción: referencias locales
// ---------------------------------------------------------------------------
const local = [];
for (const el of elements) {
  for (const attr of ['href', 'src', 'content']) {
    const value = el.attrs[attr];
    if (!value || value.startsWith('#') || value.startsWith('mailto:')) continue;
    if (value.startsWith(`${SITE}/`)) local.push(value.slice(SITE.length + 1));
    else if (!/^[a-z]+:/i.test(value) && /\.\w{2,12}$/.test(value)) local.push(value);
  }
  if (el.attrs.srcset) local.push(...el.attrs.srcset.split(',').map((s) => s.trim().split(/\s+/)[0]));
}
for (const ref of new Set(local.filter(Boolean))) check(existsSync(join(dist, ref)), `Referencia rota en el HTML: ${ref}`);
// Fuentes precargadas: deben ser exactamente las que pide el CSS y llevar crossorigin;
// si no, el navegador las descarga dos veces ("preloaded but not used").
const cssFonts = new Set([...css.matchAll(/url\("?\.\.\/(fonts\/[^")]+)"?\)/g)].map((m) => m[1]));
for (const link of byTag('link').filter((l) => l.attrs.rel === 'preload' && l.attrs.as === 'font')) {
  check(cssFonts.has(link.attrs.href), `Precarga de fuente que el CSS no usa: ${link.attrs.href}`);
  check('crossorigin' in link.attrs, `Precarga de fuente sin crossorigin: ${link.attrs.href}`);
}
for (const [, ref] of css.matchAll(/url\("?(?!data:)([^")]+)"?\)/g)) check(existsSync(join(cssPath, '..', ref)), `Referencia rota en el CSS: ${ref}`);
const manifest = JSON.parse(readFileSync(`${dist}site.webmanifest`, 'utf8'));
for (const icon of manifest.icons) check(existsSync(join(dist, icon.src)), `Ícono del manifest inexistente: ${icon.src}`);
check(existsSync(`${dist}robots.txt`) && existsSync(`${dist}favicon.svg`), 'Faltan robots.txt o favicon.svg');
// dist/ debe contener solo el build de producción: un main.css/main.js sin hash
// significa que algo (p. ej. un dev server antiguo) escribió ahí.
for (const stray of ['css/main.css', 'js/main.js']) check(!existsSync(dist + stray), `dist/${stray} sin hash: dist/ está contaminado (vuelve a ejecutar npm run build)`);

// ---------------------------------------------------------------------------
// Resultado
// ---------------------------------------------------------------------------
const externals = [...new Set(byTag('a').map((a) => a.attrs.href).filter((h) => /^https?:/.test(h)))];
console.log(`Elementos analizados: ${elements.length} · comprobaciones correctas: ${passed}`);
console.log(`Enlaces externos (revisar a mano): ${externals.join(', ')}`);
for (const w of warnings) console.log(`⚠ ${w}`);
for (const e of errors) console.log(`✘ ${e}`);
if (errors.length) process.exit(1);
console.log(`✔ Sin errores${warnings.length ? ` (${warnings.length} avisos)` : ''}`);
