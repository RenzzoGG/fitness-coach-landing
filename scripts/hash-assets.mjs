// Cache-busting: añade un hash del contenido al nombre de cada asset
// (main.css → main.3f9a1c2b.css) y reescribe las referencias en CSS y HTML.
// El nombre solo cambia si cambia el contenido, así que Cloudflare y el
// navegador pueden guardar estos archivos "para siempre" sin servir versiones
// viejas. Último paso de `npm run build` (en dev no se usa).
//
// Sin hash, por nombre fijo: index.html (apunta a los hashes nuevos y no debe
// cachearse largo), favicon.svg, los íconos PNG, site.webmanifest y robots.txt.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const renamed = new Map(); // ruta vieja → ruta nueva, relativas a dist/

function hashFile(path) {
  const hash = createHash('sha256').update(readFileSync(dist + path)).digest('hex').slice(0, 8);
  const ext = extname(path);
  const hashed = `${path.slice(0, -ext.length)}.${hash}${ext}`;
  renameSync(dist + path, dist + hashed);
  renamed.set(path, hashed);
}

// Reemplaza cada ruta solo cuando aparece completa (entre comillas, espacios,
// comas, paréntesis o tras una "/"), nunca como parte de otra ruta.
function rewrite(file, prefix = '') {
  let content = readFileSync(dist + file, 'utf8');
  for (const [from, to] of renamed) {
    const escaped = (prefix + from).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    content = content.replace(new RegExp(`(?<=["'\\s,(/]|^)${escaped}(?=["'\\s,)]|$)`, 'gm'), prefix + to);
  }
  writeFileSync(dist + file, content);
}

const filesIn = (dir, pattern) => readdirSync(dist + dir).filter((f) => pattern.test(f)).map((f) => `${dir}/${f}`);

// 1. Fuentes, imágenes y OG: no referencian a nada.
for (const path of [...filesIn('fonts', /\.woff2$/), ...filesIn('img', /\.(avif|webp|jpg)$/), 'og-image.png']) {
  hashFile(path);
}

// 2. El CSS referencia las fuentes (url(../fonts/…)): se reescribe y luego se hashea.
rewrite('css/main.css', '../');
hashFile('css/main.css');

// 3. JS: main.js importa el chunk de movimiento con import('./motion.js').
// Primero se hashea el chunk, luego se reescribe esa referencia en main.js y por
// último se hashea main.js (su hash cambia si cambia el del chunk).
const js = readdirSync(`${dist}js`);
const unexpected = js.filter((f) => !['main.js', 'motion.js'].includes(f));
if (unexpected.length) throw new Error(`Unexpected JS output (shared chunk?): ${unexpected.join(', ')}`);
hashFile('js/motion.js');
const motion = renamed.get('js/motion.js').slice(3);
const main = readFileSync(`${dist}js/main.js`, 'utf8');
if (!main.includes('"./motion.js"')) throw new Error('main.js does not import ./motion.js');
writeFileSync(`${dist}js/main.js`, main.replace('"./motion.js"', `"./${motion}"`));
hashFile('js/main.js');

// 4. El HTML referencia todo, con rutas relativas y absolutas (og:image).
rewrite('index.html');

console.log(`Hashed ${renamed.size} assets (css, js, fonts, images, og-image)`);
