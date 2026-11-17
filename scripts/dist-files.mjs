// Localiza un CSS o JS de dist/ con o sin hash en el nombre (main.css o main.3f9a1c2b.css).
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));

export function distFile(dir, ext, name = 'main') {
  const file = readdirSync(dist + dir).find((f) => new RegExp(`^${name}(\\.[0-9a-f]{8})?\\.${ext}$`).test(f));
  if (!file) throw new Error(`No ${name}.*.${ext} in dist/${dir}. Run npm run build first.`);
  return `${dist}${dir}/${file}`;
}
