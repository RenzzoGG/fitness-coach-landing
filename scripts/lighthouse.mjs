// Lighthouse móvil y escritorio contra dist/, servido como en producción
// (static-server.mjs: brotli + Cache-Control de Caddy).
// Uso: npm run lh [-- etiqueta]   → .cache/lighthouse/<etiqueta>/
// Performance varía entre ejecuciones (CPU del WSL), así que se corre 5 veces
// por dispositivo y se informa la mediana; el resto de categorías no varía.
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import lighthouse from 'lighthouse';
import desktopConfig from 'lighthouse/core/config/desktop-config.js';
import { launch } from './browser.mjs';
import { serve } from './static-server.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const label = process.argv[2] ?? 'latest';
const out = `${root}.cache/lighthouse/${label}`;
const RUNS = Number(process.env.LH_RUNS) || 5;
mkdirSync(out, { recursive: true });

const server = await serve(`${root}dist`);
const port = 9300 + Math.floor(Math.random() * 500);
const browser = await launch({ args: [`--remote-debugging-port=${port}`] });

const median = (values) => values.toSorted((a, b) => a - b)[Math.floor(values.length / 2)];
const summary = {};

try {
  for (const [device, config] of [['mobile', undefined], ['desktop', desktopConfig]]) {
    const runs = [];
    for (let i = 1; i <= RUNS; i++) {
      const { lhr, report } = await lighthouse(`${server.url}/`, { port, output: 'html', logLevel: 'error' }, config);
      writeFileSync(`${out}/${device}-${i}.html`, report);
      writeFileSync(`${out}/${device}-${i}.json`, JSON.stringify(lhr));
      const score = (id) => Math.round(lhr.categories[id].score * 100);
      const metric = (id) => lhr.audits[id].numericValue;
      runs.push({
        performance: score('performance'),
        accessibility: score('accessibility'),
        bestPractices: score('best-practices'),
        seo: score('seo'),
        lcp: Math.round(metric('largest-contentful-paint')),
        tbt: Math.round(metric('total-blocking-time')),
        cls: Number(metric('cumulative-layout-shift').toFixed(3)),
      });
    }
    const pick = (key) => median(runs.map((r) => r[key]));
    summary[device] = Object.fromEntries(Object.keys(runs[0]).map((key) => [key, pick(key)]));
    summary[device].runs = runs.map((r) => r.performance);
    const s = summary[device];
    console.log(`${device.padEnd(8)} P ${s.performance} · A ${s.accessibility} · BP ${s.bestPractices} · SEO ${s.seo}   LCP ${s.lcp} ms · TBT ${s.tbt} ms · CLS ${s.cls}   (perf runs: ${s.runs.join(', ')})`);
  }
  writeFileSync(`${out}/summary.json`, `${JSON.stringify(summary, null, 2)}\n`);
  console.log(`Reports → .cache/lighthouse/${label}/`);
} finally {
  await browser.close();
  server.close();
}
