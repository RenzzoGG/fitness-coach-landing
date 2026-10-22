// Muestra el peso del CSS y del JS de dist/: minificado y con gzip (lo que viaja por la red).
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { distFile } from './dist-files.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;

for (const path of [distFile('css', 'css'), distFile('js', 'js')]) {
  const buf = readFileSync(path);
  const file = path.replace(root, '');
  console.log(`${file.padEnd(28)} ${kb(buf.length).padStart(9)} min  ${kb(gzipSync(buf).length).padStart(8)} gzip`);
}
