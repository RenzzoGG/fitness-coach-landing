// Prepara dist/: lo limpia y copia los archivos que no pasan por Sass ni esbuild
// (HTML, archivos estáticos y fuentes). CSS y JS los generan los scripts de npm.
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
export const dist = `${root}dist`;

// Solo los woff2 que declara _fonts.scss (subconjunto latin).
const fonts = [
  ['space-grotesk', 'space-grotesk-latin-500-normal.woff2'],
  ['space-grotesk', 'space-grotesk-latin-700-normal.woff2'],
  ['dm-sans', 'dm-sans-latin-400-normal.woff2'],
  ['dm-sans', 'dm-sans-latin-500-normal.woff2'],
  ['dm-sans', 'dm-sans-latin-700-normal.woff2'],
];

export function copyHtml() {
  cpSync(`${root}src/index.html`, `${dist}/index.html`);
}

export function copyStatic() {
  cpSync(`${root}src/static`, dist, { recursive: true });
}

export function copyFonts() {
  mkdirSync(`${dist}/fonts`, { recursive: true });
  for (const [pkg, file] of fonts) {
    cpSync(`${root}node_modules/@fontsource/${pkg}/files/${file}`, `${dist}/fonts/${file}`);
  }
  // La licencia OFL exige distribuirla junto a las fuentes.
  for (const pkg of new Set(fonts.map(([pkg]) => pkg))) {
    cpSync(`${root}node_modules/@fontsource/${pkg}/LICENSE`, `${dist}/fonts/LICENSE-${pkg}.txt`);
  }
}

export function build() {
  rmSync(dist, { recursive: true, force: true });
  mkdirSync(dist, { recursive: true });
  copyHtml();
  copyStatic();
  copyFonts();
}

// Ejecutado directamente (npm run build:static), no importado desde dev.mjs.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  build();
  console.log('dist/ ready (html, static, fonts)');
}
