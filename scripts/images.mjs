// Imágenes responsive: cada JPG de src/img se convierte en 3 anchos × 3 formatos.
// AVIF (el más ligero) → WebP → JPEG (respaldo universal), servidos con <picture>.
// Codificar AVIF es lento (~12 s las 18 variantes), así que se guardan en
// .cache/img y solo se regeneran si el original es más nuevo que su variante.
import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { basename, extname } from 'node:path';
import sharp from 'sharp';

export const WIDTHS = [480, 800, 1200];

const FORMATS = {
  avif: (img) => img.avif({ quality: 50, effort: 4 }),
  webp: (img) => img.webp({ quality: 72 }),
  jpg: (img) => img.jpeg({ quality: 75, mozjpeg: true }),
};

const isFresh = (output, source) =>
  existsSync(output) && statSync(output).mtimeMs >= statSync(source).mtimeMs;

export async function buildImages(srcDir, cacheDir, outDir) {
  mkdirSync(cacheDir, { recursive: true });
  const jobs = [];
  for (const file of readdirSync(srcDir).filter((f) => /\.jpe?g$/i.test(f))) {
    const source = `${srcDir}/${file}`;
    const name = basename(file, extname(file));
    for (const width of WIDTHS) {
      for (const [ext, encode] of Object.entries(FORMATS)) {
        const output = `${cacheDir}/${name}-${width}.${ext}`;
        if (isFresh(output, source)) continue;
        // withoutEnlargement: nunca agranda una imagen más pequeña que el ancho pedido.
        jobs.push(encode(sharp(source).resize({ width, withoutEnlargement: true })).toFile(output));
      }
    }
  }
  await Promise.all(jobs);
  cpSync(cacheDir, outDir, { recursive: true });
  return jobs.length;
}
