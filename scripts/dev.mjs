// Servidor de desarrollo sin dependencias extra:
// - esbuild en modo watch + su servidor HTTP sobre dist/
// - sass --watch (sin autoprefixer: los prefijos solo importan en el build de producción)
// - recopia el HTML, los estáticos y las imágenes cuando cambian
import { spawn } from 'node:child_process';
import { watch } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import { build, copyHtml, copyStatic, generateImages } from './build.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const port = Number(process.env.PORT) || 5173;

await build();

// Primero el servidor: si el puerto está ocupado falla aquí, antes de lanzar
// sass, y no deja ningún proceso huérfano.
const ctx = await esbuild.context({
  entryPoints: [`${root}src/js/main.js`],
  bundle: true,
  format: 'esm',
  target: 'es2020',
  outfile: `${root}dist/js/main.js`,
  logLevel: 'info',
});

try {
  await ctx.serve({ servedir: `${root}dist`, port });
} catch {
  await ctx.dispose();
  console.error(`\n  ✘ Port ${port} is already in use. Is another "npm run dev" running?\n`);
  process.exit(1);
}
await ctx.watch();

const sass = spawn(
  `${root}node_modules/.bin/sass`,
  [
    '--watch',
    '--load-path=node_modules',
    '--no-source-map',
    '--quiet-deps',
    '--silence-deprecation=import',
    'src/scss/main.scss:dist/css/main.css',
  ],
  { cwd: root, stdio: 'inherit' },
);

watch(`${root}src/index.html`, () => copyHtml());
watch(`${root}src/static`, { recursive: true }, () => copyStatic());
watch(`${root}src/img`, { recursive: true }, () => generateImages());

console.log(`\n  Pulse Theory dev server → http://localhost:${port}\n`);

// Ctrl+C (SIGINT) o un cierre externo (SIGTERM): detener también sass.
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    sass.kill();
    await ctx.dispose();
    process.exit(0);
  });
}
