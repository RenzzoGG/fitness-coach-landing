// Muestra el peso del CSS y de los dos bundles de JS de dist/ (minificado y con
// gzip, lo que viaja por la red) y lo compara con las metas de CLAUDE.md.
// Sale con código 1 si alguna se supera: las metas no se suben nunca.
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { distFile } from './dist-files.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;

// [archivo, máximo minificado, máximo gzip] en KB (null = sin meta)
const BUDGETS = [
  [distFile('css', 'css'), 130, 20],
  [distFile('js', 'js'), 15, null], // bundle crítico
  [distFile('js', 'js', 'motion'), null, 55], // chunk diferido (no se descarga con reduced-motion)
];

let over = false;
for (const [path, maxMin, maxGzip] of BUDGETS) {
  const buf = readFileSync(path);
  const min = buf.length / 1024;
  const gzip = gzipSync(buf).length / 1024;
  const ok = (!maxMin || min <= maxMin) && (!maxGzip || gzip <= maxGzip);
  over ||= !ok;
  const budget = [maxMin && `≤ ${maxMin} min`, maxGzip && `≤ ${maxGzip} gzip`].filter(Boolean).join(' / ');
  console.log(`${path.replace(root, '').padEnd(30)} ${kb(buf.length).padStart(9)} min  ${kb(gzipSync(buf).length).padStart(8)} gzip   ${ok ? '✔' : '✘'} ${budget}`);
}
if (over) {
  console.error('\nOver budget: stop and propose what to cut (CLAUDE.md).');
  process.exit(1);
}
