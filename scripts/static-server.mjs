// Servidor estático mínimo para las verificaciones (shots y Lighthouse).
// Imita lo que hace Caddy en producción (ver Caddyfile): sirve el .br
// precomprimido si el navegador lo acepta y pone los mismos Cache-Control.
// Así Lighthouse mide en local algo parecido a producción, cosa que
// `npm run preview` (servidor de esbuild, sin compresión) no permite.
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.avif': 'image/avif',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

const cacheControl = (path) => {
  if (/\.[0-9a-f]{8}\.(css|js|woff2|avif|webp|jpg|png)$/.test(path)) return 'public, max-age=31536000, immutable';
  if (path.endsWith('.html')) return 'no-cache';
  return 'public, max-age=86400';
};

export function serve(root, port = 0) {
  const server = createServer((req, res) => {
    let path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (path.endsWith('/')) path += 'index.html';
    const file = join(root, path);
    if (!file.startsWith(root) || !existsSync(file) || !statSync(file).isFile()) {
      res.writeHead(404).end('404');
      return;
    }
    const headers = { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream', 'Cache-Control': cacheControl(file) };
    let body = readFileSync(file);
    if (/\bbr\b/.test(req.headers['accept-encoding'] ?? '') && existsSync(`${file}.br`)) {
      body = readFileSync(`${file}.br`);
      headers['Content-Encoding'] = 'br';
      headers.Vary = 'Accept-Encoding';
    }
    res.writeHead(200, headers).end(body);
  });
  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => resolve({ url: `http://127.0.0.1:${server.address().port}`, close: () => server.close() }));
  });
}
