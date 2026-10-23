// Sirve dist/ tal cual (el build de producción, con hashes) para probarlo
// localmente o pasarle Lighthouse. Usa el servidor de esbuild: sin dependencias.
// No comprime ni pone headers de caché: en producción lo hace Caddy (ver Caddyfile).
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const port = Number(process.env.PORT) || 4173;
const ctx = await esbuild.context({});
await ctx.serve({ servedir: fileURLToPath(new URL('../dist', import.meta.url)), port });
console.log(`\n  Production build (dist/) → http://localhost:${port}\n`);

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    await ctx.dispose();
    process.exit(0);
  });
}
