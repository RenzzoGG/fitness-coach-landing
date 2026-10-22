// Prepara la carpeta de salida: la limpia, copia los archivos que no pasan por
// Sass ni esbuild (HTML, estáticos y fuentes) y genera las imágenes responsive.
// CSS y JS los generan los scripts de npm (build) o dev.mjs (desarrollo).
// Producción escribe en dist/ y desarrollo en .cache/dev/: así un `npm run dev`
// abierto nunca mezcla archivos sin minificar ni hash en el build de producción.
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildIcons, buildImages } from './images.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
export const dist = `${root}dist`;
export const devDir = `${root}.cache/dev`;

// Dominio final: la única fuente de las URLs absolutas (canonical, og:*, twitter:*).
// Se puede cambiar sin tocar el HTML: SITE_URL=https://otro.dominio npm run build
export const SITE_URL = (process.env.SITE_URL ?? 'https://pulse.renzzogg.com').replace(/\/$/, '');

// Solo los woff2 que declara _fonts.scss (subconjunto latin).
const fonts = [
  ['space-grotesk', 'space-grotesk-latin-500-normal.woff2'],
  ['space-grotesk', 'space-grotesk-latin-700-normal.woff2'],
  ['dm-sans', 'dm-sans-latin-400-normal.woff2'],
  ['dm-sans', 'dm-sans-latin-500-normal.woff2'],
  ['dm-sans', 'dm-sans-latin-700-normal.woff2'],
];

export function copyHtml(out = dist) {
  const html = readFileSync(`${root}src/index.html`, 'utf8').replaceAll('%SITE_URL%', SITE_URL);
  writeFileSync(`${out}/index.html`, html);
}

export function copyStatic(out = dist) {
  cpSync(`${root}src/static`, out, { recursive: true });
}

export async function generateImages(out = dist) {
  await buildIcons(`${root}src/static/favicon.svg`, out);
  return buildImages(`${root}src/img`, `${root}.cache/img`, `${out}/img`);
}

export function copyFonts(out = dist) {
  mkdirSync(`${out}/fonts`, { recursive: true });
  for (const [pkg, file] of fonts) {
    cpSync(`${root}node_modules/@fontsource/${pkg}/files/${file}`, `${out}/fonts/${file}`);
  }
  // La licencia OFL exige distribuirla junto a las fuentes.
  for (const pkg of new Set(fonts.map(([pkg]) => pkg))) {
    cpSync(`${root}node_modules/@fontsource/${pkg}/LICENSE`, `${out}/fonts/LICENSE-${pkg}.txt`);
  }
}

export async function build(out = dist) {
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  copyHtml(out);
  copyStatic(out);
  copyFonts(out);
  return generateImages(out);
}

// Ejecutado directamente (npm run build:static), no importado desde dev.mjs.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const encoded = await build();
  console.log(`dist/ ready (html, static, fonts, images: ${encoded} encoded, rest from .cache)`);
}
