// Precompresión: junto a cada archivo de texto de dist/ escribe su versión
// brotli (.br, calidad 11) y gzip (.gz, nivel 9). Caddy los sirve tal cual con
// `file_server { precompressed br gzip }` (ver Caddyfile): máxima compresión sin
// gastar CPU en cada petición, y brotli aunque el Caddy estándar no sepa generarlo.
// Último paso de `npm run build`, después de hash-assets (comprime los nombres finales).
//
// Fuentes woff2 e imágenes (avif, webp, jpg, png) ya vienen comprimidas: se omiten.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const text = new Set(['.html', '.css', '.js', '.svg', '.webmanifest', '.txt']);
const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;

let raw = 0;
let br = 0;
let count = 0;
for (const entry of readdirSync(dist, { recursive: true, withFileTypes: true })) {
  if (!entry.isFile() || !text.has(extname(entry.name))) continue;
  const path = `${entry.parentPath}/${entry.name}`;
  const buf = readFileSync(path);
  const brotli = brotliCompressSync(buf, {
    params: {
      [constants.BROTLI_PARAM_QUALITY]: constants.BROTLI_MAX_QUALITY,
      [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_TEXT,
      [constants.BROTLI_PARAM_SIZE_HINT]: buf.length,
    },
  });
  writeFileSync(`${path}.br`, brotli);
  writeFileSync(`${path}.gz`, gzipSync(buf, { level: 9 }));
  raw += buf.length;
  br += brotli.length;
  count++;
}

console.log(`Precompressed ${count} text files (br + gz): ${kb(raw)} → ${kb(br)} brotli`);
