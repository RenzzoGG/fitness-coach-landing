// Servidor de desarrollo sin dependencias extra:
// - esbuild en modo watch + su servidor HTTP sobre dist/
// - sass --watch (sin autoprefixer: los prefijos solo importan en el build de producción)
// - recopia el HTML y los estáticos cuando cambian
import { spawn } from 'node:child_process';
import { watch } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import { build, copyHtml, copyStatic } from './build.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const port = 5173;

build();

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

const ctx = await esbuild.context({
  entryPoints: [`${root}src/js/main.js`],
  bundle: true,
  format: 'esm',
  target: 'es2020',
  outfile: `${root}dist/js/main.js`,
  logLevel: 'info',
});
await ctx.watch();
await ctx.serve({ servedir: `${root}dist`, port });

watch(`${root}src/index.html`, () => copyHtml());
watch(`${root}src/static`, { recursive: true }, () => copyStatic());

console.log(`\n  Pulse Theory dev server → http://localhost:${port}\n`);

process.on('SIGINT', async () => {
  sass.kill();
  await ctx.dispose();
  process.exit(0);
});
