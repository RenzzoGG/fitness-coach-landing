// Comprueba que cada clase usada en el HTML exista en el CSS compilado.
// Útil porque recortamos utilidades: una clase eliminada falla sin avisar.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { distFile } from './dist-files.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const html = readFileSync(`${root}dist/index.html`, 'utf8');
const css = readFileSync(distFile('css', 'css'), 'utf8');

// Clases que solo usa el JS (no necesitan reglas propias).
const jsHooks = new Set(['js']);

const used = new Set(
  [...html.matchAll(/class="([^"]+)"/g)].flatMap((m) => m[1].split(/\s+/)).filter(Boolean),
);
const escape = (c) => c.replace(/[.*+?^${}()|[\]\\:]/g, (ch) => (ch === ':' ? '\\\\:' : `\\${ch}`));
const missing = [...used].filter((c) => !jsHooks.has(c) && !new RegExp(`\\.${escape(c)}(?![\\w-])`).test(css));

if (missing.length) {
  console.error(`✘ Clases sin regla en el CSS: ${missing.join(', ')}`);
  process.exit(1);
}
console.log(`✔ ${used.size} clases del HTML, todas presentes en el CSS`);
