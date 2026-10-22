// Muestra el peso del CSS y del JS de dist/: minificado y con gzip (lo que viaja por la red).
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;

for (const file of ['dist/css/main.css', 'dist/js/main.js']) {
  const buf = readFileSync(`${root}${file}`);
  console.log(`${file.padEnd(18)} ${kb(buf.length).padStart(9)} min  ${kb(gzipSync(buf).length).padStart(8)} gzip`);
}
